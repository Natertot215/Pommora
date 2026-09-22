import { z } from 'zod'
import { EMPTY_WINDOWS, type WindowsFile } from './windowRecord'
import { isNavRef, type NavRef, toNavRef } from '../../Navigation/navRef'
import { readValue, writeValue } from '../../Platform/localState'

const TAB_TARGET_KINDS = new Set<string>(['page', 'space'])

// `NavRef` keeps its one validator; the schema decodes the file's shape around it.
const windowTarget = z
  .custom<NavRef>((v) => isNavRef(v, TAB_TARGET_KINDS))
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
})

// Every field catches, so a file written before the set was unified reads as one that simply never named a page set.
const windowsFile = z.object({
  navSet: windowSetRecord.nullable().catch(null),
  pageSet: windowSetRecord.nullable().catch(null),
  open: z
    .object({ kind: z.enum(['page', 'nav', 'matrix']) })
    .nullable()
    .catch(null),
})

export function sanitizeWindows(raw: unknown): WindowsFile | null {
  const read = windowsFile.safeParse(raw)
  return read.success ? read.data : null
}

export function readWindowsState(): WindowsFile {
  return sanitizeWindows(readValue('windows')) ?? EMPTY_WINDOWS
}

export function writeWindowsState(file: WindowsFile): boolean {
  return writeValue('windows', file)
}
