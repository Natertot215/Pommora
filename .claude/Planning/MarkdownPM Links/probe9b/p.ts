const R = '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core'
const { linkValueFromEdit, linkEditText, linkValueFromRename, linkMarkdown, linkDisplayText, linkPaste } = await import(R + '/Connections/linkValue')
const { valueClickIntent } = await import(R + '/Properties/Pickers/valueClick')
const { connectionMenuModel } = await import(R + '/Actions/connectionMenu')
const { cellMenuModel } = await import(R + '/Actions/cellMenu')
const J = (x: unknown) => JSON.stringify(x)
const resolve = (t: string) => (['old', 'new', 'meeting notes'].includes(t.toLowerCase()) ? t[0].toUpperCase() + t.slice(1) : null)
console.log('--- Edit field seed (linkEditText)')
for (const v of ['[[Old|a]]', '[[Old#H|a]]', '[x](https://a.com)', 'https://a.com', '[[Old]]']) console.log(J(v), '->', J(linkEditText(v)))
console.log('--- commit (typed, current) today')
const cases: [string, string][] = [
  ['[[New|a]]', '[[Old|a]]'], ['[[New]]', '[[Old|a]]'], ['New', '[[Old|a]]'], ['Meeting Notes', '[[Old]]'],
  ['https://b.com', '[x](https://a.com)'], ['[[New]]', '[x](https://a.com)'], ['New', '[x](https://a.com)'],
  ['https://b.com', '[[Old|a]]'], ['[y](https://b.com)', '[x](https://a.com)'], ['b.com', '[x](https://a.com)'],
  ['Old#H', '[[Old]]'], ['[[Old#H]]', '[[Old|a]]'],
]
for (const [t, c] of cases) console.log(J(t), 'on', J(c), '=>', J(linkValueFromEdit(t, c, resolve)))
console.log('--- rename')
for (const [t, c] of [['', '[x](https://a.com)'], ['z', 'https://a.com'], ['', '[[Old|a]]']] as [string,string][]) console.log(J(t), 'on', J(c), '=>', J(linkValueFromRename(t, c)))
console.log('--- Format writes (linkMarkdown)')
for (const d of ['link-full', 'link-short', 'link-title'] as const) console.log(d, J(linkMarkdown('https://www.a.com/x', d)), J(linkPaste('https://www.a.com/x', d)))
console.log('display of [a.com](https://a.com) under link-title:', J(linkDisplayText('[a.com](https://a.com)', 'link-title', 'Title')))
console.log('--- click intents')
for (const v of ['https://a.com', '[x](https://a.com)', '[[Old]]', '[x](Old)', 'TBD', '']) console.log(J(v), J(valueClickIntent('link', v ? { kind: 'link', value: v } : { kind: 'null' } as any)))
console.log('--- menus today')
const lab = (m: any[]) => m.map((i) => i.separator ? '|' : i.label + (i.submenu ? '>' : '')).join(', ')
console.log('url editor', lab(connectionMenuModel({ surface: 'editor', editable: true, hasAlias: false, external: true })))
console.log('url cell  ', lab(connectionMenuModel({ surface: 'cell', editable: true, hasAlias: true, external: true, hideable: true })))
console.log('page editor', lab(connectionMenuModel({ surface: 'editor', editable: true, hasAlias: false, open: 'closed' })))
console.log('page cell', lab(connectionMenuModel({ surface: 'cell', editable: true, hasAlias: true, open: 'closed', hideable: true })))
console.log('fallback link', lab(cellMenuModel({ kind: 'link', filled: true, hideable: true })))
