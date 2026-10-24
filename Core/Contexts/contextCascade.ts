import { basename, dirname, join, relative } from '../Paths/posix'
import { normalizeTitle } from '../Paths/caseFold'
import { contextKey } from './contexts'
import { ID_KEY } from '../Nexus/identityMark'
import { asString } from '../Nexus/coerce'
import { ok, fail, type Result, fault } from '../Contract/result'
import { mutateRegistryFile, readRegistryStrict } from './contextsRegistry'
import { heldName, pathExists, readJsonStrict, relocate, targetTaken } from '../Files/atomicWrite'
import { renameFrontmatterKey } from '../Files/pageFile'
import type { Json } from '../Files/stableJson'
import { contextsDir } from '../Paths/paths'
import { contextDirRel, SPACE_SIDECAR } from '../Paths/nexusPaths'
import { clearJournal, readJournal, writeJournal, type RenameJournal } from './contextJournal'
import {
  type Rewrite,
  type RewriteText,
  type SweepResult,
  sweepGovernedRoots,
  undoSweep,
} from '../Nexus/governedSweep'
import { unsweptLine } from '../Nexus/entities'
import { withoutOrderId } from './spaceSidecar'
import {
  editHeldList,
  editList,
  namesValue,
  rekeyHeld,
  stripKeys,
  stripList,
  type KeyCollision,
} from '../Files/rootValues'
import { contextWorldOf } from './contextResolve'
import { liveTreeOf, refreshTree } from '../Nexus/liveTree'
import { scalarMembers } from '../Contract/validators'
import { findHolders, type HolderQuery, type Moved } from '../Index/keyHolders'
import { nameError } from '../Paths/names'

/** Both keys of a collision hold real tags: the app's own tag writes run under the Contexts lock a rename holds, so a key already wearing the new title was written outside the app or by hand, and neither list is fresher, so dropping either would silently lose tags. */
const NEITHER_KEY_IS_FRESHER: KeyCollision = 'merge'

/** Whether another entry would take the folder name `title` gives, which the file system matches without regard to case. */
const rivalTitled =
  (title: string, id: string) =>
  (e: { id: string; title: string }): boolean =>
    e.id !== id && normalizeTitle(e.title) === normalizeTitle(title)

export const rekeyContext =
  (oldTitle: string, newTitle: string): Rewrite =>
  (raw) =>
    rekeyHeld(raw, contextKey(oldTitle), contextKey(newTitle), NEITHER_KEY_IS_FRESHER)

const retitleSpace = (raw: Json, contextTitle: string, j: RenameJournal): Json | null =>
  editHeldList(raw, contextKey(contextTitle), (held) =>
    editList(held, new Map([[j.oldTitle, j.newTitle]])),
  )

export interface SweepCapture {
  id?: string
  kind: 'page' | 'space'
  values: string[]
}

export type UnlinkOutcome = SweepResult & { captured: SweepCapture[] }

function captureRoot(raw: Json, file: string, values: string[]): SweepCapture {
  const isSpace = basename(file) === SPACE_SIDECAR
  const id = isSpace ? (typeof raw.id === 'string' ? raw.id : undefined) : asString(raw[ID_KEY])
  return { ...(id ? { id } : {}), kind: isSpace ? 'space' : 'page', values }
}

function pageLeg(j: RenameJournal): RewriteText | undefined {
  if (j.spaceId !== undefined) return undefined
  const oldKey = contextKey(j.oldTitle)
  const newKey = contextKey(j.newTitle)
  return (content) => renameFrontmatterKey(content, oldKey, newKey, NEITHER_KEY_IS_FRESHER)
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
  const again = await cascadeTitle(contextTitle, j, await titleHolders(root, contextTitle, j))
  await settleJournal(root, j, again.skipped)
  return ok(unswept(again.skipped, j.oldTitle))
}

/** The files holding the key `j` rewrites, found before the rename's list or folder step, so no settle between them can drop a moved Space from the tree; `moved` points a Space the tree still lists under the folder it left at the one it went to. The key comes from the journal, never the registry title, which may already read old or new. */
async function titleHolders(
  root: string,
  contextTitle: string,
  j: RenameJournal,
  moved?: Moved,
): Promise<string[]> {
  const { pages, spaces } = await findHolders(
    root,
    j.spaceId === undefined
      ? { keys: [contextKey(j.oldTitle)], reach: 'anywhere', moved }
      : { keys: [contextKey(contextTitle)], title: j.oldTitle, reach: 'anywhere', moved },
  )
  return [...pages, ...spaces]
}

function cascadeTitle(
  contextTitle: string,
  j: RenameJournal,
  files: string[],
): Promise<SweepResult> {
  const raw: Rewrite =
    j.spaceId === undefined
      ? rekeyContext(j.oldTitle, j.newTitle)
      : (r) => retitleSpace(r, contextTitle, j)
  return sweepGovernedRoots(files, { raw, text: pageLeg(j) })
}

export async function unlinkContextKey(
  root: string,
  contextTitle: string,
  contextId: string | undefined,
  skipUnder?: string,
): Promise<Result<UnlinkOutcome>> {
  const key = contextKey(contextTitle)
  const captured: SweepCapture[] = []
  const strip: Rewrite = (raw, file) => {
    if (!Object.hasOwn(raw, key)) return null
    captured.push(captureRoot(raw, file, scalarMembers(raw[key])))
    return stripKeys(raw, [key])
  }
  const rewrite = contextId === undefined ? strip : withoutOrderId(strip, contextId)
  const swept = await unlinkMembers(root, { keys: [key], id: contextId }, rewrite, skipUnder)
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
    const next = editHeldList(raw, key, (held) => {
      taken.push(...held.filter(names).map(String))
      return stripList(held, names)
    })
    if (next) captured.push(captureRoot(raw, file, taken))
    return next
  }
  return ok({ ...(await unlinkMembers(root, { keys: [key], title: spaceTitle }, take)), captured })
}

// A refused delete leaves no record to restore from, so a sweep that missed a member puts back what it took and refuses, counting each file it missed or couldn’t put back. What sits under `skipUnder` leaves with the deleted folder, so it's neither rewritten nor owed.
async function unlinkMembers(
  root: string,
  holding: Pick<HolderQuery, 'keys' | 'title' | 'id'>,
  rewrite: Rewrite,
  skipUnder?: string,
): Promise<SweepResult> {
  const leaves = (file: string): boolean => !!skipUnder && file.startsWith(`${skipUnder}/`)
  const { pages, spaces } = await findHolders(root, { ...holding, reach: 'anywhere' })
  const swept = await sweepGovernedRoots([...pages, ...spaces], {
    raw: (raw, file) => (leaves(file) ? null : rewrite(raw, file)),
  })
  const missed = swept.skipped.filter((file) => !leaves(file))
  if (!missed.length) return swept
  const unrestored = await undoSweep(swept.touched)
  throw new Error(unsweptLine(missed.length + unrestored.length))
}

async function settleJournal(root: string, j: RenameJournal, skipped: string[]): Promise<void> {
  if (!skipped.length) await clearJournal(root, j)
}

const commitTitle = (root: string, id: string, title: string) =>
  mutateRegistryFile(root, (cur) => ({
    contexts: cur.contexts.map((c) => (c.id === id ? { ...c, title } : c)),
  }))

/** Order: note → registry title → folder → key cascade → note settle; a folder that can't move puts the title back, so a live failure renames nothing. */
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
    const taken = reg.value.contexts.some(rivalTitled(from, contextId))
    const again = { contextId, oldTitle: from, newTitle: entry.title }
    return taken ? ok(null) : sweepAgain(root, entry.title, again)
  }
  if (entry.title === newName) return ok(null)
  if (reg.value.contexts.some(rivalTitled(newName, contextId)))
    return fail('exists', `"${newName}" already exists.`)

  const j: RenameJournal = { contextId, oldTitle: entry.title, newTitle: newName }
  const files = await titleHolders(root, entry.title, j, {
    from: contextDirRel(entry.title),
    to: contextDirRel(newName),
  })
  await writeJournal(root, j)
  const committed = await commitTitle(root, contextId, newName)
  if (!committed.ok) {
    await clearJournal(root, j)
    return committed
  }

  const oldDir = join(contextsDir(root), entry.title)
  const newDir = join(contextsDir(root), newName)
  try {
    if (await pathExists(oldDir)) await relocate(oldDir, newDir)
  } catch (e) {
    // The list names the new title while the folder keeps the old, so the title goes back; one that can't go back leaves the note, and the next open moves the folder.
    if ((await commitTitle(root, contextId, entry.title)).ok) await clearJournal(root, j)
    return fault(e)
  }

  const cascade = await cascadeTitle(entry.title, j, files)
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
    const taken = group.spaces.some(rivalTitled(from, spaceId))
    const again = { contextId: space.contextId, spaceId, oldTitle: from, newTitle: space.title }
    return taken ? ok(null) : sweepAgain(root, group.def.title, again)
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
  }
  const files = await titleHolders(root, group.def.title, j, {
    from: space.path,
    to: relative(root, target),
  })
  await writeJournal(root, j)
  try {
    await relocate(dir, target)
  } catch (e) {
    await clearJournal(root, j)
    return fault(e)
  }

  const cascade = await cascadeTitle(group.def.title, j, files)
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
    const othersOwnOld = reg.value.contexts.some(rivalTitled(j.oldTitle, j.contextId))
    if ((entry.title !== j.oldTitle && entry.title !== j.newTitle) || othersOwnOld) {
      await clearJournal(root, j)
      return
    }
    const oldDir = join(contextsDir(root), j.oldTitle)
    const newDir = join(contextsDir(root), j.newTitle)
    if (entry.title !== j.newTitle && !(await commitTitle(root, j.contextId, j.newTitle)).ok) return
    if ((await heldName(oldDir)) === j.oldTitle && !(await targetTaken(oldDir, newDir))) {
      await relocate(oldDir, newDir)
      // The open's tree read this Context's Spaces from the folder its title named; with the title committed first, as the live op commits it, the moved folder is the one the list names, so the tree is read again before the find.
      await refreshTree(root)
    }
    const cascade = await cascadeTitle(entry.title, j, await titleHolders(root, entry.title, j))
    await settleJournal(root, j, cascade.skipped)
    return
  }

  const ctxDir = join(contextsDir(root), entry.title)
  const findTitle = async (title: string): Promise<boolean | null> => {
    if ((await heldName(join(ctxDir, title))) !== title) return false
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
  if (atNew && (await heldName(join(ctxDir, j.oldTitle))) === j.oldTitle) {
    // The freed old title was re-minted by another Space — discard, never hijack.
    await clearJournal(root, j)
    return
  }
  if (atOld) {
    const target = join(ctxDir, j.newTitle)
    if (await targetTaken(join(ctxDir, j.oldTitle), target)) {
      await clearJournal(root, j)
      return
    }
    await relocate(join(ctxDir, j.oldTitle), target)
  }
  const cascade = await cascadeTitle(entry.title, j, await titleHolders(root, entry.title, j))
  await settleJournal(root, j, cascade.skipped)
}
