// A write displaces nothing it can't read and no different stranded record — its owed heal outranks the op now starting, which runs unjournaled — while a corrupt slot is set aside by the next write, and a clear lands only for the caller's own record.
import { readJsonStrictly, setAside, type StrictMiss, writeJson } from '../Files/atomicWrite'
import { recordWrite } from '../Files/writeEcho'
import { machine } from '../Platform/machine'
import { nexusConfig } from '../Paths/paths'

interface JournalSlot<J> {
  read(root: string): Promise<J | null>
  write(root: string, j: J): Promise<boolean>
  clear(root: string, own: J): Promise<void>
}

type Held<J> = { kind: 'held'; record: J } | { kind: StrictMiss }

export function journalSlot<J>(
  file: string,
  decode: (raw: Record<string, unknown>) => J | null,
  same: (a: J, b: J) => boolean,
  // Lets a newer intent for the SAME entity displace the held record — required by a replay that trusts the record's before-state, omitted by one that verifies current state.
  supersedes?: (held: J, incoming: J) => boolean,
): JournalSlot<J> {
  const path = (root: string): string => nexusConfig(root, file)
  const held = async (root: string): Promise<Held<J>> => {
    const read = await readJsonStrictly(path(root))
    if (read.kind !== 'ok') return { kind: read.kind }
    const record = decode(read.value)
    return record ? { kind: 'held', record } : { kind: 'corrupt' }
  }
  return {
    read: async (root) => {
      const h = await held(root)
      return h.kind === 'held' ? h.record : null
    },
    write: (root, j) =>
      machine().lock(path(root), async () => {
        const h = await held(root)
        if (h.kind === 'unreadable') return false
        if (h.kind === 'held' && !same(h.record, j) && !supersedes?.(h.record, j)) return false
        if (h.kind === 'corrupt') await setAside(path(root))
        await writeJson(path(root), j)
        return true
      }),
    clear: (root, own) =>
      machine().lock(path(root), async () => {
        const h = await held(root)
        if (h.kind !== 'held' || !same(h.record, own)) return
        // The unlink is a `.nexus` event the watcher classifies full-refresh; echo it away.
        recordWrite(path(root))
        await machine().remove(path(root))
      }),
  }
}
