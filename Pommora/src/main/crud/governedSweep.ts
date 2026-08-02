// The one walk every governed-key sweep shares.
//
// Clearing a property, removing it from one Collection, unlinking a Context or a Space, cascading
// an option rename, reconciling a returning artifact — each decides something different about a
// key, and each was reaching that decision through its own copy of the same five steps: enumerate
// the roots, take the file's lock, ask whether the file may be rewritten at all, run the decision,
// write back only what changed. Copies of that drift: two of them swallowed a read failure the
// others reported, and one reported a page it had refused as one it had touched.
//
// So the plumbing is stated once and the decision stays the caller's. What differs per caller is
// genuinely different and rides as parameters: WHICH roots (a Collection's pages answer to a
// schema; a Context tag is legal on any page and on a Space sidecar), and what the caller needs
// captured on the way past.

import { readFile } from 'node:fs/promises'
import { parseGovernedKey } from '@shared/governedKeys'
import { atomicWriteFile, readJsonObject, writeJson } from '../io/atomicWrite'
import { serializeOnFile } from '../io/fileLock'
import { mergeFrontmatter, splitEnvelope } from '../io/pageFile'
import { listFilesRecursive, listMarkdownFiles } from '../io/walk'
import { SPACE_SIDECAR } from '../paths'
import { contextsDir } from '../paths'
import { splitFrontmatter } from '../readNexus'
import { nowIso, sweepAdmits } from './util'

export type Raw = Record<string, unknown>

/** Which roots a sweep reaches. Not a detail — a Context tag is legal on any page and on a Space
 *  sidecar, while a property value only means anything inside the Collection whose schema governs
 *  it, so the scope IS the difference between the two families. */
export type SweepScope =
  /** Every `.md` outside `.nexus`/`.trash`, plus every Space sidecar. */
  | { kind: 'nexus' }
  /** Every `.md` under each given Collection folder. */
  | { kind: 'collections'; folders: string[] }
  /** One `.md`, or a folder's pages and Space sidecars — a returning artifact in the trash. */
  | { kind: 'artifact'; abs: string }

/** What the sweep did, per root. `skipped` is a root it could not read, `refused` one it may not
 *  rewrite — kept apart because a record built from this reports them as the same kind of
 *  thinness, and nothing else may conflate them. */
export interface SweepResult<C> {
  touched: string[]
  skipped: string[]
  refused: string[]
  captured: C[]
}

/** The caller's decision for one root: the frontmatter/sidecar it should hold, plus whatever the
 *  caller wants remembered about it. `null` leaves the root untouched. */
export type Rewrite<C> = (raw: Raw, file: string) => { next: Raw; capture?: C } | null

const changedKeys = (raw: Raw, next: Raw): string[] =>
  [...new Set([...Object.keys(raw), ...Object.keys(next)])].filter(
    (k) => parseGovernedKey(k) !== null && JSON.stringify(raw[k]) !== JSON.stringify(next[k]),
  )

async function pageRoots(root: string, scope: SweepScope): Promise<string[]> {
  if (scope.kind === 'nexus') return listMarkdownFiles(root, { skipTopLevel: ['.nexus', '.trash'] })
  if (scope.kind === 'collections') {
    const out: string[] = []
    for (const folder of scope.folders) out.push(...(await listMarkdownFiles(folder)))
    return out
  }
  return scope.abs.toLowerCase().endsWith('.md') ? [scope.abs] : listMarkdownFiles(scope.abs)
}

const sidecarRoots = (root: string, scope: SweepScope): Promise<string[]> =>
  scope.kind === 'nexus'
    ? listFilesRecursive(contextsDir(root), [SPACE_SIDECAR])
    : scope.kind === 'artifact'
      ? listFilesRecursive(scope.abs, [SPACE_SIDECAR])
      : Promise.resolve([])

/**
 * Run `rewrite` over every root the scope reaches, each under its own file lock, writing back only
 * the governed keys that actually changed — so a root the decision left alone is never re-dated or
 * re-serialized, and foreign keys and the body never move.
 */
export async function sweepGovernedRoots<C>(
  root: string,
  scope: SweepScope,
  rewrite: Rewrite<C>,
  opts: { stamp?: boolean } = {},
): Promise<SweepResult<C>> {
  const out: SweepResult<C> = { touched: [], skipped: [], refused: [], captured: [] }

  for (const file of await pageRoots(root, scope)) {
    await serializeOnFile(file, async () => {
      let content: string
      try {
        content = await readFile(file, 'utf8')
      } catch {
        out.skipped.push(file)
        return
      }
      // An Unknown file, or one whose frontmatter cannot round-trip, is left byte-identical —
      // named as refused so a record built from this sweep can admit it was thin.
      if (!sweepAdmits(content)) {
        out.refused.push(file)
        return
      }
      const raw = splitFrontmatter(content)
      const decided = rewrite(raw, file)
      if (decided === null) return
      const keys = changedKeys(raw, decided.next)
      if (!keys.length) return
      const modeled: Raw = {}
      for (const k of keys) if (k in decided.next) modeled[k] = decided.next[k]
      // Whether clearing a value re-dates the page is the caller's to say: a property value is a
      // cell the user filled, a Context tag is a relation the layer maintains.
      if (opts.stamp) modeled.modified_at = nowIso()
      const merged = opts.stamp ? [...keys, 'modified_at'] : keys
      await atomicWriteFile(
        file,
        mergeFrontmatter(content, modeled, merged, splitEnvelope(content).body),
      )
      if (decided.capture !== undefined) out.captured.push(decided.capture)
      out.touched.push(file)
    })
  }

  for (const file of await sidecarRoots(root, scope)) {
    await serializeOnFile(file, async () => {
      const raw = await readJsonObject(file)
      if (!raw) {
        out.skipped.push(file)
        return
      }
      const decided = rewrite(raw, file)
      if (decided === null) return
      await writeJson(file, decided.next)
      if (decided.capture !== undefined) out.captured.push(decided.capture)
      out.touched.push(file)
    })
  }
  return out
}
