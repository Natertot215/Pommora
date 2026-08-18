// Directory enumeration for the passes that walk a nexus: the recursive `.md` sweep behind the
// mutation cascades (delete-property strips, rename cascades, Context unlinks) and the shallow
// listing the read walk and the adoption pass step through. Distinct from readNexus, which builds
// the typed tree with exclusions, depth caps, and adoption.

import { readdir } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import { join } from 'node:path'
import { excludedMatcher } from '../exclusion'

/** Whether a name (or a path ending in one) is Markdown. Case-INSENSITIVE, and stated once: a
 *  `.MD` written by another editor is the same file to the person who wrote it, and a walk that
 *  admits it while the sweeps skip it leaves a page that renders but never gets rewritten — its
 *  links go stale on a rename and its property cells read empty. */
export function isMarkdownFile(name: string): boolean {
  return name.toLowerCase().endsWith('.md')
}

/** Whether a directory entry is a content `.md` the read walk and the adoption pass both act on.
 *  Underscore-prefixed names are Pommora's own sidecars, never content. */
export function isContentFile(entry: Dirent): boolean {
  return entry.isFile() && !entry.name.startsWith('_') && isMarkdownFile(entry.name)
}

/** One level of `dir`, or [] when it can't be read. Every caller walks a tree of independent
 *  entities, so a directory that vanished mid-walk or refuses to open costs only itself — the
 *  levels above and beside it still enumerate. Shared so that stays one decision: two copies of
 *  a swallowed error drift into two different failure behaviours and nothing catches it. */
export async function listEntries(dir: string): Promise<Dirent[]> {
  try {
    return await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
}

/** Every `.md` file under `dir` (recursive), as absolute paths. `skipTopLevel` drops
 *  entries whose first path segment matches (e.g. `['.nexus', '.trash']` for a nexus-wide
 *  walk). A missing/unreadable dir yields []. */
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

/** Top-level names the corpus never reaches into, whichever direction a path is resolved from. */
export const NON_CORPUS_TOP: ReadonlySet<string> = new Set(['.nexus', '.trash'])

/** What the pens can reach — THE corpus, stated once: every `.md` under the nexus outside its
 *  own `.nexus`/`.trash` and outside the user's `excluded_folders`, as nexus-relative POSIX
 *  paths (the tree's and the index's shared key convention). The index seed, its reconciler,
 *  and every cascade fallback scan enumerate through here, so "indexed", "swept", and
 *  "rewritable" can never mean three different sets of files. */
export async function corpusFiles(root: string, excluded: string[]): Promise<string[]> {
  const isExcluded = excludedMatcher(excluded)
  let rels: string[]
  try {
    rels = await readdir(root, { recursive: true })
  } catch {
    return []
  }
  const out: string[] = []
  for (const rel of rels) {
    if (!isMarkdownFile(rel)) continue
    const segs = rel.split(/[/\\]/)
    if (NON_CORPUS_TOP.has(segs[0]) || isExcluded(segs)) continue
    out.push(segs.join('/'))
  }
  return out
}

/** Every file under `dir` (recursive) matching one of `suffixes`, as absolute paths —
 *  the JSON-scope sibling of listMarkdownFiles (`_space.json` sidecars). */
export async function listFilesRecursive(dir: string, suffixes: string[]): Promise<string[]> {
  let rels: string[]
  try {
    rels = await readdir(dir, { recursive: true })
  } catch {
    return []
  }
  return rels.filter((r) => suffixes.some((s) => r.endsWith(s))).map((r) => join(dir, r))
}
