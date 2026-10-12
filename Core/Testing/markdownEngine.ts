import type { EditorState } from '@codemirror/state'
import { parse } from '../MarkdownPM/Engine/parser'
import { parseDelimiter, splitRow } from '../MarkdownPM/Engine/Tables/codec'
import { normalize, type TableModel } from '../MarkdownPM/Engine/Tables/model'
import type { MarkdownScope } from '../MarkdownPM/Engine/detect'
import { type DocScan, scanDoc } from '../MarkdownPM/Engine/docScan'
import {
  type DecoIntent,
  docLineIntents,
  lineIntentsInto,
  tokenIntents,
} from '../MarkdownPM/Engine/intents'
import type { Token } from '../MarkdownPM/Engine/tokens'

// The independent parse `modelFromRegion` is pinned against — a second derivation from the same source.
export function parseTable(src: string): TableModel | null {
  const tree = parse(src)
  if (tree.children.length !== 1 || tree.children[0].type !== 'table') return null
  const ls: { text: string; from: number }[] = []
  let from = 0
  for (const t of src.replace(/\n+$/, '').split('\n')) {
    ls.push({ text: t, from })
    from += t.length + 1
  }
  if (ls.length < 2) return null
  const columns = parseDelimiter(ls[1].text)
  if (!columns) return null
  const header = splitRow(ls[0].text, ls[0].from).cells
  const rows = ls
    .slice(2)
    .filter((l) => l.text.trim() !== '')
    .map((l) => splitRow(l.text, l.from).cells)
  return normalize({ columns, header, rows })
}

/** The whole-document reference the cached assembly is held to: every line derived against the caret, so a caret dependency the live path doesn't re-derive shows as a difference. */
export function decorationsFor(
  text: string,
  tokens: Token[],
  active: Set<number>,
  selStart: number,
  scan?: DocScan,
  scope: MarkdownScope = 'page',
): DecoIntent[] {
  const s = scan ?? scanDoc(text)
  const intents: DecoIntent[] = tokenIntents(tokens, active)
  for (let i = 0; i < s.lines.length; i++) lineIntentsInto(s, i, selStart, intents, scope)
  for (const rails of docLineIntents(s, scope).rails)
    if (rails) for (const it of rails) intents.push(it)
  return intents
}

export function stranded(doc: string): string[] {
  const s = scanDoc(doc)
  const owned = new Set(s.citations.entries.map((e) => e.line))
  return s.lines.filter((l, i) => /^ {0,3}\[\^[^\]\s]+\]:/.test(l) && !owned.has(i))
}

export function typeKeys(state: EditorState, keys: string): string {
  let s = state
  for (const key of keys) {
    const { from, to } = s.selection.main
    s = s.update({ changes: { from, to, insert: key }, selection: { anchor: from + 1 } }).state
  }
  return s.doc.toString()
}
