import { mutateRegistry, readRegistry } from './propertiesRegistry'
import { validateOptionValues } from './schema'
import { collectionFolders } from './assignment'
import { keyHolderFiles } from './keyHolders'
import { sweepGovernedRoots } from './governedSweep'
import { serializeSchemaOp } from './schemaChain'
import { replacePageValue, stripPageValue } from './pageValue'
import { ok, fail, type Result } from '../Contract/result'
import type { Adoption } from './propertyValue'
import {
  renameOption as renameInArray,
  renameStatusOption as renameStatusInArray,
  type Option,
} from './optionModel'
import {
  hasSelectOptions,
  type PropertyDefinition,
  type PropertyType,
  type StatusGroup,
} from './properties'
import { clearSchemaJournal, writeSchemaJournal, type SchemaJournal } from './propertyJournal'

const NO_PROPERTY = fail('not-found', 'Property not found.')

function requireOptionType(type: PropertyType): Result<null> {
  return hasSelectOptions(type)
    ? ok(null)
    : fail('invalid-property', 'Options can only be edited on Select or Multi-Select properties.')
}

/** Rides serializeSchemaOp so it can't land inside a concurrent renameOption's cascade and desync the registry from pages. */
export function setOptions(
  root: string,
  propertyId: string,
  options: Option[],
): Promise<Result<null>> {
  return serializeSchemaOp(() =>
    mutateRegistry<Result<null>>(root, (registry) => {
      const current = registry.defs[propertyId]
      if (!current) return { result: NO_PROPERTY }
      const typeCheck = requireOptionType(current.type)
      if (!typeCheck.ok) return { result: typeCheck }
      const check = validateOptionValues(options)
      if (!check.ok) return { result: check }
      const next = { ...current, select_options: options }
      return {
        next: { ...registry, defs: { ...registry.defs, [propertyId]: next } },
        result: ok(null),
      }
    }),
  )
}

/** Validates unique option values property-wide, across all groups, since a page's value is referenced across all groups. */
export function setStatusGroups(
  root: string,
  propertyId: string,
  groups: StatusGroup[],
): Promise<Result<null>> {
  return serializeSchemaOp(() =>
    mutateRegistry<Result<null>>(root, (registry) => {
      const current = registry.defs[propertyId]
      if (!current) return { result: NO_PROPERTY }
      if (current.type !== 'status') {
        return {
          result: fail('invalid-property', 'Status groups can only be set on a Status property.'),
        }
      }
      const check = validateOptionValues(groups.flatMap((g) => g.options))
      if (!check.ok) return { result: check }
      const next = { ...current, status_groups: groups }
      return {
        next: { ...registry, defs: { ...registry.defs, [propertyId]: next } },
        result: ok(null),
      }
    }),
  )
}

// mutateRegistry alone: the caller holds a page lock the schema chain's cascades take.
export function addOptionToDef(
  root: string,
  propertyId: string,
  value: string,
): Promise<Result<null>> {
  return mutateRegistry<Result<null>>(root, (registry) => {
    const current = registry.defs[propertyId]
    if (!current) return { result: NO_PROPERTY }
    if (current.type !== 'multi_select')
      return { result: fail('invalid-property', 'Only a Multi-Select adopts options.') }
    const options = current.select_options ?? []
    if (options.some((o) => o.value === value)) return { result: ok(null) }
    return {
      next: {
        ...registry,
        defs: {
          ...registry.defs,
          [propertyId]: { ...current, select_options: [...options, { value, label: value }] },
        },
      },
      result: ok(null),
    }
  })
}

export async function applyAdoptions(root: string, adoptions: readonly Adoption[]): Promise<void> {
  const seen = new Set<string>()
  for (const a of adoptions) {
    const key = `${a.propertyId}\u0000${a.value}`
    if (seen.has(key)) continue
    seen.add(key)
    await addOptionToDef(root, a.propertyId, a.value)
  }
}

/** Shared with the crash replay so both run the identical edit; a value already gone is a completed finish, not a failure. */
export function dropOptionFromDef(
  root: string,
  propertyId: string,
  value: string,
): Promise<Result<null>> {
  return mutateRegistry<Result<null>>(root, (registry) => {
    const current = registry.defs[propertyId]
    if (!current) return { result: NO_PROPERTY }
    const next =
      current.type === 'status'
        ? {
            ...current,
            status_groups: (current.status_groups ?? []).map((g) => ({
              ...g,
              options: g.options.filter((o) => o.value !== value),
            })),
          }
        : {
            ...current,
            select_options: (current.select_options ?? []).filter((o) => o.value !== value),
          }
    return {
      next: { ...registry, defs: { ...registry.defs, [propertyId]: next } },
      result: ok(null),
    }
  })
}

type RequireType = (type: PropertyType) => Result<null>

async function resolveForCascade(
  root: string,
  propertyId: string,
  requireType: RequireType,
): Promise<Result<string>> {
  const def = (await readRegistry(root)).defs[propertyId]
  if (!def) return NO_PROPERTY
  const typeCheck = requireType(def.type)
  if (!typeCheck.ok) return typeCheck
  return ok(def.name)
}

async function stripCascade(root: string, key: string, value: string): Promise<number> {
  const files = await keyHolderFiles(root, key, await collectionFolders(root))
  const text = (content: string): string | null => stripPageValue(content, key, value)
  const swept = await sweepGovernedRoots(root, { kind: 'files', files }, { text })
  return swept.skipped.length
}

/** Staged BEFORE the commit: a crash between commit and cascade is recoverable only from this record, and one stranded by a refusal is disposed of by the replay's holds-to-and-not-from gate. */
async function stageOptionRename(
  root: string,
  propertyId: string,
  from: string,
  to: string,
): Promise<SchemaJournal> {
  const record: SchemaJournal = { op: 'option-rename', id: propertyId, from, to }
  if ((await readRegistry(root)).defs[propertyId]) await writeSchemaJournal(root, record)
  return record
}

function requireStatusType(type: PropertyType): Result<null> {
  return type === 'status'
    ? ok(null)
    : fail('invalid-property', 'Status options can only be edited on a Status property.')
}

type OptionEdit = (
  def: PropertyDefinition,
  oldValue: string,
  newTitle: string,
) => { next: PropertyDefinition; values: Option[] }

const editSelectOptions: OptionEdit = (def, oldValue, newTitle) => {
  const options = renameInArray(def.select_options ?? [], oldValue, newTitle)
  return { next: { ...def, select_options: options }, values: options }
}

const editStatusGroups: OptionEdit = (def, oldValue, newTitle) => {
  const groups = renameStatusInArray(def.status_groups ?? [], oldValue, newTitle)
  return { next: { ...def, status_groups: groups }, values: groups.flatMap((g) => g.options) }
}

function renameOp(requireType: RequireType, editDef: OptionEdit) {
  return (
    root: string,
    propertyId: string,
    oldValue: string,
    newTitle: string,
  ): Promise<Result<null>> =>
    serializeSchemaOp(async () => {
      const record = await stageOptionRename(root, propertyId, oldValue, newTitle)
      const edit = await mutateRegistry<Result<string>>(root, (registry) => {
        const def = registry.defs[propertyId]
        if (!def) return { result: NO_PROPERTY }
        const typeCheck = requireType(def.type)
        if (!typeCheck.ok) return { result: typeCheck }
        const edited = editDef(def, oldValue, newTitle)
        const check = validateOptionValues(edited.values)
        if (!check.ok) return { result: check }
        return {
          next: { ...registry, defs: { ...registry.defs, [propertyId]: edited.next } },
          result: ok(def.name),
        }
      })
      if (!edit.ok) {
        await clearSchemaJournal(root, record)
        return edit
      }
      const key = edit.value
      const files = await keyHolderFiles(root, key, await collectionFolders(root))
      const text = (c: string): string | null => replacePageValue(c, key, oldValue, newTitle)
      const swept = await sweepGovernedRoots(root, { kind: 'files', files }, { text })
      if (!swept.skipped.length) await clearSchemaJournal(root, record)
      return ok(null)
    })
}

/** Unjournaled because the registry is untouched: its crash residue disagrees with nothing, since every remaining value is still a legal option. */
function clearOp(requireType: RequireType) {
  return (root: string, propertyId: string, value: string): Promise<Result<null>> =>
    serializeSchemaOp(async () => {
      const r = await resolveForCascade(root, propertyId, requireType)
      if (!r.ok) return r
      await stripCascade(root, r.value, value)
      return ok(null)
    })
}

/** Pages first, so a def-edit failure never leaves the option gone with its values orphaned; a strip that could not read every holder defers the registry drop. */
function removeOp(requireType: RequireType) {
  return (root: string, propertyId: string, value: string): Promise<Result<null>> =>
    serializeSchemaOp(async () => {
      const r = await resolveForCascade(root, propertyId, requireType)
      if (!r.ok) return r
      const record: SchemaJournal = { op: 'option-remove', id: propertyId, value }
      await writeSchemaJournal(root, record)
      const skipped = await stripCascade(root, r.value, value)
      if (skipped) return ok(null)
      const dropped = await dropOptionFromDef(root, propertyId, value)
      await clearSchemaJournal(root, record)
      return dropped
    })
}

export const renameOption = renameOp(requireOptionType, editSelectOptions)
export const clearOption = clearOp(requireOptionType)
export const removeOption = removeOp(requireOptionType)

export const renameStatusOption = renameOp(requireStatusType, editStatusGroups)
export const clearStatusOption = clearOp(requireStatusType)
export const removeStatusOption = removeOp(requireStatusType)
