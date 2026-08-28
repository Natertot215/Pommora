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
      return null
  }
}

// KNOB — how many recently-visited page tabs keep their surface parked behind the shown one.
const WARM_TABS = 2

type Host = { tabId: string; pageId: string }

function useHosts(): Host[] {
  const selection = useSession((s) => s.selection)
  const tabs = useSession((s) => s.tabs)
  const tabMru = useSession((s) => s.tabMru)
  const activeTabId = useSession((s) => s.activeTabId)
  const readyIds = useSession(readyPageIds)
  return useMemo(() => {
    const ready = new Set(readyIds.split(','))
    const hosts: Host[] = []
    if (selection.kind === 'page') hosts.push({ tabId: activeTabId, pageId: selection.id })
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

let paneEl: HTMLElement | null = null
export const getContentViewRect = (): DOMRect | null => paneEl?.getBoundingClientRect() ?? null

export function ContentView(): React.JSX.Element {
  const selection = useSession((s) => s.selection)
  const selectionKind = selection.kind
  const tree = useSession((s) => s.tree)
  const frozen = useSession(frozenOf)
  const navSlide = useSession((s) => s.navSlide)
  const expanded = useSession((s) => s.subfieldExpanded)
  const activeTabId = useSession((s) => s.activeTabId)
  const hosts = useHosts()

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
        <Icon name={expanded ? 'chevron-down' : 'chevron-up'} size="headline" />
      </button>
      <CitationsToggle page={page} />
      <div className="subfield-reveal">
        <Subfield page={page} />
      </div>
    </>
  )
}
