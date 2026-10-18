import type { Result } from '../Contract/result'
import { notifyRetry, reportRefusal, warnCascade } from '../Interface/Notifications/notifications'
import { dialer } from '../Platform/dialer'
import type { SchemaCascade, SchemaJournal } from './propertyJournal'

export const replay = (record?: SchemaJournal) => (): void =>
  void dialer()
    .ask('property:replay', record)
    .then((r) => {
      if (!r.ok) notifyRetry(r.error.message, replay(record))
    })

function landed<T>(r: Result<T>): r is { ok: true; value: T } {
  if (r.ok || r.error.code !== 'owed') return reportRefusal(r)
  notifyRetry(r.error.message, replay())
  return false
}

// Every property write is the same round trip; only the channel and its arguments differ.
export const write = async (res: Promise<Result<null>>): Promise<boolean> => landed(await res)

export const retryOwed = ({ cascade, owed }: SchemaCascade): void =>
  warnCascade(cascade, owed ? replay(owed) : undefined)

export async function warnOwed(res: Promise<Result<SchemaCascade>>): Promise<boolean> {
  const r = await res
  if (!landed(r)) return false
  retryOwed(r.value)
  return true
}
