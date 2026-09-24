import type { Result } from '../Contract/result'
import { machine } from '../Platform/machine'
import { foldKey } from './caseFold'
import { hiddenName } from './exclusion'
import { isMarkdownFile } from './posix'
import { CROPS_REL } from './nexusPaths'

export type NameRole = 'page' | 'directory'

const WINDOWS_DEVICE = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i

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
  if (name !== trimmed) return `"${name}" can't begin or end with a space.`
  // The walk hides these, so a file named this way could never be shown again.
  if (hiddenName(name)) return `"${name}" can't begin with a dot or underscore.`
  if (/[|#§]/.test(name)) return `"${name}" can't contain "|", "#", or "§".`
  if (role === 'page' && isMarkdownFile(name)) return `"${name}" can't end in ".md".`
  if (role === 'directory' && name.includes('.')) return `"${name}" can't contain a period.`
  return platformNameError(name)
}

// The host decides only what it can create or hold; a name another host allowed still syncs everywhere else.
export function platformNameError(name: string): string | null {
  if (machine().platform !== 'windows') return null
  if (/[<>:"?*]/.test(name)) return `"${name}" can't contain < > : " ? * on Windows.`
  if (WINDOWS_DEVICE.test(name)) return `"${name}" is a reserved device name on Windows.`
  if (/\.$/.test(name)) return `"${name}" can't end in a period on Windows.`
  return null
}

// The relocated crops.json is the one asset-root leaf a written file may never shadow, case-folded to match a case-insensitive disk.
export function reservedAssetLeaf(rel: string): boolean {
  return foldKey(rel) === foldKey(CROPS_REL)
}

const STEP_SUFFIX = / \(\d+\)$/

// The one place the app decides what a stepped-aside name looks like: the name as given, then its base counted up from 2, so re-stepping `Ideas (2)` reads `Ideas (3)`.
const stepped = (name: string, n: number): string =>
  n === 1 ? name : `${name.replace(STEP_SUFFIX, '')} (${n})`

export function freeName(name: string, taken: Iterable<string>): string {
  const held = new Set(Array.from(taken, foldKey))
  let n = 1
  while (held.has(foldKey(stepped(name, n)))) n++
  return stepped(name, n)
}

export async function createDisambiguated<T>(
  name: string,
  attempt: (name: string) => Promise<Result<T>>,
): Promise<Result<T>> {
  let last = await attempt(name)
  for (let n = 2; n <= 50 && !last.ok && last.error.code === 'exists'; n++) {
    last = await attempt(stepped(name, n))
  }
  return last
}
