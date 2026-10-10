const R = '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core'
const A = '/Users/nathantaichman/The Studio/Projects/Project Pommora/.claude/Planning/MarkdownPM Links/verified/C-parts/probe11b/after'
const before = { conn: await import(R + '/Connections/connections'), scan: await import(R + '/Connections/scan'), rw: await import(R + '/Connections/rewrite'), tok: await import(R + '/MarkdownPM/Engine/tokens') }
const after = { conn: await import(A + '/connections'), scanKeep: await import(A + '/scanKeep'), scan: await import(A + '/scan'), rwKeep: await import(A + '/rewriteKeep'), rw: await import(A + '/rewrite'), tok: await import(A + '/tokens') }
const J = JSON.stringify
const cases = ['![[P]]', '![[P#H|a]]', '!![[P]]', '![[P]]]', '![[]]', 'x ![[P]] y', '![[#H]]', '![[P|a]]', '![[P\\|a]]']
const toks = (tk: any, t: string) => tk.tokenize(t).filter((k: any) => ['embed', 'wikiLink', 'link'].includes(k.kind)).map((k: any) => `${k.kind}[${t.slice(...k.range)}]@${k.range} shown=${J(t.slice(...k.contentRange))}`).join(' | ') || '(none)'
console.log('== tokenize: before || after')
for (const t of cases) console.log(J(t), '::', toks(before.tok, t), '||', toks(after.tok, t))
console.log('== linkAt (after) at every offset')
for (const t of cases) {
  const hits: string[] = []
  for (let i = 0; i <= t.length; i++) { const s = after.conn.linkAt(t, i); hits.push(s ? `${i}:${s.full}` : `${i}:-`) }
  console.log(J(t), hits.join(' '), ' alias@', J(after.conn.aliasSpanAt(t, t.length - 3)))
}
console.log('== parseConnectionText before || after')
for (const t of cases) console.log(J(t), J(before.conn.parseConnectionText(t)), '||', J(after.conn.parseConnectionText(t)))
console.log('== wholeWikiLink logic (after pattern)')
for (const t of cases) { const m = after.conn.pageLinkPattern().exec(t); console.log(J(t), 'index', m?.index, 'whole', m ? m[0] === t : false) }
console.log('== linksIn before || after(loop kept) || after(loop removed)')
const L = (f: any, t: string) => J([...f.linksIn(t, 'Own')].map((h: any) => `${h.syntax}:${h.target}#${h.qualifier}@${h.at}`))
for (const t of [...cases, '![[Own]]']) console.log(J(t), L(before.scan, t), '||', L(after.scanKeep, t), '||', L(after.scan, t))
console.log('== sectionRunsIn §H inside embed: before || after')
const sx = '![[A §Intro]] and §Intro'
console.log(J(sx), J(before.scan.sectionRunsIn(sx, ['Intro'], () => false)), '||', J(after.scan.sectionRunsIn(sx, ['Intro'], () => false)))
console.log('== rewriteConnections Old->New: before || after(passes kept) || after(passes removed)')
for (const t of ['![[Old]]', '![[Old#H]]', '![[Old|a]]', '!![[Old]]', 'x ![[Old]] [[Old]] [y](Old)', '`![[Old]]`', '![[Old\\|a]]'])
  console.log(J(t), J(before.rw.rewriteConnections(t, 'Old', 'New')), '||', J(after.rwKeep.rewriteConnections(t, 'Old', 'New')), '||', J(after.rw.rewriteConnections(t, 'Old', 'New')))
console.log('== rewriteHeadingConnections P#H->Z')
for (const t of ['![[P#H]]', '![[P#H|a]]', 'x ![[P#H]] [[P#H]]'])
  console.log(J(t), J(before.rw.rewriteHeadingConnections(t, 'P', 'H', 'Z')), '||', J(after.rwKeep.rewriteHeadingConnections(t, 'P', 'H', 'Z')), '||', J(after.rw.rewriteHeadingConnections(t, 'P', 'H', 'Z')))
console.log('== E-09 anchored lone grammar')
const lone = new RegExp(`^!(?:${after.conn.pageLinkPattern().source})[ \\t]*$`, 'd')
for (const t of ['![[P]]', '![[P]]  ', '![[P#H]]', '![[P|a]]', '![[]]', '![[#H]]', '  ![[P]]', '![[P]]]', '!![[P]]', '![[P\\|a]]', '![[a]b]]']) {
  const m = lone.exec(t)
  const old = /^!\[\[([^\]\r\n]*)\]\][ \t]*$/.exec(t)?.[1] ?? null
  console.log(J(t), 'old', J(old), 'new', m ? J({ ...m.groups }) + ' indices.page=' + J(m.indices?.groups?.page) : 'null', 'linkSpans', m ? J(before.conn.linkSpans(Object.assign(m, { index: m.index }))) : '-')
}
console.log('flags', lone.flags, 'source has lookbehind?', lone.source.includes('(?<!!)'))
