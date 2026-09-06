import { isValidLink, normalizeLinkUrl } from '../Connections/links'
import type { Handlers } from '../Contract/handlers'
import { fail, NO_NEXUS, ok } from '../Contract/result'
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
  'linkTitles:get': async (): Promise<LinkTitleCache> => {
    const root = sessionRoot()
    if (!root) return {}
    ensureCache(root)
    return { ...cache }
  },

  'linkTitles:fetch': async (ctx, url: unknown) => {
    if (typeof url !== 'string') return fail('operation-failed', 'invalid url')
    const root = sessionRoot()
    if (!root) return NO_NEXUS
    ensureCache(root)
    const hit = cache[url]
    if (hit) return ok({ title: hit })
    const title = await ctx.fetchTitle(url)
    if (title && cacheRoot === root) {
      cache[url] = title
      writeKey('linkTitle', url, title)
    }
    return ok({ title })
  },

  'link:open': async (ctx, url: unknown) => {
    if (typeof url !== 'string' || !isValidLink(url)) return
    await ctx.openExternal(normalizeLinkUrl(url))
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
