// The per-file write lock. Every read-modify-write on disk runs under it — pages, container and
// Space sidecars, settings, navigation — so overlapping RMWs on one file serialize instead of
// racing: a stale snapshot losing to a fresh write, or a cascade dropping a value a concurrent
// edit just set. A schema-op page cascade and a table cell edit on the same page are the
// original pair; a container sidecar has six writers.
//
// The key is the literal string handed in, and nothing checks that two callers touching one file
// hand over the same one. A file with more than one writer therefore builds its key in a single
// place — `sidecarPath` for folder sidecars — because two spellings of one path are two locks,
// and neither waits for the other.

import { readFile } from 'node:fs/promises'
import { atomicWriteFile } from './atomicWrite'

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

/** Rewrite ONE page under its file lock, reading FRESH inside the lock so a concurrent
 *  cell-write is never clobbered by a stale pre-read. `rewrite` maps current content → next
 *  content, or null to leave the page untouched. An unreadable file is skipped. Returns
 *  whether the page was written. */
export async function rewritePageSerialized(
  file: string,
  rewrite: (content: string) => string | null,
): Promise<boolean> {
  return serializeOnFile(file, async () => {
    let content: string
    try {
      content = await readFile(file, 'utf8')
    } catch {
      return false
    }
    const next = rewrite(content)
    if (next === null) return false
    await atomicWriteFile(file, next)
    return true
  })
}
