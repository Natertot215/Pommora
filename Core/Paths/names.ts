import type { Result } from '../Contract/result'
import { machine } from '../Platform/machine'
import { foldKey } from './caseFold'
import { CROPS_REL } from './nexusPaths'

export type NameRole = 'page' | 'directory'

const WINDOWS_DEVICE = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

// Every rule a name is held to, in one place. Returns the message to show, or null when the name is allowed.
export function nameError(name: string, role: NameRole): string | null {
  const trimmed = name.trim()
  if (
    !trimmed ||
    name.includes('/') ||
    name.includes('\\') ||
    name.includes('\0') ||
    trimmed === '.' ||
    trimmed === '..'
  )
    return `"${name}" is not a valid name.`
  // Trailing dots and spaces are stripped silently on Windows, so a name carrying them would land on disk under a different title than the one that was typed.
  if (name !== trimmed) return `"${name}" can't begin or end with a space.`
  // The walk hides these, so a file named this way could never be shown again.
  if (name.startsWith('.') || name.startsWith('_'))
    return `"${name}" can't begin with a dot or underscore.`
  // `|` opens the alias segment of `[[Title|alias]]`; a title holding one could never resolve back to itself as a connection.
  if (name.includes('|')) return `"${name}" can't contain "|".`
  if (role === 'page' && /\.md$/i.test(name)) return `"${name}" can't end in ".md".`
  // A dotted directory title reads as a file and can shadow a config leaf like crops.json.
  if (role === 'directory' && name.includes('.')) return `"${name}" can't contain a period.`
  if (machine().platform === 'windows') {
    if (/[<>:"?*]/.test(name)) return `"${name}" can't contain < > : " ? * on Windows.`
    if (WINDOWS_DEVICE.test(name)) return `"${name}" is a reserved device name on Windows.`
    if (/[ .]$/.test(name)) return `"${name}" can't end in a space or period on Windows.`
  }
  return null
}

// The relocated crops.json is the one asset-root leaf a written file may never shadow, case-folded to match a case-insensitive disk.
export function reservedAssetLeaf(rel: string): boolean {
  return foldKey(rel) === foldKey(CROPS_REL)
}

// The one place the app decides what a stepped-aside name looks like, so a page, a folder and an adopted file all read the same way. Bounded: a name that has collided fifty times is a caller's problem, not a loop's.
export async function createDisambiguated<T>(
  baseName: string,
  attempt: (name: string) => Promise<Result<T>>,
): Promise<Result<T>> {
  let last = await attempt(baseName)
  for (let n = 2; n <= 50 && !last.ok && last.error.code === 'exists'; n++) {
    last = await attempt(`${baseName} ${n}`)
  }
  return last
}
