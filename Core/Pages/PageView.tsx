import { useEffect, useRef } from 'react'
import type { EditorView } from '@codemirror/view'
import { useSession } from '../Session/store'
import { usePublishSelection } from '../Interface/Subfield/publish'
import { MarkdownEditor } from '../MarkdownPM/MarkdownEditor'
import { useConnections } from '../Session/pageConnections'
import { navKey } from '../Navigation/navRef'
import { readPageDetail, useBodyEpoch } from '../Session/pageDetailCache'
import { warmGeneration, captureWarm, readWarm } from '../Session/warmCache'
import { fenceWarm } from '../MarkdownPM/warmSeam'
import { registerPageEditor } from './pageEditor'
import { PageHeader } from './PageHeader'
import { useEditorHost } from './editorHost'
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
  // The capture at teardown reads the slot/tab id of that moment through here, and stays silent after a clear.
  const live = useLatest({ slot, tabId })
  // Re-armed per commit: a clear tearing this surface down runs its cleanup before the survivors' effects, so the stale generation is seen exactly by the captures a clear caused.
  const mountedGen = useRef(warmGeneration())
  useEffect(() => {
    mountedGen.current = warmGeneration()
  })
  const pendingTravel = useSession((s) => s.pendingTravel)
  const clearPendingTravel = useSession((s) => s.clearPendingTravel)
  const reloadPage = useSession((s) => s.reloadPage)
  const tree = useSession((s) => s.tree)
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

  const connections = useConnections(tree, 'preview')
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
  const warmKey = navKey(slot.target)
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
      connections={connections}
      onSelection={publishSelection}
      onHeadingRename={(heading, to) =>
        void useSession
          .getState()
          .mutate({ op: 'renameHeading', path: pageDetail.path, heading, to })
      }
      embedAncestors={[pageDetail.path]}
      register={(view) => {
        editorRef.current = view
        seat.register(view)
        if (!parked) registerPageEditor(view)
      }}
      // A warm entry whose captured path diverges from the mounting page's mounts cold — id-keyed warmth must never revive a stale-path doc.
      warm={{
        restore: () => {
          const entry = readWarm(tabId, warmKey)
          return entry?.pageDetail?.path === pageDetail.path
            ? fenceWarm(entry, slot.body)
            : undefined
        },
        capture: (state) => {
          if (warmGeneration() !== mountedGen.current) return
          const { slot: now, tabId: owner } = live.current
          if (now?.status !== 'ready') return captureWarm(owner, warmKey, state)
          const cached = readPageDetail(now.detail.path)
          captureWarm(
            owner,
            warmKey,
            cached ? { ...state, pageDetail: { ...cached, body: now.body } } : state,
          )
        },
      }}
      active={!parked}
      arrive={arrive}
      onArrived={clearPendingTravel}
    />
  )
}
