import type { AssetMap } from '../Nexus/tree'
import type { PropertyDefinition } from './properties'
import type { ContextIdentity, IdentityMaps, SpaceIdentity } from '../Contexts/contextIdentity'
import type { ConnectionsApi } from '../MarkdownPM/Links/connectionsApi'
import type { ConnPage } from '../Connections/pageIndex'
import type { ViewRow } from '../Views/viewRow'

export interface ValueContext {
  schema: PropertyDefinition[]
  contextsById: ReadonlyMap<string, SpaceIdentity>
  contexts: ReadonlyMap<string, ContextIdentity>
  /** Held on the context rather than read per cell, so one subscription serves the whole view instead of one per rendered value. */
  assets: AssetMap
  /** Read when a value colors or follows a link. A getter rather than the api itself, so a view holding no link subscribes to no heading change and builds no page index. */
  connections?: () => ConnectionsApi | undefined
}

/** The page a row's values sit on; a Space's sit on none. */
export const holderOf = (row: ViewRow, ctx: ValueContext): ConnPage | undefined =>
  ctx.contextsById.has(row.id) ? undefined : row

export function buildValueContext(
  identity: IdentityMaps,
  schema: PropertyDefinition[],
  assets: AssetMap,
  connections?: () => ConnectionsApi | undefined,
): ValueContext {
  return { schema, contextsById: identity.spaces, contexts: identity.contexts, assets, connections }
}
