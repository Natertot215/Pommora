import { join } from '../Paths/posix'
import { splitEnvelope, mergeFrontmatter } from '../Files/pageFile'
import { sweepGovernedRoots } from '../Properties/governedSweep'
import { mentionsTitle } from '../Connections/scan'
import { rewriteConnections, rewriteFrontmatterConnections } from '../Connections/rewrite'
import { normalizeTitle } from '../Connections/connections'
import { ok, type Result } from '../Contract/result'
import { queryMentions } from '../Index/contentIndex'
import { frontmatterValues, nexusCorpus } from '../Index/indexSeed'
import { readRegistry } from '../Properties/propertiesRegistry'
import { isRegisteredPropertyName, propertyNames } from '../Properties/properties'

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
  const swept = await sweepGovernedRoots(nexusRoot, { kind: 'files', files }, { text })
  return ok({ touched: swept.touched })
}
