// The file value's one editing gesture, shared by every surface that has one. `sharedValueClickAction`
// can only NAME an action — it is pure and synchronous — while filling a file value is a three-step
// async effect: open the dialog, land the bytes, then write the reference. Without this the arm
// would be shared and the effect would drift four ways, one per surface tail.

import type { PropertyDefinition } from '@shared/properties'
import type { PropertyValue } from '@shared/propertyValue'
import { parentOf } from '@shared/treePatch'
import { resolveFileValue } from '@renderer/assetUrl'
import { useSession } from '@renderer/store'

/** Which label a click landed on, or null for the value's own area. The run stamps its entries
 *  with their position, so the table, the cards and both panes hit-test the same way. */
export function fileChipIndex(target: EventTarget | null): number | null {
  const el = target instanceof Element ? target.closest('[data-segment-index]') : null
  const i = el ? Number(el.getAttribute('data-segment-index')) : Number.NaN
  return Number.isInteger(i) ? i : null
}

const filesOf = (value: PropertyValue): string[] => (value.kind === 'file' ? value.value : [])

/** The value with `chip` dropped — null once nothing is left, so the key clears rather than
 *  writing an empty list. */
export function fileValueWithout(value: PropertyValue, chip: number): PropertyValue | null {
  const next = filesOf(value).filter((_, i) => i !== chip)
  return next.length > 0 ? { kind: 'file', value: next } : null
}

/**
 * Pick a file and answer the value to commit, or `undefined` where nothing should be written —
 * a cancelled dialog, a refused adoption.
 *
 * A chip REPLACES the file it names and opens at that file's own folder, which is what makes
 * "reveal where this lives" and "swap it" the same gesture. The value's area ADDS, and opens at
 * the property's configured Directory. An unresolved chip has no folder of its own to open at, so
 * it falls back to the property's rather than letting the dialog pick its own last-used one.
 */
export async function runFilePick(
  def: PropertyDefinition,
  current: PropertyValue,
  chip: number | null,
): Promise<PropertyValue | null | undefined> {
  const files = filesOf(current)
  const named = chip === null ? undefined : files[chip]
  const dir = (named && folderOf(named)) || propertyFolder(def)
  const picked = await window.nexus.pickFile({ any: true, ...(dir ? { dir } : {}) })
  if (picked === null) return undefined
  // The reference is written only after the bytes land — a failed adoption leaves the value alone.
  const adopted = await window.nexus.adoptFile(picked, def.file_directory)
  if (!adopted.ok) return undefined
  const next =
    chip === null
      ? [...files, adopted.value]
      : files.map((f, i) => (i === chip ? adopted.value : f))
  return { kind: 'file', value: next }
}

/** Where this property's files live, nexus-relative — which is the only domain `pickFile` reads.
 *  A Directory is stored relative to the ASSET root, so handing it over unjoined would open a
 *  same-named folder at the nexus root, and an unset one would open the nexus root itself. */
function propertyFolder(def: PropertyDefinition): string {
  const assetRoot = useSession.getState().tree?.assetDirectory ?? ''
  return [assetRoot, def.file_directory].filter(Boolean).join('/')
}

/** The nexus-relative folder a resolved reference sits in, or '' where nothing answers to it. */
function folderOf(reference: string): string {
  const resolved = resolveFileValue(reference, useSession.getState().assetMap)
  return resolved.kind === 'asset' ? parentOf(resolved.rel) : ''
}

/** The pick as every surface actually spends it: run it, and write only a defined answer —
 *  `undefined` is "nothing happened", which a bare `!= null` would mistake for a clear. Stated
 *  once so no call site decides for itself what a cancelled dialog means. */
export function pickFileInto(
  def: PropertyDefinition,
  current: PropertyValue,
  chip: number | null,
  commit: (next: PropertyValue | null) => void,
): void {
  void runFilePick(def, current, chip).then((next) => {
    if (next !== undefined) commit(next)
  })
}

/** The value menu's three file actions, for the surfaces that pop one. Remove needs no dialog and
 *  Add differs from Replace only in whether it carries the chip, so the triad is one branch rather
 *  than a copy per surface. */
export function runFileMenuAction(
  action: 'file:add' | 'file:replace' | 'file:remove',
  def: PropertyDefinition | undefined,
  current: PropertyValue,
  chip: number | null,
  commit: (next: PropertyValue | null) => void,
): void {
  if (action === 'file:remove') {
    if (chip !== null) commit(fileValueWithout(current, chip))
  } else if (def) {
    pickFileInto(def, current, action === 'file:replace' ? chip : null, commit)
  }
}

/**
 * The file value's right-click, for the surfaces whose menu is the VALUE's rather than a column's.
 * Answers false when the value isn't a file, so a caller falls through to whatever it pops
 * otherwise. The table and the cards reach the same three actions through their own column menu;
 * this is the same triad without the column items an inspector row has no business offering.
 */
export async function fileValueMenu(
  def: PropertyDefinition,
  current: PropertyValue,
  target: EventTarget | null,
  commit: (next: PropertyValue | null) => void,
): Promise<boolean> {
  if (def.type !== 'file') return false
  const chip = fileChipIndex(target)
  const action = await window.nexus.cellMenu({ kind: 'file', onChip: chip !== null })
  if (action === 'file:add' || action === 'file:replace' || action === 'file:remove')
    runFileMenuAction(action, def, current, chip, commit)
  return true
}
