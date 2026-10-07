import { parse } from '../MarkdownPM/Engine/parser'
import { parseDelimiter, splitRow } from '../MarkdownPM/Engine/Tables/codec'
import { normalize, type TableModel } from '../MarkdownPM/Engine/Tables/model'
import {
  assembleCitations,
  type CitationScan,
  type DocLines,
  lineRefs,
  type MarkdownScope,
} from '../MarkdownPM/Engine/detect'
import { type DocScan, scanDoc } from '../MarkdownPM/Engine/docScan'
import {
  type DecoIntent,
  docLineIntents,
  lineIntentsInto,
  tokenIntents,
} from '../MarkdownPM/Engine/intents'
import { EditorState } from '@codemirror/state'
import { codeMask, type TextEdit } from '../MarkdownPM/Engine/markdownCode'
import { listRenumber, RELIST } from '../MarkdownPM/Input/listRenumber'
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
  const header = splitRow(ls[0].text, ls[0].from).cells.map((c) => c.text)
  const rows = ls
    .slice(2)
    .filter((l) => l.text.trim() !== '')
    .map((l) => splitRow(l.text, l.from).cells.map((c) => c.text))
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

export function citationScan(d: DocLines, excluded: [number, number][]): CitationScan {
  const inCode = codeMask(d.text)
  return assembleCitations(
    d,
    (k) => excluded.some(([f, t]) => d.lineStarts[k] >= f && d.lineStarts[k] <= t),
    d.lines.map((line, i) => lineRefs(line, d.lineStarts[i], inCode)),
  )
}

/** An edit as the editor lands it: its changes, then the list renumber that rides the same transaction. */
export function landEdit(doc: string, changes: readonly TextEdit[], relist = false): string {
  return EditorState.create({ doc, extensions: listRenumber('page') })
    .update({ changes: [...changes], userEvent: relist ? RELIST : 'input' })
    .state.doc.toString()
}
