import { isAtOrUnder, isMarkdownFile, join, relative, titleFromPath } from '../Paths/posix'
import { normalizeTitle } from '../Paths/caseFold'
import { isBlankRaw, landValue, stripKeys } from '../Files/rootValues'
import { type Json, same } from '../Files/stableJson'
import { errText, ok } from '../Contract/result'
import { splitEnvelope, mergeFrontmatter, sweepParse } from '../Files/pageFile'
import {
  type Rewrite,
  type RewriteText,
  outsideArchive,
  rootId,
  sweepGovernedRoots,
} from './governedSweep'
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
import { gonePageEntry, governedRoot } from './governedRoot'
import { addressable, nexusPages } from './heldPages'
import { pathExists } from '../Files/atomicWrite'
import { rekeyContext } from '../Contexts/contextCascade'
import { type ConfigReach, reachReport } from './configReach'
import { type Entry, type RelinkEntry, runNoted, type Worked } from './owed'
import type { z } from 'zod'
import type { strippedLink } from '../Bundles/record'

export interface CascadeReport {
  /** The Nexus paths written outside the Archive, which feed the `pages:changed` push; nothing displays an archived path. */
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

interface DeleteCascade {
  reach: ConfigReach
  links: StrippedLink[]
}

const NO_STRIP: DeleteCascade = { reach: { skipped: 0, hosts: [] }, links: [] }

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

/** `cascade` joined with the line counting the files in “title” whose values a restore couldn't reconcile. */
export function withUnswept(
  cascade: CascadeReport | undefined,
  title: string,
  unswept: readonly string[],
): CascadeReport | undefined {
  if (!unswept.length) return cascade
  return joinCascades(cascade, {
    pages: [],
    hosts: [],
    warning: unsweptLine(unswept.length, `values in “${title}” across `),
  })
}

/** A delete strips every Link property value naming a page it took, by any key that now resolves to nothing, from the governed pages outside it, archived ones among them, and from every Space; a key a page the tree holds outside it still answers is left to that page, and bodies keep their links and read unresolved. A linker with no ID, or one of two files claiming one, keeps its value, since no restore could put it back. Nothing at or under `abs` is swept, since it left with the delete. */
export async function deleteCascade(
  root: string,
  abs: string,
  paths: readonly string[],
): Promise<DeleteCascade> {
  const deleted = relative(root, abs)
  const inside = (rel: string): boolean => isAtOrUnder(rel, deleted)
  const tree = heldTreeOf(root)
  if (!tree) return NO_STRIP
  const defs = byKey(linkDefsOf(tree.config.registry))
  if (!defs.size) return NO_STRIP
  try {
    // The held tree may still list the deleted pages, since its patch can fall to a walk, so they're left out by path.
    const { byId, archived } = await nexusPages(root, tree)
    const after = buildPageIndex([...pagesOf(tree).filter((p) => !inside(p.path)), ...archived])
    const gone = new Set(
      paths.flatMap(pathKeys).filter((k) => after.resolve(k).status === 'phantom'),
    )
    if (!gone.size) return NO_STRIP
    const goneEntry = (value: unknown): string | null =>
      gonePageEntry(value, { holds: (t) => !gone.has(pageKey(t)) })
    const named = (raw: Record<string, unknown>) =>
      Object.entries(raw).flatMap(([key, held]) => {
        const def = defs.get(key)
        const value = def && goneEntry(held)
        return def && value ? [{ key, def, value }] : []
      })
    const strip: Rewrite = (raw) =>
      stripKeys(
        raw,
        named(raw).map(({ key }) => key),
      )
    const files = [
      ...(await pagesInReach(root, tree, queryMentions([...gone]), 'governed')),
      ...spaceFiles(root, tree, (s) => !!s.values && strip(s.values, '') !== null),
    ].filter((file) => !inside(relative(root, file)))
    let heldOut = 0
    const swept = await sweepGovernedRoots(files, {
      raw: (raw, file) => {
        if (named(raw).length && !addressable(byId, rootId(file, raw))) {
          heldOut++
          return null
        }
        return strip(raw, file)
      },
    })
    const links: StrippedLink[] = []
    for (const [file, { before }] of swept.touched) {
      const page = isMarkdownFile(file) ? sweepParse(before) : null
      const raw = page?.raw ?? governedRoot(file, before)
      const id = rootId(file, raw)
      if (!id) continue
      for (const { def, key, value } of named(raw))
        links.push({ page: id, property: def.id, value, above: page?.above(key) })
    }
    const unswept = swept.skipped.length + heldOut
    return {
      reach: {
        skipped: unswept,
        refused: swept.refused,
        hosts: [],
        pages: [...swept.touched.keys()]
          .filter((file) => outsideArchive(root, file))
          .map((file) => relative(root, file)),
      },
      links,
    }
  } catch (e) {
    // A strip that stopped counts as one missed file, so its entry stays owed.
    console.error('links weren’t removed:', errText(e))
    return { reach: { skipped: 1, hosts: [] }, links: [] }
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

/** A re-spell sweeps the files the index names under the map's keys, or the whole corpus before there is one; a heading rename sweeps what a ready index names under the page's keys and the page itself always, since its own bare fragments are keyed to no page, and a corpus scan per heading edit is an on-every-edit cost. Markdown tiles sit outside the index, so a cached list of what they link gates their read. `settled` says the page's editor already rewrote its own body; its frontmatter still takes the patch. */
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
    const files = [
      ...[...new Set(rels)].map((rel) => join(root, rel)),
      ...spaceFiles(root, tree, (s) => !!s.values && spaceMoved(s.values, '') !== null),
    ]
    const swept = await sweepGovernedRoots(files, { text, raw: spaceMoved })
    const tiles = (await tilesLink(root, keys, headingKey))
      ? await rewriteTileConnections(root, rewrite)
      : { hosts: [], failed: 0 }
    // A heading edit settles often and a stashed Link still reaches its page, so only a re-spell reaches the stashes.
    const linkIds = new Set(tree.config.registry.filter((d) => isLinkKey(d.key)).map((d) => d.id))
    const unstashed =
      'names' in change ? await editStashes(root, tree.collections, linkIds, stashMoved) : 0
    const unmoved = swept.skipped.length + tiles.failed + unstashed
    return {
      pages: [...swept.touched.keys()]
        .filter((file) => isMarkdownFile(file) && outsideArchive(root, file))
        .map((file) => relative(root, file)),
      hosts: tiles.hosts,
      warning: unmoved ? unsweptLine(unmoved, `links to “${named}” in `) : undefined,
      missed: { skipped: unmoved, refused: swept.refused },
    }
  } catch (e) {
    return { ...linksNotUpdated(named, e), missed: { skipped: 1 } }
  }
}

/** `raw` with each value a restore worked out for it landed where it still reads what the restore found, blank matching blank; null where none does. */
function landWorked(raw: Json, worked: Worked[string] = {}): Json | null {
  const keys = Object.keys(worked).filter((k) =>
    isBlankRaw(raw[k]) ? isBlankRaw(worked[k].from) : same(raw[k], worked[k].from),
  )
  if (!keys.length) return null
  return keys.reduce((r, k) => landValue(r, k, worked[k].to), raw)
}

/** A relink entry's sweep: what a restore worked out landed first in the files `values` names, then its names re-spelled in every file naming them, or in those of its `files` still there with its `rekey` applied, counting each file either missed once. */
export async function relinkReach(root: string, e: RelinkEntry): Promise<ConfigReach> {
  const names = new Map(Object.entries(e.names))
  if (e.files) {
    const here = async (files: string[]): Promise<string[]> =>
      (
        await Promise.all(
          files.map(async (f) => ((await pathExists(join(root, f))) ? [join(root, f)] : [])),
        )
      ).flat()
    const landed = await sweepGovernedRoots(await here(Object.keys(e.values ?? {})), {
      raw: (r, f) => landWorked(r, e.values?.[relative(root, f)]),
    })
    const { text, spaceMoved } = fileRewrites(root, await liveTreeOf(root), (t) =>
      rewriteConnections(t, names),
    )
    const rekey = e.rekey && rekeyContext(...e.rekey).raw
    const raw: Rewrite = rekey
      ? (r, f) => rekey(spaceMoved(r, f) ?? r, f) ?? spaceMoved(r, f)
      : spaceMoved
    const swept = await sweepGovernedRoots(await here(e.files), { text, raw })
    const missed = (k: 'skipped' | 'refused'): string[] => [...new Set([...landed[k], ...swept[k]])]
    return { skipped: missed('skipped').length, refused: missed('refused'), hosts: [] }
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
