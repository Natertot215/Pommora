import { assetMatcher, excludedMatcher, type WatchScope } from '../Locations/exclusion'
import { NON_CORPUS_TOP } from '../Locations/nexusPaths'
import { join, relative } from '../Locations/posix'
import { type DirEntry, machine } from '../Platform/machine'

// Case-insensitive: a walk that admits `.MD` while a sweep skips it leaves a page that never rewrites.
export function isMarkdownFile(name: string): boolean {
  return name.toLowerCase().endsWith('.md')
}

export function isContentFile(entry: DirEntry): boolean {
  return entry.kind === 'file' && !entry.name.startsWith('_') && isMarkdownFile(entry.name)
}

export async function listEntries(dir: string): Promise<DirEntry[]> {
  try {
    return await machine().readDir(dir)
  } catch {
    return []
  }
}

async function filesUnder(dir: string): Promise<string[]> {
  const out: string[] = []
  for (const e of await listEntries(dir)) {
    const abs = join(dir, e.name)
    if (e.kind === 'dir') out.push(...(await filesUnder(abs)))
    else if (e.kind === 'file') out.push(abs)
  }
  return out
}

export async function listMarkdownFiles(dir: string): Promise<string[]> {
  return (await filesUnder(dir)).filter((abs) => isMarkdownFile(relative(dir, abs)))
}

export async function corpusFiles(root: string, scope: WatchScope): Promise<string[]> {
  return corpusFilesUnder(root, root, scope)
}

export async function corpusFilesUnder(
  root: string,
  absDir: string,
  scope: WatchScope,
): Promise<string[]> {
  const isExcluded = excludedMatcher(scope.excluded)
  const isAsset = assetMatcher(scope.assetDir)
  const out: string[] = []
  // Descended by hand so an out-of-corpus subtree is never entered: `.trash` only grows, and
  // the prefix match makes pruning a directory identical to filtering its files.
  const walk = async (dir: string, segs: string[]): Promise<void> => {
    for (const entry of await listEntries(dir)) {
      const next = [...segs, entry.name]
      if (NON_CORPUS_TOP.has(next[0]) || isAsset(next) || isExcluded(next)) continue
      if (entry.kind === 'dir') await walk(join(dir, entry.name), next)
      else if (isMarkdownFile(entry.name)) out.push(next.join('/'))
    }
  }
  await walk(absDir, relative(root, absDir).split('/').filter(Boolean))
  return out
}

export async function listFilesRecursive(dir: string, suffixes?: string[]): Promise<string[]> {
  const all = await filesUnder(dir)
  return suffixes ? all.filter((abs) => suffixes.some((s) => abs.endsWith(s))) : all
}
