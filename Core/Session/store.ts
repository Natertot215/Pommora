import { create } from 'zustand'
import { createCacheSlice } from './cacheSlice'
import { createChromeSlice } from './chromeSlice'
import { createLayoutSlice } from './layoutSlice'
import { createMatrixSlice } from './matrixSlice'
import { createConfigSlice } from './configSlice'
import { createGlanceSlice } from './glanceSlice'
import { createNavigationSlice } from './navigationSlice'
import { createNexusSlice } from './nexusSlice'
import { createWindowSlice } from './windowSlice'
import { createEditSlice } from './editSlice'
import { createViewSearchSlice } from './viewSearchSlice'
import type { SessionState } from './sessionState'
import type { PageMeta } from '@pommora/core/Nexus/schemas'
import {
  type SettingKey,
  type SettingValue,
  settingOf,
} from '@pommora/core/Settings/personalization'

export type { PageSlot } from './navigationSlice'
export {
  frozenOf,
  pageBody,
  readyPageIds,
  shownDetail,
  shownPage,
} from './navigationSlice'
export { shownViewSearch } from './viewSearchSlice'
export { windowTargetOf } from './windowSlice'
export { citationsVisible } from './configSlice'

export const useSession = create<SessionState>()((...a) => ({
  ...createNexusSlice(...a),
  ...createNavigationSlice(...a),
  ...createWindowSlice(...a),
  ...createChromeSlice(...a),
  ...createLayoutSlice(...a),
  ...createConfigSlice(...a),
  ...createEditSlice(...a),
  ...createCacheSlice(...a),
  ...createGlanceSlice(...a),
  ...createMatrixSlice(...a),
  ...createViewSearchSlice(...a),
}))

export const pageMetaOf =
  (id: string | undefined) =>
  (s: SessionState): PageMeta | undefined =>
    id ? s.tree?.pageMetadata[id] : undefined

export const useSetting = <K extends SettingKey>(key: K): SettingValue<K> =>
  useSession((s) => settingOf(s.personalization, key))
