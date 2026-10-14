import { join, relative } from '../Paths/posix'
import type { PageValues } from './viewRow'
import { pageValuesOf } from './pageValues'
import { readPageRecord } from '../Nexus/readNexus'
import { folderCorpus } from '../Index/indexSeed'
import { livePathOf } from '../Nexus/heldPages'

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
    if (rec?.kind !== 'read') continue
    out[rec.node.id] = pageValuesOf(rec.node.id, rec.fm, rec.mtimeMs)
  }
  return out
}
