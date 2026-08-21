import { useEffect, useMemo, useRef, useState } from 'react'
import type { PageDetail } from '@shared/types'
import { useSession } from '../store'
import { REVEAL_NEAR_H, REVEAL_NEAR_W } from '@renderer/design-system/revealBar'
import { navKey } from '../Navigation/navRecents'
import { readWarm } from '../Tabs/warmCache'
import { duration, easing } from '@renderer/design-system/tokens'
import { Icon } from '@renderer/design-system/symbols'
import { findCollection, findSet } from './Scope'
import { ContainerView } from './ContainerView'
import { HomepageView } from './HomepageView'
import { SpaceView } from './SpaceView'
import { PageView } from './PageView'
import { NavView } from '../Tabs/NavView'
import { Subfield } from './Subfield/Subfield'
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

/** One held-open page surface. The shown one reads its page from the store, so only a parked host
 *  carries one of its own. */
type Host = { tabId: string; detail?: PageDetail }

/** The page surfaces to hold open: the shown one first, then the most recently visited page tabs
 *  behind it. Keyed by tab, so becoming shown (or being parked again) is a class change rather
 *  than a remount — which is the whole point, since a remount reloads every embedded site. One
 *  surface per page: a second tab on the same file would put two editors on one document. */
function useHosts(): Host[] {
  const selection = useSession((s) => s.selection)
  const tabs = useSession((s) => s.tabs)
  const tabMru = useSession((s) => s.tabMru)
  const activeTabId = useSession((s) => s.activeTabId)
  return useMemo(() => {
    const hosts: Host[] = []
    const paths = new Set<string>()
    if (selection.kind === 'page') {
      hosts.push({ tabId: activeTabId })
      // The page this surface will settle on is its TAB's, not the selection's: a cold switch holds
      // the outgoing page in the store while the tab has already moved, and reading the selection
      // there would count the page the parked tab owns as the shown one — dropping the very
      // surface being parked, guest and all.
      const target = tabs.find((t) => t.id === activeTabId)?.target
      paths.add(target?.kind === 'page' ? target.path : selection.path)
    }
    // The budget counts parked surfaces alone, so the knob means the same number whether or not
    // the shown surface is itself a page.
    let parked = 0
    for (const id of tabMru) {
      if (parked >= WARM_TABS || id === activeTabId) continue
      const target = tabs.find((t) => t.id === id)?.target
      if (target?.kind !== 'page') continue
      // Only a tab that has actually been shown has a page in hand to park — one opened in the
      // background has nothing warm to keep.
      const detail = readWarm(id, navKey(target))?.pageDetail
      if (!detail || paths.has(detail.path)) continue
      paths.add(detail.path)
      hosts.push({ tabId: id, detail })
      parked++
    }
    // Rendered in a fixed order, never most-recent-first: reordering keyed children moves their
    // DOM, and a moved webview is re-attached — which ends the very guest this exists to keep.
    return hosts.sort((a, b) => (a.tabId < b.tabId ? -1 : 1))
  }, [selection, tabs, tabMru, activeTabId])
}

const VIEW_SLIDE_PX = 14

// The preview's engulf target: the detail pane's live rect, read once at promote time —
// module-held so the floating window needs no prop threading across trees.
let paneEl: HTMLElement | null = null
export const getDetailPaneRect = (): DOMRect | null => paneEl?.getBoundingClientRect() ?? null

export function DetailPane(): React.JSX.Element {
  const selection = useSession((s) => s.selection)
  const selectionKind = selection.kind
  const tree = useSession((s) => s.tree)
  // Cold-switch pause: the outgoing view holds as its last frame, input-frozen, until the incoming
  // page's fetch lands (or the deadline drops to the loading view) — see store.select's page case.
  const frozen = useSession((s) => s.pageFrozen)
  const navSlide = useSession((s) => s.navSlide)
  const expanded = useSession((s) => s.subfieldExpanded)
  const setExpanded = useSession((s) => s.setSubfieldExpanded)
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
      { duration: Number.parseInt(duration.fast, 10), easing: easing.standard },
    )
  }, [selection, navSlide])
  // Cursor in a band control's general area — one region per end of the bar, so approaching the
  // chevron never lights the footnotes disclosure and the other way around. Tracked here rather than
  // with giant invisible buttons so the reveal zones never block clicks beneath them.
  const [near, setNear] = useState(false)
  const [nearLead, setNearLead] = useState(false)
  // Measured lazily and cached: a rect per mousemove forces a layout on every pointer move. The pane
  // only moves when the surrounding panes do, and the pointer leaving is a free moment to re-measure.
  const paneRect = useRef<DOMRect | null>(null)

  const showSubfield =
    selectionKind === 'collection' ||
    selectionKind === 'set' ||
    selectionKind === 'page' ||
    selectionKind === 'space' ||
    (selectionKind === 'none' && !!tree)

  const paneClass =
    'detail-pane' +
    (showSubfield && expanded ? ' subfield-open' : '') +
    (showSubfield && near ? ' subfield-near' : '') +
    (showSubfield && nearLead ? ' subfield-near-lead' : '')

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
    <div
      className={paneClass}
      ref={(el) => {
        paneEl = el
      }}
      onMouseMove={(e) => {
        if (!showSubfield) return
        paneRect.current ??= e.currentTarget.getBoundingClientRect()
        const r = paneRect.current
        const low = e.clientY > r.bottom - REVEAL_NEAR_H
        setNear(low && e.clientX > r.right - REVEAL_NEAR_W)
        setNearLead(low && e.clientX < r.left + REVEAL_NEAR_W)
      }}
      onMouseLeave={() => {
        paneRect.current = null
        setNear(false)
        setNearLead(false)
      }}
    >
      <div ref={viewRef} className={frozen ? 'detail-pane-view is-frozen' : 'detail-pane-view'}>
        {hosts.map((h) => {
          const parked = h.tabId !== activeTabId
          return (
            <div
              key={h.tabId}
              className={parked ? 'detail detail-page is-parked' : 'detail detail-page'}
              aria-hidden={parked || undefined}
            >
              <PageView tabId={h.tabId} parked={parked} detail={parked ? h.detail : undefined} />
            </div>
          )
        })}
        <DetailView />
      </div>
      {showSubfield && (
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
          <CitationsToggle />
          <div className="subfield-reveal">
            <Subfield />
          </div>
        </>
      )}
    </div>
  )
}
