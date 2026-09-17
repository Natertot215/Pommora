import type { PageIndex } from '@pommora/core/Connections/pageIndex'
import { headingOutline, type OutlineHeading } from '../Engine/headingScan'
import type { EditorHost } from '../api'

export interface HeadingTarget {
  pageId?: string
  outline?: OutlineHeading[]
  fetch?: () => Promise<OutlineHeading[]>
}

// The target page's outline, built once per pane opening: the warm body answers at once, so a heading typed moments ago is offered; a cold page answers through `fetch`.
export function headingTargetOf(
  host: EditorHost,
  conn: PageIndex | undefined,
  title: string,
): HeadingTarget {
  const res = conn?.resolve(title)
  if (res?.status !== 'resolved' || !res.page) return { outline: [] }
  const page = res.page
  const warm = host.warmBody(page)
  if (warm !== null) return { pageId: page.id, outline: headingOutline(warm) }
  return {
    pageId: page.id,
    fetch: () => host.fetchBody(page).then((body) => (body ? headingOutline(body) : [])),
  }
}
