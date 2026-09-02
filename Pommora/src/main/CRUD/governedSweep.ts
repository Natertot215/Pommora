// The one walk every governed-key sweep shares: enumerate the roots, take the file's lock, ask
// whether it may be rewritten at all, run the caller's decision, write back only what changed.
// What differs per caller rides as parameters — WHICH roots, and what gets captured on the way past.

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { readJsonObject, rewritePreservingTimes, writeJson } from '../IO/atomicWrite'
import { serializeOnFile } from '../IO/fileLock'
import { noteValueWrite } from '../valuesChanged'
import { indexWrittenPage, nexusCorpus } from '../indexSeed'
import { mergeFrontmatter, splitEnvelope } from '../IO/pageFile'
import { listFilesRecursive } from '../IO/walk'
import { contextsDir, SPACE_SIDECAR } from '../paths'
import { splitFrontmatter } from '../readNexus'
import { sweepAdmits } from './util'

export type Raw = Record<string, unknown>

/** A Context tag is legal on any page and on a Space sidecar; a property value only means
 *  anything inside the Collection whose schema governs it. */
export type SweepScope =
  | { kind: 'nexus' }
  /** An explicit, already-scoped page list (the key-holder query); sidecars unreached. */
  | { kind: 'files'; files: string[] }

/** `skipped` could not be read, `refused` may not be rewritten — kept apart so callers don't
 *  conflate the two. */
export interface SweepResult<C> {
  touched: string[]
  skipped: string[]
  refused: string[]
  captured: C[]
}

export type Rewrite<C> = (raw: Raw, file: string) => { next: Raw; capture?: C } | null

/** A raw decision merges key-wise and can't name a key's own position or comment. Renaming a
 *  key where it sits needs the yaml document, so that decision arrives as text and owns the
 *  whole file it returns. `null` still means untouched. */
export type RewriteText = (content: string, file: string) => string | null

export interface SweepOptions {
  /** Pages take this instead of the raw decision; sidecars keep the raw one, JSON having neither
   *  position nor comments to preserve. */
  rewriteText?: RewriteText
}

const changedKeys = (raw: Raw, next: Raw): string[] =>
  [...new Set([...Object.keys(raw), ...Object.keys(next)])].filter(
    (k) => JSON.stringify(raw[k]) !== JSON.stringify(next[k]),
  )

async function pageRoots(root: string, scope: SweepScope): Promise<string[]> {
  switch (scope.kind) {
    case 'nexus':
      return (await nexusCorpus(root)).map((rel) => join(root, rel))
    case 'files':
      return scope.files
    default: {
      const _exhaustive: never = scope
      return _exhaustive
    }
  }
}

// Only a nexus-wide sweep reaches sidecars — no schema governs a Space.
const sidecarRoots = (root: string, scope: SweepScope): Promise<string[]> =>
  scope.kind === 'nexus'
    ? listFilesRecursive(contextsDir(root), [SPACE_SIDECAR])
    : Promise.resolve([])

/** A page merges key-wise — only the governed keys that changed, so foreign frontmatter and the
 *  body never move — unless the caller states its decision as text, which then owns the file
 *  whole. Either way the page keeps its modification time. A sidecar is always written whole. */
export async function sweepGovernedRoots<C>(
  root: string,
  scope: SweepScope,
  rewrite: Rewrite<C>,
  opts: SweepOptions = {},
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
      // An Unknown file, or one whose frontmatter cannot round-trip, is left byte-identical.
      if (!sweepAdmits(content)) {
        out.refused.push(file)
        return
      }
      if (opts.rewriteText) {
        const next = opts.rewriteText(content, file)
        if (next === null) return
        await rewritePreservingTimes(file, next)
        noteValueWrite(root, file)
        await indexWrittenPage(root, file)
        out.touched.push(file)
        return
      }
      const raw = splitFrontmatter(content)
      const decided = rewrite(raw, file)
      if (decided === null) return
      const keys = changedKeys(raw, decided.next)
      if (!keys.length) return
      const modeled: Raw = {}
      for (const k of keys) if (k in decided.next) modeled[k] = decided.next[k]
      await rewritePreservingTimes(
        file,
        mergeFrontmatter(content, modeled, keys, splitEnvelope(content).body),
      )
      noteValueWrite(root, file)
      await indexWrittenPage(root, file)
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
