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
  expect(svg).toContain('width="85"')
})
