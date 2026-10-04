import { mutateRegistry, readRegistry, NO_PROPERTY, serializeSchemaOp } from './propertiesRegistry'
import { validateOptionValues } from './schema'
import { collectionFolders } from './assignment'
import { keyHolderFiles } from './keyHolders'
import { sweepGovernedRoots, unsweptLine } from './governedSweep'
import { valueEditRewrite, type ValueEdit } from './pageValue'
import { ok, fail, fault, type Result } from '../Contract/result'
import { type Adoption, registeredOption } from './propertyValue'
import {
  addOption,
  applyOptionEdit,
  renameOption as renameInGroups,
  type OptionEdit,
} from './optionModel'
import {
  optionGroupsOf,
  optionsOf,
  optionValues,
  PROPERTY_TYPES,
  type PropertyDefinition,
  SELECT_GROUP,
  type StatusGroup,
  withOptionGroups,
} from './properties'
import {
  clearSchemaJournal,
  type SchemaCascade,
  schemaCascade,
  type SchemaJournal,
  writeSchemaJournal,
} from './propertyJournal'
import { type ConfigReach, reachConfig } from '../Nexus/configReach'

const NO_OPTION = fail('not-found', 'That option no longer exists.')
const NO_GROUP = fail('not-found', 'That group no longer exists.')
const NO_OPTIONS = fail(
  'invalid-property',
  'Options can only be edited on a Select, Multi-Select, or Status property.',
)

const requireOptions = (def: PropertyDefinition): Result<null> =>
  PROPERTY_TYPES[def.type].options ? ok(null) : NO_OPTIONS

function editStoredOptions(
  def: PropertyDefinition,
  stored: unknown,
  edit: (groups: StatusGroup[]) => StatusGroup[],
): PropertyDefinition {
  const raw = { ...(stored as PropertyDefinition), type: def.type }
  return withOptionGroups(def, edit(optionGroupsOf(raw)))
}

function admitOptionEdit(def: PropertyDefinition, e: OptionEdit): Result<null> {
  if ('value' in e && !optionValues(def).includes(e.value)) return NO_OPTION
  if ('groupId' in e && !optionGroupsOf(def).some((g) => g.id === e.groupId)) return NO_GROUP
  if (e.op === 'relabelGroup' && PROPERTY_TYPES[def.type].options !== 'status') return NO_GROUP
  return ok(null)
}

export function editOption(root: string, propertyId: string, e: OptionEdit): Promise<Result<null>> {
  return serializeSchemaOp(root, () =>
    mutateRegistry<Result<null>>(root, (registry, stored) => {
      const def = registry.defs[propertyId]
      if (!def) return { result: NO_PROPERTY }
      const typeCheck = requireOptions(def)
      if (!typeCheck.ok) return { result: typeCheck }
      const admitted = admitOptionEdit(def, e)
      if (!admitted.ok) return { result: admitted }
      const next = editStoredOptions(def, stored[propertyId], (groups) =>
        applyOptionEdit(groups, e),
      )
      const check = validateOptionValues(optionsOf(next))
      if (!check.ok) return { result: check }
      return {
        next: { ...registry, defs: { ...registry.defs, [propertyId]: next } },
        result: ok(null),
      }
    }),
  )
}

export function addOptionToDef(
  root: string,
  propertyId: string,
  value: string,
): Promise<Result<null>> {
  return mutateRegistry<Result<null>>(root, (registry, stored) => {
    const current = registry.defs[propertyId]
    if (!current) return { result: NO_PROPERTY }
    if (current.type !== 'multiSelect')
      return { result: fail('invalid-property', 'Only a Multi-Select adopts options.') }
    if (registeredOption(current, value) !== undefined) return { result: ok(null) }
    const next = editStoredOptions(current, stored[propertyId], (groups) =>
      addOption(groups, SELECT_GROUP, value),
    )
    return {
      next: { ...registry, defs: { ...registry.defs, [propertyId]: next } },
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

export function dropOptionFromDef(
  root: string,
  propertyId: string,
  value: string,
): Promise<Result<null>> {
  return mutateRegistry<Result<null>>(root, (registry, stored) => {
    const current = registry.defs[propertyId]
    if (!current) return { result: NO_PROPERTY }
    const next = editStoredOptions(current, stored[propertyId], (groups) =>
      groups.map((g) => ({ ...g, options: g.options.filter((o) => o.value !== value) })),
    )
    return {
      next: { ...registry, defs: { ...registry.defs, [propertyId]: next } },
      result: ok(null),
    }
  })
}

async function resolveForCascade(
  root: string,
  propertyId: string,
  value: string,
): Promise<Result<PropertyDefinition>> {
  const def = (await readRegistry(root)).defs[propertyId]
  if (!def) return NO_PROPERTY
  const typeCheck = requireOptions(def)
  if (!typeCheck.ok) return typeCheck
  if (!optionValues(def).includes(value)) return NO_OPTION
  return ok(def)
}

async function valueEditSweep(
  root: string,
  key: string,
  target: string,
  edit: ValueEdit,
): Promise<number> {
  const files = await keyHolderFiles(root, key, await collectionFolders(root))
  const raw = valueEditRewrite(key, target, edit)
  return (await sweepGovernedRoots(root, files, { raw, sidecars: raw })).skipped.length
}

export async function optionCascade(
  root: string,
  def: PropertyDefinition,
  value: string,
  edit: ValueEdit,
): Promise<ConfigReach> {
  const pages = await valueEditSweep(root, def.name, value, edit)
  if (pages && edit.op === 'strip') return { skipped: pages, hosts: [] }
  const reach = await reachConfig(root, { kind: 'option', def, value, edit })
  return { skipped: pages + reach.skipped, hosts: reach.hosts }
}

export function renameOption(
  root: string,
  propertyId: string,
  oldValue: string,
  newTitle: string,
): Promise<Result<SchemaCascade>> {
  return serializeSchemaOp(root, async () => {
    const record: SchemaJournal = {
      op: 'option-rename',
      id: propertyId,
      from: oldValue,
      to: newTitle,
    }
    // Staged BEFORE the commit: a crash between commit and cascade is recoverable only from this record, and one stranded by a refusal is disposed of by the replay's holds-to-and-not-from gate.
    if ((await readRegistry(root)).defs[propertyId]) await writeSchemaJournal(root, record)
    const edit = await mutateRegistry<Result<PropertyDefinition>>(root, (registry, stored) => {
      const def = registry.defs[propertyId]
      if (!def) return { result: NO_PROPERTY }
      const typeCheck = requireOptions(def)
      if (!typeCheck.ok) return { result: typeCheck }
      if (!optionValues(def).includes(oldValue)) return { result: NO_OPTION }
      const next = editStoredOptions(def, stored[propertyId], (groups) =>
        renameInGroups(groups, oldValue, newTitle),
      )
      const check = validateOptionValues(optionsOf(next))
      if (!check.ok) return { result: check }
      return {
        next: { ...registry, defs: { ...registry.defs, [propertyId]: next } },
        result: ok(def),
      }
    })
    if (!edit.ok) {
      await clearSchemaJournal(root, record)
      return edit
    }
    const reach = await optionCascade(root, edit.value, oldValue, { op: 'replace', to: newTitle })
    if (!reach.skipped) await clearSchemaJournal(root, record)
    return ok(schemaCascade(reach, record))
  })
}

export function clearOption(
  root: string,
  propertyId: string,
  value: string,
): Promise<Result<null>> {
  return serializeSchemaOp(root, async () => {
    const r = await resolveForCascade(root, propertyId, value)
    if (!r.ok) return r
    const skipped = await valueEditSweep(root, r.value.name, value, { op: 'strip' })
    return skipped ? fault(unsweptLine(skipped)) : ok(null)
  })
}

export function removeOption(
  root: string,
  propertyId: string,
  value: string,
): Promise<Result<SchemaCascade>> {
  return serializeSchemaOp(root, async () => {
    const r = await resolveForCascade(root, propertyId, value)
    if (!r.ok) return r
    const record: SchemaJournal = { op: 'option-remove', id: propertyId, value }
    const journaled = await writeSchemaJournal(root, record)
    const reach = await optionCascade(root, r.value, value, { op: 'strip' })
    if (!reach.skipped) {
      const dropped = await dropOptionFromDef(root, propertyId, value)
      if (!dropped.ok) return dropped
      await clearSchemaJournal(root, record)
    }
    return ok(schemaCascade(reach, journaled ? record : undefined))
  })
}
