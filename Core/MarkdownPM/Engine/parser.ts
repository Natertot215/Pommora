import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfm } from 'micromark-extension-gfm'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import type { Root } from 'mdast'
import type { DocScan } from './docScan'
import { applyEdits, fenceAt, quotePrefix, type TextEdit } from './markdownCode'

const options = { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] }

export function parse(text: string, scan?: DocScan): Root {
  if (!scan) return fromMarkdown(text, options)
  const edits: TextEdit[] = []
  for (const k of scan.fenceLines) {
    if (scan.fences[k] !== undefined) continue
    const f = fenceAt(scan.lines[k])!
    const at = scan.lineStarts[k] + f.markerEnd - f.length
    edits.push({ from: at, to: at + f.length, insert: 'x'.repeat(f.length) })
  }
  // A `>` the quote rule reads as prose is prose here too, or the parser opens a quote, and a fence inside it, that the scan never drew.
  scan.lines.forEach((line, k) => {
    if (scan.fences[k] !== undefined || !/^[ \t]*>/.test(line)) return
    const q = quotePrefix(line).length
    const bare = /^ {0,3}>/.exec(line.slice(q))
    if (!bare) return
    const at = scan.lineStarts[k] + q + bare[0].length - 1
    edits.push({ from: at, to: at + 1, insert: '.' })
  })
  return fromMarkdown(applyEdits(text, edits), options)
}
