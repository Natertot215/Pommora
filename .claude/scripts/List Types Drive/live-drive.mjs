import {
  ask, boxOf, createPage, hover, item, launch, META, mouseAt, must, openCollection, openPage, PAGE_VIEW, pickNative, popNative, pressKey, restore, row, SHIFT, shot, sleep, tally, typeText, until,
} from '../drive-harness.mjs'

const PORT = 9413
const show = (v) => JSON.stringify(v)

// ── Selectors ───────────────────────────────────────────────────────────────

const S = {
  item: '.md-list-item',
  glyph: '.md-list-glyph',
  text: '.md-list-text',
  box: '.checkbox',
  boxChecked: '.checkbox-checked',
  grip: '.cm-line.md-block-handle',
  codeOpener: '.cm-line.codeblock-first',
  blockMenu: '.mdpm-block-menu',
  italic: '.md-italic',
  math: '.md-latex',
  citationRow: '.cm-line.md-citation',
  citationMarker: '.md-citation-reference',
  content: '.cm-content',
  liveCell: '.mdpm-tbl-cell-editor',
  restingCell: '.mdpm-tbl-cell-static',
}

// ── The page ────────────────────────────────────────────────────────────────

const TITLE = 'LT Lists'
const VIEW_ID = 'view_01KZLISTTYPESDRIVE000TABLE'
const EXAMPLE = '- A\n\t- B\n\t\t- C\n\t\t- D\n\t- E\n- F'
const MIXED = '- A\n\t- B\n\t\t1. C\n\t\t2. D\n\t- E\n- F'
// Each type's own spelling, and each line as it draws: a glyph, then the item's text, with `☐` and `☑` standing for a box.
const TYPES = [
  { name: 'Bulleted', source: '- b1\n- b2', drawn: ['• b1', '• b2'] },
  { name: 'Numbered', source: '1. n1\n2. n2', drawn: ['1. n1', '2. n2'] },
  { name: 'Alphabetical', source: 'A. a1\nB. a2', drawn: ['A. a1', 'B. a2'] },
  { name: 'Checklist', source: '- [ ] c1\n- [x] c2', drawn: ['☐ c1', '☑ c2'] },
  { name: 'Arrowed', source: '→ r1\n→ r2', drawn: ['→ r1', '→ r2'] },
]
const docOf = (cdp) => cdp.evaluate(`${PAGE_VIEW}.state.doc.toString()`)
async function setBody(cdp, body, tail = '\n\nTail.') {
  await cdp.evaluate(`(() => { const v = ${PAGE_VIEW}; v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: ${JSON.stringify(body + tail)} } }) })()`)
  await sleep(400)
  // The caret rests on the tail, so no glyph is revealed as source.
  await cdp.evaluate(`(() => { const v = ${PAGE_VIEW}; v.focus(); v.dispatch({ selection: { anchor: v.state.doc.length } }) })()`)
  await sleep(300)
}
const body = async (cdp) => (await docOf(cdp)).replace(/\n\nTail\.$/, '')
async function select(cdp, from, to = from) {
  await cdp.evaluate(`(() => { const v = ${PAGE_VIEW}; const d = v.state.doc.toString(); v.focus(); v.dispatch({ selection: { anchor: d.indexOf(${JSON.stringify(from)}), head: d.indexOf(${JSON.stringify(to)}) + ${to.length} } }) })()`)
  await sleep(300)
}
async function caretAt(cdp, pos) {
  await cdp.evaluate(`(() => { const v = ${PAGE_VIEW}; v.focus(); v.dispatch({ selection: { anchor: ${pos} } }) })()`)
  await sleep(300)
}
const caretPast = async (cdp, text) => caretAt(cdp, (await docOf(cdp)).indexOf(text) + text.length)
const selection = (cdp) => cdp.evaluate(`(() => { const s = ${PAGE_VIEW}.state.selection.main; return [s.from, s.to] })()`)
const setting = (cdp, on) => ask(cdp, 'personalization:set', 'preserveListLevels', on)
const fenced = (lang, lines) => `\`\`\`${lang}\n${lines}\n\`\`\``

// ── The table ───────────────────────────────────────────────────────────────

const table = (...cells) => `| Lists | Other |\n| --- | --- |\n${cells.map((c) => `| ${c} | x |`).join('\n')}`
const inCell = (source) => source.replaceAll('\n', '<br>')
const restingCell = (word) => `[...document.querySelectorAll(${show(S.restingCell)})].find((e) => e.textContent.includes(${show(word)}))`
const restingGlyph = (word) => `(${restingCell(word)}).querySelector(${show(S.glyph)})`
const LIVE_CELL = `document.querySelector(${show(S.liveCell)})`
const CELL_VIEW = `${LIVE_CELL}.querySelector(${show(S.content)}).cmTile.root.view`
async function enterCell(cdp, word) {
  await mouseAt(cdp, await textAt(cdp, restingCell(word), word))
  await until('the live cell', () => cdp.evaluate(`!!${LIVE_CELL}`))
}
async function leaveCell(cdp) {
  await pressKey(cdp, 'Escape')
  await until('the cell at rest', () => cdp.evaluate(`!${LIVE_CELL}`))
  await sleep(300)
}

// ── Reads and presses ───────────────────────────────────────────────────────

const lineOf = (text) =>
  `[...document.querySelectorAll(${show(`.cm-line${S.item}`)})].find((e) => !e.closest(${show(S.liveCell)}) && e.querySelector(${show(S.text)})?.textContent.trim() === ${show(text)})`
const glyphOf = (text) => `(${lineOf(text)}).querySelector(${show(S.glyph)})`
// Each list line inside `scope` as TYPES spells it drawn.
const drawnIn = (cdp, scope) =>
  cdp.evaluate(`[...(${scope}).querySelectorAll(${show(S.item)})].map((l) => { const g = l.querySelector(${show(S.glyph)}); const box = g?.querySelector(${show(S.box)}); return (box ? (box.matches(${show(S.boxChecked)}) ? '☑' : '☐') : g?.textContent) + ' ' + l.querySelector(${show(S.text)})?.textContent })`)
const PAGE_TEXT = `${PAGE_VIEW}.contentDOM`
// The center and left edge of `from`'s first occurrence inside `scope`'s text, `length` characters wide, for a press on the text itself.
const textAt = (cdp, scope, from, length = from.length) =>
  cdp.evaluate(`(() => { const w = document.createTreeWalker(${scope}, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const i = n.data.indexOf(${show(from)}); if (i < 0) continue; const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + ${length}); const b = r.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, left: b.left } } return null })()`)
const flat = (rows) => (rows ?? []).map((r) => (r.separator ? '—' : `${r.label}${r.checked ? ' ✓' : ''}${r.submenu ? ' ▸' : ''}`))
const checked = (rows) => flat(rows).filter((r) => r.endsWith(' ✓'))
const typeRows = (current) => TYPES.map(({ name }) => (name === current ? `${name} ✓` : name))
const listsRows = (rows) => (rows ?? []).find((r) => r.label === 'Lists')?.submenu
// A type's Lists ▸ row, by its place in TYPES' order, since its label is group 7's.
const listPath = (name) => (rows) => {
  const row = listsRows(rows)?.[TYPES.findIndex((t) => t.name === name)]
  return row ? ['Lists', row.label] : []
}
const listChecked = (rows) => TYPES.filter((_, i) => listsRows(rows)?.[i]?.checked).map((t) => t.name)

// What a press met and the menu it popped, the detail a failed item prints.
const hitAt = (cdp, { x, y }) =>
  cdp.evaluate(`(() => { const e = document.elementFromPoint(${x}, ${y}); return e && (e.className || e.tagName) + ' ' + JSON.stringify(e.textContent.slice(0, 16)) })()`)
const seen = ({ hit, rows }) => `${hit ?? 'no target'} · ${rows === null ? 'no menu' : show(flat(rows))}`
// `path` is the labels to choose, or a function of the rows that answers them.
async function pop(cdp, at, path) {
  const hit = at && (await hitAt(cdp, at))
  const rows = at ? await popNative(cdp, at, 'right') : null
  if (rows !== null) await pickNative(typeof path === 'function' ? path(rows) : path)
  await sleep(500)
  return { rows, hit }
}
const glyphPick = async (cdp, text, label) => pop(cdp, await boxOf(cdp, glyphOf(text)), label ? [label] : [])
const wordPick = async (cdp, word, path) => pop(cdp, await textAt(cdp, PAGE_TEXT, word), path)
async function gripPick(cdp, line, path) {
  await hover(cdp, line, 300)
  const at = await cdp.evaluate(`(() => { const l = ${line}; const r = l.getBoundingClientRect(); const y = r.top + r.height / 2; for (let d = 4; d < 24; d++) if (document.elementFromPoint(r.left - d, y) === l) return { x: r.left - d - 2, y }; return null })()`)
  return pop(cdp, at, path)
}

const ENTER = (cdp) => pressKey(cdp, 'Enter')
const SHIFT_ENTER = (cdp) => pressKey(cdp, 'Enter', SHIFT)
const TAB = (cdp) => pressKey(cdp, 'Tab')
const SHIFT_TAB = (cdp) => pressKey(cdp, 'Tab', SHIFT)
const BACKSPACE = (cdp) => pressKey(cdp, 'Backspace')
const DELETE = (cdp) => pressKey(cdp, 'Delete')
const type = (text) => async (cdp) => { await typeText(cdp, text); await sleep(300) }
// One stroke's result, asserted against `want`, and ⌘Z asserted back to the seed where the stroke changed the text.
async function stroke(cdp, group, decision, name, seed, past, key, want) {
  await setBody(cdp, seed)
  await caretPast(cdp, past)
  await key(cdp)
  const got = await body(cdp)
  if (got !== seed) await pressKey(cdp, 'z', META)
  const undone = await body(cdp)
  item(group, decision, name, got === want && undone === seed, show([got, undone]))
}

// ── Group 1 — One Scan Per Surface ──────────────────────────────────────────

async function group1(cdp) {
  const drew = (surface, { name, drawn }, got) => item(1, 'B-11', `${surface} draws ${name}'s glyphs and text`, show(got) === show(drawn), show(got))
  const wordOf = ({ drawn }) => drawn[0].split(' ')[1]

  await setBody(cdp, TYPES.map((t) => t.source).join('\n\n'))
  const onPage = await drawnIn(cdp, PAGE_TEXT)
  TYPES.forEach((t, i) => drew('a page', t, onPage.slice(2 * i, 2 * i + 2)))
  await shot(cdp, 'g1-page')

  await setBody(cdp, table(...TYPES.map((t) => inCell(t.source))))
  await shot(cdp, 'g1-resting-cells')
  for (const t of TYPES) drew('a resting cell', t, await drawnIn(cdp, restingCell(wordOf(t))))
  for (const t of TYPES) {
    await enterCell(cdp, wordOf(t))
    drew('a focused cell', t, await drawnIn(cdp, LIVE_CELL))
    await shot(cdp, `g1-focused-${t.name}`)
    await leaveCell(cdp)
  }

  for (const edge of ['```', '$$']) {
    await setBody(cdp, table(`${edge}<br>- fa<br>- fb<br>${edge}`))
    const resting = await drawnIn(cdp, restingCell('fa'))
    item(1, 'B-11', `a resting cell draws the list between ${edge} lines`, show(resting) === show(['• fa', '• fb']), show(resting))
    await enterCell(cdp, 'fa')
    const live = await drawnIn(cdp, LIVE_CELL)
    item(1, 'B-11', `a focused cell draws the list between ${edge} lines`, show(live) === show(['• fa', '• fb']), show(live))
    await shot(cdp, `g1-between-${edge === '$$' ? 'math' : 'fence'}`)
    const grip = `${LIVE_CELL}.querySelector(${show(S.grip)})`
    const held = await cdp.evaluate(`(${grip})?.textContent ?? null`)
    const line = held === null ? null : await boxOf(cdp, grip)
    // Found by the rows it holds, since the submenu's label is group 7's.
    const numbered = (menu) => [menu.find((r) => r.submenu?.some((s) => s.label === 'Numbered'))?.label, 'Numbered']
    const { rows } = await pop(cdp, line && { x: line.left + 10, y: line.y }, numbered)
    await leaveCell(cdp)
    item(1, 'B-11', `the list between ${edge} lines takes a grip, and its Numbered numbers the list alone`, (await body(cdp)).endsWith(`| ${edge}<br>1. fa<br>2. fb<br>${edge} | x |`), `${show(held)} · ${show(flat(rows))} · ${show(await body(cdp))}`)
  }

  await setBody(cdp, table('```<br>pp<br>```'))
  await enterCell(cdp, 'pp')
  await cdp.evaluate(`(() => { const v = ${CELL_VIEW}; v.dispatch({ selection: { anchor: v.state.doc.line(2).to } }) })()`)
  await typeText(cdp, ' ')
  await typeText(cdp, '(')
  await sleep(300)
  await leaveCell(cdp)
  item(1, 'B-11', 'a `(` typed between ``` lines pairs', (await body(cdp)).endsWith('| ```<br>pp ()<br>``` | x |'), show(await body(cdp)))

  await setBody(cdp, table('```<br>*it*<br>```'))
  const italicIn = (scope) => cdp.evaluate(`(${scope}).querySelector(${show(S.italic)})?.textContent ?? null`)
  const restingItalic = await italicIn(restingCell('it'))
  await enterCell(cdp, 'it')
  const liveItalic = await italicIn(LIVE_CELL)
  await leaveCell(cdp)
  item(1, 'B-11', '`*it*` between ``` lines reads italic, at rest and focused', restingItalic === 'it' && liveItalic === 'it', show([restingItalic, liveItalic]))

  // What a cell shows of `source` at rest and focused, and whether either marks it as `construct`.
  const literal = async (source, word, construct) => {
    await setBody(cdp, table(inCell(source)))
    const read = (scope) => cdp.evaluate(`({ text: (${scope}).innerText, marked: !!(${scope}).querySelector(${show(construct)}) })`)
    const resting = await read(restingCell(word))
    await enterCell(cdp, word)
    const live = await read(LIVE_CELL)
    await leaveCell(cdp)
    return { held: [resting, live].every((r) => r.text === source && !r.marked), detail: show([resting, live]) }
  }
  const math = await literal('$$\nxq\n$$', 'xq', S.math)
  item(1, 'B-11', '`$$` lines read as text, at rest and focused', math.held, math.detail)
  const note = await literal('[^1] zz\n[^1]: note', 'zz', `${S.citationRow}, ${S.citationMarker}`)
  item(1, 'B-11', "a cell's `[^1]: note` line binds nothing, at rest and focused", note.held, note.detail)

  await setBody(cdp, '```\n- pa\n```\n\n$$\n- pb\n$$\n\nSee [^1] now.\n\n[^1]: note', '')
  await shot(cdp, 'g1-page-blocks')
  const blocks = await cdp.evaluate(`(() => { const p = ${PAGE_TEXT}; return { math: p.querySelector(${show(S.math)})?.textContent ?? null, rows: p.querySelectorAll(${show(S.citationRow)}).length, markers: p.querySelectorAll(${show(S.citationMarker)}).length } })()`)
  const blockItems = await drawnIn(cdp, PAGE_TEXT)
  item(1, 'B-11', 'on a page the same lines read as their blocks: no item in a code block or math', blockItems.length === 0 && blocks.math === '- pb', show([blockItems, blocks]))
  item(1, 'B-11', 'on a page a `[^1]: note` tail binds its marker', blocks.rows === 1 && blocks.markers === 1, show(blocks))
}

// ── Group 2 — Markdown Code Blocks ──────────────────────────────────────────

async function group2(cdp) {
  await setting(cdp, true)
  const md = (lines) => fenced('md', lines)
  const keys = (decision, name, lines, past, key, want) => stroke(cdp, 2, decision, name, md(lines), past, key, md(want))

  await setBody(cdp, md(TYPES.map((t) => t.source).join('\n')))
  const glyphs = await drawnIn(cdp, PAGE_TEXT)
  item(2, 'C-1', 'a Markdown block draws no glyph for any type', glyphs.length === 0, show(glyphs))
  await shot(cdp, 'g2-markdown-block')

  await keys('C-1', 'Enter continues a bullet', '- a\n- b', '- a', ENTER, '- a\n- \n- b')
  await keys('C-1', 'Enter continues a number and recounts', '1. a\n2. b', '1. a', ENTER, '1. a\n2. \n3. b')
  await keys('C-1', 'Enter continues a letter and recounts', 'A. a\nB. b', 'A. a', ENTER, 'A. a\nB. \nC. b')
  await keys('C-1', 'Enter continues a checkbox unchecked', '- [x] a', '- [x] a', ENTER, '- [x] a\n- [ ] ')
  await keys('C-1', 'Enter continues an arrow', '→ a', '→ a', ENTER, '→ a\n→ ')
  await keys('C-1', 'Enter inside an item splits it', '- ab', '- a', ENTER, '- a\n- b')
  await keys('C-1', 'Enter on an empty item continues, as on a page', '- a\n- ', '- a\n- ', ENTER, '- a\n- \n- ')
  await keys('C-1', 'Enter on `> x` makes a plain line, since a quote is no list', '> x', '> x', ENTER, '> x\n')
  await keys('C-1', 'Shift-Enter breaks to a plain line', '- a', '- a', SHIFT_ENTER, '- a\n')
  await keys('C-1', 'Tab nests a bullet', '- a\n- b', '- b', TAB, '- a\n\t- b')
  await keys('C-1', 'Tab nests a number and recounts', '1. a\n2. b\n3. c', '2. b', TAB, '1. a\n\t1. b\n2. c')
  await keys('C-1', 'Shift-Tab outdents a bullet', '- a\n\t- b', '- b', SHIFT_TAB, '- a\n- b')
  await keys('C-1', 'Shift-Tab outdents a number and recounts', '1. a\n\t1. b\n2. c', '\t1. b', SHIFT_TAB, '1. a\n2. b\n3. c')
  await keys('C-1', 'Tab holds at the nesting cap', '- a\n\t- b\n\t\t- c\n\t\t\t- d', '- d', TAB, '- a\n\t- b\n\t\t- c\n\t\t\t- d')
  await keys('C-1', 'Backspace clears an empty item', '- a\n- ', '- a\n- ', BACKSPACE, '- a\n')
  await keys('C-1', 'Backspace on a nested empty item keeps its indent', '- a\n\t- ', '\t- ', BACKSPACE, '- a\n\t')
  await keys('C-1', 'Backspace inside a marker takes the marker', '12. a', '12', BACKSPACE, 'a')
  await keys('C-1', "Delete at an item's end joins raw, since no glyph hides the marker", '- a\n- b', '- a', DELETE, '- a- b')

  await setBody(cdp, md('1. a\n2. b\n3. c'))
  await select(cdp, '2. b\n')
  await BACKSPACE(cdp)
  const closed = await body(cdp)
  await pressKey(cdp, 'z', META)
  item(2, 'C-1', "a whole line's deletion recounts, and ⌘Z puts it back", closed === md('1. a\n2. c') && (await body(cdp)) === md('1. a\n2. b\n3. c'), show([closed, await body(cdp)]))

  for (const [name, want] of [['Numbered', '1. a\n2. b'], ['Alphabetical', 'A. a\nB. b'], ['Checklist', '- [ ] a\n- [ ] b'], ['Arrowed', '→ a\n→ b']]) {
    await setBody(cdp, md('- a\n- b'))
    const picked = await wordPick(cdp, 'b', listPath(name))
    const got = await body(cdp)
    await pressKey(cdp, 'z', META)
    item(2, 'C-1', `${name} from an item's word in a Markdown block sets its list, Bulleted checked, and ⌘Z puts it back`, got === md(want) && show(listChecked(picked.rows)) === show(['Bulleted']) && (await body(cdp)) === md('- a\n- b'), `${seen(picked)} · ${show([got, await body(cdp)])}`)
  }

  const typed = (decision, name, seed, past, text, want) => stroke(cdp, 2, decision, name, seed, past, type(text), want)
  await typed('C-6', '`-[]` and a space at a line\'s start writes a checkbox', md('-[]'), '-[]', ' ', md('- [ ] '))
  await typed('C-6', '`->` at a line\'s start writes an arrow', md('-'), '-', '>', md('→'))
  await typed('C-6', '`->` past a line\'s start stays literal', md('x -'), 'x -', '>', md('x ->'))
  await typed('C-6', 'a `(` pairs nothing in a Markdown block', md(''), '```md\n', '(', md('('))
  await typed('C-6', '`||` stays literal in a Markdown block', md('|'), '|', '|', md('||'))
  for (const [lang, block] of [['js', fenced('js', '')], ['no language', fenced('', '')]]) {
    const inBlock = (lines) => block.replace('\n\n', `\n${lines}\n`)
    await typed('C-6', `\`-[]\` and a space stays literal in ${lang}`, inBlock('-[]'), '-[]', ' ', inBlock('-[] '))
    await typed('C-6', `\`-[x]\` and a space stays literal in ${lang}`, inBlock('-[x]'), '-[x]', ' ', inBlock('-[x] '))
    await typed('C-6', `\`->\` stays literal in ${lang}`, inBlock('-'), '-', '>', inBlock('->'))
    await typed('C-6', `\`||\` stays literal in ${lang}`, inBlock('|'), '|', '|', inBlock('||'))
    await typed('C-6', `\`‼!\` stays literal in ${lang}`, inBlock('‼'), '‼', '!', inBlock('‼!'))

    await setBody(cdp, inBlock('- foo'))
    const plainGlyphs = await drawnIn(cdp, PAGE_TEXT)
    item(2, 'C-3', `${lang} draws no glyph`, plainGlyphs.length === 0, show(plainGlyphs))
    // Plain code indents as its language does, and JavaScript reads `- foo` as an expression to continue.
    await stroke(cdp, 2, 'C-3', `Enter in ${lang} makes a plain line`, inBlock('- foo\n- bar'), '- foo', ENTER, inBlock(`- foo\n${lang === 'js' ? '  ' : ''}\n- bar`))
    await stroke(cdp, 2, 'C-3', `Enter on \`> x\` in ${lang} makes a plain line`, inBlock('> x'), '> x', ENTER, inBlock('> x\n'))
    await stroke(cdp, 2, 'C-3', `Tab in ${lang} writes nothing`, inBlock('- foo\n- bar'), '- bar', TAB, inBlock('- foo\n- bar'))
    await stroke(cdp, 2, 'C-3', `Backspace past a dash in ${lang} takes one character`, inBlock('- foo'), '- ', BACKSPACE, inBlock('-foo'))

    await setBody(cdp, inBlock('1. a\n2. b\n3. c'))
    await select(cdp, '2. b\n')
    await BACKSPACE(cdp)
    item(2, 'C-3', `a whole line's deletion in ${lang} counts nothing`, (await body(cdp)) === inBlock('1. a\n3. c'), show(await body(cdp)))

    await setBody(cdp, inBlock('- foo'))
    const first = await wordPick(cdp, 'foo', listPath('Numbered'))
    const once = await body(cdp)
    await wordPick(cdp, 'foo', listPath('Numbered'))
    item(2, 'C-5', `a pick in ${lang} writes its marker and checks nothing, and a second stacks`, once === inBlock('1. - foo') && (await body(cdp)) === inBlock('1. 1. - foo') && show(listChecked(first.rows)) === '[]', `${seen(first)} · ${show([once, await body(cdp)])}`)

    await setBody(cdp, inBlock('foo\nbar'))
    await select(cdp, 'foo', 'bar')
    await wordPick(cdp, 'bar', listPath('Numbered'))
    item(2, 'C-5', `a pick over two lines in ${lang} writes on each, with no counting`, (await body(cdp)) === inBlock('1. foo\n1. bar'), show(await body(cdp)))

    await setBody(cdp, inBlock('foo bar'))
    await wordPick(cdp, 'bar', ['Format', 'Bold'])
    item(2, 'C-5', `Format ▸ Bold writes into ${lang}`, (await body(cdp)) === inBlock('foo **bar**'), show(await body(cdp)))
    await setBody(cdp, inBlock('foo bar'))
    await select(cdp, 'bar')
    await pressKey(cdp, 'b', META)
    item(2, 'C-5', `⌘B follows its row in ${lang}`, (await body(cdp)) === inBlock('foo **bar**'), show(await body(cdp)))
    await setBody(cdp, inBlock('foo'))
    await wordPick(cdp, 'foo', ['Heading', 'Heading 2'])
    item(2, 'C-5', `Heading writes \`## \` into ${lang}`, (await body(cdp)) === inBlock('## foo'), show(await body(cdp)))
    await setBody(cdp, inBlock('foo'))
    await wordPick(cdp, 'foo', ['Insert', 'Blockquote'])
    item(2, 'C-7', `Insert ▸ Blockquote writes \`> \` into ${lang}`, (await body(cdp)) === inBlock('> foo'), show(await body(cdp)))

    await setBody(cdp, inBlock(''))
    await caretPast(cdp, block.slice(0, block.indexOf('\n') + 1))
    await typeText(cdp, '/bul')
    await sleep(500)
    item(2, 'C-1', `the / menu stays closed in ${lang}`, !(await cdp.evaluate(`!!document.querySelector(${show(S.blockMenu)})`)), show(await body(cdp)))
  }

  await setBody(cdp, md(''))
  await caretPast(cdp, '```md\n')
  await typeText(cdp, '/bul')
  await sleep(500)
  const closedInMd = !(await cdp.evaluate(`!!document.querySelector(${show(S.blockMenu)})`))
  await setBody(cdp, '')
  await caretAt(cdp, 0)
  await typeText(cdp, '/bul')
  await sleep(500)
  const openOnPage = await cdp.evaluate(`!!document.querySelector(${show(S.blockMenu)})`)
  await pressKey(cdp, 'Escape')
  item(2, 'C-1', 'the / menu stays closed in a Markdown block, and opens on a page', closedInMd && openOnPage, show([closedInMd, openOnPage]))

  for (const lang of ['diff', 'md diff']) {
    const block = (lines) => fenced(lang, lines)
    await setBody(cdp, block('- removed\n+ added'))
    const signed = await drawnIn(cdp, PAGE_TEXT)
    await wordPick(cdp, 'removed', listPath('Numbered'))
    item(2, 'C-4 C-7', `a pick in \`${lang}\` writes after the sign, and nothing draws as a list`, (await body(cdp)) === block('- 1. removed\n+ added') && signed.length === 0, show([signed, await body(cdp)]))
    await setBody(cdp, block('+foo'))
    await wordPick(cdp, 'foo', ['Format', 'Bold'])
    item(2, 'C-7', `Format ▸ Bold in \`${lang}\` keeps the sign`, (await body(cdp)) === block('+**foo**'), show(await body(cdp)))
    await setBody(cdp, block('+foo'))
    await wordPick(cdp, 'foo', ['Heading', 'Heading 2'])
    item(2, 'C-7', `Heading in \`${lang}\` keeps the sign`, (await body(cdp)) === block('+## foo'), show(await body(cdp)))
  }
  for (const lang of ['markdown', 'notes/a.md']) await stroke(cdp, 2, 'C-4', `\`${lang}\` reads as a Markdown block`, fenced(lang, '- a'), '- a', ENTER, fenced(lang, '- a\n- '))
  await stroke(cdp, 2, 'C-1', "a sample's dash lines inside a four-tick Markdown block read as items", '````md\n```js\n- a\n```\n````', '- a', ENTER, '````md\n```js\n- a\n- \n```\n````')

  const OUTSIDE = (one, two, inner = '1. x\n\t2. y') => `${one} a\n\t\`\`\`md\n\t${inner}\n\t\`\`\`\n${two} c`
  await setBody(cdp, OUTSIDE('1.', '2.'))
  const fromGlyph = await glyphPick(cdp, 'a', 'Bulleted')
  item(2, 'C-2', "the surrounding list's glyph steps past the block", (await body(cdp)) === OUTSIDE('-', '-'), `${seen(fromGlyph)} · ${show(await body(cdp))}`)
  await setBody(cdp, OUTSIDE('1.', '2.'))
  await select(cdp, 'a', 'c')
  await wordPick(cdp, 'c', listPath('Checklist'))
  item(2, 'C-2', "a selection crossing the block's edges leaves its lines alone", (await body(cdp)) === OUTSIDE('- [ ]', '- [ ]'), show(await body(cdp)))
  await stroke(cdp, 2, 'C-2', "the surrounding list's numbering steps past the block", OUTSIDE('1.', '2.'), '2. c', ENTER, `${OUTSIDE('1.', '2.')}\n3. `)
  await stroke(cdp, 2, 'C-2', "the block's numbers count on their own", OUTSIDE('1.', '2.'), '1. x', ENTER, OUTSIDE('1.', '2.', '1. x\n\t2. \n\t3. y'))

  await setBody(cdp, `pa\n\n${md('- x')}\n\npb`)
  await select(cdp, 'pa', 'pb')
  await wordPick(cdp, 'pb', listPath('Bulleted'))
  item(2, 'C-2', 'a pick from prose through a Markdown block leaves the block alone', (await body(cdp)) === `- pa\n\n${md('- x')}\n\n- pb`, show(await body(cdp)))
  await setBody(cdp, `pa\n${fenced('js', 'code')}`)
  await select(cdp, 'pa', 'code')
  await wordPick(cdp, 'pa', ['Heading', 'Heading 2'])
  item(2, 'C-5', "Heading from prose into code writes on the lines and leaves the block's delimiter", (await body(cdp)) === `## pa\n${fenced('js', '## code')}`, show(await body(cdp)))

  const gripRows = {}
  for (const lang of ['md', 'js']) {
    await setBody(cdp, fenced(lang, '- a'))
    gripRows[lang] = await gripPick(cdp, `document.querySelector(${show(S.codeOpener)})`, [])
  }
  item(2, 'C-1', "a Markdown block's grip offers what any code block's does", gripRows.md.rows !== null && show(flat(gripRows.md.rows)) === show(flat(gripRows.js.rows)), `${seen(gripRows.md)} · ${seen(gripRows.js)}`)

  await setBody(cdp, '- a\n- b\n| H | I |\n| --- | --- |\n| 1 | 2 |')
  const taken = await gripPick(cdp, lineOf('a'), ['Delete'])
  item(2, 'F-1', "a table's header stays out of a list block, so the grip's Delete takes the list alone", (await body(cdp)) === '| H | I |\n| --- | --- |\n| 1 | 2 |', `${seen(taken)} · ${show(await body(cdp))}`)
}

// ── The run ─────────────────────────────────────────────────────────────────

const GROUPS = {
  1: ['One Scan Per Surface', group1],
  2: ['Markdown Code Blocks', group2],
}
const chosen = process.argv.slice(2).map(Number)
if (chosen.length === 0 || chosen.some((g) => !GROUPS[g])) {
  console.error(`usage: node live-drive.mjs <group…>   (${Object.entries(GROUPS).map(([g, [name]]) => `${g} ${name}`).join(', ')})`)
  process.exit(2)
}

let cdp
try {
  cdp = (await launch(PORT, 'list-types-shots')).cdp
  await must('a table view', ask(cdp, 'views:save', 'Collection A', 'collection', { id: VIEW_ID, name: 'LT Table', type: 'table', property_order: ['_title'], hidden_properties: [] }, {}))
  await must('show it', ask(cdp, 'mutate', { op: 'setActiveView', path: 'Collection A', kind: 'collection', viewId: VIEW_ID }))
  await createPage(cdp, TITLE)
  await openCollection(cdp)
  await until('the page row', () => cdp.evaluate(`!!${row(TITLE)}`))
  await openPage(cdp, TITLE)
  for (const [g, [, run]] of Object.entries(GROUPS)) if (chosen.includes(Number(g))) await run(cdp)
  cdp.close()
} catch (e) {
  item(0, '—', 'the run reached its end', false, String(e?.stack ?? e))
  if (cdp) await shot(cdp, 'failure').catch(() => {})
} finally {
  await restore()
}
tally(['0', ...chosen.map(String)])
