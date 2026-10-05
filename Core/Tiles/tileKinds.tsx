import { memo } from 'react'
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

interface TileBodyProps {
  entry: TileEntry
  host: TileHostRef
  editing: boolean
  beginEdit: (id: string) => void
  connections?: ConnectionsApi
  openPage?: (page: ConnPage) => void
  page?: ConnPage
  mutateEntry: MutateEntry
}

interface TileSurface<E extends TileEntry = TileEntry> {
  render: (props: TileBodyProps & { entry: E }) => React.ReactNode
  sourceInfo?: (entry: E, pagesById: ReadonlyMap<string, ConnPage>) => ConnPage | undefined
}

export const inertTile = (): React.JSX.Element => <div className="tile-inert" />

const TILE_SURFACES: { [T in TileType]: TileSurface<Extract<TileEntry, { type: T }>> } = {
  markdown: {
    render: ({ entry, host, editing, beginEdit, connections }) => (
      <MarkdownTile
        host={host}
        tileId={entry.id}
        editing={editing}
        onBeginEdit={beginEdit}
        connections={connections}
        locked={entry.locked ?? false}
      />
    ),
  },
  page: {
    render: ({ entry, editing, beginEdit, connections, page }) =>
      page ? (
        <PageTile
          path={page.path}
          editing={editing}
          onBeginEdit={() => beginEdit(entry.id)}
          connections={connections}
          locked={entry.locked ?? false}
        />
      ) : (
        inertTile()
      ),
    sourceInfo: (entry, pagesById) => pagesById.get(entry.page_id),
  },
  view: {
    // The surface may only rewrite an entry still of its own kind.
    render: ({ entry, beginEdit, mutateEntry, openPage }) => (
      <ViewTile
        entry={entry}
        mutateEntry={(target, fn) =>
          mutateEntry(target, (raw) => (knownTile(raw)?.type === entry.type ? fn(raw) : null))
        }
        onActivate={() => beginEdit(entry.id)}
        openPage={openPage}
      />
    ),
  },
}

/** A surface redraws when its own entry, its edit state, its page, or the connections change. */
export const TileBody = memo(function TileBody(props: TileBodyProps): React.ReactNode {
  return (TILE_SURFACES[props.entry.type] as TileSurface).render(props)
})

export const tileSourceInfo = (
  entry: TileEntry,
  pagesById: ReadonlyMap<string, ConnPage>,
): ConnPage | undefined => (TILE_SURFACES[entry.type] as TileSurface).sourceInfo?.(entry, pagesById)
