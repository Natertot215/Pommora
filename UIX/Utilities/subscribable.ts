export type Channel<T> = {
  get: () => T
  set: (next: T) => void
  subscribe: (fn: () => void) => () => void
}

export function channel<T>(initial: T): Channel<T> {
  let value = initial
  const subs = new Set<() => void>()
  return {
    get: () => value,
    set: (next) => {
      if (Object.is(next, value)) return
      value = next
      for (const fn of subs) fn()
    },
    subscribe: (fn) => {
      subs.add(fn)
      return () => {
        subs.delete(fn)
      }
    },
  }
}
