import { memo } from 'react'
import { linkTarget, tokenize, type Token } from '../tokens'
import { CONTENT_CLASS } from '../decorations/intent'
import { resolveMdTarget, type ConnectionsApi, type ConnMenuTarget } from '../connections'
import { titleOf } from '@shared/connections'
import { linkActionText, linkHalves } from '../editor/linkFormat'
import { wikiAuthorTarget } from '../editor/linkEdit'
import { useSession } from '../../store'

// A cell's resting render WITHOUT a CodeMirror instance: inline marks styled + markers hidden +
// connections coloured by status, matching the nested editor's look. Only the focused cell mounts a
// real editor (see TableView), so a table scrolling into view doesn't build R×C editors in one frame.
// Block-level markdown (headings, lists, fences) isn't reproduced here — it doesn't occur in a cell.
export function renderCellContent(
  text: string,
  getConn?: () => ConnectionsApi | undefined,
): React.ReactNode {
  // Fast path: no markdown-significant char → no token possible, so skip the mdast parse. Most cells are
  // plain text, and this is the per-cell cost paid when a table scrolls into view.
  if (!/[*_~`[$]/.test(text)) return text
  const tokens = tokenize(text)
  if (tokens.length === 0) return text
  const conn = getConn?.()
  const out: React.ReactNode[] = []
  let pos = 0
  let key = 0
  for (const tk of tokens) {
    const [s, e] = tk.range
    if (s < pos) continue // overlapping token already covered by an earlier one
    if (s > pos) out.push(text.slice(pos, s))
    const content = text.slice(tk.contentRange[0], tk.contentRange[1])
    if (tk.kind === 'wikiLink') {
      const [rs, re] = tk.resolveRange ?? tk.contentRange
      const status = conn?.resolve(text.slice(rs, re)).status
      // Phantom (or no index) → raw `[[…]]` inert, exactly as the editor leaves it.
      if (!status || status === 'phantom') out.push(text.slice(s, e))
      else
        out.push(
          // The resolve key rides the span: an aliased link's text is no longer what it resolves,
          // and a hover handler reaching this from the DOM has no token to ask.
          <span
            key={key++}
            className={`md-connection-${status}`}
            data-conn-title={text.slice(rs, re)}
            data-link-span={`${s},${e}`}
          >
            {content}
          </span>,
        )
    } else if (tk.kind === 'link') {
      const url = linkTarget(text, tk)
      // A target naming a page wears the connection's colour here as it does in the editor. Without
      // the shared resolver a cell would call an encoded internal target broken — `isValidLink` is
      // false for `Work%20Notes` — and colour the same link two different ways on two surfaces.
      const target = resolveMdTarget(conn, url)
      out.push(
        target.kind === 'page' ? (
          <span
            key={key++}
            className="md-connection-resolved"
            data-conn-title={target.page.title}
            data-link-span={`${s},${e}`}
          >
            {content}
          </span>
        ) : (
          // The span rides the element: a resting cell has no editor to hit-test against, and its
          // own right-click menu has to know which link it was popped on.
          <span
            key={key++}
            className={target.kind === 'external' ? 'md-link' : 'md-link-invalid'}
            data-link-span={`${s},${e}`}
          >
            {content}
          </span>
        ),
      )
    } else {
      const cls = CONTENT_CLASS[tk.kind]
      out.push(
        cls ? (
          <span key={key++} className={cls}>
            {content}
          </span>
        ) : (
          content
        ),
      )
    }
    pos = e
  }
  if (pos < text.length) out.push(text.slice(pos))
  return out
}

/** The token the pointer is on, as its span in the cell's text — read off the element the renderer
 *  stamped rather than hit-tested, since a resting cell has no editor to ask. */
function linkSpanAt(target: EventTarget | null): [number, number] | null {
  const el = (target as HTMLElement | null)?.closest?.(LINK_SELECTOR)
  const raw = (el as HTMLElement | undefined)?.dataset.linkSpan?.split(',')
  if (raw?.length !== 2) return null
  return [Number(raw[0]), Number(raw[1])]
}

const LINK_SELECTOR = '.md-link, .md-connection-resolved, [data-link-span]'

function StaticCellImpl({
  text,
  connections,
  onActivate,
  onCommit,
  onSelect,
}: {
  text: string
  connections?: () => ConnectionsApi | undefined
  onActivate: (coords: { x: number; y: number }) => void
  /** Replace the cell's whole text — how a resting cell performs a link action without becoming an editor. */
  onCommit: (text: string) => void
  /** Enter the cell with `range` selected, for the actions that put you in position to retype. */
  onSelect: (range: [number, number]) => void
}): React.JSX.Element {
  // A link carries its own menu wherever it is drawn, and a resting cell draws links — both syntaxes
  // of them. Which menu it gets is the shared resolver's answer, exactly as in the body: what only
  // rewrites text is performed as a commit, since entering the cell to change how a link reads would
  // be a side effect nobody asked for, while the authoring gestures enter it because putting you in
  // position to retype is the whole of what they do.
  const openMenu = (e: React.MouseEvent): void => {
    const span = linkSpanAt(e.target)
    const api = connections?.()
    if (!span || !api?.menu) return
    const tk = tokenize(text).find(
      (t) => t.range[0] === span[0] && (t.kind === 'link' || t.kind === 'wikiLink'),
    )
    if (!tk) return
    const target = menuTarget(text, tk, api, span, onCommit, onSelect)
    if (!target) return
    e.preventDefault()
    e.stopPropagation()
    api.menu(target)
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a pointer-only drag affordance; keyboard reordering is not implemented
    <div
      className="mdpm-tbl-cell-static"
      onContextMenu={openMenu}
      onMouseDown={(e) => {
        // A right press on a link belongs to that link's menu, and claiming it here is what stops the
        // browser selecting the word under the pointer before the menu opens.
        if (e.button === 2) {
          if (linkSpanAt(e.target)) e.preventDefault()
          return
        }
        if (e.button !== 0) return
        // Stop the browser's native mousedown focus/selection: the cell swaps to an editor that we focus
        // ourselves, and the native focus-shift otherwise races ours — the "needs two clicks" bug.
        e.preventDefault()
        onActivate({ x: e.clientX, y: e.clientY })
      }}
    >
      {renderCellContent(text, connections)}
    </div>
  )
}

/** What this link is offered, and how a resting cell carries it out. Null where it names nothing to
 *  act on — the same bail the editor's own handler makes on an unresolvable target. */
function menuTarget(
  text: string,
  tk: Token,
  api: ConnectionsApi,
  span: [number, number],
  onCommit: (text: string) => void,
  onSelect: (range: [number, number]) => void,
): ConnMenuTarget | null {
  if (tk.kind === 'wikiLink') {
    const [rs, re] = tk.resolveRange ?? tk.contentRange
    const res = api.resolve(titleOf(text.slice(rs, re)))
    if (res.status !== 'resolved' || !res.page) return null
    return {
      kind: 'page',
      page: res.page,
      editable: true,
      hasAlias: tk.resolveRange !== undefined,
      apply: (action) => {
        const { pipeAt, select } = wikiAuthorTarget(text, tk, action)
        if (pipeAt !== undefined) onCommit(`${text.slice(0, pipeAt)}|${text.slice(pipeAt)}`)
        onSelect(select)
      },
    }
  }
  const target = resolveMdTarget(api, linkTarget(text, tk))
  // A target naming a page is menued as the connection it is drawn as, minus the authoring pair that
  // belongs to `[[ ]]` — the same subset the body offers it.
  if (target.kind === 'page')
    return { kind: 'page', page: target.page, editable: false, hasAlias: false }
  if (target.kind === 'invalid') return null
  return {
    kind: 'url',
    url: linkTarget(text, tk),
    apply: (action) => {
      if (action === 'rename' || action === 'editLink')
        return onSelect(linkHalves(tk)[action === 'rename' ? 'label' : 'address'])
      const edit = linkActionText(text, tk, action)
      if (!edit) return
      onCommit(text.slice(0, span[0]) + edit.insert + text.slice(span[1]))
      // No editor here means no anchor to swap the title into when it lands, so the domain stands and
      // the fetch is requested for its own sake — the next Format finds it cached.
      if (edit.wantsTitle) useSession.getState().resolveLinkTitle(edit.url)
    },
  }
}

/** Text is the only prop that changes what a resting cell draws: its handlers close over a fixed grid
 *  position, and the connections getter is read at render time rather than captured. Comparing text alone
 *  is what keeps one cell's keystroke from re-rendering every other cell in a long table. */
export const StaticCell = memo(StaticCellImpl, (a, b) => a.text === b.text)
