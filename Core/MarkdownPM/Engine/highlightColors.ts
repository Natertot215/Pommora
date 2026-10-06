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

const MARK = `(?:${[...COLOR_OF.keys()].join('|')})️?`
const LEADING = new RegExp(`^${MARK}`, 'u')
const TRAILING = new RegExp(`${MARK}$`, 'u')

export interface ColorMark {
  color: HighlightColor
  length: number
}

function markOf(m: RegExpExecArray | null): ColorMark | null {
  if (!m) return null
  return { color: COLOR_OF.get(m[0].replace('️', ''))!, length: m[0].length }
}

/** The color mark `text` opens on, when it is one whole emoji. */
export const leadingMark = (text: string): ColorMark | null => markOf(LEADING.exec(text))

export const trailingMark = (text: string): ColorMark | null => markOf(TRAILING.exec(text))

/** True when `text` is exactly one color mark, as a typed emoji arrives. */
export const isColorMark = (text: string): boolean => leadingMark(text)?.length === text.length
