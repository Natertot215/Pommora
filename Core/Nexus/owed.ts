// The notes file: one entry per item that still owes work, a property, Context, or Space keyed by its id, each holding the old names files may still carry. A change writes its entry before anything else and refuses when it can't; the entry clears once nothing is owed.

import { fail, ok, type Result } from '../Contract/result'
import { neverParsed, readAppFile, updateNexusFile } from '../Files/atomicWrite'
import { memberKey } from '../Files/rootValues'
import { type Json, same } from '../Files/stableJson'
import { normalizeTitle } from '../Paths/caseFold'
import { OWED_REL } from '../Paths/nexusPaths'
import { join } from '../Paths/posix'
import type { CascadeReport } from './cascade'
import { type ConfigEdit, type ConfigReach, reachReport, retries } from './configReach'
import { pageKey } from '../Connections/pageIndex'

/** Each name in `rename` becomes the current name wherever a file still holds it; each in `strip` leaves. `kept` marks an option part a Clear wrote: the option stays listed, so its own word in `strip` leaves the pages without the option leaving. */
export type Owed = { rename?: string[]; strip?: string[]; kept?: true }
export type PropertyEntry = Owed & {
  kind: 'property'
  options?: Record<string, Owed>
  collections?: string[]
}
export type ContextEntry = Owed & { kind: 'context'; bundle?: string }
export type SpaceEntry = Owed & { kind: 'space'; contextId: string; bundle?: string }
/** A page, Collection, or Set delete, a Trash emptying, or a Set move: `strip` holds the gone pages' paths, whose links leave the files outside `at`, and `edit` the views it still owes, reached under `within`; the links a finish strips go into `bundle`'s record, or are parked where `park` says the Trash entry is gone. */
export type ContainerEntry = Owed & {
  kind: 'container'
  at: string
  edit?: ConfigEdit
  within?: string
  bundle?: string
  park?: true
}
/** By file, each value a restore worked out and couldn't write: what the file read then and what it lands as, either absent where there was or will be none. */
export type Worked = Record<string, Record<string, { from?: unknown; to?: unknown }>>
/** Each value `to` holds other than `from`, as a note keeps it. */
export const workedOut = (from: Json, to: Json): Worked[string] =>
  Object.fromEntries(
    [...new Set([...Object.keys(from), ...Object.keys(to)])].flatMap((k) =>
      same(from[k], to[k]) ? [] : [[k, { from: from[k], to: to[k] }]],
    ),
  )
/** A move's or a restore's re-spell, each old link key mapped to how it spells its page now; `files` scopes a restore's repair of its own landed files to them alone, `rekey` re-keys a Context restored under a new title in its own Spaces' sidecars among them, and `values` holds, by file, what the restore worked out and couldn't write. */
export type RelinkEntry = Owed & {
  kind: 'relink'
  names: Record<string, string>
  label: string
  files?: string[]
  rekey?: [from: string, to: string]
  values?: Worked
}
export type Entry = PropertyEntry | ContextEntry | SpaceEntry | ContainerEntry | RelinkEntry
export type Notes = Record<string, Entry>

/** Where a name lives: a property's keys, a Context's titles, a Space's titles inside its Context, or one property's option words. */
type Owner =
  | { kind: 'property' }
  | { kind: 'context' }
  | { kind: 'space'; contextId: string }
  | { kind: 'option'; propertyId: string }
/** A name a create or rename lands on, and the item landing there, whose own owed names never refuse it. */
type Landing = { owner: Owner; name: string; except?: string }

const OWED_LINE = 'An earlier change hasn’t reached every file yet.'
export const OWED = fail('owed', OWED_LINE)
const LOST_LINE = 'Unfinished work from an earlier session couldn’t be read and was lost.'

/** Roots whose damaged notes file a write set aside, its work lost; the next report says so once. */
const lost = new Set<string>()

const notesFile = (root: string): string => join(root, OWED_REL)

// Only this module writes the file and it never syncs, so it reads as written; a corrupt one is set aside by `updateNexusFile`.
export const readNotes = async (root: string): Promise<Notes> =>
  ((await readAppFile(notesFile(root))) as Notes | null) ?? {}

/** Every name in `parts` once, or nothing when there are none, as an entry stores a part. */
export const distinct = (...parts: (readonly string[] | undefined)[]): string[] | undefined => {
  const all = parts.flatMap((p) => p ?? [])
  return all.length ? [...new Set(all)] : undefined
}

const owes = (o: Owed | undefined): boolean => !!(o?.rename?.length || o?.strip?.length)

const owesAnything = (e: Entry): boolean =>
  owes(e) ||
  (e.kind === 'property' &&
    (!!e.collections?.length || Object.values(e.options ?? {}).some(owes))) ||
  (e.kind === 'container' && !!e.edit) ||
  (e.kind === 'relink' && (Object.keys(e.names).length > 0 || !!e.rekey || !!e.values))

/** `e`'s re-spell with `names` laid over it: an old key that spelled a page `names` moves follows it to where `names` leaves it, and a restore's repair, scoped by `files`, follows without taking `names`' keys, so its landed files keep their own targets; its files, and what it worked out for them, follow to where `paths` moves them. */
export const relinkNote = (
  e: Entry | undefined,
  names: ReadonlyMap<string, string>,
  label?: string,
  paths?: ReadonlyMap<string, string>,
): RelinkEntry => {
  const held = e?.kind === 'relink' ? e : undefined
  const followed = Object.entries(held?.names ?? {}).map(([k, v]) => [
    k,
    names.get(pageKey(v)) ?? v,
  ])
  const at = (f: string): string => paths?.get(f) ?? f
  const worked =
    held?.values && Object.fromEntries(Object.entries(held.values).map(([f, v]) => [at(f), v]))
  return {
    kind: 'relink',
    label: label ?? held?.label ?? '',
    names: { ...Object.fromEntries(followed), ...(held?.files ? {} : Object.fromEntries(names)) },
    ...(held?.files ? { files: held.files.map(at), rekey: held.rekey, values: worked } : {}),
  }
}

/** Whether `e` still owes a rename. Pages under its old name weren't candidates for any sweep since, so an option part, a Remove's Collection, or a Space under it settles only once the rename lands (H-1). */
export const owesRename = (e: Entry | undefined): boolean => !!e?.rename?.length

/** Edits `id`'s entry under the file's own lock, dropping one that owes nothing and the file once no entry is left; answers the entry as it stood, or the refusal naming the file. */
export async function editNote(
  root: string,
  id: string,
  edit: (e: Entry | undefined) => Entry | undefined,
): Promise<Result<Entry | undefined>> {
  let prior: Entry | undefined
  const damaged = await neverParsed(notesFile(root))
  const written = await updateNexusFile(
    notesFile(root),
    (cur) => {
      const { [id]: held, ...rest } = cur as Notes
      prior = held
      const next = edit(held)
      if (same(next ?? null, held ?? null)) return null
      return next && owesAnything(next) ? { ...rest, [id]: next } : rest
    },
    true,
    true,
  )
  if (written.ok && damaged) lost.add(root)
  return written.ok ? ok(prior) : written
}

export const propertyNote = (e: Entry | undefined): PropertyEntry =>
  e?.kind === 'property' ? e : { kind: 'property' }

export const owedRename = <O extends Owed>(o: O, from: string, to: string): O => ({
  ...o,
  rename: distinct([...(o.rename ?? []), from].filter((n) => n !== to)),
})
/** Every owed name and the current one move into `strip`, for a delete and a Clear alike (H-2, H-3). */
export const owedDelete = (o: Owed, current: string): Owed => ({
  rename: undefined,
  strip: distinct(o.strip, o.rename, [current]),
})
/** `o` once a sweep that missed nothing has reached `swept`. */
export const owedSwept = <O extends Owed>(o: O, swept: readonly string[]): O => ({
  ...o,
  rename: distinct(o.rename?.filter((n) => !swept.includes(n))),
  strip: distinct(o.strip?.filter((n) => !swept.includes(n))),
})

export function withOption(
  e: PropertyEntry,
  optionId: string,
  edit: (o: Owed) => Owed,
): PropertyEntry {
  const { [optionId]: part, ...rest } = e.options ?? {}
  const next = edit(part ?? {})
  const options = owes(next) ? { ...rest, [optionId]: next } : rest
  return { ...e, options: Object.keys(options).length ? options : undefined }
}

/** Whether an item other than `except` still owes `name` within its owner, so no create or rename may land on it: the work still due would land there too. Option words compare as written; every other name folds case. */
export function owedName(notes: Notes, { owner, name, except }: Landing): boolean {
  const fold = owner.kind === 'option' ? memberKey : normalizeTitle
  const scope: [string, Owed][] =
    owner.kind === 'option'
      ? Object.entries(propertyNote(notes[owner.propertyId]).options ?? {})
      : Object.entries(notes).filter(
          ([, e]) =>
            e.kind === owner.kind &&
            (e.kind !== 'space' || (owner.kind === 'space' && e.contextId === owner.contextId)),
        )
  return scope.some(
    ([id, o]) =>
      id !== except &&
      [...(o.rename ?? []), ...(o.strip ?? [])].some((n) => fold(n) === fold(name)),
  )
}

/** A restore turns what its delete never reached back into renames to the restored name, so those files keep their values (H-4); an item that owes no strip writes nothing. */
export async function restoreNote(root: string, id: string): Promise<Result<unknown>> {
  if (!(await readNotes(root))[id]?.strip) return ok(undefined)
  return editNote(
    root,
    id,
    (e) => e && { ...e, rename: distinct(e.rename, e.strip), strip: undefined, bundle: undefined },
  )
}

/** A many-file change's report, marked owed while an entry still owes work, which Try Again finishes; a pass's total is owed while it missed a file. The lost-work line joins it once, after a write set a damaged notes file aside. */
export function owedReport(root: string, reach: ConfigReach, owed = retries(reach) > 0) {
  const report = reachReport(reach)
  if (owed) {
    report.warning ??= OWED_LINE
    report.owed = true
  }
  if (lost.delete(root)) report.warning = [report.warning, LOST_LINE].filter(Boolean).join(' ')
  return report
}

/** What a restore worked out for the files it couldn't write joins the relink entry its landed path `at` keys, so Try Again lands it where a file still reads what the restore found. A note that can't be written owes nothing. */
export async function oweWorked(
  root: string,
  at: string,
  label: string,
  values: Worked,
): Promise<CascadeReport | undefined> {
  const reach = { skipped: Object.keys(values).length, hosts: [] }
  if (!reach.skipped) return undefined
  const noted = await editNote(root, at, (e) => {
    const held: RelinkEntry =
      e?.kind === 'relink' ? e : { kind: 'relink', names: {}, label, files: [] }
    return { ...held, values: { ...held.values, ...values } }
  })
  return noted.ok ? owedReport(root, reach) : reachReport(reach)
}

/** A many-file change on `id`, in its one order: refused while another item owes a name it lands on, then its note, its list step, and its sweep. A refused note or list step changes nothing, the entry put back as it stood; a sweep that missed nothing settles the entry, unless the entry `under` names still owes a rename (H-1), and a sweep that is the finish's own arm writes back its entry itself. The report is owed while the entry still stands, whatever left it owing. */
export async function runNoted<T>(
  root: string,
  id: string,
  change: {
    lands?: readonly Landing[]
    note: (e: Entry | undefined) => Entry
    list: () => Promise<Result<T>>
    sweep: (listed: T, prior: Entry | undefined) => Promise<ConfigReach>
    settle?: (e: Entry, listed: T) => Entry | undefined
    under?: string
  },
): Promise<Result<{ cascade: CascadeReport }>> {
  const notes = await readNotes(root)
  if (change.lands?.some((l) => owedName(notes, l))) return OWED
  const prior = await editNote(root, id, change.note)
  if (!prior.ok) return prior
  const listed = await change.list()
  if (!listed.ok) {
    await editNote(root, id, () => prior.value)
    return listed
  }
  const reach = await change.sweep(listed.value, prior.value)
  const { settle } = change
  const held = change.under === undefined ? undefined : notes[change.under]
  if (settle && !retries(reach) && !owesRename(held))
    await editNote(root, id, (e) => e && settle(e, listed.value))
  return ok({ cascade: owedReport(root, reach, id in (await readNotes(root))) })
}
