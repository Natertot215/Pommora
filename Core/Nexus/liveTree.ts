// The walk is single-flight: concurrent refreshes share the in-flight promise. A walk that raced a mutation observed pre-mutation disk, so it discards its result and re-runs; a walk whose slot was dropped or superseded installs nothing.

import type { NexusTree } from './tree'
import { pathExists } from '../Files/atomicWrite'
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

/** Null if no tree held or patch can't resolve; every call marks disk moved. */
export function patchLiveTree(fn: (t: NexusTree) => NexusTree | null): NexusTree | null {
  epoch++
  if (!tree) return null
  const next = fn(tree)
  if (next === null) return null
  tree = next
  return next
}

/** The epoch bump comes first: in-flight walks started before change would install pre-change disk. */
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
