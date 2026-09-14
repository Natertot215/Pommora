import { join } from '../../Paths/posix'
import { writeValue } from '../../Platform/localState'
import { machine } from '../../Platform/machine'
import { captureLoser } from '../Arrival/captures'
import { landDelete, landRename, landWrite, recordOf } from '../Arrival/land'
import type { Change, PullReply } from '../Contract/wire'
import { isDirty, readBase } from './base'
import { call, getBlob } from './call'
import { forgetKeys, openRecord, ringName } from './keyring'
import { pushDirty } from './push'
import type { Session } from './session'
import { dirtyPending } from './tap'

export const LONG_POLL_MS = 25_000

export type PullOutcome = 'applied' | 'idle' | 'resync' | 'revoked' | 'error'

function setCursor(session: Session, cursor: number): void {
  session.target = { ...session.target, cursor }
  writeValue('sync', session.target)
}

export function advance(session: Session, cursor: number): void {
  if (cursor > session.target.cursor) setCursor(session, cursor)
}

const holds = (change: Change): boolean => {
  const base = readBase(change.path)
  return base !== null && change.seq <= base.version
}

export async function landRemote(session: Session, change: Change): Promise<'ok' | 'missing'> {
  const record = recordOf(change)
  const blob = await getBlob(session.host, session.target, session.nexusId, record.sha256)
  if (blob === null) return 'missing'
  await landWrite(session.host, session.root, change, await openRecord(session, record, blob))
  return 'ok'
}

async function landChange(session: Session, change: Change): Promise<'ok' | 'missing' | 'held'> {
  if (holds(change)) return 'ok'
  if (dirtyPending().has(change.path) || (await isDirty(session.root, change.path))) {
    await pushDirty(session, [change.path])
    if (holds(change)) return 'ok'
    if (session.failed.has(change.path)) return 'held'
    const local = await machine().readBytes(join(session.root, change.path))
    if (local !== null && machine().sha256Hex(local) !== readBase(change.path)?.hash)
      await captureLoser(session.root, change.path, local, 'local-lost')
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

type Waited = { kind: 'reply'; reply: PullReply } | { kind: 'done'; outcome: PullOutcome }

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
    setCursor(session, 0)
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
    const landed = await landChange(session, change)
    if (landed === 'missing') return 'resync'
    if (landed === 'held') return 'error'
    advance(session, change.seq)
  }
  return reply.changes.length > 0 ? 'applied' : 'idle'
}

export async function pullOnce(session: Session, waitMs: number): Promise<PullOutcome> {
  const waited = await pullWait(session, waitMs)
  return waited.kind === 'reply' ? applyPull(session, waited.reply) : waited.outcome
}
