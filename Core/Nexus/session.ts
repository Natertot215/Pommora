import { machine } from '../Platform/machine'

let currentRoot: string | null = null
let adoptingDepth = 0

export const adopting = (): boolean => adoptingDepth > 0

/** Writes answer BUSY while this runs, so a save from the old Nexus's still-open UI can't land in the one being opened. A count: the open path runs more than one pass. */
export async function whileAdopting<T>(work: () => Promise<T>): Promise<T> {
  adoptingDepth++
  try {
    return await work()
  } finally {
    adoptingDepth--
  }
}

export function sessionRoot(): string | null {
  return currentRoot
}

/** Stores the CANONICALIZED (realpath) root: a symlinked ancestry would otherwise key resolveUnderRoot differently and split cell-write locks across buckets, breaking serialization. Falls back to the raw path if realpath fails. */
export async function openSession(root: string): Promise<void> {
  currentRoot = await machine()
    .realpath(root)
    .catch(() => root)
}

export function closeSession(): void {
  currentRoot = null
}
