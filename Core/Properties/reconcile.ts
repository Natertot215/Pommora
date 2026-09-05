// The one spend-per-landed-write loop. An entry leaves the set only when its write actually
// lands: refused, gone, or throwing entries stay kept for a later pass, and one failure never
// stops the rest. The Remove cache's restore and the trash restore's membership re-apply both
// spend through here — the storage differs, the loop does not.

export async function reconcile<T>(
  entries: Record<string, T>,
  apply: (id: string, value: T) => Promise<boolean>,
): Promise<{ spent: string[]; kept: Record<string, T> }> {
  const kept = { ...entries }
  const spent: string[] = []
  for (const [id, value] of Object.entries(entries)) {
    let landed = false
    try {
      landed = await apply(id, value)
    } catch {
      landed = false
    }
    if (landed) {
      delete kept[id]
      spent.push(id)
    }
  }
  return { spent, kept }
}
