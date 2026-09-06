import { net } from 'electron'
import {
  isHttpLink,
  LINK_RESOLVE_TIMEOUT_MS,
  normalizeLinkUrl,
} from '@pommora/core/Connections/links'
import { makeTitleScanner } from '@pommora/core/Web/titleScan'

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Pommora/1.0'

export function fetchPageTitle(rawUrl: string): Promise<string | null> {
  if (!isHttpLink(rawUrl)) return Promise.resolve(null)
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
      } catch {}
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
