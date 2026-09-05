import type { ConnPage, ConnectionsApi } from '@renderer/MarkdownPM/Connections'
import { knownTile, type TileEntry, type TileHostRef, type TileType } from '@shared/tiles'
import { MarkdownTile } from './Surfaces/MarkdownTile'
import { PageTile } from './Surfaces/PageTile'
import { ViewTile } from './Surfaces/ViewTile'

export type MutateEntry = (
  id: string,
  fn: (raw: Record<string, unknown>) => Record<string, unknown>,
) => void

export interface TileRenderContext {
  entry: TileEntry
  id: string
  host: TileHostRef
  editing: boolean
  beginEdit: (id: string) => void
  connections?: ConnectionsApi
  suppressFlush: (id: string) => boolean
  pagesById: ReadonlyMap<string, ConnPage>
  mutateEntry: MutateEntry
}

export interface TileSurface<E extends TileEntry = TileEntry> {
  render: (ctx: TileRenderContext & { entry: E }) => React.ReactNode
  /** The page a tile stands for, when it stands for one — heads its menu and opens from it. */
  sourceInfo?: (entry: E, pagesById: ReadonlyMap<string, ConnPage>) => ConnPage | undefined
}

/** A dead reference or a kind this build doesn't know renders inert — the space holds. */
export const inertTile = (): React.JSX.Element => <div className="tile-inert" />

export const TILE_SURFACES: { [T in TileType]: TileSurface<Extract<TileEntry, { type: T }>> } = {
  markdown: {
    render: ({ entry, id, host, editing, beginEdit, connections, suppressFlush }) => (
      <MarkdownTile
        host={host}
        tileId={id}
        editing={editing}
        onBeginEdit={beginEdit}
        connections={connections}
        suppressFlush={suppressFlush}
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
    render: ({ entry, id, beginEdit, mutateEntry }) => (
      <ViewTile
        entry={entry}
        mutateEntry={(target, fn) =>
          mutateEntry(target, (raw) => (knownTile(raw)?.type === entry.type ? fn(raw) : raw))
        }
        onActivate={() => beginEdit(id)}
      />
    ),
  },
}

// The mapped table is exact per kind; the two dispatchers are where the union meets it.
export const renderTile = (ctx: TileRenderContext): React.ReactNode =>
  (TILE_SURFACES[ctx.entry.type] as TileSurface).render(ctx)

export const tileSourceInfo = (
  entry: TileEntry,
  pagesById: ReadonlyMap<string, ConnPage>,
): ConnPage | undefined => (TILE_SURFACES[entry.type] as TileSurface).sourceInfo?.(entry, pagesById)
