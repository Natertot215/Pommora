import { join } from '../../Paths/posix'
import { writeValue } from '../../Platform/localState'
import { machine } from '../../Platform/machine'
import { landDelete, landRename, landWrite, recordOf } from '../Arrival/land'
import type { Change, ItemRecord, PullReply } from '../Contract/wire'
import { decryptItem } from '../Keys/item'
import type { Ring } from '../Keys/ring'
import { isDirty, readBase } from './base'
import { call, getBlob } from './call'
import { forgetKeys, loadRing, ringName } from './keyring'
import { pushDirty } from './push'
import type { Session } from './session'
import { dirtyPending } from './tap'

export type PullOutcome = 'applied' | 'idle' | 'resync' | 'revoked' | 'error'

export function advance(session: Session, cursor: number): void {
  session.target = { ...session.target, cursor }
  writeValue('sync', session.target)
}

const holds = (change: Change): boolean => {
  const base = readBase(change.path)
  return base !== null && change.seq <= base.version
}

async function reloaded(session: Session): Promise<Ring | null> {
  const outcome = await call(session.host, session.target, 'info', { nexusId: session.nexusId })
  if (outcome.reply === null) return null
  return loadRing(session.host, session.nexusId, outcome.reply.info, null)
}

async function opened(session: Session, record: ItemRecord, blob: Uint8Array): Promise<Uint8Array> {
  const bytes = new Uint8Array(blob)
  try {
    return await decryptItem(session.ring, record.keyId, record.path, bytes)
  } catch (e) {
    if (!String(e).includes('unknown-key')) throw e
    const ring = await reloaded(session)
    if (ring === null) throw e
    session.ring = ring
    return decryptItem(ring, record.keyId, record.path, bytes)
  }
}

export async function landRemote(session: Session, change: Change): Promise<'ok' | 'missing'> {
  const record = recordOf(change)
  const blob = await getBlob(session.host, session.target, session.nexusId, record.sha256)
  if (blob === null) return 'missing'
  await landWrite(session.host, session.root, change, await opened(session, record, blob))
  return 'ok'
}

async function landChange(session: Session, change: Change): Promise<'ok' | 'missing'> {
  if (holds(change)) return 'ok'
  if (dirtyPending().has(change.path) || (await isDirty(session.root, change.path))) {
    await pushDirty(session, [change.path])
    if (holds(change)) return 'ok'
  }
  switch (change.kind) {
    case 'write':
      return landRemote(session, change)
    case 'delete':
      await landDelete(session.root, change)
      return 'ok'
    case 'rename': {
      await landRename(session.root, change)
      const landed = await machine().stat(join(session.root, change.path))
      return landed === null ? landRemote(session, change) : 'ok'
    }
  }
}

export type Waited = { kind: 'reply'; reply: PullReply } | { kind: 'done'; outcome: PullOutcome }

export async function pullWait(session: Session, waitMs: number): Promise<Waited> {
  const { host, target, nexusId } = session
  const outcome = await call(
    host,
    target,
    'pull',
    { nexusId, cursor: target.cursor, waitMs },
    { timeoutMs: waitMs + 5_000 },
  )
  if (outcome.status === 409 && outcome.refusal?.error === 'resync') {
    advance(session, 0)
    return { kind: 'done', outcome: 'resync' }
  }
  if (outcome.reply === null) {
    if (
      outcome.refusal?.error === 'not-found' &&
      (await host.secrets.get(ringName(nexusId))) !== null
    ) {
      await forgetKeys(host, nexusId)
      return { kind: 'done', outcome: 'revoked' }
    }
    return { kind: 'done', outcome: 'error' }
  }
  return { kind: 'reply', reply: outcome.reply }
}

export async function applyPull(session: Session, reply: PullReply): Promise<PullOutcome> {
  for (const change of reply.changes) {
    if ((await landChange(session, change)) === 'missing') return 'resync'
    advance(session, change.seq)
  }
  return reply.changes.length > 0 ? 'applied' : 'idle'
}

export async function pullOnce(session: Session, waitMs = 25_000): Promise<PullOutcome> {
  const waited = await pullWait(session, waitMs)
  return waited.kind === 'reply' ? applyPull(session, waited.reply) : waited.outcome
}
