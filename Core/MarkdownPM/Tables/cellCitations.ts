// A cell editor's document is one cell, so its own scan can never bind a marker — the citations that
// number it live in the page around it. This gives the entered cell the same numbering source the
// resting cell draws from, so the glyph does not change when the caret arrives.
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view'
import { RangeSetBuilder, StateEffect, type Extension } from '@codemirror/state'
import { tokenize } from '../Tokens'
import { CiteRefWidget } from '../Editor/decorations'

type OrdinalOf = (label: string) => number | null

/** The document's numbering moved — no transaction this cell's own editor sees says so, so the host
 *  holding the whole-document answer fires this instead. */
export const citesChanged = StateEffect.define<null>()

function marks(view: EditorView, ordinalOf?: OrdinalOf): DecorationSet {
  const text = view.state.doc.toString()
  const builder = new RangeSetBuilder<Decoration>()
  for (const tk of tokenize(text)) {
    if (tk.kind !== 'citationRef') continue
    const n = ordinalOf?.(text.slice(tk.contentRange[0], tk.contentRange[1])) ?? null
    if (n !== null)
      builder.add(tk.range[0], tk.range[1], Decoration.replace({ widget: new CiteRefWidget(n) }))
  }
  return builder.finish()
}

export function cellCitations(getOrdinalOf: () => OrdinalOf | undefined): Extension {
  const plugin = ViewPlugin.fromClass(
    class {
      deco: DecorationSet
      constructor(view: EditorView) {
        this.deco = marks(view, getOrdinalOf())
      }
      update(u: ViewUpdate): void {
        if (u.docChanged || u.transactions.some((tr) => tr.effects.some((e) => e.is(citesChanged))))
          this.deco = marks(u.view, getOrdinalOf())
      }
    },
    { decorations: (v) => v.deco },
  )
  // The same range the widget covers, so the caret steps over a marker here exactly as it does in
  // the body rather than seating inside characters nothing on screen stands for.
  return [
    plugin,
    EditorView.atomicRanges.of((view) => view.plugin(plugin)?.deco ?? Decoration.none),
  ]
}
