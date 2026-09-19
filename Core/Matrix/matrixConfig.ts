import { type FilterGroup, filterGroup } from '../Views/views'
import { isPlainObject } from '../Properties/propertyValue'
import { clamp } from '@pommora/uix/Utilities/clamp'
import type { Forces } from './Engine/forces'
import type { GroupMode } from './Engine/graph'

export interface MatrixConfig {
  group: { mode: GroupMode }
  filter: { rules: FilterGroup | null; enabled: boolean }
  forces: Forces
  display: { unlinked: boolean; hideIcon: boolean; hidePath: boolean; locked: boolean }
}

export type MatrixPatch = { [S in keyof MatrixConfig]?: Partial<MatrixConfig[S]> }

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

export const clampForce = (key: keyof Forces, v: number): number => {
  const steps = FORCE_STEPS[key]
  return clamp(v, steps[0], steps[steps.length - 1])
}

const DEFAULT_FORCES: Forces = { gravity: 1, spread: 1, strength: 1, distance: 1 }

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
  return {
    group: { mode },
    filter: {
      rules: filterGroup.safeParse(filter.rules).data ?? null,
      enabled: bool(filter.enabled, d.filter.enabled),
    },
    forces: {
      gravity: force(forces.gravity, 'gravity', d.forces.gravity),
      spread: force(forces.spread, 'spread', d.forces.spread),
      strength: force(forces.strength, 'strength', d.forces.strength),
      distance: force(forces.distance, 'distance', d.forces.distance),
    },
    display: {
      unlinked: bool(display.unlinked, d.display.unlinked),
      hideIcon: bool(display.hideIcon, d.display.hideIcon),
      hidePath: bool(display.hidePath, d.display.hidePath),
      locked: bool(display.locked, d.display.locked),
    },
  }
}

// A section not in the patch keeps its reference, so a consumer comparing sections by identity sees exactly what moved.
export function applyPatch(config: MatrixConfig, patch: MatrixPatch): MatrixConfig {
  return {
    group: patch.group ? { ...config.group, ...patch.group } : config.group,
    filter: patch.filter ? { ...config.filter, ...patch.filter } : config.filter,
    forces: patch.forces ? { ...config.forces, ...patch.forces } : config.forces,
    display: patch.display ? { ...config.display, ...patch.display } : config.display,
  }
}

export const SECTIONS = ['group', 'filter', 'forces', 'display'] as const

// A pushed section that reads the same as the held one keeps the held reference, and an all-equal push keeps the config itself.
export function mergeConfig(held: MatrixConfig, pushed: MatrixConfig): MatrixConfig {
  const kept = <K extends keyof MatrixConfig>(key: K): MatrixConfig[K] =>
    JSON.stringify(held[key]) === JSON.stringify(pushed[key]) ? held[key] : pushed[key]
  const next: MatrixConfig = {
    group: kept('group'),
    filter: kept('filter'),
    forces: kept('forces'),
    display: kept('display'),
  }
  return SECTIONS.every((key) => next[key] === held[key]) ? held : next
}
