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
import { listKindOf, setHeading, setListKind, type HeadingLevel } from '../input/format'
import { headingParts } from '../detect'
import { type Block, blockAt } from './blockModel'
import { docScan, docString } from './docCache'
import { embeddable } from './embedRanges'
import { embedExclusions, setWebLinkSeat } from './embedWidget'
import { focusRange } from './caretSeat'
import { webpageEmbedUrlSpan } from '@shared/webpageEmbed'

/** The line classes carrying a grip that has a menu. The hit-test below and the host's hot-grip flag
 *  read this one list, so the generic editor menu can never stand down over a grip that offers nothing. */
export const GRIP_MENU_LINES = ['md-block-handle', 'md-callout-first', 'md-bq-first']
const GRIP_SELECTOR = GRIP_MENU_LINES.map((c) => `.cm-line.${c}`).join(', ')

/** A foldable heading carries its own gutter menu on its chevron. */
const HEADING_LINE = 'md-foldable'

/** Every gutter line whose right-press pops a custom menu — grips plus the heading chevron. The host's
 *  hot flag reads this so the generic editor menu stands down over exactly the lines the two hit-tests
 *  below claim, never one more or fewer. */
export const HOT_MENU_LINES = [...GRIP_MENU_LINES, HEADING_LINE]

/** The gutter-strip line a right-press landed on for a given class, or null on the line's own text — a
 *  press past the content column's left edge is never a gutter press. */
function gutterLineAt(e: MouseEvent, selector: string): HTMLElement | null {
  const line = (e.target as HTMLElement).closest?.(selector) as HTMLElement | null
  return line && e.clientX < line.getBoundingClientRect().left ? line : null
}

const gripLineAt = (e: MouseEvent): HTMLElement | null => gutterLineAt(e, GRIP_SELECTOR)
const headingLineAt = (e: MouseEvent): HTMLElement | null =>
  gutterLineAt(e, `.cm-line.${HEADING_LINE}`)

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
    case 'webpage':
      return { kind: 'webpage' }
    case 'list':
      return { kind: 'list', current: listKindOf(doc, block.from, block.to) }
    default:
      return { kind: 'plain' }
  }
}

/** Rename / Size / Delete for the heading whose chevron was pressed. Delete drops the heading LINE
 *  only (its body survives), unlike a grip's whole-block Delete. */
function popHeadingMenu(view: EditorView, headingEl: HTMLElement): void {
  const doc = docString(view.state.doc)
  const line = view.state.doc.lineAt(view.posAtDOM(headingEl))
  const parts = headingParts(line.text)
  if (!parts) return
  const contentStart = line.from + parts.indent.length + parts.hashes.length + parts.space.length
  void window.nexus?.gripMenu?.({ kind: 'heading', level: parts.hashes.length }).then((action) => {
    switch (action?.action) {
      case 'rename':
        // Select the heading's text so a keystroke replaces it — the editor's own inline rename.
        focusRange(view, contentStart, line.to)
        break
      case 'size': {
        const edit = setHeading(doc, line.from, action.level as HeadingLevel)
        view.dispatch({
          changes: edit.changes,
          selection: edit.selection !== undefined ? { anchor: edit.selection } : undefined,
          userEvent: 'input',
        })
        view.focus()
        break
      }
      case 'delete': {
        // The heading LINE alone — its body stays, folding up under the previous heading.
        const span = blockDeleteSpan(doc, { from: line.from, to: line.to })
        view.dispatch({
          changes: { from: span.from, to: span.to, insert: '' },
          userEvent: 'delete',
        })
        window.nexus?.setGripHot?.(false) // the chevron is gone and no mousemove fires under a modal
        break
      }
    }
  })
}

export const gripMenu = EditorView.domEventHandlers({
  // A grip acts on its block, never on the caret. The drag gestures already suppress the browser's
  // caret placement on a left-press; a right-press needs the same, since preventing the contextmenu
  // that follows comes far too late to stop the seat.
  mousedown(e) {
    if (e.button !== 2 || (!gripLineAt(e) && !headingLineAt(e))) return false
    e.preventDefault()
    return true
  },
  contextmenu(e, view) {
    if (view.state.readOnly) return false // a resting tile's inner grips offer nothing actionable
    const headingEl = headingLineAt(e)
    if (headingEl) {
      e.preventDefault()
      popHeadingMenu(view, headingEl)
      return true
    }
    const line = gripLineAt(e)
    if (!line) return false
    const block = blockAt(docScan(view.state.doc), view.posAtDOM(line))
    if (!block) return false
    const doc = docString(view.state.doc)
    const opened = doc.slice(block.from, block.to)
    e.preventDefault()
    void window.nexus?.gripMenu?.(contextFor(view, doc, block)).then((action) => {
      if (!action) return
      // A native menu can be held open for as long as the user likes, and an undo or an outside
      // write can move the document underneath it. The block is re-found where the grip was and
      // matched against what the menu was built from; a document that no longer holds it declines
      // the action, exactly as a resting cell's link menu does. Spending the captured span instead
      // reaches past the end of a shortened document, inside a promise, unhandled.
      const doc = docString(view.state.doc)
      const block = blockAt(docScan(view.state.doc), view.posAtDOM(line))
      if (!block || doc.slice(block.from, block.to) !== opened) return
      switch (action.action) {
        case 'source':
          // The block span IS the embed line (claimed or not) — an unresolved or duplicate token
          // re-aims exactly like a live tile; acting through the claimed set would dead-end the menu
          // precisely when a stale embed needs re-aiming.
          view.dispatch({
            changes: { from: block.from, to: block.to, insert: `![[${action.title}]]` },
            userEvent: 'input',
          })
          break
        case 'editLink': {
          // In the line itself, like every other Edit Link: the seat un-forms the tile back to its
          // raw address with that address selected, and leaving the line re-forms it. The site is
          // only asked to load again once the new address is the document's.
          const line = view.state.doc.lineAt(block.from)
          const span = webpageEmbedUrlSpan(line.text)
          if (span) {
            view.dispatch({ effects: setWebLinkSeat.of(line.from) })
            focusRange(view, line.from + span[0], line.from + span[1])
          }
          break
        }
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
    })
    return true
  },
})
