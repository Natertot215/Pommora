import { join } from '../Locations/posix'
import { relPosix } from '../Locations/paths'
import { ID_KEY } from '../Nexus/identityMark'
import { pageFrontmatter } from '../Nexus/schemas'
import type { PageValues } from './viewRow'
import { idTime } from '../Locations/ids'
import { readPageRecord } from '../Nexus/readNexus'
import { folderCorpus } from '../Index/indexSeed'
import { liveIdIndex } from '../Nexus/valuesChanged'

const pad = (n: number): string => String(n).padStart(2, '0')

// Local-clock form, the same shape the date picker writes — a stamp is filtered by calendar-day truncation and rendered through the local clock, and only one convention keeps those on one day.
function iso(ms: number | null): string | null {
  if (ms === null) return null
  const d = new Date(ms)
  const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return `${day}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

async function corpus(
  rootPath: string,
  containerRelPath: string,
  pageIds?: readonly string[],
): Promise<string[]> {
  if (!pageIds) return folderCorpus(rootPath, join(rootPath, containerRelPath))
  const wanted = new Set(pageIds)
  const files: string[] = []
  for (const [rel, id] of liveIdIndex(rootPath)) if (wanted.has(id)) files.push(join(rootPath, rel))
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
      frontmatter: pageFrontmatter.parse({ ...rec.fm, [ID_KEY]: rec.node.id }),
      createdAt: iso(idTime(rec.node.id)),
      modifiedAt: iso(rec.mtimeMs),
    }
  }
  return out
}
