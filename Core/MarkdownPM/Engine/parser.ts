import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfm } from 'micromark-extension-gfm'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import type { Root } from 'mdast'
import type { DocScan } from './docScan'
import { fenceAt } from './markdownCode'

const options = { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] }

export function parse(text: string, scan?: DocScan): Root {
  let read = text
  if (scan)
    for (const k of scan.fenceLines) {
      if (scan.fences[k] !== undefined) continue
      const f = fenceAt(scan.lines[k])!
      const at = scan.lineStarts[k] + f.markerEnd - f.length
      read = read.slice(0, at) + 'x'.repeat(f.length) + read.slice(at + f.length)
    }
  return fromMarkdown(read, options)
}

// Line-scoped so an unclosed `[[` never bleeds across lines.
export function isInsideWikilink(offset: number, text: string): boolean {
  const lineStart = text.lastIndexOf('\n', Math.max(0, offset - 1)) + 1
  let depth = 0
  let i = lineStart
  while (i < offset) {
    if (text[i] === '[' && text[i + 1] === '[') {
      depth++
      i += 2
    } else if (text[i] === ']' && text[i + 1] === ']') {
      depth = Math.max(0, depth - 1)
      i += 2
    } else {
      i++
    }
  }
  return depth > 0
}
