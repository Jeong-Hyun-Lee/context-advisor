export type Level = 'ok' | 'warn' | 'high'

export type Lang = 'ko' | 'en'

export type Limit = { percent: number; resetsIn: string }

export type Snapshot = {
  ctxTokens: number
  ctxWindow: number
  ctxPercent: number
  /** Local estimate (no API response yet in this window: fresh, resumed or just compacted). */
  isEstimate: boolean
  minutes: number
  costUsd?: number
  fiveHour?: Limit
  weekly?: Limit
}

export type Runtime = { model: string; effort?: string }

export type TokenTotals = { total: number; cacheRead: number }

declare module 'claude-code' {
  interface PluginState {
    'context-advisor': { level: Level; snapshot: Snapshot | null; tokens: TokenTotals; runtime: Runtime | null; lang: Lang }
  }
}
