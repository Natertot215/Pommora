import { type FilterGroup, filterGroup } from '../Views/views'
import { isPlainObject } from '../Properties/propertyValue'
import { clamp } from '@pommora/uix/Utilities/clamp'
import type { Forces } from './Engine/forces'
import type { GroupMode } from './Engine/graph'

export interface MatrixConfig {
  group: { mode: GroupMode }
  filter: { rules: FilterGroup | null; enabled: boolean }
  forces: Forces
  display: { unlinked: boolean; hideIcon: boolean; hideLocation: boolean; locked: boolean }
}

export type MatrixPatch = { [S in keyof MatrixConfig]?: Partial<MatrixConfig[S]> }

export const FORCE_RANGE: [number, number] = [0.35, 4]
export const FORCE_STEP = 0.25

const DEFAULT_FORCES: Forces = { gravity: 1, spread: 1, strength: 1, distance: 1 }

export const DEFAULT_MATRIX_CONFIG: MatrixConfig = {
  group: { mode: 'connection' },
  filter: { rules: null, enabled: true },
  forces: DEFAULT_FORCES,
  display: { unlinked: true, hideIcon: false, hideLocation: false, locked: false },
}

const GROUP_MODES: readonly GroupMode[] = ['connection', 'location', 'space']

const section = (raw: unknown, key: string): Record<string, unknown> =>
  isPlainObject(raw) && isPlainObject(raw[key]) ? raw[key] : {}
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback)
const force = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? clamp(v, FORCE_RANGE[0], FORCE_RANGE[1]) : fallback

export function parseMatrixConfig(raw: unknown): MatrixConfig {
  const d = DEFAULT_MATRIX_CONFIG
  const group = section(raw, 'group')
  const filter = section(raw, 'filter')
  const forces = section(raw, 'forces')
  const display = section(raw, 'display')
  const mode = GROUP_MODES.find((m) => m === group.mode) ?? d.group.mode
  return {
    group: { mode },
    filter: {
      rules: filterGroup.safeParse(filter.rules).data ?? null,
      enabled: bool(filter.enabled, d.filter.enabled),
    },
    forces: {
      gravity: force(forces.gravity, d.forces.gravity),
      spread: force(forces.spread, d.forces.spread),
      strength: force(forces.strength, d.forces.strength),
      distance: force(forces.distance, d.forces.distance),
    },
    display: {
      unlinked: bool(display.unlinked, d.display.unlinked),
      hideIcon: bool(display.hideIcon, d.display.hideIcon),
      hideLocation: bool(display.hideLocation, d.display.hideLocation),
      locked: bool(display.locked, d.display.locked),
    },
  }
}

/** A section not in the patch keeps its reference, so a consumer comparing sections by identity sees exactly what moved. */
export function applyPatch(config: MatrixConfig, patch: MatrixPatch): MatrixConfig {
  return {
    group: patch.group ? { ...config.group, ...patch.group } : config.group,
    filter: patch.filter ? { ...config.filter, ...patch.filter } : config.filter,
    forces: patch.forces ? { ...config.forces, ...patch.forces } : config.forces,
    display: patch.display ? { ...config.display, ...patch.display } : config.display,
  }
}

export const sameConfig = (a: MatrixConfig, b: MatrixConfig): boolean =>
  JSON.stringify(a) === JSON.stringify(b)
