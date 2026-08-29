// THE page-body autosave: one debounced writer PER PATH, shared by every host that edits a page, so
// the newest edit from ANY host owns the file's single pending write rather than hosts racing private
// debounces to last-writer-wins. Built on the shared body-writer machinery.

import { createBodyWriter } from '../SurfacePM/PageTileWrite'
import { writeThroughBody } from '../Store/TabState'

const pageWriter = createBodyWriter()

export function schedulePageSave(path: string, body: string): void {
  // Write through to the warm detail slot immediately, so a remounting embed inside the debounce
  // window can never seed on pre-edit prose; re-asserted inside the write so cache and disk still
  // converge across a failed write's requeue.
  writeThroughBody(path, body)
  pageWriter.schedule(path, body, () => {
    writeThroughBody(path, body)
    return window.nexus.updatePageBody(path, body)
  })
}

/** Land the path's pending body now — awaitable, so a host's close path lands the write before the
 *  world changes. */
export function flushPageSave(path: string): Promise<void> {
  return pageWriter.flush(path)
}

/** Land every pending page write. The nexus-adopt path awaits this while the OLD root is still bound —
 *  a write after the flip would bind the new nexus and overwrite a same-relative-path file (data loss). */
export function flushAllPageSaves(): Promise<void> {
  return pageWriter.flushAll()
}
