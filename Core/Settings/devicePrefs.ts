// Preferences that belong to the MACHINE rather than the Nexus: menu style, interface scale, pane widths, sidebar and footer folds, window sizes and the navigation layouts are all true of the display and operating system in front of the user, so they stay with the device and travel nowhere.
import { readValue } from '../Platform/localState'
import { numberCheck } from '../Files/decoders'
import { TENTHS_SCALE } from './personalization'

// packDevicePrefs drops a top-level `false`, so a flat flag names its non-default state (`navWindowGallery`), and a map that holds `false` values — a default-open group or footer folded shut — nests.
export interface DevicePrefs {
  nativeMenus?: boolean
  interfaceScale?: number
  panes?: { sidebar?: number; sidePane?: number }
  disclosure?: Partial<Record<string, boolean>>
  windows?: Record<string, { w: number; h: number }>
  navWindowGallery?: boolean
  navViewGallery?: boolean
}

/** Keyed on the VALUE rather than a list of names, which would fall behind when a preference is added. */
export function packDevicePrefs(raw: unknown): DevicePrefs {
  if (typeof raw !== 'object' || raw === null) return {}
  const kept = Object.entries(raw).filter(([, v]) => v !== undefined && v !== null && v !== false)
  return Object.fromEntries(kept) as DevicePrefs
}

const interfaceScaleCheck = numberCheck(TENTHS_SCALE)

export const interfaceScaleOf = (prefs: DevicePrefs | null): number =>
  interfaceScaleCheck.safeParse(prefs?.interfaceScale).data ?? TENTHS_SCALE.default

export const readInterfaceScale = (): number =>
  interfaceScaleOf(readValue<DevicePrefs>('devicePrefs'))
