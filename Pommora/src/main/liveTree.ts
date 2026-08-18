// The tree as last verified or patched — main's one holder, what reads serve and patches
// mutate. The walk is single-flight: concurrent refreshes share the in-flight promise. A walk
// that raced a mutation observed pre-mutation disk, so its result is discarded and the walk
// re-runs; a walk whose slot was dropped or superseded installs nothing.

import type { NexusTree } from '@shared/types'
import { pathExists } from './io/atomicWrite'
import { readNexus } from './readNexus'

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

/** Apply a pure patch to the held tree. Null — no tree held, or the patch can't resolve —
 *  tells the caller to fall back to `refreshTree`. Every call marks disk as moved, so an
 *  in-flight walk that started earlier discards its result and re-walks. */
export function patchLiveTree(fn: (t: NexusTree) => NexusTree | null): NexusTree | null {
  epoch++
  if (!tree) return null
  const next = fn(tree)
  if (next === null) return null
  tree = next
  return next
}

/** Mark disk as moved without holding a patch. The refresh arms call this before walking:
 *  `refreshTree` joins any in-flight walk, and one that started before the change would
 *  otherwise install pre-change disk as canon with nothing scheduled to correct it. */
export function noteDiskMoved(): void {
  epoch++
}

/** Session close or root switch: the held tree and any in-flight walk are both dead. */
export function dropLiveTree(): void {
  tree = null
  slot = null
}

/** Install a tree walked outside the seam — the open record pass, whose walk already ran. */
export function seedLiveTree(t: NexusTree): void {
  tree = t
}

export function refreshTree(root: string): Promise<NexusTree> {
  if (slot && slot.root === root) return slot.promise
  const entry: WalkSlot = { root, promise: undefined as unknown as Promise<NexusTree> }
  entry.promise = runWalk(root, entry)
  slot = entry
  return entry.promise
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
        // A vanished root must surface as the error, never as the ghost of the last tree —
        // but only if nothing installed a tree while the existence check was in flight
        // (a root switch may have seeded the new nexus by then).
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
