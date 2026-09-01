// Every hidden range the caret must not enter, in one whole-document walk: a callout line's prefix
// (the head's `> [!type] ` and each body line's `> `) and every resolved footnote marker, whose
// four-odd characters stand behind a number widget. The walk is whole-document on purpose — the
// decoration pass is viewport-scoped, so a marker taking its atomicity from there would delete one
// way on screen and another above the fold.
//
// The caret can't land inside a range, so no delete variant can corrupt it char-by-char: it either
// removes the whole range or leaves it untouched. The custom Backspace handler still runs first
// (Prec.high) for its join behavior — atomic ranges don't block a programmatic dispatch, only CM's
// own default cursor-motion/deletion.
import { EditorView, Decoration } from '@codemirror/view'
import { RangeSetBuilder, type RangeSet } from '@codemirror/state'
import { docScan } from './docCache'

function hiddenRanges(view: EditorView): RangeSet<Decoration> {
  const { lines, callouts: info, citations } = docScan(view.state.doc)
  const builder = new RangeSetBuilder<Decoration>()
  const { markers } = citations
  let m = 0
  let off = 0
  for (let i = 0; i < lines.length; i++) {
    const co = info[i]
    if (co && co.prefixEnd > 0) builder.add(off, off + co.prefixEnd, Decoration.mark({}))
    while (m < markers.length && markers[m].line <= i) {
      const mk = markers[m++]
      if (mk.ordinal !== null) builder.add(mk.from, mk.to, Decoration.mark({}))
    }
    off += lines[i].length + 1
  }
  return builder.finish()
}

export const calloutAtomic = EditorView.atomicRanges.of(hiddenRanges)
