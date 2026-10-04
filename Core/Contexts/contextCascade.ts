import { basename, dirname, join } from '../Paths/posix'
import { normalizeTitle } from '../Paths/caseFold'
import { contextKey } from './contexts'
import { ID_KEY } from '../Nexus/identityMark'
import { asString } from '../Nexus/coerce'
import { ok, fail, type Result, fault } from '../Contract/result'
import { mutateRegistryFile, readRegistryStrict } from './contextsRegistry'
import { pathExists, readJsonStrict, relocate, targetTaken } from '../Files/atomicWrite'
import { renameFrontmatterKey } from '../Files/pageFile'
import type { Json } from '../Files/stableJson'
import { contextsDir } from '../Paths/paths'
import { SPACE_SIDECAR } from '../Paths/nexusPaths'
import { clearJournal, readJournal, writeJournal, type RenameJournal } from './contextJournal'
import {
  type Rewrite,
  type RewriteText,
  type SweepResult,
  sweepGovernedRoots,
  undoSweep,
  unsweptLine,
} from '../Properties/governedSweep'
import { withOrderEntry } from './spaceSidecar'
import { editHeldLists, heldKeys, rekeyHeld, stripKeys, type KeyCollision } from '../Files/heldKeys'
import { editList, namesValue, stripList } from '../Properties/pageValue'
import { contextWorldOf } from './contextResolve'
import { oweWalk } from '../Nexus/fileEvents'
import { liveTreeOf } from '../Nexus/liveTree'
import { isScalar, listOf } from '../Contract/validators'
import { queryMembers } from '../Index/contentIndex'
import { nexusCorpus } from '../Index/indexSeed'
import { nameError } from '../Paths/names'

/** A Context rename commits its registry LAST, so a tag written mid-cascade still lands under the OLD key while a key already wearing the new title can only be inert or hand-authored — neither list is fresher, so dropping either would silently lose tags. */
const NEITHER_KEY_IS_FRESHER: KeyCollision = 'merge'

export const rekeyContext = (oldTitle: string, newTitle: string): Rewrite =>
  withOrderEntry(
    (raw) =>
      rekeyHeld(raw, contextKey(oldTitle), contextKey(newTitle), NEITHER_KEY_IS_FRESHER, true),
    'contexts',
    oldTitle,
    newTitle,
  )

const retitleSpace = (raw: Json, contextTitle: string, j: RenameJournal): Json | null =>
  editHeldLists(raw, contextKey(contextTitle), (held) =>
    editList(held, j.oldTitle, { op: 'replace', to: j.newTitle }),
  )

export interface SweepCapture {
  id?: string
  kind: 'page' | 'space'
  values: string[]
}

export type UnlinkOutcome = SweepResult & { captured: SweepCapture[] }

interface Member {
  key: string
  spaceTitle?: string
}

// Without an index every page is a candidate; the rewrite itself decides what changes.
async function sweepMembers(
  root: string,
  member: Member,
  raw: Rewrite,
  pageText?: RewriteText,
): Promise<SweepResult> {
  const title = member.spaceTitle === undefined ? undefined : normalizeTitle(member.spaceTitle)
  const rels = queryMembers(member.key, title) ?? (await nexusCorpus(root))
  return sweepGovernedRoots(
    root,
    rels.map((rel) => join(root, rel)),
    pageText ? { text: pageText, sidecars: raw } : { raw, sidecars: raw },
  )
}

function captureRoot(raw: Json, file: string, values: string[]): SweepCapture {
  const isSpace = basename(file) === SPACE_SIDECAR
  const id = isSpace ? (typeof raw.id === 'string' ? raw.id : undefined) : asString(raw[ID_KEY])
  return { ...(id ? { id } : {}), kind: isSpace ? 'space' : 'page', values }
}

function pageLeg(j: RenameJournal): RewriteText | undefined {
  if (j.spaceId !== undefined) return undefined
  const oldKey = contextKey(j.oldTitle)
  const newKey = contextKey(j.newTitle)
  return (content) => renameFrontmatterKey(content, oldKey, newKey, NEITHER_KEY_IS_FRESHER, true)
}

export interface Unswept {
  skipped: number
  from: string
}

const unswept = (skipped: string[], from: string): Unswept | null =>
  skipped.length ? { skipped: skipped.length, from } : null

async function sweepAgain(
  root: string,
  contextTitle: string,
  j: RenameJournal,
): Promise<Result<Unswept | null>> {
  const again = await cascadeTitle(root, contextTitle, j)
  await settleJournal(root, j, again.skipped)
  return ok(unswept(again.skipped, j.oldTitle))
}

async function cascadeTitle(
  root: string,
  contextTitle: string,
  j: RenameJournal,
): Promise<SweepResult> {
  // A title that changes only its case moves no key or value: every file's spelling already resolves to it. A file holding two spellings of a Context's key is read under the one the new title matches, so the held tree is owed a walk.
  if (normalizeTitle(j.oldTitle) === normalizeTitle(j.newTitle)) {
    if (j.spaceId === undefined) oweWalk(root)
    return { touched: new Map(), skipped: [], refused: [] }
  }
  // The key being rewritten comes from the journal, never the registry title, which may already read old or new.
  const member: Member =
    j.spaceId === undefined
      ? { key: contextKey(j.oldTitle) }
      : { key: contextKey(contextTitle), spaceTitle: j.oldTitle }
  const rewrite: Rewrite =
    j.spaceId === undefined
      ? rekeyContext(j.oldTitle, j.newTitle)
      : (raw) => retitleSpace(raw, contextTitle, j)
  return sweepMembers(root, member, rewrite, pageLeg(j))
}

export async function unlinkContextKey(
  root: string,
  contextTitle: string,
  skipUnder?: string,
): Promise<Result<UnlinkOutcome>> {
  const key = contextKey(contextTitle)
  const captured: SweepCapture[] = []
  const strip: Rewrite = (raw, file) => {
    const keys = heldKeys(raw, key)
    if (!keys.length) return null
    const values = keys
      .flatMap((k) => listOf(raw[k]))
      .filter(isScalar)
      .map(String)
    captured.push(captureRoot(raw, file, values))
    return stripKeys(raw, keys)
  }
  const entry = withOrderEntry(strip, 'contexts', contextTitle, null)
  const swept = await unlinkMembers(root, { key }, entry, skipUnder)
  return ok({ ...swept, captured })
}

export async function unlinkSpaceValue(
  root: string,
  contextTitle: string,
  spaceTitle: string,
): Promise<Result<UnlinkOutcome>> {
  const key = contextKey(contextTitle)
  const captured: SweepCapture[] = []
  const names = namesValue(spaceTitle)
  const take: Rewrite = (raw, file) => {
    const taken: string[] = []
    const next = editHeldLists(raw, key, (held) => {
      taken.push(...held.filter(names).map(String))
      return stripList(held, names)
    })
    if (next) captured.push(captureRoot(raw, file, taken))
    return next
  }
  return ok({ ...(await unlinkMembers(root, { key, spaceTitle }, take)), captured })
}

// A refused delete leaves no record to restore from, so a sweep that missed a member puts back what it took and refuses, counting each file it missed or couldn’t put back. What sits under `skipUnder` leaves with the deleted folder, so it's neither rewritten nor owed.
async function unlinkMembers(
  root: string,
  member: Member,
  rewrite: Rewrite,
  skipUnder?: string,
): Promise<SweepResult> {
  const leaves = (file: string): boolean => !!skipUnder && file.startsWith(`${skipUnder}/`)
  const swept = await sweepMembers(root, member, (raw, file) =>
    leaves(file) ? null : rewrite(raw, file),
  )
  const missed = swept.skipped.filter((file) => !leaves(file))
  if (!missed.length) return swept
  const unrestored = await undoSweep(swept.touched)
  throw new Error(unsweptLine(missed.length + unrestored.length))
}

async function settleJournal(root: string, j: RenameJournal, skipped: string[]): Promise<void> {
  if (skipped.length) await writeJournal(root, { ...j, skipped })
  else await clearJournal(root, j)
}

const commitTitle = (root: string, id: string, title: string) =>
  mutateRegistryFile(root, (cur) => ({
    contexts: cur.contexts.map((c) => (c.id === id ? { ...c, title } : c)),
  }))

/** Order: journal → folder rename → KEY cascade → registry title commit → journal settle; a live failure aborts with a best-effort reverse and a journal that holds what the reverse skipped. */
export async function renameContextOp(
  root: string,
  contextId: string,
  newName: string,
  from?: string,
): Promise<Result<Unswept | null>> {
  const why = nameError(newName, 'directory')
  if (why) return fail('invalid-name', why)
  const reg = await readRegistryStrict(root)
  if (!reg.ok) return reg
  const entry = reg.value.contexts.find((c) => c.id === contextId)
  if (!entry) return fail('not-found', 'Unknown Context.')
  // A retry sweeps what the rename left to the title the Context holds now, which a later rename may have moved on.
  if (from !== undefined) {
    const taken = reg.value.contexts.some(
      (c) => c.id !== contextId && normalizeTitle(c.title) === normalizeTitle(from),
    )
    const again = { contextId, oldTitle: from, newTitle: entry.title, skipped: [] }
    return taken ? ok(null) : sweepAgain(root, entry.title, again)
  }
  if (entry.title === newName) return ok(null)
  if (
    reg.value.contexts.some(
      (c) => c.id !== contextId && normalizeTitle(c.title) === normalizeTitle(newName),
    )
  )
    return fail('exists', `"${newName}" already exists.`)

  const j: RenameJournal = { contextId, oldTitle: entry.title, newTitle: newName, skipped: [] }
  await writeJournal(root, j)

  const oldDir = join(contextsDir(root), entry.title)
  const newDir = join(contextsDir(root), newName)
  try {
    if (await pathExists(oldDir)) await relocate(oldDir, newDir)
  } catch (e) {
    await clearJournal(root, j)
    return fault(e)
  }

  const cascade = await cascadeTitle(root, entry.title, j)

  const committed = await commitTitle(root, contextId, newName)
  if (!committed.ok) {
    // The way back is a rename of its own, journaled so the next open finishes the files it can't reach now.
    const back: RenameJournal = { ...j, oldTitle: newName, newTitle: entry.title }
    await writeJournal(root, back)
    const undone = await cascadeTitle(root, entry.title, back)
    try {
      if (await pathExists(newDir)) await relocate(newDir, oldDir)
    } catch {}
    await settleJournal(root, back, undone.skipped)
    const left = undone.skipped.length
    return left ? fault(`${committed.error.message} ${unsweptLine(left)}`) : committed
  }

  await settleJournal(root, j, cascade.skipped)
  return ok(unswept(cascade.skipped, j.oldTitle))
}

export async function renameSpaceOp(
  root: string,
  spaceId: string,
  newName: string,
  from?: string,
): Promise<Result<Unswept | null>> {
  const why = nameError(newName, 'directory')
  if (why) return fail('invalid-name', why)
  const { groupById, spaceById } = contextWorldOf((await liveTreeOf(root)).contexts)
  const space = spaceById.get(spaceId)
  const group = space && groupById.get(space.contextId)
  if (!space || !group) return fail('not-found', 'Unknown Space.')
  if (from !== undefined) {
    const taken = group.spaces.some(
      (s) => s.id !== spaceId && normalizeTitle(s.title) === normalizeTitle(from),
    )
    const again = { contextId: space.contextId, spaceId, oldTitle: from, newTitle: space.title }
    return taken ? ok(null) : sweepAgain(root, group.def.title, { ...again, skipped: [] })
  }
  if (space.title === newName) return ok(null)
  const dir = join(root, space.path)
  const target = join(dirname(dir), newName)
  if (await targetTaken(dir, target)) return fail('exists', `"${newName}" already exists.`)

  const j: RenameJournal = {
    contextId: space.contextId,
    spaceId,
    oldTitle: space.title,
    newTitle: newName,
    skipped: [],
  }
  await writeJournal(root, j)
  try {
    await relocate(dir, target)
  } catch (e) {
    await clearJournal(root, j)
    return fault(e)
  }

  const cascade = await cascadeTitle(root, group.def.title, j)
  await settleJournal(root, j, cascade.skipped)
  return ok(unswept(cascade.skipped, j.oldTitle))
}

export async function replayPendingRename(root: string): Promise<void> {
  const j = await readJournal(root)
  if (!j) return
  const reg = await readRegistryStrict(root)
  if (!reg.ok) {
    if (reg.error.code === 'not-found') await clearJournal(root, j)
    return
  }
  const entry = reg.value.contexts.find((c) => c.id === j.contextId)
  if (!entry) {
    await clearJournal(root, j)
    return
  }

  if (j.spaceId === undefined) {
    const othersOwnOld = reg.value.contexts.some(
      (c) => c.id !== j.contextId && normalizeTitle(c.title) === normalizeTitle(j.oldTitle),
    )
    if ((entry.title !== j.oldTitle && entry.title !== j.newTitle) || othersOwnOld) {
      await clearJournal(root, j)
      return
    }
    const oldDir = join(contextsDir(root), j.oldTitle)
    const newDir = join(contextsDir(root), j.newTitle)
    if ((await pathExists(oldDir)) && !(await pathExists(newDir))) await relocate(oldDir, newDir)
    const cascade = await cascadeTitle(root, entry.title, j)
    if (entry.title !== j.newTitle) {
      const committed = await commitTitle(root, j.contextId, j.newTitle)
      if (!committed.ok) return
    }
    await settleJournal(root, j, cascade.skipped)
    return
  }

  const ctxDir = join(contextsDir(root), entry.title)
  const findTitle = async (title: string): Promise<boolean | null> => {
    const sc = await readJsonStrict(join(ctxDir, title, SPACE_SIDECAR))
    if (sc.ok) return sc.value.id === j.spaceId
    return sc.error.code === 'not-found' ? false : null
  }
  const atOld = await findTitle(j.oldTitle)
  const atNew = await findTitle(j.newTitle)
  if (atOld === null || atNew === null) return
  if (!atOld && !atNew) {
    await clearJournal(root, j)
    return
  }
  if (atNew && (await pathExists(join(ctxDir, j.oldTitle)))) {
    // The freed old title was re-minted by another Space — discard, never hijack.
    await clearJournal(root, j)
    return
  }
  if (atOld) {
    const target = join(ctxDir, j.newTitle)
    if (await pathExists(target)) {
      await clearJournal(root, j)
      return
    }
    await relocate(join(ctxDir, j.oldTitle), target)
  }
  const cascade = await cascadeTitle(root, entry.title, j)
  await settleJournal(root, j, cascade.skipped)
}
