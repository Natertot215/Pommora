// One debounced body writer shared by the page autosave and the markdown tile.

const SAVE_DEBOUNCE_MS = 400

type Ack = { ok: boolean }
type Save = () => Promise<Ack>

export interface BodyWriter {
  schedule: (key: string, body: string, save: Save) => void
  flush: (key: string) => Promise<void>
  flushAll: () => Promise<void>
  cancel: (key: string) => void
}

export function createBodyWriter(): BodyWriter {
  const pending = new Map<
    string,
    { body: string; save: Save; timer: ReturnType<typeof setTimeout> }
  >()

  const flush = (key: string): Promise<void> => {
    const p = pending.get(key)
    if (!p) return Promise.resolve()
    clearTimeout(p.timer)
    pending.delete(key)
    return p.save().then((ack) => {
      if (!ack.ok && !pending.has(key)) schedule(key, p.body, p.save)
    })
  }

  const schedule = (key: string, body: string, save: Save): void => {
    const prev = pending.get(key)
    if (prev) clearTimeout(prev.timer)
    pending.set(key, { body, save, timer: setTimeout(() => void flush(key), SAVE_DEBOUNCE_MS) })
  }

  const cancel = (key: string): void => {
    const p = pending.get(key)
    if (p) clearTimeout(p.timer)
    pending.delete(key)
  }

  const flushAll = (): Promise<void> =>
    Promise.all([...pending.keys()].map(flush)).then(() => undefined)

  // beforeunload can't await, but the IPC send gets out before teardown.
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      for (const key of pending.keys()) void flush(key)
    })
  }

  return { schedule, flush, flushAll, cancel }
}
