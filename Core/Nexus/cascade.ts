import { isAtOrUnder, isMarkdownFile, join, relative, titleFromPath } from '../Paths/posix'
import { foldKey, normalizeTitle } from '../Paths/caseFold'
import { heldKey, stripKeys } from '../Files/heldKeys'
import { errText } from '../Contract/result'
import { splitEnvelope, mergeFrontmatter, splitFrontmatter, stampedId } from '../Files/pageFile'
import {
  type Rewrite,
  governedRoot,
  sweepGovernedRoots,
  unsweptLine,
} from '../Properties/governedSweep'
import { byFoldedName } from '../Properties/properties'
import { editCaches } from '../Properties/propertyCache'
import { heldTreeOf } from './liveTree'
import type { NexusTree } from './tree'
import { withheldIn } from './treePatch'
import {
  type RenameChange,
  rewriteConnections,
  rewriteFrontmatterConnections,
  rewriteHeadingConnections,
} from '../Connections/rewrite'
import { headingOutline } from '../MarkdownPM/Engine/headingScan'
import { queryHeadingMentions, queryMentions } from '../Index/contentIndex'
import { nexusCorpus } from '../Index/indexSeed'
import { linkDefs, readKeptRegistry } from '../Properties/propertiesRegistry'
import { readLiveSetting } from '../Settings/settings'
import { rewriteTileConnections, tilesLinkHeading } from '../Tiles/tilesFile'
import type { TilesChanged } from '../Tiles/tiles'
import { linkEntry, readLink } from '../Connections/linkValue'
import { frontmatterMentions, valueLinks } from '../Connections/scan'
import { liveIdIndex, livePathOf, titleHeldOutside } from './heldPages'
import { ID_KEY } from './identityMark'
import { asString } from './coerce'

export interface CascadeReport {
  pages: string[]
  hosts: TilesChanged[]
  warning?: string
}

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

/** Whether a Space the tree holds links `title#heading` — as a whole value or inside one — which no index names. */
export function spacesLinkHeading(root: string, title: string, heading: string): boolean {
  const [page, section] = [normalizeTitle(title), normalizeTitle(heading)]
  return (heldTreeOf(root)?.contexts ?? []).some((g) =>
    g.spaces.some(({ values = {} }) =>
      [...frontmatterMentions(values), ...valueLinks(values)].some(
        (h) => h.target === page && h.qualifier === section,
      ),
    ),
  )
}

export const joinCascades = (a: CascadeReport, b: CascadeReport): CascadeReport => ({
  pages: [...a.pages, ...b.pages],
  hosts: [...a.hosts, ...b.hosts],
  warning: [a.warning, b.warning].filter(Boolean).join(' ') || undefined,
})

/** A delete strips every Link property value naming a page it took from the pages and Spaces the tree holds outside it, unless a page outside it still answers that title; bodies keep their links and read unresolved. Nothing at or under `abs` is swept, since it left with the delete. */
export async function deleteCascade(
  root: string,
  abs: string,
  titles: string[],
): Promise<DeleteCascade> {
  const deleted = relative(root, abs)
  const inside = (rel: string): boolean => isAtOrUnder(rel, deleted)
  const gone = new Set(
    titles.filter((t) => !titleHeldOutside(root, t, deleted)).map(normalizeTitle),
  )
  try {
    const defs = byFoldedName(await linkDefs(root))
    if (!defs.size) return { cascade: { pages: [], hosts: [] }, links: [] }
    const hits = [...gone].map(queryMentions)
    const rels = hits.includes(null)
      ? await nexusCorpus(root)
      : [...new Set(hits.flatMap((h) => h ?? []))]
    const goneEntry = (value: unknown): string | null => {
      const entry = linkEntry(value, 2)
      const link = entry === null ? null : readLink(entry)
      return link?.kind === 'page' && gone.has(normalizeTitle(link.title)) ? entry : null
    }
    const named = (raw: Record<string, unknown>) =>
      Object.entries(raw).flatMap(([key, held]) => {
        const def = defs.get(foldKey(key))
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
    const withheld = withheldIn(heldTreeOf(root)?.unreadable)
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
      ...spaceArm(heldTreeOf(root), strip),
    })
    const links: StrippedLink[] = []
    for (const [file, { before }] of swept.touched) {
      const raw = governedRoot(file, before)
      const id = isMarkdownFile(file) ? stampedId(before) : asString(raw.id)
      if (!id) continue
      for (const { key, def, value } of named(raw))
        if (key === heldKey(raw, def.name)) links.push({ page: id, property: def.id, value })
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

/** A page rename sweeps the files the index names, or the whole corpus before there is one; a heading rename sweeps what a ready index names and the caller's own page, whose body is already rewritten and whose frontmatter takes the patch, since a corpus scan per heading edit is an on-every-edit cost. Markdown tiles sit outside the index: a title rename reads every one, and a heading rename reads them when one links the heading. `skipRel` is a page whose editor has already rewritten its own links. */
export async function renameCascade(
  root: string,
  title: string,
  change: RenameChange,
  skipRel: string | null = null,
): Promise<CascadeReport> {
  const named = 'title' in change ? title : `${title}#${change.heading}`
  try {
    const titleKey = normalizeTitle(title)
    const rels =
      'title' in change
        ? (queryMentions(titleKey) ?? (await nexusCorpus(root)))
        : (queryHeadingMentions(titleKey, normalizeTitle(change.heading)) ?? [])
    const runs =
      'heading' in change &&
      (await readLiveSetting(root, 'inPageHeadingResolution')) === 'automatic'
    const rewrite = (text: string, own = '', outlineOf = text): string =>
      'title' in change
        ? rewriteConnections(text, title, change.title)
        : rewriteHeadingConnections(
            text,
            title,
            change.heading,
            change.to,
            own,
            runs && normalizeTitle(own) === titleKey
              ? headingOutline(outlineOf).map((h) => h.text)
              : undefined,
          )
    const defs = Object.values((await readKeptRegistry(root)).defs)
    const names = byFoldedName(defs)
    const byName = (key: string) => names.get(foldKey(key))?.type
    // Every other type is left as written.
    const patchOf = (
      raw: Record<string, unknown>,
      typeOf: (key: string) => string | undefined,
      own = '',
      outlineOf = '',
    ): Record<string, string> => {
      const entries = Object.entries(raw)
      const patch = rewriteFrontmatterConnections(
        Object.fromEntries(entries.filter(([key]) => typeOf(key) === 'link')),
        title,
        change,
        own,
      )
      for (const [key, value] of entries) {
        if (typeOf(key) !== 'text') continue
        // A string, or a `[[Page]]` yaml read as a nested list; a foreign one-item list stays a list.
        const text = linkEntry(value, 2)
        const next = text === null ? null : rewrite(text, own, outlineOf)
        if (next !== null && next !== text) patch[key] = next
      }
      return patch
    }
    const withPatch = (
      raw: Record<string, unknown>,
      patch: Record<string, string>,
    ): Record<string, unknown> | null => (Object.keys(patch).length ? { ...raw, ...patch } : null)
    const spaceMoved: Rewrite = (raw) => withPatch(raw, patchOf(raw, byName))
    const text = (content: string, file: string): string | null => {
      const { body } = splitEnvelope(content)
      const own = titleFromPath(file)
      const patch = patchOf(splitFrontmatter(content), byName, own, body)
      const keys = Object.keys(patch)
      // The caller's editor already rewrote its own body; its frontmatter still takes the patch.
      const next = relative(root, file) === skipRel ? body : rewrite(body, own)
      return next === body && keys.length === 0
        ? null
        : mergeFrontmatter(content, patch, keys, next)
    }
    const tree = heldTreeOf(root)
    const files = [...new Set([...rels, ...(skipRel ? [skipRel] : [])])].map((rel) =>
      join(root, rel),
    )
    const swept = await sweepGovernedRoots(root, files, {
      text,
      ...spaceArm(tree, spaceMoved),
    })
    const tiles =
      'title' in change || (await tilesLinkHeading(root, titleKey, normalizeTitle(change.heading)))
        ? await rewriteTileConnections(root, rewrite)
        : { hosts: [], failed: 0 }
    // A heading edit settles often and a cached Link still reaches its page, so only a title reaches the caches. A block is keyed by page id, so its type is its own definition's.
    const cachedTypes = new Map(
      defs.filter((d) => d.type === 'link' || d.type === 'text').map((d) => [d.id, d.type]),
    )
    const movedCache = (
      values: Record<string, unknown>,
      id: string,
    ): Record<string, unknown> | null =>
      withPatch(
        values,
        patchOf(values, () => cachedTypes.get(id)),
      )
    const uncached =
      'title' in change && tree
        ? await editCaches(root, tree.collections, new Set(cachedTypes.keys()), movedCache)
        : 0
    const unmoved = swept.skipped.length + tiles.failed + uncached
    return {
      pages: [...swept.touched.keys()].filter(isMarkdownFile).map((file) => relative(root, file)),
      hosts: tiles.hosts,
      warning: unmoved ? unsweptLine(unmoved, `links to “${named}” in `) : undefined,
    }
  } catch (e) {
    return { pages: [], hosts: [], warning: `Links to “${named}” weren't updated: ${errText(e)}` }
  }
}
