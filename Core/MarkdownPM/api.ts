import type { ConnPage } from '@pommora/core/Connections/pageIndex'
import type { ReactNode } from 'react'
import type { RememberedSize } from '@pommora/uix/Interactions/useResizable'
import { changesTo } from '../Pages/merge3'
import { docString } from './docCache'
import { Annotation, Facet, StateEffect, Transaction } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import {
  type Personalization,
  type SettingValue,
  settingOf,
} from '@pommora/core/Settings/personalization'
import type { HostContext } from '@pommora/core/Contract/handlers'
import type { EditorPrefs, EditorPrefWrite } from '@pommora/core/Contract/bridge'
import type { Commands } from '@pommora/core/Actions/commands'
import type { EditorMenuRequest } from '@pommora/core/Actions/editorMenu'
import type { GripMenuAction, GripMenuContext } from '@pommora/core/Actions/gripMenu'
import type { PickItem } from '@pommora/core/Actions/menuModel'
import type { TableMenuAction, TableMenuContext } from '@pommora/core/MarkdownPM/Tables/tableMenu'
import type {
  CitationMenuAction,
  CitationMenuContext,
} from '@pommora/core/MarkdownPM/Citations/citationMenu'

export const mirrored = Annotation.define<boolean>()

export const resolutionNudge = StateEffect.define<null>()

/** A cell is a document of its own, so the page editor is found from the element: a link or marker in a table answers to the page around it, from the table's seat. */
export function pageEditorAt(el: Element): { seat: Element; view: EditorView | null } {
  const seat = el.closest('.mdpm-tbl-widget') ?? el
  const editor = seat.closest<HTMLElement>('.cm-editor')
  return { seat, view: editor && EditorView.findFromDOM(editor) }
}

/** Another mount's text, already past its own guards, applied as the changed span only: no filter touches it, it stays out of undo history, and it never echoes back through `onChange`. */
export function mirrorBody(view: EditorView, body: string): void {
  const doc = docString(view.state.doc)
  if (body === doc) return
  view.dispatch({
    changes: changesTo(doc, body),
    annotations: [mirrored.of(true), Transaction.addToHistory.of(false)],
    filter: false,
  })
}

export type GlanceTarget =
  | { kind: 'page'; id: string; path: string; heading?: string }
  | { kind: 'site'; url: string }

const EDITOR_SETTING_KEYS = [
  'codeblockLineCount',
  'htmlShortcuts',
  'removeTitleOnLinkChange',
  'aliasPickerOnCommit',
  'jumpToCitation',
  'pasteLinkIntoText',
  'defaultLinkFormat',
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

export type EditorSettings = {
  [K in (typeof EDITOR_SETTING_KEYS)[number]]: SettingValue<K>
} & { commands: Commands }

let resolved: { p: Personalization; commands: Commands; settings: EditorSettings } | null = null

// Read on per-transaction paths, so it resolves again only when the personalization or the commands change.
export function editorSettingsOf(p: Personalization, commands: Commands): EditorSettings {
  if (resolved?.p !== p || resolved.commands !== commands) {
    const values = Object.fromEntries(EDITOR_SETTING_KEYS.map((k) => [k, settingOf(p, k)]))
    resolved = {
      p,
      commands,
      settings: { ...(values as Omit<EditorSettings, 'commands'>), commands },
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
  aliases: {
    list(id: string): string[]
    remember(id: string, alias: string): void
    forget(id: string, alias: string): void
    subscribe(cb: () => void): () => void
  }
  linkTitles: {
    get(url: string): string | null
    resolve(url: string): void
    subscribe(cb: () => void): () => void
  }
  citations: { shown(): boolean; set(v: boolean): void }
  clipboard: HostContext['clipboard']
  menus: {
    grip(ctx: GripMenuContext): Promise<GripMenuAction | null>
    table(ctx: TableMenuContext): Promise<TableMenuAction | null>
    citation(ctx: CitationMenuContext): Promise<CitationMenuAction | null>
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
  openLink(url: string): void
  // A page's body as the session holds it: the open tab's live text when warm, else read from disk.
  warmBody(page: ConnPage): string | null
  fetchBody(page: ConnPage): Promise<string | null>
  // The live tree's title for the surface's own page, read fresh rather than from a capped cache; null off a page identity.
  pageTitle(): string | null
  // The one surface whose web guests run live; nested and secondary editors show their faces.
  pageSurface?: boolean
  prefs?: {
    load(): Promise<EditorPrefs | null>
    save(...write: EditorPrefWrite): void
  }
  /** A picker pane's remembered size, machine-local. */
  paneGeometry?: (id: 'autocomplete' | 'block-menu') => RememberedSize
}

export const editorHost = Facet.define<EditorHost, EditorHost>({ combine: (v) => v[0] })
