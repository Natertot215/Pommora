import { listPathsUnder } from '../../Files/walk'
import { manifestAdmits, sameScope, type WatchScope } from '../../Paths/exclusion'
import type { Change } from '../Contract/wire'
import { deleteBase, readAllBases, readBase } from './base'
import { call } from './call'
import { advance, landRemote } from './pull'
import { pushDirty, resolveStale } from './push'
import type { Session } from './session'
import { setStatus } from './status'

interface Log {
  heads: Map<string, Change>
  top: number
}

async function readLog(session: Session): Promise<Log | null> {
  const heads = new Map<string, Change>()
  let top = 0
  let cursor = 0
  for (;;) {
    const outcome = await call(session.host, session.target, 'pull', {
      nexusId: session.nexusId,
      cursor,
      waitMs: 0,
    })
    if (outcome.reply === null) return null
    for (const change of outcome.reply.changes) {
      if (change.from !== undefined) heads.set(change.from, change)
      heads.set(change.path, change)
      top = change.seq
    }
    cursor = outcome.reply.cursor
    if (!outcome.reply.hasMore) return { heads, top }
  }
}

const stalled = (session: Session, why: string): void => {
  setStatus(session.ctx, { state: 'error', why })
}

const settled = (rel: string, head: Change): boolean =>
  head.path === rel && head.record !== undefined && readBase(rel)?.blobSha === head.record.sha256

export async function reconcile(session: Session): Promise<void> {
  const { root } = session
  const admits = manifestAdmits(session.scope)
  const local = await listPathsUnder(root, root, (rel, _kind, siblings) => admits(rel, siblings))
  const log = await readLog(session)
  if (log === null) return stalled(session, 'The hub did not answer the change log.')

  const toPush: string[] = []
  for (const rel of local) {
    const head = log.heads.get(rel)
    if (head === undefined) {
      toPush.push(rel)
      continue
    }
    if (!settled(rel, head)) await resolveStale(session, rel, head)
  }
  await pushDirty(session, toPush)

  const here = new Set(local)
  for (const [rel, head] of log.heads) {
    if (head.kind === 'delete' || head.path !== rel) continue
    if (here.has(rel) || readBase(rel) !== null || !admits(rel)) continue
    if ((await landRemote(session, head)) === 'missing')
      return stalled(session, `The hub holds no bytes for ${rel}.`)
  }
  advance(session, log.top)
}

export async function rescope(session: Session, scope: WatchScope): Promise<void> {
  if (sameScope(scope, session.scope)) return
  const admits = manifestAdmits(scope)
  for (const row of readAllBases()) if (!admits(row.path)) deleteBase(row.path)
  session.scope = scope
  await reconcile(session)
}
