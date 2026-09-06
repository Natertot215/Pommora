// `sharedValueClickAction` can only NAME an action — it is pure and synchronous — while filling a file value is a three-step async effect, which would otherwise drift one way per surface tail.

import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { PropertyValue } from '@pommora/core/Properties/propertyValue'
import type { CellMenuAction } from '@pommora/core/Actions/cellMenu'
import { parentOf } from '@pommora/core/Nexus/treePatch'
import { assetSubRoot } from '@pommora/core/Locations/nexusPaths'
import { resolveFileValue } from '../../Assets/assetUrl'
import { useSession } from '../../Session/store'
import { SEGMENT_INDEX_ATTR } from '@pommora/uix/Fields/SegmentRun'
import { host } from '../../Platform/dialer'

export function fileChipIndex(target: EventTarget | null): number | null {
  const el = target instanceof Element ? target.closest(`[${SEGMENT_INDEX_ATTR}]`) : null
  const i = el ? Number(el.getAttribute(SEGMENT_INDEX_ATTR)) : Number.NaN
  return Number.isInteger(i) ? i : null
}

const filesOf = (value: PropertyValue): string[] => (value.kind === 'file' ? value.value : [])

export function fileValueWithout(value: PropertyValue, chip: number): PropertyValue | null {
  const next = filesOf(value).filter((_, i) => i !== chip)
  return next.length > 0 ? { kind: 'file', value: next } : null
}

/** An unresolved chip has no folder of its own to open at, so it falls back to the property's rather than letting the dialog pick its own last-used one. */
export async function runFilePick(
  def: PropertyDefinition,
  current: PropertyValue,
  chip: number | null,
): Promise<PropertyValue | null | undefined> {
  const files = filesOf(current)
  const named = chip === null ? undefined : files[chip]
  const dir = (named && folderOf(named)) || propertyFolder(def)
  const picked = await host().ask('nexus:pickFile', { any: true, ...(dir ? { dir } : {}) })
  if (picked === null) return undefined
  return adoptInto(def, files, chip, picked)
}

async function adoptInto(
  def: PropertyDefinition,
  files: string[],
  chip: number | null,
  source: string,
): Promise<PropertyValue | undefined> {
  const adopted = await host().ask('assets:adopt', source, def.file_directory)
  if (!adopted.ok) return undefined
  const next =
    chip === null
      ? [...files, adopted.value]
      : files.map((f, i) => (i === chip ? adopted.value : f))
  return { kind: 'file', value: next }
}

export function adoptPathInto(
  def: PropertyDefinition,
  current: PropertyValue,
  path: string,
  commit: (next: PropertyValue | null) => void,
): void {
  commitIfDefined(adoptInto(def, filesOf(current), null, path), commit)
}

/** `undefined` is "nothing happened", which a bare `!= null` would mistake for a clear. */
function commitIfDefined(
  result: Promise<PropertyValue | null | undefined>,
  commit: (next: PropertyValue | null) => void,
): void {
  void result.then((next) => {
    if (next !== undefined) commit(next)
  })
}

/** A Directory is stored relative to the ASSET root, so handing it over unjoined would open a same-named folder at the nexus root, and an unset one the nexus root itself. */
function propertyFolder(def: PropertyDefinition): string {
  return assetSubRoot(useSession.getState().tree?.assetDirectory ?? '', def.file_directory)
}

function folderOf(reference: string): string {
  const resolved = resolveFileValue(reference, useSession.getState().assetMap)
  return resolved.kind === 'asset' ? parentOf(resolved.rel) : ''
}

export function pickFileInto(
  def: PropertyDefinition,
  current: PropertyValue,
  chip: number | null,
  commit: (next: PropertyValue | null) => void,
): void {
  commitIfDefined(runFilePick(def, current, chip), commit)
}

export function runFileMenuAction(
  action: CellMenuAction,
  def: PropertyDefinition | undefined,
  current: PropertyValue,
  chip: number | null,
  commit: (next: PropertyValue | null) => void,
): boolean {
  if (action === 'file:remove') {
    if (chip !== null) commit(fileValueWithout(current, chip))
  } else if (action === 'file:add' || action === 'file:replace') {
    if (def) pickFileInto(def, current, action === 'file:replace' ? chip : null, commit)
  } else return false
  return true
}

/** Callers decide the type before calling — a context-menu handler must answer preventDefault synchronously, so nothing async can route for it. */
export async function fileValueMenu(
  def: PropertyDefinition,
  current: PropertyValue,
  target: EventTarget | null,
  commit: (next: PropertyValue | null) => void,
): Promise<void> {
  const chip = fileChipIndex(target)
  const action = await host().ask('cell-menu', { kind: 'file', onChip: chip !== null })
  if (action) runFileMenuAction(action, def, current, chip, commit)
}
