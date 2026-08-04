// The embed grip's native menu — "Embed Page ▸" on any rail grip (inserting a fenced embed below
// that block), "Page Source ▸" + "Delete Embed" on an embed tile's own grip. Mirrors the callout
// grip menu's shape: gutter hit-test, block span resolved before the ask, pick applied on the
// promise, hot flag cleared after the modal menu (no mousemove fires under it).
import { EditorView } from '@codemirror/view'
import type { CollectionNode, NexusTree, SetNode } from '@shared/types'
import type { EmbedMenuContext, EmbedPickNode } from '@shared/embedMenu'
import { useSession } from '../../store'
import { blockAt } from './blockModel'
import { docString } from './docCache'
import { embeddable } from './embedRanges'
import { embedExclusions } from './embedWidget'

/** The Collections → Sets → Pages pick tree, minus everything `embeddable` rules out; a container
 *  with nothing pickable beneath it drops out entirely. */
export function embedPickTree(tree: NexusTree, exclude: ReadonlySet<string>): EmbedPickNode[] {
  const kept = (n: EmbedPickNode | null): n is EmbedPickNode => n !== null
  const page = (p: { title: string }): EmbedPickNode | null =>
    embeddable(p.title, exclude) ? { label: p.title, title: p.title } : null
  const container = (c: CollectionNode | SetNode): EmbedPickNode | null => {
    const children = [...(c.sets ?? []).map(container), ...c.pages.map(page)].filter(kept)
    return children.length > 0 ? { label: c.title, children } : null
  }
  return tree.collections.map(container).filter(kept)
}

/** The fenced insert below a block: always blank-separated above, and below whenever the next
 *  line holds content. Returns a change spec; the caller dispatches. */
export function embedInsertAfter(
  doc: string,
  blockTo: number,
  title: string,
): { from: number; to: number; insert: string } {
  const embed = `![[${title}]]`
  if (blockTo >= doc.length) return { from: doc.length, to: doc.length, insert: `\n\n${embed}` }
  const nextLineStart = blockTo + 1
  const nextLineEnd = doc.indexOf('\n', nextLineStart)
  const nextLine = doc.slice(nextLineStart, nextLineEnd === -1 ? doc.length : nextLineEnd)
  const trail = nextLine.trim() === '' ? '' : '\n'
  return { from: blockTo, to: blockTo, insert: `\n\n${embed}${trail}` }
}

/** The menu delete's span: the tile line and its trailing newline, plus one fencing blank when the
 *  tile sat between two (a single separator survives); at EOF the preceding newline goes instead. */
export function embedDeleteSpan(
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

export const embedGripMenu = EditorView.domEventHandlers({
  contextmenu(e, view) {
    if (view.state.readOnly) return false // a resting tile's inner grips offer nothing actionable
    const line = (e.target as HTMLElement).closest?.('.cm-line.md-block-handle') as HTMLElement | null
    if (!line || e.clientX >= line.getBoundingClientRect().left) return false
    const doc = docString(view.state.doc)
    const block = blockAt(doc, view.posAtDOM(line))
    if (!block) return false
    const tree = useSession.getState().tree
    if (!tree) return false
    e.preventDefault()
    const exclude = embedExclusions(view.state)
    const mode: EmbedMenuContext['mode'] = block.kind === 'embed' ? 'tile' : 'create'
    void window.nexus?.embedMenu?.({ mode, tree: embedPickTree(tree, exclude) }).then((action) => {
      if (action) {
        const current = docString(view.state.doc)
        if (action.action === 'embed') {
          view.dispatch({ changes: embedInsertAfter(current, block.to, action.title), userEvent: 'input' })
        } else if (action.action === 'source') {
          // The block span IS the embed line (claimed or not) — an unresolved or duplicate token
          // re-aims exactly like a live tile; acting through the claimed set would dead-end the
          // menu precisely when a stale embed needs re-aiming.
          view.dispatch({
            changes: { from: block.from, to: block.to, insert: `![[${action.title}]]` },
            userEvent: 'input',
          })
        } else {
          const span = embedDeleteSpan(current, block)
          view.dispatch({ changes: { from: span.from, to: span.to, insert: '' }, userEvent: 'delete' })
          // The grip is gone with its block, and no mousemove fired under the modal — clear by hand.
          window.nexus?.setGripHot?.(false)
        }
      }
      view.focus()
    })
    return true
  },
})
