import { net } from 'electron'
import {
  isHttpLink,
  normalizeLinkUrl,
  LINK_RESOLVE_TIMEOUT_MS,
} from '@pommora/core/Connections/links'
import { readScope, writeKey } from '@pommora/core/Platform/localState'
import { makeTitleScanner } from '@pommora/core/Web/titleScan'

/** URL → fetched page title. Regeneratable from the network, so it never leaves the device. */
export type LinkTitleCache = Record<string, string>

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Pommora/1.0'

function fetchPageTitle(rawUrl: string): Promise<string | null> {
  if (!isHttpLink(rawUrl)) return Promise.resolve(null) // http(s) only — never mailto:/file:/etc.
  const url = normalizeLinkUrl(rawUrl)
  return new Promise((resolve) => {
    let settled = false
    let req: Electron.ClientRequest | undefined
    const finish = (v: string | null): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        req?.abort()
      } catch {
        // already ended / aborted
      }
      resolve(v)
    }
    const timer = setTimeout(() => finish(null), LINK_RESOLVE_TIMEOUT_MS)
    try {
      req = net.request({ url, redirect: 'follow' })
    } catch {
      return finish(null)
    }
    req.setHeader('User-Agent', USER_AGENT)
    req.on('response', (response) => {
      const status = response.statusCode ?? 0
      if (status < 200 || status >= 300) return finish(null)
      const scanner = makeTitleScanner()
      response.on('data', (chunk: Buffer) => {
        const done = scanner.push(chunk)
        if (done !== undefined) finish(done)
      })
      response.on('end', () => finish(scanner.end()))
      response.on('error', () => finish(null))
    })
    req.on('error', () => finish(null))
    req.end()
  })
}

let cache: LinkTitleCache = {}
let cacheRoot: string | null = null

function ensureCache(root: string): void {
  if (cacheRoot === root) return
  cache = readScope<string>('linkTitle')
  cacheRoot = root
}

export function getTitleCache(root: string): LinkTitleCache {
  ensureCache(root)
  return { ...cache }
}

export async function resolveTitle(root: string, url: string): Promise<string | null> {
  ensureCache(root)
  const hit = cache[url]
  if (hit) return hit
  const title = await fetchPageTitle(url)
  if (title && cacheRoot === root) {
    cache[url] = title
    writeKey('linkTitle', url, title)
  }
  return title
}
