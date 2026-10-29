import { dirname, isAtOrUnder, join, relative } from '../Paths/posix'
import { normalizeTitle } from '../Paths/caseFold'
import { contextKey } from './contexts'
import { ok, fail, fault } from '../Contract/result'
import { mutateRegistryFile, readRegistryStrict } from './contextsRegistry'
import { pathExists, relocate, targetTaken } from '../Files/atomicWrite'
import type { Json } from '../Files/stableJson'
import { contextDirRel } from '../Paths/nexusPaths'
import type { MutateReply } from '../Nexus/mutateRequest'
import { followRelinks, owedRename, owedSwept, runNoted } from '../Nexus/owed'
import {
  type Rewrite,
  rekeySweep,
  sweepGovernedRoots,
  type SweepPlan,
} from '../Nexus/governedSweep'
import { type ConfigReach, sweptReach } from '../Nexus/configReach'
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
import { findHolders, type HolderQuery, type FolderMove, movedTo } from '../Index/keyHolders'
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

/** The files holding the key a title change rewrites, found before the rename's list or folder step, so no settle between them can drop a moved Space from the tree; `moved` points a Space the tree still lists under the folder it left at the one it went to. The key comes from the old title, never the registry title, which may already read old or new. */
export async function titleHolders(
  root: string,
  contextTitle: string,
  from: string,
  space: boolean,
  moved?: FolderMove,
): Promise<string[]> {
  const query: HolderQuery = space
    ? { keys: [contextKey(contextTitle)], title: from, reach: 'anywhere', moved }
    : { keys: [contextKey(from)], reach: 'anywhere', moved }
  return (await findHolders(root, query)).files
}

/** Sweeps one title change through `files`: a Context's key from `from` to `to`, or with `space` that Space's name inside `contextTitle`'s key; answers what it missed. */
export async function cascadeTitle(
  contextTitle: string,
  from: string,
  to: string,
  space: boolean,
  files: string[],
): Promise<ConfigReach> {
  const plan: SweepPlan = space
    ? { raw: (r) => retitleSpace(r, contextTitle, from, to) }
    : rekeySweep(contextKey(from), contextKey(to), NEITHER_KEY_IS_FRESHER)
  return sweptReach(await sweepGovernedRoots(files, plan))
}

export async function unlinkContextKey(
  root: string,
  contextTitle: string,
  contextId: string | undefined,
  skipUnder: string,
): Promise<ConfigReach> {
  const key = contextKey(contextTitle)
  const strip: Rewrite = (raw) => (Object.hasOwn(raw, key) ? stripKeys(raw, [key]) : null)
  const rewrite = contextId === undefined ? strip : withoutOrderId(strip, contextId)
  return unlinkMembers(root, { keys: [key], id: contextId }, rewrite, skipUnder)
}

export async function unlinkSpaceValue(
  root: string,
  contextTitle: string,
  spaceTitle: string,
  skipUnder: string,
): Promise<ConfigReach> {
  const key = contextKey(contextTitle)
  const names = namesValue(spaceTitle)
  const take: Rewrite = (raw) => editHeldList(raw, key, (held) => stripList(held, names))
  return unlinkMembers(root, { keys: [key], title: spaceTitle }, take, skipUnder)
}

// What sits under `skipUnder` left with the deleted folder, which the tree may still list at its old path until the walk, so it's neither swept nor owed.
async function unlinkMembers(
  root: string,
  holding: Pick<HolderQuery, 'keys' | 'title' | 'id'>,
  rewrite: Rewrite,
  skipUnder: string,
): Promise<ConfigReach> {
  const { files } = await findHolders(root, { ...holding, reach: 'anywhere' })
  const kept = files.filter((file) => !isAtOrUnder(file, skipUnder))
  return sweptReach(await sweepGovernedRoots(kept, { raw: rewrite }))
}

/** A Context's or Space's folder to where `moved` sends it, each owed relink entry's files under it following. */
export async function moveTitled(root: string, moved: FolderMove): Promise<void> {
  await relocate(join(root, moved.from), join(root, moved.to))
  await followRelinks(root, new Map(), (f) => movedTo(f, moved))
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

  const moved = { from: contextDirRel(entry.title), to: contextDirRel(newName) }
  const files = await titleHolders(root, entry.title, entry.title, false, moved)
  return runNoted(root, contextId, {
    lands: [{ owner: { kind: 'context' }, name: newName, except: contextId }],
    note: (e) => ({ ...e, kind: 'context', ...owedRename(e ?? {}, entry.title, newName) }),
    list: async () => {
      const committed = await commitTitle(root, contextId, newName)
      if (!committed.ok) return committed
      try {
        if (await pathExists(join(root, moved.from))) await moveTitled(root, moved)
        return ok(true)
      } catch (e) {
        return (await commitTitle(root, contextId, entry.title)).ok ? fault(e) : ok(false)
      }
    },
    sweep: async (relocated) =>
      relocated
        ? cascadeTitle(entry.title, entry.title, newName, false, files)
        : { skipped: 1, hosts: [] },
    settle: (e) => owedSwept(e, [entry.title]),
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

  const moved = { from: space.path, to: relative(root, target) }
  const files = await titleHolders(root, group.def.title, space.title, true, moved)
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
    list: () => moveTitled(root, moved).then(() => ok(null), fault),
    sweep: () => cascadeTitle(group.def.title, space.title, newName, true, files),
    settle: (e) => owedSwept(e, [space.title]),
    under: space.contextId,
  })
}
