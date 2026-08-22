// The nexus-asset:// URL for a Nexus-relative image path, served by the main process on desktop.
// One definition so a non-Electron host (mobile WebView) can swap the scheme in a single place.

import { normalizeTitle, parseConnectionText } from '@shared/connections'
import type { AssetMap } from '@shared/types'

// Per SEGMENT, not `encodeURI` over the whole path: that helper leaves `#` and `?` alone, so a
// file the user named `Draft #2.png` would truncate at the fragment and 404. App-minted tokens
// never carried either character; names from a shared folder do.
export const assetUrl = (rel: string): string =>
  `nexus-asset://nexus/${rel.split('/').map(encodeURIComponent).join('/')}`

export type AssetValue =
  | { kind: 'asset'; rel: string }
  | { kind: 'external'; url: string }
  | { kind: 'unresolved' }

// A scheme is what separates a web address from a filename: `isValidLink`'s dotted-host rule
// would read `Banner.png` as a website, and every asset would stop rendering.
const SCHEMED = /^[a-z][a-z0-9+.-]*:/i

/** What one stored asset value names. Three spellings reach here: the Obsidian wikilink both
 *  applications write, a web address, and the nexus-relative path Pommora used to mint. The
 *  wikilink is parsed by `parseConnectionText`, so an asset reference and a Link property can
 *  never disagree about what a whole-string `[[…]]` is. */
export function resolveAssetValue(value: string, map: AssetMap): AssetValue {
  const raw = value.trim()
  if (!raw) return { kind: 'unresolved' }
  const link = parseConnectionText(raw)
  if (link) {
    // Several files may answer to one name; display takes the first by sorted path, while a
    // delete refuses to choose. Rendering the wrong image is recoverable — deleting one is not.
    const rel = map.files[normalizeTitle(link.title)]?.[0]
    return rel ? { kind: 'asset', rel } : { kind: 'unresolved' }
  }
  if (SCHEMED.test(raw)) return { kind: 'external', url: raw }
  return { kind: 'asset', rel: raw }
}

/** The `src` one stored asset value renders at, or null where nothing renders. A resolved asset
 *  carries the map's version, the same cache-busting the thumbnail sites use, so a file re-saved
 *  under an unchanged name is re-requested rather than served from the last paint. */
export function resolveAssetUrl(value: string | null | undefined, map: AssetMap): string | null {
  if (!value) return null
  const res = resolveAssetValue(value, map)
  if (res.kind === 'external') return res.url
  if (res.kind === 'unresolved') return null
  return `${assetUrl(res.rel)}?v=${map.version}`
}
