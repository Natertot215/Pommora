import { join } from '../Paths/posix'
import {
  governedWorld,
  reconcileGovernedRoot,
  type GovernedWorld,
} from '../Contexts/contextResolve'
import type { PropertyDefinition } from './properties'
import { errText } from '../Contract/result'
import { assignedDefs } from './assignment'
import { liveTreeOf } from '../Nexus/liveTree'
import { owningCollection } from '../Nexus/treePatch'
import { type Rewrite, sweepGovernedRoots } from './governedSweep'
import type { SeedReread } from '../Index/indexSeed'
import { contentIndexStore } from '../Platform/stores'
import { readLiveSetting } from '../Settings/settings'

export async function runRepairSweep(root: string, reread: SeedReread): Promise<void> {
  // A nexus switch since the seed swaps the session's database; a sweep that kept writing would index this root's pages into the other nexus's rows.
  const live = (): boolean => contentIndexStore() === reread.db
  if (!reread.rels.length || !live() || !(await readLiveSetting(root, 'repairOnOpen'))) return
  try {
    const defsByFolder = new Map<string | null, ReadonlyMap<string, PropertyDefinition>>()
    const worlds = new Map<string, GovernedWorld>()
    const tree = await liveTreeOf(root)
    for (const rel of reread.rels) {
      const abs = join(root, rel)
      const owner = owningCollection(tree, rel)
      const folder = owner ? join(root, owner.path) : null
      let defs = defsByFolder.get(folder)
      if (!defs) {
        defs = await assignedDefs(root, folder)
        defsByFolder.set(folder, defs)
      }
      worlds.set(abs, governedWorld(tree, defs))
    }
    if (!live()) return
    const raw: Rewrite = (fm, file) => {
      const world = worlds.get(file)
      return world && live() ? reconcileGovernedRoot(fm, world).root : null
    }
    await sweepGovernedRoots(root, [...worlds.keys()], { raw })
  } catch (e) {
    console.error('repair sweep: failed; values repair on their next edit:', errText(e))
  }
}
