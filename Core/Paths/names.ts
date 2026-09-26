import type { Result } from '../Contract/result'
import { machine } from '../Platform/machine'
import { foldKey } from './caseFold'
import { hiddenFolder, hiddenName } from './exclusion'
import { isMarkdownFile } from './posix'
import { CROPS_REL } from './nexusPaths'

type NameRole = 'page' | 'directory'

const WINDOWS_DEVICE = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i

// A name that stays inside its folder: the part of the rule a stored title is held to as it's read.
export function holdsName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed !== '' && trimmed !== '.' && trimmed !== '..' && !/[/\\\0]/.test(name)
}

// Every rule a name is held to, in one place. Returns the message to show, or null when the name is allowed.
export function nameError(name: string, role: NameRole): string | null {
  const trimmed = name.trim()
  if (!holdsName(name)) return `"${name}" is not a valid name.`
  if (name !== trimmed) return `"${name}" can't begin or end with a space.`
  // The walk hides these, so a file named this way could never be shown again.
  if (hiddenName(name)) return `"${name}" can't begin with a dot or underscore.`
  if (role === 'directory' && hiddenFolder(name))
    return `"${name}" is a folder name the Nexus keeps hidden.`
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

// The one place the app decides what a stepped-aside name looks like.
const stepped = (base: string, n: number): string => `${base} (${n})`

// A copy of `Ideas (2)` beside a held `Ideas` counts on as `Ideas (3)`; `Taxes (2024)` keeps its own number.
export function freeName(name: string, taken: Iterable<string>): string {
  const held = new Set(Array.from(taken, foldKey))
  if (!held.has(foldKey(name))) return name
  const bare = name.replace(STEP_SUFFIX, '')
  const base = held.has(foldKey(bare)) ? bare : name
  let n = 2
  while (held.has(foldKey(stepped(base, n)))) n++
  return stepped(base, n)
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
