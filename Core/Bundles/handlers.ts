import { type Handlers, withRoot } from '../Contract/handlers'
import { fault, ok } from '../Contract/result'
import { isPlainObject, isString } from '../Contract/validators'
import { isUlidShaped } from '../Nexus/identityMark'
import { liveTreeOf } from '../Nexus/liveTree'
import { type BundleStore, listBundles } from './bundle'
import { bundleRows } from './rows'

function storeFrom(raw: unknown): BundleStore | null {
  if (!isPlainObject(raw)) return null
  if (raw.kind === 'trash') return { kind: 'trash' }
  return raw.kind === 'archive' && isString(raw.id) ? { kind: 'archive', id: raw.id } : null
}

export const bundlesHandlers = {
  // An archive's id becomes a path segment, so one the renderer hands in must be ULID-shaped; any other names no Archive.
  'bundles:list': withRoot(async (root, _ctx, raw: unknown) => {
    const store = storeFrom(raw)
    if (!store) return fault('A store is required.')
    if (store.kind === 'archive' && !isUlidShaped(store.id)) return ok([])
    return ok(bundleRows(await listBundles(root, store), store, await liveTreeOf(root)))
  }),
} satisfies Partial<Handlers>
