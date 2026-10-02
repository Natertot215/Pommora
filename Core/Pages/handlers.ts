import { type Handlers, withRoot, withWriteRoot } from '../Contract/handlers'
import { fault } from '../Contract/result'
import { isFiniteNumber, isString } from '../Contract/validators'
import { readPage } from '../Files/pageFile'
import { resolveUnderRoot } from '../Paths/pathSafety'
import {
  clearHistory,
  deleteHistory,
  listHistory,
  readHistoryBody,
  restoreSnapshot,
  writeBody,
} from './fileHistory'

const NEEDS_SNAPSHOT_KEY = fault('A page id and a timestamp are required.')

export const pagesHandlers = {
  'page:open': withRoot(async (root, _ctx, relPath: unknown) => {
    if (!isString(relPath)) return fault('A page path is required.')
    const resolved = await resolveUnderRoot(root, relPath)
    if (!resolved.ok) return resolved
    // relPath stays the page's identity (PageDetail.path); the canonical absolute would mis-key it.
    return readPage(root, relPath)
  }),

  'page:updateBody': withWriteRoot(
    async (root, _ctx, relPath: unknown, body: unknown, baseHash: unknown) => {
      if (!isString(relPath)) return fault('A page path is required.')
      if (!isString(body)) return fault('A body string is required.')
      if (!isString(baseHash)) return fault('A base hash is required.')
      const resolved = await resolveUnderRoot(root, relPath)
      if (!resolved.ok) return resolved
      return writeBody(root, resolved.value, body, 'edit', baseHash)
    },
  ),

  'history:list': withRoot(async (_root, _ctx, pageId: unknown) =>
    isString(pageId) ? listHistory(pageId) : fault('A page id is required.'),
  ),

  'history:read': withRoot(async (_root, _ctx, pageId: unknown, ts: unknown) =>
    isString(pageId) && isFiniteNumber(ts) ? readHistoryBody(pageId, ts) : NEEDS_SNAPSHOT_KEY,
  ),

  'history:restore': withWriteRoot(async (root, _ctx, pageId: unknown, ts: unknown) =>
    isString(pageId) && isFiniteNumber(ts) ? restoreSnapshot(root, pageId, ts) : NEEDS_SNAPSHOT_KEY,
  ),

  'history:delete': withWriteRoot(async (_root, _ctx, pageId: unknown, ts: unknown) =>
    isString(pageId) && Array.isArray(ts) && ts.every(isFiniteNumber)
      ? deleteHistory(pageId, ts)
      : fault('A page id and timestamps are required.'),
  ),

  'history:clear': withWriteRoot(async () => clearHistory()),
} satisfies Partial<Handlers>
