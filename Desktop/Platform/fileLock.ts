// Two spellings of one path are two locks, so a multi-writer file builds its key in one place. Re-taking a held key would queue behind a slot awaiting itself, so it is refused before the chain is read and the file stays usable.

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
