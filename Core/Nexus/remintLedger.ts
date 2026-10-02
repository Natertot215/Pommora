import { join } from '../Paths/posix'
import { machine } from '../Platform/machine'
import type { EntityRecord } from './record'
import { errText } from '../Contract/result'
import { contextDirRel, CONTEXTS_REGISTRY_REL } from '../Paths/nexusPaths'
import { entityMemo, type NexusTree, type PageNode, type SetNode, type Unreadable } from './tree'
import { withheldIn } from './treePatch'
import { readKey, writeKey } from '../Platform/localState'
import { refreshTree, seedLiveTree } from './liveTree'
import { applyRemints, runRemintPass } from './remint'

export type Baseline = Record<string, EntityRecord>

export interface Projection {
  entries: Record<string, EntityRecord>
  duplicates: Record<string, EntityRecord[]>
}

export const projectBaseline = entityMemo([(t) => t.contexts], buildBaseline)

function buildBaseline(tree: NexusTree): Projection {
  const entries: Record<string, EntityRecord> = {}
  const claimants: Record<string, EntityRecord[]> = {}
  const add = (e: EntityRecord): void => {
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
  listed: readonly Unreadable[],
  prior: Baseline | null,
): Baseline {
  const unreadable = new Set(listed.map((u) => u.path))
  const withheld = withheldIn(listed)
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
    if (id in out || id in projection.duplicates) continue
    if (unreadable.has(p.path) || withheld(p.path)) out[id] = p
  }
  // An unusable registry blanks the whole Contexts layer in one stroke — carry every prior group and Space as unreadable rather than reading the blank as mass deletion.
  if (unreadable.has(CONTEXTS_REGISTRY_REL)) {
    for (const [id, p] of Object.entries(recorded)) {
      if ((p.kind === 'context' || p.kind === 'space') && !(id in out)) out[id] = p
    }
  }
  return out
}

/** With no prior evidence the claimant the baseline records is the ELDEST file, not whatever the walk enumerated first: a copy is born after its original and birth time survives a rename, so a walk-order pick would let the accidental copy keep the identity. */
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

export async function runOpenLedger(root: string, tree: NexusTree): Promise<void> {
  try {
    const prior = readBaseline()
    const unreadablePaths = (tree.unreadable ?? []).map((u) => u.path)
    // The re-mint runs between the walk and the latch — the baseline must record the re-minted state, or the next open reports every fresh id as a creation.
    const walked = projectBaseline(tree)
    const reminted = await runRemintPass(root, walked, prior, unreadablePaths)
    const projection = applyRemints(walked, reminted)
    await recordEldest(root, projection, prior)
    writeBaseline(latchBaseline(projection, tree.unreadable ?? [], prior))
    // This walk observed pre-remint disk, so it seeds the session only when the remint wrote nothing; otherwise two entities would share an id, colliding every id-keyed store, and a re-walk that fails leaves no tree, which the next read walks for.
    if (reminted.length === 0) seedLiveTree(tree)
    else await refreshTree(root)
  } catch (e) {
    console.error('ledger: the open pass failed:', errText(e))
  }
}

export function readBaseline(): Baseline | null {
  return readKey<Baseline>('record', 'baseline')
}

export function writeBaseline(baseline: Baseline): boolean {
  return writeKey('record', 'baseline', baseline)
}
