// The generic editor menu stands down over a grip because the rail hover flags it hot to main; the flag is cleared by hand after a delete, since no mousemove fires under a modal menu.
import { EditorView } from '@codemirror/view'
import { pageEmbedText } from '@pommora/core/Connections/connections'
import type { GripMenuContext, ListKind, PickNode } from '@pommora/core/Actions/gripMenu'
import { listKindOf, setHeading, setListKind, type HeadingLevel } from '../Input/format'
import { headingParts } from '../Engine/detect'
import { ZOOM_STEPS } from '../../Tiles/tileZoom'
import { type Block, blockAt } from '../Engine/blockModel'
import { docScan, docString } from '../docCache'
import { embeddable } from '../Engine/embedRanges'
import { HEADING_FOLD_LINE } from '../folding'
import { applyEmbedZoom, embedExclusions, embedZoomAt, setWebLinkSeat } from '../Embeds/embedWidget'
import { focusRange } from '../caretPlacement'
import { webpageEmbedUrlSpan } from '@pommora/core/Web/webpageEmbed'
import { type EditorHost, editorHost } from '../api'

const GRIP_MENU_LINES = ['md-block-handle', 'md-callout-first', 'md-bq-first']
const GRIP_SELECTOR = GRIP_MENU_LINES.map((c) => `.cm-line.${c}`).join(', ')

export const HOT_MENU_LINES = [...GRIP_MENU_LINES, HEADING_FOLD_LINE]

/** Null on the line's own text — a press past the content column's left edge is never a gutter press. */
function gutterLineAt(e: MouseEvent, selector: string): HTMLElement | null {
  const line = (e.target as HTMLElement).closest?.(selector) as HTMLElement | null
  return line && e.clientX < line.getBoundingClientRect().left ? line : null
}

const gripLineAt = (e: MouseEvent): HTMLElement | null => gutterLineAt(e, GRIP_SELECTOR)
const headingLineAt = (e: MouseEvent): HTMLElement | null =>
  gutterLineAt(e, `.cm-line.${HEADING_FOLD_LINE}`)

export function embedPickTree(
  nodes: readonly PickNode[],
  exclude: ReadonlySet<string>,
): PickNode[] {
  const kept: PickNode[] = []
  for (const n of nodes) {
    if (n.children) {
      const children = embedPickTree(n.children, exclude)
      if (children.length > 0) kept.push({ label: n.label, children })
    } else if (n.title !== undefined && embeddable(n.title, exclude)) kept.push(n)
  }
  return kept
}

/** Plus one fencing blank when the block sat between two (a single separator survives); at EOF the preceding newline goes. */
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
      const host = view.state.facet(editorHost)
      return {
        kind: 'embed',
        tree: embedPickTree(host.pickTree(), embedExclusions(view.state)),
        zoomSteps: ZOOM_STEPS,
        zoom: embedZoomAt(view.state, block.from),
      }
    }
    case 'webpage':
      return {
        kind: 'webpage',
        zoomSteps: ZOOM_STEPS,
        zoom: embedZoomAt(view.state, block.from),
      }
    case 'list':
      return { kind: 'list', current: listKindOf(doc, block.from, block.to) }
    default:
      return { kind: 'plain' }
  }
}

function popHeadingMenu(view: EditorView, headingEl: HTMLElement): void {
  const opened = view.state.doc.lineAt(view.posAtDOM(headingEl))
  const level = headingParts(opened.text)?.hashes.length
  if (level === undefined) return
  const host = view.state.facet(editorHost)
  void host.menus.grip({ kind: 'heading', level }).then((action) => {
    if (!action) return
    // Re-found and matched against what the menu was built from — a native menu can stay open while an undo moves the document.
    const doc = docString(view.state.doc)
    const line = view.state.doc.lineAt(view.posAtDOM(headingEl))
    const parts = headingParts(line.text)
    if (!parts || line.text !== opened.text) return
    const contentStart = line.from + parts.indent.length + parts.hashes.length + parts.space.length
    if (action === 'rename') focusRange(view, contentStart, line.to)
    else if (action === 'delete') {
      const span = blockDeleteSpan(doc, { from: line.from, to: line.to })
      view.dispatch({
        changes: { from: span.from, to: span.to, insert: '' },
        userEvent: 'delete',
      })
      host.menus.gripHot(false)
    } else {
      // The grip addresses one block, so the range is that heading's own line — the selection belongs to the caret.
      const level = Number(action.slice('size:'.length)) as HeadingLevel
      const edit = setHeading(doc, line.from, line.from, level)
      view.dispatch({
        changes: edit.changes,
        selection: edit.selection !== undefined ? { anchor: edit.selection } : undefined,
        userEvent: 'input',
      })
      view.focus()
    }
  })
}

export const gripMenu = EditorView.domEventHandlers({
  // A grip acts on its block, never on the caret, and a right-press needs the same suppression the drag gestures give a left-press: preventing the contextmenu comes far too late to stop the seat.
  mousedown(e) {
    if (e.button !== 2 || (!gripLineAt(e) && !headingLineAt(e))) return false
    e.preventDefault()
    return true
  },
  contextmenu(e, view) {
    if (view.state.readOnly) return false
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
    const host: EditorHost = view.state.facet(editorHost)
    void host.menus.grip(contextFor(view, doc, block)).then((action) => {
      if (!action) return
      const doc = docString(view.state.doc)
      const block = blockAt(docScan(view.state.doc), view.posAtDOM(line))
      if (!block || doc.slice(block.from, block.to) !== opened) return
      const arg = (prefix: string): string | undefined =>
        action.startsWith(prefix) ? action.slice(prefix.length) : undefined
      const title = arg('source:')
      const zoom = arg('zoom:')
      const kind = arg('listKind:')
      if (title !== undefined) {
        // The block span IS the embed line, claimed or not — acting through the claimed set would dead-end the menu precisely when a stale embed needs re-aiming.
        view.dispatch({
          changes: { from: block.from, to: block.to, insert: pageEmbedText(title) },
          userEvent: 'input',
        })
      } else if (zoom !== undefined) applyEmbedZoom(view, block.from, Number(zoom))
      else if (kind !== undefined) {
        const { changes } = setListKind(doc, block.from, block.to, kind as ListKind)
        if (changes.length > 0) view.dispatch({ changes, userEvent: 'input' })
      } else if (action === 'editLink') {
        // The seat un-forms the tile back to its raw address with that address selected; leaving the line re-forms it.
        const line = view.state.doc.lineAt(block.from)
        const span = webpageEmbedUrlSpan(line.text)
        if (span) {
          view.dispatch({ effects: setWebLinkSeat.of(line.from) })
          focusRange(view, line.from + span[0], line.from + span[1])
        }
      } else if (action === 'delete') {
        const span = blockDeleteSpan(doc, block)
        view.dispatch({
          changes: { from: span.from, to: span.to, insert: '' },
          userEvent: 'delete',
        })
        // The grip is gone with its block, and no mousemove fired under the modal — clear by hand.
        host.menus.gripHot(false)
      }
    })
    return true
  },
})
