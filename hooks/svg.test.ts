import { expect, test } from 'claude-code/testing'

import { cardSvg } from './svg'

test('cardSvg draws one track per meter and escapes text', () => {
  const svg = cardSvg({
    advice: 'a <b>',
    adviceColor: '#66BB6A',
    model: 'Opus 5.5',
    meters: [
      { label: 'x', percent: 50, color: '#4FC3F7', detail: '' },
      { label: 'y', percent: 0, color: '#BA68C8', detail: '' },
    ],
    footer: 'f',
  })
  expect(svg.startsWith('<svg')).toBe(true)
  expect(svg).toContain('a &lt;b&gt;')
  expect(svg.match(/class="t"/g)).toHaveLength(2)
  expect(svg).toContain('width="55"')
  // light by default, dark only under the host's dark color scheme
  expect(svg).toContain('--bg:#ffffff')
  expect(svg).toContain('@media (prefers-color-scheme:dark){svg{--bg:#161b22')
  expect(svg).not.toMatch(/fill="#161b22"/)
  expect(svg).not.toContain('textLength')
})

test('cardSvg squeezes detail text that would run past the card edge', () => {
  const svg = cardSvg({
    advice: 'a',
    adviceColor: '#66BB6A',
    model: '',
    meters: [{ label: '5시간', percent: 15, color: '#BA68C8', detail: '리셋 6d23h · 1h30m 전 기준 · 아주 긴 설명 문자열' }],
    footer: 'f',
  })
  expect(svg).toContain('lengthAdjust="spacingAndGlyphs"')
})
