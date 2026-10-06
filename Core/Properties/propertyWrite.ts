import type { Result } from '../Contract/result'
import { notifyRetry, reportRefusal, warnCascade } from '../Interface/Notifications/notifications'
import { dialer } from '../Platform/dialer'
import type { SchemaCascade, SchemaJournal } from './propertyJournal'

// Every property write is the same round trip; only the channel and its arguments differ.
export const write = async (res: Promise<Result<null>>): Promise<void> => {
  reportRefusal(await res)
}

export const replay = (record: SchemaJournal) => (): void =>
  void dialer()
    .ask('property:replay', record)
    .then((r) => {
      if (!r.ok) notifyRetry(r.error.message, replay(record))
    })

export const retryOwed = ({ cascade, owed }: SchemaCascade): void =>
  warnCascade(cascade, owed ? replay(owed) : undefined)

export async function warnOwed(res: Promise<Result<SchemaCascade>>): Promise<boolean> {
  const r = await res
  const landed = reportRefusal(r)
  if (landed) retryOwed(r.value)
  return landed
}
