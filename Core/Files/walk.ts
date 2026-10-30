import { outsideContent, type WatchScope } from '../Paths/exclusion'
import { ARCHIVE_DIR_REL, hiddenFolder, hiddenName, SIDECARS } from '../Paths/nexusPaths'
import { basename, isMarkdownFile, join, relative } from '../Paths/posix'
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

export async function listFilesRecursive(dir: string): Promise<string[]> {
  const out: string[] = []
  for (const e of await listEntries(dir)) {
    const abs = join(dir, e.name)
    if (e.kind === 'dir') out.push(...(await listFilesRecursive(abs)))
    else if (e.kind === 'file') out.push(abs)
  }
  return out
}

// The pages under a folder the tree doesn't hold (a bundle's artifact), every name below it held to the hidden-folder rule.
export async function listMarkdownFiles(dir: string): Promise<string[]> {
  const rels = await listPathsUnder(
    dir,
    dir,
    (rel, kind) => !rel.split('/').some(hiddenFolder) && (kind === 'dir' || isMarkdownFile(rel)),
  )
  return rels.map((rel) => join(dir, rel))
}

/** The Nexus root, then its Archive: the one hidden folder read as content, which the root's own walk prunes with `.nexus`. */
const contentRoots = (root: string): string[] => [root, join(root, ARCHIVE_DIR_REL)]

export async function corpusFiles(root: string, scope: WatchScope): Promise<string[]> {
  const files: string[] = []
  for (const dir of contentRoots(root)) files.push(...(await corpusFilesUnder(root, dir, scope)))
  return files
}

/** The folders `dir` holds that the app enters: every one but a hidden one. */
export async function visibleFolders(dir: string): Promise<string[]> {
  return (await listEntries(dir))
    .filter((e) => e.kind === 'dir' && !hiddenFolder(e.name))
    .map((e) => e.name)
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

export async function sidecarsUnder(
  root: string,
  scope: WatchScope,
  under?: string,
): Promise<string[]> {
  const files: string[] = []
  for (const dir of under === undefined ? contentRoots(root) : [under]) {
    const rels = await listPathsUnder(root, dir, (rel, kind) =>
      kind === 'dir' ? !outsideContent(rel, scope) : SIDECARS.has(basename(rel)),
    )
    files.push(...rels.map((rel) => join(root, rel)))
  }
  return files
}
