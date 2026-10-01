import {
  EXPERIMENTAL_MODES,
  type Personalization,
  type SidebarMode,
  SETTING_DEFAULTS,
  settingOf,
} from './personalization'
import { useSession } from '../Session/store'
import { personalizationOf } from '../Session/configSlice'

// The nexus-wide gate on what is still being built: a surface, a frame, a ribbon tab, or an interaction reads the same predicate, and off means absent rather than disabled.
const experimentalOn = (p: Personalization): boolean => settingOf(p, 'experimentalFeatures')

export const useExperimental = (): boolean =>
  useSession((s) => experimentalOn(personalizationOf(s)))

// A nexus that stored an experimental mode before the gate closed would render its layer with no ribbon tab to leave it.
export const sidebarModeOf = (p: Personalization): SidebarMode => {
  const mode = settingOf(p, 'sidebarMode')
  return EXPERIMENTAL_MODES.has(mode) && !experimentalOn(p) ? SETTING_DEFAULTS.sidebarMode : mode
}
