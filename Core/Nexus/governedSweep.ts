import {
  atomicWriteFile,
  jsonText,
  parseJsonObject,
  readTextOrNull,
  rewritePreservingTimes,
} from '../Files/atomicWrite'
import { machine } from '../Platform/machine'
import { damagedFolders } from './treePatch'
import type { NexusTree } from './tree'
import { isMarkdownFile, join, relative } from '../Paths/posix'
import { sidecarPath } from '../Paths/paths'
import { isArchived } from '../Paths/nexusPaths'
import { ID_KEY } from './identityMark'
import { asString } from './coerce'
import { addressable, type NexusPages } from './heldPages'
import { sweepParse } from '../Files/pageFile'
import type { Json } from '../Files/stableJson'
import { changedKeys, type Frozen, governedRoot, reencode, rewriteRaw } from './governedRoot'
import type { PropertyDefinition } from '../Properties/properties'
import { isBlankRaw, landValue } from '../Files/rootValues'

export interface SweepResult {
  /** Each file the sweep wrote, or a dry run would write, with the text it held before and the text the write leaves. */
  touched: Map<string, { before: string; after: string }>
  skipped: string[]
  refused: string[]
}

export type Rewrite = (raw: Json, file: string) => Json | null

export type RewriteText = (content: string, file: string) => string | null

/** `raw` rewrites a page's front matter or a Space sidecar's object; `text`, when given, rewrites a page's whole text in its place. */
export type SweepPlan = { raw: Rewrite; text?: RewriteText }

export const collectionFolders = (root: string, tree: NexusTree): string[] =>
  [
    ...tree.collections,
    ...damagedFolders(tree.unreadable).filter((u) => u.kind === 'collection'),
  ].map((c) => join(root, c.path))

// A file whose lock or write throws costs only itself, so the files after it are still reached.
const guarded = (file: string, missed: string[], body: () => Promise<void>): Promise<void> =>
  machine()
    .lock(file, body)
    .catch(() => void missed.push(file))
/** A file's text after `plan`, by its kind: null when nothing changes, undefined when its root can't round-trip (an Unknown page, a sidecar nobody can parse), which won't read any better on a retry, so it's left byte-identical. */
function rewritten(plan: SweepPlan, file: string, content: string): string | null | undefined {
  if (!isMarkdownFile(file)) {
    const raw = parseJsonObject(content)
    if (!raw) return undefined
    const next = plan.raw(raw, file)
    return next === null ? null : jsonText(next)
  }
  const page = sweepParse(content)
  if (!page) return undefined
  return plan.text ? plan.text(content, file) : rewriteRaw((raw) => plan.raw(raw, file))(page)
}

/** Files are absolute, pages and Space sidecars alike. */
export async function sweepGovernedRoots(
  files: string[],
  plan: SweepPlan,
  dry = false,
): Promise<SweepResult> {
  const out: SweepResult = { touched: new Map(), skipped: [], refused: [] }

  for (const file of files) {
    await guarded(file, out.skipped, async () => {
      const content = await readTextOrNull(file)
      if (content === null) {
        out.skipped.push(file)
        return
      }
      const next = rewritten(plan, file, content)
      if (next === undefined) {
        out.refused.push(file)
        return
      }
      if (next === null) return
      if (!dry)
        await (isMarkdownFile(file)
          ? rewritePreservingTimes(file, next)
          : atomicWriteFile(file, next))
      out.touched.set(file, { before: content, after: next })
    })
  }
  return out
}

/** A file outside the Archive: the only kind a confirmation, a what-changed count, or a cascade's `pages` names, since nothing displays an archived path. */
export const outsideArchive = (root: string, file: string): boolean =>
  !isArchived(relative(root, file))

/** The id a governed root carries: a page's `ID`, a Space sidecar's `id`. */
export const rootId = (file: string, raw: Json): string | undefined =>
  asString(raw[isMarkdownFile(file) ? ID_KEY : 'id'])

export async function sweepCount(root: string, files: string[], plan: SweepPlan): Promise<number> {
  const shown = files.filter((file) => outsideArchive(root, file))
  return (await sweepGovernedRoots(shown, plan, true)).touched.size
}

/** Returns the keys a sweep changed to what they held, each file whole while it still holds the sweep's write, so a write since to any other key or to the body is kept; answers the files it couldn't put back. */
export async function undoSweep(touched: SweepResult['touched']): Promise<string[]> {
  const missed: string[] = []
  for (const [file, { before, after }] of touched)
    await guarded(file, missed, async () => {
      const now = await readTextOrNull(file)
      if (now === null) return
      const back = now === after ? before : keysPutBack(file, now, before, after)
      if (back !== null) await rewritePreservingTimes(file, back)
    })
  return missed
}

function keysPutBack(file: string, now: string, before: string, after: string): string | null {
  const was = governedRoot(file, before)
  const keys = changedKeys(was, governedRoot(file, after))
  const putBack = (raw: Json): Json => {
    const next = { ...raw }
    for (const k of keys) {
      if (k in was) next[k] = was[k]
      else delete next[k]
    }
    return next
  }
  if (isMarkdownFile(file)) {
    const page = sweepParse(now)
    if (!page) throw new Error('The page no longer admits a sweep.')
    return rewriteRaw(putBack)(page)
  }
  const raw = parseJsonObject(now)
  if (!raw) throw new Error('The sidecar no longer parses.')
  return jsonText(putBack(raw))
}

/** Rewrites each page or Space whose ID is in `values` — found where `roots`, the by-id projection, places it, matched by the ID it carries, and left alone where two files claim it — and answers the IDs whose root now holds what its rewrite asked for; a null rewrite leaves its root as it is. */
export async function sweepRootsById<T>(
  root: string,
  roots: NexusPages['byId'],
  values: Record<string, T>,
  rewrite: (raw: Json, value: T) => Json | null,
): Promise<Set<string>> {
  const asked = new Map<string, string>()
  const files = Object.keys(values).flatMap((id) => {
    const at = roots.get(id)
    if (at?.kind === 'page') return [join(root, at.path)]
    return at?.kind === 'space' ? [sidecarPath(join(root, at.path), 'space')] : []
  })
  const { skipped } = await sweepGovernedRoots(files, {
    raw: (raw, file) => {
      const id = rootId(file, raw)
      if (!addressable(roots, id) || !Object.hasOwn(values, id)) return null
      const next = rewrite(raw, values[id])
      if (next !== null) asked.set(file, id)
      return next
    },
  })
  for (const file of skipped) asked.delete(file)
  return new Set(asked.values())
}

/** Puts each value `frozen` still admits back on the page or Space its ID names wherever that root holds none, and answers the IDs that took theirs. */
export async function refillValues(
  root: string,
  def: PropertyDefinition,
  roots: NexusPages['byId'],
  values: Record<string, unknown>,
  frozen: Frozen,
): Promise<Set<string>> {
  return sweepRootsById(root, roots, values, (raw, value) => {
    const { next } = reencode(def, value, frozen)
    return next === undefined || !isBlankRaw(raw[def.key]) ? null : landValue(raw, def.key, next)
  })
}
