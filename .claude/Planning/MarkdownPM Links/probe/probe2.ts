import { tokenize, linkTokenAt } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/MarkdownPM/Engine/tokens'
import { headingOf } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/MarkdownPM/Engine/tokens'
import { linksIn, sectionRunsIn } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Connections/scan'
import { resolveMdTarget, titleTarget } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/MarkdownPM/Links/connectionsApi'
import { buildPageIndex } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Connections/pageIndex'
import { pasteAsTarget } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Actions/pasteAsMenu'
import { headingHash } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/MarkdownPM/Links/headingHash'
import { scanDoc } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/MarkdownPM/Engine/docScan'
import { readLink } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Connections/linkValue'
const t = '[[A#Note\\]]'
const tk = tokenize(t)[0]
console.log('text', t, 'token heading:', JSON.stringify(headingOf(t, tk)), 'scan qualifier:', JSON.stringify([...linksIn(t)].map(h=>h.qualifier)))
console.log('overlap [[T]](x): tokens', JSON.stringify(tokenize('[[T]](x)').map(k=>k.kind)), 'scan', JSON.stringify([...linksIn('[[T]](x)')].map(h=>h.syntax+':'+h.target)))
const toks = tokenize('[[A]]§B')
console.log('linkTokenAt at end-of-link offset 5:', !!linkTokenAt(toks, 5), ' runs:', JSON.stringify(sectionRunsIn('[[A]]§B', ['B'], () => false)))
const ix = buildPageIndex([{id:'1',title:'P',path:'p.md'},{id:'2',title:'Dup',path:'a.md'},{id:'3',title:'Dup',path:'b.md'}])
console.log('resolve empty:', JSON.stringify(ix.resolve('')))
console.log('md example.com:', JSON.stringify(resolveMdTarget(ix, 'example.com')), 'mailto:', JSON.stringify(resolveMdTarget(ix, 'mailto:a@b.co')), 'ftp:', JSON.stringify(resolveMdTarget(ix, 'ftp://x.com')))
console.log('md ambiguous:', JSON.stringify(resolveMdTarget(ix, 'Dup')))
console.log('pasteAs [[T#H]]:', JSON.stringify(pasteAsTarget('[[T#H]]')), ' [x](example.com):', JSON.stringify(pasteAsTarget('[x](example.com)')))
const hd = 'x `[[A`]] y'; const c = hd.indexOf(']]')
console.log('headingHash half-in-code:', JSON.stringify(headingHash(scanDoc(hd), c, c, '§')))
console.log('readLink [[#H]]:', JSON.stringify(readLink('[[#H]]')))
