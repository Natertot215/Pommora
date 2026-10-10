const R = '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core'
const { tokenize, linkTokenAt } = await import(R + '/MarkdownPM/Engine/tokens')
const { linkDestinationStart, markdownDestinationAt } = await import(R + '/Connections/links')
const { decidePaste } = await import(R + '/MarkdownPM/Links/pasteDecision')
const { readFormatState } = await import(R + '/MarkdownPM/Input/formatState')
const J = JSON.stringify
console.log('== closed-but-empty destinations: literal today via the complete half; token?')
for (const [line, col] of [['[]()', 3], ['![]()', 4], ['[x]()', 4], ['[](P)', 3], ['[x](P)', 5], ['[x](', 4]] as [string, number][]) {
  const toks = tokenize(line).map((t: any) => t.kind + '@' + t.range)
  console.log(J(line), 'col', col, 'complete', J(markdownDestinationAt(line, col)?.dest ?? null), 'linkDestinationStart', linkDestinationStart(line, col), 'tokens', J(toks), 'linkTokenAt', J(linkTokenAt(tokenize(line), col)?.range ?? null))
}
console.log('decidePaste at a bare caret (what step 4 would write once the closed half leaves literalAt):', J(decidePaste({ clipboard: 'https://a.co', selectionText: '', inverse: false, format: 'link-short' })))
console.log('== readFormatState connection/link flag at the resting seat (edge-inclusive)')
for (const [doc, at] of [['[[P]] tail', 5], ['[[P]] tail', 0], ['[x](https://a.co) tail', 17], ['[[P]] tail', 3]] as [string, number][]) {
  const s = readFormatState(doc, at, at)
  console.log(J(doc), at, 'connection', s.connection, 'link', s.link, 'linkTokenAt', J(linkTokenAt(tokenize(doc), at)?.range ?? null))
}
