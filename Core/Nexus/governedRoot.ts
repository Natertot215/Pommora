// Everything that lands a value in one governed file: the world it's read against, the reconcile that repairs every governed key, the spelling a write keeps, and the one-parse writer.

import { isMarkdownFile, join, relative } from '../Paths/posix'
import { listOf } from '../Contract/validators'
import { fail, fault, ok, type Result } from '../Contract/result'
import { landValue, memberKey, namesValue } from '../Files/rootValues'
import { atomicWriteFile, parseJsonObject } from '../Files/atomicWrite'
import { machine } from '../Platform/machine'
import {
  splitFrontmatter,
  sweepParse,
  type SweptPage,
  UNPARSED_FRONTMATTER,
} from '../Files/pageFile'
import type { Json } from '../Files/stableJson'
import { linkEntry, readLinkText } from '../Connections/linkValue'
import { contextTitles } from '../Contexts/contexts'
import { type ContextWorld, contextWorldOf, groupOf } from '../Contexts/contextResolve'
import { byKey, type PropertyDefinition } from '../Properties/properties'
import {
  asText,
  checkedSpelling,
  decodeValue,
  encodeValue,
  isBlankValue,
  keepingForeignWords,
  spelledNumber,
} from '../Properties/propertyValue'
import { assignedDefs } from '../Properties/assignment'
import { liveTreeOf } from './liveTree'
import { owningCollection } from './treePatch'
import type { ContextGroup, NexusTree } from './tree'

export interface GovernedWorld {
  contexts: ContextWorld
  defs: ReadonlyMap<string, PropertyDefinition>
}

export const governedWorld = (
  tree: NexusTree,
  defs: ReadonlyMap<string, PropertyDefinition>,
): GovernedWorld => ({
  contexts: contextWorldOf(tree.contexts),
  defs,
})

// A Space holds any registry property, so its own values reconcile against every definition, by key.
export const spaceWorldOf = (tree: NexusTree): GovernedWorld =>
  governedWorld(tree, byKey(tree.config.registry))

export async function pageWorldOf(root: string, absFile: string): Promise<GovernedWorld> {
  const tree = await liveTreeOf(root)
  const owner = owningCollection(tree, relative(root, absFile))
  return governedWorld(tree, await assignedDefs(root, owner ? join(root, owner.path) : null))
}

/** What a frozen copy may still name: its options are the definition's own, and `holds`, when given, answers which pages still exist. */
export interface Frozen {
  holds?: (title: string) => boolean
}

export function gonePageEntry(raw: unknown, frozen: Frozen): string | null {
  const entry = linkEntry(raw, 2)
  const link = entry === null ? null : readLinkText(entry)
  const gone =
    link?.kind === 'page' &&
    link.title !== '' &&
    frozen.holds !== undefined &&
    !frozen.holds(link.title)
  return gone ? entry : null
}

/** `next` spelled as `raw` already spells it: a checked `true` takes `raw`'s checkbox word as `checkedSpelling` does, a number keeps `raw`'s spelling as `spelledNumber` does, a string keeps a `raw` of any other shape whose inline yaml reads as that string, a one-member list keeps a whole unquoted wikilink `raw` that spells its member, and each member takes the one member of `raw` whose title is its own — a scalar of any shape, or an unquoted wikilink. A member `raw` names more than once keeps the spelling `next` gives it, the registered one. */
export function writtenSpelling(next: unknown, raw: unknown): unknown {
  if (next === true) return checkedSpelling(raw)
  if (typeof next === 'number') return spelledNumber(next, raw)
  if (typeof next === 'string')
    return raw != null && typeof raw !== 'string' && asText(raw) === next ? raw : next
  if (!Array.isArray(next)) return next
  if (next.length === 1 && Array.isArray(raw) && linkEntry(raw, 2) === next[0]) return raw
  const held = listOf(raw)
  return next.map((v) => {
    const names = namesValue(v)
    const named = held.filter((w) => names(linkEntry(w, 2) ?? w))
    return named.length === 1 ? named[0] : v
  })
}

// A restore of a frozen copy keeps only the options the definition still offers and the pages its world holds, so a deleted option or page never comes back through it.
/** `raw` read and written back through `def`, spelled as `raw` spells it, `next` undefined when it reads as nothing or, under `frozen`, names a page gone; a live read keeps a Multi-Select's words no option names after its own. `listed` when the value is a list. */
export function reencode(
  def: PropertyDefinition,
  raw: unknown,
  frozen?: Frozen,
): { next: unknown; listed: boolean } {
  const value = decodeValue(def, raw)
  const listed = 'value' in value && Array.isArray(value.value)
  const gone = frozen && value.kind === 'link' && gonePageEntry(value.value, frozen) !== null
  if (gone || isBlankValue(value)) return { next: undefined, listed }
  const encoded = encodeValue(def, value)
  const kept = frozen ? encoded : keepingForeignWords(def, encoded, raw)
  return { next: writtenSpelling(kept, raw), listed }
}

interface Reconciled {
  root: Record<string, unknown>
  changed: string[]
}

type Governor = { def: PropertyDefinition } | { group: ContextGroup }

function governorOf(key: string, world: GovernedWorld): Governor | undefined {
  const def = world.defs.get(key)
  if (def) return { def }
  const group = groupOf(key, world.contexts)
  return group && { group }
}

const memberCount = (v: unknown): number => new Set(listOf(v).map(memberKey)).size

export function reconcileGovernedRoot(
  root: Record<string, unknown>,
  world: GovernedWorld,
  frozen?: Frozen,
  skip?: string,
): Reconciled {
  const out: Record<string, unknown> = {}
  const changed: string[] = []
  for (const [key, raw] of Object.entries(root)) {
    const governor = key === skip ? undefined : governorOf(key, world)
    if (!governor) {
      out[key] = raw
      continue
    }
    let next: unknown
    let listed = true
    if ('def' in governor) ({ next, listed } = reencode(governor.def, raw, frozen))
    else {
      const byTitle = world.contexts.spacesByTitle.get(governor.group.def.id)
      const titles = contextTitles(raw).flatMap((title) => byTitle?.get(title)?.title ?? [])
      if (titles.length) next = writtenSpelling([...new Set(titles)], raw)
    }
    // A live reconcile never blanks a value, and never drops a list member it can't resolve: either stays as written for the user to settle. A single value lands as it reads.
    if (!frozen && (next === undefined || (listed && memberCount(next) < memberCount(raw)))) {
      out[key] = raw
      continue
    }
    if (next === undefined) {
      changed.push(key)
      continue
    }
    out[key] = next
    if (JSON.stringify(next) !== JSON.stringify(raw)) changed.push(key)
  }
  return { root: out, changed }
}

/** `raw` with `value` under `key`, its members spelled as the root already spells them, after the reconcile repairs every other governed key. */
export function writtenRoot(raw: Json, key: string, value: unknown, world: GovernedWorld): Json {
  const reconciled = reconcileGovernedRoot(raw, world, undefined, key).root
  const def = world.defs.get(key)
  const kept = def ? keepingForeignWords(def, value, raw[key]) : value
  return landValue(reconciled, key, writtenSpelling(kept, raw[key]))
}

/** The root a governed file holds: a page's frontmatter, or a Space sidecar's object. */
export const governedRoot = (file: string, text: string): Json =>
  isMarkdownFile(file) ? splitFrontmatter(text) : (parseJsonObject(text) ?? {})

export const changedKeys = (raw: Json, next: Json): string[] =>
  [...new Set([...Object.keys(raw), ...Object.keys(next)])].filter(
    (k) => JSON.stringify(raw[k]) !== JSON.stringify(next[k]),
  )

/** A page's next text with the keys `rewrite` changes merged in; null when it changes none. A changed key the next root holds no value for is deleted. */
export const rewriteRaw =
  (rewrite: (raw: Json) => Json | null) =>
  (page: SweptPage): string | null => {
    const next = rewrite(page.raw)
    if (next === null) return null
    const keys = changedKeys(page.raw, next)
    if (!keys.length) return null
    const modeled: Json = {}
    for (const k of keys) if (k in next) modeled[k] = next[k]
    return page.merge(modeled, keys)
  }

/** Rewrites the page at `absFile` in one parse, writing the text `rewrite` answers for it, or nothing for null. Takes no lock: each caller holds the page's lock over a wider span, and a re-take is refused. */
export async function rewriteRootAt(
  absFile: string,
  rewrite: (page: SweptPage) => string | null,
): Promise<Result<null>> {
  let content: string | null
  try {
    content = await machine().readText(absFile)
  } catch {
    return fault('That page could not be read.')
  }
  if (content === null) return fail('not-found', 'Page not found.')
  const page = sweepParse(content)
  if (!page) return fault(UNPARSED_FRONTMATTER)
  const next = rewrite(page)
  if (next !== null) await atomicWriteFile(absFile, next)
  return ok(null)
}
