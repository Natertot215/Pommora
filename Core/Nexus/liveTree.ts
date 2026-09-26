// The walk is single-flight: concurrent refreshes share the in-flight promise. A walk that raced a mutation observed pre-mutation disk, so it discards its result and re-runs; a walk whose slot was dropped or superseded installs nothing, and a root other than the open Nexus's is read without a slot, so a caller still working on it can't install it.

import type { NexusTree } from './tree'
import type { MutableKind } from './mutateRequest'
import { pathExists } from '../Files/atomicWrite'
import { contextDirRel } from '../Paths/nexusPaths'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { fail, type Result } from '../Contract/result'
import { findContainerWhere } from './treePatch'
import { readNexus } from './readNexus'
import { sessionRoot } from './session'

interface WalkSlot {
  root: string
  promise: Promise<NexusTree>
}

let tree: NexusTree | null = null
let slot: WalkSlot | null = null
let epoch = 0

export function getLiveTree(): NexusTree | null {
  return tree
}

/** Null — no tree held, or the patch can't resolve — tells the caller to fall back to `refreshTree`. Every call marks disk as moved, so an in-flight walk that started earlier discards its result and re-walks. */
export function patchLiveTree(fn: (t: NexusTree) => NexusTree | null): NexusTree | null {
  epoch++
  if (!tree) return null
  const next = fn(tree)
  if (next === null) return null
  tree = next
  return next
}

/** The epoch bump comes first because `refreshTree` joins any in-flight walk, and one that started before the change would otherwise install pre-change disk as canon with nothing scheduled to correct it. */
export function refreshAfterWrite(root: string): Promise<NexusTree> {
  epoch++
  return refreshTree(root)
}

export function dropLiveTree(): void {
  tree = null
  slot = null
}

export function seedLiveTree(t: NexusTree): void {
  tree = t
}

export function refreshTree(root: string): Promise<NexusTree> {
  if (root !== sessionRoot()) return readNexus(root)
  if (slot && slot.root === root) return slot.promise
  const entry: WalkSlot = { root, promise: undefined as unknown as Promise<NexusTree> }
  entry.promise = runWalk(root, entry)
  slot = entry
  return entry.promise
}

/** The held tree when it is `root`'s, or a walk of `root`. */
export const liveTreeOf = (root: string): Promise<NexusTree> =>
  Promise.resolve(tree?.nexus.rootPath === root ? tree : refreshTree(root))

/** A mutation reaches only what the tree holds, as a kind it claims, so the root, `.nexus`, the trash, and excluded folders are never a target. */
export async function mutableTarget(
  root: string,
  rel: string,
  kinds: readonly MutableKind[],
): Promise<Result<string>> {
  const tree = await liveTreeOf(root)
  return kinds.some((kind) => holds(tree, rel, kind))
    ? resolveUnderRoot(root, rel)
    : fail('invalid-path', 'That item can’t be changed.')
}

function holds(tree: NexusTree, rel: string, kind: MutableKind): boolean {
  switch (kind) {
    case 'context':
      return tree.contexts.some((g) => contextDirRel(g.def.title) === rel)
    case 'space':
      return tree.contexts.some((g) => g.spaces.some((s) => s.path === rel))
    case 'page':
      return !!findContainerWhere(tree, (c) => c.pages.some((p) => p.path === rel))
    case 'collection':
    case 'set':
      return findContainerWhere(tree, (c) => c.path === rel)?.kind === kind
  }
}

async function runWalk(root: string, entry: WalkSlot): Promise<NexusTree> {
  for (;;) {
    const startEpoch = epoch
    let walked: NexusTree
    try {
      walked = await readNexus(root)
    } catch (err) {
      if (slot === entry) {
        slot = null
        // A vanished root must surface as the error, never as the ghost of the last tree — but only if nothing installed a tree while the existence check was in flight (a root switch may have seeded the new nexus by then).
        const held = tree
        if (!(await pathExists(root)) && tree === held) tree = null
      }
      throw err
    }
    if (slot !== entry) return walked
    if (epoch !== startEpoch) continue
    tree = walked
    slot = null
    return walked
  }
}
