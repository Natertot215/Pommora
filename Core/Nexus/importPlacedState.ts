// The one-time move of a pre-move device row into the home that now owns it. It runs inside openNexusSequence, where a throw reaches Desktop/main.ts as "Restore skipped" on launch or aborts the adopt before the watcher arms — so every failure is caught here and the row it belongs to stands.

import { errText } from '../Contract/result'
import { readJsonStrict, writeJson } from '../Files/atomicWrite'
import { withSidecarLock } from '../Files/sidecar'
import { sidecarPath } from '../Paths/paths'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { readScope, writeKey } from '../Platform/localState'
import { getLiveTree, refreshTree } from './liveTree'
import type { CollectionNode, NexusTree, SetNode } from './tree'

type Container = CollectionNode | SetNode

// The visit is hand-rolled rather than reaching for `nodesOf`: that lookup resolves icons through `@pommora/uix`, which this side of the engine boundary cannot import.
function containersIn(tree: NexusTree): Container[] {
  const out: Container[] = []
  const visit = (node: Container): void => {
    out.push(node)
    for (const s of node.sets ?? []) visit(s)
  }
  for (const c of tree.collections) visit(c)
  return out
}

/** Whether anything landed, so the caller can re-walk. An id no container claims keeps its row — the container may be excluded, not gone — and so does one whose write refused. */
export async function importPlacedState(root: string): Promise<boolean> {
  try {
    const chosen = readScope<string>('activeView')
    if (Object.keys(chosen).length === 0) return false
    const held = getLiveTree()
    // Rows are keyed by container id alone, so a tree belonging to another nexus would resolve them against the wrong sidecars and then delete the rows it read.
    const tree = held?.nexus.rootPath === root ? held : await refreshTree(root)
    let landed = false
    for (const node of containersIn(tree)) {
      const viewId = chosen[node.id]
      if (viewId === undefined) continue
      if (!(await placeActiveView(root, node.path, node.kind, viewId))) continue
      writeKey('activeView', node.id, null)
      landed = true
    }
    return landed
  } catch (err) {
    // refreshTree rethrows a failed walk, so the contract above is only kept if the whole pass is wrapped, not just each container's write.
    console.error('Placed-state import skipped:', errText(err))
    return false
  }
}

async function placeActiveView(
  root: string,
  relPath: string,
  kind: 'collection' | 'set',
  viewId: string,
): Promise<boolean> {
  try {
    // The key must be the canonicalized path every mutate op locks on: an unresolved one is a second key, and the lock would serialize against nothing.
    const resolved = await resolveUnderRoot(root, relPath)
    if (!resolved.ok) throw new Error(resolved.error.message)
    return await withSidecarLock(resolved.value, kind, async () => {
      const file = sidecarPath(resolved.value, kind)
      const current = await readJsonStrict(file)
      if (!current.ok) throw new Error(current.error.message)
      // `.nexus/` syncs and `nexus.db` does not, so a sidecar already naming a view was chosen after this row was written: most recent wins, and the row has a home either way.
      if (typeof current.value.active_view !== 'string')
        await writeJson(file, { ...current.value, active_view: viewId })
      return true
    })
  } catch (e) {
    console.error(
      `import: the chosen view for ${relPath} could not land; its row stands:`,
      errText(e),
    )
    return false
  }
}
