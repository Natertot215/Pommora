// Cascades that keep references consistent when an entity's identity changes: a page rename
// rewrites every inbound `[[link]]`. The candidate set comes from the content index when one
// exists — only files whose rows name the old title are opened, with `mentionsTitle` kept as
// the per-file confirmation so a stale row costs one wasted read, never a wrong rewrite — and
// falls back to the full corpus scan otherwise; either way the pen reaches exactly the corpus,
// so an excluded folder is unreachable and an un-adopted one is not. Each rewrite lands under
// its file lock (rewritePageSerialized) — the same lock the cell-write path takes, so a cascade
// can't clobber a concurrent edit. Per-file, not cross-file atomic: a partly-applied cascade is
// recoverable by re-running.

import { join } from 'node:path'
import { splitEnvelope, mergeFrontmatter } from '../IO/pageFile'
import { rewritePageSerialized } from '../IO/atomicWrite'
import { sweepAdmitsBody } from './util'
import { mentionsTitle } from '../Connections/scan'
import { rewriteConnections, rewriteFrontmatterConnections } from '../Connections/rewrite'
import { normalizeTitle } from '@shared/connections'
import { ok, type Result } from '@shared/result'
import { queryMentions } from '../Database/contentIndex'
import { frontmatterValues, indexWrittenPage, nexusCorpus } from '../indexSeed'
import { noteValueWrite } from '../valuesChanged'
import { readRegistry } from '../IO/propertiesRegistry'
import { isRegisteredPropertyName, propertyNames } from '@shared/properties'

/** Rewrite every reference to `oldTitle` — the body's own links, and any frontmatter Link property
 *  naming the page — to name `newTitle`, atomically. `modified_at` is preserved untouched either
 *  way (a derived link edit isn't a user modification). Only files the tree admits are touched.
 *  Returns the touched page paths. The caller renames the target's own file and reverts that
 *  rename if this throws. */
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
