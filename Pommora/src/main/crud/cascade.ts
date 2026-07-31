// Cascades that keep references consistent when an entity's identity changes: a page rename
// rewrites every inbound `[[link]]` across the nexus. Walks the nexus's real pages and rewrites
// each under its file lock (rewritePageSerialized) — the same lock the cell-write path takes,
// so a cascade can't clobber a concurrent edit. Per-file, not cross-file atomic: a
// partly-applied cascade is recoverable by re-running.

import { splitEnvelope, mergeFrontmatter } from '../io/pageFile'
import { listMarkdownFiles } from '../io/walk'
import { sweepAdmits } from './util'
import { rewritePageSerialized } from '../io/fileLock'
import { scanConnections } from '../connections/scan'
import { rewriteConnections } from '../connections/rewrite'
import { normalizeTitle } from '@shared/connections'
import { ok, type Result } from '@shared/result'

const SKIP_TOP_LEVEL = ['.nexus', '.trash']

/** Rewrite every page body that links `oldTitle` to link `newTitle`, nexus-wide, atomically.
 *  Body-only rewrite — frontmatter (incl. `modified_at`) is preserved untouched
 *  (a derived link edit isn't a user modification). Only real pages (with
 *  an `id`) are touched. Returns the touched page paths. The caller renames the target's
 *  own file and reverts that rename if this throws. */
export async function renameCascade(
  nexusRoot: string,
  oldTitle: string,
  newTitle: string,
): Promise<Result<{ touched: string[] }>> {
  const oldKey = normalizeTitle(oldTitle)
  const touched: string[] = []
  for (const file of await listMarkdownFiles(nexusRoot, { skipTopLevel: SKIP_TOP_LEVEL })) {
    const wrote = await rewritePageSerialized(file, (content) => {
      const { body } = splitEnvelope(content)
      if (!scanConnections(body).some((c) => c.normalizedTitle === oldKey)) return null
      if (!sweepAdmits(content)) return null // connections live only on files the tree admits
      const newBody = rewriteConnections(body, oldTitle, newTitle)
      if (newBody === body) return null
      return mergeFrontmatter(content, {}, [], newBody)
    })
    if (wrote) touched.push(file)
  }
  return ok({ touched })
}
