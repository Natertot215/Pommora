// Recursive `.md` enumeration for mutation cascades (delete-property strips, rename
// cascades, Context unlinks). This is the simple "find the files to rewrite" walk — distinct
// from readNexus, which builds the typed tree with exclusions, depth caps, and adoption.

import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

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
    .filter((r) => r.endsWith('.md'))
    .filter((r) => !skip.has(r.split(/[/\\]/)[0]))
    .map((r) => join(dir, r))
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
