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
import { addressable } from './heldPages'
import type { EntityRecord } from './record'
import { sweepParse } from '../Files/pageFile'
import type { Json } from '../Files/stableJson'
import { type Frozen, gonePageEntry, liveLanding, reencode, rewriteRaw } from './governedRoot'
import type { Place } from '../Files/pageFile'
import { type PropertyDefinition, PROPERTY_TYPES } from '../Properties/properties'
import { isBlankRaw, landValue } from '../Files/rootValues'

export interface SweepResult {
  /** Each file the sweep wrote, or a dry run would write, with the text it held before and the text the write leaves. */
  touched: Map<string, { before: string; after: string }>
  /** Each file left as it was that the sweep should have reached: one it couldn't read, and one whose root can't round-trip. */
  skipped: string[]
  /** The files among `skipped` whose root can't round-trip, which only a fix by hand lets a sweep reach, so they're named once and let go (B-5). */
  refused: string[]
}

export type Rewrite = (raw: Json, file: string) => Json | null

export type RewriteText = (content: string, file: string) => string | null

/** `raw` rewrites a page's front matter or a Space sidecar's object; `text`, when given, rewrites a page's whole text in its place; `above`, when given, places each key a page's rewrite adds. */
export type SweepPlan = {
  raw: Rewrite
  text?: RewriteText
  above?: (raw: Json, file: string) => Place
}

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
  if (plan.text) return plan.text(content, file)
  return rewriteRaw((raw) => plan.raw(raw, file), plan.above?.(page.raw, file))(page)
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
        out.skipped.push(file)
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

/** A file outside the Archive: the only kind a confirmation, a what-changed count, a rename's clash refusal, or a cascade's `pages` names, since nothing displays an archived path. */
export const outsideArchive = (root: string, file: string): boolean =>
  !isArchived(relative(root, file))

/** The id a governed root carries: a page's `ID`, a Space sidecar's `id`. */
export const rootId = (file: string, raw: Json): string | undefined =>
  asString(raw[isMarkdownFile(file) ? ID_KEY : 'id'])

export async function sweepCount(root: string, files: string[], plan: SweepPlan): Promise<number> {
  const shown = files.filter((file) => outsideArchive(root, file))
  return (await sweepGovernedRoots(shown, plan, true)).touched.size
}

/** What a by-id sweep reads of each root: where its file is and what kind it is, so a trashed copy joins the live tree's records. */
export type RootsById = ReadonlyMap<string, Pick<EntityRecord, 'kind' | 'path'> | null>

/** Rewrites each page or Space whose ID is in `values` — found where `roots` places it, matched by the ID it carries, and left alone where two files claim it — and answers the IDs whose root now holds what its rewrite asked for, and how many files it couldn't read or write; a null rewrite leaves its root as it is. A key a page's rewrite adds lands above the key `above` names for its ID, and last without one. */
export async function sweepRootsById<T>(
  root: string,
  roots: RootsById,
  values: Record<string, T>,
  above: Record<string, string | undefined>,
  rewrite: (raw: Json, value: T) => Json | null,
): Promise<{ taken: ReadonlySet<string>; skipped: number }> {
  const asked = new Map<string, string>()
  const files = Object.keys(values).flatMap((id) => {
    const at = roots.get(id)
    if (at?.kind === 'page') return [join(root, at.path)]
    return at?.kind === 'space' ? [sidecarPath(join(root, at.path), 'space')] : []
  })
  const swept = await sweepGovernedRoots(files, {
    raw: (raw, file) => {
      const id = rootId(file, raw)
      if (!addressable(roots, id) || !Object.hasOwn(values, id)) return null
      const next = rewrite(raw, values[id])
      if (next !== null) asked.set(file, id)
      return next
    },
    above: (raw, file) => () => above[rootId(file, raw) ?? ''],
  })
  for (const file of swept.skipped) asked.delete(file)
  return { taken: new Set(asked.values()), skipped: swept.skipped.length }
}

/** `value` landed under `def`'s key as a live reconcile lands it, where `raw` reads blank; null where it doesn't land, or where it's a Link naming a page `frozen` no longer holds. */
export const refillOf =
  (def: PropertyDefinition, frozen: Frozen) =>
  (raw: Json, value: unknown): Json | null => {
    const gone =
      PROPERTY_TYPES[def.type].connections === 'value' && gonePageEntry(value, frozen) !== null
    const next = liveLanding(value, reencode(def, value))
    return gone || next === undefined || !isBlankRaw(raw[def.key])
      ? null
      : landValue(raw, def.key, next)
  }

/** Puts each value back as `refillOf` lands it, on the page or Space its ID names wherever that root holds none, above the key `above` names for that ID, and answers the IDs that took theirs. */
export async function refillValues(
  root: string,
  def: PropertyDefinition,
  roots: RootsById,
  values: Record<string, unknown>,
  frozen: Frozen,
  above: Record<string, string | undefined> = {},
): Promise<{ taken: ReadonlySet<string>; skipped: number }> {
  return sweepRootsById(root, roots, values, above, refillOf(def, frozen))
}
