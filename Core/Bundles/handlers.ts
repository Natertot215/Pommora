import { type Handlers, withRoot } from '../Contract/handlers'
import { fault, ok } from '../Contract/result'
import { isPlainObject, isString } from '../Contract/validators'
import { liveTreeOf } from '../Nexus/liveTree'
import { holdsName } from '../Paths/names'
import { type BundleStore, listBundles } from './bundle'
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
  'bundles:list': withRoot(async (root, _ctx, raw: unknown) => {
    const store = storeFrom(raw)
    if (!store) return fault('A store is required.')
    return ok(bundleRows(await listBundles(root, store), store, await liveTreeOf(root)))
  }),
} satisfies Partial<Handlers>
