import { shade } from './classify'

// SVG card for remote surfaces (desktop, VS Code, mobile); the terminal has no Svg element.
export type SvgMeter = { label: string; percent: number; color: string; detail: string }

export type SvgCard = {
  advice: string
  adviceColor: string
  model: string
  meters: SvgMeter[]
  footer: string
}

// Compact card; drawn at exactly this size (width/height passed to Svg) so the surface does not scale it up.
export const SVG_WIDTH = 400
const W = SVG_WIDTH
const ROW = 20
const TOP = 34
const TRACK_X = 74
const TRACK_W = 110
const DETAIL_X = TRACK_X + TRACK_W + 42
const DETAIL_ROOM = W - 14 - DETAIL_X

const themeCss = (accent: string): string => {
  const accentLight = shade(accent, 0.7)
  return [
    `svg{--bg:#ffffff;--fg:#1f2328;--mut:#59636e;--trk:#d8dee4;--acc:${accentLight}}`,
    `@media (prefers-color-scheme:dark){svg{--bg:#161b22;--fg:#c9d1d9;--mut:#8b949e;--trk:#30363d;--acc:${accent}}}`,
    'text{font:11px system-ui,sans-serif;fill:var(--fg)}.l,.d{fill:var(--mut)}.p{font-weight:600}',
    '.t{fill:var(--trk)}.h{font-size:12px;font-weight:700;fill:var(--acc)}.dot{fill:var(--acc)}',
    '.bg{fill:var(--bg);stroke:var(--acc);stroke-opacity:.6}',
  ].join('')
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Rough 11px advance: wide (Hangul/CJK) glyphs ~11px, the rest ~6.2px.
// ponytail: estimate, not measured; only used to squeeze text that would run past the card edge.
const textWidth = (s: string): number => [...s].reduce((w, ch) => w + (/[ᄀ-ᇿ　-鿿가-힯＀-￯]/.test(ch) ? 11 : 6.2), 0)
const fit = (s: string, room: number): string =>
  textWidth(s) > room ? ` textLength="${room}" lengthAdjust="spacingAndGlyphs"` : ''

export const cardHeight = (meters: number): number => TOP + meters * ROW + (meters > 0 ? 24 : 0)

export const cardSvg = (c: SvgCard): string => {
  const h = cardHeight(c.meters.length)
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
        `<text x="14" y="${y + 11}" class="l">${esc(m.label)}</text>`,
        `<rect x="${TRACK_X}" y="${y + 2}" width="${TRACK_W}" height="10" rx="5" class="t"/>`,
        fill > 0 ? `<rect x="${TRACK_X}" y="${y + 2}" width="${Math.max(fill, 10)}" height="10" rx="5" fill="url(#g${i})"/>` : '',
        `<text x="${TRACK_X + TRACK_W + 10}" y="${y + 11}" class="p">${Math.round(m.percent)}%</text>`,
        `<text x="${DETAIL_X}" y="${y + 11}" class="d"${fit(m.detail, DETAIL_ROOM)}>${esc(m.detail)}</text>`,
      ].join('')
    })
    .join('')
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}">`,
    `<defs>${defs}</defs>`,
    // Light by default; the host page's color scheme switches to dark (the SVG is drawn as an image in it).
    `<style>${themeCss(c.adviceColor)}</style>`,
    `<rect x=".5" y=".5" width="${W - 1}" height="${h - 1}" rx="10" class="bg"/>`,
    `<circle cx="18" cy="17" r="4" class="dot"/>`,
    `<text x="28" y="21" class="h">${esc(c.advice)}</text>`,
    `<text x="${W - 14}" y="21" text-anchor="end" class="d">${esc(c.model)}</text>`,
    rows,
    `<text x="14" y="${h - 10}" class="d"${fit(c.footer, W - 28)}>${esc(c.footer)}</text>`,
    '</svg>',
  ].join('')
}
