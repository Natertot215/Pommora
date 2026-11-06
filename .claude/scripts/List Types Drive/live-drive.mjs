import {
  ask, boxOf, createPage, hover, item, launch, mouseAt, must, openCollection, openPage, PAGE_VIEW, pickNative, popNative, pressKey, restore, row, shot, sleep, tally, typeText, until,
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
const selection = (cdp) => cdp.evaluate(`(() => { const s = ${PAGE_VIEW}.state.selection.main; return [s.from, s.to] })()`)
const setting = (cdp, on) => ask(cdp, 'personalization:set', 'preserveListLevels', on)

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
async function gripPick(cdp, text, path) {
  await hover(cdp, lineOf(text), 300)
  const at = await cdp.evaluate(`(() => { const l = ${lineOf(text)}; const r = l.getBoundingClientRect(); const y = r.top + r.height / 2; for (let d = 4; d < 24; d++) if (document.elementFromPoint(r.left - d, y) === l) return { x: r.left - d - 2, y }; return null })()`)
  return pop(cdp, at, path)
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
    const rows = line && (await popNative(cdp, { x: line.left + 10, y: line.y }, 'right'))
    // Found by the rows it holds, since the submenu's label is group 7's.
    const types = rows?.find((r) => r.submenu?.some((s) => s.label === 'Numbered'))
    await pickNative(types ? [types.label, 'Numbered'] : [])
    await sleep(500)
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

// ── The run ─────────────────────────────────────────────────────────────────

const GROUPS = {
  1: ['One Scan Per Surface', group1],
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
