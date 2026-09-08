// The one-time move of a pre-move device row into the home that now owns it. It runs inside openNexusSequence, where a throw reaches Desktop/main.ts as "Restore skipped" on launch or aborts the adopt before the watcher arms — so every failure is caught here and the row it belongs to stands.

import { errText } from '../Contract/result'
import { readJsonStrict, writeJson } from '../Files/atomicWrite'
import { withSidecarLock } from '../Files/sidecar'
import { sidecarPath } from '../Paths/paths'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { readScope, writeKey } from '../Platform/localState'
import { getLiveTree } from './liveTree'
import type { CollectionNode, NexusTree, SetNode } from './tree'

type Container = CollectionNode | SetNode

// The live tree the open already holds, never a walk of its own. `nodesOf` is the renderer's lookup — it resolves icons through UIX — so the visit is the one `collectionFolders` makes on this side of the boundary.
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
  const chosen = readScope<string>('activeView')
  if (Object.keys(chosen).length === 0) return false
  const tree = getLiveTree()
  if (!tree) return false
  let landed = false
  for (const node of containersIn(tree)) {
    const viewId = chosen[node.id]
    if (viewId === undefined) continue
    if (!(await placeActiveView(root, node.path, node.kind, viewId))) continue
    writeKey('activeView', node.id, null)
    landed = true
  }
  return landed
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
