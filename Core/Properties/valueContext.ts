import { useMemo } from 'react'
import type { AssetMap, NexusTree } from '../Nexus/tree'
import type { PropertyDefinition } from './properties'
import { type ContextIdentity, identityOf, type SpaceIdentity } from '../Contexts/contextIdentity'
import type { ConnectionsApi } from '../MarkdownPM/Links/connectionsApi'
import type { ConnPage } from '../Connections/pageIndex'
import type { ViewRow } from '../Views/viewRow'
import type { HeadingLinkStyle, InPageHeadingResolution } from '../Settings/personalization'
import { useSession, useSetting } from '../Session/store'
import { previewConnections } from '../Session/pageConnections'

export interface ValueContext {
  schema: PropertyDefinition[]
  spaces: ReadonlyMap<string, SpaceIdentity>
  contexts: ReadonlyMap<string, ContextIdentity>
  /** Held on the context rather than read per cell, so one subscription serves the whole view instead of one per rendered value. */
  assets: AssetMap
  /** Read when a value colors or follows a link. A getter rather than the api itself, so a view holding no link subscribes to no heading change and builds no page index. */
  connections?: () => ConnectionsApi | undefined
  headingLinkStyle: HeadingLinkStyle
  inPageHeadingResolution: InPageHeadingResolution
}

/** The page a row's values sit on; a Space's sit on none. */
export const holderOf = (row: ViewRow, ctx: ValueContext): ConnPage | undefined =>
  ctx.spaces.has(row.id) ? undefined : row

/** The one context a view or the panel renders its values through; `hostConnections` is a window's own link routing, preview otherwise. */
export function useValueContext(
  tree: NexusTree | null,
  schema: PropertyDefinition[],
  hostConnections?: ConnectionsApi,
): ValueContext | null {
  const assets = useSession((s) => s.assetMap)
  const headingLinkStyle = useSetting('headingLinkStyle')
  const inPageHeadingResolution = useSetting('inPageHeadingResolution')
  const identity = tree && identityOf(tree)
  return useMemo(
    () =>
      identity && {
        schema,
        spaces: identity.spaces,
        contexts: identity.contexts,
        assets,
        connections: hostConnections ? () => hostConnections : previewConnections,
        headingLinkStyle,
        inPageHeadingResolution,
      },
    [identity, schema, assets, hostConnections, headingLinkStyle, inPageHeadingResolution],
  )
}
