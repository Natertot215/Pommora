import { recase } from '../../Files/atomicWrite'
import { listPathsUnder } from '../../Files/walk'
import { foldKey } from '../../Paths/caseFold'
import { manifestAdmits, sameScope, type WatchScope } from '../../Paths/exclusion'
import { holdable } from '../Arrival/land'
import type { Change } from '../Contract/wire'
import { deleteBase, readAllBases, readBase } from './base'
import { call } from './call'
import { landRemote, setCursor } from './pull'
import { pushDirty, resolveStale } from './push'
import type { Session } from './session'
import { setStatus } from './status'
import { setTapScope } from './tap'

interface Log {
  heads: Map<string, Change>
  top: number
}

async function readLog(session: Session): Promise<Log | null> {
  const heads = new Map<string, Change>()
  let cursor = 0
  for (;;) {
    const outcome = await call(session.host, session.target, 'pull', {
      nexusId: session.nexusId,
      cursor,
      waitMs: 0,
      heads: true,
    })
    if (outcome.reply === null) return null
    for (const change of outcome.reply.changes) {
      if (change.from !== undefined) heads.set(change.from, change)
      heads.set(change.path, change)
    }
    cursor = outcome.reply.cursor
    if (!outcome.reply.hasMore) return { heads, top: cursor }
  }
}

const settled = (rel: string, head: Change): boolean =>
  head.path === rel && head.record !== undefined && readBase(rel)?.blobSha === head.record.sha256

const folders = (rel: string): string[] =>
  rel
    .split('/')
    .slice(0, -1)
    .map((_, i, segments) => segments.slice(0, i + 1).join('/'))

// A file sync doesn't yet track takes the case the hub spells it in, unless that would recase a folder holding a file sync tracks; a spelling the base row knows is this disk's own rename, which collect ships.
async function adoptHubCase(session: Session, heads: Map<string, Change>): Promise<string[]> {
  const local = await admittedPaths(session)
  const live = new Map<string, string | null>()
  for (const [rel, head] of heads) {
    if (head.kind === 'delete' || head.path !== rel) continue
    const key = foldKey(rel)
    live.set(key, live.has(key) ? null : rel)
  }
  const tracked = (rel: string): boolean =>
    (heads.get(rel)?.kind ?? 'delete') !== 'delete' || readBase(rel) !== null
  const held = new Set(local.filter(tracked).flatMap(folders))
  let recased = false
  for (const rel of local) {
    const spelled = live.get(foldKey(rel))
    if (!spelled || spelled === rel || tracked(rel)) continue
    const target = folders(spelled)
    if (folders(rel).some((folder, i) => folder !== target[i] && held.has(folder))) continue
    await recase(session.root, spelled)
    recased = true
  }
  return recased ? admittedPaths(session) : local
}

export function admittedPaths(session: Session): Promise<string[]> {
  const admits = manifestAdmits(session.scope)
  return listPathsUnder(session.root, session.root, (rel, _kind, siblings) => admits(rel, siblings))
}

export async function reconcile(session: Session): Promise<void> {
  const admits = manifestAdmits(session.scope)
  const log = await readLog(session)
  if (log === null)
    return setStatus(session.host, {
      state: 'error',
      why: 'The server did not answer the change log.',
    })
  const local = await adoptHubCase(session, log.heads)

  const toPush: string[] = []
  for (const rel of new Set([...local, ...readAllBases().map((row) => row.path)])) {
    const head = log.heads.get(rel)
    if (head === undefined || settled(rel, head)) {
      toPush.push(rel)
      continue
    }
    await resolveStale(session, rel, head, log.heads)
  }
  await pushDirty(session, toPush, true)

  const here = new Set([...local, ...toPush])
  for (const [rel, head] of log.heads) {
    if (head.kind === 'delete' || head.path !== rel) continue
    if (here.has(rel) || readBase(rel) !== null || !admits(rel) || !holdable(rel)) continue
    if ((await landRemote(session, head)) === 'missing')
      return setStatus(session.host, {
        state: 'error',
        why: `The server holds no bytes for ${rel}.`,
      })
  }
  setCursor(session, log.top)
}

export async function rescope(session: Session, scope: WatchScope): Promise<void> {
  if (sameScope(scope, session.scope)) return
  const admits = manifestAdmits(scope)
  for (const row of readAllBases()) if (!admits(row.path)) deleteBase(row.path)
  session.scope = scope
  setTapScope(scope)
  await reconcile(session)
}
