import type { ConnectionsApi } from '../MarkdownPM/Links/connectionsApi'
import type { ConnPage } from '../Connections/pageIndex'
import {
  type EntryPatch,
  knownTile,
  type TileEntry,
  type TileHostRef,
  type TileType,
} from './tiles'
import { MarkdownTile } from './Surfaces/MarkdownTile'
import { PageTile } from './Surfaces/PageTile'
import { ViewTile } from './Surfaces/ViewTile'

/** The patch is built from the entry as stored, and null writes nothing. */
export type MutateEntry = (
  id: string,
  patchOf: (raw: Record<string, unknown>) => EntryPatch | null,
) => void

export interface TileRenderContext {
  entry: TileEntry
  id: string
  host: TileHostRef
  editing: boolean
  beginEdit: (id: string) => void
  connections?: ConnectionsApi
  openPage?: (page: ConnPage) => void
  pagesById: ReadonlyMap<string, ConnPage>
  mutateEntry: MutateEntry
}

interface TileSurface<E extends TileEntry = TileEntry> {
  render: (ctx: TileRenderContext & { entry: E }) => React.ReactNode
  sourceInfo?: (entry: E, pagesById: ReadonlyMap<string, ConnPage>) => ConnPage | undefined
}

export const inertTile = (): React.JSX.Element => <div className="tile-inert" />

const TILE_SURFACES: { [T in TileType]: TileSurface<Extract<TileEntry, { type: T }>> } = {
  markdown: {
    render: ({ entry, id, host, editing, beginEdit, connections }) => (
      <MarkdownTile
        host={host}
        tileId={id}
        editing={editing}
        onBeginEdit={beginEdit}
        connections={connections}
        locked={entry.locked ?? false}
      />
    ),
  },
  page: {
    render: ({ entry, id, editing, beginEdit, connections, pagesById }) => {
      const page = pagesById.get(entry.page_id)
      return page ? (
        <PageTile
          path={page.path}
          editing={editing}
          onBeginEdit={() => beginEdit(id)}
          connections={connections}
          locked={entry.locked ?? false}
        />
      ) : (
        inertTile()
      )
    },
    sourceInfo: (entry, pagesById) => pagesById.get(entry.page_id),
  },
  view: {
    // The surface may only rewrite an entry still of its own kind.
    render: ({ entry, id, beginEdit, mutateEntry, openPage }) => (
      <ViewTile
        entry={entry}
        mutateEntry={(target, fn) =>
          mutateEntry(target, (raw) => (knownTile(raw)?.type === entry.type ? fn(raw) : null))
        }
        onActivate={() => beginEdit(id)}
        openPage={openPage}
      />
    ),
  },
}

export const renderTile = (ctx: TileRenderContext): React.ReactNode =>
  (TILE_SURFACES[ctx.entry.type] as TileSurface).render(ctx)

export const tileSourceInfo = (
  entry: TileEntry,
  pagesById: ReadonlyMap<string, ConnPage>,
): ConnPage | undefined => (TILE_SURFACES[entry.type] as TileSurface).sourceInfo?.(entry, pagesById)
