const R = '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core'
const { decidePaste, pastedUrl } = await import(R + '/MarkdownPM/Links/pasteDecision')
const { linkDestinationStart } = await import(R + '/Connections/links')
const { pasteAsTarget, pasteAsRows, pasteAsWrite } = await import(R + '/Actions/pasteAsMenu')
const { tokenize } = await import(R + '/MarkdownPM/Engine/tokens')
const { linkAt, parseConnectionText } = await import(R + '/Connections/connections')
const { readLink } = await import(R + '/Connections/linkValue')
const clips = ['[[P]]', '[[P#H|a]]', '[x](P)', '[x](https://a.co)', 'https://a.co']
for (const c of clips) console.log('pastedUrl', JSON.stringify(c), '->', JSON.stringify(pastedUrl(c)))
// literalAt's link clause: caret positions inside containers
const containers: [string, number, string][] = [
  ['[[Foo|]]', 6, 'alias slot'], ['[[Foo]]', 4, 'title'], ['[[Foo#H]]', 7, 'heading'],
  ['[x](Page)', 1, 'md label'], ['[x](Page)', 6, 'md dest'], ['[x](https://b.co)', 8, 'url dest'],
]
for (const [line, rel, what] of containers) console.log('literal(linkDestinationStart)', what, JSON.stringify(line), rel, '->', linkDestinationStart(line, rel))
console.log('decidePaste url in [[Foo|]]', JSON.stringify(decidePaste({ clipboard: 'https://a.co', selectionText: '', inverse: false, format: 'link-short' })))
console.log('decidePaste url, selection "Foo" (inside [[Foo]])', JSON.stringify(decidePaste({ clipboard: 'https://a.co', selectionText: 'Foo', inverse: false, format: 'link-short' })))
const after = '[[Foo|[a.co](https://a.co)]]'
console.log('after paste', after, 'tokens', JSON.stringify(tokenize(after).map((t: any) => [t.kind, after.slice(...t.range)])), 'linkAt', JSON.stringify(linkAt(after, 3)))
const raw1 = '[[P[[P2]]1]]'
console.log('raw ⌘V [[P2]] into [[P1]] title', raw1, JSON.stringify(tokenize(raw1).map((t: any) => [t.kind, raw1.slice(...t.range)])))
const raw2 = '[[P1|x[y](P2)]]'
console.log('raw ⌘V [y](P2) into alias', raw2, JSON.stringify(tokenize(raw2).map((t: any) => [t.kind, raw2.slice(...t.range)])))
for (const c of clips) {
  const t = pasteAsTarget(c)
  console.log('pasteAsTarget', JSON.stringify(c), JSON.stringify(t), 'rows', JSON.stringify(pasteAsRows(c, false, false).map((r: any) => r.form)))
}
for (const c of clips) console.log('readLink', JSON.stringify(c), JSON.stringify(readLink(c)), 'parseConn', JSON.stringify(parseConnectionText(c)))
