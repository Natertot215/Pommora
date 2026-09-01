// Batch value read for a container's view pipeline, keyed by the SAME id the read engine assigns
// so it joins cleanly to the tree's PageNodes in flattenContainer. Read-only, lazy — called on
// container open, not woven into the tree walk.

import { join } from 'node:path'
import { relPosix } from '../paths'
import { PAGE_ID_KEY } from '@shared/identity'
import { pageFrontmatter } from '@shared/schemas'
import type { PageValues } from '@shared/types'
import { idTime } from '../ids'
import { readPageRecord } from '../readNexus'
import { folderCorpus } from '../indexSeed'

const iso = (ms: number | null): string | null => (ms === null ? null : new Date(ms).toISOString())

export async function loadValues(
  rootPath: string,
  containerRelPath: string,
): Promise<Record<string, PageValues>> {
  const absFolder = join(rootPath, containerRelPath)
  const files = await folderCorpus(rootPath, absFolder)
  const records = await Promise.all(
    files.map((absFile) => {
      const relFile = relPosix(rootPath, absFile)
      return readPageRecord(absFile, relFile).catch(() => null)
    }),
  )
  const out: Record<string, PageValues> = {}
  for (const rec of records) {
    if (!rec) continue
    const parsed = pageFrontmatter.safeParse({ ...rec.fm, [PAGE_ID_KEY]: rec.node.id })
    if (!parsed.success) continue
    out[rec.node.id] = {
      frontmatter: parsed.data,
      createdAt: iso(idTime(rec.node.id)),
      modifiedAt: iso(rec.mtimeMs),
    }
  }
  return out
}
