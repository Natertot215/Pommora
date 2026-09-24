/** Lucide's 24×24 stroke frame around hand-written markup, for a glyph drawn where an <Icon> can't mount. */
export const svgFrame = (
  body: string,
  {
    stroke = 'currentColor',
    strokeWidth = 2,
    size,
  }: { stroke?: string; strokeWidth?: number; size?: number } = {},
): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"${size ? ` width="${size}" height="${size}"` : ''} fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
