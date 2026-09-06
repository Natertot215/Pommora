import { assetUrl } from '../Platform/assetUrl'
import { normalizeTitle, parseConnectionText } from '@pommora/core/Connections/connections'
import { HAS_SCHEME } from '@pommora/core/Locations/url'
import type { AssetMap } from '@pommora/core/Nexus/tree'

export type AssetValue =
  | { kind: 'asset'; rel: string }
  | { kind: 'external'; url: string }
  | { kind: 'unresolved' }

/** What one stored asset value names. Three spellings reach here: the Obsidian wikilink both
 *  applications write, a web address, and the nexus-relative path Pommora used to mint.*/
export function resolveAssetValue(value: string, map: AssetMap): AssetValue {
  const raw = value.trim()
  if (!raw) return { kind: 'unresolved' }
  const named = namedAsset(raw, map)
  if (named) return named
  if (HAS_SCHEME.test(raw)) return { kind: 'external', url: raw }
  return { kind: 'asset', rel: raw }
}

/** What a whole-string `[[…]]` names in the asset map, or null where it isn't one. Several files
 *  may answer to one name; display takes the first by sorted path, while a delete refuses to
 *  choose. Rendering the wrong image is recoverable — deleting one is not. */
function namedAsset(raw: string, map: AssetMap): FileValue | null {
  const link = parseConnectionText(raw)
  if (!link) return null
  const rel = map.files[normalizeTitle(link.title)]?.[0]
  return rel ? { kind: 'asset', rel } : { kind: 'unresolved' }
}

export type FileValue = Exclude<AssetValue, { kind: 'external' }>

/** What one stored FILE-property value names.*/
export function resolveFileValue(value: string, map: AssetMap): FileValue {
  return namedAsset(value.trim(), map) ?? { kind: 'unresolved' }
}

/** The `src` one stored asset value renders at, or null where nothing renders. */
export function resolveAssetUrl(value: string | null | undefined, map: AssetMap): string | null {
  if (!value) return null
  const res = resolveAssetValue(value, map)
  if (res.kind === 'external') return res.url
  if (res.kind === 'unresolved') return null
  return `${assetUrl(res.rel)}?v=${map.version}`
}
