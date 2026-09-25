import { hiddenFolder, hiddenName, outsideContent, type WatchScope } from '../Paths/exclusion'
import { isMarkdownFile, join, relative } from '../Paths/posix'
import { type DirEntry, machine } from '../Platform/machine'

export function isContentName(name: string): boolean {
  return !hiddenName(name) && isMarkdownFile(name)
}

export function isContentFile(entry: DirEntry): boolean {
  return entry.kind === 'file' && isContentName(entry.name)
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

// The pages under a folder the tree doesn't hold (a trash bundle's artifact), held to the same hidden-name rule as the content walk.
export async function listMarkdownFiles(dir: string): Promise<string[]> {
  const rels = await listPathsUnder(
    dir,
    dir,
    (rel, kind) => !rel.split('/').some(hiddenFolder) && (kind === 'dir' || isMarkdownFile(rel)),
  )
  return rels.map((rel) => join(dir, rel))
}

export async function corpusFiles(root: string, scope: WatchScope): Promise<string[]> {
  return corpusFilesUnder(root, root, scope)
}

// Descended by hand so a refused subtree is never entered, which makes pruning a directory identical to filtering its files.
export async function listPathsUnder(
  root: string,
  absDir: string,
  admit: (rel: string, kind: 'file' | 'dir', siblings: ReadonlySet<string>) => boolean,
): Promise<string[]> {
  const out: string[] = []
  const walk = async (dir: string, segs: string[]): Promise<void> => {
    const entries = await listEntries(dir)
    const siblings = new Set(entries.map((e) => e.name))
    for (const entry of entries) {
      const next = [...segs, entry.name]
      if (!admit(next.join('/'), entry.kind === 'dir' ? 'dir' : 'file', siblings)) continue
      if (entry.kind === 'dir') await walk(join(dir, entry.name), next)
      else out.push(next.join('/'))
    }
  }
  await walk(absDir, relative(root, absDir).split('/').filter(Boolean))
  return out
}

export async function corpusFilesUnder(
  root: string,
  absDir: string,
  scope: WatchScope,
): Promise<string[]> {
  return listPathsUnder(
    root,
    absDir,
    (rel, kind) => !outsideContent(rel, scope) && (kind === 'dir' || isMarkdownFile(rel)),
  )
}

export async function listFilesRecursive(dir: string, suffixes?: string[]): Promise<string[]> {
  const all = await filesUnder(dir)
  return suffixes ? all.filter((abs) => suffixes.some((s) => abs.endsWith(s))) : all
}
