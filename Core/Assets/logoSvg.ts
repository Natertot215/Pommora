import {
  MARK_BOX,
  type MarkVariant,
  RING_OPACITY,
  markDiscs,
  markRings,
} from '@pommora/uix/Symbols/mark'

const round = (n: number): number => Math.round(n * 1000) / 1000

const circle = (cx: number, cy: number, r: number, extra = ''): string =>
  `<circle cx="${round(cx)}" cy="${round(cy)}" r="${round(r)}"${extra}/>`

export function markBody(variant: MarkVariant, fill: string): string {
  const discs = markDiscs(variant)
    .map(({ cx, cy, r }) => circle(cx, cy, r))
    .join('')
  const rings =
    variant === 'logo'
      ? `<g fill="none" stroke="${fill}" stroke-opacity="${RING_OPACITY}">${markRings()
          .map(({ cx, cy, r, w }) => circle(cx, cy, r, ` stroke-width="${round(w)}"`))
          .join('')}</g>`
      : ''
  return `<g fill="${fill}">${discs}</g>${rings}`
}

export function logoSvg(variant: MarkVariant, fill = 'currentColor'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK_BOX} ${MARK_BOX}" fill="none">${markBody(variant, fill)}</svg>`
}
