import { create } from 'zustand'
import { EMBED_SCALE_DEFAULT, coerceScale } from '@shared/types'
import { resolveAssetUrl } from './assetUrl'
import { wireViewAdopted } from './Views/viewMint'
import { createCacheSlice } from './Store/CacheSlice'
import { createChromeSlice } from './Store/ChromeSlice'
import { createConfigSlice } from './Store/ConfigSlice'
import { createNavigationSlice } from './Store/NavigationSlice'
import { createNexusSlice } from './Store/NexusSlice'
import { createPreviewSlice } from './Store/PreviewSlice'
import { createRenameSlice } from './Store/RenameSlice'
import type { SessionState } from './Store/SessionState'

export type { SelectTarget } from '@shared/types'
export type { SessionState } from './Store/SessionState'
export type { PageSlot, PageTarget } from './Store/NavigationSlice'
export type { PreviewTarget } from './Store/PreviewSlice'
export { frozenOf, pageBody, readyPageIds, shownDetail, shownPage } from './Store/NavigationSlice'
export { previewTargetOf } from './Store/PreviewSlice'
export { citationsVisible } from './Store/ConfigSlice'

export const useSession = create<SessionState>()((...a) => ({
  ...createNexusSlice(...a),
  ...createNavigationSlice(...a),
  ...createPreviewSlice(...a),
  ...createChromeSlice(...a),
  ...createConfigSlice(...a),
  ...createRenameSlice(...a),
  ...createCacheSlice(...a),
}))

/** The nexus-wide embed scale, coerced. Every surface that mounts an embed reads it HERE, so what
 *  an absent or out-of-range value means is settled once. */
export const useEmbedScale = (): number =>
  useSession((s) => coerceScale(s.personalization.embedScale, EMBED_SCALE_DEFAULT))

/** Resolve a stored asset value — a wikilink, a raw path, or a web address — to what an `<img>`
 *  renders, or null where nothing does. Held here beside the store because every consumer needs
 *  the same map, and `assetUrl.ts` stays free of React so a non-Electron host can reuse it. */
export const useAssetUrl = (value: string | null | undefined): string | null => {
  const map = useSession((s) => s.assetMap)
  return resolveAssetUrl(value, map)
}

// A sentinel view adoption happens inside store-free viewMint; the pointer it persisted lands
// in the slice here, or the slice serves a stale fallback until the next reload.
wireViewAdopted((containerId, viewId) =>
  useSession.setState((s) => ({ activeViews: { ...s.activeViews, [containerId]: viewId } })),
)
