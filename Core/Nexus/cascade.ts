import { isMarkdownFile, join, relative, titleFromPath } from '../Paths/posix'
import { errText } from '../Contract/result'
import { splitEnvelope, mergeFrontmatter, splitFrontmatter, stampedId } from '../Files/pageFile'
import {
  type Rewrite,
  stripKeys,
  sweepGovernedRoots,
  unsweptLine,
} from '../Properties/governedSweep'
import { editCaches } from '../Properties/propertyCache'
import { parseJsonObject } from '../Files/atomicWrite'
import { heldTreeOf } from './liveTree'
import { type NexusTree, withheldIn } from './tree'
import {
  type RenameChange,
  rewriteConnections,
  rewriteFrontmatterConnections,
  rewriteHeadingConnections,
} from '../Connections/rewrite'
import { normalizeTitle } from '../Connections/connections'
import { headingOutline } from '../MarkdownPM/Engine/headingScan'
import { queryHeadingMentions, queryMentions } from '../Index/contentIndex'
import { nexusCorpus } from '../Index/indexSeed'
import { linkDefs, readKeptRegistry } from '../Properties/propertiesRegistry'
import { readLiveSetting } from '../Settings/settings'
import { rewriteTileConnections } from '../Tiles/tilesFile'
import type { TileHostRef } from '../Tiles/tiles'
import { readLink } from '../Connections/linkValue'
import { liveIdIndex, livePathOf, titleHeldOutside } from './heldPages'
import { ID_KEY } from './identityMark'
import { asString } from './coerce'

export interface CascadeReport {
  pages: string[]
  hosts: TileHostRef[]
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

/** Whether a Space the tree holds links `title#heading`, which no index names. */
export function spacesLinkHeading(root: string, title: string, heading: string): boolean {
  const [page, section] = [normalizeTitle(title), normalizeTitle(heading)]
  return (heldTreeOf(root)?.contexts ?? []).some((g) =>
    g.spaces.some((s) =>
      Object.values(s.values ?? {}).some((value) => {
        const link = typeof value === 'string' ? readLink(value) : null
        return (
          link?.kind === 'page' &&
          normalizeTitle(link.title) === page &&
          normalizeTitle(link.heading ?? '') === section
        )
      }),
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
  const inside = (rel: string): boolean => rel === deleted || rel.startsWith(`${deleted}/`)
  const gone = new Set(
    titles.filter((t) => !titleHeldOutside(root, t, deleted)).map(normalizeTitle),
  )
  try {
    const defs = new Map((await linkDefs(root)).map((d) => [d.name, d.id]))
    if (!defs.size) return { cascade: { pages: [], hosts: [] }, links: [] }
    const hits = [...gone].map(queryMentions)
    const rels = hits.includes(null)
      ? await nexusCorpus(root)
      : [...new Set(hits.flatMap((h) => h ?? []))]
    const namesGone = (value: unknown): value is string => {
      if (typeof value !== 'string') return false
      const link = readLink(value)
      return link.kind === 'page' && gone.has(normalizeTitle(link.title))
    }
    const named = (
      raw: Record<string, unknown>,
    ): { key: string; property: string; value: string }[] =>
      Object.entries(raw).flatMap(([key, value]) => {
        const property = defs.get(key)
        return property !== undefined && namesGone(value) ? [{ key, property, value }] : []
      })
    const strip: Rewrite = (raw, file) => stripKeys(...named(raw).map(({ key }) => key))(raw, file)
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
    for (const [file, before] of swept.touched) {
      const isPage = isMarkdownFile(file)
      const raw = isPage ? splitFrontmatter(before) : (parseJsonObject(before) ?? {})
      const id = isPage ? stampedId(before) : asString(raw.id)
      if (!id) continue
      for (const { property, value } of named(raw)) links.push({ page: id, property, value })
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

/** A page rename sweeps the files the index names, or the whole corpus before there is one; a heading rename sweeps only what a ready index names, since a corpus scan per heading edit is an on-every-edit cost. Markdown tiles sit outside the index, so every one is read either way. `skipRel` is a page whose editor has already rewritten its own links. */
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
    const rewrite = (body: string, own = ''): string =>
      'title' in change
        ? rewriteConnections(body, title, change.title)
        : rewriteHeadingConnections(
            body,
            title,
            change.heading,
            change.to,
            own,
            runs && normalizeTitle(own) === titleKey
              ? headingOutline(body).map((h) => h.text)
              : undefined,
          )
    const defs = Object.values((await readKeptRegistry(root)).defs)
    const names = new Set(defs.map((d) => d.name))
    const registered = (raw: Record<string, unknown>): Record<string, unknown> =>
      Object.fromEntries(Object.entries(raw).filter(([k]) => names.has(k)))
    const moved = (values: Record<string, unknown>): Record<string, unknown> | null => {
      const patch = rewriteFrontmatterConnections(values, title, change)
      return Object.keys(patch).length ? { ...values, ...patch } : null
    }
    const spaceMoved: Rewrite = (raw) => {
      const next = moved(registered(raw))
      return next && { ...raw, ...next }
    }
    const text = (content: string, file: string): string | null => {
      const patch = rewriteFrontmatterConnections(
        registered(splitFrontmatter(content)),
        title,
        change,
      )
      const keys = Object.keys(patch)
      const { body } = splitEnvelope(content)
      const next = rewrite(body, titleFromPath(file))
      return next === body && keys.length === 0
        ? null
        : mergeFrontmatter(content, patch, keys, next)
    }
    const tree = heldTreeOf(root)
    const files = rels.filter((rel) => rel !== skipRel).map((rel) => join(root, rel))
    const swept = await sweepGovernedRoots(root, files, {
      text,
      ...spaceArm(tree, spaceMoved),
    })
    const tiles = await rewriteTileConnections(root, rewrite)
    // A heading edit settles often and a cached Link still reaches its page, so only a title reaches the caches.
    const linkIds = new Set(defs.filter((d) => d.type === 'link').map((d) => d.id))
    const uncached =
      'title' in change && tree ? await editCaches(root, tree.collections, linkIds, moved) : 0
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
