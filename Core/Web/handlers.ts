import { isValidLink, normalizeLinkUrl } from '../Connections/links'
import { type Handlers, withRoot, withWriteRoot } from '../Contract/handlers'
import { fail, ok, type Result } from '../Contract/result'
import { sessionRoot } from '../Nexus/session'
import { readScope, writeKey } from '../Platform/localState'

/** URL → fetched page title. Regeneratable from the network, so it never leaves the device. */
type LinkTitleCache = Record<string, string>

let cache: LinkTitleCache = {}
let cacheRoot: string | null = null

function ensureCache(root: string): void {
  if (cacheRoot === root) return
  cache = readScope<string>('linkTitle')
  cacheRoot = root
}

export const webHandlers = {
  'linkTitles:get': withRoot(async (root): Promise<Result<LinkTitleCache>> => {
    ensureCache(root)
    return ok({ ...cache })
  }, ok({})),

  'linkTitles:fetch': withWriteRoot(async (root, ctx, url: unknown) => {
    if (typeof url !== 'string') return fail('operation-failed', 'invalid url')
    ensureCache(root)
    const hit = cache[url]
    if (hit) return ok({ title: hit })
    const title = await ctx.fetchTitle(url)
    if (title && cacheRoot === root && sessionRoot() === root) {
      cache[url] = title
      writeKey('linkTitle', url, title)
    }
    return ok({ title })
  }),

  'link:open': async (ctx, url: unknown) => {
    if (typeof url !== 'string' || !isValidLink(url)) return ok(null)
    await ctx.openExternal(normalizeLinkUrl(url))
    return ok(null)
  },

  'webGuestZoom:set': (ctx, guestId: number, factor: number) => {
    ctx.webGuests.setZoom(guestId, factor)
    return ok(null)
  },

  'webGuestMedia:pause': (ctx, guestId: number) => {
    ctx.webGuests.pauseMedia(guestId)
    return ok(null)
  },
} satisfies Partial<Handlers>
