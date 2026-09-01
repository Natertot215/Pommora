// One pending-op slot on disk, replayed on the next open. A write never displaces a different
// stranded record — its owed heal outranks the op now starting, which runs unjournaled — and a
// clear lands only for the caller's own record on the live session's root.
import { rm } from 'node:fs/promises'
import { readJsonObject, writeJson } from '../IO/atomicWrite'
import { recordWrite } from '../IO/writeEcho'
import { nexusConfig } from '../paths'
import { sessionRoot } from '../session'

export interface JournalSlot<J> {
  read(root: string): Promise<J | null>
  write(root: string, j: J): Promise<void>
  clear(root: string, own: J): Promise<void>
}

export function journalSlot<J>(
  file: string,
  decode: (raw: Record<string, unknown>) => J | null,
  same: (a: J, b: J) => boolean,
  // Lets a newer intent for the SAME entity displace the held record — required by a replay
  // that trusts the record's before-state (context); omitted by one that verifies current state.
  supersedes?: (held: J, incoming: J) => boolean,
): JournalSlot<J> {
  const path = (root: string): string => nexusConfig(root, file)
  const read = async (root: string): Promise<J | null> => {
    const raw = await readJsonObject(path(root))
    return raw ? decode(raw) : null
  }
  return {
    read,
    write: async (root, j) => {
      const held = await read(root)
      if (held && !same(held, j) && !supersedes?.(held, j)) return
      await writeJson(path(root), j)
    },
    clear: async (root, own) => {
      if (sessionRoot() !== root) return
      const held = await read(root)
      if (!held || !same(held, own)) return
      // The unlink is a `.nexus` event the watcher classifies full-refresh; echo it away.
      recordWrite(path(root))
      await rm(path(root), { force: true })
    },
  }
}
