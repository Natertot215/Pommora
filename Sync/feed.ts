const MAX_WAIT_MS = 25_000

interface Waiter {
  cursor: number
  resolve(): void
}

const waiters = new Map<string, Set<Waiter>>()

export function wait(nexusId: string, cursor: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const set = waiters.get(nexusId) ?? new Set<Waiter>()
    waiters.set(nexusId, set)
    const waiter: Waiter = {
      cursor,
      resolve: () => {
        clearTimeout(timer)
        set.delete(waiter)
        resolve()
      },
    }
    const timer = setTimeout(waiter.resolve, Math.min(timeoutMs, MAX_WAIT_MS))
    timer.unref()
    set.add(waiter)
  })
}

export function wake(nexusId: string, seq: number): void {
  for (const waiter of [...(waiters.get(nexusId) ?? [])]) {
    if (seq > waiter.cursor) waiter.resolve()
  }
}

export function closeAll(): void {
  for (const set of [...waiters.values()]) {
    for (const waiter of [...set]) waiter.resolve()
  }
  waiters.clear()
}
