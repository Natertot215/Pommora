import { mutateRegistry, readRegistry, NO_PROPERTY, serializeSchemaOp } from './propertiesRegistry'
import { uniqueOptionGroups, validateOptionValues } from './schema'
import { collectionFolders } from './assignment'
import { keyHolderFiles } from './keyHolders'
import { sweepCount, sweepGovernedRoots, type SweepPlan, unsweptLine } from './governedSweep'
import { editList, valueEditRewrite, type ValueEdit } from './pageValue'
import { editCaches } from './propertyCache'
import { editHeldList, memberKey } from '../Files/rootValues'
import { errText, ok, fail, fault, type Result } from '../Contract/result'
import { findOption, unregisteredMembers } from './propertyValue'
import { formatKey, type KeyFormat } from './keyFormat'
import { addOption, applyOptionEdit, mapOptions, type OptionEdit } from './optionModel'
import {
  labelled,
  optionGroupsOf,
  optionsOf,
  PROPERTY_TYPES,
  type PropertyDefinition,
  SELECT_GROUP,
  type StatusGroup,
  withOptionGroups,
} from './properties'
import {
  clearSchemaJournal,
  readSchemaJournal,
  type SchemaCascade,
  schemaCascade,
  type SchemaJournal,
  writeSchemaJournal,
} from './propertyJournal'
import { type ConfigReach, NO_REACH, reachConfig } from '../Nexus/configReach'
import { heldTreeOf, liveTreeOf } from '../Nexus/liveTree'
import { readPageRecord } from '../Nexus/readNexus'
import { containerAt, containerSchema, pagePathsIn, spaceAt } from '../Nexus/treePatch'
import type { Json } from '../Files/stableJson'
import { isMarkdownFile, join } from '../Paths/posix'

const NO_OPTION = fail('not-found', 'That option no longer exists.')
const NO_GROUP = fail('not-found', 'That group no longer exists.')
const OWED = fail('owed', 'An earlier change hasn’t reached every file yet.')
// A replay over a partly swept file can't tell a moved word from an unmoved one.
const CROSSED = fail(
  'invalid-property',
  'This format would give one option the key another option writes now, please rename one first.',
)
const NO_OPTIONS = fail(
  'invalid-property',
  'Options can only be edited on a Select, Multi-Select, or Status property.',
)

const optionDef = (def: PropertyDefinition | undefined): Result<PropertyDefinition> =>
  !def ? NO_PROPERTY : PROPERTY_TYPES[def.type].options ? ok(def) : NO_OPTIONS

function editStoredOptions(
  def: PropertyDefinition,
  stored: unknown,
  edit: (groups: StatusGroup[]) => StatusGroup[],
): PropertyDefinition {
  const raw = { ...(stored as PropertyDefinition), type: def.type }
  const named = mapOptions(optionGroupsOf(raw), labelled)
  return withOptionGroups(def, edit(uniqueOptionGroups(named)))
}

function admitOptionEdit(def: PropertyDefinition, e: OptionEdit): Result<null> {
  if ('option' in e && !findOption(def, e.option)) return NO_OPTION
  if ('groupId' in e && !optionGroupsOf(def).some((g) => g.id === e.groupId)) return NO_GROUP
  if (e.op === 'relabelGroup' && PROPERTY_TYPES[def.type].options !== 'status') return NO_GROUP
  if (e.op === 'relabelGroup' && !e.label.trim())
    return fail('invalid-property', 'Group labels can’t be blank.')
  return ok(null)
}

// A rename still owed to the files its sweep skipped leaves its old keys held there, so an option taking one back would end the rename's replay.
const owedKeys = (journal: SchemaJournal | null, id: string): Set<unknown> =>
  new Set(
    journal?.op === 'option-rename' && journal.id === id
      ? journal.keys.map(([from]) => memberKey(from))
      : [],
  )

const keysOf = (def: PropertyDefinition): unknown[] => optionsOf(def).map((o) => memberKey(o.key))

export function editOption(root: string, propertyId: string, e: OptionEdit): Promise<Result<null>> {
  return serializeSchemaOp(root, async () => {
    const owed = owedKeys(await readSchemaJournal(root), propertyId)
    return mutateRegistry<Result<null>>(root, (registry, stored) => {
      const found = optionDef(registry.defs[propertyId])
      if (!found.ok) return { result: found }
      const def = found.value
      const admitted = admitOptionEdit(def, e)
      if (!admitted.ok) return { result: admitted }
      const next = editStoredOptions(def, stored[propertyId], (groups) =>
        applyOptionEdit(groups, e, def.value_format),
      )
      const check = validateOptionValues(optionsOf(next))
      if (!check.ok) return { result: check }
      const held = new Set(keysOf(def))
      if (keysOf(next).some((k) => owed.has(k) && !held.has(k))) return { result: OWED }
      return {
        next: { ...registry, defs: { ...registry.defs, [propertyId]: next } },
        result: ok(null),
      }
    })
  })
}

/** Registers each Multi-Select member the files at `rels` hold beyond their definition — a page, a container's pages, or a Space — or every file's when `rels` is omitted, in one write. It reads under the schema lock, so a cascade is read whole. */
export async function registerHeldOptions(root: string, rels?: readonly string[]): Promise<void> {
  try {
    await serializeSchemaOp(root, async () => {
      const tree = heldTreeOf(root)
      if (!tree) return
      const held = new Map<string, string[]>()
      const collect = (values: Json, defs: readonly PropertyDefinition[]): void => {
        for (const def of defs) {
          const members = unregisteredMembers(def, values[def.key])
          if (members.length) held.set(def.id, [...(held.get(def.id) ?? []), ...members])
        }
      }
      const everywhere = [
        ...tree.collections.map((c) => c.path),
        ...tree.contexts.flatMap((g) => g.spaces.map((s) => s.path)),
      ]
      for (const rel of rels ?? everywhere) {
        const pages = isMarkdownFile(rel) ? [rel] : null
        const space = pages ? null : spaceAt(tree, rel)
        const defs = (space ? tree.config.registry : containerSchema(tree, rel)).filter(
          (d) => d.type === 'multiSelect',
        )
        if (!defs.length) continue
        if (space) collect(space.values ?? {}, defs)
        else
          for (const page of pages ?? pagePathsIn(containerAt(tree, rel))) {
            const read = await readPageRecord(join(root, page), page).catch(() => null)
            if (read?.kind === 'read') collect(read.fm, defs)
          }
      }
      if (!held.size) return
      const journal = await readSchemaJournal(root)
      await mutateRegistry(root, (registry, stored) => {
        let defs = registry.defs
        for (const [id, members] of held) {
          const def = defs[id]
          if (!def) continue
          const owed = owedKeys(journal, id)
          const fresh = unregisteredMembers(def, members).filter((v) => !owed.has(memberKey(v)))
          if (!fresh.length) continue
          const next = editStoredOptions(def, stored[id], (groups) =>
            fresh.reduce((g, v) => addOption(g, SELECT_GROUP, v, v), groups),
          )
          defs = { ...defs, [id]: next }
        }
        return defs === registry.defs
          ? { result: null }
          : { next: { ...registry, defs }, result: null }
      })
    })
  } catch (e) {
    console.error('held options: could not be registered:', errText(e))
  }
}

export function dropOptionFromDef(
  root: string,
  propertyId: string,
  key: string,
): Promise<Result<null>> {
  return mutateRegistry<Result<null>>(root, (registry, stored) => {
    const current = registry.defs[propertyId]
    if (!current) return { result: NO_PROPERTY }
    const next = editStoredOptions(current, stored[propertyId], (groups) =>
      groups.map((g) => ({ ...g, options: g.options.filter((o) => o.key !== key) })),
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
  label: string,
): Promise<Result<{ def: PropertyDefinition; key: string }>> {
  const found = optionDef((await readRegistry(root)).defs[propertyId])
  if (!found.ok) return found
  const option = findOption(found.value, label)
  return option ? ok({ def: found.value, key: option.key }) : NO_OPTION
}

async function valueEditPlan(
  root: string,
  def: PropertyDefinition,
  keys: ValueEdit,
): Promise<{ files: string[]; plan: SweepPlan }> {
  const files = await keyHolderFiles(root, def.key, await collectionFolders(root))
  const raw = valueEditRewrite(def, keys)
  return { files, plan: { raw, sidecars: raw } }
}

async function cacheSweep(root: string, def: PropertyDefinition, keys: ValueEdit): Promise<number> {
  const { collections } = await liveTreeOf(root)
  return editCaches(root, collections, new Set([def.id]), (values) =>
    Object.keys(values).reduce<Json | null>(
      (next, id) => editHeldList(next ?? values, id, (held) => editList(held, keys)) ?? next,
      null,
    ),
  )
}

/** Rewrites the files and caches holding `keys`' old keys, and with `labels` every configuration reference to the option's label. */
export async function optionCascade(
  root: string,
  def: PropertyDefinition,
  keys: ValueEdit,
  labels?: readonly [string, string | null],
): Promise<ConfigReach> {
  let skipped = 0
  if (keys.size) {
    const { files, plan } = await valueEditPlan(root, def, keys)
    skipped = (await sweepGovernedRoots(root, files, plan)).skipped.length
    // A Remove that skipped a file stops here, so the option and every reference to it stay while its replay is owed.
    if (skipped && labels?.[1] === null) return { skipped, hosts: [] }
    skipped += await cacheSweep(root, def, keys)
  }
  const reach = labels ? await reachConfig(root, { kind: 'option', def, labels }) : NO_REACH
  return { skipped: skipped + reach.skipped, hosts: reach.hosts }
}

async function rekeyOptions(
  root: string,
  record: Extract<SchemaJournal, { op: 'option-rename' }>,
  value_format?: KeyFormat,
): Promise<Result<SchemaCascade>> {
  // Staged BEFORE the commit: a crash between commit and cascade is recoverable only from this record.
  if (!(await writeSchemaJournal(root, record))) return OWED
  const keys = new Map(record.keys)
  const relabel = (label: string): string =>
    record.labels && label === record.labels[0] ? record.labels[1] : label
  const edit = await mutateRegistry<Result<PropertyDefinition>>(root, (registry, stored) => {
    const found = optionDef(registry.defs[record.id])
    if (!found.ok) return { result: found }
    const def = found.value
    if (record.labels && !findOption(def, record.labels[0])) return { result: NO_OPTION }
    const current = value_format ? { ...def, value_format } : def
    const next = editStoredOptions(current, stored[record.id], (groups) =>
      mapOptions(groups, (o) => ({ ...o, key: keys.get(o.key) ?? o.key, label: relabel(o.label) })),
    )
    const check = validateOptionValues(optionsOf(next))
    if (!check.ok) return { result: check }
    return { next: { ...registry, defs: { ...registry.defs, [record.id]: next } }, result: ok(def) }
  })
  if (!edit.ok) {
    await clearSchemaJournal(root, record)
    return edit
  }
  const reach = await optionCascade(root, edit.value, keys, record.labels)
  if (!reach.skipped) await clearSchemaJournal(root, record)
  return ok(schemaCascade(reach, record))
}

export function renameOption(
  root: string,
  propertyId: string,
  oldLabel: string,
  newLabel: string,
): Promise<Result<SchemaCascade>> {
  return serializeSchemaOp(root, async () => {
    const r = await resolveForCascade(root, propertyId, oldLabel)
    if (!r.ok) return r
    const { def, key } = r.value
    const to = formatKey(newLabel, def.value_format)
    return rekeyOptions(root, {
      op: 'option-rename',
      id: propertyId,
      keys: key === to ? [] : [[key, to]],
      labels: [oldLabel, newLabel],
    })
  })
}

async function valueFormatPlan(
  root: string,
  propertyId: string,
  format: KeyFormat,
): Promise<Result<{ def: PropertyDefinition; keys: [string, string][] }>> {
  const found = optionDef((await readRegistry(root)).defs[propertyId])
  if (!found.ok) return found
  const def = found.value
  const moved = optionsOf(def).map((o) => ({ ...o, was: o.key, key: formatKey(o.label, format) }))
  const check = validateOptionValues(
    moved,
    'This format would give two options the same key, please rename one first.',
  )
  if (!check.ok) return check
  const keys = moved.flatMap(({ was, key }): [string, string][] =>
    key === was ? [] : [[was, key]],
  )
  const olds = new Set(keys.map(([from]) => memberKey(from)))
  if (keys.some(([from, to]) => memberKey(to) !== memberKey(from) && olds.has(memberKey(to))))
    return CROSSED
  return ok({ def, keys })
}

export function setValueFormat(
  root: string,
  propertyId: string,
  format: KeyFormat,
): Promise<Result<SchemaCascade>> {
  return serializeSchemaOp(root, async () => {
    const planned = await valueFormatPlan(root, propertyId, format)
    if (!planned.ok) return planned
    return rekeyOptions(
      root,
      { op: 'option-rename', id: propertyId, keys: planned.value.keys },
      format,
    )
  })
}

export async function valueFormatHolders(
  root: string,
  propertyId: string,
  format: KeyFormat,
): Promise<Result<number>> {
  const planned = await valueFormatPlan(root, propertyId, format)
  if (!planned.ok) return planned
  const { def, keys } = planned.value
  if (!keys.length) return ok(0)
  const { files, plan } = await valueEditPlan(root, def, new Map(keys))
  return ok(await sweepCount(root, files, plan))
}

export function clearOption(
  root: string,
  propertyId: string,
  label: string,
): Promise<Result<null>> {
  return serializeSchemaOp(root, async () => {
    const journal = await readSchemaJournal(root)
    const option = journal?.op === 'option-rename' || journal?.op === 'option-remove'
    if (option && journal.id === propertyId) return OWED
    const r = await resolveForCascade(root, propertyId, label)
    if (!r.ok) return r
    const { skipped } = await optionCascade(root, r.value.def, new Map([[r.value.key, null]]))
    return skipped ? fault(unsweptLine(skipped)) : ok(null)
  })
}

export async function optionHolders(
  root: string,
  propertyId: string,
  label: string,
): Promise<Result<number>> {
  const r = await resolveForCascade(root, propertyId, label)
  if (!r.ok) return r
  const { files, plan } = await valueEditPlan(root, r.value.def, new Map([[r.value.key, null]]))
  return ok(await sweepCount(root, files, plan))
}

export function removeOption(
  root: string,
  propertyId: string,
  label: string,
): Promise<Result<SchemaCascade>> {
  return serializeSchemaOp(root, async () => {
    const r = await resolveForCascade(root, propertyId, label)
    if (!r.ok) return r
    const { def, key } = r.value
    const record: SchemaJournal = { op: 'option-remove', id: propertyId, key }
    if (!(await writeSchemaJournal(root, record))) return OWED
    const reach = await optionCascade(root, def, new Map([[key, null]]), [label, null])
    if (!reach.skipped) {
      const dropped = await dropOptionFromDef(root, propertyId, key)
      if (!dropped.ok) return dropped
      await clearSchemaJournal(root, record)
    }
    return ok(schemaCascade(reach, record))
  })
}
