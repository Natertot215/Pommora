// The per-file write lock. Every read-modify-write on disk runs under it — pages, container and
// Space sidecars, settings, navigation — so overlapping RMWs on one file serialize instead of
// racing: a stale snapshot losing to a fresh write, or a cascade dropping a value a concurrent
// edit just set.
//
// It imports nothing, deliberately: the writers depend on the lock and never the reverse.
//
// The key is the literal string handed in, and nothing checks that two callers touching one file
// hand over the same one. A file with more than one writer therefore builds its key in a single
// place — `sidecarPath` for folder sidecars — because two spellings of one path are two locks,
// and neither waits for the other.

const fileChains = new Map<string, Promise<unknown>>()

export function serializeOnFile<T>(path: string, fn: () => Promise<T>): Promise<T> {
  const run = (fileChains.get(path) ?? Promise.resolve()).then(fn, fn)
  fileChains.set(
    path,
    run.then(
      () => undefined,
      () => undefined,
    ),
  )
  return run
}
