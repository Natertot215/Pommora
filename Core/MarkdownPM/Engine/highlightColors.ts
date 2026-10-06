import type { CellKey } from '@pommora/uix/Theme/colors'

/** A highlight's color rides in the file as a color emoji inside each `==`; the circle is the one written, and every other shape reads as the same color. */
export const HIGHLIGHT_COLORS = {
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

export type HighlightColor = keyof typeof HIGHLIGHT_COLORS

export const HIGHLIGHT_COLOR_NAMES = Object.keys(HIGHLIGHT_COLORS) as HighlightColor[]

export const writtenMark = (color: HighlightColor): string => HIGHLIGHT_COLORS[color].marks[0]

const COLOR_OF = new Map<string, HighlightColor>(
  HIGHLIGHT_COLOR_NAMES.flatMap((color) =>
    HIGHLIGHT_COLORS[color].marks.map((mark) => [mark, color] as const),
  ),
)

// A mark is at most a surrogate pair and its variation selector; one unit past it tells whether it joins a longer emoji.
const VARIATION_SELECTOR = '\uFE0F'
const MARK_WIDTH = 4
const MARK = `(?:${[...COLOR_OF.keys()].join('|')})${VARIATION_SELECTOR}?`
// A mark joined into a longer emoji (`❤️‍🔥`, `🐈‍⬛`) belongs to that emoji.
const LEADING = new RegExp(`^${MARK}(?![${VARIATION_SELECTOR}\u200D])`, 'u')
const TRAILING = new RegExp(`(?<!\u200D)${MARK}$`, 'u')

interface ColorMark {
  color: HighlightColor
  length: number
}

function markOf(m: RegExpExecArray | null): ColorMark | null {
  if (!m) return null
  return { color: COLOR_OF.get(m[0].replace(VARIATION_SELECTOR, ''))!, length: m[0].length }
}

export const markAfter = (text: string, at: number): ColorMark | null =>
  markOf(LEADING.exec(text.slice(at, at + MARK_WIDTH)))

export const markBefore = (text: string, at: number): ColorMark | null =>
  markOf(TRAILING.exec(text.slice(Math.max(0, at - MARK_WIDTH), at)))

/** True when `text` is exactly one color mark, as a typed emoji arrives. */
export const isColorMark = (text: string): boolean => markAfter(text, 0)?.length === text.length
