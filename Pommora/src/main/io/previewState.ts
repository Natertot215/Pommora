// The preview windows' persistence: the NavWindow flavor's tab set, the per-origin page-preview
// sets (keyed by origin page id, re-keyed on re-parent), and which preview was open. Device-local
// for the same reason as the tab set. The renderer owns restore-time reconciliation against the
// live tree; main persists the file as one row.

import type { PreviewsFile } from '@shared/types'
import { readValue, writeValue } from '../db/localState'

export const EMPTY_PREVIEWS: PreviewsFile = { navSet: null, origins: {}, open: null }

export function readPreviewsState(): PreviewsFile {
  return readValue<PreviewsFile>('previews') ?? EMPTY_PREVIEWS
}

export function writePreviewsState(file: PreviewsFile): void {
  writeValue('previews', file)
}
