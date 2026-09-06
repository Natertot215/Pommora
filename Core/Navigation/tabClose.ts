import { useMemo, useState } from 'react'
import { duration, ms } from '@pommora/uix/Animations/motion'

const EXIT_MS = ms(duration.base) + ms(duration.fast)

interface TabClose<E> {
  liveEntries: E[]
  renderEntries: { entry: E; ghost: boolean }[]
  firstLive: number
  ghostCount: number
  requestClose: (id: string) => void
}

/** Store-first: the tab leaves the store immediately so a re-click spawns fresh instead of resurrecting a zombie, while a GHOST stays rendered for the width-collapse exit. */
export function useTabClose<E extends { tab: { id: string } }>(
  entries: E[],
  close: (id: string) => void,
): TabClose<E> {
  const [ghosts, setGhosts] = useState<ReadonlyMap<string, { entry: E; index: number }>>(new Map())
  const requestClose = (id: string): void => {
    const index = entries.findIndex((e) => e.tab.id === id)
    const entry = entries[index]
    if (!entry) return
    setGhosts((m) => new Map(m).set(id, { entry, index }))
    close(id)
    setTimeout(() => {
      setGhosts((m) => {
        const next = new Map(m)
        next.delete(id)
        return next
      })
    }, EXIT_MS)
  }
  const liveEntries = useMemo(() => entries.filter((e) => !ghosts.has(e.tab.id)), [entries, ghosts])
  const renderEntries = useMemo<{ entry: E; ghost: boolean }[]>(() => {
    const live = liveEntries.map((entry) => ({ entry, ghost: false }))
    for (const [, g] of [...ghosts.entries()].sort((a, b) => a[1].index - b[1].index)) {
      live.splice(Math.min(g.index, live.length), 0, { entry: g.entry, ghost: true })
    }
    return live
  }, [liveEntries, ghosts])
  return {
    liveEntries,
    renderEntries,
    firstLive: renderEntries.findIndex((e) => !e.ghost),
    ghostCount: ghosts.size,
    requestClose,
  }
}
