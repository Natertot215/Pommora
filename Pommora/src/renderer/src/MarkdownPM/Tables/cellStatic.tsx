import { memo, useRef } from 'react'
import { linkTarget, tokenize, type Token } from '../tokens'
import { MD_LINK_CLASS } from '../editor/decorations'
import { CONTENT_CLASS } from '../decorations/intent'
import {
  resolveMdTarget,
  type ConnectionsApi,
  type ConnMenuTarget,
  type MdTarget,
} from '../connections'
import { titleOf } from '@shared/connections'
import { linkActionText, linkHalves } from '../editor/linkFormat'
import { wikiAuthorTarget } from '../editor/linkEdit'
import { dwellTarget, followTarget } from '../editor/links'
import { useSession } from '../../store'

// A cell's resting render WITHOUT a CodeMirror instance: inline marks styled + markers hidden +
// connections colored by status, matching the nested editor's look. Only the focused cell mounts a
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
      // A target naming a page wears the connection's color here as it does in the editor. Without
      // the shared resolver a cell would call an encoded internal target broken — `isValidLink` is
      // false for `Work%20Notes` — and color the same link two different ways on two surfaces.
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
            className={target.kind === 'external' ? MD_LINK_CLASS : 'md-link-invalid'}
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

const LINK_SELECTOR = `.${MD_LINK_CLASS}, .md-connection-resolved, [data-link-span]`

function StaticCellImpl({
  text,
  connections,
  onActivate,
  onCommit,
  onSelect,
  onHoverArm,
  onHoverLeave,
  onHoverEnd,
}: {
  text: string
  connections?: () => ConnectionsApi | undefined
  onActivate: (coords: { x: number; y: number }) => void
  /** Replace the cell's whole text — how a resting cell performs a link action without becoming an editor. */
  onCommit: (text: string) => void
  /** Enter the cell with `range` selected, for the actions that put you in position to retype. */
  onSelect: (range: [number, number]) => void
  /** The table's one hover intent — a delay shared across every cell, so two cells can never have
   *  one armed at once. */
  onHoverArm: (bloom: () => void) => void
  /** The pointer left the link: cancel what is armed, but leave an open card alone — it sits in the
   *  gap beside the link, so reaching it means leaving the link first. */
  onHoverLeave: () => void
  /** A gesture replaced the pointer's meaning: cancel what is armed AND dismiss what is open. */
  onHoverEnd: () => void
}): React.JSX.Element {
  // What the cell reads NOW, not when its menu was popped. A native menu can be held open for as long
  // as the user likes, and an undo or an outside write can move the cell underneath it — the editor's
  // own applier re-reads its document for the same reason. The render keeps this current because a
  // cell re-renders on exactly one prop.
  const live = useRef(text)
  live.current = text

  // A link carries its own menu wherever it is drawn, and a resting cell draws links — both syntaxes
  // of them. Which menu it gets is the shared resolver's answer, exactly as in the body: what only
  // rewrites text is performed as a commit, since entering the cell to change how a link reads would
  // be a side effect nobody asked for, while the authoring gestures enter it because putting you in
  // position to retype is the whole of what they do.
  // A resting cell's link follows and previews as it does in the body, through the same two
  // readers — the cell has no editor to carry the pointer path, but it has the text the path asks
  // about. Following waits for the click so a drag that starts on a link selects instead.
  const linkAt = (e: React.MouseEvent): ReturnType<typeof cellLinkTarget> =>
    cellLinkTarget(text, e.target, connections?.())
  /** The link under the press, claimed — the press is the cell's to spend rather than the swap's.
   *  Returns what following it does, so the click can spend the same claim it made. */
  const claimLink = (e: React.MouseEvent): (() => void) | null => {
    const found = linkAt(e)
    const go = found && followTarget(found.target, found.url, connections?.(), e.metaKey)
    if (!go) return null
    e.preventDefault()
    e.stopPropagation()
    return go
  }

  const openMenu = (e: React.MouseEvent): void => {
    const span = linkSpanAt(e.target)
    const api = connections?.()
    if (!span || !api?.menu) return
    const found = linkTokenAt(text, span[0])
    if (!found) return
    const target = menuTarget(
      // Re-found against the cell as it stands when the action is chosen; a cell that has since
      // changed no longer holds the link the menu was popped on, and the action declines.
      () => {
        const now = linkTokenAt(live.current, span[0])
        return now && live.current.slice(...now.range) === text.slice(...found.range)
          ? { text: live.current, tk: now }
          : null
      },
      found,
      text,
      api,
      onCommit,
      onSelect,
    )
    if (!target) return
    e.preventDefault()
    e.stopPropagation()
    api.menu(target)
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a pointer-only drag affordance; keyboard reordering is not implemented
    // biome-ignore lint/a11y/useKeyWithClickEvents: the cell's own keyboard route is its editor, entered by Enter from the grid
    // biome-ignore lint/a11y/useKeyWithMouseEvents: a pointer-only hover affordance; keyboard focus never reaches a resting cell
    <div
      className="mdpm-tbl-cell-static"
      onContextMenu={(e) => {
        // The pair every gesture that replaces the pointer's meaning owes it.
        onHoverEnd()
        openMenu(e)
      }}
      onMouseOver={(e) => {
        onHoverLeave()
        const found = linkAt(e)
        const bloom = found && dwellTarget(found.target, found.url, connections?.(), found.el)
        if (bloom) onHoverArm(bloom)
      }}
      onMouseOut={onHoverLeave}
      onClick={(e) => {
        if (e.button !== 0 || e.detail !== 1) return
        onHoverEnd()
        claimLink(e)?.()
      }}
      onMouseDown={(e) => {
        // A right press on a link belongs to that link's menu, and claiming it here is what stops the
        // browser selecting the word under the pointer before the menu opens.
        if (e.button === 2) {
          if (linkSpanAt(e.target)) e.preventDefault()
          return
        }
        if (e.button !== 0) return
        // The cell swaps itself into an editor on mousedown, so a press bound for a link has to be
        // claimed HERE — claiming the click instead arrives after the swap, which is the "clicking a
        // link drops you into its syntax" symptom.
        if (claimLink(e)) return
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

/** Where the link under the pointer leads, in the terms the body's own pointer path uses — a
 *  wikilink resolving to a page names that page, one that resolves to nothing names nothing, and a
 *  markdown link asks the shared resolver. A resting cell has no editor to hit-test against, so the
 *  token comes off the span the renderer stamped. */
export function cellLinkTarget(
  text: string,
  eventTarget: EventTarget | null,
  api: ConnectionsApi | undefined,
): { el: Element; target: MdTarget; url: string } | null {
  const el = (eventTarget as HTMLElement | null)?.closest?.(LINK_SELECTOR)
  if (!el || !api || !el.closest('.mdpm-tbl-cell-static')) return null
  const span = linkSpanAt(eventTarget)
  const tk = span && linkTokenAt(text, span[0])
  if (!tk) return null
  if (tk.kind === 'wikiLink') {
    const [rs, re] = tk.resolveRange ?? tk.contentRange
    const res = api.resolve(text.slice(rs, re))
    const url = text.slice(...tk.range)
    return res.status === 'resolved' && res.page
      ? { el, target: { kind: 'page', page: res.page }, url }
      : null
  }
  const url = linkTarget(text, tk)
  if (!url) return null
  return { el, target: resolveMdTarget(api, url), url }
}

/** The link token starting at `at`, whichever syntax wrote it. */
function linkTokenAt(text: string, at: number): Token | null {
  return (
    tokenize(text).find((t) => t.range[0] === at && (t.kind === 'link' || t.kind === 'wikiLink')) ??
    null
  )
}

/** What this link is offered, and how a resting cell carries it out. Null where it names nothing to
 *  act on — the same bail the editor's own handler makes on an unresolvable target.
 *
 *  `still` re-reads the link at the moment an action is chosen; `tk` and `text` are what the menu was
 *  built from, which is what decides which menu it is. */
function menuTarget(
  still: () => { text: string; tk: Token } | null,
  tk: Token,
  text: string,
  api: ConnectionsApi,
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
        const now = still()
        if (!now) return
        const { pipeAt, select } = wikiAuthorTarget(now.text, now.tk, action)
        if (pipeAt !== undefined) onCommit(`${now.text.slice(0, pipeAt)}|${now.text.slice(pipeAt)}`)
        onSelect(select)
      },
    }
  }
  const url = linkTarget(text, tk)
  const target = resolveMdTarget(api, url)
  // A target naming a page is menued as the connection it is drawn as, minus the authoring pair that
  // belongs to `[[ ]]` — the same subset the body offers it.
  if (target.kind === 'page')
    return { kind: 'page', page: target.page, editable: false, hasAlias: false }
  if (target.kind === 'invalid') return null
  return {
    kind: 'url',
    url,
    apply: (action) => {
      const now = still()
      if (!now) return
      if (action === 'rename' || action === 'editLink')
        return onSelect(linkHalves(now.tk)[action === 'rename' ? 'label' : 'address'])
      const edit = linkActionText(now.text, now.tk, action)
      if (!edit) return
      // The token's own span, so what is replaced is exactly what the edit was computed from — the
      // editor replaces `tk.range` too, and the two cannot come to mean different things.
      onCommit(now.text.slice(0, now.tk.range[0]) + edit.insert + now.text.slice(now.tk.range[1]))
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
