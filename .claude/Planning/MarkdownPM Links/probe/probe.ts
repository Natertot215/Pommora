import { readFormatState } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/MarkdownPM/Input/formatState'
import { autocompleteQuery } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/MarkdownPM/Autocomplete/autocomplete'
import { scanDoc } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/MarkdownPM/Engine/docScan'
import { tokenize } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/MarkdownPM/Engine/tokens'
import { toggleInline } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/MarkdownPM/Input/format'
const fenced = '```\n[[A]]\n```'
const at = fenced.indexOf('A')
console.log('formatState in fence:', JSON.stringify(readFormatState(fenced, at, at)))
console.log('tokenize whole fenced doc wikis:', tokenize(fenced).filter(t=>t.kind==='wikiLink').length)
console.log('toggle connection in fence:', JSON.stringify(toggleInline(fenced, at, at, 'connection' as any)))
const doc = 'x `[[A`]] y'
const caret = doc.indexOf(']]')
console.log('tokens half-in-code:', JSON.stringify(tokenize(doc).map(t=>t.kind)))
console.log('picker half-in-code:', JSON.stringify(autocompleteQuery(scanDoc(doc), caret)))
const md = '[a\\]b](https://x.com)'
console.log('toggle link off escaped label:', JSON.stringify(toggleInline(md, 3, 3, 'link' as any)))
console.log('wrap sel with ]:', JSON.stringify(toggleInline('a]b', 0, 3, 'link' as any)))
