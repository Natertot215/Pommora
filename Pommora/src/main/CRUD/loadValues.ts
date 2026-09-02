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
import { getLiveTree } from '../liveTree'
import { pageIdIndex } from '../valuesChanged'

const pad = (n: number): string => String(n).padStart(2, '0')

// Local-clock form, the same shape the date picker writes — a stamp is filtered by calendar-day
// truncation and rendered through the local clock, and only one convention keeps those on one day.
function iso(ms: number | null): string | null {
  if (ms === null) return null
  const d = new Date(ms)
  const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return `${day}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** The files a read covers: the container's corpus, or only the named pages, resolved through the
 *  live tree — a push names the pages it wrote, and a refresh is scoped to them. */
async function corpus(
  rootPath: string,
  containerRelPath: string,
  pageIds?: readonly string[],
): Promise<string[]> {
  if (!pageIds) return folderCorpus(rootPath, join(rootPath, containerRelPath))
  const tree = getLiveTree()
  const wanted = new Set(pageIds)
  const files: string[] = []
  for (const [rel, id] of pageIdIndex(tree?.nexus.rootPath === rootPath ? tree : null))
    if (wanted.has(id)) files.push(join(rootPath, rel))
  return files
}

export async function loadValues(
  rootPath: string,
  containerRelPath: string,
  pageIds?: readonly string[],
): Promise<Record<string, PageValues>> {
  const files = await corpus(rootPath, containerRelPath, pageIds)
  const records = await Promise.all(
    files.map((absFile) => {
      const relFile = relPosix(rootPath, absFile)
      return readPageRecord(absFile, relFile).catch(() => null)
    }),
  )
  const out: Record<string, PageValues> = {}
  for (const rec of records) {
    if (!rec) continue
    out[rec.node.id] = {
      frontmatter: pageFrontmatter.parse({ ...rec.fm, [PAGE_ID_KEY]: rec.node.id }),
      createdAt: iso(idTime(rec.node.id)),
      modifiedAt: iso(rec.mtimeMs),
    }
  }
  return out
}
