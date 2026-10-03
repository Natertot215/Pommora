export type Emitter<T = void> = {
  emit: (value: T) => void
  subscribe: (fn: (value: T) => void) => () => void
}

export function emitter<T = void>(): Emitter<T> {
  const subs = new Set<(value: T) => void>()
  return {
    emit: (value) => {
      for (const fn of subs) fn(value)
    },
    subscribe: (fn) => {
      subs.add(fn)
      return () => {
        subs.delete(fn)
      }
    },
  }
}

export type Channel<T> = {
  get: () => T
  set: (next: T) => void
  subscribe: (fn: () => void) => () => void
}

export function channel<T>(initial: T): Channel<T> {
  let value = initial
  const changed = emitter()
  return {
    get: () => value,
    set: (next) => {
      if (Object.is(next, value)) return
      value = next
      changed.emit()
    },
    subscribe: changed.subscribe,
  }
}
