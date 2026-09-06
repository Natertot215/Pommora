import { type Handlers, withRoot } from '../Contract/handlers'
import { fail, NO_NEXUS, ok } from '../Contract/result'
import { isFiniteNumber, isString } from '../Contract/validators'
import { readPageDetail } from '../Files/pageFile'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { pushValueChanges } from '../Nexus/confirm'
import { sessionRoot } from '../Nexus/session'
import {
  clearHistory,
  deleteHistory,
  listHistory,
  readHistoryBody,
  restoreSnapshot,
  writeBody,
} from './fileHistory'

const NEEDS_SNAPSHOT_KEY = fail('operation-failed', 'A page id and a timestamp are required.')

export const pagesHandlers = {
  'page:open': withRoot(async (root, _ctx, relPath: unknown) => {
    if (!isString(relPath)) return fail('operation-failed', 'A page path is required.')
    const resolved = await resolveUnderRoot(root, relPath)
    if (!resolved.ok) return resolved
    // relPath stays the page's identity (PageDetail.path); the canonical absolute would mis-key it.
    return ok(await readPageDetail(root, relPath))
  }),

  'page:updateBody': withRoot(async (root, ctx, relPath: unknown, body: unknown) => {
    if (!isString(relPath)) return fail('operation-failed', 'A page path is required.')
    if (!isString(body)) return fail('operation-failed', 'A body string is required.')
    const resolved = await resolveUnderRoot(root, relPath)
    if (!resolved.ok) return resolved
    const r = await writeBody(root, resolved.value, body, 'edit')
    pushValueChanges(ctx, root)
    return r
  }),

  'history:list': async (_ctx, pageId: unknown) => {
    if (sessionRoot() === null) return NO_NEXUS
    return isString(pageId)
      ? listHistory(pageId)
      : fail('operation-failed', 'A page id is required.')
  },

  'history:read': async (_ctx, pageId: unknown, ts: unknown) => {
    if (sessionRoot() === null) return NO_NEXUS
    return isString(pageId) && isFiniteNumber(ts) ? readHistoryBody(pageId, ts) : NEEDS_SNAPSHOT_KEY
  },

  'history:restore': withRoot(async (root, ctx, pageId: unknown, ts: unknown) => {
    if (!isString(pageId) || !isFiniteNumber(ts)) return NEEDS_SNAPSHOT_KEY
    const r = await restoreSnapshot(root, pageId, ts)
    pushValueChanges(ctx, root)
    return r
  }),

  'history:delete': async (_ctx, pageId: unknown, ts: unknown) => {
    if (sessionRoot() === null) return NO_NEXUS
    return isString(pageId) && Array.isArray(ts) && ts.every(isFiniteNumber)
      ? deleteHistory(pageId, ts)
      : fail('operation-failed', 'A page id and timestamps are required.')
  },

  'history:clear': async () => (sessionRoot() === null ? NO_NEXUS : clearHistory()),
} satisfies Partial<Handlers>
