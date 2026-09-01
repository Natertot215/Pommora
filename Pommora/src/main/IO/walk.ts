// Directory enumeration for the passes that walk a nexus: the recursive `.md` sweep behind the
// mutation cascades and the shallow listing the read walk and adoption pass step through.
// Distinct from readNexus, which builds the typed tree with exclusions, depth caps, and adoption.

import { readdir } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import { join, relative } from 'node:path'
import { assetMatcher, excludedMatcher, type WatchScope } from '../exclusion'
import { NON_CORPUS_TOP } from '@shared/nexusPaths'

/** Whether a name is Markdown. Case-INSENSITIVE and stated once: a walk that admits `.MD` while
 *  the sweeps skip it leaves a page that renders but never gets rewritten. */
export function isMarkdownFile(name: string): boolean {
  return name.toLowerCase().endsWith('.md')
}

/** Whether a directory entry is a content `.md` the read walk and the adoption pass both act on.
 *  Underscore-prefixed names are Pommora's own sidecars, never content. */
export function isContentFile(entry: Dirent): boolean {
  return entry.isFile() && !entry.name.startsWith('_') && isMarkdownFile(entry.name)
}

/** One level of `dir`, or [] when it can't be read. A directory that vanished mid-walk or refuses
 *  to open costs only itself — the levels above and beside it still enumerate. */
export async function listEntries(dir: string): Promise<Dirent[]> {
  try {
    return await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
}

/** Every `.md` file under `dir` (recursive), as absolute paths. `skipTopLevel` drops entries whose
 *  first path segment matches. A missing/unreadable dir yields []. */
export async function listMarkdownFiles(
  dir: string,
  opts: { skipTopLevel?: string[] } = {},
): Promise<string[]> {
  let rels: string[]
  try {
    rels = await readdir(dir, { recursive: true })
  } catch {
    return []
  }
  const skip = new Set(opts.skipTopLevel ?? [])
  return rels
    .filter(isMarkdownFile)
    .filter((r) => !skip.has(r.split(/[/\\]/)[0]))
    .map((r) => join(dir, r))
}

/** THE corpus, stated once: every `.md` under the nexus outside its own `.nexus`/`.trash` and the
 *  user's `excluded_folders`, as nexus-relative POSIX paths. The index seed, its reconciler, and
 *  every cascade fallback scan enumerate through here, so "indexed", "swept", and "rewritable"
 *  can never mean three different sets of files. */
export async function corpusFiles(root: string, scope: WatchScope): Promise<string[]> {
  return corpusFilesUnder(root, root, scope)
}

/** The same corpus law scoped to one subtree: only `absDir` is walked, so a per-container
 *  enumeration never pays a whole-nexus readdir. */
export async function corpusFilesUnder(
  root: string,
  absDir: string,
  scope: WatchScope,
): Promise<string[]> {
  const isExcluded = excludedMatcher(scope.excluded)
  const isAsset = assetMatcher(scope.assetDir)
  const out: string[] = []
  // Descended by hand so an out-of-corpus subtree is never entered. Node's recursive readdir has
  // no filter hook, so it would enumerate all of `.trash` — which only grows — on the way to
  // discarding it. The prefix match makes pruning a directory identical to filtering its files.
  const walk = async (dir: string, segs: string[]): Promise<void> => {
    for (const entry of await listEntries(dir)) {
      const next = [...segs, entry.name]
      if (NON_CORPUS_TOP.has(next[0]) || isAsset(next) || isExcluded(next)) continue
      if (entry.isDirectory()) await walk(join(dir, entry.name), next)
      else if (isMarkdownFile(entry.name)) out.push(next.join('/'))
    }
  }
  await walk(absDir, relative(root, absDir).split(/[/\\]/).filter(Boolean))
  return out
}

/** Every file under `dir` (recursive), as absolute paths — the JSON-scope sibling of
 *  listMarkdownFiles. Omitting `suffixes` takes every file, which is what an asset listing needs:
 *  an extension list there would silently foreclose the any-file property. */
export async function listFilesRecursive(dir: string, suffixes?: string[]): Promise<string[]> {
  let entries: Dirent[]
  try {
    entries = await readdir(dir, { recursive: true, withFileTypes: true })
  } catch {
    return []
  }
  return entries
    .filter((e) => e.isFile() && (!suffixes || suffixes.some((s) => e.name.endsWith(s))))
    .map((e) => join(e.parentPath, e.name))
}
