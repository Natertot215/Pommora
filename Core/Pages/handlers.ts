import { type Handlers, withRoot, withWriteRoot } from '../Contract/handlers'
import { fail, ok } from '../Contract/result'
import { isFiniteNumber, isString } from '../Contract/validators'
import { readPageDetail } from '../Files/pageFile'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { pushValueChanges } from '../Nexus/confirm'
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

  'page:updateBody': withWriteRoot(
    async (root, ctx, relPath: unknown, body: unknown, baseHash: unknown) => {
      if (!isString(relPath)) return fail('operation-failed', 'A page path is required.')
      if (!isString(body)) return fail('operation-failed', 'A body string is required.')
      if (!isString(baseHash)) return fail('operation-failed', 'A base hash is required.')
      const resolved = await resolveUnderRoot(root, relPath)
      if (!resolved.ok) return resolved
      const r = await writeBody(root, resolved.value, body, 'edit', baseHash)
      pushValueChanges(ctx, root)
      return r
    },
  ),

  'history:list': withRoot(async (_root, _ctx, pageId: unknown) =>
    isString(pageId) ? listHistory(pageId) : fail('operation-failed', 'A page id is required.'),
  ),

  'history:read': withRoot(async (_root, _ctx, pageId: unknown, ts: unknown) =>
    isString(pageId) && isFiniteNumber(ts) ? readHistoryBody(pageId, ts) : NEEDS_SNAPSHOT_KEY,
  ),

  'history:restore': withWriteRoot(async (root, ctx, pageId: unknown, ts: unknown) => {
    if (!isString(pageId) || !isFiniteNumber(ts)) return NEEDS_SNAPSHOT_KEY
    const r = await restoreSnapshot(root, pageId, ts)
    pushValueChanges(ctx, root)
    return r
  }),

  'history:delete': withWriteRoot(async (_root, _ctx, pageId: unknown, ts: unknown) =>
    isString(pageId) && Array.isArray(ts) && ts.every(isFiniteNumber)
      ? deleteHistory(pageId, ts)
      : fail('operation-failed', 'A page id and timestamps are required.'),
  ),

  'history:clear': withWriteRoot(async () => clearHistory()),
} satisfies Partial<Handlers>
