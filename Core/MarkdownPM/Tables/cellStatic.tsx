import { Fragment, memo, useRef } from 'react'
import { linkTarget, tokenize, type Token } from '../Tokens'
import { MD_LINK_CLASS } from '../Editor/decorations'
import { CONTENT_CLASS } from '../Decorations/intent'
import {
  resolveMdTarget,
  type ConnectionsApi,
  type ConnMenuTarget,
  type MdTarget,
} from '../Connections'
import { titleOf } from '@pommora/core/Connections/connections'
import { linkActionText, linkHalves } from '../Editor/linkFormat'
import { wikiAuthorTarget } from '../Editor/linkEdit'
import { cancelGlance, closeGlance, insideGlance } from '../../Interface/Glance/glanceAction'
import { dwellTarget, followTarget } from '../Editor/links'
import { useSession } from '../../Session/store'
import { CITE_GLYPH } from '../Editor/citationPointer'

// A cell's resting render WITHOUT a CodeMirror instance — only the focused cell mounts a real editor.
export function renderCellContent(
  text: string,
  getConn?: () => ConnectionsApi | undefined,
  ordinalOf?: (label: string) => number | null,
): React.ReactNode {
  // No markdown-significant char → no token possible, so skip the mdast parse; this is the per-cell cost of a table scrolling in.
  if (!/[*_~`[$]/.test(text)) return text
  const tokens = tokenize(text)
  if (tokens.length === 0) return text
  const conn = getConn?.()
  const out: React.ReactNode[] = []
  let pos = 0
  let key = 0
  for (const tk of tokens) {
    const [s, e] = tk.range
    if (s < pos) continue
    if (s > pos) out.push(text.slice(pos, s))
    const content = text.slice(tk.contentRange[0], tk.contentRange[1])
    if (tk.kind === 'wikiLink') {
      const [rs, re] = tk.resolveRange ?? tk.contentRange
      const status = conn?.resolve(text.slice(rs, re)).status
      if (!status) out.push(text.slice(s, e))
      else if (status === 'phantom')
        out.push(
          <Fragment key={key++}>
            <span className="md-phantom-syntax md-unresolved-fixed">
              {text.slice(s, tk.contentRange[0])}
            </span>
            <span className="md-connection-phantom md-unresolved-fixed">{content}</span>
            <span className="md-phantom-syntax md-unresolved-fixed">
              {text.slice(tk.contentRange[1], e)}
            </span>
          </Fragment>,
        )
      else
        out.push(
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
      // Without the shared resolver a cell would call an encoded internal target broken and color the same link two ways.
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
          <span
            key={key++}
            className={
              target.kind === 'external' ? MD_LINK_CLASS : 'md-link-invalid md-unresolved-fixed'
            }
            data-link-span={`${s},${e}`}
          >
            {content}
          </span>
        ),
      )
    } else if (tk.kind === 'citationRef') {
      const n = ordinalOf?.(content) ?? null
      out.push(
        n === null ? (
          text.slice(s, e)
        ) : (
          <span key={key++} className="md-cite-ref" data-cite-label={content}>
            {n}
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

const LINK_SELECTOR = `.${MD_LINK_CLASS}, .md-connection-resolved, [data-link-span]`

function linkSpanAt(target: EventTarget | null): [number, number] | null {
  const el = (target as HTMLElement | null)?.closest?.(LINK_SELECTOR)
  const raw = (el as HTMLElement | undefined)?.dataset.linkSpan?.split(',')
  if (raw?.length !== 2) return null
  return [Number(raw[0]), Number(raw[1])]
}

function StaticCellImpl({
  text,
  ordinalOf,
  connections,
  readOnly,
  onActivate,
  onCommit,
  onSelect,
  onCite,
}: {
  text: string
  /** A word label never changes its text when the numbering moves, so comparing the cell's text alone keeps a stale number. */
  cites?: string
  ordinalOf?: (label: string) => number | null
  connections?: () => ConnectionsApi | undefined
  readOnly?: () => boolean
  onActivate: (coords: { x: number; y: number }, sweep?: 'start' | 'end') => void
  onCommit: (text: string) => void
  onSelect: (range: [number, number]) => void
  onCite?: (label: string) => void
}): React.JSX.Element {
  // What the cell reads NOW: a native menu can be held open while an undo moves the cell underneath it.
  const live = useRef(text)
  live.current = text

  // Following waits for the click so a drag that starts on a link selects instead.
  const linkAt = (e: React.MouseEvent): ReturnType<typeof cellLinkTarget> =>
    cellLinkTarget(text, e.target, connections?.())
  const claimLink = (e: React.MouseEvent): (() => void) | null => {
    const found = linkAt(e)
    const go = found && followTarget(found.target, found.url, connections?.(), e.metaKey, found.el)
    if (!go) return null
    e.preventDefault()
    e.stopPropagation()
    return go
  }

  const claimCite = (e: React.MouseEvent): (() => void) | null => {
    if (!onCite) return null
    const el = (e.target as HTMLElement | null)?.closest?.(CITE_GLYPH) as HTMLElement | null
    const label = el?.dataset.citeLabel
    if (!label) return null
    e.preventDefault()
    e.stopPropagation()
    return () => onCite(label)
  }

  const openMenu = (e: React.MouseEvent): void => {
    const span = linkSpanAt(e.target)
    const api = connections?.()
    if (!span || !api?.menu) return
    const found = linkTokenAt(text, span[0])
    if (!found) return
    const target = menuTarget(
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
        if (!insideGlance(e.currentTarget)) closeGlance()
        openMenu(e)
      }}
      onMouseOver={(e) => {
        const found = linkAt(e)
        if (found) dwellTarget(found.target, found.url, connections?.(), found.el)?.()
      }}
      onMouseOut={cancelGlance}
      onClick={(e) => {
        if (e.button !== 0) return
        if (!insideGlance(e.currentTarget)) closeGlance()
        const go = claimCite(e) ?? claimLink(e)
        if (go) return go()
        if (readOnly?.()) return
        if (e.detail === 1 && window.getSelection()?.isCollapsed === false) return
        onActivate({ x: e.clientX, y: e.clientY })
      }}
      onMouseUp={(e) => {
        // The page's document and the cell's are two documents, so only the half of a crossing sweep that reached this cell can act.
        if (e.button !== 0 || readOnly?.()) return
        const sel = window.getSelection()
        const anchor = sel?.anchorNode
        if (!sel || sel.isCollapsed || !anchor) return
        const wrap = e.currentTarget.closest('.mdpm-tbl-wrap')
        if (!wrap || wrap.contains(anchor)) return
        const above =
          (wrap.compareDocumentPosition(anchor) & Node.DOCUMENT_POSITION_PRECEDING) !== 0
        const coords = { x: e.clientX, y: e.clientY }
        queueMicrotask(() => onActivate(coords, above ? 'start' : 'end'))
      }}
      onMouseDown={(e) => {
        // Claiming a right press here is what stops the browser selecting the word under the pointer before the menu opens.
        if (e.button === 2) {
          if (linkSpanAt(e.target)) e.preventDefault()
          return
        }
        // Every other press is the browser's, so a drag beginning in one cell highlights across as many as it reaches.
        if (e.button === 0) claimCite(e) ?? claimLink(e)
      }}
    >
      {renderCellContent(text, connections, ordinalOf)}
    </div>
  )
}

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

function linkTokenAt(text: string, at: number): Token | null {
  return (
    tokenize(text).find((t) => t.range[0] === at && (t.kind === 'link' || t.kind === 'wikiLink')) ??
    null
  )
}

/** `still` re-reads the link when the action is chosen; `tk` and `text` are what the menu was built from. */
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
      onCommit(now.text.slice(0, now.tk.range[0]) + edit.insert + now.text.slice(now.tk.range[1]))
      if (edit.wantsTitle) useSession.getState().resolveLinkTitle(edit.url)
    },
  }
}

/** Comparing text and the footnote numbering rather than every prop keeps one cell's keystroke off every other cell. */
export const StaticCell = memo(StaticCellImpl, (a, b) => a.text === b.text && a.cites === b.cites)
