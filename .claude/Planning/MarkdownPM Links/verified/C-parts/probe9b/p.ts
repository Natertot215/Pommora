const R = '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core'
const { rewriteConnections, rewriteFrontmatterConnections } = await import(R + '/Connections/rewrite')
const { readLink, linkValueFromEdit, linkValueFromRename, linkEditText, linkDisplayText } = await import(R + '/Connections/linkValue')
const { MD_LINK, targetTitle, targetFragment, unescapeAlias } = await import(R + '/Connections/links')
const { parseConnectionText } = await import(R + '/Connections/connections')
const { namesGonePage, reconcilePropertyValue, decodeValue } = await import(R + '/Properties/propertyValue')
const { isValidLink } = await import(R + '/Paths/urlPath')
const { tokenize } = await import(R + '/MarkdownPM/Engine/tokens')
const J = (x: unknown) => JSON.stringify(x)
const linkDef = { id: 'p1', name: 'Ref', type: 'link' } as never
const frozen = { holds: (t: string) => t.toLowerCase() === 'kept' }

console.log('--- M: nested yaml on frozen restore: namesGonePage(raw) vs reconcile(decoded)')
for (const raw of ['[[Gone]]', [['Gone']], '[[Kept]]', [['Kept']]])
  console.log(J(raw), 'namesGonePage(raw)=', namesGonePage(raw, frozen), 'reconcile=', J(reconcilePropertyValue(linkDef, raw, frozen)), 'String(raw)=', J(String(raw)))

console.log('--- P-23 label carry today: current [[Old|a]] / [x](https://a.com)')
const resolve = (t: string) => (['old', 'other', 'page'].includes(t.toLowerCase()) ? t[0].toUpperCase() + t.slice(1).toLowerCase() : null)
for (const [typed, cur] of [['[[Other]]', '[[Old|a]]'], ['https://b.com', '[[Old|a]]'], ['https://b.com', '[x](https://a.com)'], ['[[Other]]', '[x](https://a.com)'], ['Other', '[[Old|a]]']])
  console.log(J(typed), 'cur', J(cur), '=>', J(linkValueFromEdit(typed, cur, resolve)))

console.log('--- P-21 simulated readLink markdown page arm (resolver-free)')
const readLinkP21 = (raw: string) => {
  const conn = parseConnectionText(raw)
  if (conn) return { kind: 'page', ...conn }
  const s = raw.trim()
  const m = MD_LINK.exec(s)
  if (!m) return { kind: 'url', url: s }
  const alias = unescapeAlias(m[1]).trim() || undefined
  const title = targetTitle(m[2])
  return title === null ? { kind: 'url', url: m[2], alias } : { kind: 'page', title, heading: targetFragment(m[2]) || undefined, alias }
}
const namesGoneP21 = (raw: string) => { const p = readLinkP21(raw); return p.kind === 'page' && !!(p as { title: string }).title && !frozen.holds((p as { title: string }).title) }
for (const v of ['[x](example.com)', '[x](www.google.com)', '[Doc](Notes.md)', '[x](Kept)', '[x](https://a.com)', 'example.com', '[x](#H)'])
  console.log(J(v), J(readLinkP21(v)), 'namesGone(P-21)=', namesGoneP21(v), 'isValidLink(dest)=', isValidLink(MD_LINK.exec(v)?.[2] ?? v))

console.log('--- renderer readers on [x](example.com) today vs what P-21 readLink feeds them')
const v = '[x](example.com)'
console.log('today readLink', J(readLink(v)), 'linkEditText', J(linkEditText(v)), 'rename y', J(linkValueFromRename('y', v)), 'display', J(linkDisplayText(v)))
console.log('[](example.com) display today', J(linkDisplayText('[](example.com)', 'link-short')), '| [](Notes.md) display today', J(linkDisplayText('[](Notes.md)')))

console.log('--- T-01 / P-22 relabel: body rewrite on stripped values')
for (const s of ['[x](Old)', '[[Old|Old 2]]', '[[old]]', '[x](Old#H)'])
  console.log(J(s), 'body', J(rewriteConnections(s, 'Old', 'Old 2')), 'fm', J(rewriteFrontmatterConnections({ k: s }, 'Old', { title: 'Old 2' }).k ?? s))
console.log('was===landed body:', J(rewriteConnections('[[old]]', 'Old', 'Old')))

console.log('--- whole-value tokens (valueTarget via tokenTarget?)')
for (const s of ['[[Old|a]]', '[[#H]]', '[x](example.com)', '[x](https://a.com)', 'https://a.com', 'see [[Old]] too', '[[Nope]]', '[^1](https://a.com)', '[a](b) [c](d)'])
  console.log(J(s), J(tokenize(s).filter((t) => t.kind === 'link' || t.kind === 'wikiLink').map((t) => [t.kind, t.range])))
console.log('[a](b) [c](d) readLink:', J(readLink('[a](b) [c](d)')), 'decode text value [[x]] nested:', J(decodeValue({ id: 't', name: 'T', type: 'text' } as never, [['Old']])))
