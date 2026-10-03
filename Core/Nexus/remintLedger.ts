import { join } from '../Paths/posix'
import { machine } from '../Platform/machine'
import { type EntityRecord, recordById, recordsOf } from './record'
import { errText } from '../Contract/result'
import type { NexusTree, Unreadable } from './tree'
import { withheldIn } from './treePatch'
import { readKey, writeKey } from '../Platform/localState'
import { applyRemints, runRemintPass } from './remint'

export type Baseline = Record<string, EntityRecord>

export interface Projection {
  entries: Readonly<Record<string, EntityRecord>>
  duplicates: Record<string, EntityRecord[]>
}

export function projectBaseline(tree: NexusTree): Projection {
  const claimants: Record<string, EntityRecord[]> = {}
  for (const r of recordsOf(tree)) {
    claimants[r.id] ??= []
    claimants[r.id].push(r)
  }
  const duplicates = Object.fromEntries(
    Object.entries(claimants).filter(([, claims]) => claims.length > 1),
  )
  return { entries: recordById(tree), duplicates }
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
  if (listed.some((u) => u.kind === 'registry')) {
    for (const [id, p] of Object.entries(recorded)) {
      if ((p.kind === 'context' || p.kind === 'space') && !(id in out)) out[id] = p
    }
  }
  return out
}

/** With no prior evidence the claimant the baseline records is the ELDEST file, not whatever the walk enumerated first: a copy is born after its original and birth time survives a rename, so a walk-order pick would let the accidental copy keep the identity. */
async function pickEldest(
  root: string,
  projection: Projection,
  prior: Baseline | null,
): Promise<Projection> {
  const entries = { ...projection.entries }
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
    entries[id] = claims[eldest]
  }
  return { ...projection, entries }
}

export async function runOpenLedger(root: string, tree: NexusTree): Promise<void> {
  try {
    const prior = readBaseline()
    const unreadablePaths = (tree.unreadable ?? []).map((u) => u.path)
    // The re-mint runs between the walk and the latch — the baseline must record the re-minted state, or the next open reports every fresh id as a creation.
    const walked = projectBaseline(tree)
    const reminted = await runRemintPass(root, walked, prior, unreadablePaths)
    const projection = await pickEldest(root, applyRemints(walked, reminted), prior)
    writeBaseline(latchBaseline(projection, tree.unreadable ?? [], prior))
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
