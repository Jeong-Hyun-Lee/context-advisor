import { atom, read, update } from 'claude-code'
import type { EngineInterface, RenderElement, RenderInput, Register, SessionRateLimit, TurnUsage } from 'claude-code'

import type { Lang, Level, Limit, Runtime, Snapshot, TokenTotals } from '../types'
import {
  BAR_WIDTH,
  LEVEL_HEX,
  PALETTE,
  STYLE,
  classify,
  formatModel,
  formatSpan,
  formatTokens,
  gradient,
  limitLevel,
  toConfig,
} from './classify'
import { TEXT, flip, toLang } from './i18n'
import { cardSvg } from './svg'
import type { SvgMeter } from './svg'
import type { Config } from './classify'

const level = atom({ plugin: 'context-advisor', key: 'level' } as const, 'ok')
const snapshot = atom({ plugin: 'context-advisor', key: 'snapshot' } as const, null)
const runtime = atom({ plugin: 'context-advisor', key: 'runtime' } as const, null)
const lang = atom({ plugin: 'context-advisor', key: 'lang' } as const, 'ko')
const tokens = atom({ plugin: 'context-advisor', key: 'tokens' } as const, { total: 0, cacheRead: 0 })

const EMPTY_BAR = '#30363d'
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

const addUsage = (t: TokenTotals, u: TurnUsage): TokenTotals => ({
  total: t.total + u.input_tokens + u.output_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens,
  cacheRead: t.cacheRead + u.cache_read_input_tokens,
})

const refresh = async ($: EngineInterface, config: Config) => {
  const usage = await $.session.usage()
  const { context } = usage
  if (context.tokens === undefined || context.percent === undefined) return

  const now = await $.clock.now()
  const snap: Snapshot = {
    ctxTokens: context.tokens,
    ctxWindow: context.window,
    ctxPercent: context.percent,
    minutes: Math.round((now - usage.startedAt) / 60_000),
    costUsd: usage.cost?.usd,
    fiveHour: toLimit(usage.rateLimits, 'five_hour', now),
    weekly: toLimit(usage.rateLimits, 'seven_day', now),
  }
  await update($, snapshot, () => snap)

  const next = classify(config.basis === 'tokens' ? snap.ctxTokens : snap.ctxPercent, config)
  const prev = await read($, level)
  await update($, level, () => next)
  if (RANK[next] > RANK[prev]) $.ui.toast(`${STYLE[next].icon} ${TEXT[await read($, lang)].advice[next]}`)
}

// The card: advice + model, then (showPanel) a meter per window and session totals; null before the first reading.
// Terminal: bordered Ink card with per-cell gradient bars. Remote surfaces: an SVG card.
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
  const cacheShare = totals.total > 0 ? Math.round((totals.cacheRead / totals.total) * 100) : 0
  const cost = snap.costUsd === undefined ? '' : ` · $${snap.costUsd.toFixed(2)}`
  const footer = `${t.session} ${formatSpan(snap.minutes * 60_000)} · ${t.tokens} ${formatTokens(totals.total)} (${t.cache} ${cacheShare}%)${cost}`

  const meters: (SvgMeter & { level: Level })[] = [
    {
      label: t.ctx,
      percent: snap.ctxPercent,
      color: PALETTE.ctx,
      level: ctxLevel,
      detail: `${formatTokens(snap.ctxTokens)}/${formatTokens(snap.ctxWindow)}`,
    },
  ]
  const addLimit = (label: string, color: string, l: Limit | undefined) => {
    if (l) meters.push({ label, percent: l.percent, color, level: limitLevel(l.percent), detail: l.resetsIn ? `${t.resets} ${l.resetsIn}` : '' })
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
          source={cardSvg({ advice, adviceColor: adviceHex, model, meters: shown, footer: config.showPanel ? footer : '' })}
          alt={[advice, ...shown.map(m => `${m.label} ${Math.round(m.percent)}%`)].join(', ')}
        />
      </Box>
    )
  }

  const { Box, Button, Text } = $.ui.resolve(e)

  const header = (
    <Box key="header" flexDirection="row" justifyContent="space-between">
      <Text color={adviceHex} bold>
        {advice}
      </Text>
      <Box flexDirection="row" gap={1}>
        <Text color="#8b949e">{model}</Text>
        <Button key="lang" label={t.toggle} hotkey="l" onPress={onToggle} />
      </Box>
    </Box>
  )
  if (!config.showPanel) return header

  const meterRow = (m: SvgMeter & { level: Level }) => {
    const n = Math.round((Math.min(Math.max(m.percent, 0), 100) / 100) * BAR_WIDTH)
    const cells = gradient(m.color, n)
    return (
      <Box key={m.label} flexDirection="row">
        <Box width={10}>
          <Text color={m.color}>{m.label}</Text>
        </Box>
        {cells.map((c, i) => (
          <Text key={`c${i}`} backgroundColor={c}>
            {' '}
          </Text>
        ))}
        <Text backgroundColor={EMPTY_BAR}>{' '.repeat(BAR_WIDTH - n)}</Text>
        <Text color={LEVEL_HEX[m.level]} bold>{` ${String(Math.round(m.percent)).padStart(3)}%`}</Text>
        <Text color="#8b949e">{`  ${m.detail}`}</Text>
      </Box>
    )
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={adviceHex}
      paddingX={1}
      width={Math.min(columns, CARD_MAX_WIDTH)}
    >
      {header}
      {meters.map(meterRow)}
      <Text color="#8b949e">{footer}</Text>
    </Box>
  )
}

export const register: Register = (on, options) => {
  const config = toConfig(options)

  // AbovePrompt is drawn on terminal + desktop only; the pane reaches every surface (VS Code included).
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const saved = toLang(await $.store.get(LANG_KEY))
    await update($, lang, () => saved)
    await $.command.register({ name: 'ctx', description: '컨텍스트·토큰 사용량 패널 열기 / open usage pane' })
    if (e.surface !== null && e.surface !== 'terminal') void $.ui.open({ id: PANE, title: TEXT[saved].paneTitle })
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
    if (u) await update($, tokens, t => addUsage(t ?? { total: 0, cacheRead: 0 }, u))
    await refresh($, config)
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
