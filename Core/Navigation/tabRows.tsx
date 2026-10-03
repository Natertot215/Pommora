import { type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { exitWait } from '@pommora/uix/Animations/motion'
import {
  carries,
  type DisplaceSpec,
  DropSlot,
  type Family,
  SortableZone,
} from '@pommora/uix/Interactions/drag'
import { cx } from '@pommora/uix/Utilities/cx'
import { isWindowTarget, type SelectTarget } from './navRef'

export const TAB_FAMILY: Family<SelectTarget> = { name: 'tabs' }

interface TabClose<E> {
  liveEntries: E[]
  renderEntries: { entry: E; ghost: boolean; seam: boolean | null }[]
  ghostCount: number
  requestClose: (id: string) => void
}

/** Store-first: the tab leaves the store immediately so a re-click spawns fresh instead of resurrecting a zombie, while a GHOST stays rendered for the width-collapse exit. */
export function useTabClose<E extends { tab: { id: string } }>(
  entries: E[],
  close: (id: string) => void,
): TabClose<E> {
  const [ghosts, setGhosts] = useState<ReadonlyMap<string, { entry: E; index: number }>>(new Map())
  const timers = useRef(new Set<number>())
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const requestClose = (id: string): void => {
    const index = entries.findIndex((e) => e.tab.id === id)
    const entry = entries[index]
    if (!entry) return
    setGhosts((m) => new Map(m).set(id, { entry, index }))
    close(id)
    const t = window.setTimeout(() => {
      timers.current.delete(t)
      setGhosts((m) => {
        const next = new Map(m)
        next.delete(id)
        return next
      })
    }, exitWait('base'))
    timers.current.add(t)
  }
  const liveEntries = useMemo(() => entries.filter((e) => !ghosts.has(e.tab.id)), [entries, ghosts])
  const renderEntries = useMemo(() => {
    const live = liveEntries.map((entry) => ({ entry, ghost: false }))
    for (const [, g] of [...ghosts.entries()].sort((a, b) => a[1].index - b[1].index)) {
      live.splice(Math.min(g.index, live.length), 0, { entry: g.entry, ghost: true })
    }
    const firstLive = live.findIndex((e) => !e.ghost)
    return live.map((e, i) => ({ ...e, seam: i === 0 ? null : e.ghost || i === firstLive }))
  }, [liveEntries, ghosts])
  return {
    liveEntries,
    renderEntries,
    ghostCount: ghosts.size,
    requestClose,
  }
}

export function TabStripZone({
  forced,
  targetOf,
  open,
  children,
  ...zone
}: Omit<DisplaceSpec<SelectTarget>, 'family' | 'axis' | 'carry' | 'receive'> & {
  forced: boolean
  targetOf: (id: string) => { kind: string } | undefined
  open: (target: SelectTarget, index: number) => void
  children: ReactNode
}): React.JSX.Element {
  const placing = useRef(false)
  useLayoutEffect(() => {
    placing.current = false
  })
  return (
    <SortableZone
      {...zone}
      className={cx('tab-strip', (placing.current || forced) && 'is-still')}
      family={TAB_FAMILY}
      axis="x"
      opens
      carry={[
        carries(TAB_FAMILY, (id) => {
          const target = targetOf(id)
          return target && isWindowTarget(target) ? target : null
        }),
      ]}
      onMove={(id, beforeId) => {
        placing.current = true
        zone.onMove?.(id, beforeId)
      }}
      receive={(item, beforeId) => {
        const at = beforeId === null ? -1 : zone.items.indexOf(beforeId)
        placing.current = true
        open(item, at < 0 ? zone.items.length : at)
      }}
    >
      <DropSlot foreignOnly />
      {children}
    </SortableZone>
  )
}

export function useActiveTabInView(
  activeTabId: string | undefined,
): React.RefObject<HTMLDivElement | null> {
  const stripRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!activeTabId) return
    stripRef.current
      ?.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(activeTabId)}"]`)
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [activeTabId])
  return stripRef
}
