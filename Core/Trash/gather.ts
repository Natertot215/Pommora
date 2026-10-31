import { isMarkdownFile, join } from '../Paths/posix'
import type { ContextDef } from '../Contexts/contexts'
import { type Holders, readHolders } from '../Index/keyHolders'
import type { LinkStrip } from '../Nexus/cascade'
import type { Json } from '../Files/stableJson'
import { scalarMembers } from '../Contract/validators'
import { contextKey } from '../Contexts/contexts'
import { contextDirRel, TRASH_DIR } from '../Paths/nexusPaths'
import { exactTitle } from '../Paths/caseFold'
import type { NexusTree, SpaceNode } from '../Nexus/tree'
import { asStringArray } from '../Nexus/coerce'
import { contextWorldOf } from '../Contexts/contextResolve'
import { appendLinks, placeOf, type RecordFile, type StrippedLink } from '../Bundles/record'
import { linkedPage } from '../Connections/linkValue'
import { buildPageIndex, connPage } from '../Connections/pageIndex'
import { storeOf } from '../Paths/bundleLayout'
import { storedPageIds } from '../Nexus/heldPages'
import { liveTreeOf } from '../Nexus/liveTree'

/** The Link values a delete's strip will take, read from each holder as a Space's or Context's capture reads it, so they're written down before anything is stripped. */
export async function gatherLinks(root: string, strip: LinkStrip): Promise<StrippedLink[]> {
  const { held } = await readHolders(root, strip.files, strip.keys, strip.byId)
  return held.flatMap(({ id, values, above }) =>
    id && values
      ? strip.named(values).map(({ key, def, value }) => ({
          page: id,
          property: def.id,
          value,
          above: above[key],
        }))
      : [],
  )
}

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

/** Each holder the capture filed by id, as a record names it, a page with the key its line stood above. */
const rootsOf = (
  holders: Holders,
): [{ id: string; kind: 'page' | 'space'; above?: string }, Json][] =>
  holders.held.flatMap((h) => {
    const kind = isMarkdownFile(h.file) ? 'page' : 'space'
    return h.id && h.values ? [[{ id: h.id, kind, above: h.above[h.keys[0]] }, h.values]] : []
  })

/** A capture missing a holder: one neither its file nor the index could answer, or one no id files. */
const partly = (holders: Holders): boolean => holders.held.some((h) => !h.id || !h.values)

export function gatherSpaceRecord(tree: NexusTree, space: SpaceNode, held: Holders): RecordFile {
  const group = contextWorldOf(tree.contexts).groupById.get(space.contextId)!
  const place = placeOf(
    group.spaces.map((s) => s.id),
    space.id,
  )
  return {
    entity: 'space',
    id: space.id,
    ...(space.icon ? { icon: space.icon } : {}),
    parent: { kind: 'context', id: space.contextId },
    ...(place ? { place } : {}),
    members: rootsOf(held).map(([member]) => member),
    ...(partly(held) ? { partial: true as const } : {}),
  }
}

export function gatherContextRecord(tree: NexusTree, entry: ContextDef, held: Holders): RecordFile {
  const group = contextWorldOf(tree.contexts).groupById.get(entry.id)!
  const spaceIds = new Map(group.spaces.map((s) => [exactTitle(s.title), s.id]))
  const under = `${contextDirRel(entry.title)}/`
  const unread = tree.unreadable?.some((u) => u.kind === 'space' && u.path.startsWith(under))
  const key = contextKey(entry.title)
  const membership = rootsOf(held).map(([member, values]) => ({
    root: member,
    spaces: [
      ...new Map(
        scalarMembers(values[key]).map((title) => {
          const id = spaceIds.get(exactTitle(title))
          return [id ?? title, id ? { id, title } : { title }]
        }),
      ).values(),
    ],
  }))
  const place = placeOf(
    tree.contexts.map((g) => g.def.id),
    entry.id,
  )
  const panel = placeOf(tree.config.order.contexts ?? [], entry.id)
  const spaceOrder = asStringArray(tree.config.order.spaces[entry.id])
  return {
    entity: 'context',
    registry: entry,
    ...(place ? { place } : {}),
    ...(panel ? { panel } : {}),
    ...(spaceOrder?.length ? { spaceOrder } : {}),
    membership,
    ...(unread || partly(held) ? { partial: true as const } : {}),
  }
}
