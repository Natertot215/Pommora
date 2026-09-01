// Batch frontmatter read for a container's view pipeline. Returns a `pageId → PageFrontmatter`
// map, keyed by the SAME id the read engine assigns, so it joins cleanly to the tree's PageNodes
// in flattenContainer. Read-only, lazy — called on container open, not woven into the tree walk.

import { join } from 'node:path'
import { relPosix } from '../paths'
import { PAGE_ID_KEY } from '@shared/identity'
import { pageFrontmatter, type PageFrontmatter } from '@shared/schemas'
import { readPageRecord } from '../readNexus'
import { folderCorpus } from '../indexSeed'

export async function loadValues(
  rootPath: string,
  containerRelPath: string,
): Promise<Record<string, PageFrontmatter>> {
  const absFolder = join(rootPath, containerRelPath)
  const files = await folderCorpus(rootPath, absFolder)
  const records = await Promise.all(
    files.map((absFile) => {
      const relFile = relPosix(rootPath, absFile)
      return readPageRecord(absFile, relFile).catch(() => null)
    }),
  )
  const out: Record<string, PageFrontmatter> = {}
  for (const rec of records) {
    if (!rec) continue
    const parsed = pageFrontmatter.safeParse({ ...rec.fm, [PAGE_ID_KEY]: rec.node.id })
    if (parsed.success) out[rec.node.id] = parsed.data
  }
  return out
}
