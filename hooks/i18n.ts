import type { Lang, Level } from '../types'

type Text = {
  advice: Record<Level, string>
  ctx: string
  fiveHour: string
  weekly: string
  session: string
  tokens: string
  cache: string
  resets: string
  estimate: string
  ago: string
  empty: string
  paneTitle: string
  paneOpened: string
  toggle: string
}

export const TEXT: Record<Lang, Text> = {
  ko: {
    advice: {
      ok: '컨텍스트 여유 — 계속 진행',
      warn: '대화 길어짐 — /compact 권장',
      high: '토큰 낭비 큼 — 새 세션 권장',
    },
    ctx: '컨텍스트',
    fiveHour: '5시간',
    weekly: '주간',
    session: '세션',
    tokens: '토큰',
    cache: '캐시 히트',
    resets: '리셋',
    estimate: '추정',
    ago: '전 기준',
    empty: '첫 응답 후 사용량이 표시됩니다.',
    paneTitle: '컨텍스트 사용량',
    paneOpened: '컨텍스트 사용량 패널 열림',
    toggle: 'EN',
  },
  en: {
    advice: {
      ok: 'Context OK — keep going',
      warn: 'Long conversation — /compact advised',
      high: 'Token waste — start a new session',
    },
    ctx: 'Context',
    fiveHour: '5h',
    weekly: 'Weekly',
    session: 'Session',
    tokens: 'tokens',
    cache: 'cache hit',
    resets: 'resets',
    estimate: 'est.',
    ago: 'old',
    empty: 'Usage shows after the first reply.',
    paneTitle: 'Context usage',
    paneOpened: 'Context usage pane opened',
    toggle: 'KO',
  },
}

export const toLang = (v: unknown): Lang => (v === 'en' ? 'en' : 'ko')

export const flip = (l: Lang): Lang => (l === 'ko' ? 'en' : 'ko')
