import { Fragment, memo } from 'react'
import {
  holdsTokens,
  linkTokenAt,
  type LinkKind,
  type Token,
  tokenize,
  type TokenOf,
} from '../Engine/tokens'
import {
  contentClass,
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
import { scanDoc } from '../Engine/docScan'
import { readFormatState } from '../Input/formatState'
import { editFor } from '../Input/format'
import { editEvent, landEdit } from '../Input/listRenumber'
import { decodePayload, type TablePayload } from '../Engine/Tables/clipboard'
import { pastedCellText } from '../Links/pasteLink'
import { PASTE_LITERAL_ACTION, RESTING_EDITS } from '../../Actions/editorMenu'
import { PASTE_AS_PREFIX, type PasteAsForm, type PasteMode } from '../../Actions/pasteAsMenu'
import { codeMask, lineOffsetsOf, type TextEdit } from '../Engine/markdownCode'
import { sectionRunsIn } from '../../Connections/scan'
import {
  linkClass,
  linkLook,
  linkMenuTarget,
  titleTarget,
  tokenTarget,
  type ConnectionsApi,
  type MdTarget,
} from '../Links/connectionsApi'
import { linkEdit } from '../Links/linkEdit'
import { settledLinkText } from '../Links/pendingTitle'
import type { LinkAction } from '../../Actions/connectionMenu'
import { dwellTarget, followTarget, heldTarget } from '../Links/linkClicks'
import { CITE_GLYPH, followCitation } from '../Citations/citationPointer'
import type { EditorHost, OwnPage } from '../api'
import type { Seat } from './CellEditor'
import type { HeadingLinkStyle } from '../../Settings/personalization'
import { CheckMark, checkboxClass } from '@pommora/uix/Controls/Checkbox'
import { cx } from '@pommora/uix/Utilities/cx'

export interface CellPage {
  ordinalOf: (label: string) => number | null
  ownKeys: readonly string[]
  sectionHeadings: readonly string[]
}

export const linksOwnHeadings = (text: string): boolean => /\[\[#|\]\(\s*#|§/.test(text)

// KNOB — distinct cell texts remembered; a table scrolling back in re-reads its cells from here.
export const cellTokens = perText(tokenize, 4096)

type Drawn = Token | { kind: 'section'; range: [number, number]; contentRange: [number, number] }

export function renderCellContent(
  text: string,
  getConn?: () => ConnectionsApi | undefined,
  {
    around,
    headingLinkStyle = 'page-heading',
    base = 0,
  }: { around?: CellPage; headingLinkStyle?: HeadingLinkStyle; base?: number } = {},
): React.ReactNode {
  const runs =
    around && around.sectionHeadings.length > 0 && text.includes('§')
      ? sectionRunsIn(text, around.sectionHeadings, codeMask(text))
      : []
  // No markdown-significant char → no token possible, so skip the mdast parse; this is the per-cell cost of a table scrolling in.
  const held = holdsTokens(text) ? cellTokens(text) : []
  if (held.length === 0 && runs.length === 0) return text
  const tokens: readonly Drawn[] = runs.length
    ? [
        ...held,
        ...runs.map(
          (r): Drawn => ({
            kind: 'section',
            range: [r.from, r.to],
            contentRange: [r.from, r.to],
          }),
        ),
      ].sort((a, b) => a.range[0] - b.range[0])
    : held
  const conn = getConn?.()
  let key = 0
  const src = (s: number, e: number): { 'data-src': string } => ({
    'data-src': `${base + s},${base + e}`,
  })
  const linkSpan = (s: number, e: number, at?: number) => ({
    ...src(s, e),
    'data-link': '',
    ...(at !== undefined && { 'data-at': base + at }),
  })
  const verbatim = (s: number, e: number, at: number) => ({ ...src(s, e), 'data-at': base + at })
  const draw = (from: number, to: number, within: readonly Drawn[]): React.ReactNode[] => {
    const out: React.ReactNode[] = []
    let pos = from
    within.forEach((tk, i) => {
      const [s, e] = tk.range
      if (s < pos) return
      if (s > pos) out.push(text.slice(pos, s))
      const [cs, ce] = tk.contentRange
      const inner = within.slice(i + 1).filter((t) => t.range[0] >= cs && t.range[1] <= ce)
      out.push(drawOne(tk, inner))
      pos = e
    })
    if (pos < to) out.push(text.slice(pos, to))
    return out
  }
  const drawOne = (tk: Drawn, inner: readonly Drawn[]): React.ReactNode => {
    const [s, e] = tk.range
    const [cs, ce] = tk.contentRange
    switch (tk.kind) {
      case 'section':
        return (
          <span key={key++} className="md-connection-resolved md-section-run" {...linkSpan(s, e)}>
            {text.slice(s, e)}
          </span>
        )
      case 'wikiLink':
      case 'link': {
        if (tk.kind === 'wikiLink' && !conn) return text.slice(s, e)
        const look = linkLook(conn, text, tk, around?.ownKeys, headingLinkStyle)
        if (look.status === 'phantom')
          return (
            <Fragment key={key++}>
              <span className="md-phantom-syntax" {...verbatim(s, cs, s)}>
                {text.slice(s, cs)}
              </span>
              <span className="md-connection-phantom" {...verbatim(cs, ce, cs)}>
                {text.slice(cs, ce)}
              </span>
              <span className="md-phantom-syntax" {...verbatim(ce, e, ce)}>
                {text.slice(ce, e)}
              </span>
            </Fragment>
          )
        const join = tk.kind === 'wikiLink' && look.join
        return (
          <span key={key++} className={linkClass(look)} {...linkSpan(s, e, join ? undefined : cs)}>
            {join ? (
              <>
                {join.showPage && text.slice(tk.resolveRange[0], tk.resolveRange[1])}
                <span
                  className={cx('md-heading-symbol', join.showPage && 'md-heading-symbol-spaced')}
                >
                  §
                </span>
                <span className={join.className}>
                  {text.slice(join.heading[0], join.heading[1])}
                </span>
              </>
            ) : (
              draw(cs, ce, inner)
            )}
          </span>
        )
      }
      case 'htmlTag': {
        const [open, close] = tk.markerRanges
        return (
          <Fragment key={key++}>
            <span className="md-bracket" {...verbatim(open[0], open[1], open[0])}>
              {text.slice(open[0], open[1])}
            </span>
            <span className={contentClass(tk)} {...verbatim(cs, ce, cs)}>
              {text.slice(cs, ce)}
            </span>
            <span className="md-bracket" {...verbatim(close[0], close[1], close[0])}>
              {text.slice(close[0], close[1])}
            </span>
          </Fragment>
        )
      }
      case 'citationRef': {
        const label = text.slice(cs, ce)
        const n = around?.ordinalOf(label) ?? null
        return n === null ? (
          text.slice(s, e)
        ) : (
          <span
            key={key++}
            className="md-citation-reference"
            data-cite-label={label}
            {...src(s, e)}
          >
            {n}
          </span>
        )
      }
      default:
        return (
          <span key={key++} className={contentClass(tk)} {...verbatim(s, e, cs)}>
            {draw(cs, ce, inner)}
          </span>
        )
    }
  }
  return draw(0, text.length, tokens)
}

function MarkerGlyph({
  lm,
  glyph,
  line,
  at,
}: {
  lm: ListMarker
  glyph: ListGlyph
  line: string
  at: number
}): React.JSX.Element {
  const src = `${at},${at + lm.contentStart}`
  if (glyph === 'checkbox')
    return (
      <span className="md-list-checkbox-seat" data-src={src}>
        <span className={checkboxClass(lm.checked)}>{lm.checked && <CheckMark size={12} />}</span>
      </span>
    )
  if (glyph === 'bullet')
    return (
      <span className="md-list-bullet" data-src={src}>
        •
      </span>
    )
  const text = line.slice(lm.markerStart, lm.markerEnd)
  return (
    <span className={`md-list-${glyph} md-control`} data-src={src}>
      {text}
    </span>
  )
}

// A cell holding a list draws one block per line, so the indent, the glyph and the rails have something to sit on; a cell holding none stays a single flow, which is what pre-wrap already renders correctly.
function renderCellBody(
  text: string,
  getConn: () => ConnectionsApi | undefined,
  around: CellPage,
  headingLinkStyle: HeadingLinkStyle,
): React.ReactNode {
  const lines = text.split('\n')
  // A marker nothing draws is prose here exactly as it is in the editor, so the two surfaces accept the same lines.
  const items = lines.map((l) => {
    const lm = parseListMarker(l)
    const glyph = lm && listGlyphOf(lm)
    return lm && glyph ? { lm, glyph } : null
  })
  if (items.every((it) => it === null))
    return renderCellContent(text, getConn, { around, headingLinkStyle })
  const starts = lineOffsetsOf(lines)
  const rails = railIntents(
    starts,
    items.map((it) => it?.lm.level ?? -1),
    items.map((it) => (it ? (railTypeClass(it.lm) ?? '') : '')),
  )
  return lines.map((line, i) => {
    const it = items[i]
    const content = it ? line.slice(it.lm.contentStart) : line
    const rendered = renderCellContent(content, getConn, {
      around,
      headingLinkStyle,
      base: starts[i] + (it?.lm.contentStart ?? 0),
    })
    return (
      <div
        // biome-ignore lint/suspicious/noArrayIndexKey: a cell's lines are plain strings with no identity but their position — the index IS the key
        key={i}
        className={it ? listLineClass(it.lm) : undefined}
        style={it ? ({ '--list-level': it.lm.level } as React.CSSProperties) : undefined}
        data-cell-line={i}
        data-base={starts[i]}
      >
        {rails[i]?.map((r) => (
          <span
            key={r.level}
            className={railClass(r)}
            style={{ '--rail-level': r.level } as React.CSSProperties}
            aria-hidden="true"
          />
        ))}
        {it && <MarkerGlyph lm={it.lm} glyph={it.glyph} line={line} at={starts[i]} />}
        {it ? <span className="md-list-text">{rendered}</span> : rendered}
        {content === '' && '\u200b'}
      </div>
    )
  })
}

function srcOf(el: Element): [number, number] | null {
  const raw = (el as HTMLElement).dataset.src?.split(',')
  if (raw?.length !== 2) return null
  return [Number(raw[0]), Number(raw[1])]
}

const isFiller = (n: Node): boolean =>
  n.nodeType === Node.TEXT_NODE &&
  n.textContent === '\u200b' &&
  n.parentElement?.dataset.cellLine !== undefined

export function cellOffsetAt(
  cell: Element,
  node: Node,
  offset: number,
  side?: 'start' | 'end',
): number {
  while (
    node.nodeType !== Node.TEXT_NODE &&
    offset < node.childNodes.length &&
    !(node as HTMLElement).matches('[data-src]')
  ) {
    node = node.childNodes[offset]
    offset = 0
  }
  let drawn = (
    node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement)
  )?.closest<HTMLElement>('[data-src]')
  if (drawn && cell.contains(drawn)) {
    const edge =
      side === 'start'
        ? offset === 0 && node === drawn.firstChild
        : side === 'end' && offset === node.textContent?.length && node === drawn.lastChild
    while (
      edge &&
      drawn.parentElement?.matches('[data-src]') &&
      drawn === (side === 'start' ? drawn.parentElement.firstChild : drawn.parentElement.lastChild)
    )
      drawn = drawn.parentElement
    const [s, e] = srcOf(drawn) ?? [0, 0]
    if (node === drawn) return offset === 0 ? s : e
    if (drawn.dataset.at === undefined || edge) return side === 'start' ? s : e
  }
  let acc = node.nodeType === Node.TEXT_NODE && !isFiller(node) ? offset : 0
  let prev = node.nodeType === Node.TEXT_NODE ? node.previousSibling : node.childNodes[offset - 1]
  let parent = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement)
  while (parent) {
    for (; prev; prev = prev.previousSibling) {
      if (prev.nodeType === Node.TEXT_NODE) {
        if (!isFiller(prev)) acc += (prev as Text).data.length
        continue
      }
      const sib = prev as HTMLElement
      if (sib.matches('[data-src]')) return (srcOf(sib)?.[1] ?? 0) + acc
      return cellOffsetAt(cell, sib, sib.childNodes.length) + acc
    }
    if (parent === cell) return acc
    const base = parent.dataset.base ?? parent.dataset.at
    if (base !== undefined) return Number(base) + acc
    prev = parent.previousSibling
    parent = parent.parentElement
  }
  return acc
}

function restingRange(cell: HTMLElement, x: number, y: number, length: number): [number, number] {
  const caret = document.caretPositionFromPoint?.(x, y)
  const at =
    caret && cell.contains(caret.offsetNode)
      ? cellOffsetAt(cell, caret.offsetNode, caret.offset)
      : length
  const sel = window.getSelection()
  const range = sel && !sel.isCollapsed && sel.rangeCount > 0 ? sel.getRangeAt(0) : null
  if (!range?.intersectsNode(cell)) return [at, at]
  const from = cell.contains(range.startContainer)
    ? cellOffsetAt(cell, range.startContainer, range.startOffset, 'start')
    : 0
  const to = cell.contains(range.endContainer)
    ? cellOffsetAt(cell, range.endContainer, range.endOffset, 'end')
    : length
  return at >= from && at <= to ? [from, to] : [at, at]
}

interface RestingHit {
  el: Element
  target: MdTarget
  tk?: TokenOf<LinkKind>
}

function StaticCellImpl({
  host,
  text,
  current,
  around,
  readOnly,
  linkStyle,
  onActivate,
  onCommit,
  onFill,
}: {
  host: EditorHost
  text: string
  current: () => string | null
  around: CellPage
  linkStyle: HeadingLinkStyle
  readOnly: () => boolean
  onActivate: (seat: Seat) => void
  onCommit: (text: string) => void
  onFill: (payload: TablePayload) => void
}): React.JSX.Element {
  const commitAtRest = (
    built: string,
    edits: readonly TextEdit[],
    userEvent = 'input',
  ): boolean => {
    if (current() !== built) return false
    const next = landEdit(built, edits, userEvent, 'cell')
    if (next === built) return false
    onCommit(next)
    return true
  }

  const applyAtRest = async (tk: TokenOf<LinkKind>, action: LinkAction): Promise<void> => {
    if (current() !== text) return
    const edit = linkEdit(text, tk, action, host.linkTitles)
    if (!edit) return
    if (edit.kind === 'select') return onActivate({ kind: 'select', range: edit.range })
    const insert = await settledLinkText(host, edit)
    if (!commitAtRest(text, [{ from: edit.from, to: edit.to, insert }])) return
    if (edit.select !== undefined) onActivate({ kind: 'select', range: [edit.select, edit.select] })
  }
  const { linkAt, dismiss, onContextMenu, onPointerOver, onPointerOut } = linkGestures(
    text,
    host.connections,
    host.glance,
    null,
    { editable: () => !readOnly(), apply: applyAtRest },
  )

  // Following waits for the click so a drag that starts on a link selects instead.
  const claimLink = (e: React.MouseEvent): (() => void) | null => {
    const found = linkAt(e)
    const go = found && followTarget(found.target, host.connections(), e)
    if (!go) return null
    e.preventDefault()
    e.stopPropagation()
    return go
  }

  // A resting cell has no editor, so the toggle the list drag extension serves in a live one has to be offered here too.
  const claimCheckbox = (e: React.MouseEvent): (() => void) | null => {
    if (readOnly()) return null
    const seat = (e.target as HTMLElement | null)?.closest?.('.md-list-checkbox-seat')
    const row = seat?.closest('[data-cell-line]') as HTMLElement | null
    const index = row?.dataset.cellLine
    if (index === undefined) return null
    const change = checkboxToggleChange(text, lineOffsetsOf(text.split('\n'))[Number(index)])
    if (!change) return null
    e.preventDefault()
    e.stopPropagation()
    return () => commitAtRest(text, [change])
  }

  const pasteAtRest = async (
    built: string,
    from: number,
    to: number,
    how: PasteMode,
  ): Promise<void> => {
    const clip = await host.clipboard.read()
    if (!clip) return
    const payload = decodePayload(clip)
    if (payload) return onFill(payload)
    commitAtRest(built, [await pastedCellText(host, built, { from, to }, clip, how)], 'input.paste')
  }

  const restingAction = async (
    action: string,
    built: string,
    from: number,
    to: number,
  ): Promise<void> => {
    switch (action) {
      case RESTING_EDITS.copy:
        return void host.clipboard.write(built.slice(from, to))
      case RESTING_EDITS.cut:
        if (commitAtRest(built, [{ from, to, insert: '' }], 'delete'))
          void host.clipboard.write(built.slice(from, to))
        return
      case RESTING_EDITS.paste:
        return pasteAtRest(built, from, to, 'auto')
      case PASTE_LITERAL_ACTION:
        return pasteAtRest(built, from, to, 'literal')
    }
    if (action.startsWith(PASTE_AS_PREFIX))
      return pasteAtRest(built, from, to, action.slice(PASTE_AS_PREFIX.length) as PasteAsForm)
    const edit = editFor(action, scanDoc(built), from, to)
    if (!edit || !commitAtRest(built, edit.changes, editEvent(edit))) return
    const slot =
      /^(format|highlight):/.test(action) &&
      (from === to || action === 'format:link' || action === 'format:linkText')
    if (slot && edit.selection !== undefined)
      onActivate({ kind: 'select', range: [edit.selection, edit.selection] })
  }

  const restingMenu = (e: React.MouseEvent<HTMLElement>): void => {
    const ask = host.menus.format
    if (!ask) return
    const built = text
    const [from, to] = restingRange(e.currentTarget, e.clientX, e.clientY, built.length)
    void ask({
      ...readFormatState(scanDoc(built), from, to),
      scope: 'cell',
      x: e.clientX,
      y: e.clientY,
      embedSeat: false,
      citeSeat: false,
      resting: { selection: built.slice(from, to) },
    }).then((action) => {
      if (action) void restingAction(action, built, from, to)
    })
  }

  const claimCite = (e: React.MouseEvent): (() => void) | null => {
    const el = (e.target as HTMLElement | null)?.closest?.(CITE_GLYPH) as HTMLElement | null
    const label = el?.dataset.citeLabel
    if (!label) return null
    e.preventDefault()
    e.stopPropagation()
    return () => followCitation(label, host.connections(), e)
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a pointer-only drag affordance; keyboard reordering is not implemented
    // biome-ignore lint/a11y/useKeyWithClickEvents: the cell's own keyboard route is its editor, entered by Enter from the grid
    <div
      className="mdpm-tbl-cell-static"
      onContextMenu={(e) => {
        if (onContextMenu(e) || readOnly()) return
        e.stopPropagation()
        restingMenu(e)
      }}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={(e) => {
        if (e.button !== 0) return
        dismiss(e)
        const go = claimCheckbox(e) ?? claimCite(e) ?? claimLink(e)
        if (go) return go()
        if (readOnly()) return
        if (e.detail === 1 && window.getSelection()?.isCollapsed === false) return
        onActivate({ kind: 'point', x: e.clientX, y: e.clientY })
      }}
      onMouseUp={(e) => {
        // The page's document and the cell's are two documents, so only the half of a crossing sweep that reached this cell can act.
        if (e.button !== 0 || readOnly()) return
        const sel = window.getSelection()
        const anchor = sel?.anchorNode
        if (!sel || sel.isCollapsed || !anchor) return
        const wrap = e.currentTarget.closest('.mdpm-tbl-wrap')
        if (!wrap || wrap.contains(anchor)) return
        const above =
          (wrap.compareDocumentPosition(anchor) & Node.DOCUMENT_POSITION_PRECEDING) !== 0
        const at: Seat = {
          kind: 'point',
          x: e.clientX,
          y: e.clientY,
          sweep: above ? 'start' : 'end',
        }
        queueMicrotask(() => onActivate(at))
      }}
      onMouseDown={(e) => {
        if (e.button === 2) return e.preventDefault()
        if (e.button === 0) claimCheckbox(e) ?? claimCite(e) ?? claimLink(e)
      }}
    >
      {renderCellBody(text, host.connections, around, linkStyle)}
    </div>
  )
}

/** The link gestures a resting surface shares: a press outside the glance closes it, a link dwells into one, and a right-click on a link opens its menu — read-only unless `authoring` applies the pick, with `own` naming the page a bare `#Heading` answers to. */
export function linkGestures(
  text: string,
  connections: (() => ConnectionsApi | undefined) | undefined,
  glance: EditorHost['glance'],
  own: OwnPage | null = null,
  authoring?: {
    editable: () => boolean
    apply: (tk: TokenOf<LinkKind>, action: LinkAction) => void
  },
) {
  const linkAt = (e: React.SyntheticEvent): RestingHit | null =>
    cellLinkTarget(text, e.target, connections?.(), own)
  const dismiss = (e: React.SyntheticEvent): void => {
    if (!glance?.contains(e.currentTarget)) glance?.close()
  }
  return {
    linkAt,
    dismiss,
    /** True when a link's menu opened. */
    onContextMenu: (e: React.MouseEvent): boolean => {
      dismiss(e)
      const api = connections?.()
      if (!api?.menu) return false
      const found = linkAt(e)
      if (!found?.tk) return false
      const tk = found.tk
      const target = linkMenuTarget(found.target, authoring?.editable() ?? false)
      if (!target) return false
      e.preventDefault()
      e.stopPropagation()
      void api.menu(target).then((action) => action && authoring?.apply(tk, action))
      return true
    },
    onPointerOver: (e: React.PointerEvent): void => {
      if (!glance) return
      const found = linkAt(e)
      if (found?.tk) dwellTarget(found.target, glance, found.el)?.()
    },
    onPointerOut: (): void => glance?.cancel(),
  }
}

function cellLinkTarget(
  text: string,
  eventTarget: EventTarget | null,
  api: ConnectionsApi | undefined,
  own: OwnPage | null,
): RestingHit | null {
  const el = (eventTarget as HTMLElement | null)?.closest?.('[data-link]')
  const span = el && srcOf(el)
  if (!el || !span || !api) return null
  if (el.classList.contains('md-section-run'))
    return {
      el,
      target: heldTarget(titleTarget(undefined, '', (el.textContent ?? '').slice(1)), own),
    }
  const tk = linkTokenAt(cellTokens(text), span[0])
  return tk ? { el, tk, target: heldTarget(tokenTarget(api, text, tk), own) } : null
}

/** Comparing text and the page around it rather than every prop keeps one cell's keystroke off every other cell. */
export const StaticCell = memo(
  StaticCellImpl,
  (a, b) =>
    a.text === b.text &&
    a.linkStyle === b.linkStyle &&
    (a.around === b.around || !(linksOwnHeadings(a.text) || a.text.includes('[^'))),
)
