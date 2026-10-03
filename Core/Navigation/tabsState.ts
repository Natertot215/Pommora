import { z } from 'zod'
import { eachOf } from '../Files/decoders'
import { isNavRef, type NavRef, type StoredTab, type StoredTabSet, toNavRef } from './navRef'
import { readValue, writeValue } from '../Platform/localState'

// `NavRef` keeps its one validator; the schema decodes the file's shape around it.
const tabTarget = z.custom<NavRef>((v) => isNavRef(v)).transform(toNavRef)

// An empty tab carries no target to restore, so it skips the stack entirely.
const newTab = z
  .object({ id: z.string(), target: z.object({ kind: z.literal('newtab') }) })
  .transform(
    ({ id }): StoredTab => ({ id, target: { kind: 'newtab' }, navStack: [], navIndex: -1 }),
  )

const openTab = z.object({
  id: z.string(),
  target: tabTarget,
  navStack: z
    .array(z.unknown())
    .transform((ts) => ts.filter((t) => isNavRef(t)).map(toNavRef))
    .catch([]),
  navIndex: z.number().int().catch(-1).default(-1),
})

const storedTab = z.union([newTab, openTab])

// Ids are deduped: closeTab drops by id, and two tabs sharing one would close together.
export function sanitizeTabSet(raw: unknown): StoredTabSet | null {
  const read = z
    .object({
      tabs: eachOf(storedTab),
      activeTabId: z.string().catch('').default(''),
    })
    .safeParse(raw)
  if (!read.success) return null
  const seen = new Set<string>()
  const tabs = read.data.tabs.filter((tab) => {
    if (seen.has(tab.id)) return false
    seen.add(tab.id)
    return true
  })
  return { tabs, activeTabId: read.data.activeTabId }
}

export function readTabsState(): StoredTabSet | null {
  return sanitizeTabSet(readValue('tabs'))
}

export function writeTabsState(set: StoredTabSet): boolean {
  return writeValue('tabs', set)
}
