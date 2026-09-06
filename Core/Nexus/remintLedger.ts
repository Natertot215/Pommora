import { join } from '../Locations/posix'
import { machine } from '../Platform/machine'
import type { EntityRecord } from './record'
import { errText } from '../Contract/result'
import { contextDirRel, CONTEXTS_REGISTRY_REL } from '../Locations/nexusPaths'
import type { NexusTree, PageNode, SetNode } from './tree'
import { readKey, writeKey } from '../Platform/localState'
import { isAdoptedId } from '../Locations/ids'
import { refreshTree, seedLiveTree } from './liveTree'
import { readNexus } from './readNexus'
import { applyRemints, runRemintPass } from './remint'

export type Baseline = Record<string, EntityRecord>

export interface Projection {
  entries: Record<string, EntityRecord>
  duplicates: Record<string, EntityRecord[]>
}

const byTree = new WeakMap<NexusTree, Projection>()

export function projectBaseline(tree: NexusTree): Projection {
  const memo = byTree.get(tree)
  if (memo) return memo
  const projection = buildBaseline(tree)
  byTree.set(tree, projection)
  return projection
}

function buildBaseline(tree: NexusTree): Projection {
  const entries: Record<string, EntityRecord> = {}
  const claimants: Record<string, EntityRecord[]> = {}
  const add = (e: EntityRecord): void => {
    if (isAdoptedId(e.id)) return
    claimants[e.id] ??= []
    claimants[e.id].push(e)
    entries[e.id] ??= e
  }
  const addPage = (p: PageNode): void =>
    add({ id: p.id, kind: 'page', title: p.title, path: p.path })
  const addSets = (sets: SetNode[] | undefined): void => {
    for (const s of sets ?? []) {
      add({ id: s.id, kind: 'set', title: s.title, path: s.path })
      for (const p of s.pages) addPage(p)
      addSets(s.sets)
    }
  }
  for (const g of tree.contexts) {
    add({
      id: g.def.id,
      kind: 'context',
      title: g.def.title,
      path: contextDirRel(g.def.title),
    })
    for (const s of g.spaces) add({ id: s.id, kind: 'space', title: s.title, path: s.path })
  }
  for (const c of tree.collections) {
    add({ id: c.id, kind: 'collection', title: c.title, path: c.path })
    for (const p of c.pages) addPage(p)
    addSets(c.sets)
  }
  const duplicates = Object.fromEntries(
    Object.entries(claimants).filter(([, claims]) => claims.length > 1),
  )
  return { entries, duplicates }
}

export function latchBaseline(
  projection: Projection,
  unreadablePaths: readonly string[],
  prior: Baseline | null,
): Baseline {
  const unreadable = new Set(unreadablePaths)
  const recorded: Baseline = prior ?? {}
  const out: Baseline = {}
  for (const [id, e] of Object.entries(projection.entries)) out[id] = e
  for (const [id, claims] of Object.entries(projection.duplicates)) {
    const p = recorded[id]
    if (!p) continue
    if (unreadable.has(p.path) || claims.some((c) => c.path === p.path)) out[id] = p
    else delete out[id]
  }
  for (const [id, p] of Object.entries(recorded)) {
    if (!(id in out) && !(id in projection.duplicates) && unreadable.has(p.path)) out[id] = p
  }
  // An unusable registry blanks the whole Contexts layer in one stroke — carry every prior
  // group and Space as unreadable rather than reading the blank as mass deletion.
  if (unreadable.has(CONTEXTS_REGISTRY_REL)) {
    for (const [id, p] of Object.entries(recorded)) {
      if ((p.kind === 'context' || p.kind === 'space') && !(id in out)) out[id] = p
    }
  }
  return out
}

/** With no prior evidence, the claimant the baseline records is the ELDEST file, not whatever the
 *  walk enumerated first: a copy is born after its original and birth time survives a rename, so
 *  a walk-order pick would let the accidental copy keep the identity and re-mint the original. */
async function recordEldest(
  root: string,
  projection: Projection,
  prior: Baseline | null,
): Promise<void> {
  for (const [id, claims] of Object.entries(projection.duplicates)) {
    if (prior?.[id]) continue
    const births = await Promise.all(
      claims.map(async (c) => {
        const st = await machine()
          .stat(join(root, c.path))
          .catch(() => null)
        return st?.birthtimeMs ?? Number.POSITIVE_INFINITY
      }),
    )
    let eldest = 0
    for (let i = 1; i < births.length; i++) if (births[i] < births[eldest]) eldest = i
    projection.entries[id] = claims[eldest]
  }
}

export async function runOpenLedger(root: string): Promise<void> {
  try {
    const tree = await readNexus(root)
    const prior = readBaseline()
    const unreadablePaths = (tree.unreadable ?? []).map((u) => u.path)
    // The re-mint runs between the walk and the latch — the baseline must record the
    // re-minted state, or the next open reports every fresh id as a creation.
    const walked = projectBaseline(tree)
    const reminted = await runRemintPass(root, walked, prior, unreadablePaths)
    const projection = applyRemints(walked, reminted)
    await recordEldest(root, projection, prior)
    writeBaseline(latchBaseline(projection, unreadablePaths, prior))
    // This walk observed pre-remint disk, so it may seed the session only when the remint wrote
    // nothing — otherwise two entities would share an id, colliding every id-keyed store. A
    // written remint forces the fresh walk; if that fails, the pre-remint tree still serves.
    seedLiveTree(tree)
    if (reminted.length > 0) {
      try {
        await refreshTree(root)
      } catch (e) {
        console.error(
          'ledger: the post-remint walk failed; the pre-remint tree serves:',
          errText(e),
        )
      }
    }
  } catch (e) {
    console.error('ledger: the open pass failed; the prior baseline stands:', errText(e))
  }
}

export function readBaseline(): Baseline | null {
  return readKey<Baseline>('record', 'baseline')
}

export function writeBaseline(baseline: Baseline): boolean {
  return writeKey('record', 'baseline', baseline)
}
