import { useEffect, useRef } from 'react'
import type { EditorView } from '@codemirror/view'
import { Transaction } from '@codemirror/state'
import { valueOr } from '@pommora/core/Contract/result'
import { useSession } from '../Session/store'
import { usePublishSelection } from '../Interface/Subfield/publish'
import { MarkdownEditor } from '../MarkdownPM/MarkdownEditor'
import { usePreviewConnections } from '../Session/pageConnections'
import { navKey } from '../Navigation/navRecents'
import {
  dropCacheDetail,
  fetchPageDetail,
  readBodyBase,
  setBodyBase,
  subscribeLanding,
  useBodyEpoch,
} from '../Session/pageDetailCache'
import { cacheGeneration, captureCache, fenceWarm, readCache } from '../Navigation/warmTabs'
import { registerPageEditor, renameHeading } from './pageEditor'
import { PageHeader } from './PageHeader'
import { useEditorHost } from './editorHost'
import { schedulePageSave } from '../Session/saveScheduler'
import { changesTo, merge3 } from './merge3'
import { syncLanding } from '../MarkdownPM/api'
import { host } from '../Platform/dialer'
import { coverOf } from './pageDetail'

// Live stats settle just behind the keystroke so a long page isn't Markdown-scanned on every char.
const STATS_DEBOUNCE_MS = 120

async function absorbLanding(path: string, view: EditorView | null): Promise<void> {
  if (!view) {
    await useSession.getState().replaceBody(path)
    return
  }
  const base = readBodyBase(path)?.text
  dropCacheDetail(path)
  const fresh = await fetchPageDetail(path)
  if (!fresh) return
  const local = view.state.doc.toString()
  const merged =
    base === undefined ? { text: fresh.body, conflicted: true } : merge3(base, local, fresh.body)
  if (merged.conflicted) void host().ask('sync:captureLocal', path, local)
  if (merged.text !== local) {
    view.dispatch({
      changes: changesTo(local, merged.text),
      annotations: [syncLanding.of(true), Transaction.addToHistory.of(false)],
    })
    useSession.getState().setPageBody(path, merged.text)
  }
  setBodyBase(path, { text: fresh.body, hash: fresh.bodyHash })
  if (merged.text !== fresh.body) schedulePageSave(path, merged.text)
}

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
  const live = useRef({ slot, tabId })
  live.current = { slot, tabId }
  // Re-armed per commit: a clear tearing this surface down runs its cleanup before the survivors' effects, so the stale generation is seen exactly by the captures a clear caused.
  const mountedGen = useRef(cacheGeneration())
  useEffect(() => {
    mountedGen.current = cacheGeneration()
  })
  const pendingTravel = useSession((s) => s.pendingTravel)
  const clearPendingTravel = useSession((s) => s.clearPendingTravel)
  const reloadPage = useSession((s) => s.reloadPage)
  const tree = useSession((s) => s.tree)
  const setPageBody = useSession((s) => s.setPageBody)
  const liveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pendingLive = useRef<[string, string] | null>(null)
  const path = slot?.status === 'ready' ? slot.detail.path : ''
  const arrive =
    pendingTravel?.route === 'tab' && pendingTravel.path === path
      ? pendingTravel.heading
      : undefined
  const bodyEpoch = useBodyEpoch(path)
  const publishSelection = usePublishSelection(path)
  useEffect(() => {
    if (!path || parked) return
    return subscribeLanding(path, () => {
      void absorbLanding(path, editorRef.current)
    })
  }, [path, parked])
  // A replaced body supersedes a live body still waiting to land; the old editor's last keystroke must not write over it.
  useEffect(() => {
    clearTimeout(liveTimer.current)
    pendingLive.current = null
  }, [bodyEpoch])
  useEffect(
    () => () => {
      clearTimeout(liveTimer.current)
      const pending = pendingLive.current
      if (pending) useSession.getState().setPageBody(...pending)
    },
    [],
  )
  const editorRef = useRef<EditorView | null>(null)
  useEffect(() => {
    if (parked) return
    registerPageEditor(editorRef.current)
    return () => registerPageEditor(null)
  }, [parked])

  const connections = usePreviewConnections(tree)
  const editorHost = useEditorHost({ pageId, connections })

  // The debounced body write lives in the shared path-keyed autosave (pageFlush) — every teardown path flushes there, so a pending write survives without per-host flush machinery.
  const pushLiveBody = (path: string, body: string): void => {
    clearTimeout(liveTimer.current)
    pendingLive.current = [path, body]
    liveTimer.current = setTimeout(() => {
      pendingLive.current = null
      setPageBody(path, body)
    }, STATS_DEBOUNCE_MS)
  }

  if (!slot) return <div className="detail-placeholder">Loading page…</div>
  if (slot.status === 'error')
    return (
      <div className="detail-placeholder detail-error">
        Couldn’t open page
        <span className="state-detail">{slot.error.message}</span>
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
        pushLiveBody(pageDetail.path, body)
        schedulePageSave(pageDetail.path, body)
      }}
      connections={connections}
      onSelection={publishSelection}
      onHeadingRename={(old, next) => void renameHeading(pageDetail.id, old, next)}
      embedAncestors={[pageDetail.path]}
      folds={{
        load: async () => valueOr(await host().ask('folds:get'), {})[pageDetail.id] ?? [],
        save: (keys) => void host().ask('folds:set', pageDetail.id, keys),
      }}
      embedHeights={{
        load: async () => valueOr(await host().ask('embedHeights:get'), {})[pageDetail.id] ?? {},
        save: (heights) => void host().ask('embedHeights:set', pageDetail.id, heights),
      }}
      embedZooms={{
        load: async () => valueOr(await host().ask('embedZooms:get'), {})[pageDetail.id] ?? {},
        save: (zooms) => void host().ask('embedZooms:set', pageDetail.id, zooms),
      }}
      tableHeadingColumns={{
        load: async () =>
          valueOr(await host().ask('tableHeadingCols:get'), {})[pageDetail.id] ?? [],
        save: (indices) => void host().ask('tableHeadingCols:set', pageDetail.id, indices),
      }}
      register={(view) => {
        editorRef.current = view
        if (!parked) registerPageEditor(view)
      }}
      // A warm entry whose captured path diverges from the mounting page's mounts cold — id-keyed warmth must never revive a stale-path doc.
      warm={{
        restore: () => {
          const entry = readCache(tabId, warmKey)
          return entry?.pageDetail?.path === pageDetail.path
            ? fenceWarm(entry, slot.body)
            : undefined
        },
        capture: (state) => {
          if (cacheGeneration() !== mountedGen.current) return
          const { slot: now, tabId: owner } = live.current
          captureCache(
            owner,
            warmKey,
            now?.status === 'ready'
              ? { ...state, pageDetail: { ...now.detail, body: now.body } }
              : state,
          )
        },
      }}
      active={!parked}
      arrive={arrive}
      onArrived={clearPendingTravel}
    />
  )
}
