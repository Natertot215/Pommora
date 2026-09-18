import { join } from '../Paths/posix'
import { splitEnvelope, mergeFrontmatter } from '../Files/pageFile'
import { sweepGovernedRoots } from '../Properties/governedSweep'
import { mentionsTitle } from '../Connections/scan'
import {
  rewriteConnections,
  rewriteFrontmatterConnections,
  rewriteHeadingConnections,
} from '../Connections/rewrite'
import { normalizeTitle, titleFromPath } from '../Connections/connections'
import { headingOutline } from '../MarkdownPM/Engine/headingScan'
import { ok, type Result } from '../Contract/result'
import { queryHeadingMentions, queryMentions } from '../Index/contentIndex'
import { frontmatterValues, nexusCorpus } from '../Index/indexSeed'
import { readRegistry } from '../Properties/propertiesRegistry'
import { isRegisteredPropertyName, propertyNames } from '../Properties/properties'
import { readSettings } from '../Settings/codec'

export async function renameCascade(
  nexusRoot: string,
  oldTitle: string,
  newTitle: string,
): Promise<Result<{ touched: string[] }>> {
  const oldKey = normalizeTitle(oldTitle)
  const rels = queryMentions(oldKey) ?? (await nexusCorpus(nexusRoot))
  const names = propertyNames(Object.values((await readRegistry(nexusRoot)).defs))
  const files = rels.map((rel) => join(nexusRoot, rel))
  const text = (content: string): string | null => {
    const { body } = splitEnvelope(content)
    const values = Object.fromEntries(
      Object.entries(frontmatterValues(content)).filter(([k]) =>
        isRegisteredPropertyName(k, names),
      ),
    )
    const patch = rewriteFrontmatterConnections(values, oldKey, newTitle)
    const keys = Object.keys(patch)
    const newBody = mentionsTitle(body, oldKey)
      ? rewriteConnections(body, oldTitle, newTitle)
      : body
    if (newBody === body && keys.length === 0) return null
    return mergeFrontmatter(content, patch, keys, newBody)
  }
  const swept = await sweepGovernedRoots(nexusRoot, files, { text })
  return ok({ touched: swept.touched })
}

export async function renameHeadingCascade(
  nexusRoot: string,
  title: string,
  oldHeading: string,
  newHeading: string,
  skipRel: string | null,
): Promise<Result<{ touched: string[] }>> {
  const titleKey = normalizeTitle(title)
  const oldKey = normalizeTitle(oldHeading)
  // Only a linked heading cascades, and only through a ready index: a heading rename never sweeps the corpus.
  const rels = queryHeadingMentions(titleKey, oldKey)
  if (!rels?.length) return ok({ touched: [] })
  const files = rels.filter((rel) => rel !== skipRel).map((rel) => join(nexusRoot, rel))
  const runs =
    (await readSettings(nexusRoot)).personalization.inPageHeadingResolution === 'automatic'
  const text = (content: string, file: string): string | null => {
    const { body } = splitEnvelope(content)
    const next = rewriteHeadingConnections(
      body,
      title,
      oldHeading,
      newHeading,
      titleFromPath(file),
      runs ? headingOutline(body).map((h) => h.text) : undefined,
    )
    return next === body ? null : mergeFrontmatter(content, {}, [], next)
  }
  const swept = await sweepGovernedRoots(nexusRoot, files, { text })
  return ok({ touched: swept.touched })
}
