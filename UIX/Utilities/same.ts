export function sameItems<T>(a: ArrayLike<T>, b: ArrayLike<T>): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

export const sameSet = <T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean =>
  a.size === b.size && [...a].every((k) => b.has(k))
