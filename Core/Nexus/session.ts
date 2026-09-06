import { machine } from '../Platform/machine'

let currentRoot: string | null = null

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
