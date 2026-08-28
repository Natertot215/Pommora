// A cell editor's document is one cell, so its own scan can never bind a marker — the citations
// that number it live in the page around it. The resting cell already draws from the numbering the
// table carries; this gives the entered cell the same source, so the glyph does not change when the
// caret arrives. The pairing is the one the whole table layer keeps: a resting cell and its editor
// are two renderers over one answer, never one renderer with two answers.
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view'
import { RangeSetBuilder, StateEffect, type Extension } from '@codemirror/state'
import { tokenize } from '../tokens'
import { CiteRefWidget } from '../editor/decorations'

type OrdinalOf = (label: string) => number | null

/** The document's numbering moved. A cell's own document is one cell, so no transaction this editor
 *  can see ever says so — the host holding the whole-document answer says it instead, exactly as it
 *  hands the resting cell a fresh key to compare. */
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
