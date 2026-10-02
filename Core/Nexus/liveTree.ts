// The walk is single-flight: concurrent refreshes share the in-flight promise. A walk that raced a mutation observed pre-mutation disk, so it discards its result and re-runs; a walk whose slot was dropped or superseded installs nothing, and a root other than the open Nexus's is read without a slot, so a caller still working on it can't install it.

import type { NexusTree } from './tree'
import type { HeldKind } from './entities'
import { pathExists } from '../Files/atomicWrite'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { fail, type Result } from '../Contract/result'
import { containerAt, contextAt, pageAt, spaceAt } from './treePatch'
import { readNexus } from './readNexus'
import { sessionRoot } from './session'
import { same } from '../Files/stableJson'

interface WalkSlot {
  root: string
  promise: Promise<NexusTree>
}

let tree: NexusTree | null = null
let slot: WalkSlot | null = null
let epoch = 0
let commandsTap: (() => void) | null = null

export function setCommandsTap(fn: (() => void) | null): void {
  commandsTap = fn
}

function hold(next: NexusTree | null): void {
  const moved =
    !!next &&
    next.config.commands !== tree?.config.commands &&
    !same(next.config.commands, tree?.config.commands)
  tree = next
  if (moved) commandsTap?.()
}

/** Null — no tree held, or the patch can't resolve — tells the caller to fall back to `refreshTree`. A call that changes the tree, or can't place its change, marks disk as moved, so an in-flight walk that started earlier discards its result and re-walks. */
export function patchLiveTree(fn: (t: NexusTree) => NexusTree | null): NexusTree | null {
  const next = tree && fn(tree)
  if (next === null || next !== tree) epoch++
  if (next === null) return null
  hold(next)
  return next
}

export function diskMoved(): void {
  epoch++
}

/** The epoch bump comes first because `refreshTree` joins any in-flight walk, and one that started before the change would otherwise install pre-change disk as canon with nothing scheduled to correct it. */
export function refreshAfterWrite(root: string): Promise<NexusTree> {
  diskMoved()
  return refreshTree(root)
}

export function dropLiveTree(): void {
  hold(null)
  slot = null
}

export function seedLiveTree(t: NexusTree): void {
  hold(t)
  slot = null
}

export function refreshTree(root: string): Promise<NexusTree> {
  if (root !== sessionRoot()) return readNexus(root)
  if (slot && slot.root === root) return slot.promise
  const entry: WalkSlot = { root, promise: undefined as unknown as Promise<NexusTree> }
  entry.promise = runWalk(root, entry)
  slot = entry
  return entry.promise
}

/** The held tree when it is `root`'s. */
export const heldTreeOf = (root: string): NexusTree | null =>
  tree?.nexus.rootPath === root ? tree : null

/** The held tree when it is `root`'s, or a walk of `root`. */
export const liveTreeOf = (root: string): Promise<NexusTree> =>
  Promise.resolve(heldTreeOf(root) ?? refreshTree(root))

export const NOT_HELD = fail('invalid-path', 'That item can’t be changed.')

/** A mutation reaches only what the tree holds, as a kind it claims, so the root, `.nexus`, the trash, and excluded folders are never a target. */
export async function mutableTarget(
  root: string,
  rel: string,
  kinds: readonly HeldKind[],
): Promise<Result<string>> {
  const tree = await liveTreeOf(root)
  return kinds.some((kind) => holds(tree, rel, kind)) ? resolveUnderRoot(root, rel) : NOT_HELD
}

function holds(tree: NexusTree, rel: string, kind: HeldKind): boolean {
  switch (kind) {
    case 'context':
      return !!contextAt(tree, rel)
    case 'space':
      return !!spaceAt(tree, rel)
    case 'page':
      return !!pageAt(tree, rel)
    case 'collection':
    case 'set':
      return containerAt(tree, rel)?.kind === kind
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
        if (!(await pathExists(root)) && tree === held) hold(null)
      }
      throw err
    }
    if (slot !== entry) return walked
    if (epoch !== startEpoch) continue
    hold(walked)
    slot = null
    return walked
  }
}
