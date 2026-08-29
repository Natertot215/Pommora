// The per-file write lock. Every read-modify-write on disk runs under it, so overlapping RMWs on
// one file serialize instead of racing: a stale snapshot losing to a fresh write, or a cascade
// dropping a value a concurrent edit just set.
//
// The writers depend on the lock and never the reverse — nothing here may import them.
//
// The key is the literal string handed in, and nothing checks that two callers touching one file
// hand over the same one. A file with more than one writer therefore builds its key in a single
// place — `sidecarPath` for folder sidecars — because two spellings of one path are two locks,
// and neither waits for the other.
//
// The chain is NOT reentrant: re-taking a held key would queue behind a slot that is itself
// awaiting the queued work, wedging that file for the life of the process. It is refused instead,
// and refused BEFORE the chain is read, so the file the refusal names stays usable.

import { AsyncLocalStorage } from 'node:async_hooks'

const fileChains = new Map<string, Promise<unknown>>()

/** The keys held by the call in flight. Nesting DIFFERENT keys stays legal — only re-taking one
 *  already held is the deadlock. */
const heldKeys = new AsyncLocalStorage<ReadonlySet<string>>()

export function serializeOnFile<T>(path: string, fn: () => Promise<T>): Promise<T> {
  const held = heldKeys.getStore()
  if (held?.has(path)) {
    return Promise.reject(
      new Error(
        `Re-entrant file lock on ${path}. A write already holding this key cannot take it again — ` +
          'use the reads and writes directly inside the lock you hold, not a primitive that takes its own.',
      ),
    )
  }
  const next = new Set(held).add(path)
  const guarded = (): Promise<T> => heldKeys.run(next, fn)
  const run = (fileChains.get(path) ?? Promise.resolve()).then(guarded, guarded)
  fileChains.set(
    path,
    run.then(
      () => undefined,
      () => undefined,
    ),
  )
  return run
}
