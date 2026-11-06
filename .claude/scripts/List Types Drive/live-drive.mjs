import {
  ask, boxOf, createPage, hover, item, launch, mouseAt, must, openCollection, openPage, PAGE_VIEW, pickNative, popNative, restore, row, shot, sleep, tally, until,
} from '../drive-harness.mjs'

const PORT = 9413
const show = (v) => JSON.stringify(v)

// ── Selectors ───────────────────────────────────────────────────────────────

const S = {
  item: '.md-list-item',
  glyph: '.md-list-glyph',
  text: '.md-list-text',
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
async function setBody(cdp, body) {
  await cdp.evaluate(`(() => { const v = ${PAGE_VIEW}; v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: ${JSON.stringify(`${body}\n\nTail.`)} } }) })()`)
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
async function enterCell(cdp, word) {
  await mouseAt(cdp, await textAt(cdp, restingCell(word), word))
  await until('the live cell', () => cdp.evaluate(`!!${LIVE_CELL}`))
}

// ── Reads and presses ───────────────────────────────────────────────────────

const lineOf = (text) =>
  `[...document.querySelectorAll(${show(`.cm-line${S.item}`)})].find((e) => !e.closest(${show(S.liveCell)}) && e.querySelector(${show(S.text)})?.textContent.trim() === ${show(text)})`
const glyphOf = (text) => `(${lineOf(text)}).querySelector(${show(S.glyph)})`
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

// ── The run ─────────────────────────────────────────────────────────────────

const GROUPS = {}
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
