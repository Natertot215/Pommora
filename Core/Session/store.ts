import { create } from 'zustand'
import { EMBED_SCALE_DEFAULT, coerceScale } from '@pommora/core/Settings/personalization'
import { createCacheSlice } from './cacheSlice'
import { createChromeSlice } from './chromeSlice'
import { createLayoutSlice } from './layoutSlice'
import { createConfigSlice } from './configSlice'
import { createGlanceSlice } from './glanceSlice'
import { createNavigationSlice } from './navigationSlice'
import { createNexusSlice } from './nexusSlice'
import { createWindowSlice } from './windowSlice'
import { createRenameSlice } from './mutationSlice'
import type { SessionState } from './sessionState'

export type { SelectTarget } from '@pommora/core/Navigation/navRef'
export type { SessionState } from './sessionState'
export type { PageSlot, PageTarget } from './navigationSlice'
export type { WindowTarget } from './windowSlice'
export {
  frozenOf,
  pageBody,
  readyPageIds,
  shownDetail,
  shownPage,
} from './navigationSlice'
export { windowTargetOf } from './windowSlice'
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
  ...createGlanceSlice(...a),
}))

/** Every surface that mounts an embed reads the nexus-wide scale HERE, so what an absent or out-of-range value means is settled once. */
export const useEmbedScale = (): number =>
  useSession((s) => coerceScale(s.personalization.embedScale, EMBED_SCALE_DEFAULT))
