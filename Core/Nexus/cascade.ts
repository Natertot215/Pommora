import { join, relative, titleFromPath } from '../Paths/posix'
import { errText } from '../Contract/result'
import { splitEnvelope, mergeFrontmatter, splitFrontmatter, stampedId } from '../Files/pageFile'
import { stripKeys, sweepGovernedRoots, unsweptLine } from '../Properties/governedSweep'
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
import { liveIdIndex, livePathOf } from './valuesChanged'
import { ID_KEY } from './identityMark'
import { asString } from './coerce'
import { stampListed } from './adopt'

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

export const joinCascades = (a: CascadeReport, b: CascadeReport): CascadeReport => ({
  pages: [...a.pages, ...b.pages],
  hosts: [...a.hosts, ...b.hosts],
  warning: [a.warning, b.warning].filter(Boolean).join(' ') || undefined,
})

/** A delete strips every Link property value naming a page it took from the pages the tree holds outside it; bodies keep their links and read unresolved. Nothing at or under `abs` is swept, since it left with the delete. */
export async function deleteCascade(
  root: string,
  abs: string,
  titles: string[],
): Promise<DeleteCascade> {
  const gone = new Set(titles.map(normalizeTitle))
  try {
    const defs = new Map((await linkDefs(root)).map((d) => [d.name, d.id]))
    if (!defs.size) return { cascade: { pages: [], hosts: [] }, links: [] }
    const hits = [...gone].map(queryMentions)
    const rels = hits.includes(null)
      ? await nexusCorpus(root)
      : [...new Set(hits.flatMap((h) => h ?? []))]
    const named = (
      raw: Record<string, unknown>,
    ): { key: string; property: string; value: string }[] =>
      Object.entries(raw).flatMap(([key, value]) => {
        const property = defs.get(key)
        if (property === undefined || typeof value !== 'string') return []
        const link = readLink(value)
        return link.kind === 'page' && gone.has(normalizeTitle(link.title))
          ? [{ key, property, value }]
          : []
      })
    const deleted = relative(root, abs)
    // Tree pages only: a loose file outside every Collection shows in no view and no restore could reach it; dropping this filter strips them too.
    const held = liveIdIndex(root)
    const files = rels
      .filter((rel) => held.has(rel) && rel !== deleted && !rel.startsWith(`${deleted}/`))
      .map((rel) => join(root, rel))
    let twins = 0
    const swept = await sweepGovernedRoots(root, files, {
      raw: (raw, file) => {
        const keys = named(raw).map(({ key }) => key)
        const id = asString(raw[ID_KEY])
        if (keys.length && id !== undefined && livePathOf(root, id) === null) {
          twins++
          return null
        }
        return stripKeys(...keys)(raw, file)
      },
    })
    const unswept = swept.skipped.length + twins
    const links: StrippedLink[] = []
    for (const [file, before] of swept.touched) {
      const page = stampedId(before) ?? (await stampListed(root, file))
      if (!page) continue
      for (const { property, value } of named(splitFrontmatter(before)))
        links.push({ page, property, value })
    }
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
    const names = new Set(Object.values((await readKeptRegistry(root)).defs).map((d) => d.name))
    const text = (content: string, file: string): string | null => {
      const values = Object.fromEntries(
        Object.entries(splitFrontmatter(content)).filter(([k]) => names.has(k)),
      )
      const patch = rewriteFrontmatterConnections(values, title, change)
      const keys = Object.keys(patch)
      const { body } = splitEnvelope(content)
      const next = rewrite(body, titleFromPath(file))
      return next === body && keys.length === 0
        ? null
        : mergeFrontmatter(content, patch, keys, next)
    }
    const files = rels.filter((rel) => rel !== skipRel).map((rel) => join(root, rel))
    const swept = await sweepGovernedRoots(root, files, { text })
    const tiles = await rewriteTileConnections(root, rewrite)
    const unmoved = swept.skipped.length + tiles.failed
    return {
      pages: [...swept.touched.keys()].map((file) => relative(root, file)),
      hosts: tiles.hosts,
      warning: unmoved ? unsweptLine(unmoved, `links to “${named}” in `) : undefined,
    }
  } catch (e) {
    return { pages: [], hosts: [], warning: `Links to “${named}” weren't updated: ${errText(e)}` }
  }
}
