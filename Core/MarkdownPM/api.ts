import type { ReactNode } from 'react'
import { Facet } from '@codemirror/state'
import type { Personalization } from '@pommora/core/Settings/personalization'
import type { HostContext } from '@pommora/core/Contract/handlers'
import type { FormatState } from '@pommora/core/Actions/editorMenu'
import type { GripMenuAction, GripMenuContext, PickNode } from '@pommora/core/Actions/gripMenu'
import type { TableMenuAction, TableMenuContext } from '@pommora/core/MarkdownPM/Tables/tableMenu'
import type {
  CitationMenuAction,
  CitationMenuContext,
} from '@pommora/core/MarkdownPM/Citations/citationMenu'

export type GlanceTarget =
  | { kind: 'page'; id: string; path: string }
  | { kind: 'site'; url: string }

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
> & { pasteInverse: string | undefined }

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
    /** A hot grip stands the host's whole context menu down so the grip's own menu can answer the press. */
    gripHot(hot: boolean): void
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
}

export const editorHost = Facet.define<EditorHost, EditorHost>({ combine: (v) => v[0] })
