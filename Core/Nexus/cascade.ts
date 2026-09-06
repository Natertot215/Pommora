import { join } from '../Locations/posix'
import { splitEnvelope, mergeFrontmatter } from '../IO/pageFile'
import { rewritePageSerialized } from '../IO/atomicWrite'
import { sweepAdmitsBody } from './util'
import { mentionsTitle } from '../Connections/scan'
import { rewriteConnections, rewriteFrontmatterConnections } from '../Connections/rewrite'
import { normalizeTitle } from '../Connections/connections'
import { ok, type Result } from '../Contract/result'
import { queryMentions } from '../Index/contentIndex'
import { frontmatterValues, indexWrittenPage, nexusCorpus } from '../Index/indexSeed'
import { noteValueWrite } from './valuesChanged'
import { readRegistry } from '../Properties/propertiesRegistry'
import { isRegisteredPropertyName, propertyNames } from '../Properties/properties'

export async function renameCascade(
  nexusRoot: string,
  oldTitle: string,
  newTitle: string,
): Promise<Result<{ touched: string[] }>> {
  const oldKey = normalizeTitle(oldTitle)
  const touched: string[] = []
  const rels = queryMentions(oldKey) ?? (await nexusCorpus(nexusRoot))
  const names = propertyNames(Object.values((await readRegistry(nexusRoot)).defs))
  for (const rel of rels) {
    const file = join(nexusRoot, rel)
    const wrote = await rewritePageSerialized(file, (content) => {
      if (!sweepAdmitsBody(content)) return null // connections live only on files the tree admits
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
    })
    if (wrote) {
      touched.push(file)
      noteValueWrite(nexusRoot, file)
      await indexWrittenPage(nexusRoot, file)
    }
  }
  return ok({ touched })
}
