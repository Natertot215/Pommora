import { inTurns } from '../Platform/inTurns'
import { machine } from '../Platform/machine'

export interface WaitingOpen {
  root: string
  path: string
  why: string
}

// A waiting open is one refused by a file that doesn't parse; no session is open while it waits.
let session: { kind: 'open'; root: string } | { kind: 'waiting'; open: WaitingOpen } | null = null
let adoptingDepth = 0
const adoption = inTurns()

export const adopting = (): boolean => adoptingDepth > 0

/** Writes answer BUSY while this runs, so a save from the old Nexus's still-open UI can't land in the one being opened. Each adoption waits for the one before it, so two opens never interleave. */
export function whileAdopting<T>(work: () => Promise<T>): Promise<T> {
  adoptingDepth++
  return adoption(work).finally(() => {
    adoptingDepth--
  })
}

export function sessionRoot(): string | null {
  return session?.kind === 'open' ? session.root : null
}

export const waitingOpen = (): WaitingOpen | null =>
  session?.kind === 'waiting' ? session.open : null

export function waitOn(open: WaitingOpen): void {
  session = { kind: 'waiting', open }
}

/** Stores the CANONICALIZED (realpath) root: a symlinked ancestry would otherwise key resolveUnderRoot differently and split cell-write locks across buckets, breaking serialization. Falls back to the raw path if realpath fails. */
export async function openSession(root: string): Promise<void> {
  const canonical = await machine()
    .realpath(root)
    .catch(() => root)
  session = { kind: 'open', root: canonical }
}

export function closeSession(): void {
  session = null
}
