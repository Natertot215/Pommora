import { isAtOrUnder, isMarkdownFile, join, relative, titleFromPath } from '../Paths/posix'
import { normalizeTitle } from '../Paths/caseFold'
import { stripKeys } from '../Files/rootValues'
import type { Json } from '../Files/stableJson'
import { errText } from '../Contract/result'
import { splitEnvelope, mergeFrontmatter, splitFrontmatter, stampedId } from '../Files/pageFile'
import {
  type Rewrite,
  type RewriteText,
  governedRoot,
  sweepGovernedRoots,
  unsweptLine,
} from '../Properties/governedSweep'
import { byKey } from '../Properties/properties'
import { editCaches } from '../Properties/propertyCache'
import { heldTreeOf, liveTreeOf } from './liveTree'
import { pageIndexOf, pagesOf } from './record'
import type { NexusTree } from './tree'
import { withheldIn } from './treePatch'
import {
  type CascadeChange,
  rewriteConnections,
  rewriteHeadingConnections,
} from '../Connections/rewrite'
import { headingOutline } from '../MarkdownPM/Engine/headingScan'
import { queryMentions } from '../Index/contentIndex'
import { nexusCorpus } from '../Index/indexSeed'
import { linkDefsOf } from '../Properties/propertiesRegistry'
import { linkKeysOf } from '../Properties/schema'
import { readLiveSetting } from '../Settings/settings'
import { rewriteTileConnections, tilesLink } from '../Tiles/tilesFile'
import type { TilesChanged } from '../Tiles/tiles'
import { linkEntry } from '../Connections/linkValue'
import { buildPageIndex, pageKey, pathKeys } from '../Connections/pageIndex'
import { gonePageEntry } from '../Properties/propertyValue'
import { liveIdIndex, livePathOf } from './heldPages'
import { ID_KEY } from './identityMark'
import { asString } from './coerce'

export interface CascadeReport {
  pages: string[]
  hosts: TilesChanged[]
  warning?: string
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

/** A sweep's Space sidecar arm, planned only when a Space the tree holds answers `rewrite`, since the arm reads every Space sidecar. */
const spaceArm = (tree: NexusTree | null, rewrite: Rewrite): { sidecars?: Rewrite } =>
  tree?.contexts.some((g) => g.spaces.some((s) => s.values && rewrite(s.values, '') !== null))
    ? { sidecars: rewrite }
    : {}

export const joinCascades = (a: CascadeReport, b: CascadeReport): CascadeReport => ({
  pages: [...a.pages, ...b.pages],
  hosts: [...a.hosts, ...b.hosts],
  warning: [a.warning, b.warning].filter(Boolean).join(' ') || undefined,
})

/** A delete strips every Link property value naming a page it took, by any key that now resolves to nothing, from the pages and Spaces the tree holds outside it; a key a page outside still answers is left to that page, and bodies keep their links and read unresolved. Nothing at or under `abs` is swept, since it left with the delete. */
export async function deleteCascade(
  root: string,
  abs: string,
  paths: readonly string[],
): Promise<DeleteCascade> {
  const deleted = relative(root, abs)
  const inside = (rel: string): boolean => isAtOrUnder(rel, deleted)
  const tree = heldTreeOf(root)
  // The held tree may still list the deleted pages, since its patch can fall to a walk, so they're left out by path; with no tree, nothing answers and every key strips.
  const after = buildPageIndex(tree ? pagesOf(tree).filter((p) => !inside(p.path)) : [])
  const gone = new Set(paths.flatMap(pathKeys).filter((k) => after.resolve(k).status === 'phantom'))
  try {
    const defs = byKey(linkDefsOf(tree?.config.registry ?? []))
    if (!defs.size || !gone.size) return { cascade: { pages: [], hosts: [] }, links: [] }
    const rels = queryMentions([...gone]) ?? (await nexusCorpus(root))
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
    // Tree pages, and the pages beneath a folder the tree withholds: a loose file outside every Collection shows in no view and no restore could reach it; dropping this filter strips them too.
    const held = liveIdIndex(root)
    const withheld = withheldIn(tree?.unreadable)
    const files = rels
      .filter((rel) => (held.has(rel) || withheld(rel)) && !inside(rel))
      .map((rel) => join(root, rel))
    let twins = 0
    const swept = await sweepGovernedRoots(root, files, {
      raw: (raw, file) => {
        const id = asString(raw[ID_KEY])
        if (
          named(raw).length &&
          id !== undefined &&
          livePathOf(root, id) === null &&
          !withheld(relative(root, file))
        ) {
          twins++
          return null
        }
        return strip(raw, file)
      },
      ...spaceArm(tree, strip),
    })
    const links: StrippedLink[] = []
    for (const [file, { before }] of swept.touched) {
      const raw = governedRoot(file, before)
      const id = isMarkdownFile(file) ? stampedId(before) : asString(raw.id)
      if (!id) continue
      for (const { def, value } of named(raw)) links.push({ page: id, property: def.id, value })
    }
    const unswept = swept.skipped.length + twins
    return {
      cascade: {
        pages: [...swept.touched.keys()].map((file) => relative(root, file)),
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
): { text: RewriteText; spaceMoved: Rewrite; cacheMoved: Rewrite } {
  const holds = linkKeysOf(tree.config.registry)
  const patchOf = (
    raw: Json,
    holds: (key: string) => boolean,
    own = false,
    outlineOf = '',
  ): Record<string, string> => {
    const patch: Record<string, string> = {}
    for (const [key, value] of Object.entries(raw)) {
      if (!holds(key)) continue
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
      const patch = patchOf(splitFrontmatter(content), holds, own, body)
      const keys = Object.keys(patch)
      const next = own && settled ? body : rewrite(body, own)
      return next === body && keys.length === 0
        ? null
        : mergeFrontmatter(content, patch, keys, next)
    },
    spaceMoved: (raw) => withPatch(raw, patchOf(raw, holds)),
    // A block holds one property's values, so every entry holds links when the property does.
    cacheMoved: (values) =>
      withPatch(
        values,
        patchOf(values, () => true),
      ),
  }
}

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
    const { text, spaceMoved, cacheMoved } = fileRewrites(root, tree, rewrite, {
      ownRel: 'names' in change ? undefined : change.path,
      settled,
    })
    const files = [...new Set(rels)].map((rel) => join(root, rel))
    const swept = await sweepGovernedRoots(root, files, {
      text,
      ...spaceArm(tree, spaceMoved),
    })
    const tiles = (await tilesLink(root, keys, headingKey))
      ? await rewriteTileConnections(root, rewrite)
      : { hosts: [], failed: 0 }
    // A heading edit settles often and a cached Link still reaches its page, so only a re-spell reaches the caches.
    const defs = tree.config.registry
    const holds = linkKeysOf(defs)
    const cachedIds = new Set(defs.filter((d) => holds(d.key)).map((d) => d.id))
    const uncached =
      'names' in change ? await editCaches(root, tree.collections, cachedIds, cacheMoved) : 0
    const unmoved = swept.skipped.length + tiles.failed + uncached
    return {
      pages: [...swept.touched.keys()].filter(isMarkdownFile).map((file) => relative(root, file)),
      hosts: tiles.hosts,
      warning: unmoved ? unsweptLine(unmoved, `links to “${named}” in `) : undefined,
    }
  } catch (e) {
    return linksNotUpdated(named, e)
  }
}
