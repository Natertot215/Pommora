// Every block grip's right-click menu. A press in the gutter strip resolves to the whole block through
// `blockAt`, and that block's kind decides what it offers — Delete on all of them, "Type ▸" on a list,
// "Page Source ▸" on an embed tile. The generic editor menu stands down over a grip because the rail
// hover flags it hot to main (blockGripHover → setGripHot), so this is the only menu there.
//
// The span is resolved before the ask and the pick applied on the promise; the hot flag is cleared by
// hand after a delete, since no mousemove fires under a modal native menu.
import { EditorView } from '@codemirror/view'
import type { CollectionNode, NexusTree, SetNode } from '@shared/types'
import type { GripMenuContext, PickNode } from '@shared/gripMenu'
import { useSession } from '../../store'
import { listKindOf, setListKind } from '../input/format'
import { type Block, blockAt } from './blockModel'
import { docString } from './docCache'
import { embeddable } from './embedRanges'
import { embedExclusions } from './embedWidget'

/** The line classes carrying a grip that has a menu. The hit-test below and the host's hot-grip flag
 *  read this one list, so the generic editor menu can never stand down over a grip that offers nothing. */
export const GRIP_MENU_LINES = ['md-block-handle', 'md-callout-first', 'md-bq-first']
const GRIP_SELECTOR = GRIP_MENU_LINES.map((c) => `.cm-line.${c}`).join(', ')

/** The Collections → Sets → Pages pick tree, minus everything `embeddable` rules out; a container with
 *  nothing pickable beneath it drops out entirely. */
export function embedPickTree(tree: NexusTree, exclude: ReadonlySet<string>): PickNode[] {
  const kept = (n: PickNode | null): n is PickNode => n !== null
  const page = (p: { title: string }): PickNode | null =>
    embeddable(p.title, exclude) ? { label: p.title, title: p.title } : null
  const container = (c: CollectionNode | SetNode): PickNode | null => {
    const children = [...(c.sets ?? []).map(container), ...c.pages.map(page)].filter(kept)
    return children.length > 0 ? { label: c.title, children } : null
  }
  return tree.collections.map(container).filter(kept)
}

/** What Delete removes: the block's lines and their trailing newline, plus one fencing blank when the
 *  block sat between two (a single separator survives); at EOF the preceding newline goes instead. */
export function blockDeleteSpan(
  doc: string,
  r: { from: number; to: number },
): { from: number; to: number } {
  const prevEnd = r.from - 1
  const prevStart = doc.lastIndexOf('\n', prevEnd - 1) + 1
  const prevBlank = r.from >= 2 && doc.slice(prevStart, prevEnd).trim() === ''
  const hasTrailingNewline = r.to < doc.length && doc[r.to] === '\n'
  if (!hasTrailingNewline) return { from: Math.max(0, r.from - 1), to: r.to }
  const nextStart = r.to + 1
  const nextEnd = doc.indexOf('\n', nextStart)
  const nextBlank = doc.slice(nextStart, nextEnd === -1 ? doc.length : nextEnd).trim() === ''
  if (prevBlank && nextBlank && nextEnd !== -1) return { from: r.from, to: nextEnd + 1 }
  return { from: r.from, to: r.to + 1 }
}

function contextFor(view: EditorView, doc: string, block: Block): GripMenuContext {
  switch (block.kind) {
    case 'embed': {
      const tree = useSession.getState().tree
      return { kind: 'embed', tree: tree ? embedPickTree(tree, embedExclusions(view.state)) : [] }
    }
    case 'list':
      return { kind: 'list', current: listKindOf(doc, block.from, block.to) }
    default:
      return { kind: 'plain' }
  }
}

export const gripMenu = EditorView.domEventHandlers({
  contextmenu(e, view) {
    if (view.state.readOnly) return false // a resting tile's inner grips offer nothing actionable
    const line = (e.target as HTMLElement).closest?.(GRIP_SELECTOR) as HTMLElement | null
    if (!line || e.clientX >= line.getBoundingClientRect().left) return false
    const doc = docString(view.state.doc)
    const block = blockAt(doc, view.posAtDOM(line))
    if (!block) return false
    e.preventDefault()
    void window.nexus?.gripMenu?.(contextFor(view, doc, block)).then((action) => {
      // The menu is modal, so the document under it is the one the span was resolved against.
      switch (action?.action) {
        case 'source':
          // The block span IS the embed line (claimed or not) — an unresolved or duplicate token
          // re-aims exactly like a live tile; acting through the claimed set would dead-end the menu
          // precisely when a stale embed needs re-aiming.
          view.dispatch({
            changes: { from: block.from, to: block.to, insert: `![[${action.title}]]` },
            userEvent: 'input',
          })
          break
        case 'listKind': {
          const { changes } = setListKind(doc, block.from, block.to, action.kind)
          if (changes.length > 0) view.dispatch({ changes, userEvent: 'input' })
          break
        }
        case 'delete': {
          const span = blockDeleteSpan(doc, block)
          view.dispatch({
            changes: { from: span.from, to: span.to, insert: '' },
            userEvent: 'delete',
          })
          // The grip is gone with its block, and no mousemove fired under the modal — clear by hand.
          window.nexus?.setGripHot?.(false)
          break
        }
      }
      view.focus()
    })
    return true
  },
})
