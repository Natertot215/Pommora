import { useEffect, useMemo, useRef, useState } from 'react'
import type { EditorView } from '@codemirror/view'
import { useSession } from '../store'
import { MarkdownEditor } from '../MarkdownPM'
import type { ConnectionsApi } from '../MarkdownPM/connections'
import { nativeEditorMenu } from '../MarkdownPM/editor/menu'
import { pageIndexOf } from '../treeIndex'
import { showConnectionMenu } from '../Embeds/connectionMenu'
import { hoverConnection, hoverWebsite } from '../Embeds/ConnectionPane'
import { IconPicker } from '@renderer/Settings/IconPicker'
import { entityIcon } from '@renderer/DesignSystem/Symbols'
import { navKey } from '../Navigation/navRecents'
import { captureWarm, readWarm, warmGeneration } from '../Tabs/warmCache'
import { registerPageEditor } from './pageEditor'
import { schedulePageSave } from './pageFlush'

// Live stats settle just behind the keystroke so a long page isn't Markdown-scanned on every char.
const STATS_DEBOUNCE_MS = 120

export function PageView({
  tabId,
  pageId,
  parked = false,
}: {
  /** The tab this surface belongs to, so it warms and captures under the tab that owns it. */
  tabId: string
  pageId: string
  /** Held open behind the active surface: the same DOM, off screen. Its editor stays out of the
   *  page-editor registry, which answers for the surface the user is actually looking at. */
  parked?: boolean
}): React.JSX.Element {
  const slot = useSession((s) => s.pages[pageId])
  // The editor reads its warm seam once at mount, so the capture it runs at teardown reads the
  // slot and tab id of that moment through here — and stays silent after a clear, which is the
  // very thing that unmounts a surface after a rename's cascade.
  const live = useRef({ slot, tabId })
  live.current = { slot, tabId }
  const mountedGen = useRef(warmGeneration())
  const submitRename = useSession((s) => s.submitRename)
  const mutate = useSession((s) => s.mutate)
  const tree = useSession((s) => s.tree)
  const select = useSession((s) => s.select)
  const openPreview = useSession((s) => s.openPreview)
  // Reads the LIVE personalization slice (setPersonalization updates it before the tree echoes).
  const openInPreview = useSession((s) => s.personalization.connectionsOpenInPreview ?? false)
  const setPageBody = useSession((s) => s.setPageBody)
  const liveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  // Whether this page's header draws its glyph. The glyph itself is on-page in frontmatter; only
  // whether it shows is chrome, so it rides the keyed local store beside folds and heading columns.
  const [iconHidden, setIconHidden] = useState(true)
  useEffect(() => {
    let alive = true
    // Hidden unless this page says otherwise: a page's glyph is a thing you opt a page into showing,
    // where a Collection or a Space wears one by default.
    void window.nexus.headingIcon.get().then((all) => {
      if (alive) setIconHidden(all[pageId] ?? true)
    })
    return () => {
      alive = false
    }
  }, [pageId])
  // The registry holds one editor — the one the outline, its rename, and its section mover act on.
  // A surface publishes its own only while it is the shown one, and re-publishes when a parked
  // surface becomes it, since the handle was registered before that flip.
  const editorRef = useRef<EditorView | null>(null)
  useEffect(() => {
    if (parked) return
    registerPageEditor(editorRef.current)
    return () => registerPageEditor(null)
  }, [parked])

  const toggleHeadingIcon = (): void => {
    const next = !iconHidden
    setIconHidden(next)
    void window.nexus.headingIcon.set(pageId, next)
  }

  const connections = useMemo<ConnectionsApi | undefined>(() => {
    if (!tree) return undefined
    const idx = pageIndexOf(tree)
    return {
      ...idx,
      open: (page) =>
        openInPreview
          ? openPreview({ id: page.id, path: page.path })
          : void select({ kind: 'page', id: page.id, path: page.path }),
      bypass: (page) =>
        void select({ kind: 'page', id: page.id, path: page.path }, { newTab: true }),
      hover: hoverConnection,
      hoverSite: hoverWebsite,
      menu: showConnectionMenu,
    }
  }, [tree, select, openPreview, openInPreview])

  // The debounced body write lives in the shared path-keyed autosave (pageFlush) — teardown paths
  // (unmount inside the debounce, window close, nexus adopt) all flush THERE, so a pending write
  // survives this component without any per-host flush machinery.
  const pushLiveBody = (path: string, body: string): void => {
    if (liveTimer.current) clearTimeout(liveTimer.current)
    liveTimer.current = setTimeout(() => setPageBody(path, body), STATS_DEBOUNCE_MS)
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
        key={pageDetail.path}
        initialBody={pageDetail.body}
        title={pageDetail.title}
        path={pageDetail.path}
        cover={
          typeof pageDetail.frontmatter.cover === 'string'
            ? pageDetail.frontmatter.cover
            : undefined
        }
        icon={entityIcon(
          'page',
          typeof pageDetail.frontmatter.icon === 'string' ? pageDetail.frontmatter.icon : undefined,
          defaultIcons,
        )}
        iconHidden={iconHidden}
        onToggleIcon={toggleHeadingIcon}
        onEditIcon={() => setIconPickerOpen(true)}
        onRename={(newName) => submitRename(pageDetail.path, 'page', newName)}
        onChange={(body) => {
          pushLiveBody(pageDetail.path, body)
          schedulePageSave(pageDetail.path, body)
        }}
        connections={connections}
        embedAncestors={[pageDetail.path]}
        folds={{
          load: async () => (await window.nexus.folds.get())[pageDetail.id] ?? [],
          save: (keys) => void window.nexus.folds.set(pageDetail.id, keys),
        }}
        pageId={pageId}
        embedHeights={{
          load: async () => (await window.nexus.embedHeights.get())[pageDetail.id] ?? {},
          save: (heights) => void window.nexus.embedHeights.set(pageDetail.id, heights),
        }}
        embedZooms={{
          load: async () => (await window.nexus.embedZooms.get())[pageDetail.id] ?? {},
          save: (zooms) => void window.nexus.embedZooms.set(pageDetail.id, zooms),
        }}
        tableHeadingColumns={{
          load: async () => (await window.nexus.tableHeadingColumns.get())[pageDetail.id] ?? [],
          save: (indices) => void window.nexus.tableHeadingColumns.set(pageDetail.id, indices),
        }}
        menu={nativeEditorMenu}
        register={(view) => {
          editorRef.current = view
          if (!parked) registerPageEditor(view)
        }}
        // restore carries the rename fence: a warm entry whose captured path diverges from the
        // mounting page's mounts cold (id-keyed warmth must never revive a stale-path doc).
        warm={{
          restore: () => {
            const entry = readWarm(tabId, warmKey)
            return entry?.pageDetail?.path === pageDetail.path ? entry : undefined
          },
          capture: (state) => {
            if (warmGeneration() !== mountedGen.current) return
            const { slot: now, tabId: owner } = live.current
            captureWarm(
              owner,
              warmKey,
              now?.status === 'ready'
                ? { ...state, pageDetail: { ...now.detail, body: now.body } }
                : state,
            )
          },
        }}
      />
      <IconPicker
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
