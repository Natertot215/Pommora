import { create } from 'zustand'
import { EMBED_SCALE_DEFAULT, coerceScale } from '@pommora/core/Settings/personalization'
import { wireViewAdopted } from '../Views/viewMint'
import { createCacheSlice } from './cacheSlice'
import { createChromeSlice } from './chromeSlice'
import { createLayoutSlice } from '../Interface/layoutSlice'
import { createConfigSlice } from './configSlice'
import { createNavigationSlice } from '../Navigation/navigationSlice'
import { createNexusSlice } from './nexusSlice'
import { createWindowSlice } from '../Interface/Windows/windowSlice'
import { createRenameSlice } from './mutationSlice'
import type { SessionState } from './sessionState'

export type { SelectTarget } from '@pommora/core/Navigation/navRef'
export type { SessionState } from './sessionState'
export type { PageSlot, PageTarget } from '../Navigation/navigationSlice'
export type { WindowTarget } from '../Interface/Windows/windowSlice'
export {
  frozenOf,
  pageBody,
  readyPageIds,
  shownDetail,
  shownPage,
} from '../Navigation/navigationSlice'
export { windowTargetOf } from '../Interface/Windows/windowSlice'
export { citationsVisible } from './configSlice'

export const useSession = create<SessionState>()((...a) => ({
  ...createNexusSlice(...a),
  ...createNavigationSlice(...a),
  ...createWindowSlice(...a),
  ...createChromeSlice(...a),
  ...createLayoutSlice(...a),
  ...createConfigSlice(...a),
  ...createRenameSlice(...a),
  ...createCacheSlice(...a),
}))

/** The nexus-wide embed scale, coerced. Every surface that mounts an embed reads it HERE, so what
 *  an absent or out-of-range value means is settled once. */
export const useEmbedScale = (): number =>
  useSession((s) => coerceScale(s.personalization.embedScale, EMBED_SCALE_DEFAULT))

// A sentinel view adoption happens inside store-free viewMint; the pointer it persisted lands
// in the slice here, or the slice serves a stale fallback until the next reload.
wireViewAdopted((containerId, viewId) =>
  useSession.setState((s) => ({ activeViews: { ...s.activeViews, [containerId]: viewId } })),
)
