import { join } from '../Locations/posix'
import { reconcileGovernedRoot, survivingChanges, type GovernedWorld } from './contextResolve'
import type { Adoption } from './propertyValue'
import type { PropertyDefinition } from './properties'
import { errText } from '../Contract/result'
import { collectionFolderOf } from './assignment'
import { assignedDefs, loadContextWorld, NO_CONTEXT_WORLD } from '../Contexts/contextWrite'
import { type Rewrite, sweepGovernedRoots } from './governedSweep'
import { applyAdoptions } from './optionOps'
import { rereadSinceSeed } from '../Index/indexSeed'
import { contentIndexStore } from '../Platform/stores'
import { readLivePersonalization } from '../Settings/settings'

const memberCount = (v: unknown): number => (Array.isArray(v) ? v.length : 1)

export async function runRepairSweep(root: string): Promise<void> {
  const files = rereadSinceSeed()
  if (!files.length || (await readLivePersonalization(root)).repairOnOpen !== true) return
  // A nexus switch mid-open swaps the session's database; a sweep that kept writing would index this root's pages into the other nexus's rows.
  const db0 = contentIndexStore()
  const live = (): boolean => contentIndexStore() === db0
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
    // The sweep canonicalizes shape and never removes a value: a key the reconcile would delete stays as written, for the user to settle on the page.
    const adoptions: Adoption[] = []
    const raw: Rewrite = (fm, file) => {
      const world = worlds.get(file)
      if (!world || !live()) return null
      const r = reconcileGovernedRoot(fm, world)
      adoptions.push(...r.adoptions)
      const surviving = survivingChanges(r)
      for (const key of Object.keys(surviving)) {
        if (memberCount(surviving[key]) < memberCount(fm[key])) delete surviving[key]
      }
      return { ...fm, ...surviving }
    }
    await sweepGovernedRoots(root, { kind: 'files', files: [...worlds.keys()] }, { raw })
    await applyAdoptions(root, adoptions)
  } catch (e) {
    console.error('repair sweep: failed; values repair on their next edit:', errText(e))
  }
}
