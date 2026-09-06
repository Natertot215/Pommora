import type { Handlers } from '../Contract/handlers'
import { fail, NO_NEXUS, ok } from '../Contract/result'
import { isFiniteNumber } from '../Contract/validators'
import { readPageDetail } from '../IO/pageFile'
import { resolveUnderRoot } from '../Locations/pathSafety'
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
  'page:open': async (_ctx, relPath: unknown) => {
    const root = sessionRoot()
    if (root === null) return NO_NEXUS
    if (typeof relPath !== 'string') return fail('operation-failed', 'A page path is required.')
    const resolved = await resolveUnderRoot(root, relPath)
    if (!resolved.ok) return resolved
    // relPath stays the page's identity (PageDetail.path); the canonical absolute would mis-key it.
    return ok(await readPageDetail(root, relPath))
  },

  'page:updateBody': async (ctx, relPath: unknown, body: unknown) => {
    const root = sessionRoot()
    if (root === null) return NO_NEXUS
    if (typeof relPath !== 'string') return fail('operation-failed', 'A page path is required.')
    if (typeof body !== 'string') return fail('operation-failed', 'A body string is required.')
    const resolved = await resolveUnderRoot(root, relPath)
    if (!resolved.ok) return resolved
    const r = await writeBody(root, resolved.value, body, 'edit')
    pushValueChanges(ctx, root)
    return r
  },

  'history:list': async (_ctx, pageId: unknown) => {
    if (sessionRoot() === null) return NO_NEXUS
    return typeof pageId === 'string'
      ? listHistory(pageId)
      : fail('operation-failed', 'A page id is required.')
  },

  'history:read': async (_ctx, pageId: unknown, ts: unknown) => {
    if (sessionRoot() === null) return NO_NEXUS
    return typeof pageId === 'string' && isFiniteNumber(ts)
      ? readHistoryBody(pageId, ts)
      : NEEDS_SNAPSHOT_KEY
  },

  'history:restore': async (ctx, pageId: unknown, ts: unknown) => {
    const root = sessionRoot()
    if (root === null) return NO_NEXUS
    if (typeof pageId !== 'string' || !isFiniteNumber(ts)) return NEEDS_SNAPSHOT_KEY
    const r = await restoreSnapshot(root, pageId, ts)
    pushValueChanges(ctx, root)
    return r
  },

  'history:delete': async (_ctx, pageId: unknown, ts: unknown) => {
    if (sessionRoot() === null) return NO_NEXUS
    return typeof pageId === 'string' && Array.isArray(ts) && ts.every(isFiniteNumber)
      ? deleteHistory(pageId, ts)
      : fail('operation-failed', 'A page id and timestamps are required.')
  },

  'history:clear': async () => (sessionRoot() === null ? NO_NEXUS : clearHistory()),
} satisfies Partial<Handlers>
