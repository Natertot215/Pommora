import { tokenize } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/MarkdownPM/Engine/tokens'
import { toggleInline } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/MarkdownPM/Input/format'
import { cellToSource, cellToDisplay, splitRow } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/MarkdownPM/Engine/Tables/codec'
import { linkMarkdown } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Connections/linkValue'
import { scanDoc } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/MarkdownPM/Engine/docScan'
import { readFormatState } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/MarkdownPM/Input/formatState'
// 1: | round trip
const t = linkMarkdown('https://a.co', 'link-title', 'A | B')
console.log('linkMarkdown:', t)
const src = cellToSource(t)
console.log('cellToSource:', src, ' display back:', cellToDisplay(src), ' roundtrip:', cellToDisplay(src) === t)
const row = '| x | ' + src + ' |'
console.log('row cells (escaped):', JSON.stringify(splitRow(row, 0).cells))
console.log('row cells (raw):', JSON.stringify(splitRow('| x | ' + t + ' |', 0).cells))
console.log('display tokens:', JSON.stringify(tokenize(t).map(k=>k.kind)))
// 2: marker ordinal in a cell doc
const cell = 'see[^1]'
const sc = scanDoc(cell)
console.log('cell markers:', JSON.stringify(sc.citations.markers))
// 3: toggleInline collapsed inside bold, and outside
const b = 'a **bold** c'
console.log('toggle off inside bold:', JSON.stringify(toggleInline(b, 5, 5, 'bold')))
console.log('toggle at plain caret:', JSON.stringify(toggleInline(b, 0, 0, 'bold')))
console.log('toggle over selection:', JSON.stringify(toggleInline('a word c', 2, 6, 'bold')))
console.log('formatState in bold:', JSON.stringify(readFormatState(b, 5, 5)))
// embed in cell
console.log('cell embed tokens:', JSON.stringify(tokenize('x ![[Page]] y').map(k=>k.kind)))
