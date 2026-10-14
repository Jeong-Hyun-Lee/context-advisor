import { expect, mock, test } from 'claude-code/testing'
import type { On, RenderPropsOf, SessionUsage } from 'claude-code'

const SURFACES = ['terminal', 'desktop'] as const

const BAND = { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 100 } as unknown as RenderPropsOf['AbovePrompt']

// Stand-in for the engine beneath the plugin: its own hint line / empty band, a turn's result.
const engine = (on: On) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  on('turn.complete', () => ({ text: '' }))
  mock.clock(on)
  mock.store(on)
}

const PANE = { title: '컨텍스트 사용량' } as unknown as RenderPropsOf['Pane']

const usage = (percent: number): SessionUsage => ({
  startedAt: 0,
  context: { tokens: percent * 10_000, window: 1_000_000, percent },
  rateLimits: [
    { kind: 'five_hour', percentUsed: 5, resetsAt: new Date(4 * 3_600_000).toISOString() },
    { kind: 'seven_day', percentUsed: 1 },
  ],
  cost: { usd: 1.5 },
})

const turnDone = {
  answer: 'ok',
  durationMs: 1,
  isAborted: false,
  turnId: 't1',
  reason: 'answer' as const,
  usage: { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 70, cache_creation_input_tokens: 0, model: 'm' },
}

test('band passes to the engine before any reading', async ($, on) => {
  engine(on)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'context-advisor', surface, component: 'AbovePrompt', props: BAND })
    expect(await ui.find({ type: 'Text', text: 'engine' })).toBeDefined()
    await ui.unmount()
  }
})

test('panel draws bars and advice level after a turn', async ($, on) => {
  engine(on)
  on('session.usage', () => ({ value: usage(55) }))
  await $.turn.complete(turnDone)

  const term = await $.ui.mount({ plugin: 'context-advisor', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  expect(await term.find({ type: 'Text', text: /◐ 대화 길어짐 — \/compact 권장/ })).toBeDefined()
  expect(await term.find({ text: /55%/ })).toBeDefined()
  expect(await term.find({ text: '550k/1.0M' })).toBeDefined()
  expect(await term.find({ text: /리셋/ })).toBeDefined()
  expect(await term.find({ text: /토큰 100 \(캐시 70%\) · \$1\.50/ })).toBeDefined()
  expect(await term.drawn()).toMatchObject({ type: 'Box', props: { borderStyle: 'round' } })
  await term.unmount()

  const desk = await $.ui.mount({ plugin: 'context-advisor', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  const svg = await desk.find({ type: 'Svg' })
  expect(String(svg?.props.source)).toContain('55%')
  expect(String(svg?.props.alt)).toContain('/compact')
  await desk.unmount()
})

test('pane draws the card on every surface, VS Code included', async ($, on) => {
  engine(on)
  on('session.usage', () => ({ value: usage(75) }))

  const empty = await $.ui.mount({ plugin: 'context-advisor', surface: 'vscode', component: 'Pane', requestId: 'context-advisor', props: PANE })
  expect(await empty.find({ text: /첫 응답 후/ })).toBeDefined()
  await empty.unmount()

  await $.turn.complete(turnDone)
  const vs = await $.ui.mount({ plugin: 'context-advisor', surface: 'vscode', component: 'Pane', requestId: 'context-advisor', props: PANE })
  expect(String((await vs.find({ type: 'Svg' }))?.props.alt)).toContain('새 세션 권장')
  await vs.unmount()

  const term = await $.ui.mount({ plugin: 'context-advisor', surface: 'terminal', component: 'Pane', requestId: 'context-advisor', props: PANE })
  expect(await term.find({ text: /75%/ })).toBeDefined()
  await term.unmount()
})

test('language button toggles the card to English and back', async ($, on) => {
  engine(on)
  on('session.usage', () => ({ value: usage(10) }))
  await $.turn.complete(turnDone)

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'context-advisor', surface, component: 'Pane', requestId: 'context-advisor', props: PANE })
    expect((await ui.find({ type: 'Button' }))?.props.label).toBe('EN')
    await ui.press({ key: 'lang' })
    expect((await ui.find({ type: 'Button' }))?.props.label).toBe('KO')
    if (surface === 'terminal') expect(await ui.find({ type: 'Text', text: /Context OK/ })).toBeDefined()
    else expect(String((await ui.find({ type: 'Svg' }))?.props.alt)).toContain('Context OK')
    await ui.press({ key: 'lang' })
    expect((await ui.find({ type: 'Button' }))?.props.label).toBe('EN')
    await ui.unmount()
  }
})
