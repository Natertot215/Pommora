const MAX_BYTES = 65536 // the <title> lives in <head>; never pull a whole page down
const NAMED: Record<string, string> = { lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

function safeCodePoint(cp: number): string {
  try {
    return String.fromCodePoint(cp)
  } catch {
    return ''
  }
}

/** `&amp;` is decoded LAST so `&amp;#60;` (a literal `&#60;`) can't double-decode into `<`. */
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeCodePoint(Number(d)))
    .replace(/&(lt|gt|quot|apos|nbsp);/gi, (_, n: string) => NAMED[n.toLowerCase()])
    .replace(/&amp;/gi, '&')
}

export function extractTitle(html: string): string | null {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)
  if (!m) return null
  const text = decodeEntities(m[1]).replace(/\s+/g, ' ').trim()
  return text || null
}

export function makeTitleScanner(maxBytes = MAX_BYTES): {
  push(chunk: Uint8Array): string | null | undefined
  end(): string | null
} {
  const decoder = new TextDecoder()
  let buf = ''
  return {
    push(chunk: Uint8Array): string | null | undefined {
      buf += decoder.decode(chunk, { stream: true })
      if (/<\/title>/i.test(buf) || buf.length >= maxBytes) return extractTitle(buf)
      return undefined
    },
    end(): string | null {
      return extractTitle(buf + decoder.decode())
    },
  }
}
