import type { PageIndex } from '@pommora/core/Connections/pageIndex'
import { headingOutline, type OutlineHeading } from '../Engine/headingScan'
import { fetchPageDetail } from '../../Session/pageDetailCache'
import { useSession } from '../../Session/store'

export interface HeadingTarget {
  pageId?: string
  outline: OutlineHeading[] | Promise<OutlineHeading[]>
}

// The target page's outline, built once per pane opening: from the open tab's live body when it has one, else from disk, so a heading typed moments ago is offered.
export function headingTargetOf(conn: PageIndex | undefined, title: string): HeadingTarget {
  const res = conn?.resolve(title)
  if (res?.status !== 'resolved' || !res.page) return { outline: [] }
  const page = res.page
  const slot = useSession.getState().pages[page.id]
  const outline =
    slot?.status === 'ready'
      ? headingOutline(slot.body)
      : fetchPageDetail(page.path).then((d) => (d ? headingOutline(d.body) : []))
  return { pageId: page.id, outline }
}
