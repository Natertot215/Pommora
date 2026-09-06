/** A Map kept as an insertion-ordered bounded cache: writing a key moves it to newest (the first
 *  key is always the stalest), and an overflow evicts the oldest key(s), running `onEvict` on each
 *  evicted value. */
export function capSet<K, V>(
  map: Map<K, V>,
  key: K,
  value: V,
  cap: number,
  onEvict?: (value: V) => void,
): void {
  map.delete(key)
  map.set(key, value)
  while (map.size > cap) {
    const oldest = map.keys().next().value as K
    const evicted = map.get(oldest) as V
    map.delete(oldest)
    onEvict?.(evicted)
  }
}
