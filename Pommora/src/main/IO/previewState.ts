// The preview windows' persistence: the NavWindow flavor's page tabs, the per-origin page-preview
// sets (keyed by origin page id, re-keyed on re-parent), and which preview was open. Device-local
// for the same reason as the tab set. The renderer owns restore-time reconciliation against the
// live tree; main strips every ref to bare identity and persists the file as one row.

import { isPlainObject } from '@shared/propertyValue'
import {
  EMPTY_PREVIEWS,
  toNavRef,
  type NavRef,
  type PreviewSetRecord,
  type PreviewsFile,
} from '@shared/types'
import { readValue, writeValue } from '../Database/localState'
import { isTabRef } from './tabsState'

function readRecord(v: unknown): PreviewSetRecord | null {
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

function readOpen(v: unknown): PreviewsFile['open'] {
  if (!isPlainObject(v)) return null
  const flavor = v.flavor
  return (flavor === 'page' || flavor === 'nav') && typeof v.originId === 'string'
    ? { flavor, originId: v.originId }
    : null
}

/** Shape-validate and strip a previews payload to bare refs — the ONE boundary for the row,
 *  shared by the read below and the `previews:save` handler. Malformed records drop; a payload
 *  that isn't a previews file at all reads as null. */
export function sanitizePreviews(raw: unknown): PreviewsFile | null {
  if (!isPlainObject(raw) || !isPlainObject(raw.origins)) return null
  const origins: Record<string, PreviewSetRecord> = {}
  for (const [id, rec] of Object.entries(raw.origins)) {
    const clean = readRecord(rec)
    if (clean) origins[id] = clean
  }
  const file: PreviewsFile = { navSet: readRecord(raw.navSet), origins, open: readOpen(raw.open) }
  if (typeof raw.navOverride === 'boolean') file.navOverride = raw.navOverride
  return file
}

export function readPreviewsState(): PreviewsFile {
  return sanitizePreviews(readValue('previews')) ?? EMPTY_PREVIEWS
}

export function writePreviewsState(file: PreviewsFile): boolean {
  return writeValue('previews', file)
}
