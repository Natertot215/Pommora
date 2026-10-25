import { mutateRegistry, readRegistry, NO_PROPERTY, serializeSchemaOp } from './propertiesRegistry'
import { validateOptionValues } from './validation'
import { readPageRelations } from '../Index/contentIndex'
import { findHolders } from '../Index/keyHolders'
import {
  type Rewrite,
  sweepCount,
  sweepGovernedRoots,
  type SweepPlan,
} from '../Nexus/governedSweep'
import { editStashes } from './propertyStash'
import { editHeldList, editList, memberKey, type ValueEdit } from '../Files/rootValues'
import { fault, ok, fail, type Result } from '../Contract/result'
import { claimsWord, optionList } from './propertyValue'
import { formatKey, type KeyFormat } from './keyFormat'
import { exactTitle, normalizeTitle } from '../Paths/caseFold'
import { addOption, applyOptionEdit, mapOptions, type OptionEdit } from './optionModel'
import { mintOptionId } from '../Nexus/ids'
import {
  optionGroupsOf,
  optionsOf,
  PROPERTY_TYPES,
  type PropertyDefinition,
  SELECT_GROUP,
  type SelectOption,
  type StatusGroup,
  withOptionGroups,
} from './properties'
import {
  type Entry,
  type Owed,
  OWED,
  owedDelete,
  owedName,
  owedRename,
  owedSwept,
  type PropertyEntry,
  propertyNote,
  readNotes,
  runNoted,
  withOption,
} from '../Nexus/owed'
import { type ConfigReach, NO_REACH, reachConfig, sweptReach } from '../Nexus/configReach'
import { done, type MutateReply } from '../Nexus/mutateRequest'
import { heldTreeOf, liveTreeOf } from '../Nexus/liveTree'
import { readPageRecord } from '../Nexus/readNexus'
import { containerAt, holderSchema, pagePathsIn, spaceAt } from '../Nexus/treePatch'
import type { Json } from '../Files/stableJson'
import { isMarkdownFile, join } from '../Paths/posix'
import { findOption, NO_OPTION } from './propertyValue'

const NO_GROUP = fail('not-found', 'That group no longer exists.')
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

// The decoded definition already holds its options identified and unique, so an edit reads them from it.
const editOptions = (
  def: PropertyDefinition,
  edit: (groups: StatusGroup[]) => StatusGroup[],
): PropertyDefinition => withOptionGroups(def, edit(optionGroupsOf(def)))

function admitOptionEdit(def: PropertyDefinition, e: OptionEdit): Result<null> {
  if ('optionId' in e && !findOption(def, e.optionId)) return NO_OPTION
  if ('groupId' in e && !optionGroupsOf(def).some((g) => g.id === e.groupId)) return NO_GROUP
  if (e.op === 'relabelGroup' && PROPERTY_TYPES[def.type].options !== 'status') return NO_GROUP
  if (e.op === 'relabelGroup' && !e.label.trim())
    return fail('invalid-property', 'Group labels can’t be blank.')
  return ok(null)
}

const keysOf = (def: PropertyDefinition): unknown[] => optionsOf(def).map((o) => memberKey(o.key))

export function editOption(root: string, propertyId: string, e: OptionEdit): Promise<Result<null>> {
  return serializeSchemaOp(root, async () => {
    const notes = await readNotes(root)
    return mutateRegistry(root, (registry) => {
      const found = optionDef(registry.defs[propertyId])
      if (!found.ok) return { result: found }
      const def = found.value
      const admitted = admitOptionEdit(def, e)
      if (!admitted.ok) return { result: admitted }
      const next = editOptions(def, (groups) => applyOptionEdit(groups, e, def.value_format))
      const check = validateOptionValues(optionsOf(next))
      if (!check.ok) return { result: check }
      const held = new Set(keysOf(def))
      const lands = (o: SelectOption): boolean =>
        !held.has(memberKey(o.key)) &&
        owedName(notes, { owner: { kind: 'option', propertyId }, name: o.key, except: o.id })
      if (optionsOf(next).some(lands)) return { result: OWED }
      return {
        next: { ...registry, defs: { ...registry.defs, [propertyId]: next } },
        result: ok(null),
      }
    })
  })
}

/** The words a Multi-Select's `raw` holds that its Value Format could have written and no option claims, each once by fold. */
export function unregisteredMembers(def: PropertyDefinition, raw: unknown): string[] {
  const writable = optionList(raw).filter(
    (w) => formatKey(exactTitle(w), def.value_format) === exactTitle(w),
  )
  const seen = new Set<string>()
  return writable.filter((w) => {
    const fold = normalizeTitle(w)
    if (seen.has(fold)) return false
    seen.add(fold)
    return !claimsWord(def, w)
  })
}

/** Registers each Multi-Select member the files at `rels` hold beyond their definition — a page, a container's pages, or a Space — or every file's when `rels` is omitted, in one write. It reads under the schema lock, so a cascade is read whole: an open's pages from the index its seed just filled, and a settle's from the files it was handed, which a rescope's reseed has yet to index. */
export async function registerHeldOptions(root: string, rels?: readonly string[]): Promise<void> {
  const r = await serializeSchemaOp(root, async (): Promise<Result<null>> => {
    const tree = heldTreeOf(root)
    if (!tree) return ok(null)
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
      const defs = holderSchema(tree, space ?? rel).filter(
        (d) => PROPERTY_TYPES[d.type].registersMembers,
      )
      if (!defs.length) continue
      const files = pages ?? pagePathsIn(containerAt(tree, rel))
      const indexed = rels || space ? null : readPageRelations(files)
      if (space) collect(space.values ?? {}, defs)
      else if (indexed) for (const { values } of Object.values(indexed.pages)) collect(values, defs)
      else
        for (const page of files) {
          const read = await readPageRecord(join(root, page), page).catch(() => null)
          if (read?.kind === 'read') collect(read.fm, defs)
        }
    }
    if (!held.size) return ok(null)
    const notes = await readNotes(root)
    return mutateRegistry(root, (registry) => {
      let defs = registry.defs
      for (const [id, members] of held) {
        const def = defs[id]
        if (!def) continue
        // A word an option still owes sits in files its sweep missed; registering it would hand that work to a new option.
        const fresh = unregisteredMembers(def, members).filter(
          (v) => !owedName(notes, { owner: { kind: 'option', propertyId: id }, name: String(v) }),
        )
        if (!fresh.length) continue
        const next = editOptions(def, (groups) =>
          fresh.reduce(
            (g, v) => addOption(g, SELECT_GROUP, { id: mintOptionId(), key: v, label: v }),
            groups,
          ),
        )
        defs = { ...defs, [id]: next }
      }
      return defs === registry.defs
        ? { result: ok(null) }
        : { next: { ...registry, defs }, result: ok(null) }
    })
  }).catch(fault)
  if (!r.ok) console.error('held options: could not be registered:', r.error.message)
}

export function dropOptionFromDef(
  root: string,
  propertyId: string,
  optionId: string,
): Promise<Result<null>> {
  return mutateRegistry(root, (registry) => {
    const current = registry.defs[propertyId]
    if (!current) return { result: NO_PROPERTY }
    const next = editOptions(current, (groups) =>
      groups.map((g) => ({ ...g, options: g.options.filter((o) => o.id !== optionId) })),
    )
    return {
      next: { ...registry, defs: { ...registry.defs, [propertyId]: next } },
      result: ok(null),
    }
  })
}

async function resolveOption(
  root: string,
  propertyId: string,
  optionId: string,
): Promise<Result<{ def: PropertyDefinition; option: SelectOption }>> {
  const found = optionDef((await readRegistry(root)).defs[propertyId])
  if (!found.ok) return found
  const option = findOption(found.value, optionId)
  return option ? ok({ def: found.value, option }) : NO_OPTION
}

export const valueEditRewrite =
  (def: Pick<PropertyDefinition, 'key'>, edit: ValueEdit): Rewrite =>
  (raw) =>
    editHeldList(raw, def.key, (held) => editList(held, edit))

async function valueEditPlan(
  root: string,
  def: PropertyDefinition,
  keys: ValueEdit,
): Promise<{ files: string[]; plan: SweepPlan }> {
  const { files } = await findHolders(root, { keys: [def.key], reach: 'governed' })
  return { files, plan: { raw: valueEditRewrite(def, keys) } }
}

async function stashSweep(root: string, def: PropertyDefinition, keys: ValueEdit): Promise<number> {
  const { collections } = await liveTreeOf(root)
  return editStashes(root, collections, new Set([def.id]), (values) =>
    Object.keys(values).reduce<Json | null>(
      (next, id) => editHeldList(next ?? values, id, (held) => editList(held, keys)) ?? next,
      null,
    ),
  )
}

/** Rewrites the files and stashes holding `keys`' old keys. A delete names its option, and every saved view, tile, and filter drops the option's id. */
export async function optionCascade(
  root: string,
  def: PropertyDefinition,
  keys: ValueEdit,
  removed?: string,
): Promise<ConfigReach> {
  let swept = NO_REACH
  if (keys.size) {
    const { files, plan } = await valueEditPlan(root, def, keys)
    swept = sweptReach(await sweepGovernedRoots(files, plan))
    swept.skipped += await stashSweep(root, def, keys)
  }
  const reach =
    removed === undefined
      ? NO_REACH
      : await reachConfig(root, { kind: 'gone', propertyId: def.id, ids: [removed] })
  return { ...swept, skipped: swept.skipped + reach.skipped, hosts: reach.hosts }
}

type Rekey = { optionId: string; label: string } | { value_format: KeyFormat }
type WordMove = { optionId: string; from: string; to: string }

async function rekeyOptions(
  root: string,
  propertyId: string,
  moved: readonly WordMove[],
  change: Rekey,
): Promise<MutateReply> {
  const keys = new Map(moved.map((m) => [m.from, m.to]))
  const relabel = (o: SelectOption): string =>
    'optionId' in change && o.id === change.optionId ? change.label : o.label
  const commit = () =>
    mutateRegistry(root, (registry) => {
      const found = optionDef(registry.defs[propertyId])
      if (!found.ok) return { result: found }
      const def = found.value
      if ('optionId' in change && !findOption(def, change.optionId)) return { result: NO_OPTION }
      const current = 'value_format' in change ? { ...def, value_format: change.value_format } : def
      const next = editOptions(current, (groups) =>
        mapOptions(groups, (o) => ({ ...o, key: keys.get(o.key) ?? o.key, label: relabel(o) })),
      )
      const check = validateOptionValues(optionsOf(next))
      if (!check.ok) return { result: check }
      return {
        next: { ...registry, defs: { ...registry.defs, [propertyId]: next } },
        result: ok(def),
      }
    })
  // A relabel that moves no word notes nothing and sweeps nothing.
  if (!moved.length) return done(await commit())
  const parts = (e: Entry | undefined, edit: (o: Owed, m: WordMove) => Owed): PropertyEntry =>
    moved.reduce((n, m) => withOption(n, m.optionId, (o) => edit(o, m)), propertyNote(e))
  return runNoted(root, propertyId, {
    lands: moved.flatMap((m) => [
      { owner: { kind: 'option' as const, propertyId }, name: m.to, except: m.optionId },
      // A word its own Clear still owes refuses the rename, so the finish clears those pages before the word moves.
      { owner: { kind: 'option' as const, propertyId }, name: m.from },
    ]),
    note: (e) => parts(e, (o, m) => owedRename(o, m.from, m.to)),
    list: commit,
    sweep: (def) => optionCascade(root, def, keys),
    settle: (e) => parts(e, (o, m) => owedSwept(o, [m.from])),
    under: propertyId,
  })
}

export function renameOption(
  root: string,
  propertyId: string,
  optionId: string,
  label: string,
): Promise<MutateReply> {
  return serializeSchemaOp(root, async () => {
    const r = await resolveOption(root, propertyId, optionId)
    if (!r.ok) return r
    const { def, option } = r.value
    const to = formatKey(label, def.value_format)
    const moved = option.key === to ? [] : [{ optionId, from: option.key, to }]
    return rekeyOptions(root, propertyId, moved, { optionId, label })
  })
}

async function valueFormatPlan(
  root: string,
  propertyId: string,
  format: KeyFormat,
): Promise<Result<{ def: PropertyDefinition; moved: WordMove[] }>> {
  const found = optionDef((await readRegistry(root)).defs[propertyId])
  if (!found.ok) return found
  const def = found.value
  const rekeyed = optionsOf(def).map((o) => ({ ...o, was: o.key, key: formatKey(o.label, format) }))
  const check = validateOptionValues(
    rekeyed,
    'This format would give two options the same key, please rename one first.',
  )
  if (!check.ok) return check
  const moved = rekeyed.flatMap(({ id, was, key }): WordMove[] =>
    key === was ? [] : [{ optionId: id, from: was, to: key }],
  )
  const olds = new Set(moved.map(({ from }) => memberKey(from)))
  if (moved.some(({ from, to }) => memberKey(to) !== memberKey(from) && olds.has(memberKey(to))))
    return CROSSED
  return ok({ def, moved })
}

export function setValueFormat(
  root: string,
  propertyId: string,
  format: KeyFormat,
): Promise<MutateReply> {
  return serializeSchemaOp(root, async () => {
    const planned = await valueFormatPlan(root, propertyId, format)
    if (!planned.ok) return planned
    return rekeyOptions(root, propertyId, planned.value.moved, { value_format: format })
  })
}

export async function valueFormatHolders(
  root: string,
  propertyId: string,
  format: KeyFormat,
): Promise<Result<number>> {
  const planned = await valueFormatPlan(root, propertyId, format)
  if (!planned.ok) return planned
  const { def, moved } = planned.value
  if (!moved.length) return ok(0)
  const { files, plan } = await valueEditPlan(root, def, new Map(moved.map((m) => [m.from, m.to])))
  return ok(await sweepCount(root, files, plan))
}

export function clearOption(
  root: string,
  propertyId: string,
  optionId: string,
): Promise<MutateReply> {
  return serializeSchemaOp(root, async () => {
    const r = await resolveOption(root, propertyId, optionId)
    return r.ok ? stripOption(root, r.value, true) : r
  })
}

/** What stripping an option, or with `label` renaming it, would rewrite; a rename that keeps the word counts none. */
export async function optionHolders(
  root: string,
  propertyId: string,
  optionId: string,
  label?: string,
): Promise<Result<number>> {
  const r = await resolveOption(root, propertyId, optionId)
  if (!r.ok) return r
  const { def, option } = r.value
  const to = label === undefined ? null : formatKey(label, def.value_format)
  if (to === option.key) return ok(0)
  const { files, plan } = await valueEditPlan(root, def, new Map([[option.key, to]]))
  return ok(await sweepCount(root, files, plan))
}

export function deleteOption(
  root: string,
  propertyId: string,
  optionId: string,
): Promise<MutateReply> {
  return serializeSchemaOp(root, async () => {
    const r = await resolveOption(root, propertyId, optionId)
    if (!r.ok) return r
    return stripOption(root, r.value, false)
  })
}

/** An option's delete or Clear on the runner: its word and every old name it still owes leave the pages holding them. A delete drops the option as its list step; a Clear's option stays listed, so its part is marked kept and no finish drops the option. */
function stripOption(
  root: string,
  { def, option }: { def: PropertyDefinition; option: SelectOption },
  kept: boolean,
): Promise<MutateReply> {
  const part = (e: Entry | undefined): Owed => ({
    ...owedDelete(propertyNote(e).options?.[option.id] ?? {}, option.key),
    ...(kept ? { kept: true as const } : {}),
  })
  return runNoted(root, def.id, {
    note: (e) => withOption(propertyNote(e), option.id, () => part(e)),
    list: () => (kept ? Promise.resolve(ok(null)) : dropOptionFromDef(root, def.id, option.id)),
    sweep: (_, prior) =>
      optionCascade(
        root,
        def,
        new Map((part(prior).strip ?? []).map((w) => [w, null])),
        kept ? undefined : option.id,
      ),
    settle: (e) => withOption(propertyNote(e), option.id, () => ({})),
    under: def.id,
  })
}
