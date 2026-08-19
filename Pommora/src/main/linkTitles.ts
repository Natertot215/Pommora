// Page-title resolution for anything showing a link in its Page Title form — a URL property's cells
// and a pasted link in the editor alike. Main owns the network (the
// renderer never fetches) and the authoritative in-memory cache, persisted a row at a time in
// nexus.db. A title is fetched at most once per URL per session. Off the read path entirely.
import { StringDecoder } from 'node:string_decoder'
import { net } from 'electron'
import { isHttpLink, normalizeLinkUrl, LINK_RESOLVE_TIMEOUT_MS } from '@shared/links'
import { readScope, writeKey } from './db/localState'

/** URL → fetched page title. Regeneratable from the network, so it never leaves the device. */
export type LinkTitleCache = Record<string, string>

const MAX_BYTES = 65536 // the <title> lives in <head>; never pull a whole page down
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Pommora/1.0'

const NAMED: Record<string, string> = { lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

function safeCodePoint(cp: number): string {
  try {
    return String.fromCodePoint(cp)
  } catch {
    return ''
  }
}

/** Decode the handful of entities a real <title> carries. `&amp;` is decoded LAST so `&amp;#60;`
 *  (a literal `&#60;`) can't double-decode into `<`. */
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeCodePoint(Number(d)))
    .replace(/&(lt|gt|quot|apos|nbsp);/gi, (_, n: string) => NAMED[n.toLowerCase()])
    .replace(/&amp;/gi, '&')
}

/** Exported for tests (the network wrapper below isn't unit-testable). */
export function extractTitle(html: string): string | null {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)
  if (!m) return null
  const text = decodeEntities(m[1]).replace(/\s+/g, ' ').trim()
  return text || null
}

/** Streaming <title> scanner: feed response chunks, decoding UTF-8 THROUGH chunk boundaries via a
 *  StringDecoder (a plain per-chunk `toString` splits a multi-byte char in two and corrupts it — any
 *  accented / CJK / emoji title). `push` returns the title (or null) once `</title>` or the byte cap
 *  arrives — i.e. stop reading — else undefined to keep going; `end` flushes the decoder for a stream
 *  that finished without either. Exported so the split-boundary reassembly is unit-testable. */
export function makeTitleScanner(maxBytes = MAX_BYTES): {
  push(chunk: Buffer): string | null | undefined
  end(): string | null
} {
  const decoder = new StringDecoder('utf8')
  let buf = ''
  return {
    push(chunk: Buffer): string | null | undefined {
      buf += decoder.write(chunk)
      if (/<\/title>/i.test(buf) || buf.length >= maxBytes) return extractTitle(buf)
      return undefined
    },
    end(): string | null {
      return extractTitle(buf + decoder.end())
    },
  }
}

/** Fetch a URL and return its page title, or null on any failure (offline / non-2xx / no title /
 *  timeout). http(s) only. Stops the download the moment `</title>` arrives or the byte cap is hit. */
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

/** The renderer hydrates its store from this on open. */
export function getTitleCache(root: string): LinkTitleCache {
  ensureCache(root)
  return { ...cache }
}

/** A failed fetch returns null and caches nothing (the renderer won't re-ask this session; next
 *  session retries once). */
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
