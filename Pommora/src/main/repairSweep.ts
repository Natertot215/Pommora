import { join } from 'node:path'
import { reconcileGovernedRoot, type GovernedWorld } from '@shared/contextResolve'
import type { Adoption } from '@shared/propertyValue'
import type { PropertyDefinition } from '@shared/properties'
import { errText } from '@shared/result'
import { collectionFolderOf } from './CRUD/assignment'
import { assignedDefs, loadContextWorld, NO_CONTEXT_WORLD } from './CRUD/contextWrite'
import { sweepGovernedRoots } from './CRUD/governedSweep'
import { applyAdoptions } from './CRUD/optionOps'
import { rereadSinceSeed } from './indexSeed'
import { sessionDb } from './sessionDb'
import { readLivePersonalization } from './settings'

/** Canonicalize the pages the seed re-read: the reconcile every write runs, over the files that
 *  changed while the app was closed. Best-effort; a failure costs the repair, never the open. */
export async function runRepairSweep(root: string): Promise<void> {
  const files = rereadSinceSeed()
  if (!files.length || (await readLivePersonalization(root)).repairOnOpen !== true) return
  // A nexus switch mid-open swaps the session's database; a sweep that kept writing would index
  // this root's pages into the other nexus's rows — the seed bails the same way.
  const db0 = sessionDb()
  const live = (): boolean => sessionDb() === db0
  try {
    const context = await loadContextWorld(root)
    const base = context.ok ? context.value : NO_CONTEXT_WORLD
    const defsByFolder = new Map<string | null, ReadonlyMap<string, PropertyDefinition>>()
    const worlds = new Map<string, GovernedWorld>()
    for (const rel of files) {
      const abs = join(root, rel)
      const folder = await collectionFolderOf(root, abs)
      let defs = defsByFolder.get(folder)
      if (!defs) {
        defs = await assignedDefs(root, folder)
        defsByFolder.set(folder, defs)
      }
      worlds.set(abs, { ...base, defs })
    }
    if (!live()) return
    // The sweep canonicalizes shape and never removes a value: a key the reconcile would delete
    // stays as written, for the user to settle on the page. Adoptions ride whether or not the
    // file moved — a canonical list can still name an option the definition lacks.
    const adoptions: Adoption[] = []
    await sweepGovernedRoots(root, { kind: 'files', files: [...worlds.keys()] }, (raw, file) => {
      const world = worlds.get(file)
      if (!world || !live()) return null
      const r = reconcileGovernedRoot(raw, world)
      adoptions.push(...r.adoptions)
      const next = { ...r.root }
      for (const k of r.changed) if (!(k in next)) next[k] = raw[k]
      const moved = r.changed.filter((k) => JSON.stringify(next[k]) !== JSON.stringify(raw[k]))
      return moved.length ? { next } : null
    })
    await applyAdoptions(root, adoptions)
  } catch (e) {
    console.error('repair sweep: failed; values repair on their next edit:', errText(e))
  }
}
