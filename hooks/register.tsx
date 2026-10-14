import { atom, read, update } from 'claude-code'
import type { EngineInterface, RenderElement, RenderInput, Register, SessionRateLimit } from 'claude-code'

import type { Lang, Level, Limit, Runtime, Snapshot, TokenTotals } from '../types'
import {
  BAR_WIDTH,
  NO_TOKENS,
  addUsage,
  cacheHit,
  LEVEL_HEX,
  TRACK,
  PALETTE,
  STYLE,
  classify,
  formatModel,
  formatSpan,
  formatTokens,
  gradient,
  labelColor,
  limitLevel,
  toConfig,
  toneOf,
  tokenTotal,
  toTotals,
} from './classify'
import { TEXT, flip, toLang } from './i18n'
import { SVG_WIDTH, cardHeight, cardSvg } from './svg'
import type { SvgMeter } from './svg'
import type { Config } from './classify'

const level = atom({ plugin: 'context-advisor', key: 'level' } as const, 'ok')
const snapshot = atom({ plugin: 'context-advisor', key: 'snapshot' } as const, null)
const runtime = atom({ plugin: 'context-advisor', key: 'runtime' } as const, null)
const tone = atom({ plugin: 'context-advisor', key: 'tone' } as const, 'dark')
const lang = atom({ plugin: 'context-advisor', key: 'lang' } as const, 'ko')
const tokens = atom({ plugin: 'context-advisor', key: 'tokens' } as const, NO_TOKENS)
const TOKENS_KEY = 'tokens'
const REFRESH_MS = 60_000
const STALE_MS = 5 * 60_000

const CARD_MAX_WIDTH = 72
const PANE = 'context-advisor'
const LANG_KEY = 'lang'

const RANK: Record<Level, number> = { ok: 0, warn: 1, high: 2 }

const toLimit = (limits: SessionRateLimit[], kind: string, now: number): Limit | undefined => {
  const l = limits.find(x => x.kind === kind)
  if (!l) return undefined
  const resetsIn = l.resetsAt ? formatSpan(Date.parse(l.resetsAt) - now) : ''
  return { percent: l.percentUsed, resetsIn }
}


const refresh = async ($: EngineInterface, config: Config, isApiResponse = false) => {
  const usage = await $.session.usage()
  let { tokens: ctxTokens, percent: ctxPercent, window: ctxWindow } = usage.context
  let isEstimate = false

  // No API response yet (fresh / resumed / compacted): local /context estimate, no request sent.
  if (ctxTokens === undefined || ctxPercent === undefined) {
    const b = (await $.session.usage({ breakdown: 'summary' })).context.breakdown
    if (!b) return
    ctxTokens = b.totalTokens
    ctxPercent = b.percentage
    ctxWindow = b.rawMaxTokens
    isEstimate = true
  }

  const now = await $.clock.now()
  const snap: Snapshot = {
    ctxTokens,
    ctxWindow,
    ctxPercent,
    isEstimate,
    minutes: Math.round((now - usage.startedAt) / 60_000),
    costUsd: usage.cost?.usd,
    fiveHour: toLimit(usage.rateLimits, 'five_hour', now),
    weekly: toLimit(usage.rateLimits, 'seven_day', now),
    limitsAt: isApiResponse ? now : ((await read($, snapshot))?.limitsAt ?? 0),
  }
  await update($, snapshot, () => snap)

  const next = classify(config.basis === 'tokens' ? snap.ctxTokens : snap.ctxPercent, config)
  const prev = await read($, level)
  await update($, level, () => next)
  if (RANK[next] > RANK[prev]) $.ui.toast(`${STYLE[next].icon} ${TEXT[await read($, lang)].advice[next]}`)
}

// The card: advice + model, then (showPanel) a meter per window and session totals; null before the first reading.
// Terminal: bordered Ink card with per-cell gradient bars. Remote surfaces: an SVG card.
// Terminal colors that are no theme key follow the /config theme (light* vs the rest).
const readTone = async ($: EngineInterface) => {
  const row = (await $.config.list()).find(r => r.key === 'theme')
  await update($, tone, () => toneOf(row?.value))
}

// Text and border use theme keys, which follow the person's theme on their own.
const LEVEL_KEY: Record<Level, string> = { ok: 'success', warn: 'warning', high: 'error' }
const MUTED = 'inactive'

// Session state redraws the card; the store keeps the choice for later sessions.
const setLang = async ($: EngineInterface, next: Lang) => {
  await update($, lang, () => next)
  await $.store.set(LANG_KEY, next)
}

const drawCard = async ($: EngineInterface, e: RenderInput, config: Config, columns: number): Promise<RenderElement | null> => {
  const snap = await read($, snapshot)
  if (snap === null) return null

  const ctxLevel = await read($, level)
  const totals = await read($, tokens)
  const rt = await read($, runtime)
  const current: Lang = await read($, lang)
  const t = TEXT[current]

  const model = rt ? `${formatModel(rt.model)}${rt.effort ? ` · effort ${rt.effort}` : ''}` : ''
  const total = tokenTotal(totals)
  const now = await $.clock.now()
  const age = snap.limitsAt > 0 ? now - snap.limitsAt : 0
  const asOf = age >= STALE_MS ? ` · ${formatSpan(age)} ${t.ago}` : ''
  const cost = snap.costUsd === undefined ? '' : ` · $${snap.costUsd.toFixed(2)}`
  const tokenPart = total > 0 ? ` · ${t.tokens} ${formatTokens(total)} · ${t.cache} ${cacheHit(totals)}%` : ''
  const footer = `${t.session} ${formatSpan(snap.minutes * 60_000)}${tokenPart}${cost}`

  const meters: (SvgMeter & { level: Level })[] = [
    {
      label: t.ctx,
      percent: snap.ctxPercent,
      color: PALETTE.ctx,
      level: ctxLevel,
      detail: `${snap.isEstimate ? '~' : ''}${formatTokens(snap.ctxTokens)}/${formatTokens(snap.ctxWindow)}${snap.isEstimate ? ` (${t.estimate})` : ''}`,
    },
  ]
  const addLimit = (label: string, color: string, l: Limit | undefined) => {
    if (l) meters.push({ label, percent: l.percent, color, level: limitLevel(l.percent), detail: `${l.resetsIn ? `${t.resets} ${l.resetsIn}` : ''}${asOf}` })
  }
  addLimit(t.fiveHour, PALETTE.fiveHour, snap.fiveHour)
  addLimit(t.weekly, PALETTE.weekly, snap.weekly)

  const advice = `${STYLE[ctxLevel].icon} ${t.advice[ctxLevel]}`
  const adviceHex = LEVEL_HEX[ctxLevel]

  const onToggle = () => setLang($, flip(current))

  if (e.surface !== 'terminal') {
    const { Box, Button, Svg } = $.ui.resolve(e)
    const shown = config.showPanel ? meters : []
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="flex-end">
          <Button key="lang" label={t.toggle} hotkey="l" onPress={onToggle} />
        </Box>
        <Svg
          width={SVG_WIDTH}
          height={cardHeight(shown.length)}
          source={cardSvg({ advice: t.advice[ctxLevel], adviceColor: adviceHex, model, meters: shown, footer: config.showPanel ? footer : '' })}
          alt={[advice, ...shown.map(m => `${m.label} ${Math.round(m.percent)}%`)].join(', ')}
        />
      </Box>
    )
  }

  const { Box, Button, Text } = $.ui.resolve(e)
  const bg = await read($, tone)

  const header = (
    <Box key="header" flexDirection="row" justifyContent="space-between">
      <Text color={LEVEL_KEY[ctxLevel]} bold>
        {advice}
      </Text>
      <Box flexDirection="row" gap={1}>
        <Text color={MUTED}>{model}</Text>
        <Button key="lang" label={t.toggle} hotkey="l" onPress={onToggle} />
      </Box>
    </Box>
  )
  if (!config.showPanel) return header

  const meterRow = (m: SvgMeter & { level: Level }) => {
    const n = Math.round((Math.min(Math.max(m.percent, 0), 100) / 100) * BAR_WIDTH)
    const cells = gradient(m.color, n, bg)
    return (
      <Box key={m.label} flexDirection="row">
        <Box width={10}>
          <Text color={labelColor(m.color, bg)}>{m.label}</Text>
        </Box>
        {cells.map((c, i) => (
          <Text key={`c${i}`} backgroundColor={c}>
            {' '}
          </Text>
        ))}
        <Text backgroundColor={TRACK[bg]}>{' '.repeat(BAR_WIDTH - n)}</Text>
        <Text color={LEVEL_KEY[m.level]} bold>{` ${String(Math.round(m.percent)).padStart(3)}%`}</Text>
        <Text color={MUTED}>{`  ${m.detail}`}</Text>
      </Box>
    )
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={LEVEL_KEY[ctxLevel]}
      paddingX={1}
      width={Math.min(columns, CARD_MAX_WIDTH)}
    >
      {header}
      {meters.map(meterRow)}
      <Text color={MUTED}>{footer}</Text>
    </Box>
  )
}

export const register: Register = (on, options) => {
  const config = toConfig(options)

  // AbovePrompt is drawn on terminal + desktop only; the pane reaches every surface (VS Code included).
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await readTone($)
    const saved = toLang(await $.store.get(LANG_KEY))
    await update($, lang, () => saved)
    // Resumed session in a new process: pick up its token totals (kept per session id).
    const id = await $.session.id()
    const kept = (await $.store.get(TOKENS_KEY)) as { id?: unknown; totals?: unknown } | undefined
    if (kept?.id === id && tokenTotal(await read($, tokens)) === 0) await update($, tokens, () => toTotals(kept.totals))
    // Reset countdowns, cost and estimates move between turns too.
    $.clock.every(REFRESH_MS, () => void refresh($, config))
    await $.command.register({ name: 'ctx', description: '컨텍스트·토큰 사용량 패널 열기 / open usage pane' })
    if (e.surface !== null && e.surface !== 'terminal') void $.ui.open({ id: PANE, title: TEXT[saved].paneTitle })
    await refresh($, config)
    return result
  })

  // Desktop / VS Code clients often attach after session.start (its surface then null): open + refresh here too.
  on('session.attach', async ($, e, next) => {
    const result = await next(e)
    if (e.surface !== 'terminal') void $.ui.open({ id: PANE, title: TEXT[await read($, lang)].paneTitle })
    await refresh($, config)
    return result
  })

  on('config.set', { key: 'theme' }, async ($, e, next) => {
    const result = await next(e)
    await readTone($)
    return result
  })

  on('session.compact', async ($, e, next) => {
    const result = await next(e)
    await refresh($, config)
    return result
  })

  on('command.run', { command: 'ctx' }, async $ => {
    const t = TEXT[await read($, lang)]
    await $.ui.open({ id: PANE, title: t.paneTitle })
    return { text: t.paneOpened }
  })

  // Main-loop model request: remember which model and effort it runs on.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined) {
      const r: Runtime = { model: e.model, effort: e.effort === undefined ? undefined : String(e.effort) }
      await update($, runtime, () => r)
    }
    return yield* next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    const u = e.usage
    if (u) {
      const summed = addUsage(toTotals(await read($, tokens)), u)
      await update($, tokens, () => summed)
      await $.store.set(TOKENS_KEY, { id: await $.session.id(), totals: summed })
    }
    await refresh($, config, true)
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    return (await drawCard($, e, config, e.props.bodyColumns)) ?? next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const card = await drawCard($, e, config, e.viewport?.columns ?? CARD_MAX_WIDTH)
    if (card) return card
    const { Text } = $.ui.resolve(e)
    return <Text dimColor>{TEXT[await read($, lang)].empty}</Text>
  })
}
