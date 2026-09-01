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
import { join } from 'node:path'
import { atomicWriteFile, readJsonObject, writeJson } from '../IO/atomicWrite'
import { serializeOnFile } from '../IO/fileLock'
import { noteValueWrite } from '../valuesChanged'
import { indexWrittenPage, nexusCorpus } from '../indexSeed'
import { mergeFrontmatter, splitEnvelope } from '../IO/pageFile'
import { listFilesRecursive } from '../IO/walk'
import { contextsDir, SPACE_SIDECAR } from '../paths'
import { splitFrontmatter } from '../readNexus'
import { nowIso, sweepAdmits } from './util'

export type Raw = Record<string, unknown>

/** Which roots a sweep reaches. Not a detail — a Context tag is legal on any page and on a Space
 *  sidecar, while a property value only means anything inside the Collection whose schema governs
 *  it, so the scope IS the difference between the two families. */
export type SweepScope =
  /** The whole corpus — every `.md` the pens can reach — plus every Space sidecar. */
  | { kind: 'nexus' }
  /** An explicit page list the call site already targeted and scoped (the key-holder query);
   *  sidecars unreached. The query decision never lives in here — the Context cascade shares
   *  this function and its governed keys are outside the index. */
  | { kind: 'files'; files: string[] }

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

/** A page decision stated as the file's TEXT rather than as its values. A raw decision is a
 *  decision about VALUES: it merges key-wise, and a key's own position and comment are not things
 *  it can name, let alone keep. Renaming a key where it sits needs the yaml document, which only
 *  the bytes carry — so that decision arrives as text and owns the whole file it returns. `null`
 *  leaves the root untouched, the same answer a raw decision gives. */
export type RewriteText = (content: string, file: string) => string | null

export interface SweepOptions {
  /** Re-date every page the sweep changed. What a governed key means to a page differs by layer,
   *  so whether changing one is a content edit is the caller's to say. */
  stamp?: boolean
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

/** Space sidecars are context roots, so only a nexus-wide sweep reaches them: a property value
 *  answers to a Collection's schema, and no schema governs a Space. */
const sidecarRoots = (root: string, scope: SweepScope): Promise<string[]> =>
  scope.kind === 'nexus'
    ? listFilesRecursive(contextsDir(root), [SPACE_SIDECAR])
    : Promise.resolve([])

/**
 * Run `rewrite` over every root the scope reaches, each under its own file lock. A page is merged
 * key-wise — only the governed keys that actually changed, so foreign frontmatter and the body
 * never move and a page the decision left alone is never re-dated — unless the caller states its
 * page decision as text, which then owns the file whole. A sidecar is written whole, which is what
 * a JSON root has always taken; `null` is how a decision says "untouched" everywhere.
 */
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
      // An Unknown file, or one whose frontmatter cannot round-trip, is left byte-identical —
      // named as refused so a record built from this sweep can admit it was thin.
      if (!sweepAdmits(content)) {
        out.refused.push(file)
        return
      }
      if (opts.rewriteText) {
        const next = opts.rewriteText(content, file)
        if (next === null) return
        await atomicWriteFile(file, next)
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
      // Whether clearing a value re-dates the page is the caller's to say: a property value is a
      // cell the user filled, a Context tag is a relation the layer maintains.
      if (opts.stamp) modeled.modified_at = nowIso()
      const merged = opts.stamp ? [...keys, 'modified_at'] : keys
      await atomicWriteFile(
        file,
        mergeFrontmatter(content, modeled, merged, splitEnvelope(content).body),
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
