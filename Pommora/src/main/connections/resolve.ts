// Pure resolution over an in-memory link index — no SQLite. buildLinkIndex turns the nexus's
// pages into normalized-title → ids; resolveTitle classifies a scanned title as resolved
// (exactly one holder), ambiguous (more than one), or phantom (none).

import { normalizeTitle, type LinkIndex, type LinkStatus } from '@shared/connections'

/** Build the nexus-wide resolution index from every page's id + current title. Pages
 *  sharing a normalized title collect under the same key (→ ambiguous on resolve). */
export function buildLinkIndex(pages: { id: string; title: string }[]): LinkIndex {
  const index: LinkIndex = new Map()
  for (const p of pages) {
    const key = normalizeTitle(p.title)
    if (!key) continue
    const ids = index.get(key)
    if (ids) ids.push(p.id)
    else index.set(key, [p.id])
  }
  return index
}

/** Classify a normalized title against the index. */
export function resolveTitle(
  normalizedTitle: string,
  index: LinkIndex,
): { status: LinkStatus; targetId?: string } {
  const ids = index.get(normalizedTitle)
  if (!ids || ids.length === 0) return { status: 'phantom' }
  if (ids.length > 1) return { status: 'ambiguous' }
  return { status: 'resolved', targetId: ids[0] }
}
