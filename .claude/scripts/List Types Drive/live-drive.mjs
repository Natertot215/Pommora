import { execFileSync } from 'node:child_process'
import {
  ALT, ask, boxOf, chooseNative, clicks, closePageWindow, closeSettings, createPage, hover, item, launch, META, mouseAt, must, openCollection, openField, openPage, openPane, openSettings, PAGE_VIEW, PANE, PANE_VIEW, pickNative, popNative, press, pressKey, restore, row, SHIFT, shot, sleep, sweep, SWITCH, tally, typeText, until, writeBody,
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
  blockRow: '.mdpm-block-row',
  calloutHead: '.cm-line.md-callout-first',
  caret: '.caret-bar',
  rail: '.md-outline-rail',
  tile: '.mdpm-embed-tile .cm-content',
  tileEditing: '.mdpm-embed-tile.is-editing-tile',
  reader: '.page-window .cm-content',
  glance: '[data-glance] .cm-content',
  link: '.md-connection-resolved',
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
  { name: 'Bulleted', source: '- b1\n- b2', drawn: ['• b1', '• b2'], marker: () => '- ' },
  { name: 'Numbered', source: '1. n1\n2. n2', drawn: ['1. n1', '2. n2'], marker: (n) => `${n}. ` },
  { name: 'Alphabetical', source: 'A. a1\nB. a2', drawn: ['A. a1', 'B. a2'], marker: (n) => `${'ABC'[n - 1]}. ` },
  { name: 'Checklist', source: '- [ ] c1\n- [x] c2', drawn: ['☐ c1', '☑ c2'], marker: () => '- [ ] ' },
  { name: 'Arrowed', source: '→ r1\n→ r2', drawn: ['→ r1', '→ r2'], marker: () => '→ ' },
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
const outliner = (cdp, on) => ask(cdp, 'personalization:set', 'outlinerLines', on)
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
  // An Escape over a selection clears it, and the next one leaves.
  if (await cdp.evaluate(`!!${LIVE_CELL}`)) await pressKey(cdp, 'Escape')
  await until('the cell at rest', () => cdp.evaluate(`!${LIVE_CELL}`))
  await sleep(300)
}
// What a cell shows of `source` at rest and focused, and whether either marks it as `construct`.
async function literal(cdp, source, word, construct) {
  await setBody(cdp, table(inCell(source)))
  const read = (scope) => cdp.evaluate(`({ text: (${scope}).innerText, marked: !!(${scope}).querySelector(${show(construct)}) })`)
  const resting = await read(restingCell(word))
  await enterCell(cdp, word)
  const live = await read(LIVE_CELL)
  await leaveCell(cdp)
  return { held: [resting, live].every((r) => r.text === source && !r.marked), detail: show([resting, live]) }
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
const listPath = (name) => ['Lists', name]
const gripFormat = (rows) => rows?.find((r) => r.label === 'Format')?.submenu
const gripPath = (name) => ['Format', name]
const listChecked = (rows) => checked(listsRows(rows)).map((r) => r.replace(' ✓', ''))

// What a press met and the menu it popped, the detail a failed item prints.
const hitAt = (cdp, { x, y }) =>
  cdp.evaluate(`(() => { const e = document.elementFromPoint(${x}, ${y}); return e && (e.className || e.tagName) + ' ' + JSON.stringify(e.textContent.slice(0, 16)) })()`)
const seen = ({ hit, rows }) => `${hit ?? 'no target'} · ${rows === null ? 'no menu' : show(flat(rows))}`
async function pop(cdp, at, path) {
  const hit = at && (await hitAt(cdp, at))
  const rows = at ? await popNative(cdp, at, 'right') : null
  if (rows !== null) await pickNative(path)
  await sleep(500)
  return { rows, hit }
}
const glyphPick = async (cdp, text, label) => pop(cdp, await boxOf(cdp, glyphOf(text)), label ? [label] : [])
const wordPick = async (cdp, word, path) => pop(cdp, await textAt(cdp, PAGE_TEXT, word), path)
// A page line's grip hangs left of its box, and a cell's sits in the inset left of its glyph.
async function gripAt(cdp, line) {
  await hover(cdp, line, 300)
  return cdp.evaluate(`(() => { const l = ${line}; const r = l.getBoundingClientRect(); const y = r.top + r.height / 2; for (let d = 4; d < 24; d++) if (document.elementFromPoint(r.left - d, y) === l) return { x: r.left - d - 2, y }; return { x: r.left + 10, y } })()`)
}
const gripPick = async (cdp, line, path) => pop(cdp, await gripAt(cdp, line), path)
// A real press on `glyph` carried to `line`'s top or bottom edge, where a drop's boundaries sit.
async function dragTo(cdp, glyph, line, edge, held) {
  const from = await boxOf(cdp, glyph)
  const to = await boxOf(cdp, line)
  await sweep(cdp, from, { x: from.x, y: edge === 'above' ? to.top + 1 : to.bottom - 1 }, { steps: 8, held })
}

const ENTER = (cdp) => pressKey(cdp, 'Enter')
const SHIFT_ENTER = (cdp) => pressKey(cdp, 'Enter', SHIFT)
const TAB = (cdp) => pressKey(cdp, 'Tab')
const SHIFT_TAB = (cdp) => pressKey(cdp, 'Tab', SHIFT)
const BACKSPACE = (cdp) => pressKey(cdp, 'Backspace')
const DELETE = (cdp) => pressKey(cdp, 'Delete')
const type = (text) => async (cdp) => { await typeText(cdp, text); await sleep(300) }
// The app's own paste path, by an event carrying `text`, so the system clipboard stays untouched.
const pasteInto = (view, text) => async (cdp) => {
  await cdp.evaluate(`(() => { const dt = new DataTransfer(); dt.setData('text/plain', ${show(text)}); ${view}.contentDOM.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })) })()`)
  await sleep(500)
}
const paste = (text) => pasteInto(PAGE_VIEW, text)
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
    const { rows } = held === null ? { rows: null } : await gripPick(cdp, grip, gripPath('Numbered'))
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

  const math = await literal(cdp, '$$\nxq\n$$', 'xq', S.math)
  item(1, 'B-11', '`$$` lines read as text, at rest and focused', math.held, math.detail)
  const note = await literal(cdp, '[^1] zz\n[^1]: note', 'zz', `${S.citationRow}, ${S.citationMarker}`)
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

// ── Group 3 — Blank Lines and Numbering ─────────────────────────────────────

async function group3(cdp) {
  await setting(cdp, true)
  const dragged = async (decision, name, seed, from, to, edge, want) => {
    await setBody(cdp, seed)
    await dragTo(cdp, glyphOf(from), lineOf(to), edge)
    const got = await body(cdp)
    if (got !== seed) await pressKey(cdp, 'z', META)
    const undone = await body(cdp)
    item(3, decision, name, got === want && undone === seed, show([got, undone]))
  }

  await dragged('B-10', 'an item drags past its siblings, and one ⌘Z puts it back', '- a\n- b\n- c', 'a', 'c', 'below', '- b\n- c\n- a')
  await dragged('B-10', 'an item drags up over its siblings', '- a\n- b\n- c', 'c', 'a', 'above', '- c\n- a\n- b')
  await dragged('B-10', 'an item carries its children', '- a\n\t- a1\n- b\n- c', 'a', 'b', 'below', '- b\n- a\n\t- a1\n- c')
  await dragged('B-10', 'an item re-nests at the level it lands on', '- a\n- b\n\t- c', 'a', 'c', 'below', '- b\n\t- c\n\t- a')
  await dragged('B-10', 'a nested item rises to the level it lands on, with its children', '- a\n\t- b\n\t\t- c\n- d', 'b', 'd', 'below', '- a\n- d\n- b\n\t- c')
  await dragged('B-10', 'a block directly under an item rides it', '- a\n\tride\n- b', 'a', 'b', 'below', '- b\n- a\n\tride')
  await dragged('F-1 B-6', 'a carried block rides whole, a flush line inside it included', '- a\n\t```\nflush\n\t```\n- b', 'a', 'b', 'below', '- b\n- a\n\t```\nflush\n\t```')
  await dragged('B-5 B-6', "an item's drag leaves an indented paragraph below a blank", '- a\n\n\tpara\n\n- b', 'a', 'b', 'below', '\tpara\n\n- b\n- a')
  await dragged('B-5', 'an item drops into another list across a blank', '- a\n- b\n\n- c\n- d', 'a', 'c', 'below', '- b\n\n- c\n- a\n- d')
  await dragged('B-5 B-10', "an item dropped into a numbered list takes its place in that list's count, and the run it leaves recounts", '1. a\n2. b\n3. c\n\n1. d\n2. e', 'b', 'd', 'below', '1. a\n2. c\n\n1. d\n2. b\n3. e')
  await dragged('B-10', "a list's first item dragged out leaves the rest their numbers, as a deletion does", '1. a\n2. b\n\n1. c', 'a', 'c', 'below', '2. b\n\n1. c\n2. a')
  await dragged('B-10', 'a quoted item drags inside its quote', '> - a\n> - b\n> - c', 'a', 'c', 'below', '> - b\n> - c\n> - a')
  await dragged('B-10', "a callout's item drags inside its callout", '> [!note] head\n> - a\n> - b', 'a', 'b', 'below', '> [!note] head\n> - b\n> - a')
  await dragged('B-10', 'a numbered drag recounts in the same stroke', '1. a\n2. b\n3. c', 'a', 'c', 'below', '1. b\n2. c\n3. a')
  await dragged('B-10', 'a list at 5 keeps 5 through a drag', '5. a\n6. b\n7. c', 'c', 'a', 'above', '5. c\n6. a\n7. b')
  await dragged('F-1', 'a lettered list past Z keeps its head through a drag', 'Y. a\nZ. b\nA. c', 'c', 'a', 'above', 'Y. c\nZ. a\nA. b')
  await dragged('B-10', "a drop on an item's own edge moves nothing", '- a\n- b\n- c', 'a', 'b', 'above', '- a\n- b\n- c')

  await setBody(cdp, '- [ ] a\n- [ ] b')
  const box = await boxOf(cdp, glyphOf('a'))
  await clicks(cdp, box, 1)
  const tapped = await body(cdp)
  await dragged('B-10', 'a press carried off a box drags it unchanged', '- [ ] a\n- [ ] b', 'a', 'b', 'below', '- [ ] b\n- [ ] a')
  item(3, 'B-10', 'a tap on a box checks it', tapped === '- [x] a\n- [ ] b', show(tapped))

  // The edit another pane's mirrored body would land, reaching the view while a press is held.
  const editHeld = () => cdp.evaluate(`(() => { const v = ${PAGE_VIEW}; v.dispatch({ changes: { from: v.state.doc.length, insert: ' Mirrored.' } }) })()`)
  await setBody(cdp, '- a\n- b\n- c')
  await dragTo(cdp, glyphOf('a'), lineOf('c'), 'below', editHeld)
  item(3, 'B-5', "a document edited under a held item's drag voids the drop", (await docOf(cdp)) === '- a\n- b\n- c\n\nTail. Mirrored.', show(await docOf(cdp)))
  await setBody(cdp, '1. a\n\n1. b')
  const staleTop = await boxOf(cdp, lineOf('a'))
  await sweep(cdp, await gripAt(cdp, lineOf('b')), { x: staleTop.x, y: staleTop.top + 1 }, { steps: 8, held: editHeld })
  item(3, 'B-5', "a document edited under a held block's drag voids the drop", (await docOf(cdp)) === '1. a\n\n1. b\n\nTail. Mirrored.', show(await docOf(cdp)))

  await setBody(cdp, table('- ca<br>- cb<br>- cc'))
  await enterCell(cdp, 'ca')
  const cellLine = (text) => `[...${LIVE_CELL}.querySelectorAll(${show(`.cm-line${S.item}`)})].find((l) => l.textContent.includes(${show(text)}))`
  await dragTo(cdp, `(${cellLine('ca')}).querySelector(${show(S.glyph)})`, cellLine('cc'), 'below')
  await leaveCell(cdp)
  item(3, 'B-10', 'an item drags in a live cell', (await body(cdp)).endsWith('| - cb<br>- cc<br>- ca | x |'), show(await body(cdp)))

  await setBody(cdp, '1. a\n\n2. b\n\n3. c')
  const atop = await boxOf(cdp, lineOf('a'))
  await sweep(cdp, await gripAt(cdp, lineOf('c')), { x: atop.x, y: atop.top + 1 }, { steps: 8 })
  item(3, 'B-5', "a block's grip drag leaves `3.`, `1.`, `2.` as drawn, three lists keeping their numbers", (await body(cdp)) === '3. c\n\n1. a\n\n2. b', show(await body(cdp)))

  const keys = (decision, name, seed, past, key, want) => stroke(cdp, 3, decision, name, seed, past, key, want)
  await keys('B-10', 'Enter recounts in the same stroke, and one ⌘Z takes both', '1. a\n2. b', '1. a', ENTER, '1. a\n2. \n3. b')
  await keys('B-10', 'Tab recounts in the same stroke', '1. a\n2. b\n3. c', '2. b', TAB, '1. a\n\t1. b\n2. c')
  await keys('B-10', 'Shift-Tab recounts in the same stroke', '1. a\n\t1. b\n2. c', '\t1. b', SHIFT_TAB, '1. a\n2. b\n3. c')
  await keys('B-5', "Backspace clearing an item's marker splits the list, the lower list keeping its numbers", '1. a\n2. \n3. c', '2. ', BACKSPACE, '1. a\n\n3. c')
  await keys('B-10', 'a list at 5 keeps 5 through Enter', '5. a\n6. b', '5. a', ENTER, '5. a\n6. \n7. b')
  await keys('B-10', 'a list at 5 keeps 5 through Tab', '5. a\n6. b\n7. c', '6. b', TAB, '5. a\n\t1. b\n6. c')
  await keys('F-1', 'a lettered list past Z keeps its head through Enter', 'Y. a\nZ. b\nA. c', 'A. c', ENTER, 'Y. a\nZ. b\nA. c\nB. ')
  await keys('B-5', 'a blank line added inside a list splits it, the lower list keeping its numbers', '1. a\n2. b\n3. c', '1. a\n', ENTER, '1. a\n\n2. b\n3. c')
  await keys('B-5', 'a blank line removed merges the two lists and recounts', '1. a\n\n1. b\n2. c', '1. a\n', BACKSPACE, '1. a\n2. b\n3. c')
  await keys('B-5', "Enter in the upper half counts its own list alone", '1. a\n\n2. b', '1. a', ENTER, '1. a\n2. \n\n2. b')
  await keys('B-5 B-6', 'a blank removed below a block an item carries merges the two lists and recounts', '1. a\n\t```js\n\tx\n\t```\n\n1. b\n2. c', '\t```\n', BACKSPACE, '1. a\n\t```js\n\tx\n\t```\n2. b\n3. c')

  const removed = async (decision, name, seed, line, want, key = BACKSPACE) => {
    await setBody(cdp, seed)
    await select(cdp, line)
    await key(cdp)
    const got = await body(cdp)
    await pressKey(cdp, 'z', META)
    item(3, decision, name, got === want && (await body(cdp)) === seed, show([got, await body(cdp)]))
  }
  await removed('B-10', "a whole line's deletion recounts the run it leaves, and one ⌘Z takes both", '1. a\n2. b\n3. c', '2. b\n', '1. a\n2. c')
  await removed('B-10', 'a list at 5 keeps 5 through a deletion', '5. a\n6. b\n7. c', '6. b\n', '5. a\n6. c')
  await removed('B-10', "deleting a list's first item leaves the rest their numbers", '1. a\n2. b\n3. c', '1. a\n', '2. b\n3. c')
  await removed('B-10', 'typing over a selection across items recounts the run it joins, and one ⌘Z takes both', '1. a\n2. b\n3. c', 'a\n2. ', '1. xb\n2. c', type('x'))

  // A drop swallows the selection it moves past, so the next key acts on a caret and deletes nothing across lines.
  for (const [name, key, want] of [['Enter', ENTER, '- \n- beta word\n- gamma\n- alpha\n- delta'], ['Backspace', BACKSPACE, 'beta word\n- gamma\n- alpha\n- delta']]) {
    await setBody(cdp, '- alpha\n- beta word\n- gamma\n- delta')
    await clicks(cdp, await textAt(cdp, PAGE_TEXT, 'word'), 2, { settle: 400 })
    await dragTo(cdp, glyphOf('alpha'), lineOf('delta'), 'above')
    const dropped = await selection(cdp)
    await key(cdp)
    item(3, 'B-10', `${name} after a glyph dragged past a selected word acts on a caret`, show(dropped) === show([2, 2]) && (await body(cdp)) === want, show([dropped, await body(cdp)]))
  }

  await setBody(cdp, '- a\n- b\n\t```js\n\tx\n\t```\n- c')
  await clicks(cdp, await textAt(cdp, lineOf('b'), 'b'), 3, { settle: 400 })
  await BACKSPACE(cdp)
  item(3, 'B-6', "a triple-click and Backspace on the item above a carried block keeps the block's lead", (await body(cdp)) === '- a\n\t```js\n\tx\n\t```\n- c', show(await body(cdp)))

  const picked = async (decision, name, seed, press, want) => {
    await setBody(cdp, seed)
    const menu = await press()
    const got = await body(cdp)
    if (got !== seed) await pressKey(cdp, 'z', META)
    item(3, decision, name, got === want && (await body(cdp)) === seed, `${seen(menu)} · ${show([got, await body(cdp)])}`)
  }
  await picked('B-10', "a pick recounts in the same stroke, and one ⌘Z takes both", '- a\n- b', () => glyphPick(cdp, 'a', 'Numbered'), '1. a\n2. b')
  await picked('B-5 B-10', 'a keystroke corrects a number elsewhere in its own list', '3. p\n\t1. a\n5. q', () => glyphPick(cdp, 'a', 'Bulleted'), '3. p\n\t- a\n4. q')
  await picked('B-5', 'a pick stops at a blank line', '- a\n- b\n\n- c', () => glyphPick(cdp, 'a', 'Numbered'), '1. a\n2. b\n\n- c')
  await picked('B-6', 'a pick leaves an indented paragraph below a blank', '- a\n\n\tpara', () => glyphPick(cdp, 'a', 'Numbered'), '1. a\n\n\tpara')
  await picked('B-10', 'a line added above a list at 5 restarts it', 'b\n5. a', () => wordPick(cdp, 'b', listPath('Numbered')), '1. b\n2. a')
  await picked('B-5', 'a pick over separated paragraphs lands one-item lists', 'a\n\nb\n\nc', async () => { await select(cdp, 'a', 'c'); return wordPick(cdp, 'c', listPath('Numbered')) }, '1. a\n\n1. b\n\n1. c')

  for (const [name, seed, first] of [['Numbered', '1. a\n3. b', 'a'], ['Bulleted', '- a\n- b', 'a'], ['Alphabetical', 'A. a\nC. b', 'a'], ['Checklist', '- [x] a\n- [ ] b', 'a'], ['Arrowed', '→ a\n→ b', 'a']]) {
    await setBody(cdp, seed)
    const again = await glyphPick(cdp, first, name)
    item(3, 'D-4', `a re-pick of ${name} leaves its items alone`, (await body(cdp)) === seed, `${seen(again)} · ${show(await body(cdp))}`)
  }
  await setBody(cdp, '1. a\n3. b')
  await glyphPick(cdp, 'a', 'Bulleted')
  await glyphPick(cdp, 'a', 'Numbered')
  item(3, 'D-4', 'Bulleted then Numbered repairs a broken list', (await body(cdp)) === '1. a\n2. b', show(await body(cdp)))

  const NESTED = '1. A\n\t1. B\n\t\t1. C\n\t\t2. D\n\t2. E\n2. F'
  for (const on of [true, false]) {
    await setting(cdp, on)
    await setBody(cdp, EXAMPLE)
    await gripPick(cdp, lineOf('A'), gripPath('Numbered'))
    item(3, 'D-2', `the grip changes every item in its block, Preserve ${on ? 'on' : 'off'}`, (await body(cdp)) === NESTED, show(await body(cdp)))
    await setBody(cdp, MIXED)
    const { rows } = await gripPick(cdp, lineOf('A'), [])
    item(3, 'D-2', `a mixed block checks no row in the grip, Preserve ${on ? 'on' : 'off'}`, gripFormat(rows) !== undefined && gripFormat(rows).every((r) => !r.checked), show(flat(gripFormat(rows))))
  }
  await setting(cdp, true)
  await setBody(cdp, EXAMPLE)
  const uniform = await gripPick(cdp, lineOf('A'), [])
  item(3, 'D-2', "a block of one type checks that row in the grip", show(checked(gripFormat(uniform.rows))) === show(['Bulleted ✓']), show(flat(gripFormat(uniform.rows))))
  await picked('D-2', 'Preserve on: a glyph acts on its group', EXAMPLE, () => glyphPick(cdp, 'B', 'Numbered'), '- A\n\t1. B\n\t\t- C\n\t\t- D\n\t2. E\n- F')
  await picked('D-2', 'Preserve on: a caret acts as its glyph does', EXAMPLE, () => wordPick(cdp, 'E', listPath('Numbered')), '- A\n\t1. B\n\t\t- C\n\t\t- D\n\t2. E\n- F')
  await setting(cdp, false)
  await picked('D-2', 'Preserve off: a glyph also reaches what nests under its group', EXAMPLE, () => glyphPick(cdp, 'E', 'Numbered'), '- A\n\t1. B\n\t\t1. C\n\t\t2. D\n\t2. E\n- F')
  await setting(cdp, true)

  await picked('B-5 D-2', "a grip's pick stops at a blank line", '- a\n\n- b', () => gripPick(cdp, lineOf('a'), gripPath('Numbered')), '1. a\n\n- b')
  await picked('B-5', "a grip's Delete stops at a blank line", '- a\n\n- b', () => gripPick(cdp, lineOf('a'), ['Delete']), '\n- b')
  await picked('F-1', "a list block stops at a quote, so a grip's Delete leaves it", '- a\n> - b\n> - c', () => gripPick(cdp, lineOf('a'), ['Delete']), '> - b\n> - c')
  await picked('B-6', "a paragraph indented above a list stays its own block under a grip's Delete", '\tpara\n- a', () => gripPick(cdp, lineOf('a'), ['Delete']), '\tpara')

  await setBody(cdp, table('- ga<br>\t- gb<br>- gc'))
  await enterCell(cdp, 'ga')
  await gripPick(cdp, `${LIVE_CELL}.querySelector(${show(S.grip)})`, gripPath('Numbered'))
  await leaveCell(cdp)
  item(3, 'D-2', "a focused cell's grip changes every item in its block", (await body(cdp)).endsWith('| 1. ga<br>\t1. gb<br>2. gc | x |'), show(await body(cdp)))

  const railsIn = (scope) => cdp.evaluate(`[...(${scope}).querySelectorAll(${show(S.rail)})].map((r) => { const b = r.getBoundingClientRect(); return { left: Math.round(b.left), top: Math.round(b.top), bottom: Math.round(b.bottom) } }).filter((b) => b.bottom > b.top)`)
  const glyphX = (glyph) => boxOf(cdp, glyph).then((b) => b.x)
  const lineBox = (scope, text) => boxOf(cdp, `[...(${scope}).querySelectorAll('.cm-line, [data-cell-line]')].find((l) => l.textContent.includes(${show(text)}))`)
  // Whether the rails below `parent`'s glyph run unbroken from under its line into `last`, and no further.
  const railRuns = async (scope, parent, last) => {
    const rails = (await railsIn(scope)).sort((a, b) => a.top - b.top)
    const head = await lineBox(scope, parent)
    const foot = await lineBox(scope, last)
    const whole = rails.length > 0 && rails.every((r, i) => i === 0 || r.top <= rails[i - 1].bottom + 2)
    return { whole, top: rails[0]?.top, bottom: rails.at(-1)?.bottom, head: head.bottom, lastTop: foot.top, lastBottom: foot.bottom, rails: rails.length }
  }
  const fills = (r) => r.whole && Math.abs(r.top - r.head) <= 12 && r.bottom > r.lastTop && r.bottom <= r.lastBottom

  await outliner(cdp, true)
  const NESTINGS = [
    ['Bulleted', '- ra\n\t- rb\n\t- rc', true],
    ['Checklist', '- [ ] ra\n\t- [ ] rb\n\t- [ ] rc', true],
    ['Alphabetical', 'A. ra\n\tA. rb\n\tB. rc', true],
    ['Numbered', '1. ra\n\t1. rb\n\t2. rc', false],
    ['Arrowed', '→ ra\n\t→ rb\n\t→ rc', false],
  ]
  for (const [name, seed, drawn] of NESTINGS) {
    await setBody(cdp, seed)
    const page = await railRuns(PAGE_TEXT, 'ra', 'rc')
    const x = await glyphX(glyphOf('ra'))
    const left = (await railsIn(PAGE_TEXT))[0]?.left
    item(3, 'B-9', `a page ${drawn ? 'draws a rail under' : 'draws no rail under'} ${name}`, drawn ? fills(page) && Math.abs(left - x) <= 6 : page.rails === 0, show({ page, left, x }))
    await setBody(cdp, table(inCell(seed)))
    const cell = await railRuns(restingCell('rc'), 'ra', 'rc')
    item(3, 'B-9', `a resting cell ${drawn ? 'draws a rail under' : 'draws no rail under'} ${name}`, drawn ? fills(cell) : cell.rails === 0, show(cell))
  }
  await setBody(cdp, NESTINGS[0][1])
  await shot(cdp, 'g3-rails')

  const scene = async (name, decision, seed, parent, last) => {
    await setBody(cdp, seed)
    const r = await railRuns(PAGE_TEXT, parent, last)
    item(3, decision, name, fills(r), show(r))
    return r
  }
  await scene('the rails end at a blank line', 'B-5', '- ra\n\t- rb\n\n\t- rc', 'ra', 'rb')
  await shot(cdp, 'g3-rails-blank')
  await scene('the rails carry through a block an item rides', 'B-5 B-6', '- ra\n\t- rb\n\t```js\n\tcode\n\t```\n\t- rc', 'ra', 'rc')
  await shot(cdp, 'g3-rails-block')
  await scene('the rails carry through a flush line inside a block an item rides', 'F-1', '- ra\n\t- rb\n\t```\nflush\n\t```\n\t- rc', 'ra', 'rc')
  await setBody(cdp, table('- ra<br>\t- rb<br><br>\t- rc'))
  const ended = await railRuns(restingCell('ra'), 'ra', 'rb')
  item(3, 'B-5', 'the rails end at a blank line in a resting cell', fills(ended), show(ended))
  await setBody(cdp, table('- ra<br>\t- rb<br>\tride<br>\t- rc'))
  const carried = await railRuns(restingCell('ra'), 'ra', 'rc')
  item(3, 'B-6', 'the rails carry through a line an item rides in a resting cell', fills(carried), show(carried))
  await shot(cdp, 'g3-rails-cell')

  await outliner(cdp, false)
  await setBody(cdp, NESTINGS[0][1])
  const offPage = await railsIn(PAGE_TEXT)
  await setBody(cdp, table(inCell(NESTINGS[0][1])))
  const offCell = await railsIn(restingCell('rc'))
  item(3, 'B-9', 'Outliner Lines off draws no rail on a page or in a resting cell', offPage.length === 0 && offCell.length === 0, show([offPage, offCell]))
}

// ── Group 4 — Paste ─────────────────────────────────────────────────────────

async function group4(cdp) {
  const pasted = (name, seed, past, text, want) => stroke(cdp, 4, 'F-2', name, seed, past, paste(text), want)
  await pasted("lines pasted into a numbered list recount it, their own numbers not counting, and one ⌘Z takes both", '1. a\n2. b\n3. c', '2. b', '\n9. x\n9. y', '1. a\n2. b\n3. x\n4. y\n5. c')
  await pasted('pasted lines join a list at 5 where they land', '5. a\n6. b', '5. a\n', '1. x\n1. y\n', '5. a\n6. x\n7. y\n8. b')
  await pasted("a one-line paste at an item's start joins its line as text, its edge whitespace left out, and recounts nothing", '5. a\n6. b', '5. a\n', '1. x\n', '5. a\n1. x6. b')
  await pasted('an item pasted into the gap between two lists joins and recounts them', '1. a\n\n3. c\n4. d', '1. a\n', '2. b', '1. a\n2. b\n3. c\n4. d')
  await pasted('a list pasted above a run past 1 takes the pasted start', '5. a\n6. b', '', '9. x\n9. y\n', '9. x\n10. y\n11. a\n12. b')
  await pasted('words pasted inside an item recount nothing, a gapped run included', '1. a\n3. b', '1. a', 'word', '1. aword\n3. b')
  await pasted('a flush line a paste brings ends the list, and the lower list keeps its number', '1. a\n2. b\n3. c', '2. b', ' x\nplain', '1. a\n2. b x\nplain\n3. c')
  await pasted('a paste into a quoted list recounts it', '> 1. a\n> 2. b', '1. a', '\n> 9. x\n> 9. y', '> 1. a\n> 2. x\n> 3. y\n> 4. b')

  const over = (name, seed, from, to, text, want) => stroke(cdp, 4, 'F-2', name, seed, '', async (c) => { await select(c, from, to); await paste(text)(c) }, want)
  await over('a paste over whole lines closes the gap they leave', '1. a\n2. b\n3. c\n4. d', '2. b', '3. c\n', '2. x\n', '1. a\n2. x\n3. d')
  await over('a paste across two items closes the gap they leave', '1. a\n2. b\n3. c\n4. d', 'b', '3. c', 'x', '1. a\n2. x\n3. d')

  await pasted('a paste into a Markdown block recounts its list', fenced('md', '1. a\n2. b'), '1. a', '\n7. x', fenced('md', '1. a\n2. x\n3. b'))
  await pasted('a paste into plain code counts nothing', fenced('js', '1. a\n2. b'), '1. a', '\n7. x', fenced('js', '1. a\n7. x\n2. b'))
  await pasted('a paste into a no-language block counts nothing', fenced('', '1. a\n2. b'), '1. a', '\n7. x', fenced('', '1. a\n7. x\n2. b'))
  await pasted('a paste into display math counts nothing', '$$\n1. a\n2. b\n$$', '1. a', '\n7. x\n7. y', '$$\n1. a\n7. x\n7. y\n2. b\n$$')

  await setBody(cdp, table('1. pa<br>2. pb'))
  await enterCell(cdp, 'pa')
  await cdp.evaluate(`(() => { const v = ${CELL_VIEW}; v.dispatch({ selection: { anchor: v.state.doc.line(1).to } }) })()`)
  await pasteInto(CELL_VIEW, '\n9. px\n9. py')(cdp)
  const cell = await cdp.evaluate(`${CELL_VIEW}.state.doc.toString()`)
  await pressKey(cdp, 'z', META)
  await sleep(300)
  await leaveCell(cdp)
  const undone = await body(cdp)
  item(4, 'F-2', 'a paste into a focused cell recounts its list, and one ⌘Z takes both', cell === '1. pa\n2. px\n3. py\n4. pb' && undone.endsWith('| 1. pa<br>2. pb | x |'), show([cell, undone]))
}

// ── Group 5 — One Marker Grammar ────────────────────────────────────────────

async function group5(cdp) {
  await setting(cdp, true)
  for (const [source, word, drawn, decision] of [
    ['+ x', 'x', ['• x'], 'B-1'],
    ['+ [x] a', 'a', ['☑ a'], 'B-1'],
    ['+ [ ] a', 'a', ['☐ a'], 'B-1'],
    ['- [] x', 'x', ['• [] x'], 'B-1'],
    ['1. [ ] a', 'a', ['1. [ ] a'], 'B-3'],
    ['2. [x] foo', 'foo', ['2. [x] foo'], 'B-3'],
  ]) {
    await setBody(cdp, source)
    const page = await drawnIn(cdp, PAGE_TEXT)
    item(5, decision, `a page draws \`${source}\` as ${show(drawn)}`, show(page) === show(drawn), show(page))
    await setBody(cdp, table(source))
    const resting = await drawnIn(cdp, restingCell(word))
    item(5, decision, `a resting cell draws \`${source}\` as ${show(drawn)}`, show(resting) === show(drawn), show(resting))
    await enterCell(cdp, word)
    const live = await drawnIn(cdp, LIVE_CELL)
    item(5, decision, `a focused cell draws \`${source}\` as ${show(drawn)}`, show(live) === show(drawn), show(live))
    await leaveCell(cdp)
  }

  for (const [source, word, decision] of [['-[] x', 'x', 'B-2'], ['-[ ] x', 'x', 'B-2'], ['-[x] x', 'x', 'B-2'], ['1.[ ] a', 'a', 'B-2'], ['* a', 'a', 'B-1'], ['1) a', 'a', 'B-1']]) {
    await setBody(cdp, source)
    const page = await cdp.evaluate(`(() => { const l = ${PAGE_TEXT}.querySelector('.cm-line'); return { text: l.textContent, item: l.matches(${show(S.item)}) } })()`)
    const cell = await literal(cdp, source, word, S.item)
    item(5, decision, `\`${source}\` reads as plain text on a page, at rest, and focused`, page.text === source && !page.item && cell.held, `${show(page)} · ${cell.detail}`)
  }

  await setBody(cdp, '+ p')
  const onGlyph = await glyphPick(cdp, 'p')
  const onWord = await wordPick(cdp, 'p', [])
  item(5, 'B-1', "a `+` item's glyph menu and Lists ▸ check Bulleted", show(flat(onGlyph.rows)) === show(typeRows('Bulleted')) && show(listChecked(onWord.rows)) === show(['Bulleted']), `${seen(onGlyph)} · ${seen(onWord)}`)
  await setBody(cdp, '- [] p')
  const empty = await glyphPick(cdp, '[] p')
  item(5, 'B-1', "`- [] x`'s glyph menu checks Bulleted", show(flat(empty.rows)) === show(typeRows('Bulleted')), seen(empty))
  await setBody(cdp, table('+ pa<br>+ pb'))
  const atRest = await pop(cdp, await boxOf(cdp, restingGlyph('pa')), [])
  item(5, 'B-1', "a resting `+` item's glyph menu checks Bulleted", show(flat(atRest.rows)) === show(typeRows('Bulleted')), seen(atRest))

  await stroke(cdp, 5, 'B-4', 'Enter under `+ a` writes `-`', '+ a', '+ a', ENTER, '+ a\n- ')
  await stroke(cdp, 5, 'B-4', 'Enter under `+ [ ] a` writes `- [ ] `', '+ [ ] a', '+ [ ] a', ENTER, '+ [ ] a\n- [ ] ')
  await stroke(cdp, 5, 'B-1', 'Enter under `- [] x` continues it', '- [] x', '- [] x', ENTER, '- [] x\n- ')
  await stroke(cdp, 5, 'B-1', 'Enter under `9. a` writes `10. `', '9. a', '9. a', ENTER, '9. a\n10. ')

  const typed = (decision, name, seed, want) => stroke(cdp, 5, decision, name, seed, seed, type(' '), want)
  await typed('B-2', '`-[]` and a space writes a checkbox', '-[]', '- [ ] ')
  await typed('B-2', '`+[]` and a space writes a checkbox with `-`', '+[]', '- [ ] ')
  await typed('B-2', '`-[x]` and a space writes a checked box', '-[x]', '- [x] ')
  await typed('B-2', 'an indented `+[x]` and a space keeps its indent', '  +[x]', '  - [x] ')
  await setBody(cdp, table('sh'))
  await enterCell(cdp, 'sh')
  await cdp.evaluate(`(() => { const v = ${CELL_VIEW}; v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: '+[]' }, selection: { anchor: 3 } }) })()`)
  await sleep(300)
  await type(' ')(cdp)
  const shorthand = await cdp.evaluate(`${CELL_VIEW}.state.doc.toString()`)
  await leaveCell(cdp)
  item(5, 'B-2', 'the shorthand writes `- [ ] ` in a focused cell', shorthand === '- [ ] ', show(shorthand))

  const picked = async (decision, name, seed, word, type, want) => {
    await setBody(cdp, seed)
    const menu = await wordPick(cdp, word, listPath(type))
    const got = await body(cdp)
    item(5, decision, name, got === want, `${seen(menu)} · ${show(got)}`)
  }
  await picked('B-3 F-1', '`2. [x] foo` picked Bulleted writes a checked box', '2. [x] foo', 'foo', 'Bulleted', '- [x] foo')
  await picked('B-3', '`1. [ ] a` picked Bulleted writes a real checkbox', '1. [ ] a', 'a', 'Bulleted', '- [ ] a')
  await picked('B-4', '`+ a` picked Bulleted stays `+ a`', '+ a', 'a', 'Bulleted', '+ a')
  await picked('B-1', '`- [] x` picked Checklist writes `- [ ] [] x`', '- [] x', 'x', 'Checklist', '- [ ] [] x')

  await outliner(cdp, true)
  const railRead = (scope) => cdp.evaluate(`[...(${scope}).querySelectorAll(${show(S.rail)})].filter((r) => r.getBoundingClientRect().height > 0).length`)
  await setBody(cdp, '+ ra\n\t+ rb\n\t+ rc')
  const pageRails = await railRead(PAGE_TEXT)
  await shot(cdp, 'g5-plus-rail')
  await setBody(cdp, table('+ ra<br>\t+ rb<br>\t+ rc'))
  const cellRails = await railRead(restingCell('rc'))
  await outliner(cdp, false)
  item(5, 'B-9', 'a `+` item carries a bullet\'s rail on a page and in a resting cell', pageRails > 0 && cellRails > 0, show([pageRails, cellRails]))

  // What a line draws with the caret at `past`, its marker's own character read as `¤`.
  const drawnAt = async (marker, past) => {
    await setBody(cdp, `zz\n${marker} ww`)
    await caretPast(cdp, past(marker))
    const line = `[...${PAGE_TEXT}.querySelectorAll('.cm-line')][1]`
    return cdp.evaluate(`(() => { const l = ${line}; return { glyph: !!l.querySelector(${show(S.glyph)}), text: l.textContent.replaceAll(${show(marker)}, '¤') } })()`)
  }
  for (const [where, past, glyph] of [['on the marker', (m) => `zz\n${m}`, false], ['on the text', (m) => `${m} w`, true]]) {
    const dash = await drawnAt('-', past)
    const plus = await drawnAt('+', past)
    item(5, 'B-1', `a caret ${where} of a \`+\` item draws as a dash's does, ${glyph ? 'keeping its glyph' : 'revealing its marker'}`, show(plus) === show(dash) && plus.glyph === glyph, show([plus, dash]))
  }
  const seats = async (marker) => {
    await setBody(cdp, `zz\n${marker} ww`)
    await caretPast(cdp, 'zz')
    const heads = []
    for (const key of ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft']) {
      await pressKey(cdp, key)
      heads.push((await selection(cdp))[0])
    }
    return heads
  }
  const dashSeats = await seats('-')
  const plusSeats = await seats('+')
  item(5, 'B-1', "the arrow keys seat a `+` item's caret as a dash's", show(plusSeats) === show(dashSeats) && new Set(plusSeats).size > 2, show([plusSeats, dashSeats]))
}

// ── Group 6 — One Set of List Keys ──────────────────────────────────────────

const docIn = (cdp, view) => cdp.evaluate(`${view}.state.doc.toString()`)
const seatIn = (cdp, view, past) => cdp.evaluate(`(() => { const v = ${view}; v.focus(); v.dispatch({ selection: { anchor: v.state.doc.toString().indexOf(${show(past)}) + ${past.length} } }) })()`)
// `stroke`'s form for a view that outlives its seeds, a focused cell's or a pane's.
const strokeIn = (cdp, group, view) => async (decision, name, seed, past, key, want) => {
  await cdp.evaluate(`(() => { const v = ${view}; v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: ${show(seed)} } }) })()`)
  await seatIn(cdp, view, past)
  await sleep(150)
  await key(cdp)
  const got = await docIn(cdp, view)
  item(group, decision, name, got === want, show(got))
}
// Every key a list claims, for every type, on one surface.
async function typeKeys(cdp, decision, surface, view, run) {
  for (const { name, marker } of TYPES) {
    const [m1, m2, m3] = [marker(1), marker(2), marker(3)]
    const keys = (key, seed, past, press, want) => run(decision, `${surface}, ${name}: ${key}`, seed, past, press, want)
    const two = `${m1}ab\n${m2}cd`
    await keys('Enter at the end', two, `${m1}ab`, ENTER, `${m1}ab\n${m2}\n${m3}cd`)
    await keys('Enter mid-item', two, `${m1}a`, ENTER, `${m1}a\n${m2}b\n${m3}cd`)
    await keys('Enter at the start of the text', two, m1, ENTER, `${m1}\n${m2}ab\n${m3}cd`)
    await keys('Enter on an empty item', `${m1}ab\n${m2}`, `${m1}ab\n${m2}`, ENTER, `${m1}ab\n${m2}\n${m3}`)
    await keys('Tab', two, `${m2}c`, TAB, `${m1}ab\n\t${m1}cd`)
    await keys('Tab at the cap', `${m1}a\n\t${m1}b\n\t\t${m1}c\n\t\t\t${m1}d`, `\t\t\t${m1}d`, TAB, `${m1}a\n\t${m1}b\n\t\t${m1}c\n\t\t\t${m1}d`)
    await keys('Shift-Tab', `${m1}ab\n\t${m1}cd`, `\t${m1}c`, SHIFT_TAB, two)
    await keys('Shift-Tab at the top level', two, `${m2}c`, SHIFT_TAB, two)
    await keys("Backspace at the marker's end", two, `ab\n${m2}`, BACKSPACE, `${m1}ab\ncd`)
    await keys('Backspace inside the marker', two, `ab\n${m2[0]}`, BACKSPACE, `${m1}ab\ncd`)
    await keys("Delete at an item's end joins raw", two, `${m1}ab`, DELETE, `${m1}ab${m2}cd`)
    await keys('Delete inside the text', two, `${m1}a`, DELETE, `${m1}a\n${m2}cd`)
    await keys('Shift-Enter above the last item', two, `${m1}ab`, SHIFT_ENTER, `${m1}ab\n\n${m2}cd`)
    const selectLine = async (c) => { await cdp.evaluate(`(() => { const v = ${view}; const d = v.state.doc.toString(); const a = d.indexOf(${show(`${m2}cd\n`)}); v.dispatch({ selection: { anchor: a, head: a + ${`${m2}cd\n`.length} } }) })()`); await sleep(150); await BACKSPACE(c) }
    await run(decision, `${surface}, ${name}: a whole line's deletion`, `${m1}ab\n${m2}cd\n${m3}ef`, m1, selectLine, `${m1}ab\n${m2}ef`)
  }
  await run(decision, `${surface}: Enter under a checked box writes an open one`, '- [x] ab', '- [x] ab', ENTER, '- [x] ab\n- [ ] ')
  await run(decision, `${surface}: Tab on a middle number recounts the run it leaves`, '1. ab\n2. cd\n3. ef', '2. c', TAB, '1. ab\n\t1. cd\n2. ef')
}

async function group6(cdp) {
  await typeKeys(cdp, 'G-9', 'a page', PAGE_VIEW, (decision, name, seed, past, key, want) => stroke(cdp, 6, decision, name, seed, past, key, want))
  await setBody(cdp, table('zz'))
  await enterCell(cdp, 'zz')
  await typeKeys(cdp, 'G-9', 'a focused cell', CELL_VIEW, strokeIn(cdp, 6, CELL_VIEW))
  await leaveCell(cdp)

  await stroke(cdp, 6, 'G-9', "a page: Shift-Enter on the last item breaks the line", '- ab\n- cd', '- cd', SHIFT_ENTER, '- ab\n- cd\n')
  await setBody(cdp, table('- ab<br>- cd'))
  await enterCell(cdp, 'ab')
  await seatIn(cdp, CELL_VIEW, '- cd')
  await sleep(150)
  await SHIFT_ENTER(cdp)
  await sleep(300)
  const stayed = await cdp.evaluate(`!!${LIVE_CELL}`)
  item(6, 'G-9', "a focused cell: Shift-Enter on the last item leaves the cell, writing nothing", !stayed && (await body(cdp)) === table('- ab<br>- cd'), show([stayed, await body(cdp)]))

  await setBody(cdp, table('1. ab<br>2. cd'))
  await enterCell(cdp, 'ab')
  await seatIn(cdp, CELL_VIEW, '1. ab')
  await sleep(150)
  await ENTER(cdp)
  await sleep(300)
  const stays = await cdp.evaluate(`!!${LIVE_CELL}`)
  const recounted = await docIn(cdp, CELL_VIEW)
  await pressKey(cdp, 'z', META)
  await sleep(300)
  await leaveCell(cdp)
  item(6, 'G-9', "a focused cell's Enter stays in the cell, and one ⌘Z takes its recount", stays && recounted === '1. ab\n2. \n3. cd' && (await body(cdp)) === table('1. ab<br>2. cd'), show([stays, recounted, await body(cdp)]))
}

// ── Group 7 — One Definition Per Type ───────────────────────────────────────

async function group7(cdp) {
  await setting(cdp, true)
  const NAMES = TYPES.map((t) => t.name)
  const blockRows = () => cdp.evaluate(`[...document.querySelectorAll(${show(S.blockRow)})].map((r) => r.textContent.trim())`)

  await setBody(cdp, '')
  await caretAt(cdp, 0)
  await typeText(cdp, '/')
  await sleep(500)
  const offered = await blockRows()
  await pressKey(cdp, 'Escape')
  item(7, 'D-6', 'the / menu lists the five types by their one names', NAMES.every((n) => offered.includes(n)) && !offered.some((r) => / List$/.test(r)), show(offered))
  for (const { name, marker } of TYPES) {
    await setBody(cdp, '')
    await caretAt(cdp, 0)
    await typeText(cdp, `/${name.toLowerCase()}`)
    await sleep(500)
    const rows = await blockRows()
    await ENTER(cdp)
    await sleep(300)
    const got = await body(cdp)
    await pressKey(cdp, 'z', META)
    item(7, 'B-7 D-6', `/${name.toLowerCase()} finds ${name} and writes its marker, and ⌘Z takes it back`, rows.includes(name) && got === marker(1) && (await body(cdp)) === '', show([rows, got, await body(cdp)]))
  }

  const reads = (surface, rows) => {
    item(7, 'D-6', `${surface}: Lists ▸ reads the five names, Bulleted checked`, show(flat(listsRows(rows))) === show(typeRows('Bulleted')), show(flat(listsRows(rows))))
    item(7, 'D-3', `${surface}: Lists ▸ stays beside Format ▸`, flat(rows).includes('Lists ▸') && flat(rows).includes('Format ▸'), show(flat(rows)))
  }
  const grips = (surface, rows) => item(7, 'D-3 D-6', `${surface}: a list grip reads Format ▸, with the five names and no Type ▸`, show(flat(rows)) === show(['Format ▸', '—', 'Delete']) && show(flat(gripFormat(rows))) === show(typeRows('Bulleted')), show([flat(rows), flat(gripFormat(rows))]))

  await setBody(cdp, '- pa\n- pb')
  reads('a page', (await wordPick(cdp, 'pa', [])).rows)
  grips('a page', (await gripPick(cdp, lineOf('pa'), [])).rows)
  const glyph = await glyphPick(cdp, 'pa')
  item(7, 'D-6', 'a glyph reads the five names, Bulleted checked', show(flat(glyph.rows)) === show(typeRows('Bulleted')), seen(glyph))
  await setBody(cdp, table('- pa<br>- pb'))
  reads('a resting cell', (await pop(cdp, await textAt(cdp, restingCell('pa'), 'pa'), [])).rows)
  await setBody(cdp, table('- pa<br>- pb'))
  await enterCell(cdp, 'pa')
  reads('a focused cell', (await pop(cdp, await textAt(cdp, LIVE_CELL, 'pb'), [])).rows)
  grips('a focused cell', (await gripPick(cdp, `${LIVE_CELL}.querySelector(${show(S.grip)})`, [])).rows)
  await leaveCell(cdp)

  for (const from of TYPES) {
    const landed = []
    for (const to of TYPES.filter((t) => t !== from)) {
      await setBody(cdp, `${from.marker(1)}pa\n${from.marker(2)}pb`)
      await glyphPick(cdp, 'pa', to.name)
      landed.push([to.name, (await body(cdp)) === `${to.marker(1)}pa\n${to.marker(2)}pb`, await body(cdp)])
    }
    item(7, 'B-7', `${from.name} picks to every other type, each writing its own markers`, landed.every(([, held]) => held), show(landed.filter(([, held]) => !held)))
  }

  const head = `${PAGE_TEXT}.querySelector(${show(S.calloutHead)})`
  const headReads = () => cdp.evaluate(`(() => { const l = ${head}; return { glyphs: l.querySelectorAll(${show(S.glyph)}).length, items: l.matches(${show(S.item)}), text: l.textContent } })()`)
  for (const marker of ['- ', '+ ', '1. ', 'A. ', '- [ ] ', '→ ']) {
    const seed = `> [!note] ${marker}foo\n> body`
    await setBody(cdp, seed)
    const away = await headReads()
    await caretPast(cdp, `${marker}f`)
    const on = await headReads()
    const plain = (r) => r.glyphs === 0 && !r.items && r.text.includes(`${marker}foo`)
    item(7, 'F-1', `a callout head draws no glyph, its \`${marker.trim()}\` showing as text, with the caret away and on the line`, plain(away) && plain(on), show([away, on]))
  }
  await setBody(cdp, '> [!note] - foo\n> - bar')
  await shot(cdp, 'g7-callout-head')
  const bodyGlyphs = await drawnIn(cdp, PAGE_TEXT)
  item(7, 'F-1', "a callout's body keeps its glyph under a head that draws none", show(bodyGlyphs) === show(['• bar']), show(bodyGlyphs))
  await caretPast(cdp, '- ')
  await sleep(300)
  const seat = await boxOf(cdp, `document.querySelector(${show(S.caret)})`)
  const letter = await textAt(cdp, head, 'foo', 1)
  await shot(cdp, 'g7-callout-caret')
  await typeText(cdp, 'z')
  await sleep(300)
  item(7, 'F-1', 'a caret seated in a head stands at its text, and typing lands there', Math.abs(seat.x - letter.left) <= 3 && (await body(cdp)) === '> [!note] - zfoo\n> - bar', show([seat.x, letter.left, await body(cdp)]))
  await setBody(cdp, '> [!note] - foo\n> - bar')
  await clicks(cdp, await textAt(cdp, head, 'foo', 1), 1, { settle: 300 })
  const pressed = (await selection(cdp))[0]
  item(7, 'F-1', 'a press on a head\'s text seats the caret in that text', pressed >= '> [!note] - '.length && pressed <= '> [!note] - foo'.length, show(pressed))
}

// ── Group 8 — The Word Rule ─────────────────────────────────────────────────

async function group8(cdp) {
  const selected = (view) => cdp.evaluate(`(() => { const v = ${view}; const s = v.state.selection.main; return v.state.sliceDoc(s.from, s.to) })()`)
  const head = (view) => cdp.evaluate(`${view}.state.selection.main.head`)
  const seat = async (view, pos) => {
    await cdp.evaluate(`(() => { const v = ${view}; v.focus(); v.dispatch({ selection: { anchor: ${pos} } }) })()`)
    await sleep(200)
  }
  // Each row presses `press`'s first character, twice, and reads what's selected.
  const WORDS = [
    ["say don't now", 'on', "don't", 'E-5', 'a contraction, from its first half'],
    ["say don't now", 't now', "don't", 'E-5', 'a contraction, from its last letter'],
    ['say don’t now', 'on', 'don’t', 'E-5', 'a curly apostrophe'],
    ["rock'n'roll now", 'ck', "rock'n'roll", 'E-5', 'two apostrophes in one word'],
    ["8'9 now", '8', "8'9", 'E-5', 'digits on both sides'],
    ["students'. now", 'den', 'students', 'E-5', "`students'.`, whose apostrophe closes the word"],
    ["'quoted', now", 'uot', 'quoted', 'E-5', "`'quoted',`, whose quotes stay out"],
    ["a'_b now", 'a', 'a', 'E-5', "`a'_b`, with no letter past its apostrophe"],
    ["say 'don't' now", 'on', "'don't'", 'E-6', "`'don't'`'s outer quotes, the accepted departure"],
    ["'I don't' x", 'on', "don't'", 'E-6', "`'I don't'`'s closing quote, the accepted departure"],
  ]
  for (const [seed, press, want, decision, name] of WORDS) {
    await setBody(cdp, seed)
    await clicks(cdp, await textAt(cdp, PAGE_TEXT, press, 1), 2, { settle: 300 })
    const got = await selected(PAGE_VIEW)
    item(8, decision, `a page's double-click: ${name} selects ${show(want)}`, got === want, show(got))
  }

  // Each row seats the caret at `from`, presses `key` with Option, and reads where the caret lands.
  const GROUPS_MOVED = [
    ["don't stop", 0, 'ArrowRight', 5, 'E-5', 'right across a contraction'],
    ["don't stop", 5, 'ArrowLeft', 0, 'E-5', 'left across a contraction'],
    ["students' don't", 10, 'ArrowLeft', 0, 'E-6', "left from `students' don't`'s gap runs to the word's start, the accepted departure"],
    ["don't 'quoted'", 5, 'ArrowRight', 14, 'E-6', "right from `don't`'s end runs past `'quoted'`, the accepted departure"],
    ["'don't'", 0, 'ArrowRight', 1, 'E-6', 'right from a quote no walk reaches stops past it'],
  ]
  for (const [seed, from, key, want, decision, name] of GROUPS_MOVED) {
    await setBody(cdp, seed)
    await seat(PAGE_VIEW, from)
    await pressKey(cdp, key, ALT)
    const got = await head(PAGE_VIEW)
    item(8, decision, `a page's Option-arrow: ${name}`, got === want, show(got))
  }
  await setBody(cdp, "don't stop")
  await seat(PAGE_VIEW, 5)
  await pressKey(cdp, 'Backspace', ALT)
  item(8, 'E-5', "a page's Option-Backspace takes a contraction whole", (await body(cdp)) === ' stop', show(await body(cdp)))
  await setBody(cdp, "don't stop")
  await wordPick(cdp, "don't", ['Format', 'Bold'])
  item(8, 'E-5', "a page's right-click Bold wraps a contraction whole", (await body(cdp)) === "**don't** stop", show(await body(cdp)))

  await setBody(cdp, table("say don't now"))
  await enterCell(cdp, 'now')
  await clicks(cdp, await textAt(cdp, LIVE_CELL, 'on', 1), 2, { settle: 300 })
  const inCellWord = await selected(CELL_VIEW)
  item(8, 'E-5', "a focused cell's double-click selects a contraction", inCellWord === "don't", show(inCellWord))
  await seat(CELL_VIEW, 4)
  await pressKey(cdp, 'ArrowRight', ALT)
  const right = await head(CELL_VIEW)
  await pressKey(cdp, 'ArrowLeft', ALT)
  const left = await head(CELL_VIEW)
  await leaveCell(cdp)
  item(8, 'E-5', "a focused cell's Option-arrow crosses a contraction both ways", right === 9 && left === 4, show([right, left]))

  for (const [cell, press, want, decision, name] of [
    ["don't stop", 'on', "**don't** stop", 'E-5', 'a contraction'],
    ["'quoted' it", 'uot', "'**quoted**' it", 'E-5', 'a quoted word, its quotes left out'],
    ["say 'don't' now", 'on', "say **'don't'** now", 'E-6', "`'don't'`, the accepted departure"],
  ]) {
    await setBody(cdp, table(cell))
    const menu = await pop(cdp, await textAt(cdp, restingCell(press), press, 1), ['Format', 'Bold'])
    const got = await body(cdp)
    await sleep(200)
    await pressKey(cdp, 'Escape')
    item(8, decision, `a resting cell's right-click word: Bold wraps ${name}`, got.endsWith(`| ${want} | x |`), `${seen(menu)} · ${show(got)}`)
  }

  const JS = fenced('js', "// don't stop")
  await setBody(cdp, JS)
  await clicks(cdp, await textAt(cdp, PAGE_TEXT, 'on', 1), 2, { settle: 300 })
  const fenceWord = await selected(PAGE_VIEW)
  item(8, 'E-5', 'a double-click in a JS fence selects a contraction', fenceWord === "don't", show(fenceWord))
  const start = JS.indexOf("don't")
  await seat(PAGE_VIEW, start)
  await pressKey(cdp, 'ArrowRight', ALT)
  const fenceRight = await head(PAGE_VIEW)
  await pressKey(cdp, 'ArrowLeft', ALT)
  const fenceLeft = await head(PAGE_VIEW)
  item(8, 'E-5', 'Option-arrow in a JS fence crosses a contraction both ways', fenceRight === start + 5 && fenceLeft === start, show([fenceRight, fenceLeft, start]))
  await setBody(cdp, fenced('js', "// $a's end"))
  await clicks(cdp, await textAt(cdp, PAGE_TEXT, "a's", 1), 2, { settle: 300 })
  const dollar = await selected(PAGE_VIEW)
  item(8, 'E-6', "a contraction in JS drops the language's `$` for that gesture, the accepted departure", dollar === "a's", show(dollar))
}

// ── Group 9 — Right-Click ───────────────────────────────────────────────────

async function group9(cdp) {
  await setting(cdp, true)
  const clipboard = execFileSync('pbpaste', { encoding: 'utf8' })
  const setClip = (text) => execFileSync('pbcopy', { input: text })
  const getClip = () => execFileSync('pbpaste', { encoding: 'utf8' })
  try {
    await rightClicks(cdp, setClip, getClip)
  } finally {
    setClip(clipboard)
  }
}

async function rightClicks(cdp, setClip, getClip) {
  const seatRead = () => cdp.evaluate(`CSS.highlights.has('mdpm-seat') ? [...CSS.highlights.get('mdpm-seat')].map(String).join('') : null`)
  const liveMounted = () => cdp.evaluate(`!!${LIVE_CELL}`)
  const pageSelection = () => selection(cdp)
  const pageFocused = () => cdp.evaluate(`document.activeElement === ${PAGE_VIEW}.contentDOM`)
  const atWord = (word, length) => textAt(cdp, restingCell(word), word, length)
  const leftOf = async (expr, dx = 2) => { const b = await boxOf(cdp, expr); return { x: b.left - dx, y: b.y } }

  // E-1: a resting cell's menu.
  const RESTING_ROWS = ['Cut', 'Copy', 'Paste', 'Paste Without Formatting', '—', 'Lists ▸', 'Format ▸', '—', 'Speech ▸', 'Share ▸']
  setClip('held')
  await setBody(cdp, table('plain word here'))
  const menu = await pop(cdp, await atWord('word'), [])
  item(9, 'E-1', "a resting cell's menu holds its edit rows, Lists ▸, and Format ▸, with no Undo, Redo, or Select All", show(flat(menu.rows)) === show(RESTING_ROWS), seen(menu))
  const restingFormat = flat(menu.rows?.find((r) => r.label === 'Format')?.submenu)
  await setBody(cdp, table('plain word here'))
  await enterCell(cdp, 'here')
  const liveMenu = await pop(cdp, await textAt(cdp, LIVE_CELL, 'word'), [])
  await leaveCell(cdp)
  item(9, 'E-1', "a resting cell's Format ▸ reads a live cell's rows", restingFormat.length > 0 && show(restingFormat) === show(flat(liveMenu.rows?.find((r) => r.label === 'Format')?.submenu)), show([restingFormat, flat(liveMenu.rows?.find((r) => r.label === 'Format')?.submenu)]))

  await setBody(cdp, table('plain word here'))
  await pop(cdp, await atWord('word'), ['Format', 'Bold'])
  const after = await pageSelection()
  const end = (await docOf(cdp)).length
  item(9, 'E-1', 'Format ▸ Bold at rest writes in the cell and leaves no caret there', (await body(cdp)) === table('plain **word** here') && !(await liveMounted()) && show(after) === show([end, end]) && (await pageFocused()), show([await body(cdp), await liveMounted(), after, end]))
  await setBody(cdp, table('- a<br>- b'))
  await pop(cdp, await atWord('b'), listPath('Numbered'))
  item(9, 'E-1', "Lists ▸ from an item's text at rest takes a live cell's reach", (await body(cdp)) === table('1. a<br>2. b') && !(await liveMounted()), show(await body(cdp)))
  for (const text of ['- a<br>- b', '1. a<br>2. b', '→ a<br>→ b']) {
    await setBody(cdp, table(text))
    const glyph = await pop(cdp, await boxOf(cdp, restingGlyph('a')), ['Checklist'])
    const picked = await body(cdp)
    await pressKey(cdp, 'z', META)
    await sleep(400)
    item(9, 'E-1', `${show(text)} at rest: the glyph's Checklist commits without entering, and ⌘Z reverts it`, picked === table('- [ ] a<br>- [ ] b') && !(await liveMounted()) && (await body(cdp)) === table(text), `${seen(glyph)} · ${show([picked, await body(cdp)])}`)
  }
  await setBody(cdp, table('> a'))
  await pop(cdp, await atWord('a'), listPath('Bulleted'))
  item(9, 'E-1', "a resting cell's `> a` becomes an item holding the `>`", (await body(cdp)) === table('- > a'), show(await body(cdp)))
  await setBody(cdp, table('ab'))
  const { x: abX, left: abLeft, y: abY } = await atWord('ab')
  await pop(cdp, { x: 2 * abX - abLeft + 12, y: abY }, ['Format', 'Bold'])
  const blankCell = await body(cdp)
  await pressKey(cdp, 'Escape')
  await sleep(400)
  item(9, 'E-1', 'a resting right-click on blank space past the text acts at the point', blankCell === table('ab****'), show(blankCell))

  // E-2: what stands after a resting menu closes.
  const typedAtTail = async (name, close) => {
    await setBody(cdp, table('plain word here'))
    await close()
    const seat = await seatRead()
    await typeText(cdp, 'Q')
    await sleep(300)
    const doc = await docOf(cdp)
    item(9, 'E-2', `typing after ${name} lands at the page's caret`, doc.endsWith('\n\nTail.Q') && seat === null, show([seat, doc]))
  }
  await typedAtTail('a dismissed resting menu', async () => pop(cdp, await atWord('word'), []))
  await typedAtTail('Copy at rest', async () => {
    await pop(cdp, await atWord('word'), ['Copy'])
    item(9, 'E-2', 'Copy at rest copies the seated word', getClip() === 'word', show(getClip()))
  })
  await setBody(cdp, table('- one<br>- two'))
  await pop(cdp, await atWord('one'), listPath('Bulleted'))
  await typeText(cdp, 'Q')
  await sleep(300)
  item(9, 'E-2', "typing after a pick that changes nothing lands at the page's caret", (await docOf(cdp)).endsWith('\n\nTail.Q') && (await body(cdp)).startsWith(table('- one<br>- two')), show(await docOf(cdp)))
  await typedAtTail('an empty paste at rest', async () => {
    setClip('held')
    const rows = await popNative(cdp, await atWord('word'), 'right')
    setClip('')
    await pickNative(['Paste'])
    await sleep(500)
    item(9, 'E-2', 'an empty paste at rest writes nothing', (await docOf(cdp)).startsWith(table('plain word here')) && rows !== null, show(await docOf(cdp)))
  })
  await setBody(cdp, table('plain word here'))
  await select(cdp, 'Tail')
  await pop(cdp, await atWord('word'), [])
  const stood = await cdp.evaluate(`(() => { const v = ${PAGE_VIEW}; const s = v.state.selection.main; return v.state.sliceDoc(s.from, s.to) })()`)
  await typeText(cdp, 'Z')
  await sleep(300)
  item(9, 'E-2', 'a page selection stands through a resting menu, and typing replaces it', stood === 'Tail' && (await docOf(cdp)).endsWith('\n\nZ.'), show([stood, await docOf(cdp)]))
  await setBody(cdp, table('plain word here'))
  await pop(cdp, await atWord('word'), [])
  await mouseAt(cdp, await atWord('word'))
  await until('the cell live', () => liveMounted(), 2000).catch(() => {})
  const entered = await liveMounted()
  if (entered) await leaveCell(cdp)
  item(9, 'E-2', 'one click enters a cell after its menu closed with nothing chosen', entered, show(entered))

  // A cut and a paste at rest.
  setClip('held')
  await setBody(cdp, table('plain word here'))
  await pop(cdp, await atWord('word'), ['Cut'])
  item(9, 'E-1', 'Cut at rest takes the seated word to the clipboard, leaving no caret', (await body(cdp)) === table('plain  here') && getClip() === 'word' && !(await liveMounted()), show([await body(cdp), getClip()]))
  await pressKey(cdp, 'z', META)
  await sleep(400)
  item(9, 'E-1', '⌘Z after a cut at rest puts the word back', (await body(cdp)) === table('plain word here'), show(await body(cdp)))
  setClip('zz')
  await setBody(cdp, table('plain word here'))
  await pop(cdp, await atWord('word'), ['Paste'])
  item(9, 'E-1', 'Paste at rest replaces the seated word', (await body(cdp)) === table('plain zz here') && !(await liveMounted()), show(await body(cdp)))
  setClip('pa\n9. x\n9. y')
  await setBody(cdp, table('1. pa<br>2. pb'))
  await pop(cdp, await atWord('pa'), ['Paste'])
  item(9, 'F-2', 'lines pasted at rest recount the cell', (await body(cdp)) === table('1. pa<br>2. x<br>3. y<br>4. pb'), show(await body(cdp)))
  await setBody(cdp, table('1. a<br>2. b<br>3. c<br>4. d'))
  await cdp.evaluate(`(() => { const nodes = [...(${restingCell('b')}).querySelectorAll(${show(S.text)})].map((e) => e.firstChild); const s = getSelection(); s.setBaseAndExtent(nodes[1], 0, nodes[2], 1) })()`)
  await pop(cdp, await atWord('b'), ['Cut'])
  item(9, 'B-10', 'a cut across lines at rest recounts what follows', (await body(cdp)) === table('1. a<br>2. <br>3. d'), show(await body(cdp)))
  await cdp.evaluate('getSelection().removeAllRanges()')

  // E-3: a seated word's highlight.
  const selectionPaint = () => cdp.evaluate(`(() => { const e = document.createElement('div'); e.style.background = 'var(--text-selection)'; document.body.append(e); const c = getComputedStyle(e).backgroundColor; e.remove(); return c })()`)
  const seatPaint = () => cdp.evaluate(`getComputedStyle(${restingCell('apple')}, '::highlight(mdpm-seat)').backgroundColor`)
  for (const native of [false, true]) {
    await ask(cdp, 'personalization:set', 'nativeHighlight', native)
    await sleep(300)
    await setBody(cdp, table('apple pear'))
    const rows = await popNative(cdp, await atWord('apple'), 'right')
    await sleep(200)
    const seat = await seatRead()
    const paint = await seatPaint()
    const want = await selectionPaint()
    const chromium = await cdp.evaluate('getSelection().toString()')
    await shot(cdp, `g9-seat-native-${native ? 'on' : 'off'}`)
    await pickNative([])
    await sleep(300)
    const cleared = await seatRead()
    await shot(cdp, `g9-seat-cleared-${native ? 'on' : 'off'}`)
    item(9, 'E-3', `a seated word holds its highlight in the selection color, Use Native Highlighting ${native ? 'on' : 'off'}`, rows !== null && seat === 'apple' && paint === want && chromium === '', show([seat, paint, want, chromium]))
    item(9, 'E-2', `the seat's highlight clears on close, Use Native Highlighting ${native ? 'on' : 'off'}`, cleared === null, show(cleared))
  }
  await ask(cdp, 'personalization:set', 'nativeHighlight', false)

  // E-4: read-only surfaces.
  const SHORT = ['Copy', 'Select All']
  const short = (surface, at, seated) => pop(cdp, at, []).then((r) => {
    item(9, 'E-4', `${surface} offers Copy and Select All alone`, show(flat(r.rows)) === show(SHORT) && r.rows[0].enabled === seated, `${seen(r)} · ${show(r.rows?.[0])}`)
    return r
  })
  // Select All from a read-only cell, then ⌘C, read off the system clipboard. The page holds the focus first, since a press on a read-only editor's text would hand that editor the key on its own.
  const copiedAll = async (word) => {
    setClip('held')
    await cdp.evaluate(`${PAGE_VIEW}.focus()`)
    await pop(cdp, await textAt(cdp, restingCell(word), word), ['Select All'])
    await pressKey(cdp, 'c', META, ['copy'])
    await sleep(400)
    return getClip()
  }
  await createPage(cdp, 'LT Target')
  await createPage(cdp, 'LT Embedded')
  writeBody('LT Target', 'target words here\n\n| Ga | Gb |\n| --- | --- |\n| glanceword | y |\n')
  writeBody('LT Embedded', '## Head\n\nplain word here\n\n- ga\n- gb\n\nsee [[LT Target]] now\n\n| Ta | Tb |\n| --- | --- |\n| cellword | y |\n')
  await sleep(800)
  await setBody(cdp, '![[LT Embedded]]')
  const TILE = `document.querySelector(${show(S.tile)})`
  await until('the tile', () => cdp.evaluate(`!!${TILE}?.querySelector(${show(S.glyph)})`))
  await sleep(600)
  await short('an unentered tile', await textAt(cdp, TILE, 'word'), true)
  await short("an unentered tile's glyph, reading as text", await boxOf(cdp, `${TILE}.querySelector(${show(S.glyph)})`), false)
  await short("a read-only table's cell", await textAt(cdp, restingCell('cellword'), 'cellword'), true)
  setClip('held')
  await pop(cdp, await textAt(cdp, TILE, 'word'), ['Copy'])
  item(9, 'E-4', "Copy on an unentered tile copies its seated word", getClip() === 'word', show(getClip()))
  await pop(cdp, await textAt(cdp, TILE, 'word'), ['Select All'])
  const allOf = await cdp.evaluate(`(() => { const v = ${TILE}.cmTile.root.view; const s = v.state.selection.main; return [s.from, s.to, v.state.doc.length] })()`)
  item(9, 'E-4', "Select All on an unentered tile selects that tile's document", allOf[0] === 0 && allOf[1] === allOf[2], show(allOf))
  const tileDoc = () => cdp.evaluate(`${TILE}.cmTile.root.view.state.doc.toString()`)
  const tileCopied = await copiedAll('cellword')
  item(9, 'E-4', "Select All from a read-only table's cell, then ⌘C, copies the tile's document", tileCopied === (await tileDoc()), show(tileCopied))
  const onLink = await pop(cdp, await textAt(cdp, TILE, 'LT Target'), [])
  item(9, 'E-4', "a link's own menu answers first on a read-only surface", flat(onLink.rows).includes('Copy Link') && !flat(onLink.rows).includes('Select All'), seen(onLink))
  const headLine = `[...${TILE}.querySelectorAll('.cm-line')].find((l) => l.textContent.includes('Head'))`
  const onHeading = await gripPick(cdp, headLine, [])
  item(9, 'E-4', "a heading's own menu answers first on a read-only surface", onHeading.rows !== null && !flat(onHeading.rows).includes('Select All') && !flat(onHeading.rows).includes('Delete'), seen(onHeading))

  await mouseAt(cdp, await textAt(cdp, TILE, 'ga'))
  await until('the tile editing', () => cdp.evaluate(`!!document.querySelector(${show(S.tileEditing)})`))
  const seeded = await tileDoc()
  const inTile = await pop(cdp, await boxOf(cdp, `${TILE}.querySelector(${show(S.glyph)})`), ['Numbered'])
  const numbered = await tileDoc()
  await pressKey(cdp, 'z', META)
  await sleep(400)
  item(9, 'E-4', "an editing tile's glyph keeps the type menu, numbers its own group, and ⌘Z takes it back", show(flat(inTile.rows)) === show(typeRows('Bulleted')) && numbered.includes('1. ga\n2. gb') && (await tileDoc()) === seeded, `${seen(inTile)} · ${show(numbered)}`)
  await pressKey(cdp, 'Escape')
  await sleep(400)

  await setBody(cdp, 'plain word here\n\n- ga\n- gb')
  await chooseNative(cdp, `document.querySelector(${show(`[role=tab][title="${TITLE}"]`)})`, 'Preview')
  await until('the reader', () => cdp.evaluate(`!!document.querySelector(${show(S.reader)})`))
  await sleep(800)
  const READER = `document.querySelector(${show(S.reader)})`
  await short('the page reader', await textAt(cdp, READER, 'word'), true)
  await shot(cdp, 'g9-reader')
  await short("the page reader's glyph, reading as text", await boxOf(cdp, `${READER}.querySelector(${show(S.glyph)})`), false)
  await closePageWindow(cdp)

  await setBody(cdp, 'see [[LT Target]] now')
  await hover(cdp, `${PAGE_TEXT}.querySelector(${show(S.link)})`, 1500)
  await until('the glance', () => cdp.evaluate(`!!document.querySelector(${show(S.glance)})`), 5000)
  await sleep(500)
  const GLANCE = `document.querySelector(${show(S.glance)})`
  await short('a glance', await textAt(cdp, GLANCE, 'words'), true)
  const glanceCopied = await copiedAll('glanceword')
  item(9, 'E-4', "Select All from a read-only cell in a glance, then ⌘C, copies the glance's document", glanceCopied === (await cdp.evaluate(`${GLANCE}.cmTile.root.view.state.doc.toString()`)), show(glanceCopied))
  await pressKey(cdp, 'Escape')
  // An Escape over the glance's own selection clears it, and the next one closes the pane.
  if (await cdp.evaluate(`!!${GLANCE}`)) await pressKey(cdp, 'Escape')
  await until('the glance gone', () => cdp.evaluate(`!${GLANCE}`))
  await sleep(400)
  item(9, 'E-4', 'a glance closing after its Select All gives the focus back to the page', await pageFocused(), await cdp.evaluate('document.activeElement?.tagName'))

  // E-7: a press left of a glyph.
  for (const [seed, word, want] of [
    ['- First item here', 'First', '- ****First item here'],
    ['- top\n\t- Nested item here', 'Nested', '- top\n\t- ****Nested item here'],
    ['- [ ] Box item here', 'Box', '- [ ] ****Box item here'],
    ['- [ ] top\n\t- [ ] Nested box here', 'Nested', '- [ ] top\n\t- [ ] ****Nested box here'],
    ['1. numbered one', 'numbered', '1. ****numbered one'],
  ]) {
    const line = `[...${PAGE_TEXT}.querySelectorAll('.cm-line')].find((l) => l.textContent.includes(${show(word)}))`
    for (const [where, at] of [['left of its glyph', () => leftOf(`(${line}).querySelector(${show(S.glyph)})`)], ["at its line's left edge", async () => { const b = await boxOf(cdp, line); return { x: b.left + 1, y: b.y } }]]) {
      await setBody(cdp, seed)
      const press = await pop(cdp, await at(), ['Format', 'Bold'])
      item(9, 'E-7', `a press ${where} writes past the marker: ${show(want)}`, (await body(cdp)) === want, `${seen(press)} · ${show(await body(cdp))}`)
    }
  }
  await setBody(cdp, '> quote here')
  const quoted = await textAt(cdp, PAGE_TEXT, 'quote', 1)
  await pop(cdp, { x: quoted.left - 3, y: quoted.y }, ['Format', 'Bold'])
  item(9, 'E-7', "a press on a quote's prefix writes past it", (await body(cdp)) === '> ****quote here', show(await body(cdp)))
  await setBody(cdp, '- First item here')
  await mouseAt(cdp, await leftOf(glyphOf('First item here')))
  await typeText(cdp, 'X')
  await sleep(300)
  item(9, 'E-7', 'a left press left of a bullet seats at the content', (await body(cdp)) === '- XFirst item here', show(await body(cdp)))

  // Row 44, 45, and 46.
  await setBody(cdp, '[[LT Target|x]] tail word')
  await caretPast(cdp, '|x')
  await BACKSPACE(cdp)
  await wordPick(cdp, 'word', ['Format', 'Bold'])
  await sleep(400)
  item(9, 'E-7', 'Bold on a word lands after a link settles on the same line', (await body(cdp)) === '[[LT Target]] tail **word**', show(await body(cdp)))
  const insertRows = (rows) => flat(rows?.find((r) => r.label === 'Insert')?.submenu)
  await setBody(cdp, '`abc` plain')
  const inCode = await wordPick(cdp, 'abc', [])
  const inProse = await wordPick(cdp, 'plain', [])
  item(9, 'E-7', 'a word ending an inline code span offers no footnote, where prose does', !insertRows(inCode.rows).includes('Footnote') && insertRows(inProse.rows).includes('Footnote'), show([insertRows(inCode.rows), insertRows(inProse.rows)]))
  await setBody(cdp, '_it_ x')
  // The caret inside the mark reveals its `_`, so the press has an outer edge to land on.
  await caretPast(cdp, '_i')
  const edge = await pop(cdp, await textAt(cdp, PAGE_TEXT, '_', 1), [])
  const italic = (edge.rows?.find((r) => r.label === 'Format')?.submenu ?? []).find((r) => r.label === 'Italic')
  item(9, 'D-5', "a right-click on `_it_`'s outer edge checks Italic", italic?.checked === true, `${seen(edge)} · ${show(italic)}`)

  // D-5 and D-2: what a selection reaches.
  const TWO = '- alpha one\n- beta'
  await setBody(cdp, TWO)
  await select(cdp, 'pha')
  await wordPick(cdp, 'pha', listPath('Numbered'))
  item(9, 'D-5', "a selection inside one line acts as a caret, on the item's group", (await body(cdp)) === '1. alpha one\n2. beta', show(await body(cdp)))
  await setBody(cdp, '- word\n- beta')
  await select(cdp, 'word')
  await wordPick(cdp, 'word', listPath('Numbered'))
  item(9, 'D-5', 'a word filling its item counts as inside the line', (await body(cdp)) === '1. word\n2. beta', show(await body(cdp)))
  await setBody(cdp, TWO)
  await select(cdp, '- alpha one')
  await wordPick(cdp, 'pha', listPath('Numbered'))
  item(9, 'D-5', 'a selection holding a whole line narrows to that item', (await body(cdp)) === '1. alpha one\n- beta', show(await body(cdp)))
  await setBody(cdp, TWO)
  await clicks(cdp, await textAt(cdp, PAGE_TEXT, 'alpha'), 3, { settle: 400 })
  await wordPick(cdp, 'alpha', listPath('Numbered'))
  item(9, 'D-5', 'a triple-clicked line narrows to that item', (await body(cdp)) === '1. alpha one\n- beta', show(await body(cdp)))

  const edgeOf = async (word) => { const { left, y } = await textAt(cdp, PAGE_TEXT, word, 1); return { x: left + 1, y } }
  for (const [path, want] of [[['Format', 'Bold'], 'one\n**two** two'], [listPath('Bulleted'), 'one\n- two two']]) {
    await setBody(cdp, 'one\ntwo two')
    await clicks(cdp, await textAt(cdp, PAGE_TEXT, 'one'), 3, { settle: 400 })
    await pop(cdp, await edgeOf('two'), path)
    item(9, 'D-5', `after a triple-clicked line, ${path.join(' ▸ ')} from the next line's first pixel acts on that line`, (await body(cdp)) === want, show(await body(cdp)))
  }
  await setBody(cdp, 'one\ntwo two')
  await sweep(cdp, await edgeOf('one'), await edgeOf('two'), { steps: 6 })
  await wordPick(cdp, 'one', listPath('Numbered'))
  item(9, 'D-5', "a drag-selection ending at the next line's start numbers only its own line", (await body(cdp)) === '1. one\ntwo two', show(await body(cdp)))

  await setBody(cdp, EXAMPLE)
  await select(cdp, 'B', 'E')
  const inside = await glyphPick(cdp, 'C', 'Checklist')
  item(9, 'D-2', "a glyph inside a selection acts on its group", (await body(cdp)) === '- A\n\t- B\n\t\t- [ ] C\n\t\t- [ ] D\n\t- E\n- F', `${seen(inside)} · ${show(await body(cdp))}`)
  await setBody(cdp, EXAMPLE)
  await select(cdp, 'B')
  const outside = await glyphPick(cdp, 'F', 'Numbered')
  item(9, 'D-2', 'a glyph outside the selection acts on its group', (await body(cdp)) === '1. A\n\t- B\n\t\t- C\n\t\t- D\n\t- E\n2. F', `${seen(outside)} · ${show(await body(cdp))}`)
  await setBody(cdp, '1. one\n2. two\n→ arrow')
  for (const text of ['one', 'arrow']) {
    const was = await pageSelection()
    const glyph = await glyphPick(cdp, text)
    item(9, 'E-7', `a right-press on ${text}'s glyph leaves the caret where it stood`, show(await pageSelection()) === show(was), seen(glyph))
  }
  await setBody(cdp, EXAMPLE)
  await caretAt(cdp, 0)
  const revealed = await pop(cdp, await textAt(cdp, lineOf('A'), '-'), listPath('Numbered'))
  item(9, 'E-7', "a revealed marker's Lists ▸ acts as its glyph", (await body(cdp)) === '1. A\n\t- B\n\t\t- C\n\t\t- D\n\t- E\n2. F', `${seen(revealed)} · ${show(await body(cdp))}`)
  await setBody(cdp, 'ab\nlonger line')
  const shortLine = await textAt(cdp, PAGE_TEXT, 'ab')
  await pop(cdp, { x: 2 * shortLine.x - shortLine.left + 40, y: shortLine.y }, ['Format', 'Bold'])
  item(9, 'E-7', 'a right-click on blank space past a short line acts at the point', (await body(cdp)) === 'ab****\nlonger line', show(await body(cdp)))

  // D-1: the setting.
  await openSettings(cdp, 'Pages & Writing')
  const order = await cdp.evaluate(`[...document.querySelectorAll('[role="switch"]')].map((s) => s.getAttribute('aria-label'))`)
  const preserve = SWITCH('Preserve List-Level Formatting')
  const on = await cdp.evaluate(`(${preserve})?.getAttribute('aria-checked') ?? null`)
  item(9, 'D-1', 'Preserve List-Level Formatting sits under Outliner Lines, on', order[order.indexOf('Outliner Lines') + 1] === 'Preserve List-Level Formatting' && on === 'true', show([order, on]))
  await press(cdp, preserve)
  await closeSettings(cdp)
  await setBody(cdp, EXAMPLE)
  await glyphPick(cdp, 'E', 'Numbered')
  item(9, 'D-1', 'turned off in Settings, a pick reaches the nesting without a reload', (await body(cdp)) === '- A\n\t1. B\n\t\t1. C\n\t\t2. D\n\t2. E\n- F', show(await body(cdp)))
  await setting(cdp, true)
}

// ── Group 10 — Text Properties ──────────────────────────────────────────────

async function group10(cdp) {
  await setting(cdp, true)
  const VALUE = 'LT Value'
  const { created } = await must('LT Notes', ask(cdp, 'mutate', { op: 'addProperty', containerPath: 'Collection A', draft: { label: 'LT Notes', type: 'text' } }))
  const notes = created.propertyId
  await must('its column', ask(cdp, 'views:save', 'Collection A', 'collection', { id: VIEW_ID, name: 'LT Table', type: 'table', property_order: ['_title'], hidden_properties: [] }, { property_order: ['_title', notes] }))
  await createPage(cdp, VALUE, { [notes]: { kind: 'text', value: 'plain' } })
  await openCollection(cdp)
  await until('the value row', () => cdp.evaluate(`!!${row(VALUE)}`))
  const value = `${row(VALUE)}.querySelectorAll('.data-cell')[1]`
  await until('the value cell', () => cdp.evaluate(`!!(${value})`))
  const PANE_TEXT = `${PANE_VIEW}.contentDOM`
  const paneUp = () => cdp.evaluate(`!!document.querySelector(${show(PANE)})`)
  const seedPane = async (doc, past = doc) => {
    await cdp.evaluate(`(() => { const v = ${PANE_VIEW}; v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: ${show(doc)} } }) })()`)
    await seatIn(cdp, PANE_VIEW, past)
    await sleep(300)
  }
  const paneDocNow = () => docIn(cdp, PANE_VIEW)
  const paneLine = (text) => `[...${PANE_TEXT}.querySelectorAll('.cm-line')].find((l) => l.textContent.includes(${show(text)}))`
  const paneGlyph = (text) => `(${paneLine(text)}).querySelector(${show(S.glyph)})`

  await openPane(cdp, value)
  await seedPane('', '')
  for (const key of ['-', ' ', 'item']) await type(key)(cdp)
  const typed = await drawnIn(cdp, PANE_TEXT)
  item(10, 'G-2', '`- item` typed on a value\'s first line makes a list', show(typed) === show(['• item']) && (await paneDocNow()) === '- item', show([typed, await paneDocNow()]))
  for (const t of TYPES) {
    await seedPane(t.source)
    const got = await drawnIn(cdp, PANE_TEXT)
    item(10, 'G-1', `the pane draws ${t.name}'s glyphs and text`, show(got) === show(t.drawn), show(got))
  }
  await shot(cdp, 'g10-pane-types')

  const run = strokeIn(cdp, 10, PANE_VIEW)
  await typeKeys(cdp, 'G-10', 'the pane', PANE_VIEW, run)
  await run('G-10', 'Enter breaks a plain line at its end', 'plain', 'plain', ENTER, 'plain\n')
  await run('G-10', 'Enter breaks a plain line in its middle', 'plain', 'pl', ENTER, 'pl\nain')
  await run('G-10', 'Shift-Enter stays a plain break on the last item', '- ab', '- ab', SHIFT_ENTER, '- ab\n')
  await run('G-10', 'Tab on a plain line holds', 'plain', 'plain', TAB, 'plain')
  item(10, 'G-10', 'the keys leave the pane open', await paneUp(), 'closed')
  await seedPane('1. a\n2. b', '1. a')
  await ENTER(cdp)
  const recount = await paneDocNow()
  await pressKey(cdp, 'z', META)
  await sleep(300)
  item(10, 'G-10', 'Enter recounts in the pane, and one ⌘Z takes both', recount === '1. a\n2. \n3. b' && (await paneDocNow()) === '1. a\n2. b', show([recount, await paneDocNow()]))

  await seedPane('', '')
  await typeText(cdp, '/bul')
  await sleep(500)
  const slash = await cdp.evaluate(`!!document.querySelector(${show(S.blockMenu)})`)
  item(10, 'G-10', 'the / menu stays out of the pane', !slash && (await paneDocNow()) === '/bul', show([slash, await paneDocNow()]))

  await seedPane('- pa\n- pb', '- pb')
  const glyph = await pop(cdp, await boxOf(cdp, paneGlyph('pa')), ['Numbered'])
  item(10, 'G-10', "the pane's glyph opens the type menu and acts on its group", show(flat(glyph.rows)) === show(typeRows('Bulleted')) && (await paneDocNow()) === '1. pa\n2. pb', `${seen(glyph)} · ${show(await paneDocNow())}`)
  await seedPane('- pa\n- pb', '- pb')
  const lists = await pop(cdp, await textAt(cdp, PANE_TEXT, 'pa'), listPath('Checklist'))
  item(10, 'G-1', "the pane's right-click holds Lists ▸ beside Format ▸, Bulleted checked, and its pick writes", show(flat(listsRows(lists.rows))) === show(typeRows('Bulleted')) && flat(lists.rows).includes('Format ▸') && (await paneDocNow()) === '- [ ] pa\n- [ ] pb', `${seen(lists)} · ${show(await paneDocNow())}`)

  await seedPane(EXAMPLE, '- F')
  await pop(cdp, await boxOf(cdp, paneGlyph('B')), ['Numbered'])
  item(10, 'G-10', 'Preserve on: the pane\'s glyph acts on its group', (await paneDocNow()) === '- A\n\t1. B\n\t\t- C\n\t\t- D\n\t2. E\n- F', show(await paneDocNow()))
  await setting(cdp, false)
  await seedPane(EXAMPLE, '- F')
  await pop(cdp, await boxOf(cdp, paneGlyph('E')), ['Numbered'])
  item(10, 'G-10', 'Preserve off: the pane\'s glyph reaches what nests under its group', (await paneDocNow()) === '- A\n\t1. B\n\t\t1. C\n\t\t2. D\n\t2. E\n- F', show(await paneDocNow()))
  await setting(cdp, true)

  await seedPane(EXAMPLE, '- F')
  const handle = `${PANE_TEXT}.querySelector(${show(S.grip)})`
  const grip = await gripPick(cdp, handle, [])
  item(10, 'G-10', "the pane's list grip reads Format ▸ and Delete", show(flat(grip.rows)) === show(['Format ▸', '—', 'Delete']), seen(grip))
  await gripPick(cdp, handle, gripPath('Numbered'))
  item(10, 'G-10', "the pane's grip changes every item in its block", (await paneDocNow()) === '1. A\n\t1. B\n\t\t1. C\n\t\t2. D\n\t2. E\n2. F', show(await paneDocNow()))
  await seedPane('- pa\n- pb\n\nplain', 'plain')
  await gripPick(cdp, handle, ['Delete'])
  item(10, 'G-10', "the pane's grip Delete takes its block", (await paneDocNow()).trim() === 'plain', show(await paneDocNow()))

  await seedPane('- one\n- two\n- three', '- three')
  await dragTo(cdp, paneGlyph('three'), paneLine('one'), 'above')
  item(10, 'G-10', 'a glyph drags in the pane, and the pane stays', (await paneDocNow()) === '- three\n- one\n- two' && (await paneUp()), show(await paneDocNow()))
  await seedPane('1. a\n2. b\n3. c', '3. c')
  await dragTo(cdp, paneGlyph('a'), paneLine('c'), 'below')
  item(10, 'G-10', 'a numbered drag in the pane recounts', (await paneDocNow()) === '1. b\n2. c\n3. a', show(await paneDocNow()))
  await seedPane('- a\n\t- b\nplain\n- c', '- c')
  const blockTop = await boxOf(cdp, paneLine('a'))
  const lastLine = `[...${PANE_TEXT}.querySelectorAll(${show(S.grip)})].at(-1)`
  await sweep(cdp, await gripAt(cdp, lastLine), { x: blockTop.x, y: blockTop.top + 1 }, { steps: 8 })
  item(10, 'G-10', "a grip drags a block in the pane, seating `moveRange`'s blank, and the pane stays", (await paneDocNow()) === '- c\n\n- a\n\t- b\nplain' && (await paneUp()), show(await paneDocNow()))

  const paneRails = () => cdp.evaluate(`[...${PANE_TEXT}.querySelectorAll(${show(S.rail)})].filter((r) => r.getBoundingClientRect().height > 0).length`)
  await seedPane('- ra\n\t- rb\n\t- rc', '- rc')
  const railsOff = await paneRails()
  await outliner(cdp, true)
  await sleep(400)
  const railsOn = await paneRails()
  await shot(cdp, 'g10-pane-rails')
  await outliner(cdp, false)
  item(10, 'G-10', 'rails draw in the pane with Outliner Lines on, and not off', railsOff === 0 && railsOn > 0, show([railsOff, railsOn]))
  await seedPane('plain')
  await pressKey(cdp, 'Escape')
  await until('the pane closed', async () => !(await paneUp()))

  await must('a list value', ask(cdp, 'mutate', { op: 'setProperty', path: `Collection A/Set Alpha/${VALUE}.md`, propertyId: notes, value: { kind: 'text', value: '- milk\n- eggs' } }))
  await sleep(700)
  await openField(cdp, value)
  const plainField = await cdp.evaluate(`(() => { const c = document.querySelector('.value-field .cm-content'); return { text: c.textContent, items: c.querySelectorAll(${show(S.item)}).length, glyphs: c.querySelectorAll(${show(S.glyph)}).length, grips: c.querySelectorAll(${show(S.grip)}).length } })()`)
  await pressKey(cdp, 'Escape')
  item(10, 'G-5', 'the one-line field stays plain, a list value showing its dash', plainField.text === '- milk' && plainField.items === 0 && plainField.glyphs === 0 && plainField.grips === 0, show(plainField))
}

// ── The run ─────────────────────────────────────────────────────────────────

const GROUPS = {
  1: ['One Scan Per Surface', group1],
  2: ['Markdown Code Blocks', group2],
  3: ['Blank Lines and Numbering', group3],
  4: ['Paste', group4],
  5: ['One Marker Grammar', group5],
  6: ['One Set of List Keys', group6],
  7: ['One Definition Per Type', group7],
  8: ['The Word Rule', group8],
  9: ['Right-Click', group9],
  10: ['Text Properties', group10],
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
