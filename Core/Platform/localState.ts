import { errText } from '../Contract/result'
import { keyValueStore } from './stores'

export type Scope =
  | 'folds'
  | 'activeView'
  | 'viewOrder'
  | 'headingCols'
  | 'headingIcon'
  | 'citations'
  | 'embedHeights'
  | 'embedZooms'
  | 'aliases'
  | 'linkTitle'
  | 'tabs'
  | 'windows'
  | 'recents'
  | 'record'
  | 'glancePane'
  | 'devicePrefs'

const SINGLETON = ''

// Only Pommora writes here, so an undecodable row is a bug: dropped and logged, never validated per read.
function decode<T>(scope: Scope, key: string, raw: string): T | undefined {
  try {
    return JSON.parse(raw) as T
  } catch (e) {
    console.error(`local_state: dropping undecodable row ${scope}/${key}:`, errText(e))
    return undefined
  }
}

export function readScope<T>(scope: Scope): Record<string, T> {
  const store = keyValueStore()
  if (!store) return {}
  const out: Record<string, T> = {}
  for (const [key, raw] of Object.entries(store.entries(scope))) {
    const v = decode<T>(scope, key, raw)
    if (v !== undefined) out[key] = v
  }
  return out
}

export function writeKey(scope: Scope, key: string, value: unknown): boolean {
  const store = keyValueStore()
  if (!store) return false
  store.set(scope, key, value === null ? null : JSON.stringify(value))
  return true
}

export function readKey<T>(scope: Scope, key: string): T | null {
  const raw = keyValueStore()?.get(scope, key)
  return raw == null ? null : (decode<T>(scope, key, raw) ?? null)
}

export function readValue<T>(scope: Scope): T | null {
  return readKey<T>(scope, SINGLETON)
}

export function writeValue(scope: Scope, value: unknown): boolean {
  return writeKey(scope, SINGLETON, value)
}
