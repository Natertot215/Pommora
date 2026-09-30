// Preferences that belong to the MACHINE rather than the Nexus: menu style, interface scale, brightness, scrollbars, pane widths, sidebar and footer folds, window sizes and the navigation layouts are all true of the display and operating system in front of the user, so they stay with the device and travel nowhere.
import { z } from 'zod'
import type { NumberRange } from '@pommora/uix/Utilities/clamp'
import { readValue } from '../Platform/localState'
import { entriesOf, looseDecoder, numberCheck } from '../Files/decoders'
import { TENTHS_SCALE } from './personalization'

export const SIDEBAR_WIDTH = { min: 180, max: 380, default: 240 }
export const SIDE_PANE_WIDTH = { min: 240, max: 420, default: 300 }

export const SCROLLBAR_PRESENCE = ['all', 'pages', 'off'] as const
export type ScrollbarPresence = (typeof SCROLLBAR_PRESENCE)[number]
export const SCROLLBAR_REVEAL = ['always', 'hover'] as const
export type ScrollbarReveal = (typeof SCROLLBAR_REVEAL)[number]

const flag = z.boolean().optional().catch(undefined)
const size = z.number().optional().catch(undefined)
const width = (range: NumberRange) => numberCheck(range, true).optional().catch(undefined)

// Per-field catch ⇒ a bad value drops that preference alone, and loose ⇒ a key this build doesn't know rides through the window's whole-record save.
const devicePrefs = looseDecoder(
  z.object({
    nativeMenus: flag,
    interfaceScale: numberCheck(TENTHS_SCALE).optional().catch(undefined),
    brightness: numberCheck(TENTHS_SCALE).optional().catch(undefined),
    scrollbars: z.enum(SCROLLBAR_PRESENCE).optional().catch(undefined),
    scrollbarReveal: z.enum(SCROLLBAR_REVEAL).optional().catch(undefined),
    panes: looseDecoder(
      z.object({ sidebar: width(SIDEBAR_WIDTH), sidePane: width(SIDE_PANE_WIDTH) }),
    )
      .optional()
      .catch(undefined),
    disclosure: entriesOf(flag).optional().catch(undefined),
    windows: entriesOf(looseDecoder(z.object({ w: size, h: size })))
      .optional()
      .catch(undefined),
    navWindowGallery: flag,
    navViewGallery: flag,
  }),
).catch({})
export type DevicePrefs = z.infer<typeof devicePrefs>

export const readDevicePrefs = (): DevicePrefs => devicePrefs.parse(readValue('devicePrefs'))

/** Keyed on the VALUE rather than a list of names, which would fall behind when a preference is added. */
export function packDevicePrefs(raw: unknown): DevicePrefs {
  if (typeof raw !== 'object' || raw === null) return {}
  const kept = Object.entries(raw).filter(([, v]) => v !== undefined && v !== null && v !== false)
  return Object.fromEntries(kept) as DevicePrefs
}

export const DEVICE_DEFAULTS = {
  nativeMenus: false,
  interfaceScale: TENTHS_SCALE.default,
  brightness: TENTHS_SCALE.default,
  scrollbars: 'pages',
  scrollbarReveal: 'hover',
} as const satisfies Partial<Record<keyof DevicePrefs, unknown>>
export type DeviceDefaultKey = keyof typeof DEVICE_DEFAULTS

export const DEVICE_RANGES = { interfaceScale: TENTHS_SCALE, brightness: TENTHS_SCALE } as const

export const devicePref = <K extends DeviceDefaultKey>(
  prefs: DevicePrefs,
  key: K,
): NonNullable<DevicePrefs[K]> =>
  (prefs[key] ?? DEVICE_DEFAULTS[key]) as NonNullable<DevicePrefs[K]>

export const readInterfaceScale = (): number => devicePref(readDevicePrefs(), 'interfaceScale')
