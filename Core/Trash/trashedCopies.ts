// A stripped Link value parked with the trashed page it names, so that page's restore writes it back.

import { join } from '../Paths/posix'
import { TRASH_DIR } from '../Paths/nexusPaths'
import { linkedPage } from '../Connections/linkValue'
import { buildPageIndex, connPage } from '../Connections/pageIndex'
import type { StrippedLink } from '../Nexus/cascade'
import { appendLinks } from '../Bundles/record'
import { storeOf } from '../Paths/bundleLayout'
import { storedPageIds } from '../Nexus/heldPages'
import { liveTreeOf } from '../Nexus/liveTree'

/** A Link value dropped for naming a page the Trash holds joins that page's bundle, so its restore writes it back; a key two trashed pages answer names neither. */
export async function parkLinks(root: string, links: StrippedLink[]): Promise<void> {
  if (!links.length) return
  const rows = await storedPageIds(root, await liveTreeOf(root), TRASH_DIR)
  const index = buildPageIndex(
    [...rows.keys()].flatMap((rel) => {
      const at = storeOf(rel)
      return at?.bundle ? [connPage(join(root, at.bundle), at.origin)] : []
    }),
  )
  const parked = new Map<string, StrippedLink[]>()
  for (const link of links) {
    const bundle = linkedPage(link.value, index)?.id
    if (bundle) parked.set(bundle, [...(parked.get(bundle) ?? []), link])
  }
  for (const [bundle, held] of parked) await appendLinks(bundle, held)
}
