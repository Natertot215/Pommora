// A cell editor's document is one cell, so its own scan can never bind a marker — this gives the entered cell the same numbering source the resting cell draws from, so the glyph does not change when the caret arrives.
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view'
import { RangeSetBuilder, type Extension } from '@codemirror/state'
import { CiteRefWidget, drawnTokensOf } from '../decorations'
import { redrawNudge } from '../api'

type OrdinalOf = (label: string) => number | null

function marks(view: EditorView, ordinalOf: OrdinalOf): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  // The tokens the cell's own draw just read, since this plugin follows `editorBase` in the cell's extensions.
  for (const tk of drawnTokensOf(view)) {
    if (tk.kind !== 'citationRef') continue
    const n = ordinalOf(view.state.sliceDoc(...tk.contentRange))
    if (n !== null)
      builder.add(tk.range[0], tk.range[1], Decoration.replace({ widget: new CiteRefWidget(n) }))
  }
  return builder.finish()
}

export function cellCitations(getOrdinalOf: () => OrdinalOf): Extension {
  const plugin = ViewPlugin.fromClass(
    class {
      deco: DecorationSet
      constructor(view: EditorView) {
        this.deco = marks(view, getOrdinalOf())
      }
      update(u: ViewUpdate): void {
        if (u.docChanged || u.transactions.some((tr) => tr.effects.some((e) => e.is(redrawNudge))))
          this.deco = marks(u.view, getOrdinalOf())
      }
    },
    { decorations: (v) => v.deco },
  )
  // The same range the widget covers, so the caret steps over a marker here exactly as it does in the body rather than seating inside characters nothing on screen stands for.
  return [
    plugin,
    EditorView.atomicRanges.of((view) => view.plugin(plugin)?.deco ?? Decoration.none),
  ]
}
