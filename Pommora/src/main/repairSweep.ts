import { join } from 'node:path'
import { reconcileGovernedRoot, type GovernedWorld } from '@shared/contextResolve'
import type { PropertyDefinition } from '@shared/properties'
import { errText } from '@shared/result'
import { collectionFolderOf } from './CRUD/assignment'
import { assignedDefs, loadContextWorld, NO_CONTEXT_WORLD } from './CRUD/contextWrite'
import { sweepGovernedRoots } from './CRUD/governedSweep'
import { applyAdoptions } from './CRUD/optionOps'
import { rereadSinceSeed } from './indexSeed'
import { readLivePersonalization } from './settings'

/** Canonicalize the pages the seed re-read: the reconcile every write runs, over the files that
 *  changed while the app was closed. Best-effort; a failure costs the repair, never the open. */
export async function runRepairSweep(root: string): Promise<void> {
  const files = rereadSinceSeed()
  if (!files.length || (await readLivePersonalization(root)).repairOnOpen !== true) return
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
    const swept = await sweepGovernedRoots(
      root,
      { kind: 'files', files: [...worlds.keys()] },
      (raw, file) => {
        const world = worlds.get(file)
        if (!world) return null
        const r = reconcileGovernedRoot(raw, world)
        return r.changed.length ? { next: r.root, capture: r.adoptions } : null
      },
    )
    await applyAdoptions(root, swept.captured.flat())
  } catch (e) {
    console.error('repair sweep: failed; values repair on their next edit:', errText(e))
  }
}
