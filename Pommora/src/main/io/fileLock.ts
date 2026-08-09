// The per-file write lock. Every read-modify-write on disk runs under it — pages, container and
// Space sidecars, settings, navigation — so overlapping RMWs on one file serialize instead of
// racing: a stale snapshot losing to a fresh write, or a cascade dropping a value a concurrent
// edit just set.
//
// It imports only `AsyncLocalStorage`, deliberately: the writers depend on the lock and never the
// reverse.
//
// The key is the literal string handed in, and nothing checks that two callers touching one file
// hand over the same one. A file with more than one writer therefore builds its key in a single
// place — `sidecarPath` for folder sidecars — because two spellings of one path are two locks,
// and neither waits for the other.
//
// The chain is NOT reentrant: taking a key already held would queue behind a slot that is waiting
// on the queued work, which never resolves and leaves that file wedged for the life of the
// process. Since `rmwJsonStrict` and `rewritePageSerialized` take their own key, a caller reaching
// for one from inside a lock on the same path is an ordinary mistake to make, so it is refused
// rather than left to hang. The refusal happens before the chain is touched, so the file it names
// stays usable.

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
