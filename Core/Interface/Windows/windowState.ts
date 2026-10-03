import { z } from 'zod'
import { EMPTY_WINDOWS, type WindowsFile } from './windowRecord'
import { isNavRef, isWindowTarget, type NavRef, toNavRef } from '../../Navigation/navRef'
import { readValue, writeValue } from '../../Platform/localState'
import { eachOf, entriesOf } from '../../Files/decoders'

// `NavRef` keeps its one validator; the schema decodes the file's shape around it.
const windowTarget = z.custom<NavRef>((v) => isNavRef(v) && isWindowTarget(v)).transform(toNavRef)

const windowTab = z.object({ target: windowTarget })

const windowSetRecord = z.object({
  // A tab whose target no longer reads drops; the rest of the set still opens.
  tabs: eachOf(windowTab),
})

const windowsFile = z.object({
  sets: entriesOf(windowSetRecord).catch({}),
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
