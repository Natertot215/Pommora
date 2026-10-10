const R = '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core'
const { tokenize } = await import(R + '/MarkdownPM/Engine/tokens')
const { scanDoc } = await import(R + '/MarkdownPM/Engine/docScan')
const { claimedEmbeds } = await import(R + '/MarkdownPM/Engine/embedClaims')
const { buildPageIndex } = await import(R + '/Connections/pageIndex')
const { linksIn } = await import(R + '/Connections/scan')
const show = (t: string) => {
  const toks = tokenize(t).filter((k: any) => ['embed','wikiLink','link'].includes(k.kind))
  console.log(JSON.stringify(t), '=>', toks.map((k: any) => `${k.kind}[${t.slice(...k.range)}] content=${JSON.stringify(t.slice(...k.contentRange))}${k.resolveRange ? ' resolve=' + JSON.stringify(t.slice(...k.resolveRange)) : ''}${k.fragment ? ' frag=' + JSON.stringify(t.slice(...k.fragment)) : ''} markers=${JSON.stringify(k.markerRanges.map((r: any) => t.slice(...r)))}`).join(' | '))
}
for (const t of ['a ![x](https://a.co) b', '![x](https://a.co)', 'see ![[P]] mid', '![[P]]', '![[P#H]]', '![[P|a]]', '![[#H]]', '![[]]', 'x ![[P#H]] y', '![[P\\|a]]', '[[P|a]]', '!![[P]]', '![[P]]]'])
  show(t)
const idx = buildPageIndex([{ id: '1', title: 'P', path: 'P.md' }, { id: '2', title: 'Q', path: 'Q.md' }, { id: '3', title: 'Q', path: 'q2/Q.md' }])
const doc = ['![[P]]', 'text ![[P]] mid', '![[P]]', '![[Missing]]', '![[Q]]', '![[P#H]]', '  ![[P]]', '![[P|a]]', '![[P]]   ', '```', '![[P]]', '```'].join('\n')
const scan = scanDoc(doc)
console.log('scan.embeds', JSON.stringify(scan.embeds))
console.log('claimed', JSON.stringify(claimedEmbeds(scan.embeds, (t: string) => idx.resolve(t).status)))
console.log('resolve P#H', JSON.stringify(idx.resolve('P#H')), 'resolve P|a', JSON.stringify(idx.resolve('P|a')), 'resolve empty', JSON.stringify(idx.resolve('')))
console.log('linksIn', JSON.stringify([...linksIn('a ![[P|a]] b ![[P#H]] ![x](P) ![y](https://a.co)')]))
