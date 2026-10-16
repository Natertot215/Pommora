import type { CellKey } from '@pommora/uix/Theme/colors'

/** How a span wears its color: a highlight washes behind its words, a text color inks them. */
export const PAINTS = ['highlight', 'textColor'] as const

export type Paint = (typeof PAINTS)[number]

export const isPaint = (kind: string): kind is Paint => (PAINTS as readonly string[]).includes(kind)

/** A painted span's color rides in the file as a color emoji right after its opener; the circle is the one written, and every other shape reads as the same color. */
export const PAINT_COLORS = {
  red: { cell: 'red-3', marks: ['🔴', '🟥', '❤'] },
  orange: { cell: 'orange-3', marks: ['🟠', '🟧', '🔶', '🔸', '🧡'] },
  yellow: { cell: 'yellow-3', marks: ['🟡', '🟨', '💛'] },
  green: { cell: 'green-3', marks: ['🟢', '🟩', '💚'] },
  blue: { cell: 'blue-1', marks: ['🔵', '🟦', '🔷', '🔹', '💙'] },
  purple: { cell: 'purple-1', marks: ['🟣', '🟪', '💜'] },
  brown: { cell: 'brown-3', marks: ['🟤', '🟫', '🤎'] },
  black: { cell: 'grey-4', marks: ['⚫', '⬛', '🖤'] },
  white: { cell: 'grey-7', marks: ['⚪', '⬜', '🤍'] },
} as const satisfies Record<string, { cell: CellKey; marks: readonly string[] }>

export type PaintColor = keyof typeof PAINT_COLORS

export const PAINT_COLOR_NAMES = Object.keys(PAINT_COLORS) as PaintColor[]

export const writtenMark = (color: PaintColor): string => PAINT_COLORS[color].marks[0]

/** The colors a paint takes: black and white only wash, since on the dark theme one inks too dim to read and the other inks as plain text. */
export const colorsOf = (paint: Paint): PaintColor[] =>
  paint === 'highlight'
    ? PAINT_COLOR_NAMES
    : PAINT_COLOR_NAMES.filter((color) => color !== 'black' && color !== 'white')

const COLOR_OF = new Map<string, PaintColor>(
  PAINT_COLOR_NAMES.flatMap((color) =>
    PAINT_COLORS[color].marks.map((mark) => [mark, color] as const),
  ),
)

// A mark is at most a surrogate pair and its variation selector; one unit past it tells whether it joins a longer emoji.
const VARIATION_SELECTOR = '\uFE0F'
const MARK_WIDTH = 4
/** A mark of one of `colors`, as a regex source: one joined into a longer emoji (`❤️‍🔥`) belongs to that emoji. */
export const leadingMark = (colors: readonly PaintColor[]): string =>
  `(?:${colors
    .flatMap((color) => PAINT_COLORS[color].marks)
    .join('|')})${VARIATION_SELECTOR}?(?![${VARIATION_SELECTOR}\u200D])`

const LEADING = new RegExp(`^${leadingMark(PAINT_COLOR_NAMES)}`, 'u')

export function markAfter(text: string, at: number): { color: PaintColor; length: number } | null {
  const m = LEADING.exec(text.slice(at, at + MARK_WIDTH))
  return m && { color: COLOR_OF.get(m[0].replace(VARIATION_SELECTOR, ''))!, length: m[0].length }
}
