import { type Handlers, withRoot } from '../Contract/handlers'
import { fault, ok } from '../Contract/result'
import { isPlainObject, isString } from '../Contract/validators'
import { liveTreeOf } from '../Nexus/liveTree'
import { nexusPages } from '../Nexus/heldPages'
import { scopeOf } from '../Settings/codec'
import { readLiveSetting } from '../Settings/settings'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { archivedWithin, listBundles, listInner } from './bundle'
import { archiveStoreOf, type BundleStore } from '../Paths/bundleLayout'
import { bundleRows, innerRows } from './rows'

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
  'bundles:children': withRoot(async (root, _ctx, raw: unknown) => {
    if (!Array.isArray(raw) || !raw.every(isString)) return fault('Addresses are required.')
    const tree = await liveTreeOf(root)
    const { byId } = await nexusPages(root, tree)
    const scope = scopeOf(tree.config)
    return ok(
      await Promise.all(
        raw.map(async (address) => {
          const resolved = await resolveUnderRoot(root, address)
          const listed = resolved.ok ? await listInner(root, resolved.value, scope) : resolved
          return listed.ok ? innerRows(listed.value, tree, byId) : []
        }),
      ),
    )
  }),
  'bundles:permanentDelete': withRoot(async (root) =>
    ok(await readLiveSetting(root, 'permanentDelete')),
  ),
} satisfies Partial<Handlers>
