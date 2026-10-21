import { type Handlers, withRoot } from '../Contract/handlers'
import { fault, ok } from '../Contract/result'
import { isPlainObject, isString } from '../Contract/validators'
import { liveTreeOf } from '../Nexus/liveTree'
import { nexusPages } from '../Nexus/heldPages'
import { holdsName } from '../Paths/names'
import { type BundleStore, listBundles } from './bundle'
import { originOf, originWithin, trailAbove } from './record'
import { bundleRows } from './rows'

// An archive's id becomes one path segment under the Archive's root, so one the renderer hands in must stay a single segment.
function storeFrom(raw: unknown): BundleStore | null {
  if (!isPlainObject(raw)) return null
  if (raw.kind === 'trash') return { kind: 'trash' }
  return raw.kind === 'archive' && isString(raw.id) && holdsName(raw.id)
    ? { kind: 'archive', id: raw.id }
    : null
}

export const bundlesHandlers = {
  'bundles:list': withRoot(async (root, _ctx, raw: unknown, within?: unknown) => {
    const store = storeFrom(raw)
    if (!store) return fault('A store is required.')
    if (within !== undefined && !isString(within)) return fault('Invalid Set id.')
    const tree = await liveTreeOf(root)
    const { byId } = await nexusPages(root, tree)
    const bundles = await listBundles(root, store)
    const listed =
      within === undefined
        ? bundles
        : bundles.filter(({ record }) => {
            const origin = originOf(record)
            return origin !== null && originWithin(origin, within, trailAbove(tree, origin.parent))
          })
    return ok(await bundleRows(root, listed, store, tree, byId))
  }),
} satisfies Partial<Handlers>
