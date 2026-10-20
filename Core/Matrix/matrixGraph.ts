import { readPageRelations } from '../Index/contentIndex'
import { ID_KEY } from '../Nexus/identityMark'
import { isArchived } from '../Paths/nexusPaths'
import type { PageRelationRow } from '../Platform/stores'
import { pageValuesOf } from '../Views/pageValues'
import type { PageValues } from '../Views/viewRow'

export interface MatrixLink extends Pick<PageRelationRow, 'path' | 'target' | 'key'> {
  kind: Exclude<PageRelationRow['kind'], 'embed'>
  pageId: string
}

export interface MatrixGraphReply {
  links: MatrixLink[]
  values: Record<string, PageValues> | null
  ids?: string[]
}

// `null` when there is no index yet; the renderer keeps what it holds and the next push refetches. Without values, the store reads each page's ID alone. An ask for named paths also answers every page id at them, linked or not, so the renderer lets go of the rows a moved page held under its old path. An archived page answers nothing, so it draws no node and no edge.
export function readMatrixGraph(withValues: boolean, paths?: string[]): MatrixGraphReply | null {
  const rows = readPageRelations(paths, withValues ? undefined : ID_KEY)
  if (!rows) return null
  const idOf = new Map<string, string>()
  const values: MatrixGraphReply['values'] = withValues ? {} : null
  for (const [path, page] of Object.entries(rows.pages)) {
    const id = page.values[ID_KEY]
    if (typeof id !== 'string' || isArchived(path)) continue
    idOf.set(path, id)
    if (values) values[id] = pageValuesOf(id, page.values, page.mtimeMs)
  }
  // A link to a page and links to its headings are one row each in the index, and one link here; a value's link stays one per key, so each reaches the keys rule.
  const seen = new Set<string>()
  const links: MatrixLink[] = []
  for (const { path, kind, target, key } of rows.relations) {
    // An embed re-spells as a link does but draws no edge.
    if (kind === 'embed') continue
    const pageId = idOf.get(path)
    const id = `${path}\0${kind}\0${target}\0${key}`
    if (!pageId || seen.has(id)) continue
    seen.add(id)
    links.push({ path, kind, target, key, pageId })
  }
  return paths ? { links, values, ids: [...idOf.values()] } : { links, values }
}
