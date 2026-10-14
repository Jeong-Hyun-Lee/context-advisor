import { expect, test } from 'claude-code/testing'

import { addUsage, bar, labelColor, toneOf, cacheHit, classify, NO_TOKENS, tokenTotal, toTotals, formatModel, gradient, shade, formatSpan, formatTokens, toConfig } from './classify'

test('classify boundaries (percent defaults 50/70)', () => {
  const c = toConfig({})
  expect(c.basis).toBe('percent')
  expect(classify(49, c)).toBe('ok')
  expect(classify(50, c)).toBe('warn')
  expect(classify(69, c)).toBe('warn')
  expect(classify(70, c)).toBe('high')
})

test('tokens basis uses absolute thresholds', () => {
  const c = toConfig({ basis: 'tokens' })
  expect(classify(99_999, c)).toBe('ok')
  expect(classify(100_000, c)).toBe('warn')
  expect(classify(200_000, c)).toBe('high')
})

test('config guards bad values', () => {
  const c = toConfig({ warnPercent: 80, highPercent: 60, showPanel: false })
  expect(c.high).toBe(80)
  expect(c.showPanel).toBe(false)
  expect(toConfig({ warnPercent: -1 }).warn).toBe(50)
})

test('bar clamps and fills', () => {
  expect(bar(0, 10)).toEqual({ filled: '', empty: ' '.repeat(10) })
  expect(bar(50, 10).filled).toHaveLength(5)
  expect(bar(150, 10).filled).toHaveLength(10)
})

test('formatters', () => {
  expect(formatTokens(950)).toBe('950')
  expect(formatTokens(128_000)).toBe('128k')
  expect(formatTokens(1_000_000)).toBe('1.0M')
  expect(formatSpan(45 * 60_000)).toBe('45m')
  expect(formatSpan(235 * 60_000)).toBe('3h55m')
  expect(formatSpan((6 * 24 + 12) * 3_600_000)).toBe('6d12h')
})

test('formatModel', () => {
  expect(formatModel('claude-opus-5-5')).toBe('Opus 5.5')
  expect(formatModel('claude-sonnet-5-5[1m]')).toBe('Sonnet 5.5 [1m]')
  expect(formatModel('claude-haiku-4-5-20251001')).toBe('Haiku 4.5')
  expect(formatModel('gpt-x')).toBe('gpt-x')
})

test('shade and gradient', () => {
  expect(shade('#ffffff', 0.5)).toBe('#808080')
  const g = gradient('#4FC3F7', 4)
  expect(g).toHaveLength(4)
  expect(g[3]).toBe('#4fc3f7')
})

test('token totals and cache hit match the desktop usage panel', () => {
  // the desktop panel's figures: input 19, output 7.1k, cache read 665.9k, cache write 162.2k -> hit 80%
  const t = addUsage(NO_TOKENS, { input_tokens: 19, output_tokens: 7_100, cache_read_input_tokens: 665_900, cache_creation_input_tokens: 162_200 })
  expect(cacheHit(t)).toBe(80)
  expect(tokenTotal(t)).toBe(835_219)
  expect(cacheHit(NO_TOKENS)).toBe(0)
  expect(toTotals({ total: 5, cacheRead: 2 })).toEqual({ input: 0, output: 0, cacheRead: 2, cacheWrite: 0 })
  expect(toTotals(undefined)).toEqual(NO_TOKENS)
})

test('theme tone and light-background colors', () => {
  expect(toneOf('light')).toBe('light')
  expect(toneOf('light-daltonized')).toBe('light')
  expect(toneOf('dark-ansi')).toBe('dark')
  expect(toneOf(undefined)).toBe('dark')
  expect(gradient('#4FC3F7', 4, 'light')[0]).not.toBe(gradient('#4FC3F7', 4, 'dark')[0])
  expect(gradient('#4FC3F7', 4, 'light')[3]).toBe('#4fc3f7')
  expect(labelColor('#ffffff', 'light')).toBe('#b3b3b3')
  expect(labelColor('#ffffff', 'dark')).toBe('#ffffff')
})
