import { useEffect, useRef, useState } from 'react'
import type { EditorView } from '@codemirror/view'
import { useSession } from '../Session/store'
import { MarkdownEditor } from '../MarkdownPM/MarkdownEditor'
import { usePreviewConnections } from '../Session/pageConnections'
import { IconChoice } from '../Assets/IconChoice'
import { entityIcon } from '../Assets/entityIconPolicy'
import { navKey } from '../Navigation/navRecents'
import { useBodyEpoch } from '../Session/pageDetailCache'
import { cacheGeneration, captureCache, fenceWarm, readCache } from '../Navigation/warmTabs'
import { registerPageEditor } from './pageEditor'
import { PageHeader } from './PageHeader'
import { useEditorHost } from './editorHost'
import { schedulePageSave } from '../Session/saveScheduler'
import { host } from '../Platform/dialer'

// Live stats settle just behind the keystroke so a long page isn't Markdown-scanned on every char.
const STATS_DEBOUNCE_MS = 120

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
  const submitRename = useSession((s) => s.submitRename)
  const mutate = useSession((s) => s.mutate)
  const tree = useSession((s) => s.tree)
  const setPageBody = useSession((s) => s.setPageBody)
  const liveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pendingLive = useRef<[string, string] | null>(null)
  const bodyEpoch = useBodyEpoch(slot?.status === 'ready' ? slot.detail.path : '')
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
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [iconHidden, setIconHidden] = useState(true)
  useEffect(() => {
    let alive = true
    void host()
      .ask('headingIcon:get')
      .then((all) => {
        if (alive) setIconHidden(all[pageId] ?? true)
      })
    return () => {
      alive = false
    }
  }, [pageId])
  const editorRef = useRef<EditorView | null>(null)
  useEffect(() => {
    if (parked) return
    registerPageEditor(editorRef.current)
    return () => registerPageEditor(null)
  }, [parked])

  const toggleHeadingIcon = (): void => {
    const next = !iconHidden
    setIconHidden(next)
    void host().ask('headingIcon:set', pageId, next)
  }

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
    <>
      <MarkdownEditor
        key={`${pageDetail.path}:${bodyEpoch}`}
        initialBody={slot.body}
        host={editorHost}
        header={
          <PageHeader
            page={{
              path: pageDetail.path,
              title: pageDetail.title,
              cover:
                typeof pageDetail.frontmatter.banner === 'string'
                  ? pageDetail.frontmatter.banner
                  : undefined,
              icon: entityIcon(
                'page',
                typeof pageDetail.frontmatter.icon === 'string'
                  ? pageDetail.frontmatter.icon
                  : undefined,
                defaultIcons,
              ),
              iconHidden,
            }}
            onToggleIcon={toggleHeadingIcon}
            onEditIcon={() => setIconPickerOpen(true)}
            onRename={(newName) => submitRename(pageDetail.path, 'page', newName)}
          />
        }
        onChange={(body) => {
          pushLiveBody(pageDetail.path, body)
          schedulePageSave(pageDetail.path, body)
        }}
        connections={connections}
        embedAncestors={[pageDetail.path]}
        folds={{
          load: async () => (await host().ask('folds:get'))[pageDetail.id] ?? [],
          save: (keys) => void host().ask('folds:set', pageDetail.id, keys),
        }}
        embedHeights={{
          load: async () => (await host().ask('embedHeights:get'))[pageDetail.id] ?? {},
          save: (heights) => void host().ask('embedHeights:set', pageDetail.id, heights),
        }}
        embedZooms={{
          load: async () => (await host().ask('embedZooms:get'))[pageDetail.id] ?? {},
          save: (zooms) => void host().ask('embedZooms:set', pageDetail.id, zooms),
        }}
        tableHeadingColumns={{
          load: async () => (await host().ask('tableHeadingCols:get'))[pageDetail.id] ?? [],
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
      />
      <IconChoice
        open={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        value={
          typeof pageDetail.frontmatter.icon === 'string' ? pageDetail.frontmatter.icon : undefined
        }
        onSelect={(id) =>
          void mutate({ op: 'setIcon', path: pageDetail.path, kind: 'page', icon: id })
        }
      />
    </>
  )
}
