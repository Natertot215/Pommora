import { useEffect, useMemo, useRef } from 'react'
import { frozenOf, readyPageIds, shownPage, useSession } from '../store'
import { useRevealNear } from '@renderer/DesignSystem/Interactions/revealBar'
import { duration, easing, ms } from '@renderer/DesignSystem/Animation'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { findCollection, findSet } from './Scope'
import { ContainerView } from './ContainerView'
import { HomepageView } from './HomepageView'
import { SpaceView } from './SpaceView'
import { PageView } from './PageView'
import { NavView } from './NavView'
import { Subfield } from './Subfield/Subfield'
import type { SubfieldPage } from './Subfield/subfieldItems'
import { footerLabel } from '@shared/toggleLabels'
import { CitationsToggle } from './Subfield/CitationsToggle'

function DetailView(): React.JSX.Element | null {
  const selection = useSession((s) => s.selection)
  const tree = useSession((s) => s.tree)

  switch (selection.kind) {
    case 'none':
      // The empty state IS NavView — a NavView tab routes here via `selection: none`. With no
      // nexus open there's nothing to browse, so the pane stays blank (App shows the open prompt).
      return tree ? (
        <NavView />
      ) : (
        <div className="detail detail-empty">
          <span>Select a collection or page</span>
        </div>
      )
    case 'homepage':
      return <HomepageView tree={tree} />
    case 'context':
      // A Context is a disclosure, not a destination — nothing renders for it.
      return <div className="detail" />
    case 'space':
      return <SpaceView tree={tree} id={selection.id} />
    case 'collection': {
      const col = findCollection(tree, selection.id)
      return col ? (
        <ContainerView source={col} />
      ) : (
        <div className="detail">
          <div className="detail-placeholder">Collection not found</div>
        </div>
      )
    }
    case 'set': {
      const set = findSet(tree, selection.id)
      return set ? (
        <ContainerView source={set} />
      ) : (
        <div className="detail">
          <div className="detail-placeholder">Set not found</div>
        </div>
      )
    }
    case 'page':
      // The page surfaces are hosted per tab below, so the routed view stands down for them —
      // rendering nothing rather than an empty box, which would stack its own full height
      // against the host's inside the pane.
      return null
  }
}

// KNOB — how many recently-visited page tabs keep their surface parked behind the shown one.
// Each costs a live editor's DOM; what it buys is a tab flip that resumes rather than reloads.
const WARM_TABS = 2

type Host = { tabId: string; pageId: string }

/** The page surfaces to hold open: the shown one first, then the most recently visited page tabs
 *  behind it. Keyed by page, so becoming shown, being parked, or the tab being pinned is a class
 *  change rather than a remount — which is the whole point, since a remount reloads every embedded
 *  site. One surface per page, however many tabs point at it. */
function useHosts(): Host[] {
  const selection = useSession((s) => s.selection)
  const tabs = useSession((s) => s.tabs)
  const tabMru = useSession((s) => s.tabMru)
  const activeTabId = useSession((s) => s.activeTabId)
  // WHICH pages are loaded, never the record itself — a slot re-identifies at every keystroke, so
  // holding `pages` here would commit the whole pane on every one.
  const readyIds = useSession(readyPageIds)
  return useMemo(() => {
    const ready = new Set(readyIds.split(','))
    const hosts: Host[] = []
    if (selection.kind === 'page') hosts.push({ tabId: activeTabId, pageId: selection.id })
    // The budget counts parked surfaces alone, so the knob means the same number whether or not
    // the shown surface is itself a page. Only a loaded page has something to park.
    let parked = 0
    for (const id of tabMru) {
      if (parked >= WARM_TABS || id === activeTabId) continue
      const target = tabs.find((t) => t.id === id)?.target
      if (target?.kind !== 'page' || !ready.has(target.id)) continue
      if (hosts.some((h) => h.pageId === target.id)) continue
      hosts.push({ tabId: id, pageId: target.id })
      parked++
    }
    // Rendered in a fixed order, never most-recent-first: reordering keyed children moves their
    // DOM, and a moved webview is re-attached — which ends the very guest this exists to keep.
    return hosts.sort((a, b) => (a.pageId < b.pageId ? -1 : 1))
  }, [selection, tabs, tabMru, activeTabId, readyIds])
}

const VIEW_SLIDE_PX = 14

// The preview's engulf target: this view's live rect, read once at promote time —
// module-held so the floating window needs no prop threading across trees.
let paneEl: HTMLElement | null = null
export const getContentViewRect = (): DOMRect | null => paneEl?.getBoundingClientRect() ?? null

export function ContentView(): React.JSX.Element {
  const selection = useSession((s) => s.selection)
  const selectionKind = selection.kind
  const tree = useSession((s) => s.tree)
  // Cold-switch pause: the outgoing view holds as its last frame, input-frozen, until the incoming
  // page's fetch lands (or the deadline drops to the loading view) — see store.select's page case.
  const frozen = useSession(frozenOf)
  const navSlide = useSession((s) => s.navSlide)
  const expanded = useSession((s) => s.subfieldExpanded)
  const activeTabId = useSession((s) => s.activeTabId)
  const hosts = useHosts()

  // Directional view slide: when a stamped navigation's swap commits, the incoming view slides in
  // via WAAPI on the wrapper (no remount) — `seq` guards against replay, and a plain sidebar select
  // (no stamp) swaps without motion.
  const viewRef = useRef<HTMLDivElement>(null)
  const prevSelection = useRef(selection)
  const playedSeq = useRef(0)
  useEffect(() => {
    const swapped = prevSelection.current !== selection
    prevSelection.current = selection
    if (!swapped || !navSlide || navSlide.seq === playedSeq.current) return
    playedSeq.current = navSlide.seq
    const x = navSlide.dir === 'back' ? -VIEW_SLIDE_PX : VIEW_SLIDE_PX
    viewRef.current?.animate(
      [
        { transform: `translateX(${x}px)`, opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 },
      ],
      { duration: ms(duration.fast), easing: easing.baseEase },
    )
  }, [selection, navSlide])
  // Cursor in a band control's general area — one region per end of the bar, so approaching the
  // chevron never lights the footnotes disclosure and the other way around. Tracked here rather than
  // with giant invisible buttons so the reveal zones never block clicks beneath them.
  const reveal = useRevealNear()

  const showSubfield =
    selectionKind === 'collection' ||
    selectionKind === 'set' ||
    selectionKind === 'page' ||
    selectionKind === 'space' ||
    (selectionKind === 'none' && !!tree)

  const paneClass =
    'content-view' +
    (showSubfield && expanded ? ' subfield-open' : '') +
    (showSubfield && reveal.near ? ' subfield-near' : '') +
    (showSubfield && reveal.nearLead ? ' subfield-near-lead' : '')

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
    <div
      className={paneClass}
      ref={(el) => {
        paneEl = el
      }}
      onMouseMove={(e) => {
        if (showSubfield) reveal.onMouseMove(e)
      }}
      onMouseLeave={reveal.onMouseLeave}
    >
      <div ref={viewRef} className={frozen ? 'content-view-view is-frozen' : 'content-view-view'}>
        {hosts.map((h) => {
          const parked = h.tabId !== activeTabId
          return (
            <div
              key={h.pageId}
              className={parked ? 'detail detail-page is-parked' : 'detail detail-page'}
              aria-hidden={parked || undefined}
            >
              <PageView tabId={h.tabId} pageId={h.pageId} parked={parked} />
            </div>
          )
        })}
        <DetailView />
      </div>
      {showSubfield && <ContentFooter />}
    </div>
  )
}

/** The pane's footer, and the one thing in the pane that follows the shown page's live body — so
 *  typing re-renders the footer and nothing above it. */
function ContentFooter(): React.JSX.Element {
  const expanded = useSession((s) => s.subfieldExpanded)
  const setExpanded = useSession((s) => s.setSubfieldExpanded)
  const slot = useSession(shownPage)
  const page = useMemo<SubfieldPage | null>(
    () => (slot?.status === 'ready' ? { target: slot.target, body: slot.body } : null),
    [slot],
  )
  return (
    <>
      <button
        type="button"
        className="subfield-toggle"
        onClick={() => setExpanded(!expanded)}
        aria-label={footerLabel(expanded)}
        title={footerLabel(expanded)}
      >
        <Icon name={expanded ? 'chevron-down' : 'chevron-up'} size="title3" />
      </button>
      <CitationsToggle page={page} />
      <div className="subfield-reveal">
        <Subfield page={page} />
      </div>
    </>
  )
}
