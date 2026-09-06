import { fail, ok, type Result } from '@pommora/core/Contract/result'
import { flushPageSave } from '../Session/saveScheduler'
import { livePagePath } from '../Session/treeIndex'
import { useSession, type WindowTarget } from '../Session/store'
import { host } from '../Platform/dialer'

export async function restoreSnapshot(target: WindowTarget, ts: number): Promise<Result<null>> {
  const { tree, replaceBody } = useSession.getState()
  const live = livePagePath(tree, target)
  await flushPageSave(live)
  const r = await host().ask('history:restore', target.id, ts)
  if (!r.ok) return r
  return (await replaceBody(r.value.path))
    ? ok(null)
    : fail('operation-failed', 'The page was restored but could not be reread.')
}
