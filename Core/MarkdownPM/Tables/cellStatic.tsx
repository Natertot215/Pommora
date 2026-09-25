import { Fragment, memo } from 'react'
import { aliasedToken, linkTokenAt, tokenize, type Token } from '../Engine/tokens'
import { MD_LINK_CLASS } from '../decorations'
import {
  CONTENT_CLASS,
  listGlyphOf,
  listLineClass,
  railClass,
  railIntents,
  railTypeClass,
  type ListGlyph,
} from '../Engine/intents'
import { perText } from '../Engine/perText'
import { parseListMarker, type ListMarker } from '../Engine/detect'
import { checkboxToggleChange } from '../Engine/listDragModel'
import { applyEdits } from '../Engine/markdownCode'
import {
  wikiLinkView,
  linkMenuTarget,
  tokenTarget,
  type ConnectionsApi,
  type ConnMenuTarget,
  type MdTarget,
} from '../Links/connectionsApi'
import { linkActionText, linkHalves } from '../Links/linkFormat'
import { wikiAuthorTarget } from '../Links/linkEdit'
import { dwellTarget, followTarget } from '../Links/linkClicks'
import { CITE_GLYPH, followCitation } from '../Citations/citationPointer'
import type { EditorHost } from '../api'
import type { HeadingLinkStyle } from '../../Settings/personalization'
import { CheckMark, checkboxClass } from '@pommora/uix/Controls/Checkbox'
import { cx } from '@pommora/uix/Utilities/cx'
import { useLatest } from '@pommora/uix/Utilities/stableApi'

export interface CellPage {
  ordinalOf: (label: string) => number | null
  ownKeys: readonly string[]
}

// KNOB — distinct cell texts remembered; a table scrolling back in re-reads its cells from here.
const cellTokens = perText(tokenize, 4096)

// `base` is where `text` begins in the cell, because every reader of `data-link-span` resolves it against the WHOLE cell; a line rendered on its own would hand them offsets from a document that does not exist.
export function renderCellContent(
  text: string,
  getConn?: () => ConnectionsApi | undefined,
  around?: CellPage,
  headingLinkStyle?: HeadingLinkStyle,
  base = 0,
): React.ReactNode {
  // No markdown-significant char → no token possible, so skip the mdast parse; this is the per-cell cost of a table scrolling in.
  if (!/[*_~`[$=]/.test(text)) return text
  const tokens = cellTokens(text)
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
      const view = conn && wikiLinkView(conn, text, tk, around?.ownKeys)
      if (!view) out.push(text.slice(s, e))
      else if (view.status === 'phantom')
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
      else {
        const frag = view.status === 'resolved' ? tk.fragment : undefined
        const showPage = headingLinkStyle !== 'heading-only' && !view.bare
        out.push(
          <span
            key={key++}
            className={`md-connection-${view.status}`}
            data-conn-title={text.slice(rs, re)}
            data-link-span={`${base + s},${base + e}`}
          >
            {frag ? (
              <>
                {showPage && text.slice(rs, re)}
                <span className={cx('md-heading-symbol', showPage && 'md-heading-symbol-spaced')}>
                  §
                </span>
                <span
                  className={cx(
                    'md-connection-heading',
                    view.missing && 'md-connection-heading-missing',
                  )}
                >
                  {text.slice(frag[0], frag[1])}
                </span>
              </>
            ) : (
              content
            )}
          </span>,
        )
      }
    } else if (tk.kind === 'link') {
      // Without the shared resolver a cell would call an encoded internal target broken and color the same link two ways.
      const target = tokenTarget(conn, text, tk)
      out.push(
        target.kind === 'page' || target.kind === 'self' ? (
          <span
            key={key++}
            className="md-connection-resolved"
            data-conn-title={target.kind === 'page' ? target.page.title : undefined}
            data-link-span={`${base + s},${base + e}`}
          >
            {content}
          </span>
        ) : (
          <span
            key={key++}
            className={
              target.kind === 'external' ? MD_LINK_CLASS : 'md-link-invalid md-unresolved-fixed'
            }
            data-link-span={`${base + s},${base + e}`}
          >
            {content}
          </span>
        ),
      )
    } else if (tk.kind === 'citationRef') {
      const n = around?.ordinalOf(content) ?? null
      out.push(
        n === null ? (
          text.slice(s, e)
        ) : (
          <span key={key++} className="md-citation-reference" data-cite-label={content}>
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

function MarkerGlyph({
  lm,
  glyph,
  line,
}: {
  lm: ListMarker
  glyph: ListGlyph
  line: string
}): React.JSX.Element {
  if (glyph === 'checkbox')
    return (
      <span className="md-list-checkbox-seat">
        <span className={checkboxClass(lm.checked)}>{lm.checked && <CheckMark size={12} />}</span>
      </span>
    )
  if (glyph === 'bullet') return <span className="md-list-bullet">•</span>
  const text = line.slice(lm.markerStart, lm.markerEnd)
  const cls = glyph === 'arrow' ? 'md-list-arrow' : 'md-list-number'
  return <span className={`${cls} md-control`}>{text}</span>
}

// A cell holding a list draws one block per line, so the indent, the glyph and the rails have something to sit on; a cell holding none stays a single flow, which is what pre-wrap already renders correctly.
function renderCellBody(
  text: string,
  getConn?: () => ConnectionsApi | undefined,
  around?: CellPage,
  headingLinkStyle?: HeadingLinkStyle,
): React.ReactNode {
  const lines = text.split('\n')
  // A marker nothing draws is prose here exactly as it is in the editor, so the two surfaces accept the same lines.
  const items = lines.map((l) => {
    const lm = parseListMarker(l)
    const glyph = lm && listGlyphOf(lm)
    return lm && glyph ? { lm, glyph } : null
  })
  if (items.every((it) => it === null))
    return renderCellContent(text, getConn, around, headingLinkStyle)
  let offset = 0
  const starts = lines.map((l) => {
    const from = offset
    offset += l.length + 1
    return from
  })
  const rails = railIntents(
    starts,
    items.map((it) => it?.lm.level ?? -1),
    items.map((it) => (it ? (railTypeClass(it.lm) ?? '') : '')),
  )
  return lines.map((line, i) => {
    const it = items[i]
    const content = it ? line.slice(it.lm.contentStart) : line
    const rendered = renderCellContent(
      content,
      getConn,
      around,
      headingLinkStyle,
      starts[i] + (it?.lm.contentStart ?? 0),
    )
    return (
      <div
        // biome-ignore lint/suspicious/noArrayIndexKey: a cell's lines are plain strings with no identity but their position — the index IS the key
        key={i}
        className={it ? listLineClass(it.lm) : undefined}
        style={it ? ({ '--list-level': it.lm.level } as React.CSSProperties) : undefined}
        data-cell-line={i}
      >
        {rails[i]?.map((r) => (
          <span
            key={r.level}
            className={railClass(r)}
            style={{ '--rail-level': r.level } as React.CSSProperties}
            aria-hidden="true"
          />
        ))}
        {it && <MarkerGlyph lm={it.lm} glyph={it.glyph} line={line} />}
        {it ? <span className="md-list-text">{rendered}</span> : rendered}
        {content === '' && '\u200b'}
      </div>
    )
  })
}

const LINK_SELECTOR = `.${MD_LINK_CLASS}, .md-connection-resolved, [data-link-span]`

function linkSpanAt(target: EventTarget | null): [number, number] | null {
  const el = (target as HTMLElement | null)?.closest?.(LINK_SELECTOR)
  const raw = (el as HTMLElement | undefined)?.dataset.linkSpan?.split(',')
  if (raw?.length !== 2) return null
  return [Number(raw[0]), Number(raw[1])]
}

function StaticCellImpl({
  host,
  text,
  around,
  connections,
  readOnly,
  linkStyle,
  onActivate,
  onCommit,
  onSelect,
}: {
  host: EditorHost
  text: string
  /** A word label never changes its text when the numbering moves, nor a heading link when its heading goes, so comparing the cell's text alone keeps them stale. */
  page?: string
  around?: CellPage
  connections?: () => ConnectionsApi | undefined
  linkStyle?: HeadingLinkStyle
  readOnly?: () => boolean
  onActivate: (coords: { x: number; y: number }, sweep?: 'start' | 'end') => void
  onCommit: (text: string) => void
  onSelect: (range: [number, number]) => void
}): React.JSX.Element {
  // What the cell reads NOW: a native menu can be held open while an undo moves the cell underneath it.
  const live = useLatest(text)

  // Following waits for the click so a drag that starts on a link selects instead.
  const linkAt = (e: React.MouseEvent): ReturnType<typeof cellLinkTarget> =>
    cellLinkTarget(text, e.target, connections?.())
  const claimLink = (e: React.MouseEvent): (() => void) | null => {
    const found = linkAt(e)
    const go = found && followTarget(found.target, connections?.(), e)
    if (!go) return null
    e.preventDefault()
    e.stopPropagation()
    return go
  }

  // A resting cell has no editor, so the toggle the list drag extension serves in a live one has to be offered here too.
  const claimCheckbox = (e: React.MouseEvent): (() => void) | null => {
    if (readOnly?.()) return null
    const seat = (e.target as HTMLElement | null)?.closest?.('.md-list-checkbox-seat')
    const row = seat?.closest('[data-cell-line]') as HTMLElement | null
    const index = row?.dataset.cellLine
    if (index === undefined) return null
    const doc = live.current
    const lines = doc.split('\n')
    let at = 0
    for (let k = 0; k < Number(index); k++) at += lines[k].length + 1
    const change = checkboxToggleChange(doc, at)
    if (!change) return null
    e.preventDefault()
    e.stopPropagation()
    return () => onCommit(applyEdits(doc, [change]))
  }

  const claimCite = (e: React.MouseEvent): (() => void) | null => {
    const el = (e.target as HTMLElement | null)?.closest?.(CITE_GLYPH) as HTMLElement | null
    const label = el?.dataset.citeLabel
    if (!label) return null
    e.preventDefault()
    e.stopPropagation()
    return () => followCitation(label, connections?.(), e)
  }

  const openMenu = (e: React.MouseEvent): boolean => {
    const span = linkSpanAt(e.target)
    const api = connections?.()
    if (!span || !api?.menu) return false
    const found = linkTokenAt(text, span[0])
    if (!found) return false
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
      host,
      onCommit,
      onSelect,
    )
    if (!target) return false
    e.preventDefault()
    e.stopPropagation()
    api.menu(target)
    return true
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a pointer-only drag affordance; keyboard reordering is not implemented
    // biome-ignore lint/a11y/useKeyWithClickEvents: the cell's own keyboard route is its editor, entered by Enter from the grid
    <div
      className="mdpm-tbl-cell-static"
      onContextMenu={(e) => {
        if (!host.glance?.contains(e.currentTarget)) host.glance?.close()
        if (openMenu(e) || readOnly?.()) return
        onActivate({ x: e.clientX, y: e.clientY })
      }}
      onPointerOver={(e) => {
        const glance = host.glance
        const found = glance && linkAt(e)
        if (found) dwellTarget(found.target, glance, found.el)?.()
      }}
      onPointerOut={() => host.glance?.cancel()}
      onClick={(e) => {
        if (e.button !== 0) return
        if (!host.glance?.contains(e.currentTarget)) host.glance?.close()
        const go = claimCheckbox(e) ?? claimCite(e) ?? claimLink(e)
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
        if (e.button === 0) claimCheckbox(e) ?? claimCite(e) ?? claimLink(e)
      }}
    >
      {renderCellBody(text, connections, around, linkStyle)}
    </div>
  )
}

function cellLinkTarget(
  text: string,
  eventTarget: EventTarget | null,
  api: ConnectionsApi | undefined,
): { el: Element; target: MdTarget } | null {
  const el = (eventTarget as HTMLElement | null)?.closest?.(LINK_SELECTOR)
  if (!el || !api || !el.closest('.mdpm-tbl-cell-static')) return null
  const span = linkSpanAt(eventTarget)
  const tk = span && linkTokenAt(text, span[0])
  return tk ? { el, target: tokenTarget(api, text, tk) } : null
}

/** `still` re-reads the link when the action is chosen; `tk` and `text` are what the menu was built from. */
function menuTarget(
  still: () => { text: string; tk: Token } | null,
  tk: Token,
  text: string,
  api: ConnectionsApi,
  host: EditorHost,
  onCommit: (text: string) => void,
  onSelect: (range: [number, number]) => void,
): ConnMenuTarget | null {
  const target = tokenTarget(api, text, tk)
  if (target.kind === 'page' && tk.kind === 'wikiLink')
    return {
      kind: 'page',
      page: target.page,
      heading: target.heading,
      editable: true,
      hasAlias: aliasedToken(tk),
      apply: (action) => {
        const now = still()
        if (!now) return
        const { pipeAt, select } = wikiAuthorTarget(now.text, now.tk, action)
        if (pipeAt !== undefined) onCommit(`${now.text.slice(0, pipeAt)}|${now.text.slice(pipeAt)}`)
        onSelect(select)
      },
    }
  return linkMenuTarget(target, (action) => {
    const now = still()
    if (!now) return
    if (action === 'rename' || action === 'editLink')
      return onSelect(linkHalves(now.tk)[action === 'rename' ? 'label' : 'address'])
    const edit = linkActionText(now.text, now.tk, action, host.linkTitles)
    if (!edit) return
    onCommit(now.text.slice(0, now.tk.range[0]) + edit.insert + now.text.slice(now.tk.range[1]))
    if (edit.wantsTitle) host.linkTitles.resolve(edit.url)
  })
}

/** Comparing text and the page around it rather than every prop keeps one cell's keystroke off every other cell, and a cell holding no marker or same-page link reads nothing of the page. */
export const StaticCell = memo(
  StaticCellImpl,
  (a, b) =>
    a.text === b.text &&
    a.linkStyle === b.linkStyle &&
    (a.page === b.page || !/\[\[#|\[\^/.test(a.text)),
)
