// The one-time move of a pre-move device row into the home that now owns it. It runs inside openNexusSequence, where a throw reaches Desktop/main.ts as "Restore skipped" on launch or aborts the adopt before the watcher arms — so every failure is caught here and the row it belongs to stands.

import { errText } from '../Contract/result'
import { readJsonStrict, writeJson } from '../Files/atomicWrite'
import { withSidecarLock } from '../Files/sidecar'
import { sidecarPath } from '../Paths/paths'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { readScope, writeKey } from '../Platform/localState'
import { isPlainObject } from '../Properties/propertyValue'
import { DEFAULT_VIEW_ID } from '../Views/views'
import { getLiveTree } from './liveTree'
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
    const orders = readScope<string[]>('viewOrder')
    if (Object.keys(chosen).length === 0 && Object.keys(orders).length === 0) return false
    const tree = getLiveTree()
    if (!tree) return false
    let landed = false
    for (const node of containersIn(tree)) {
      let viewId: string | undefined = chosen[node.id]
      // A set deep enough to be minted no view of its own shows the placeholder row, and clicking it wrote the sentinel here. It names nothing to carry across, so the row is spent rather than written into a file a person reads.
      if (viewId === DEFAULT_VIEW_ID) {
        writeKey('activeView', node.id, null)
        viewId = undefined
      }
      const held = (node.views ?? []).filter((v) => orders[v.id] !== undefined).map((v) => v.id)
      if (viewId === undefined && held.length === 0) continue
      const placed = Object.fromEntries(held.map((id) => [id, orders[id]]))
      if (!(await placeState(root, node.path, node.kind, viewId, placed))) continue
      if (viewId !== undefined) writeKey('activeView', node.id, null)
      for (const id of held) writeKey('viewOrder', id, null)
      landed = true
    }
    return landed
  } catch (err) {
    // The scope reads and the row deletes reach SQLite outside any container's own catch, so the contract above is only kept by wrapping the whole pass.
    console.error('Placed-state import skipped:', errText(err))
    return false
  }
}

// Both scopes reach one container, so they share one locked read-modify-write: a second take of the same key would be refused, and a second write would cost a file event for a value the first already carried.
async function placeState(
  root: string,
  relPath: string,
  kind: 'collection' | 'set',
  viewId: string | undefined,
  orders: Record<string, string[]>,
): Promise<boolean> {
  try {
    // The key must be the canonicalized path every mutate op locks on: an unresolved one is a second key, and the lock would serialize against nothing.
    const resolved = await resolveUnderRoot(root, relPath)
    if (!resolved.ok) throw new Error(resolved.error.message)
    return await withSidecarLock(resolved.value, kind, async () => {
      const file = sidecarPath(resolved.value, kind)
      const current = await readJsonStrict(file)
      if (!current.ok) throw new Error(current.error.message)
      // `.nexus/` syncs and `nexus.db` does not, so a sidecar already carrying one of these was written after the row was: most recent wins, and the row has a home either way.
      let next = current.value
      if (viewId !== undefined && typeof next.active_view !== 'string')
        next = { ...next, active_view: viewId }
      if (Array.isArray(next.views)) {
        const views = next.views.map((v) => {
          if (!isPlainObject(v) || typeof v.id !== 'string') return v
          const order = orders[v.id]
          return order === undefined || Array.isArray(v.manual_order)
            ? v
            : { ...v, manual_order: order }
        })
        if (views.some((v, i) => v !== (next.views as unknown[])[i])) next = { ...next, views }
      }
      if (next !== current.value) await writeJson(file, next)
      return true
    })
  } catch (e) {
    console.error(
      `import: the placed state for ${relPath} could not land; its rows stand:`,
      errText(e),
    )
    return false
  }
}
