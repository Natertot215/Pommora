import { readMatrixGraph as readRows } from '../Index/contentIndex'
import { ID_KEY } from '../Nexus/identityMark'
import { idTime } from '../Nexus/ids'
import { pageFrontmatter } from '../Nexus/schemas'
import type { MatrixLinkRow } from '../Platform/stores'
import { iso } from '../Views/loadValues'
import type { PageValues } from '../Views/viewRow'

export interface MatrixLink extends MatrixLinkRow {
  pageId: string
}

export interface MatrixGraphReply {
  links: MatrixLink[]
  values: Record<string, PageValues>
}

export const EMPTY_GRAPH_REPLY: MatrixGraphReply = { links: [], values: {} }

/** `null` when there is no index yet; the renderer keeps what it holds and the next push refetches. */
export function readMatrixGraph(paths?: string[]): MatrixGraphReply | null {
  const rows = readRows(paths)
  if (!rows) return null
  const idOf = new Map<string, string>()
  const values: Record<string, PageValues> = {}
  for (const [path, page] of Object.entries(rows.pages)) {
    const id = page.values[ID_KEY]
    if (typeof id !== 'string') continue
    idOf.set(path, id)
    values[id] = {
      frontmatter: pageFrontmatter.parse({ ...page.values, [ID_KEY]: id }),
      createdAt: iso(idTime(id)),
      modifiedAt: iso(page.mtimeMs),
    }
  }
  const links: MatrixLink[] = []
  for (const row of rows.links) {
    const pageId = idOf.get(row.path)
    if (pageId) links.push({ ...row, pageId })
  }
  return { links, values }
}
