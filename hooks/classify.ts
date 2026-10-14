import type { PluginOptions } from 'claude-code'

import type { Level } from '../types'

export type Config = {
  basis: 'percent' | 'tokens'
  warn: number
  high: number
  showPanel: boolean
}

const num = (v: unknown, fallback: number): number => (typeof v === 'number' && v > 0 ? v : fallback)

export const toConfig = (o: PluginOptions): Config => {
  const basis = o.basis === 'tokens' ? 'tokens' : 'percent'
  const warn = basis === 'tokens' ? num(o.warnTokens, 100_000) : num(o.warnPercent, 50)
  const high = basis === 'tokens' ? num(o.highTokens, 200_000) : num(o.highPercent, 70)
  return { basis, warn, high: Math.max(high, warn), showPanel: o.showPanel !== false }
}

export const STYLE: Record<Level, { icon: string; color: string }> = {
  ok: { icon: '●', color: 'green' },
  warn: { icon: '◐', color: 'yellow' },
  high: { icon: '▲', color: 'red' },
}

export const classify = (value: number, c: Pick<Config, 'warn' | 'high'>): Level =>
  value >= c.high ? 'high' : value >= c.warn ? 'warn' : 'ok'

// Rate-limit bars: fixed 50/80 cut, independent of the advice basis.
export const limitLevel = (percent: number): Level => classify(percent, { warn: 50, high: 80 })

export const BAR_WIDTH = 20

// Bars are spaces painted by backgroundColor: block glyphs (█░) are ambiguous-width
// and draw double-wide on CJK terminals, breaking the layout.
export const bar = (percent: number, width = BAR_WIDTH): { filled: string; empty: string } => {
  const n = Math.round((Math.min(Math.max(percent, 0), 100) / 100) * width)
  return { filled: ' '.repeat(n), empty: ' '.repeat(width - n) }
}

export const formatTokens = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`

export const formatSpan = (ms: number): string => {
  const m = Math.max(0, Math.round(ms / 60_000))
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h${m % 60}m`
  return `${Math.floor(h / 24)}d${h % 24}h`
}

// "claude-opus-5-5[1m]" -> "Opus 5.5 [1m]"; unknown ids pass through.
export const formatModel = (id: string): string => {
  const hit = /^claude-([a-z]+)-(\d+)-(\d+)(.*)$/.exec(id)
  if (!hit) return id
  const [, family = '', major, minor, rest = ''] = hit
  const suffix = rest.replace(/^-\d{8}/, '').trim()
  return `${family.charAt(0).toUpperCase()}${family.slice(1)} ${major}.${minor}${suffix ? ` ${suffix}` : ''}`
}

// One hue per meter so they read apart at a glance; the advice level shows on the % text and card border.
export const PALETTE = { ctx: '#4FC3F7', fiveHour: '#BA68C8', weekly: '#FFB74D' } as const

export const LEVEL_HEX: Record<Level, string> = { ok: '#66BB6A', warn: '#FFCA28', high: '#EF5350' }

const hex2 = (n: number): string => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0')

// `#rrggbb` scaled by f (0..1).
export const shade = (hex: string, f: number): string => {
  const v = Number.parseInt(hex.slice(1), 16)
  return `#${hex2(((v >> 16) & 255) * f)}${hex2(((v >> 8) & 255) * f)}${hex2((v & 255) * f)}`
}

// n cells darkening-to-full along the bar: a left-to-right gradient in plain cells.
export const gradient = (hex: string, n: number): string[] =>
  Array.from({ length: n }, (_, i) => shade(hex, 0.55 + (0.45 * (i + 1)) / Math.max(n, 1)))
