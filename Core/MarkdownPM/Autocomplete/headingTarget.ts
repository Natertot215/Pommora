import type { PageIndex } from '../../Connections/pageIndex'
import { headingOutline, type OutlineHeading } from '../Engine/headingScan'
import type { EditorHost } from '../api'

export type HeadingTarget =
  | { kind: 'warm'; pageId?: string; outline: OutlineHeading[] }
  | { kind: 'cold'; pageId: string; fetch: () => Promise<OutlineHeading[]> }

// The target page's outline, built once per pane opening: the warm body answers at once, so a heading typed moments ago is offered; a cold page answers through `fetch`.
export function headingTargetOf(
  host: EditorHost,
  conn: PageIndex | undefined,
  title: string,
): HeadingTarget {
  const res = conn?.resolve(title)
  if (res?.status !== 'resolved' || !res.page) return { kind: 'warm', outline: [] }
  const page = res.page
  const warm = host.warmBody(page)
  if (warm !== null) return { kind: 'warm', pageId: page.id, outline: headingOutline(warm) }
  return {
    kind: 'cold',
    pageId: page.id,
    fetch: () => host.fetchBody(page).then((body) => (body ? headingOutline(body) : [])),
  }
}
