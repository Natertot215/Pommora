import { join, relative } from '../Paths/posix'
import { governedWorld, reconcileGovernedRoot, type GovernedWorld } from '../Nexus/governedRoot'
import type { PropertyDefinition } from './properties'
import { errText } from '../Contract/result'
import { liveTreeOf } from '../Nexus/liveTree'
import { storedNodes } from '../Nexus/heldPages'
import { containerSchema } from '../Nexus/treePatch'
import { type Rewrite, sweepGovernedRoots } from '../Nexus/governedSweep'
import type { SeedReread } from '../Index/indexSeed'
import { contentIndexStore } from '../Platform/stores'
import { readLiveSetting } from '../Settings/settings'

export async function runRepairSweep(root: string, reread: SeedReread): Promise<void> {
  // A nexus switch since the seed swaps the session's database; a sweep that kept writing would index this root's pages into the other nexus's rows.
  const live = (): boolean => contentIndexStore() === reread.db
  if (!reread.rels.length || !live() || !(await readLiveSetting(root, 'repairOnOpen'))) return
  try {
    const worlds = new Map<readonly PropertyDefinition[], GovernedWorld>()
    const tree = await liveTreeOf(root)
    const stored = await storedNodes(root, tree)
    const raw: Rewrite = (fm, file) => {
      const schema = containerSchema(tree, relative(root, file), stored)
      const world = worlds.get(schema) ?? governedWorld(tree, schema)
      worlds.set(schema, world)
      return live() ? reconcileGovernedRoot(fm, world) : null
    }
    await sweepGovernedRoots(
      reread.rels.map((rel) => join(root, rel)),
      { raw },
    )
  } catch (e) {
    console.error('repair sweep: failed; values repair on their next edit:', errText(e))
  }
}
