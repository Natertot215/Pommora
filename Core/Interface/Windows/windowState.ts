import { z } from 'zod'
import { EMPTY_WINDOWS, type WindowsFile } from './windowRecord'
import { isNavRef, type NavRef, toNavRef, WINDOW_TAB_KINDS } from '../../Navigation/navRef'
import { readValue, writeValue } from '../../Platform/localState'

// `NavRef` keeps its one validator; the schema decodes the file's shape around it.
const windowTarget = z
  .custom<NavRef>((v) => isNavRef(v, WINDOW_TAB_KINDS))
  .transform((t) => toNavRef(t))

const windowTab = z.object({ target: windowTarget })

const windowSetRecord = z.object({
  // A tab whose target no longer reads drops; the rest of the set still opens.
  tabs: z.array(z.unknown()).transform((ts) =>
    ts.flatMap((t) => {
      const tab = windowTab.safeParse(t)
      return tab.success ? [tab.data] : []
    }),
  ),
  activeIndex: z.number().int().min(0).catch(0).default(0),
})

const windowsFile = z.object({
  navSet: windowSetRecord.nullable().catch(null),
  origins: z.record(z.string(), windowSetRecord.nullable().catch(null)),
  open: z
    .object({
      kind: z.enum(['page', 'nav', 'matrix']),
      originId: z.string(),
    })
    .nullable()
    .catch(null),
  navOverride: z.boolean().optional().catch(undefined),
})

export function sanitizeWindows(raw: unknown): WindowsFile | null {
  const read = windowsFile.safeParse(raw)
  if (!read.success) return null
  const { origins, ...rest } = read.data
  const kept: WindowsFile['origins'] = {}
  for (const [id, rec] of Object.entries(origins)) if (rec) kept[id] = rec
  return { ...rest, origins: kept }
}

export function readWindowsState(): WindowsFile {
  return sanitizeWindows(readValue('windows')) ?? EMPTY_WINDOWS
}

export function writeWindowsState(file: WindowsFile): boolean {
  return writeValue('windows', file)
}
