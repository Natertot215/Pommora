// Transient UI chrome — regeneratable, not portable content — so it lives in app-level localStorage, not `.nexus/`.

type OpenMap = Record<string, boolean>

export const DISCLOSURE_KEY = 'pommora.sidebar.disclosure'

// Parsed once per storage object and mutated through saveOpen thereafter — a full JSON.parse per mount adds up fast.
let cached: { storage: Pick<Storage, 'getItem'>; map: OpenMap } | null = null

function readMap(storage: Pick<Storage, 'getItem'>): OpenMap {
  if (cached?.storage === storage) return cached.map
  let map: OpenMap = {}
  try {
    const raw = storage.getItem(DISCLOSURE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    if (parsed !== null && typeof parsed === 'object') map = parsed as OpenMap
  } catch {}
  cached = { storage, map }
  return map
}

export function loadOpen(
  storage: Pick<Storage, 'getItem'>,
  key: string,
  fallback: boolean,
): boolean {
  const value = readMap(storage)[key]
  return typeof value === 'boolean' ? value : fallback
}

export function saveOpen(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  key: string,
  open: boolean,
): void {
  const map = readMap(storage)
  map[key] = open
  try {
    storage.setItem(DISCLOSURE_KEY, JSON.stringify(map))
  } catch {
    // Best-effort chrome: localStorage may be unavailable / over quota.
  }
}
