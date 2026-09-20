import type { Personalization, SidebarMode } from './personalization'
import { useSession } from '../Session/store'

// The nexus-wide gate on what is still being built: a surface, a frame, a ribbon tab, or an interaction reads the same predicate, and off means absent rather than disabled.
export const experimentalOn = (p: Personalization): boolean => p.experimentalFeatures === true

export const useExperimental = (): boolean => useSession((s) => experimentalOn(s.personalization))

// A nexus that stored 'agenda' before the gate closed would render the agenda layer with no ribbon tab to leave it.
export const sidebarModeOf = (p: Personalization): SidebarMode => {
  const mode = p.sidebarMode ?? 'collections'
  return mode === 'agenda' && !experimentalOn(p) ? 'collections' : mode
}
