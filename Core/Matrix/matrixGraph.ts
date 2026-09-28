import { readPageRelations } from '../Index/contentIndex'
import { ID_KEY } from '../Nexus/identityMark'
import type { PageRelationRow } from '../Platform/stores'
import { pageValuesOf } from '../Views/loadValues'
import type { PageValues } from '../Views/viewRow'

export interface MatrixLink extends PageRelationRow {
  pageId: string
}

export interface MatrixGraphReply {
  links: MatrixLink[]
  values: Record<string, PageValues>
}

// `null` when there is no index yet; the renderer keeps what it holds and the next push refetches.
export function readMatrixGraph(paths?: string[]): MatrixGraphReply | null {
  const rows = readPageRelations(paths)
  if (!rows) return null
  const idOf = new Map<string, string>()
  const values: Record<string, PageValues> = {}
  for (const [path, page] of Object.entries(rows.pages)) {
    const id = page.values[ID_KEY]
    if (typeof id !== 'string') continue
    idOf.set(path, id)
    values[id] = pageValuesOf(id, page.values, page.mtimeMs)
  }
  const links: MatrixLink[] = []
  for (const row of rows.relations) {
    const pageId = idOf.get(row.path)
    if (pageId) links.push({ ...row, pageId })
  }
  return { links, values }
}
