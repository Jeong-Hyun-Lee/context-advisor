// SVG card for remote surfaces (desktop, VS Code, mobile); the terminal has no Svg element.
export type SvgMeter = { label: string; percent: number; color: string; detail: string }

export type SvgCard = {
  advice: string
  adviceColor: string
  model: string
  meters: SvgMeter[]
  footer: string
}

const W = 520
const ROW = 30
const TOP = 46
const TRACK_X = 96
const TRACK_W = 250

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const cardSvg = (c: SvgCard): string => {
  const h = TOP + c.meters.length * ROW + 34
  const defs = c.meters
    .map(
      (m, i) =>
        `<linearGradient id="g${i}" x1="0" x2="1"><stop offset="0" stop-color="${m.color}" stop-opacity=".55"/><stop offset="1" stop-color="${m.color}"/></linearGradient>`,
    )
    .join('')
  const rows = c.meters
    .map((m, i) => {
      const y = TOP + i * ROW
      const fill = Math.round((Math.min(Math.max(m.percent, 0), 100) / 100) * TRACK_W)
      return [
        `<text x="18" y="${y + 13}" class="l">${esc(m.label)}</text>`,
        `<rect x="${TRACK_X}" y="${y + 2}" width="${TRACK_W}" height="14" rx="7" class="t"/>`,
        fill > 0 ? `<rect x="${TRACK_X}" y="${y + 2}" width="${Math.max(fill, 14)}" height="14" rx="7" fill="url(#g${i})"/>` : '',
        `<text x="${TRACK_X + TRACK_W + 12}" y="${y + 13}" class="p">${Math.round(m.percent)}%</text>`,
        `<text x="${TRACK_X + TRACK_W + 54}" y="${y + 13}" class="d">${esc(m.detail)}</text>`,
      ].join('')
    })
    .join('')
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}">`,
    `<defs>${defs}</defs>`,
    '<style>text{font:12px system-ui,sans-serif;fill:#c9d1d9}.l{fill:#8b949e}.p{font-weight:600}.d{fill:#8b949e}.t{fill:#30363d}.h{font-size:13px;font-weight:700}</style>',
    `<rect x=".5" y=".5" width="${W - 1}" height="${h - 1}" rx="12" fill="#161b22" stroke="${c.adviceColor}" stroke-opacity=".6"/>`,
    `<circle cx="22" cy="22" r="5" fill="${c.adviceColor}"/>`,
    `<text x="34" y="26" class="h" style="fill:${c.adviceColor}">${esc(c.advice)}</text>`,
    `<text x="${W - 18}" y="26" text-anchor="end" class="d">${esc(c.model)}</text>`,
    rows,
    `<text x="18" y="${h - 14}" class="d">${esc(c.footer)}</text>`,
    '</svg>',
  ].join('')
}
