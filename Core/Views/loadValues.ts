import { join, relative } from '../Paths/posix'
import { ID_KEY } from '../Nexus/identityMark'
import { pageFrontmatter } from '../Nexus/schemas'
import type { PageValues } from './viewRow'
import { idTime } from '../Nexus/ids'
import { readPageRecord } from '../Nexus/readNexus'
import { folderCorpus } from '../Index/indexSeed'
import { livePathOf } from '../Nexus/heldPages'
import { localDayKey, pad } from '@pommora/uix/Utilities/pad'

// Local-clock form, the same shape the date picker writes.
export function iso(ms: number | null): string | null {
  if (ms === null) return null
  const d = new Date(ms)
  return `${localDayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function pageValuesOf(
  id: string,
  fm: Record<string, unknown>,
  mtimeMs: number | null,
): PageValues {
  return {
    frontmatter: pageFrontmatter.parse({ ...fm, [ID_KEY]: id }),
    createdAt: iso(idTime(id)),
    modifiedAt: iso(mtimeMs),
  }
}

async function corpus(
  rootPath: string,
  containerRelPath: string,
  pageIds?: readonly string[],
): Promise<string[]> {
  if (!pageIds) return folderCorpus(rootPath, join(rootPath, containerRelPath))
  return pageIds.flatMap((id) => {
    const rel = livePathOf(rootPath, id)
    return rel ? [join(rootPath, rel)] : []
  })
}

export async function loadValues(
  rootPath: string,
  containerRelPath: string,
  pageIds?: readonly string[],
): Promise<Record<string, PageValues>> {
  const files = await corpus(rootPath, containerRelPath, pageIds)
  const records = await Promise.all(
    files.map((absFile) => {
      const relFile = relative(rootPath, absFile)
      return readPageRecord(absFile, relFile).catch(() => null)
    }),
  )
  const out: Record<string, PageValues> = {}
  for (const rec of records) {
    if (!rec || 'unread' in rec) continue
    out[rec.node.id] = pageValuesOf(rec.node.id, rec.fm, rec.mtimeMs)
  }
  return out
}
