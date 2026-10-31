import { jsonText, parseJsonObject, rewriteHeld } from '../Files/atomicWrite'
import { damagedFolders } from './treePatch'
import type { NexusTree } from './tree'
import { isMarkdownFile, join, relative } from '../Paths/posix'
import { storeOf } from '../Paths/bundleLayout'
import { ID_KEY } from './identityMark'
import { asString } from './coerce'
import { addressable, rootFile, type RootsById } from './heldPages'
import { type Place, type SweptPage, sweepParse } from '../Files/pageFile'
import type { Json } from '../Files/stableJson'
import { gonePageEntry, liveLanding, reencode, rewriteRoot } from './governedRoot'
import type { PageIndex } from '../Connections/pageIndex'
import type { StrippedLink } from '../Bundles/record'
import { type PropertyDefinition, PROPERTY_TYPES } from '../Properties/properties'
import { isBlankRaw, type KeyCollision, landValue, rekeyHeld } from '../Files/rootValues'

export interface SweepResult {
  /** Each file the sweep wrote, or a dry run would write, with the text it held before and the text the write leaves. */
  touched: Map<string, { before: string; after: string }>
  /** Each file left as it was that the sweep should have reached: one it couldn't read, one whose root can't round-trip, one whose rewrite failed, and one that changed outside the app while its chunk waited or whose landing failed. */
  skipped: string[]
  /** The files among `skipped` whose root can't round-trip, which only a fix by hand lets a sweep reach, so they're named once and let go (B-5). */
  refused: string[]
}

export type Rewrite = (root: Json, file: string) => Json | null

export type RewriteText = (content: string, file: string, page: SweptPage) => string | null

/** `raw` rewrites a page's front matter or a Space sidecar's object; `text`, when given, rewrites a page's whole text in its place, handed the parse the sweep admitted it by; `above`, when given, places each key a page's rewrite adds. */
export type SweepPlan = {
  raw: Rewrite
  text?: RewriteText
  above?: (root: Json, file: string) => Place
}

/** The plan that renames `from` to `to` in place, in each page's parse and each Space sidecar's object, a held `to` met by `collision`. */
export const rekeySweep = (from: string, to: string, collision: KeyCollision): SweepPlan => ({
  raw: (raw) => rekeyHeld(raw, from, to, collision),
  text: (_content, _file, page) => page.rekey(from, to, collision),
})

export const collectionFolders = (root: string, tree: NexusTree): string[] =>
  [
    ...tree.collections,
    ...damagedFolders(tree.unreadable).filter((u) => u.kind === 'collection'),
  ].map((c) => join(root, c.path))

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
  if (plan.text) return plan.text(content, file, page)
  return rewriteRoot((root) => plan.raw(root, file), plan.above?.(page.raw, file))(page)
}

/** Files are absolute, pages and Space sidecars alike, each rewritten as `rewriteHeld` rewrites it. */
export async function sweepGovernedRoots(
  files: string[],
  plan: SweepPlan,
  dry = false,
): Promise<SweepResult> {
  const out: SweepResult = { touched: new Map(), skipped: [], refused: [] }
  const done = await rewriteHeld(files, (before, file) => rewritten(plan, file, before), dry)
  for (const [file, r] of done) {
    if (r.status === 'rewritten') out.touched.set(file, { before: r.before, after: r.after })
    else out.skipped.push(file)
    if (r.status === 'refused') out.refused.push(file)
  }
  return out
}

/** The id a governed root carries: a page's `ID`, a Space sidecar's `id`. */
export const rootId = (file: string, root: Json): string | undefined =>
  asString(root[isMarkdownFile(file) ? ID_KEY : 'id'])

export async function sweepCount(root: string, files: string[], plan: SweepPlan): Promise<number> {
  const shown = files.filter((file) => !storeOf(relative(root, file)))
  return (await sweepGovernedRoots(shown, plan, true)).touched.size
}

/** Rewrites each page or Space whose ID is in `values` — found where `roots` places it, matched by the ID it carries, and left alone where two files claim it — and answers the IDs whose root now holds what its rewrite asked for, and how many files it couldn't read or write; a null rewrite leaves its root as it is. A key a page's rewrite adds lands above the key `above` names for its ID and that key, and last without one. */
export async function sweepRootsById<T>(
  root: string,
  roots: RootsById,
  values: Record<string, T>,
  above: (id: string, key: string) => string | undefined,
  rewrite: (root: Json, value: T) => Json | null,
): Promise<{ taken: ReadonlySet<string>; skipped: number }> {
  const asked = new Map<string, string>()
  const files = Object.keys(values).flatMap((id) => {
    const at = roots.get(id)
    return at?.kind === 'page' || at?.kind === 'space' ? [rootFile(root, at)] : []
  })
  const swept = await sweepGovernedRoots(files, {
    raw: (raw, file) => {
      const id = rootId(file, raw)
      if (!addressable(root, roots, id, file) || !Object.hasOwn(values, id)) return null
      const next = rewrite(raw, values[id])
      if (next !== null) asked.set(file, id)
      return next
    },
    above: (raw, file) => (key) => above(rootId(file, raw) ?? '', key),
  })
  for (const file of swept.skipped) asked.delete(file)
  return { taken: new Set(asked.values()), skipped: swept.skipped.length }
}

/** The Link entry `value` holds under `def` where it names a page `world` doesn't hold, else null: the one check a refill lands by and a park takes by. */
const goneLink =
  (def: PropertyDefinition, world: PageIndex) =>
  (value: unknown): string | null =>
    PROPERTY_TYPES[def.type].connections === 'value'
      ? gonePageEntry(value, (title) => world.holders(title).length > 0)
      : null

/** `value` landed under `def`'s key as a live reconcile lands it, where `root` reads blank; null where it doesn't land, or where it's a Link naming a page `world` doesn't hold. */
export const refillOf = (def: PropertyDefinition, world: PageIndex) => {
  const gone = goneLink(def, world)
  return (root: Json, value: unknown): Json | null => {
    const next = liveLanding(value, reencode(def, value))
    return gone(value) !== null || next === undefined || !isBlankRaw(root[def.key])
      ? null
      : landValue(root, def.key, next)
  }
}

export function partitionGone(
  def: PropertyDefinition,
  values: Record<string, unknown>,
  world: PageIndex,
  above: Record<string, string | undefined> = {},
): { kept: Record<string, unknown>; gone: StrippedLink[] } {
  const isGone = goneLink(def, world)
  const kept: Record<string, unknown> = {}
  const gone: StrippedLink[] = []
  for (const [page, value] of Object.entries(values)) {
    const entry = isGone(value)
    if (entry === null) kept[page] = value
    else gone.push({ page, property: def.id, value: entry, above: above[page] })
  }
  return { kept, gone }
}

/** Puts each value back as `refillOf` lands it, on the page or Space its ID names wherever that root holds none, above the key `above` names for that ID, and answers the IDs that took theirs. */
export async function refillValues(
  root: string,
  def: PropertyDefinition,
  roots: RootsById,
  values: Record<string, unknown>,
  world: PageIndex,
  above: Record<string, string | undefined> = {},
): Promise<{ taken: ReadonlySet<string>; skipped: number }> {
  return sweepRootsById(root, roots, values, (id) => above[id], refillOf(def, world))
}
