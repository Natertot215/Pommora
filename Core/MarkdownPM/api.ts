import type { ConnPage } from '@pommora/core/Connections/pageIndex'
import type { ReactNode } from 'react'
import { changesTo } from '../Pages/merge3'
import { Annotation, Facet, Transaction } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import type { Personalization } from '@pommora/core/Settings/personalization'
import type { HostContext } from '@pommora/core/Contract/handlers'
import type { Commands } from '@pommora/core/Actions/commands'
import type { FormatState } from '@pommora/core/Actions/editorMenu'
import type { GripMenuAction, GripMenuContext, PickNode } from '@pommora/core/Actions/gripMenu'
import type { TableMenuAction, TableMenuContext } from '@pommora/core/MarkdownPM/Tables/tableMenu'
import type {
  CitationMenuAction,
  CitationMenuContext,
} from '@pommora/core/MarkdownPM/Citations/citationMenu'

export const mirrored = Annotation.define<boolean>()

/** Another mount's text, already past its own guards, applied as the changed span only: no filter touches it, it stays out of undo history, and it never echoes back through `onChange`. */
export function mirrorBody(view: EditorView, body: string): void {
  const doc = view.state.doc.toString()
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

export interface EditorPref<T> {
  load: () => Promise<T>
  save: (value: T) => void
}

export interface EditorMenuApi {
  pushState: (s: FormatState) => void
  onAction: (cb: (action: string) => void) => () => void
}

export type EditorSettings = Pick<
  Personalization,
  | 'codeblockLineCount'
  | 'removeTitleOnLinkChange'
  | 'aliasPickerOnCommit'
  | 'jumpToCitation'
  | 'pasteLinkIntoText'
  | 'defaultLinkFormat'
  | 'headingLinkStyle'
  | 'inPageHeadingResolution'
  | 'transformDashes'
  | 'transformArrows'
  | 'transformEquations'
  | 'transformEllipses'
  | 'transformCallouts'
  | 'transformSections'
  | 'transformBullets'
  | 'pairBrackets'
  | 'pairMarkers'
  | 'pairQuotes'
  | 'wrapSelections'
  | 'deletePairsTogether'
  | 'exitPairsOnEnter'
> & { commands: Commands }

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
    format?: EditorMenuApi
  }
  /** Absent on a surface that never glances (a read-only snapshot); `contains` answers whether an element sits inside an open glance. */
  glance?: {
    arm(target: GlanceTarget, el: Element): void
    cancel(): void
    close(): void
    contains(el: Element): boolean
  }
  renderTile(tile: TileMount): ReactNode
  pickTree(): PickNode[]
  openLink(url: string): void
  // A page's body as the session holds it: the open tab's live text when warm, else read from disk.
  warmBody(page: ConnPage): string | null
  fetchBody(page: ConnPage): Promise<string | null>
  // The live tree's title for the surface's own page, read fresh rather than from a capped cache; null off a page identity.
  pageTitle(): string | null
}

export const editorHost = Facet.define<EditorHost, EditorHost>({ combine: (v) => v[0] })
