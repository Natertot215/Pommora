import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfm } from 'micromark-extension-gfm'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import type { Root } from 'mdast'

export function parse(text: string): Root {
  return fromMarkdown(text, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] })
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
