import { ok, type Result } from '@shared/result'
import { flushPageSave } from './pageFlush'
import { pagesByIdOf } from '../treeIndex'
import { useSession, type PreviewTarget } from '../store'

/** Restore's renderer half: land the page's pending save at its live path, ask main to write the
 *  snapshot's body, then replace the body in every open copy of the page. */
export async function restoreSnapshot(target: PreviewTarget, ts: number): Promise<Result<null>> {
  const { tree, replaceBody } = useSession.getState()
  const live = (tree && pagesByIdOf(tree).get(target.id)?.path) ?? target.path
  await flushPageSave(live)
  const r = await window.nexus.restoreSnapshot(target.id, ts)
  if (!r.ok) return r
  await replaceBody(r.value.path)
  return ok(null)
}
