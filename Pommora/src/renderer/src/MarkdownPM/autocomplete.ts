import { pageLinkPattern } from '@shared/connections'
import { lineStartAt, lineEndAt } from './input'

/** `[[Title]]` connection vs `![[Title]]` embed — decides the committed form. */
export type ConnectionForm = 'link' | 'embed'

export interface AutocompleteQuery {
  query: string
  /** The full marker span to replace when a candidate is accepted. */
  from: number
  to: number
  form: ConnectionForm
}

export function autocompleteQuery(
  doc: string,
  caret: number,
  allowEmbeds = false,
): AutocompleteQuery | null {
  const lineStart = lineStartAt(doc, caret)
  const line = doc.slice(lineStart, lineEndAt(doc, caret))
  const rel = caret - lineStart
  const re = pageLinkPattern()
  for (let m = re.exec(line); m; m = re.exec(line)) {
    const open = m.index
    const close = m.index + m[0].length
    // Only the TITLE opens the page picker. Accepting a candidate replaces the whole token, so a
    // caret in the alias would arm a list keyed on the title and discard the alias on Enter —
    // destroying the very text the caret is sitting in. An unaliased link is unaffected: its title
    // ends exactly where the closer begins.
    const titleEnd = open + 2 + m[1].length
    if (rel >= open + 2 && rel <= titleEnd)
      return { query: m[1], from: lineStart + open, to: lineStart + close, form: 'link' }
  }
  // The embed branch is a LOCAL match — the connections pattern excludes `![[` by design (four
  // consumers depend on that), and `[` doesn't auto-pair after `!`, so an in-progress embed is
  // usually unclosed: the span runs to the closer when one exists, else to the line end.
  if (allowEmbeds) {
    for (let idx = line.indexOf('![['); idx !== -1; idx = line.indexOf('![[', idx + 3)) {
      const contentStart = idx + 3
      const closeIdx = line.indexOf(']]', contentStart)
      const contentEnd = closeIdx === -1 ? line.length : closeIdx
      const spanEnd = closeIdx === -1 ? line.length : closeIdx + 2
      if (rel >= contentStart && rel <= contentEnd)
        return {
          query: line.slice(contentStart, contentEnd),
          from: lineStart + idx,
          to: lineStart + spanEnd,
          form: 'embed',
        }
    }
  }
  return null
}

/** The committed form. An `alias` rides only the link form — `![[ ]]` has no alias syntax, and an
 *  empty one collapses rather than writing a bare pipe. */
export function connectionInsert(
  title: string,
  from: number,
  form: ConnectionForm = 'link',
  alias?: string,
): { insert: string; caret: number } {
  if (form === 'embed') {
    const insert = `![[${title}]]`
    return { insert, caret: from + insert.length }
  }
  const insert = alias ? `[[${title}|${alias}]]` : `[[${title}]]`
  return { insert, caret: from + insert.length }
}

// Panel geometry — shared by the main editor and table cells. AC_ROW_H/AC_PADDING track .mdpm-ac in Styles.css.
export const AC_MAX = 6
const AC_ROW_H = 28
const AC_PADDING = 8
const AC_MAX_ROWS = 4
const AC_GAP = 4

// Anchor the panel below the caret; flip above when it would overflow the viewport bottom. Coords are
// viewport-relative (the panel is position:fixed), so this works the same from the main editor or a cell.
export function acPanelTop(caretTop: number, caretBottom: number, count: number): number {
  const h = Math.min(count, AC_MAX_ROWS) * AC_ROW_H + AC_PADDING
  return caretBottom + AC_GAP + h > window.innerHeight
    ? caretTop - h - AC_GAP
    : caretBottom + AC_GAP
}
