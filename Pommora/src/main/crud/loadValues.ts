// Batch frontmatter read for a container's view pipeline. Walks every `.md` under a container
// (recursive — own pages + nested Sets) and returns a `pageId → PageFrontmatter` map, keyed by the
// SAME id the read engine assigns (frontmatter.id, else adoptedId of the nexus-relative path) so it
// joins cleanly to the tree's PageNodes in flattenContainer. Read-only; lazy (called on container
// open, not woven into the tree walk). Reads through the walk's own per-page record — the cache
// stats before serving, so a changed file re-parses and an untouched one costs no read at all.

import { join, relative, sep } from 'node:path'
import { pageFrontmatter, type PageFrontmatter } from '@shared/schemas'
import { readPageRecord } from '../readNexus'
import { adoptedId } from '../ids'
import { asString } from '../coerce'
import { listMarkdownFiles } from '../io/walk'

export async function loadValues(
  rootPath: string,
  containerRelPath: string,
): Promise<Record<string, PageFrontmatter>> {
  const absFolder = join(rootPath, containerRelPath)
  const files = await listMarkdownFiles(absFolder)
  const records = await Promise.all(
    files.map(async (absFile) => {
      const relFile = relative(rootPath, absFile).split(sep).join('/')
      // Unreadable page → skip (its row falls back to a minimal frontmatter).
      const rec = await readPageRecord(absFile, relFile).catch(() => null)
      return rec ? { relFile, fm: rec.fm } : null
    }),
  )
  const out: Record<string, PageFrontmatter> = {}
  for (const r of records) {
    if (!r) continue
    const id = asString(r.fm.id) ?? adoptedId(r.relFile)
    const parsed = pageFrontmatter.safeParse({ ...r.fm, id })
    if (parsed.success) out[id] = parsed.data
  }
  return out
}
