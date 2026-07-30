import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@renderer/design-system/symbols'
import { cx } from '@renderer/design-system/cx'
import { duration, easing, text } from '@renderer/design-system/tokens'
import {
  PREVIEW_PANE_INSPECTOR,
  PreviewPane,
} from '@renderer/design-system/components/PreviewPane/PreviewPane'
import type { NavRef } from '@shared/types'
import { useExitPresence } from '../design-system/useExitPresence'
import { PageEmbed } from '../Embeds/PageEmbed'
import type { ConnectionsApi } from '../MarkdownPM/connections'
import { showConnectionMenu } from '../Embeds/connectionMenu'
import { useConnectionHover } from '../Embeds/ConnectionHoverCard'
import { moveByKey } from '../Navigation/navRecents'
import { pageIndexOf, resolveIndexOf } from '../treeIndex'
import { useSession } from '../store'
import { splitSearch, useNavData } from '../Navigation/useNavData'
import { NavList } from '../Navigation/NavList'
import { PreviewActions } from '../PagePreview/PreviewActions'
import { PreviewInspector } from '../PagePreview/PreviewInspector'
import { consumeWindowMorph } from '../PagePreview/WindowMorph'
import { PreviewTabStrip } from '../PagePreview/PreviewTabStrip'
import { usePreviewWarm } from '../PagePreview/usePreviewWarm'
import { NavGallery } from './NavGallery'
import './navWindow.css'

const RAIL = { min: 120, def: 200, max: 320 }

// Matched against the press target itself, so child content — row internals, card bodies, the
// search input — never arms a window move.
const DRAG_SURFACES =
  '.navwindow-content, .navwindow-rail, .navwindow-rail-list, .navwindow-main, .navwindow-main-scroll, .navwindow-search, .navwindow-page, .navwindow-tabs, .pgpreview-tabwrap, .pgpreview-tabscroll, .pgpreview-tabstrip, .nav-list, .nav-gallery, .nav-gallery-grid'

export function NavWindow(): React.JSX.Element | null {
  const navOpen = useSession((s) => s.navOpen)
  const { mounted, closing } = useExitPresence(navOpen)
  if (!mounted) return null
  return <NavWindowBody closing={closing} />
}

function NavWindowBody({ closing }: { closing: boolean }): React.JSX.Element {
  const { resolvedRecents, resolvedFavorites, resolvedPins, search, go } = useNavData()
  const closeNav = useSession((s) => s.closeNav)
  const tree = useSession((s) => s.tree)

  // Placement freezes at open — new recents activity must not reshuffle the list under the cursor.
  // Re-snapshots on reopen; still filtered against live pin/membership so a pin or removal drops out.
  const [frozenRecents, setFrozenRecents] = useState(resolvedRecents)
  const shownRecents = useMemo(() => {
    const pinned = new Set(resolvedPins.map((p) => p.key))
    const live = new Set(resolvedRecents.map((r) => r.key))
    return frozenRecents.filter((r) => live.has(r.key) && !pinned.has(r.key))
  }, [frozenRecents, resolvedPins, resolvedRecents])
  // A drag is the one thing that bypasses the freeze, and commits the SHOWN order wholesale — the
  // store's live order can lag the frozen view, so splicing against it would land elsewhere than the drop showed.
  const setRecentsOrder = useSession((s) => s.setRecentsOrder)
  const reorderShownRecent = (activeKey: string, overKey: string): void => {
    const next = moveByKey(frozenRecents, (r) => r.key, activeKey, overKey)
    if (!next) return
    setFrozenRecents(next)
    setRecentsOrder(next.map((r) => r.key))
  }

  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  // An open sourced from a live page preview FLIPs from its stashed rect; the css intro is
  // cancelled pre-paint so only one motion plays.
  const rootRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const from = consumeWindowMorph()
    const el = rootRef.current
    if (!from || !el) return
    for (const a of el.getAnimations()) a.cancel()
    const to = el.getBoundingClientRect()
    const dx = from.left + from.width / 2 - (to.left + to.width / 2)
    const dy = from.top + from.height / 2 - (to.top + to.height / 2)
    el.animate(
      [
        {
          transform: `translate(${dx}px, ${dy}px) scale(${from.width / to.width}, ${from.height / to.height})`,
        },
        { transform: 'translate(0px, 0px) scale(1)' },
      ],
      { duration: Number.parseInt(duration.base, 10), easing: easing.standard },
    )
  }, [])
  // The inspector is PAGE TABS ONLY (Nathan's call) — it dies on the map return.
  const [inspectorOpen, setInspectorOpen] = useState(false)

  const results = useMemo(() => (query.trim() ? splitSearch(search(query)) : null), [query, search])
  const closeOnSelect = useSession((s) => s.personalization.navCloseOnSelect !== false)
  const onSelected = closeOnSelect ? closeNav : undefined
  const goClose = (target: NavRef): void => go(target, onSelected)
  const goNewTab = (target: NavRef): void => go(target, onSelected, { newTab: true })
  const viewMode = useSession((s) => s.navWindowMode)
  const setNavWindowMode = useSession((s) => s.setNavWindowMode)
  const toggleViewMode = (): void => setNavWindowMode(viewMode === 'list' ? 'gallery' : 'list')

  const preview = useSession((s) => s.preview)
  const pageTarget = useSession((s) => (s.preview?.flavor === 'nav' ? s.previewTarget : null))
  // Also re-focuses on every map-tab return — the input remounts when a page tab swaps the body away.
  useEffect(() => {
    if (!pageTarget) {
      searchRef.current?.focus()
      setInspectorOpen(false)
    }
  }, [pageTarget])

  const openPreviewTab = useSession((s) => s.openPreviewTab)
  const select = useSession((s) => s.select)
  const openNewTab = useSession((s) => s.openNewTab)
  const setNavViewMode = useSession((s) => s.setNavViewMode)

  const promote = (): void => {
    if (pageTarget) {
      closeNav()
      void select({ kind: 'page', id: pageTarget.id, path: pageTarget.path })
      return
    }
    setNavViewMode(viewMode)
    closeNav()
    openNewTab()
  }
  const hasTabs = preview?.flavor === 'nav' && preview.tabs.length > 1
  const resolveIndex = tree ? resolveIndexOf(tree) : null

  const [editing, setEditing] = useState(false)
  useEffect(() => setEditing(false), [pageTarget?.path])
  const pageScrollRef = useRef<HTMLDivElement>(null)
  const warmSeam = usePreviewWarm(pageScrollRef, pageTarget?.path)
  const { hover, card: hoverCard } = useConnectionHover()
  const connections = useMemo<ConnectionsApi | undefined>(() => {
    if (!tree) return undefined
    const idx = pageIndexOf(tree)
    return {
      ...idx,
      open: (page) => openPreviewTab({ id: page.id, path: page.path }),
      bypass: (page) =>
        void select({ kind: 'page', id: page.id, path: page.path }, { newTab: true }),
      hover,
      menu: showConnectionMenu,
    }
  }, [tree, openPreviewTab, select, hover])

  return (
    <PreviewPane
      id="navwindow"
      rootRef={rootRef}
      closing={closing}
      onClose={closeNav}
      // The pane closes first — an Escape during the flavor-swap exit is the shell's own closing gate.
      onEscape={() => (inspectorOpen ? setInspectorOpen(false) : closeNav())}
      dragSurfaces={DRAG_SURFACES}
      toolbar="floating"
      className={cx('navwindow', pageTarget !== null && 'is-page-tab')}
      ariaLabel="Navigation"
      // Matches the preview window's tint — the flavor swap must keep one background, no opacity jump.
      tintOpacity={90}
      onScan={promote}
      actions={
        <PreviewActions
          inspectorOpen={inspectorOpen}
          onToggleInspector={() => setInspectorOpen((v) => !v)}
        />
      }
      left={{
        windowId: 'navwindow',
        bounds: RAIL,
        mode: 'inflow',
        open: pageTarget === null,
        className: 'navwindow-rail',
        children: (
          <>
            <div className="navwindow-rail-list edge-fade">
              <NavList items={resolvedFavorites} onSelect={goClose} onOpenNewTab={goNewTab} />
            </div>
            <button
              type="button"
              className={cx('navwindow-style-toggle', text.footnote.emphasized)}
              onClick={toggleViewMode}
            >
              <Icon name="chevrons-up-down" size={12} />
              <span>{viewMode === 'list' ? 'List' : 'Gallery'}</span>
            </button>
          </>
        ),
      }}
      right={{
        windowId: 'preview-inspector',
        bounds: PREVIEW_PANE_INSPECTOR,
        mode: 'overlay',
        open: inspectorOpen && pageTarget !== null,
        className: 'navwindow-inspector',
        children: (
          <div className="navwindow-inspector-body">
            {inspectorOpen && pageTarget && <PreviewInspector target={pageTarget} />}
          </div>
        ),
      }}
    >
      <div className="navwindow-content">
        <div className={cx('navwindow-tabs', hasTabs && 'has-tabs')}>
          <PreviewTabStrip index={resolveIndex} title={null} />
        </div>
        {pageTarget ? (
          <div className="navwindow-page edge-fade pgembed-grows" ref={pageScrollRef}>
            <PageEmbed
              key={pageTarget.path}
              path={pageTarget.path}
              editing={editing}
              onBeginEdit={() => setEditing(true)}
              connections={connections}
              warm={warmSeam}
            />
          </div>
        ) : (
          <div className="navwindow-main">
            <div className="navwindow-search">
              <input
                ref={searchRef}
                className={text.body.standard}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                spellCheck={false}
              />
            </div>
            <div className="navwindow-main-scroll edge-fade">
              {/* `extras` (inert agenda hits) has no card form, so it renders as a List row regardless
                  of the Style toggle. */}
              {viewMode === 'gallery' ? (
                <NavGallery
                  pins={results ? [] : resolvedPins}
                  items={results ? results.items : shownRecents}
                  frozenLayout={!!results}
                  {...(results ? {} : { onReorderRecent: reorderShownRecent })}
                  onSelect={goClose}
                  onOpenNewTab={goNewTab}
                />
              ) : (
                <NavList
                  {...(results
                    ? { items: results.items, extras: results.extras }
                    : {
                        pins: resolvedPins,
                        items: shownRecents,
                        reorderable: true,
                        onReorderRecent: reorderShownRecent,
                      })}
                  onSelect={goClose}
                  onOpenNewTab={goNewTab}
                />
              )}
            </div>
          </div>
        )}
      </div>
      {hoverCard}
    </PreviewPane>
  )
}
