import { join, relative, titleFromPath } from '../Paths/posix'
import { errText } from '../Contract/result'
import { splitEnvelope, mergeFrontmatter, splitFrontmatter } from '../Files/pageFile'
import { sweepGovernedRoots, unsweptLine } from '../Properties/governedSweep'
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
import { readRegistry } from '../Properties/propertiesRegistry'
import { propertyNames } from '../Properties/properties'
import { readLivePersonalization } from '../Settings/settings'
import { settingOf } from '../Settings/personalization'
import { rewriteTileConnections } from '../Tiles/tilesFile'
import type { TileHostRef } from '../Tiles/tiles'

export interface CascadeReport {
  pages: string[]
  hosts: TileHostRef[]
  warning?: string
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
      settingOf(await readLivePersonalization(root), 'inPageHeadingResolution') === 'automatic'
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
    const names = propertyNames(Object.values((await readRegistry(root)).defs))
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
