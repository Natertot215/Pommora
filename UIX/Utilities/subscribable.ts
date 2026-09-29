export type Signal = { subscribe: (fn: () => void) => () => void; notify: () => void }
export type Channel<T> = Pick<Signal, 'subscribe'> & { get: () => T; set: (next: T) => void }

export function signal(): Signal {
  const subs = new Set<() => void>()
  return {
    subscribe: (fn) => {
      subs.add(fn)
      return () => {
        subs.delete(fn)
      }
    },
    notify: () => {
      for (const fn of subs) fn()
    },
  }
}

export function channel<T>(initial: T): Channel<T> {
  let value = initial
  const changed = signal()
  return {
    get: () => value,
    set: (next) => {
      if (Object.is(next, value)) return
      value = next
      changed.notify()
    },
    subscribe: changed.subscribe,
  }
}
