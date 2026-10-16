import type { ConnPage } from '../Connections/pageIndex'
import type { ReactNode } from 'react'
import type { RememberedSize } from '@pommora/uix/Interactions/useResizable'
import { changesTo } from '../Pages/merge3'
import { docScan, docString } from './docCache'
import type { MarkdownScope } from './Engine/detect'
import { spanAt } from './Engine/docScan'
import {
  Annotation,
  type EditorState,
  type Extension,
  Facet,
  StateEffect,
  type StateEffectType,
  Transaction,
} from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { type Personalization, type SettingValue, settingOf } from '../Settings/personalization'
import { type DevicePrefs, devicePref } from '../Settings/devicePrefs'
import type { HostContext } from '../Contract/handlers'
import type { EditorPrefs, EditorPrefWrite } from '../Contract/bridge'
import type { Commands } from '../Actions/commands'
import type { EditorMenuRequest } from '../Actions/editorMenu'
import type { GripMenuAction, GripMenuContext } from '../Actions/gripMenu'
import type { PickItem } from '../Actions/menuModel'
import type { AliasRowAction } from '../Actions/aliasRowMenu'
import type { AliasEdit } from '../Connections/aliasMemory'
import type { TableMenuAction, TableMenuContext } from './Tables/tableMenu'
import type { CitationMenuAction, CitationMenuContext } from './Citations/citationMenu'
import type { ConnectionsApi } from './Links/connectionsApi'
import type { TrailSegment } from '@pommora/uix/Elements/NavTrail'

export const mirrored = Annotation.define<boolean>()

export const redrawNudge = StateEffect.define<null>()

/** A cell is a document of its own, so the page editor is found from the element: a link or marker in a table answers to the page around it, from the table's seat. */
export function pageEditorAt(el: Element): { seat: Element; view: EditorView | null } {
  const seat = el.closest('.mdpm-tbl-widget') ?? el
  return { seat, view: editorAt(seat) }
}

/** The innermost editor holding `el`, so a table cell answers with its own. */
export function editorAt(el: Element): EditorView | null {
  const editor = el.closest<HTMLElement>('.cm-editor')
  return editor && EditorView.findFromDOM(editor)
}

/** The page a Text value sits on, handed to its pane's editor: the pane is a document of its own outside any page, so nothing in the DOM leads there. `null` is a value whose seat names no page. */
export const heldPage = Facet.define<ConnPage | null, ConnPage | null | undefined>({
  combine: (v) => v[0],
})

export type OwnPage =
  | { kind: 'body'; view: EditorView; seat: Element }
  | { kind: 'held'; page: ConnPage }

const heldBy = (page: ConnPage | null | undefined): OwnPage | null =>
  page ? { kind: 'held', page } : null

/** The page a held value in `view` answers for, or nothing for a body. */
export const heldOf = (view: EditorView): ConnPage | undefined =>
  view.state.facet(heldPage) ?? undefined

/** The page every bare `#Heading` at `at` answers to: a page body is its own, a table cell's is the page holding the table, and a Text value's is the page holding the value. An editor still being built isn't yet found from its DOM, so it answers for itself. */
export function ownPage(at: EditorView | Element): OwnPage | null {
  const own = at instanceof EditorView ? at : editorAt(at)
  const held = own?.state.facet(heldPage)
  if (held !== undefined) return heldBy(held)
  const { seat, view } = pageEditorAt(at instanceof EditorView ? at.dom : at)
  const body = view ?? own
  return body && { kind: 'body', view: body, seat }
}

/** A whole body applied as the changed span only, past every filter and out of undo history. Another mount's body never echoes back through `onChange`; `echo` is for a rewrite this editor makes of its own. */
export function mirrorBody(view: EditorView, body: string, { echo = false } = {}): void {
  const doc = docString(view.state.doc)
  if (body === doc) return
  view.dispatch({
    changes: changesTo(doc, body),
    annotations: [mirrored.of(!echo), Transaction.addToHistory.of(false)],
    filter: false,
  })
}

export type GlanceTarget =
  | { kind: 'page'; id: string; path: string; heading?: string }
  | { kind: 'url'; url: string }

const EDITOR_SETTING_KEYS = [
  'codeblockLineCount',
  'codeblockScroll',
  'htmlShortcuts',
  'htmlFormatting',
  'removeTitleOnLinkChange',
  'aliasPickerOnCommit',
  'jumpToCitation',
  'headingLinkStyle',
  'inPageHeadingResolution',
  'transformDashes',
  'transformArrows',
  'transformEquations',
  'transformPunctuation',
  'transformEllipses',
  'transformCallouts',
  'transformSections',
  'transformBullets',
  'pairBrackets',
  'pairMarkers',
  'pairQuotes',
  'wrapSelections',
  'deletePairsTogether',
  'exitPairsOnEnter',
] as const
const EDITOR_DEVICE_KEYS = ['defaultLinkFormat'] as const
const EDITOR_KEYS = [...EDITOR_SETTING_KEYS, ...EDITOR_DEVICE_KEYS] as const

export type EditorSettings = {
  [K in (typeof EDITOR_SETTING_KEYS)[number]]: SettingValue<K>
} & {
  [K in (typeof EDITOR_DEVICE_KEYS)[number]]: NonNullable<DevicePrefs[K]>
} & { commands: Commands }

let resolved: {
  p: Personalization
  d: DevicePrefs
  commands: Commands
  settings: EditorSettings
} | null = null

// Read on per-transaction paths, so it resolves again only when an input changes, and stays the same object until an editor setting does.
export function editorSettingsOf(
  p: Personalization,
  d: DevicePrefs,
  commands: Commands,
): EditorSettings {
  if (resolved?.p !== p || resolved.d !== d || resolved.commands !== commands) {
    const was = resolved?.commands === commands ? resolved.settings : null
    const values = Object.fromEntries([
      ...EDITOR_SETTING_KEYS.map((k) => [k, settingOf(p, k)]),
      ...EDITOR_DEVICE_KEYS.map((k) => [k, devicePref(d, k)]),
    ])
    const same = was !== null && EDITOR_KEYS.every((k) => was[k] === values[k])
    resolved = {
      p,
      d,
      commands,
      settings: same ? was : { ...(values as Omit<EditorSettings, 'commands'>), commands },
    }
  }
  return resolved.settings
}

type TileMount =
  | {
      kind: 'page'
      path: string
      editing: boolean
      locked: boolean
      ancestors: readonly string[]
      onBeginEdit: () => void
    }
  | {
      kind: 'webpage'
      url: string
      label: string
      visible: boolean
      tabInactive: boolean
      zoom: number
      refocusHost: () => void
    }

export interface EditorHost {
  settings(): EditorSettings
  connections: () => ConnectionsApi | undefined
  aliases: {
    list(id: string): string[]
    /** Resolves whether the host took the edit. */
    edit(id: string, edit: AliasEdit): Promise<boolean>
    subscribe(cb: () => void): () => void
  }
  linkTitles: {
    get(url: string): string | null
    resolve(url: string): Promise<string | null>
  }
  citations: { shown(): boolean; set(v: boolean): void }
  clipboard: HostContext['clipboard']
  menus: {
    grip(ctx: GripMenuContext): Promise<GripMenuAction | null>
    table(ctx: TableMenuContext): Promise<TableMenuAction | null>
    citation(ctx: CitationMenuContext): Promise<CitationMenuAction | null>
    alias(): Promise<AliasRowAction | null>
    format?: (req: EditorMenuRequest) => Promise<string | null>
  }
  /** Absent on a surface that never glances (a read-only snapshot); `contains` answers whether an element sits inside an open glance. */
  glance?: {
    arm(target: GlanceTarget, el: Element): void
    cancel(): void
    close(): void
    contains(el: Element): boolean
  }
  renderTile(tile: TileMount): ReactNode
  pickTree(): PickItem<string>[]
  /** A page's trail, for the picker's rows; the editor holds no tree, so its host answers. */
  location(pageId: string): TrailSegment[]
  openLink(url: string): void
  // The live tree's title for the surface's own page, read fresh rather than from a capped cache; null off a page identity.
  pageTitle(): string | null
  // The one surface whose web guests run live; nested and secondary editors show their faces.
  pageSurface?: boolean
  prefs?: {
    load(): Promise<EditorPrefs | null>
    save(...write: EditorPrefWrite): void
  }
  /** A picker pane's remembered size, machine-local. */
  paneGeometry: (id: 'autocomplete' | 'block-menu') => RememberedSize
}

export const editorHost = Facet.define<EditorHost, EditorHost>({ combine: (v) => v[0] })

export const drawsRawHtml = (scope: MarkdownScope, settings: EditorSettings): boolean =>
  scope === 'page' && settings.htmlFormatting

/** Inside an HTML block the editor draws raw, where link syntax is source text and no link rule applies. */
export function inRawHtml(state: EditorState, at: number, scope: MarkdownScope): boolean {
  return (
    drawsRawHtml(scope, state.facet(editorHost).settings()) &&
    spanAt(docScan(state.doc).html, at) !== undefined
  )
}

// Remembered chrome writes itself back whenever its state changes, except on the load that seeded it, so a gesture changes the state and never saves it.
export function persistPref<T>(
  read: (state: EditorState) => T,
  loaded: StateEffectType<unknown>,
  write: (value: T) => EditorPrefWrite,
): Extension {
  return EditorView.updateListener.of((u) => {
    const now = read(u.state)
    if (read(u.startState) === now) return
    if (u.transactions.some((tr) => tr.effects.some((e) => e.is(loaded)))) return
    u.state.facet(editorHost).prefs?.save(...write(now))
  })
}
