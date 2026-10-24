// The notes file: one entry per item that still owes work, a property, Context, or Space keyed by its id, each holding the old names files may still carry. A change writes its entry before anything else and refuses when it can't; the entry clears once nothing is owed.

import { fail, ok, type Result } from '../Contract/result'
import { neverParsed, readAppFile, updateNexusFile } from '../Files/atomicWrite'
import { memberKey } from '../Files/rootValues'
import { same } from '../Files/stableJson'
import { normalizeTitle } from '../Paths/caseFold'
import { OWED_REL } from '../Paths/nexusPaths'
import { join } from '../Paths/posix'
import type { CascadeReport } from './cascade'
import { type ConfigReach, reachReport } from './configReach'

/** Each name in `rename` becomes the current name wherever a file still holds it; each in `strip` leaves. `kept` marks an option part a Clear wrote: the option stays listed, so its own word in `strip` leaves the pages without the option leaving. */
export type Owed = { rename?: string[]; strip?: string[]; kept?: true }
export type PropertyEntry = Owed & {
  kind: 'property'
  options?: Record<string, Owed>
  collections?: string[]
}
export type ContextEntry = Owed & { kind: 'context'; bundle?: string }
export type SpaceEntry = Owed & { kind: 'space'; contextId: string; bundle?: string }
export type Entry = PropertyEntry | ContextEntry | SpaceEntry
export type Notes = Record<string, Entry>

/** Where a name lives: a property's keys, a Context's titles, a Space's titles inside its Context, or one property's option words. */
export type Owner =
  | { kind: 'property' }
  | { kind: 'context' }
  | { kind: 'space'; contextId: string }
  | { kind: 'option'; propertyId: string }
/** A name a create or rename lands on, and the item landing there, whose own owed names never refuse it. */
export type Landing = { owner: Owner; name: string; except?: string }

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
  (e.kind === 'property' && (!!e.collections?.length || Object.values(e.options ?? {}).some(owes)))

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

/** A kept part's own word stays in `strip` alone, so a rename never carries a Clear's pages to the new word. */
export const owedRename = (o: Owed, from: string, to: string): Owed => ({
  ...o,
  rename: distinct(
    [...(o.rename ?? []), from].filter((n) => n !== to && !(o.kept && o.strip?.includes(n))),
  ),
})
/** Every owed name and the current one move into `strip`, for a delete and a Clear alike (H-2, H-3). */
export const owedDelete = (o: Owed, current: string): Owed => ({
  rename: undefined,
  strip: distinct(o.strip, o.rename, [current]),
})
/** `o` once a sweep that missed nothing has reached `swept`. */
export const owedSwept = (o: Owed, swept: readonly string[]): Owed => ({
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
    (e) => e && { ...e, rename: distinct(e.rename, e.strip), strip: undefined },
  )
}

/** A many-file change's report, marked owed while an entry still owes work, which Try Again finishes; a pass's total is owed while it missed a file. */
export const owedReport = (reach: ConfigReach, owed = reach.skipped > 0): CascadeReport => {
  const report = reachReport(reach)
  return owed ? { ...report, warning: report.warning ?? OWED_LINE, owed: true } : report
}

/** `report` with the lost-work line joined, once, after a write set a damaged notes file aside. */
export const withLost = (root: string, report: CascadeReport): CascadeReport =>
  lost.delete(root)
    ? { ...report, warning: [report.warning, LOST_LINE].filter(Boolean).join(' ') }
    : report

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
  if (settle && !reach.skipped && !owesRename(held))
    await editNote(root, id, (e) => e && settle(e, listed.value))
  return ok({ cascade: withLost(root, owedReport(reach, id in (await readNotes(root)))) })
}
