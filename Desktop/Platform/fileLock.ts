import { AsyncLocalStorage } from 'node:async_hooks'

const fileChains = new Map<string, Promise<unknown>>()

const heldKeys = new AsyncLocalStorage<Map<string, { settled: boolean }>>()

export function serializeOnFile<T>(path: string, fn: () => Promise<T>): Promise<T> {
  const held = heldKeys.getStore()
  if (held?.get(path)?.settled === false) {
    return Promise.reject(
      new Error(
        `Re-entrant file lock on ${path}. A write already holding this key cannot take it again — ` +
          'use the reads and writes directly inside the lock you hold, not a primitive that takes its own.',
      ),
    )
  }
  const live = { settled: false }
  const next = new Map(held).set(path, live)
  const guarded = (): Promise<T> =>
    heldKeys.run(next, fn).finally(() => {
      live.settled = true
    })
  const run = (fileChains.get(path) ?? Promise.resolve()).then(guarded, guarded)
  const release = (): void => {
    if (fileChains.get(path) === tail) fileChains.delete(path)
  }
  const tail = run.then(release, release)
  fileChains.set(path, tail)
  return run
}

/** Settles once every locked write queued so far has landed. */
export const drainFileLocks = (): Promise<void> =>
  Promise.all(fileChains.values()).then(() => undefined)
