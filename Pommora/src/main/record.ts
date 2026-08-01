// The baseline half of the record: project the tree the open path already holds into one
// per-entity map, latch it against the prior session's baseline, and persist both the baseline
// and the last non-empty drift as device-local rows. Derived, per-machine, rebuildable.

import { type BaselineDiff, diffBaselines, type EntityRecord, isEmptyDiff } from '@shared/record'
import { errText } from '@shared/result'
import type { NexusTree, PageNode, SetNode } from '@shared/types'
import { readKey, writeKey } from './db/localState'
import { isAdoptedId } from './ids'
import { CONTEXTS_REGISTRY_REL } from './paths'
import { readNexus } from './readNexus'

/** `ambiguous` marks an id the walk saw at 2+ paths that the prior session could not
 *  adjudicate — its recorded path is stale by construction, so it leaves the diff. */
export type BaselineEntry = EntityRecord & { ambiguous?: true }
export type Baseline = Record<string, BaselineEntry>

export interface Projection {
  /** The first claimant wins a duplicated id here; the latch resolves against the prior. */
  entries: Record<string, EntityRecord>
  /** Every claimant of an id seen at 2+ paths, walk order. */
  duplicates: Record<string, EntityRecord[]>
}

/** Projects the walked tree — never a second walk. Adopted ids are addresses, not identities,
 *  so they never enter; Contexts join from the registry-backed groups. */
export function projectBaseline(tree: NexusTree): Projection {
  const entries: Record<string, EntityRecord> = {}
  const claimants: Record<string, EntityRecord[]> = {}
  const add = (e: EntityRecord): void => {
    if (isAdoptedId(e.id)) return
    claimants[e.id] ??= []
    claimants[e.id].push(e)
    entries[e.id] ??= e
  }
  const addPage = (p: PageNode): void =>
    add({ id: p.id, kind: 'page', title: p.title, path: p.path, state: 'present' })
  const addSets = (sets: SetNode[] | undefined): void => {
    for (const s of sets ?? []) {
      add({ id: s.id, kind: 'set', title: s.title, path: s.path, state: 'present' })
      for (const p of s.pages) addPage(p)
      addSets(s.sets)
    }
  }
  for (const g of tree.contexts) {
    add({
      id: g.def.id,
      kind: 'context',
      title: g.def.title,
      path: `.nexus/contexts/${g.def.title}`,
      state: 'present',
    })
    for (const s of g.spaces)
      add({ id: s.id, kind: 'space', title: s.title, path: s.path, state: 'present' })
  }
  for (const c of tree.collections) {
    add({ id: c.id, kind: 'collection', title: c.title, path: c.path, state: 'present' })
    for (const p of c.pages) addPage(p)
    addSets(c.sets)
  }
  const duplicates = Object.fromEntries(
    Object.entries(claimants).filter(([, claims]) => claims.length > 1),
  )
  return { entries, duplicates }
}

/** The writer's merge. Three rules, each keeping the baseline honest about what it knows:
 *  a walked path on the unreadable list records `unreadable` (the listing wins — conservative);
 *  a duplicated id keeps the prior entry marked ambiguous while its recorded path still answers,
 *  records the first claimant unmarked when there is no prior to defer to, and drops entirely
 *  when the recorded path is gone (no future session can adjudicate either); an id the walk
 *  lost whose recorded home is on the unreadable list carries through instead of reading as
 *  deleted. */
export function latchBaseline(
  projection: Projection,
  unreadablePaths: readonly string[],
  prior: Baseline | null,
): Baseline {
  const unreadable = new Set(unreadablePaths)
  const out: Baseline = {}
  for (const [id, e] of Object.entries(projection.entries))
    out[id] = unreadable.has(e.path) ? { ...e, state: 'unreadable' } : e
  for (const [id, claims] of Object.entries(projection.duplicates)) {
    const p = prior?.[id]
    if (!p) continue
    if (unreadable.has(p.path)) out[id] = { ...p, state: 'unreadable', ambiguous: true }
    else if (claims.some((c) => c.path === p.path)) out[id] = { ...p, ambiguous: true }
    else delete out[id]
  }
  for (const [id, p] of Object.entries(prior ?? {})) {
    if (!(id in out) && !(id in projection.duplicates) && unreadable.has(p.path))
      out[id] = { ...p, state: 'unreadable' }
  }
  // An unusable registry blanks the whole Contexts layer in one stroke — carry every prior
  // group and Space as unreadable rather than reading the blank as mass deletion.
  if (unreadable.has(CONTEXTS_REGISTRY_REL)) {
    for (const [id, p] of Object.entries(prior ?? {})) {
      if ((p.kind === 'context' || p.kind === 'space') && !(id in out))
        out[id] = { ...p, state: 'unreadable' }
    }
  }
  return out
}

/** The open path's record pass: one explicit walk, latched against the prior session, the
 *  drift kept only when it says something (an uneventful open must not overwrite the one
 *  interesting record), the new baseline written last. A failed walk retains the prior
 *  baseline — the open itself proceeds. */
export async function runOpenRecord(root: string): Promise<void> {
  let tree: NexusTree
  try {
    tree = await readNexus(root)
  } catch (e) {
    console.error('record: open walk failed; the prior baseline stands:', errText(e))
    return
  }
  latchOpenTree(tree)
}

/** Ambiguous entries leave both sides of the diff: their recorded path is stale by
 *  construction, and re-reporting the same phantom every open would overwrite the
 *  last-non-empty drift row. */
const unambiguous = (b: Baseline): Record<string, EntityRecord> =>
  Object.fromEntries(Object.entries(b).filter(([, e]) => !e.ambiguous))

/** The tree half of the open pass, split from the walk so fixtures can drive it directly. */
export function latchOpenTree(tree: NexusTree): void {
  const prior = readBaseline()
  const unreadablePaths = (tree.unreadable ?? []).map((u) => u.path)
  const next = latchBaseline(projectBaseline(tree), unreadablePaths, prior)
  if (prior !== null) {
    const drift = diffBaselines(unambiguous(prior), unambiguous(next))
    if (!isEmptyDiff(drift)) writeDrift(drift)
  }
  writeBaseline(next)
}

export function readBaseline(): Baseline | null {
  return readKey<Baseline>('record', 'baseline')
}

export function writeBaseline(baseline: Baseline): boolean {
  return writeKey('record', 'baseline', baseline)
}

export function readDrift(): BaselineDiff | null {
  return readKey<BaselineDiff>('record', 'drift')
}

export function writeDrift(drift: BaselineDiff): boolean {
  return writeKey('record', 'drift', drift)
}
