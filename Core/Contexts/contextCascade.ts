import { basename, dirname, join, relative } from '../Paths/posix'
import { normalizeTitle } from '../Paths/caseFold'
import { contextKey } from './contexts'
import { ID_KEY } from '../Nexus/identityMark'
import { asString } from '../Nexus/coerce'
import { ok, fail, type Result, fault } from '../Contract/result'
import { mutateRegistryFile, readRegistryStrict } from './contextsRegistry'
import { pathExists, relocate, targetTaken } from '../Files/atomicWrite'
import { renameFrontmatterKey } from '../Files/pageFile'
import type { Json } from '../Files/stableJson'
import { contextsDir } from '../Paths/paths'
import { contextDirRel, SPACE_SIDECAR } from '../Paths/nexusPaths'
import type { MutateReply } from '../Nexus/mutateRequest'
import { owedRename, owedSwept, runNoted } from '../Nexus/owed'
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
import { liveTreeOf } from '../Nexus/liveTree'
import { scalarMembers } from '../Contract/validators'
import { findHolders, type HolderQuery, type Moved } from '../Index/keyHolders'
import { nameError } from '../Paths/names'

/** Both keys of a collision hold real tags: the app's own tag writes run under the Contexts lock a rename holds, so a key already wearing the new title was written outside the app or by hand, and neither list is fresher, so dropping either would silently lose tags. */
const NEITHER_KEY_IS_FRESHER: KeyCollision = 'merge'

/** Whether another entry would take the folder name `title` gives, which the file system matches without regard to case. */
export const rivalTitled =
  (title: string, id: string) =>
  (e: { id: string; title: string }): boolean =>
    e.id !== id && normalizeTitle(e.title) === normalizeTitle(title)

export const rekeyContext =
  (oldTitle: string, newTitle: string): Rewrite =>
  (raw) =>
    rekeyHeld(raw, contextKey(oldTitle), contextKey(newTitle), NEITHER_KEY_IS_FRESHER)

const retitleSpace = (raw: Json, contextTitle: string, from: string, to: string): Json | null =>
  editHeldList(raw, contextKey(contextTitle), (held) => editList(held, new Map([[from, to]])))

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

function pageLeg(from: string, to: string): RewriteText {
  const oldKey = contextKey(from)
  const newKey = contextKey(to)
  return (content) => renameFrontmatterKey(content, oldKey, newKey, NEITHER_KEY_IS_FRESHER)
}

/** The files holding the key a title change rewrites, found before the rename's list or folder step, so no settle between them can drop a moved Space from the tree; `moved` points a Space the tree still lists under the folder it left at the one it went to. The key comes from the old title, never the registry title, which may already read old or new. */
export async function titleHolders(
  root: string,
  contextTitle: string,
  from: string,
  space: boolean,
  moved?: Moved,
): Promise<string[]> {
  const { pages, spaces } = await findHolders(
    root,
    space
      ? { keys: [contextKey(contextTitle)], title: from, reach: 'anywhere', moved }
      : { keys: [contextKey(from)], reach: 'anywhere', moved },
  )
  return [...pages, ...spaces]
}

/** Sweeps one title change through `files`: a Context's key from `from` to `to`, or with `space` that Space's name inside `contextTitle`'s key; answers how many it missed. */
export async function cascadeTitle(
  contextTitle: string,
  from: string,
  to: string,
  space: boolean,
  files: string[],
): Promise<number> {
  const raw: Rewrite = space
    ? (r) => retitleSpace(r, contextTitle, from, to)
    : rekeyContext(from, to)
  return (await sweepGovernedRoots(files, space ? { raw } : { raw, text: pageLeg(from, to) }))
    .skipped.length
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

const commitTitle = (root: string, id: string, title: string) =>
  mutateRegistryFile(root, (cur) => ({
    contexts: cur.contexts.map((c) => (c.id === id ? { ...c, title } : c)),
  }))

/** Note → list → folder → files. A folder that can't move puts the title back and the note with it; a title that can't go back stays listed, and the rename is owed for the finish to move the folder (H-8). */
export async function renameContextOp(
  root: string,
  contextId: string,
  newName: string,
): Promise<MutateReply> {
  const why = nameError(newName, 'directory')
  if (why) return fail('invalid-name', why)
  const reg = await readRegistryStrict(root)
  if (!reg.ok) return reg
  const entry = reg.value.contexts.find((c) => c.id === contextId)
  if (!entry) return fail('not-found', 'Unknown Context.')
  if (entry.title === newName) return ok({})
  if (reg.value.contexts.some(rivalTitled(newName, contextId)))
    return fail('exists', `"${newName}" already exists.`)

  const files = await titleHolders(root, entry.title, entry.title, false, {
    from: contextDirRel(entry.title),
    to: contextDirRel(newName),
  })
  const oldDir = join(contextsDir(root), entry.title)
  const newDir = join(contextsDir(root), newName)
  return runNoted(root, contextId, {
    lands: [{ owner: { kind: 'context' }, name: newName, except: contextId }],
    note: (e) => ({ ...e, kind: 'context', ...owedRename(e ?? {}, entry.title, newName) }),
    list: async () => {
      const committed = await commitTitle(root, contextId, newName)
      if (!committed.ok) return committed
      try {
        if (await pathExists(oldDir)) await relocate(oldDir, newDir)
        return ok(true)
      } catch (e) {
        return (await commitTitle(root, contextId, entry.title)).ok ? fault(e) : ok(false)
      }
    },
    sweep: async (relocated) => ({
      skipped: relocated ? await cascadeTitle(entry.title, entry.title, newName, false, files) : 1,
      hosts: [],
    }),
    settle: (e) => ({ ...e, ...owedSwept(e, [entry.title]) }),
  })
}

export async function renameSpaceOp(
  root: string,
  spaceId: string,
  newName: string,
): Promise<MutateReply> {
  const why = nameError(newName, 'directory')
  if (why) return fail('invalid-name', why)
  const { groupById, spaceById } = contextWorldOf((await liveTreeOf(root)).contexts)
  const space = spaceById.get(spaceId)
  const group = space && groupById.get(space.contextId)
  if (!space || !group) return fail('not-found', 'Unknown Space.')
  if (space.title === newName) return ok({})
  const dir = join(root, space.path)
  const target = join(dirname(dir), newName)
  if (await targetTaken(dir, target)) return fail('exists', `"${newName}" already exists.`)

  const files = await titleHolders(root, group.def.title, space.title, true, {
    from: space.path,
    to: relative(root, target),
  })
  // A Space's folder is its list entry, so the move is its list step.
  return runNoted(root, spaceId, {
    lands: [
      { owner: { kind: 'space', contextId: space.contextId }, name: newName, except: spaceId },
    ],
    note: (e) => ({
      ...e,
      kind: 'space',
      contextId: space.contextId,
      ...owedRename(e ?? {}, space.title, newName),
    }),
    list: () => relocate(dir, target).then(() => ok(null), fault),
    sweep: async () => ({
      skipped: await cascadeTitle(group.def.title, space.title, newName, true, files),
      hosts: [],
    }),
    settle: (e) => ({ ...e, ...owedSwept(e, [space.title]) }),
    under: space.contextId,
  })
}
