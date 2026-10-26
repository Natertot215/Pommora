// Everything that lands a value in one governed file, a page or a Space sidecar: the world it's read against, the reconcile that repairs every governed key, the spelling a write keeps, the one-parse writers, and the put-back that undoes a write.

import { isMarkdownFile, relative } from '../Paths/posix'
import { patchHeldSidecar } from '../Files/sidecar'
import { sidecarPath } from '../Paths/paths'
import { listOf } from '../Contract/validators'
import { fail, fault, ok, type Result } from '../Contract/result'
import { isBlankRaw, landValue, memberKey, namesValue } from '../Files/rootValues'
import { atomicWriteFile, parseJsonObject } from '../Files/atomicWrite'
import { machine } from '../Platform/machine'
import {
  type Place,
  splitFrontmatter,
  sweepParse,
  type SweptPage,
  UNPARSED_FRONTMATTER,
} from '../Files/pageFile'
import type { Json } from '../Files/stableJson'
import { linkEntry, readLinkText } from '../Connections/linkValue'
import { contextKey, contextTitles } from '../Contexts/contexts'
import { type ContextWorld, contextWorldOf, groupOf } from '../Contexts/contextResolve'
import { byKey, type PropertyDefinition } from '../Properties/properties'
import { readRegistry } from '../Properties/propertiesRegistry'
import {
  asText,
  checkedSpelling,
  decodeValue,
  encodeValue,
  isBlankValue,
  keepingForeignWords,
  spelledNumber,
} from '../Properties/propertyValue'
import { liveTreeOf, mutableTarget } from './liveTree'
import { containerSchema } from './treePatch'
import type { ContextGroup, NexusTree } from './tree'
import type { PutBack } from './mutateRequest'

export interface GovernedWorld {
  contexts: ContextWorld
  defs: ReadonlyMap<string, PropertyDefinition>
}

export const governedWorld = (
  tree: NexusTree,
  schema: readonly PropertyDefinition[],
): GovernedWorld => ({
  contexts: contextWorldOf(tree.contexts),
  defs: byKey(schema),
})

// A Space holds any registry property, so its own values reconcile against every definition, by key.
export const spaceWorldOf = (tree: NexusTree): GovernedWorld =>
  governedWorld(tree, tree.config.registry)

export async function pageWorldOf(root: string, absFile: string): Promise<GovernedWorld> {
  const tree = await liveTreeOf(root)
  return governedWorld(tree, containerSchema(tree, relative(root, absFile)))
}

/** The pages a frozen copy may still name: `holds` answers which still exist. */
export interface Frozen {
  holds: (title: string) => boolean
}

export function gonePageEntry(raw: unknown, frozen: Frozen): string | null {
  const entry = linkEntry(raw, 2)
  const link = entry === null ? null : readLinkText(entry)
  const gone = link?.kind === 'page' && link.title !== '' && !frozen.holds(link.title)
  return gone ? entry : null
}

/** `next` spelled as `raw` already spells it: a checked `true` takes `raw`'s checkbox word as `checkedSpelling` does, a number keeps `raw`'s spelling as `spelledNumber` does, a string keeps a `raw` of any other shape whose inline yaml reads as that string, a one-member list keeps a scalar or a whole unquoted wikilink `raw` that spells its member, and each member takes the one member of `raw` whose title is its own — a scalar of any shape, or an unquoted wikilink. A member `raw` names more than once keeps the spelling `next` gives it, the registered one. */
export function writtenSpelling(next: unknown, raw: unknown): unknown {
  if (next === true) return checkedSpelling(raw)
  if (typeof next === 'number') return spelledNumber(next, raw)
  if (typeof next === 'string')
    return raw != null && typeof raw !== 'string' && asText(raw) === next ? raw : next
  if (!Array.isArray(next)) return next
  if (next.length === 1 && memberKey(linkEntry(raw, 2) ?? raw) === memberKey(next[0])) return raw
  const held = listOf(raw)
  return next.map((v) => {
    const names = namesValue(v)
    const named = held.filter((w) => names(linkEntry(w, 2) ?? w))
    return named.length === 1 ? named[0] : v
  })
}

/** `raw` read and written back through `def`, spelled as `raw` spells it, `next` undefined when it reads as nothing; a Multi-Select keeps its words no option names after its own. `listed` when the value is a list. */
export function reencode(
  def: PropertyDefinition,
  raw: unknown,
): { next: unknown; listed: boolean } {
  const value = decodeValue(def, raw)
  const listed = 'value' in value && Array.isArray(value.value)
  if (isBlankValue(value)) return { next: undefined, listed }
  const kept = keepingForeignWords(def, encodeValue(def, value), raw)
  return { next: writtenSpelling(kept, raw), listed }
}

type Governor = { def: PropertyDefinition } | { group: ContextGroup }

function governorOf(key: string, world: GovernedWorld): Governor | undefined {
  const def = world.defs.get(key)
  if (def) return { def }
  const group = groupOf(key, world.contexts)
  return group && { group }
}

const memberCount = (v: unknown): number => new Set(listOf(v).map(memberKey)).size

/** Whether `next` holds `raw`'s members exactly, each once, in whatever order. */
const sameMembers = (next: unknown, raw: unknown): boolean =>
  Array.isArray(next) &&
  Array.isArray(raw) &&
  next.length === raw.length &&
  [next, raw, [...next, ...raw]].every((v) => memberCount(v) === raw.length)

/** What a live reconcile lands for `raw` read as `next`: `raw` as written where `next` would blank it, would only reorder it, or, `listed`, would drop a list member it can't resolve, for the user to settle; else `next`, undefined where `raw` reads blank. */
export const liveLanding = (raw: unknown, { next, listed }: { next: unknown; listed: boolean }) =>
  (next === undefined && !isBlankRaw(raw)) ||
  (listed && memberCount(next) < memberCount(raw)) ||
  sameMembers(next, raw)
    ? raw
    : next

export function reconcileGovernedRoot(
  root: Record<string, unknown>,
  world: GovernedWorld,
  skip?: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(root)) {
    const governor = key === skip ? undefined : governorOf(key, world)
    if (!governor) {
      out[key] = raw
      continue
    }
    let next: unknown
    let listed = true
    if ('def' in governor) ({ next, listed } = reencode(governor.def, raw))
    else {
      const byTitle = world.contexts.spacesByTitle.get(governor.group.def.id)
      const titles = contextTitles(raw).flatMap((title) => byTitle?.get(title)?.title ?? [])
      if (titles.length) next = writtenSpelling([...new Set(titles)], raw)
    }
    next = liveLanding(raw, { next, listed })
    if (next !== undefined) out[key] = next
  }
  return out
}

/** `root` with `value` under `key`, its members spelled as the root already spells them, after the reconcile repairs every other governed key; null when that changes nothing, so nothing is written. */
export function writtenRoot(
  root: Json,
  key: string,
  value: unknown,
  world: GovernedWorld,
): Json | null {
  const reconciled = reconcileGovernedRoot(root, world, key)
  const def = world.defs.get(key)
  const kept = def ? keepingForeignWords(def, value, root[key]) : value
  const next = landValue(reconciled, key, writtenSpelling(kept, root[key]))
  return changedKeys(root, next).length ? next : null
}

/** The root a governed file holds: a page's frontmatter, or a Space sidecar's object. */
export const governedRoot = (file: string, text: string): Json =>
  isMarkdownFile(file) ? splitFrontmatter(text) : (parseJsonObject(text) ?? {})

export const changedKeys = (root: Json, next: Json): string[] =>
  [...new Set([...Object.keys(root), ...Object.keys(next)])].filter(
    (k) => JSON.stringify(root[k]) !== JSON.stringify(next[k]),
  )

/** A page's next text with the keys `rewrite` changes merged in, a key it adds landing where `above` places it, and last without one; null when it changes none. A changed key the next root holds no value for is deleted. */
export const rewriteRoot =
  (rewrite: (root: Json) => Json | null, above?: Place) =>
  (page: SweptPage): string | null => {
    const next = rewrite(page.raw)
    if (next === null) return null
    const keys = changedKeys(page.raw, next)
    if (!keys.length) return null
    return page.merge(next, keys, above)
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

/** Writes `value` under `key` in the page or Space sidecar at `abs`, answering what the key held before and, on a page, the key its line stood above, as `PutBack` spells them. Takes no lock: its caller holds the file's, as `rewriteRootAt`'s does. */
export async function writeGovernedKey(
  abs: string,
  key: string,
  value: unknown,
  world: GovernedWorld,
): Promise<Result<Pick<PutBack, 'before' | 'above'>>> {
  const was: Pick<PutBack, 'before' | 'above'> = {}
  const written = isMarkdownFile(abs)
    ? await rewriteRootAt(abs, (page) => {
        was.before = page.pair(key)
        was.above = page.above(key)
        return rewriteRoot((root) => writtenRoot(root, key, value, world))(page)
      })
    : await patchHeldSidecar(abs, 'space', (root) => {
        was.before = root[key]
        return writtenRoot(root, key, value, world)
      })
  return written.ok ? ok(was) : written
}

/** The key a property or a Context is written under now. A Context resolves from the tree first, so a tag's undo never reads the property list, which a damaged file makes throw. */
async function keyNow(root: string, id: string): Promise<string | undefined> {
  const group = contextWorldOf((await liveTreeOf(root)).contexts).groupById.get(id)
  if (group) return contextKey(group.def.title)
  return (await readRegistry(root)).defs[id]?.key
}

/** Puts each entry's key back as its file held it before the write that recorded it, a page's own node verbatim and a blank one as no line, and a key the page no longer holds above the key it stood above, leaving every other key as it now stands and a file whose key already reads so unwritten; answers the entries it couldn't put back. */
export async function putBackEntries(
  root: string,
  entries: readonly PutBack[],
): Promise<PutBack[]> {
  const missed: PutBack[] = []
  for (const entry of entries) if (!(await landEntry(root, entry))) missed.push(entry)
  return missed
}

// Each key is read inside its file's lock, as the write read it, so a key renamed since lands under its new name; a pair that no longer serializes, such as an alias whose anchor an outside edit removed, is missed.
async function landEntry(
  root: string,
  { file, fieldId, before, above }: PutBack,
): Promise<boolean> {
  if (!isMarkdownFile(file)) {
    const at = await mutableTarget(root, file, ['space'])
    if (!at.ok) return false
    return machine().lock(sidecarPath(at.value, 'space'), async () => {
      const key = await keyNow(root, fieldId)
      if (key === undefined) return false
      const back = await patchHeldSidecar(at.value, 'space', (raw) => {
        const next = landValue(raw, key, before)
        return changedKeys(raw, next).length ? next : null
      })
      return back.ok
    })
  }
  const at = await mutableTarget(root, file, ['page'])
  if (!at.ok || !(before === undefined || typeof before === 'string')) return false
  return machine().lock(at.value, async () => {
    const key = await keyNow(root, fieldId)
    if (key === undefined) return false
    return rewriteRootAt(at.value, (page) => page.withPair(key, before, above)).then(
      (r) => r.ok,
      () => false,
    )
  })
}
