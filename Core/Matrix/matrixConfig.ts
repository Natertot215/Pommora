import { type FilterGroup, filterGroup } from '../Views/views'
import { isPlainObject } from '../Properties/propertyValue'
import { clamp } from '@pommora/uix/Utilities/clamp'
import type { Forces } from './Engine/forces'
import type { GroupMode } from './Engine/graph'

export type MatrixConfig = {
  group: { mode: GroupMode }
  filter: { rules: FilterGroup | null; enabled: boolean }
  forces: Record<GroupMode, Forces>
  display: { unlinked: boolean; hideIcon: boolean; hidePath: boolean; locked: boolean }
}

export type MatrixPatch = {
  [S in Exclude<keyof MatrixConfig, 'forces'>]?: Partial<MatrixConfig[S]>
} & {
  forces?: { [M in GroupMode]?: Partial<Forces> }
}

const GRAVITY_STEPS = Array.from({ length: 20 }, (_, i) => (i + 1) / 10)
const QUARTER_STEPS = [
  0.35, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4,
]

export const FORCE_STEPS: Record<keyof Forces, readonly number[]> = {
  gravity: GRAVITY_STEPS,
  spread: QUARTER_STEPS,
  strength: QUARTER_STEPS,
  distance: QUARTER_STEPS,
}

const clampForce = (key: keyof Forces, v: number): number => {
  const steps = FORCE_STEPS[key]
  return clamp(v, steps[0], steps[steps.length - 1])
}

// A patch spreads a new block for its grouping even when no value moved, so the runtime reads these by value rather than re-solving the picture for an unchanged set.
export const sameForces = (a: Forces, b: Forces): boolean =>
  a.gravity === b.gravity &&
  a.spread === b.spread &&
  a.strength === b.strength &&
  a.distance === b.distance

// KNOBs — where each grouping's forces rest. They start alike and are meant to part: containment, membership, and connection springs pull on different shapes.
const CONNECTION_FORCES: Forces = { gravity: 1, spread: 1, strength: 1, distance: 1 }
const LOCATION_FORCES: Forces = { gravity: 1, spread: 1, strength: 1, distance: 1 }
const SPACE_FORCES: Forces = { gravity: 1, spread: 1, strength: 1, distance: 1 }

const DEFAULT_FORCES: Record<GroupMode, Forces> = {
  connection: CONNECTION_FORCES,
  location: LOCATION_FORCES,
  space: SPACE_FORCES,
}

export const DEFAULT_MATRIX_CONFIG: MatrixConfig = {
  group: { mode: 'connection' },
  filter: { rules: null, enabled: true },
  forces: DEFAULT_FORCES,
  display: { unlinked: true, hideIcon: false, hidePath: false, locked: false },
}

const GROUP_MODES: readonly GroupMode[] = ['connection', 'location', 'space']

const section = (raw: unknown, key: string): Record<string, unknown> =>
  isPlainObject(raw) && isPlainObject(raw[key]) ? raw[key] : {}
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback)
const force = (v: unknown, key: keyof Forces, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? clampForce(key, v) : fallback

export function parseMatrixConfig(raw: unknown): MatrixConfig {
  const d = DEFAULT_MATRIX_CONFIG
  const group = section(raw, 'group')
  const filter = section(raw, 'filter')
  const forces = section(raw, 'forces')
  const display = section(raw, 'display')
  const mode = GROUP_MODES.find((m) => m === group.mode) ?? d.group.mode
  // A file written before each grouping carried its own set holds one flat set; it seeds all three rather than being dropped.
  const forcesFor = (of: GroupMode): Forces => {
    const own = { ...forces, ...(isPlainObject(forces[of]) ? forces[of] : {}) }
    const fallback = d.forces[of]
    return {
      gravity: force(own.gravity, 'gravity', fallback.gravity),
      spread: force(own.spread, 'spread', fallback.spread),
      strength: force(own.strength, 'strength', fallback.strength),
      distance: force(own.distance, 'distance', fallback.distance),
    }
  }
  return {
    group: { mode },
    filter: {
      rules: filterGroup.safeParse(filter.rules).data ?? null,
      enabled: bool(filter.enabled, d.filter.enabled),
    },
    forces: {
      connection: forcesFor('connection'),
      location: forcesFor('location'),
      space: forcesFor('space'),
    },
    display: {
      unlinked: bool(display.unlinked, d.display.unlinked),
      hideIcon: bool(display.hideIcon, d.display.hideIcon),
      hidePath: bool(display.hidePath, d.display.hidePath),
      locked: bool(display.locked, d.display.locked),
    },
  }
}

function patchForces(
  forces: MatrixConfig['forces'],
  patch: NonNullable<MatrixPatch['forces']>,
): MatrixConfig['forces'] {
  const next = { ...forces }
  for (const mode of GROUP_MODES) if (patch[mode]) next[mode] = { ...next[mode], ...patch[mode] }
  return next
}

// A section not in the patch keeps its reference, so a consumer comparing sections by identity sees exactly what moved.
export function applyPatch(config: MatrixConfig, patch: MatrixPatch): MatrixConfig {
  return {
    group: patch.group ? { ...config.group, ...patch.group } : config.group,
    filter: patch.filter ? { ...config.filter, ...patch.filter } : config.filter,
    forces: patch.forces ? patchForces(config.forces, patch.forces) : config.forces,
    display: patch.display ? { ...config.display, ...patch.display } : config.display,
  }
}

export const SECTIONS = ['group', 'filter', 'forces', 'display'] as const
