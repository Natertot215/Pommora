// Option-level CRUD for Select / Multi-Select properties. setOptions is registry-only (add / recolor
// / reorder) and rides the mutateRegistry chain; the page-touching ops (rename / remove / clear) ride
// the serializeSchemaOp chain, cascading each edit across every assigning collection's pages. Errors
// flow as Result, never thrown.

import { mutateRegistry, readRegistry } from '../IO/propertiesRegistry'
import { rewritePageSerialized } from '../IO/atomicWrite'
import { indexWrittenPage } from '../indexSeed'
import { noteValueWrite } from '../valuesChanged'
import { validateOptionValues } from '../Properties/schema'
import { collectionFolders } from './assignment'
import { keyHolderFiles } from './keyHolders'
import { serializeSchemaOp } from './schemaChain'
import { sweepAdmits } from './util'
import { replacePageValue, stripPageValue } from './pageValue'
import { ok, fail, type Result } from '@shared/result'
import type { Adoption } from '@shared/propertyValue'
import {
  renameOption as renameInArray,
  renameStatusOption as renameStatusInArray,
  type Option,
} from '@shared/optionModel'
import {
  hasSelectOptions,
  type PropertyDefinition,
  type PropertyType,
  type StatusGroup,
} from '@shared/properties'
import { clearSchemaJournal, writeSchemaJournal, type SchemaJournal } from './propertyJournal'

/** These ops edit `select_options`, so they apply to Select / Multi-Select only — rejected up front
 *  rather than left to the write. */
function requireOptionType(type: PropertyType): Result<null> {
  return hasSelectOptions(type)
    ? ok(null)
    : fail('invalid-property', 'Options can only be edited on Select or Multi-Select properties.')
}

/** Replace a Select / Multi-Select property's options wholesale. Validates unique titles and writes
 *  the array verbatim — an emptied array stays empty (no re-seed; the >=1 floor is gone), matching
 *  createProperty and editProperty, which seed only a field that is absent. Rides serializeSchemaOp (like
 *  the page-touching ops) so it can't land inside a concurrent renameOption's cascade and desync the
 *  registry from pages; the actual registry write still goes through mutateRegistry inside. */
export function setOptions(
  root: string,
  propertyId: string,
  options: Option[],
): Promise<Result<null>> {
  return serializeSchemaOp(() =>
    mutateRegistry<Result<null>>(root, (registry) => {
      const current = registry.defs[propertyId]
      if (!current) return { result: fail('not-found', 'Property not found.') }
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

/** Replace a Status property's `status_groups` wholesale — the registry-only path behind add / recolor
 *  / reorder (the Status analog of setOptions). Validates unique option values PROPERTY-WIDE (a page's
 *  the value is referenced across all groups), then writes verbatim. Rides serializeSchemaOp so
 *  it can't interleave with a concurrent page cascade. */
export function setStatusGroups(
  root: string,
  propertyId: string,
  groups: StatusGroup[],
): Promise<Result<null>> {
  return serializeSchemaOp(() =>
    mutateRegistry<Result<null>>(root, (registry) => {
      const current = registry.defs[propertyId]
      if (!current) return { result: fail('not-found', 'Property not found.') }
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

// mutateRegistry alone: the repair calling this holds a page lock the schema chain's cascades take.
export function addOptionToDef(
  root: string,
  propertyId: string,
  value: string,
): Promise<Result<null>> {
  return mutateRegistry<Result<null>>(root, (registry) => {
    const current = registry.defs[propertyId]
    if (!current) return { result: fail('not-found', 'Property not found.') }
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

/** Drop one option value from a def's registry entry, whichever shape holds it — the remove
 *  ops' registry finish, shared with the crash replay so both run the identical edit. A value
 *  already gone is a completed finish, not a failure. */
export function dropOptionFromDef(
  root: string,
  propertyId: string,
  value: string,
): Promise<Result<null>> {
  return mutateRegistry<Result<null>>(root, (registry) => {
    const current = registry.defs[propertyId]
    if (!current) return { result: fail('not-found', 'Property not found.') }
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

/** The gate that admits a def to an op — the one place Select and Status diverge outside a
 *  rename's def edit. */
type RequireType = (type: PropertyType) => Result<null>

/** The opening move every page-touching option op makes: resolve the property, refuse a type the
 *  op doesn't apply to, and hand back the frontmatter key its values live under. */
async function resolveForCascade(
  root: string,
  propertyId: string,
  requireType: RequireType,
): Promise<Result<string>> {
  const def = (await readRegistry(root)).defs[propertyId]
  if (!def) return fail('not-found', 'Property not found.')
  const typeCheck = requireType(def.type)
  if (!typeCheck.ok) return typeCheck
  return ok(def.name)
}

/** Strip `value` from every page holding `key` — the shared tail of clear and remove on both
 *  Select and Status, which differ only in the type check that resolved the key. */
function stripCascade(root: string, key: string, value: string): Promise<number> {
  return cascadePages(root, key, (content) => stripPageValue(content, key, value))
}

/** Stage an option rename's record, def-gated so an op the registry will refuse outright journals
 *  nothing. BEFORE the commit (registry-first order): a crash between commit and cascade is
 *  recoverable only from this record, and one stranded by a refusal or throw is disposed of by the
 *  replay's holds-to-and-not-from gate. Returned staged or not — clearing a record the slot never
 *  held is already a no-op, so the caller's settle reads the same either way. */
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

/** These ops edit a Status property's `status_groups`; reject anything else up front. */
function requireStatusType(type: PropertyType): Result<null> {
  return type === 'status'
    ? ok(null)
    : fail('invalid-property', 'Status options can only be edited on a Status property.')
}

/** What a rename does to the def it edits, per option shape: the edited def plus the option
 *  list uniqueness validates over. */
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

/** Rename an option value and cascade the new value onto every page that held the old one. The
 *  registry edit rides mutateRegistry and validates unique values — a collision fails before any
 *  page is touched; the page cascade rides serializeSchemaOp. */
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
        if (!def) return { result: fail('not-found', 'Property not found.') }
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
      const skipped = await cascadePages(root, key, (content) =>
        replacePageValue(content, key, oldValue, newTitle),
      )
      if (!skipped) await clearSchemaJournal(root, record)
      return ok(null)
    })
}

/** Clear an option's value from every page, keeping the option in the def. Page-only fan-out on
 *  the serializeSchemaOp chain; the registry is untouched — which is why it is also unjournaled:
 *  its crash residue disagrees with nothing (every remaining value is still a legal option), the
 *  same razor that keeps removeProperty outside the journal. */
function clearOp(requireType: RequireType) {
  return (root: string, propertyId: string, value: string): Promise<Result<null>> =>
    serializeSchemaOp(async () => {
      const r = await resolveForCascade(root, propertyId, requireType)
      if (!r.ok) return r
      await stripCascade(root, r.value, value)
      return ok(null)
    })
}

/** Remove an option: strip its value from every page, then drop it from the def. Pages first (as
 *  deleteProperty does) so a def-edit failure never leaves the option gone with its values
 *  orphaned. A strip that could not read every holder defers the registry drop with it — the
 *  record stays, and the next open's replay re-runs both once the pages read. */
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

/** Rewrite the pages holding `key` through `rewrite` (null = the page doesn't hold it, skip) —
 *  the key's queried holders when an index answers, else the corpus, both intersected with the
 *  Collection folders whose schemas govern values. Each page's read-modify-write runs under its
 *  file lock — the SAME lock the cell-write path takes — so a cascade and a concurrent cell
 *  edit on one page can't clobber each other. Per file, not all-or-nothing across pages: a
 *  partly-applied rename/strip is recoverable by re-running and each page stays individually
 *  valid. Shared by rename (replace) and remove/clear (strip). Returns how many holders it
 *  could not read — the rewrite callback only runs on a read that landed, so its silence is
 *  the skip signal; a journaled caller holds its record while any remain. */
export async function cascadePages(
  root: string,
  key: string,
  rewrite: (content: string) => string | null,
): Promise<number> {
  const folders = await collectionFolders(root)
  let unreadable = 0
  for (const file of await keyHolderFiles(root, key, folders)) {
    let read = false
    const wrote = await rewritePageSerialized(file, (content) => {
      read = true
      return sweepAdmits(content) ? rewrite(content) : null
    })
    if (!read) unreadable++
    if (wrote) {
      noteValueWrite(root, file)
      await indexWrittenPage(root, file)
    }
  }
  return unreadable
}

export const renameOption = renameOp(requireOptionType, editSelectOptions)
export const clearOption = clearOp(requireOptionType)
export const removeOption = removeOp(requireOptionType)

export const renameStatusOption = renameOp(requireStatusType, editStatusGroups)
export const clearStatusOption = clearOp(requireStatusType)
export const removeStatusOption = removeOp(requireStatusType)
