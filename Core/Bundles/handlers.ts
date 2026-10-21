import { type Handlers, withRoot } from '../Contract/handlers'
import { fault, ok } from '../Contract/result'
import { isPlainObject, isString } from '../Contract/validators'
import { liveTreeOf } from '../Nexus/liveTree'
import { nexusPages } from '../Nexus/heldPages'
import { archiveStoreOf } from '../Paths/names'
import { archivedWithin, type BundleStore, listBundles } from './bundle'
import { bundleRows } from './rows'

function storeFrom(raw: unknown): BundleStore | null {
  if (!isPlainObject(raw)) return null
  if (raw.kind === 'trash') return { kind: 'trash' }
  return raw.kind === 'archive' && isString(raw.id) ? archiveStoreOf(raw.id) : null
}

export const bundlesHandlers = {
  'bundles:list': withRoot(async (root, _ctx, raw: unknown, within?: unknown) => {
    const store = storeFrom(raw)
    if (!store) return fault('A store is required.')
    if (within !== undefined && !isString(within)) return fault('Invalid Set id.')
    if (within !== undefined && store.kind !== 'archive')
      return fault('Only an Archive lists within a Set.')
    const tree = await liveTreeOf(root)
    const { byId } = await nexusPages(root, tree)
    const listed =
      store.kind === 'archive' && within !== undefined
        ? await archivedWithin(root, within, store.id, tree)
        : await listBundles(root, store)
    return ok(bundleRows(listed, store, tree, byId))
  }),
} satisfies Partial<Handlers>
