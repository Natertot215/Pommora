// The floating windows' persistence: the NavWindow flavor's page tabs, the per-origin Page Window
// sets (keyed by origin page id, re-keyed on re-parent), and which window was open. The renderer
// owns restore-time reconciliation against the live tree; main strips every ref to bare identity
// and persists the file as one row.

import { isPlainObject } from '@shared/propertyValue'
import {
  EMPTY_WINDOWS,
  toNavRef,
  type NavRef,
  type WindowSetRecord,
  type WindowsFile,
} from '@shared/types'
import { readValue, writeValue } from '../Database/localState'
import { isTabRef } from './tabsState'

function readRecord(v: unknown): WindowSetRecord | null {
  if (!isPlainObject(v) || !Array.isArray(v.tabs)) return null
  const tabs = v.tabs
    .map((t) => (isPlainObject(t) && isTabRef(t.target) ? { target: toNavRef(t.target) } : null))
    .filter((t): t is { target: NavRef } => t !== null)
  const activeIndex =
    typeof v.activeIndex === 'number' && Number.isInteger(v.activeIndex) && v.activeIndex >= 0
      ? v.activeIndex
      : 0
  return { tabs, activeIndex }
}

function readOpen(v: unknown): WindowsFile['open'] {
  if (!isPlainObject(v)) return null
  const flavor = v.flavor
  return (flavor === 'page' || flavor === 'nav') && typeof v.originId === 'string'
    ? { flavor, originId: v.originId }
    : null
}

/** Shape-validate and strip a windows payload to bare refs — the ONE boundary for the row,
 *  shared by the read below and the `windows:save` handler. */
export function sanitizeWindows(raw: unknown): WindowsFile | null {
  if (!isPlainObject(raw) || !isPlainObject(raw.origins)) return null
  const origins: Record<string, WindowSetRecord> = {}
  for (const [id, rec] of Object.entries(raw.origins)) {
    const clean = readRecord(rec)
    if (clean) origins[id] = clean
  }
  const file: WindowsFile = { navSet: readRecord(raw.navSet), origins, open: readOpen(raw.open) }
  if (typeof raw.navOverride === 'boolean') file.navOverride = raw.navOverride
  return file
}

export function readWindowsState(): WindowsFile {
  return sanitizeWindows(readValue('windows')) ?? EMPTY_WINDOWS
}

export function writeWindowsState(file: WindowsFile): boolean {
  return writeValue('windows', file)
}
