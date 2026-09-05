// The streaming <title> scanner: the pure half of page-title resolution, fed response chunks by
// whatever owns the network.

import { StringDecoder } from 'node:string_decoder'

const MAX_BYTES = 65536 // the <title> lives in <head>; never pull a whole page down
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
 *  StringDecoder (a plain per-chunk `toString` splits a multi-byte char in two and corrupts it —
 *  any accented/CJK/emoji title). `push` returns the title once `</title>` or the byte cap
 *  arrives, else undefined to keep going; `end` flushes the decoder for a stream that finished
 *  without either. */
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
