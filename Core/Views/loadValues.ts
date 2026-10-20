import { join } from '../Paths/posix'
import type { PageValues } from './viewRow'
import { pageValuesOf } from './pageValues'
import { readPageRecord } from '../Nexus/readNexus'
import { liveTreeOf } from '../Nexus/liveTree'
import { containerAt, pagePathsIn } from '../Nexus/treePatch'
import { livePathOf } from '../Nexus/heldPages'

async function corpus(
  rootPath: string,
  containerRelPath: string,
  pageIds?: readonly string[],
): Promise<string[]> {
  if (!pageIds) return pagePathsIn(containerAt(await liveTreeOf(rootPath), containerRelPath))
  return pageIds.flatMap((id) => livePathOf(rootPath, id) ?? [])
}

export async function loadValues(
  rootPath: string,
  containerRelPath: string,
  pageIds?: readonly string[],
): Promise<Record<string, PageValues>> {
  const files = await corpus(rootPath, containerRelPath, pageIds)
  const records = await Promise.all(
    files.map((rel) => readPageRecord(join(rootPath, rel), rel).catch(() => null)),
  )
  const out: Record<string, PageValues> = {}
  for (const rec of records) {
    if (rec?.kind !== 'read') continue
    out[rec.node.id] = pageValuesOf(rec.node.id, rec.fm, rec.mtimeMs)
  }
  return out
}
