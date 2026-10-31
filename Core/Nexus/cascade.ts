import { isAtOrUnder, isMarkdownFile, join, relative, titleFromPath } from '../Paths/posix'
import { normalizeTitle } from '../Paths/caseFold'
import { stripKeys } from '../Files/rootValues'
import type { Json } from '../Files/stableJson'
import { errText, ok } from '../Contract/result'
import { splitEnvelope, mergeFrontmatter } from '../Files/pageFile'
import { type Rewrite, type RewriteText, rootId, sweepGovernedRoots } from './governedSweep'
import { storeOf } from '../Paths/bundleLayout'
import { pagesInReach, spaceFiles } from '../Index/keyHolders'
import { unsweptLine } from './entities'
import { byKey } from '../Properties/properties'
import { editStashes } from '../Properties/propertyStash'
import { heldTreeOf, liveTreeOf } from './liveTree'
import { pageIndexOf, pagesOf } from './record'
import type { NexusTree } from './tree'
import { rewriteConnections, rewriteHeadingConnections } from '../Connections/rewrite'
import { headingOutline } from '../MarkdownPM/Engine/headingScan'
import { queryMentions } from '../Index/contentIndex'
import { nexusCorpus } from '../Index/indexSeed'
import { linkDefsOf } from '../Properties/propertiesRegistry'
import { linkKeysOf } from '../Properties/validation'
import { readLiveSetting } from '../Settings/settings'
import { rewriteTileConnections, tilesLink } from '../Tiles/tilesFile'
import type { TilesChanged } from '../Tiles/tiles'
import { linkEntry } from '../Connections/linkValue'
import { buildPageIndex, pageKey, pathKeys } from '../Connections/pageIndex'
import { gonePageEntry } from './governedRoot'
import { addressable, nexusPages, storedNodes, twinned } from './heldPages'
import { pathExists } from '../Files/atomicWrite'
import { CONTEXTS_DIR_REL } from '../Paths/nexusPaths'
import { rekeyContext } from '../Contexts/contextCascade'
import { type ConfigReach, NO_REACH } from './configReach'
import {
  type Entry,
  followRelinks,
  type RelinkEntry,
  reachReport,
  relinkNote,
  runNoted,
} from './owed'
import type { z } from 'zod'
import type { strippedLink } from '../Bundles/record'

export interface CascadeReport {
  /** The Nexus paths written outside both stores, which feed the `pages:changed` push; nothing displays a stored path. */
  pages: string[]
  hosts: TilesChanged[]
  warning?: string
  /** An entry still owes what the warning counts, which Try Again finishes. */
  owed?: true
}

/** A re-spell that never ran, or stopped on `e`, under the label it would have reported. */
export const linksNotUpdated = (label: string, e?: unknown): CascadeReport => ({
  pages: [],
  hosts: [],
  warning: `Links to “${label}” weren't updated${e === undefined ? '.' : `: ${errText(e)}`}`,
})

export type StrippedLink = z.infer<typeof strippedLink>

export function joinCascades(
  a: CascadeReport | null | undefined,
  b: CascadeReport | null | undefined,
): CascadeReport | undefined {
  if (!a || !b) return a ?? b ?? undefined
  return {
    pages: [...a.pages, ...b.pages],
    hosts: [...a.hosts, ...b.hosts],
    warning: [a.warning, b.warning].filter(Boolean).join(' ') || undefined,
    ...(a.owed || b.owed ? { owed: true as const } : {}),
  }
}

/** What a delete's strip takes: every Link property value naming a page it took, by any key that now resolves to nothing, in the governed pages outside it, stored ones among them, and in every Space; a key a page the tree holds outside it still answers is left to that page, and bodies keep their links and read unresolved. `files` are its holders, `named` what one root holds of it under the Link `keys`, and `byId` what addresses each holder; null when nothing names a page it took. Nothing at or under `left` is reached, since it left with the delete: the folder it stood in, which the held tree may still list, an archived item's rows, which the index keeps until its artifact leaves the Archive, and the bundle it moved into. */
export async function linkStrip(root: string, left: readonly string[], paths: readonly string[]) {
  const inside = (rel: string): boolean => left.some((at) => isAtOrUnder(rel, at))
  const tree = heldTreeOf(root)
  if (!tree) return null
  const defs = byKey(linkDefsOf(tree.config.registry))
  if (!defs.size) return null
  const stored = await storedNodes(root, tree)
  const { byId, archived } = await nexusPages(root, tree, stored)
  const after = buildPageIndex(
    [...pagesOf(tree), ...archived].filter((p) => !inside(byId.get(p.id)?.path ?? p.path)),
  )
  const gone = new Set(paths.flatMap(pathKeys).filter((k) => after.resolve(k).status === 'phantom'))
  if (!gone.size) return null
  const goneEntry = (value: unknown): string | null =>
    gonePageEntry(value, (t) => !gone.has(pageKey(t)))
  const named = (raw: Record<string, unknown>) =>
    Object.entries(raw).flatMap(([key, held]) => {
      const def = defs.get(key)
      const value = def && goneEntry(held)
      return def && value ? [{ key, def, value }] : []
    })
  const files = [
    ...(await pagesInReach(root, tree, stored, queryMentions([...gone]), 'governed')),
    ...spaceFiles(root, tree, stored, (s) => !!s.values && named(s.values).length > 0),
  ].filter((file) => !inside(relative(root, file)))
  return { files, keys: [...defs.keys()], byId, named }
}

export type LinkStrip = NonNullable<Awaited<ReturnType<typeof linkStrip>>>

/** A delete's strip of what `linkStrip` takes; a linker with no ID, or one of two files claiming one, keeps its value, since no restore could put it back; a copy of a root `byId` addresses elsewhere is passed over unreported, since that root holds what the strip takes. */
export async function deleteCascade(root: string, strip: LinkStrip | null): Promise<ConfigReach> {
  if (!strip) return NO_REACH
  try {
    let heldOut = 0
    const swept = await sweepGovernedRoots(strip.files, {
      raw: (raw, file) => {
        const named = strip.named(raw)
        const id = rootId(file, raw)
        if (named.length && !addressable(root, strip.byId, id, file)) {
          if (!twinned(root, strip.byId, id, file)) heldOut++
          return null
        }
        const keys = named.map(({ key }) => key)
        return stripKeys(raw, keys)
      },
    })
    return {
      skipped: swept.skipped.length + heldOut,
      refused: swept.refused,
      hosts: [],
      pages: [...swept.touched.keys()]
        .map((file) => relative(root, file))
        .filter((rel) => !storeOf(rel)),
    }
  } catch (e) {
    // A strip that stopped counts as one missed file, so its entry stays owed.
    console.error('links weren’t removed:', errText(e))
    return { skipped: 1, hosts: [] }
  }
}

/** The per-file arm every cascade shares: a page's body and its link-holding values through `rewrite`, and a Space sidecar's or a stash block's values alone. `settled` says the editor of `ownRel`, a heading rename's page, already rewrote its body; its frontmatter still takes the patch. */
export function fileRewrites(
  root: string,
  tree: NexusTree,
  rewrite: (text: string, own?: boolean, outlineOf?: string) => string,
  { ownRel, settled = false }: { ownRel?: string; settled?: boolean } = {},
): {
  text: RewriteText
  spaceMoved: Rewrite
  stashMoved: Rewrite
  isLinkKey: (key: string) => boolean
} {
  const isLinkKey = linkKeysOf(tree.config.registry)
  const patchOf = (
    raw: Json,
    isLinkKey: (key: string) => boolean,
    own = false,
    outlineOf = '',
  ): Record<string, string> => {
    const patch: Record<string, string> = {}
    for (const [key, value] of Object.entries(raw)) {
      if (!isLinkKey(key)) continue
      // A string, or a `[[Page]]` yaml read as a nested list; a foreign one-item list stays a list.
      const text = linkEntry(value, 2)
      const next = text === null ? null : rewrite(text, own, outlineOf)
      if (next !== null && next !== text) patch[key] = next
    }
    return patch
  }
  const withPatch = (raw: Json, patch: Record<string, string>): Json | null =>
    Object.keys(patch).length ? { ...raw, ...patch } : null
  return {
    text: (content, file, page) => {
      const { body } = splitEnvelope(content)
      const own = relative(root, file) === ownRel
      const patch = patchOf(page.raw, isLinkKey, own, body)
      const keys = Object.keys(patch)
      const next = own && settled ? body : rewrite(body, own)
      return next === body && keys.length === 0
        ? null
        : mergeFrontmatter(content, patch, keys, next)
    },
    spaceMoved: (raw) => withPatch(raw, patchOf(raw, isLinkKey)),
    // A block holds one property's values, so every entry holds links when the property does.
    stashMoved: (values) =>
      withPatch(
        values,
        patchOf(values, () => true),
      ),
    isLinkKey,
  }
}

/** `label` is what the warning names. */
export type CascadeChange =
  | { names: ReadonlyMap<string, string>; label: string }
  | { path: string; heading: string; to: string }

/** A re-spell sweeps the files the index names under the map's keys, or the whole corpus before there is one; a heading rename sweeps what a ready index names under the page's keys and the page itself always, since its own bare fragments are keyed to no page, and a corpus scan per heading edit is an on-every-edit cost, as a listing of the whole Trash would be, so it lists only the Trash's Contexts, where every stored Space and board sits. Markdown tiles sit outside the index, so a cached list of what they link gates their read. `settled` says the page's editor already rewrote its own body; its frontmatter still takes the patch. */
export async function renameCascade(
  root: string,
  change: CascadeChange,
  settled = false,
): Promise<CascadeReport & { missed: Pick<ConfigReach, 'skipped' | 'refused'> }> {
  const headingKey = 'names' in change ? undefined : normalizeTitle(change.heading)
  const named = 'names' in change ? change.label : `${titleFromPath(change.path)}#${change.heading}`
  try {
    const tree = await liveTreeOf(root)
    const keys = new Set(
      'names' in change ? change.names.keys() : pageIndexOf(tree).namesOf(change.path),
    )
    const rels =
      'names' in change
        ? (queryMentions([...keys]) ?? (await nexusCorpus(root)))
        : [...(queryMentions([...keys], headingKey) ?? []), change.path]
    const runs =
      !('names' in change) &&
      (await readLiveSetting(root, 'inPageHeadingResolution')) === 'automatic'
    const rewrite = (text: string, own = false, outlineOf = text): string =>
      'names' in change
        ? rewriteConnections(text, change.names)
        : rewriteHeadingConnections(
            text,
            keys,
            change.heading,
            change.to,
            own,
            runs && own ? headingOutline(outlineOf).map((h) => h.text) : undefined,
          )
    const { text, spaceMoved, stashMoved, isLinkKey } = fileRewrites(root, tree, rewrite, {
      ownRel: 'names' in change ? undefined : change.path,
      settled,
    })
    const stored = await storedNodes(root, tree, 'names' in change ? undefined : CONTEXTS_DIR_REL)
    const files = [
      ...[...new Set(rels)].map((rel) => join(root, rel)),
      ...spaceFiles(root, tree, stored, (s) => !!s.values && spaceMoved(s.values, '') !== null),
    ]
    const swept = await sweepGovernedRoots(files, { text, raw: spaceMoved })
    const tiles = (await tilesLink(root, stored, keys, headingKey))
      ? await rewriteTileConnections(root, stored, rewrite)
      : { hosts: [], failed: 0 }
    // A heading edit settles often and a stashed Link still reaches its page, so only a re-spell reaches the stashes.
    const linkIds = new Set(tree.config.registry.filter((d) => isLinkKey(d.key)).map((d) => d.id))
    const unstashed =
      'names' in change ? await editStashes(root, tree, stored, linkIds, stashMoved) : 0
    const unmoved = swept.skipped.length + tiles.failed + unstashed
    return {
      pages: [...swept.touched.keys()]
        .map((file) => relative(root, file))
        .filter((rel) => isMarkdownFile(rel) && !storeOf(rel)),
      hosts: tiles.hosts,
      warning: unmoved ? unsweptLine(unmoved, `links to “${named}” in `) : undefined,
      missed: { skipped: unmoved, refused: swept.refused },
    }
  } catch (e) {
    return { ...linksNotUpdated(named, e), missed: { skipped: 1 } }
  }
}

/** A relink entry's sweep: its names re-spelled in every file naming them, or in those of its `files` still there with its `rekey` applied, counting each file it missed. */
export async function relinkReach(root: string, e: RelinkEntry): Promise<ConfigReach> {
  const names = new Map(Object.entries(e.names))
  if (e.files) {
    const here = async (files: string[]): Promise<string[]> =>
      (
        await Promise.all(
          files.map(async (f) => ((await pathExists(join(root, f))) ? [join(root, f)] : [])),
        )
      ).flat()
    const { text, spaceMoved } = fileRewrites(root, await liveTreeOf(root), (t) =>
      rewriteConnections(t, names),
    )
    const rekey = e.rekey && rekeyContext(...e.rekey).raw
    const raw: Rewrite = rekey
      ? (r, f) => rekey(spaceMoved(r, f) ?? r, f) ?? spaceMoved(r, f)
      : spaceMoved
    const swept = await sweepGovernedRoots(await here(e.files), { text, raw })
    return { skipped: swept.skipped.length, refused: swept.refused, hosts: [] }
  }
  const { missed, hosts, pages } = await renameCascade(root, { names, label: e.label })
  return { ...missed, hosts, pages }
}

/** A move's or a restore's re-spell, on the runner under `id`'s relink entry, so what it misses is owed with Try Again; one whose note can't be written still re-spells, owing nothing. Its list step is the move or the landing, already made. */
export async function noteRelink(
  root: string,
  id: string,
  note: (prior: Entry | undefined) => RelinkEntry,
): Promise<CascadeReport> {
  const ran = await runNoted(root, id, {
    note,
    list: async () => ok(null),
    sweep: (_, prior) => relinkReach(root, note(prior)),
    settle: () => undefined,
  })
  return ran.ok ? ran.value.cascade : reachReport(await relinkReach(root, note(undefined)))
}

/** Re-spells `names` under the relink entry of the first page it re-spells for, which every caller passes since only a page re-spells; every other relink entry follows the pages `names` moves and the files `paths` moves. */
export async function respell(
  root: string,
  ids: readonly string[],
  names: Map<string, string>,
  label: string,
  paths?: (file: string) => string,
): Promise<CascadeReport> {
  await followRelinks(root, names, paths, ids[0])
  return noteRelink(root, ids[0], (e) => relinkNote(e, names, label))
}
