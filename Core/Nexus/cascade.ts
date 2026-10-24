import { isAtOrUnder, isMarkdownFile, join, relative, titleFromPath } from '../Paths/posix'
import { normalizeTitle } from '../Paths/caseFold'
import { stripKeys } from '../Files/rootValues'
import type { Json } from '../Files/stableJson'
import { errText } from '../Contract/result'
import { splitEnvelope, mergeFrontmatter, splitFrontmatter } from '../Files/pageFile'
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
import { editCaches } from '../Properties/propertyCache'
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

export interface StrippedLink {
  page: string
  property: string
  value: string
}

interface DeleteCascade {
  cascade: CascadeReport
  links: StrippedLink[]
}

const NO_STRIP: DeleteCascade = { cascade: { pages: [], hosts: [] }, links: [] }

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

/** `cascade` joined with the line counting the files in “title” whose links couldn't be written. */
export function withUnswept(
  cascade: CascadeReport | undefined,
  title: string,
  unswept: readonly string[],
): CascadeReport | undefined {
  if (!unswept.length) return cascade
  return joinCascades(cascade, {
    pages: [],
    hosts: [],
    warning: unsweptLine(unswept.length, `links in “${title}” across `),
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
      const raw = governedRoot(file, before)
      const id = rootId(file, raw)
      if (!id) continue
      for (const { def, value } of named(raw)) links.push({ page: id, property: def.id, value })
    }
    const unswept = swept.skipped.length + heldOut
    return {
      cascade: {
        pages: [...swept.touched.keys()]
          .filter((file) => outsideArchive(root, file))
          .map((file) => relative(root, file)),
        hosts: [],
        warning: unswept ? unsweptLine(unswept, 'links in ') : undefined,
      },
      links,
    }
  } catch (e) {
    return {
      cascade: { pages: [], hosts: [], warning: `Links weren’t removed: ${errText(e)}` },
      links: [],
    }
  }
}

/** The per-file arm every cascade shares: a page's body and its link-holding values through `rewrite`, and a Space sidecar's or a cache block's values alone. `settled` says the editor of `ownRel`, a heading rename's page, already rewrote its body; its frontmatter still takes the patch. */
export function fileRewrites(
  root: string,
  tree: NexusTree,
  rewrite: (text: string, own?: boolean, outlineOf?: string) => string,
  { ownRel, settled = false }: { ownRel?: string; settled?: boolean } = {},
): {
  text: RewriteText
  spaceMoved: Rewrite
  cacheMoved: Rewrite
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
    text: (content, file) => {
      const { body } = splitEnvelope(content)
      const own = relative(root, file) === ownRel
      const patch = patchOf(splitFrontmatter(content), isLinkKey, own, body)
      const keys = Object.keys(patch)
      const next = own && settled ? body : rewrite(body, own)
      return next === body && keys.length === 0
        ? null
        : mergeFrontmatter(content, patch, keys, next)
    },
    spaceMoved: (raw) => withPatch(raw, patchOf(raw, isLinkKey)),
    // A block holds one property's values, so every entry holds links when the property does.
    cacheMoved: (values) =>
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
): Promise<CascadeReport> {
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
    const { text, spaceMoved, cacheMoved, isLinkKey } = fileRewrites(root, tree, rewrite, {
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
    // A heading edit settles often and a cached Link still reaches its page, so only a re-spell reaches the caches.
    const cachedIds = new Set(tree.config.registry.filter((d) => isLinkKey(d.key)).map((d) => d.id))
    const uncached =
      'names' in change ? await editCaches(root, tree.collections, cachedIds, cacheMoved) : 0
    const unmoved = swept.skipped.length + tiles.failed + uncached
    return {
      pages: [...swept.touched.keys()]
        .filter((file) => isMarkdownFile(file) && outsideArchive(root, file))
        .map((file) => relative(root, file)),
      hosts: tiles.hosts,
      warning: unmoved ? unsweptLine(unmoved, `links to “${named}” in `) : undefined,
    }
  } catch (e) {
    return linksNotUpdated(named, e)
  }
}
