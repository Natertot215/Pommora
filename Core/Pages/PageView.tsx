import { useEffect, useRef } from 'react'
import type { EditorView } from '@codemirror/view'
import { tabOf, useSession } from '../Session/store'
import { usePublishSelection } from '../Interface/Subfield/publish'
import { MarkdownEditor } from '../MarkdownPM/MarkdownEditor'
import { useConnections } from '../Session/pageConnections'
import { navKey } from '../Navigation/navRef'
import { useBodyEpoch } from '../Session/pageDetailCache'
import { warmSeamOf } from '../Session/warmCache'
import { registerPageEditor } from './pageEditor'
import { PageHeader } from './PageHeader'
import { renameHeadingIn, useEditorHost } from './editorHost'
import { useBodyMount } from './bodyMount'
import { useSettledBody } from '../Interface/Subfield/subfieldPage'
import { coverOf } from './pageDetail'
import { useLatest } from '@pommora/uix/Utilities/stableApi'

export function PageView({
  tabId,
  pageId,
  parked = false,
}: {
  tabId: string
  pageId: string
  /** Its editor stays out of the page-editor registry, which answers for the surface the user is actually looking at. */
  parked?: boolean
}): React.JSX.Element {
  const slot = useSession((s) => s.pages[pageId])
  // Hosts are keyed by page, so a pin or a re-show hands a mounted editor to another tab; its capture belongs to the tab of that moment.
  const owner = useLatest(tabId)
  const pendingTravel = useSession((s) => s.pendingTravel)
  const clearPendingTravel = useSession((s) => s.clearPendingTravel)
  const reloadPage = useSession((s) => s.reloadPage)
  const setPageBody = useSession((s) => s.setPageBody)
  const settle = useSettledBody<[string, string]>((live) => setPageBody(...live), true)
  const path = slot?.status === 'ready' ? slot.detail.path : ''
  const arrive =
    pendingTravel?.route === 'tab' && pendingTravel.tabId === tabId && pendingTravel.path === path
      ? pendingTravel.heading
      : undefined
  const bodyEpoch = useBodyEpoch(path)
  const publishSelection = usePublishSelection(path)
  // A replaced body supersedes a live body still waiting to land; the old editor's last keystroke must not write over it.
  useEffect(() => settle.cancel(), [bodyEpoch])
  const editorRef = useRef<EditorView | null>(null)
  useEffect(() => {
    if (parked) return
    registerPageEditor(editorRef.current)
    return () => registerPageEditor(null)
  }, [parked])

  const connections = useConnections('preview')
  const editorHost = useEditorHost({ pageId, connections, pageSurface: true })

  const seat = useBodyMount(path, (body) => settle.push([path, body]))

  if (!slot)
    return (
      <div className="detail interface-inset">
        <div className="detail-placeholder">Loading page…</div>
      </div>
    )
  if (slot.status === 'error')
    return (
      <div className="detail interface-inset">
        <div className="detail-placeholder detail-error">
          Couldn’t open page
          <span className="state-detail">{slot.error.message}</span>
        </div>
      </div>
    )
  const pageDetail = slot.detail
  return (
    <MarkdownEditor
      key={`${pageDetail.path}:${bodyEpoch}`}
      initialBody={slot.body}
      host={editorHost}
      header={
        <PageHeader
          page={{
            id: pageId,
            path: pageDetail.path,
            title: pageDetail.title,
            cover: coverOf(pageDetail),
          }}
          onBannerDone={() => void reloadPage()}
        />
      }
      onChange={(body) => {
        settle.push([pageDetail.path, body])
        seat.save(body)
      }}
      onSelection={publishSelection}
      onHeadingRename={renameHeadingIn(pageDetail.path)}
      embedAncestors={[pageDetail.path]}
      register={(view) => {
        editorRef.current = view
        seat.register(view)
        if (!parked) registerPageEditor(view)
      }}
      warm={warmSeamOf(
        () => owner.current,
        navKey(slot.target),
        () => slot.body,
        () => tabOf(useSession.getState(), owner.current) !== undefined,
      )}
      active={!parked}
      arrive={arrive}
      onArrived={clearPendingTravel}
    />
  )
}
