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
import { splitEnvelope, mergeFrontmatter } from '../io/pageFile'
import { rewritePageSerialized } from '../io/atomicWrite'
import { corpusFiles } from '../io/walk'
import { sweepAdmitsBody } from './util'
import { mentionsTitle } from '../connections/scan'
import { rewriteConnections } from '../connections/rewrite'
import { normalizeTitle } from '@shared/connections'
import { ok, type Result } from '@shared/result'
import { queryMentions } from '../db/contentIndex'
import { indexWrittenPage, readExcludedFolders } from '../indexSeed'

/** Rewrite every page body that links `oldTitle` to link `newTitle`, atomically.
 *  Body-only rewrite — frontmatter (incl. `modified_at`) is preserved untouched
 *  (a derived link edit isn't a user modification). Only files the tree admits are touched. Returns the touched page paths. The caller renames the target's
 *  own file and reverts that rename if this throws. */
export async function renameCascade(
  nexusRoot: string,
  oldTitle: string,
  newTitle: string,
): Promise<Result<{ touched: string[] }>> {
  const oldKey = normalizeTitle(oldTitle)
  const touched: string[] = []
  const rels =
    queryMentions(oldKey) ?? (await corpusFiles(nexusRoot, await readExcludedFolders(nexusRoot)))
  for (const rel of rels) {
    const file = join(nexusRoot, rel)
    const wrote = await rewritePageSerialized(file, (content) => {
      const { body } = splitEnvelope(content)
      if (!mentionsTitle(body, oldKey)) return null
      if (!sweepAdmitsBody(content)) return null // connections live only on files the tree admits
      const newBody = rewriteConnections(body, oldTitle, newTitle)
      if (newBody === body) return null
      return mergeFrontmatter(content, {}, [], newBody)
    })
    if (wrote) {
      touched.push(file)
      await indexWrittenPage(nexusRoot, file)
    }
  }
  return ok({ touched })
}
