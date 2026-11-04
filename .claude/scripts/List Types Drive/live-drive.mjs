import {
  ask, boxOf, closeSettings, createPage, hover, launch, META, mouseAt, must, openCollection, openPage, openSettings,
  PAGE_VIEW, phasedItem, pickNative, popNative, press, pressKey, restore, row, shot, sleep, SWITCH, tally, typeText, until,
} from '../drive-harness.mjs'

const PORT = 9413
const GROUPS = new Set(process.argv.slice(2).map(Number))
if (GROUPS.size === 0 || [...GROUPS].some((g) => ![1, 2, 3, 4, 5].includes(g))) {
  console.error('usage: node live-drive.mjs <group…>   (1 the glyph menu on a page, 2 a focused cell, 3 a resting cell, 4 Lists ▸ and the grip, 5 the setting)')
  process.exit(2)
}
const item = phasedItem(Number(process.env.POMMORA_LGM_LANDED ?? 0))
const show = (v) => JSON.stringify(v)

// ── The page ────────────────────────────────────────────────────────────────

const TITLE = 'LT Lists'
const VIEW_ID = 'view_01KZLISTTYPESDRIVE000TABLE'
const EXAMPLE = '- A\n\t- B\n\t\t- C\n\t\t- D\n\t- E\n- F'
const MIXED = '- A\n\t- B\n\t\t1. C\n\t\t2. D\n\t- E\n- F'
const TYPES = ['Bulleted', 'Numbered', 'Alphabetical', 'Checklist', 'Arrowed']
const V = PAGE_VIEW
const docOf = (cdp) => cdp.evaluate(`${V}.state.doc.toString()`)
async function setBody(cdp, body) {
  await cdp.evaluate(`(() => { const v = ${V}; v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: ${JSON.stringify(`${body}\n\nTail.`)} } }) })()`)
  await sleep(400)
  // The caret rests on the tail, so no glyph is revealed as source.
  await cdp.evaluate(`(() => { const v = ${V}; v.focus(); v.dispatch({ selection: { anchor: v.state.doc.length } }) })()`)
  await sleep(300)
}
const body = async (cdp) => (await docOf(cdp)).replace(/\n\nTail\.$/, '')
async function select(cdp, from, to = from) {
  await cdp.evaluate(`(() => { const v = ${V}; const d = v.state.doc.toString(); v.focus(); v.dispatch({ selection: { anchor: d.indexOf(${JSON.stringify(from)}), head: d.indexOf(${JSON.stringify(to)}) + ${to.length} } }) })()`)
  await sleep(300)
}
async function caretAt(cdp, pos) {
  await cdp.evaluate(`(() => { const v = ${V}; v.focus(); v.dispatch({ selection: { anchor: ${pos} } }) })()`)
  await sleep(300)
}
const selection = (cdp) => cdp.evaluate(`(() => { const s = ${V}.state.selection.main; return [s.from, s.to] })()`)
const setting = (cdp, on) => ask(cdp, 'personalization:set', 'preserveListLevels', on)
const lineOf = (text) =>
  `[...document.querySelectorAll('.cm-line.md-list-item')].find((e) => !e.closest('.mdpm-tbl-cell-editor') && e.querySelector('.md-list-text')?.textContent.trim() === ${JSON.stringify(text)})`
const glyphOf = (text) => `(${lineOf(text)}).querySelector('.md-list-glyph')`
const PAGE_TEXT = `[...document.querySelectorAll('.cm-content')].find((c) => !c.closest('.text-pane') && !c.closest('[inert]'))`
// The center of `from`'s first occurrence inside `scope`'s text, `length` characters wide, for a right-click on the text itself.
const textAt = (cdp, scope, from, length = from.length) =>
  cdp.evaluate(`(() => { const w = document.createTreeWalker(${scope}, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const i = n.data.indexOf(${JSON.stringify(from)}); if (i < 0) continue; const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + ${length}); const b = r.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 } } return null })()`)
const flat = (rows) => (rows ?? []).map((r) => (r.separator ? '—' : `${r.label}${r.checked ? ' ✓' : ''}${r.submenu ? ' ▸' : ''}`))
const checked = (rows) => flat(rows).filter((r) => r.endsWith(' ✓'))
const typeRows = (current) => TYPES.map((t) => (t === current ? `${t} ✓` : t))
const listsRows = (rows) => (rows ?? []).find((r) => r.label === 'Lists')?.submenu

// What a press met and the menu it popped, printed by every item a later phase owns so its AWAIT shows the target was hit.
const hitAt = (cdp, { x, y }) =>
  cdp.evaluate(`(() => { const e = document.elementFromPoint(${x}, ${y}); return e && (e.className || e.tagName) + ' ' + JSON.stringify(e.textContent.slice(0, 16)) })()`)
const seen = ({ hit, rows }) => `${hit ?? 'no target'} · ${rows === null ? 'no menu' : show(flat(rows))}`
async function pop(cdp, at, path) {
  const hit = at && (await hitAt(cdp, at))
  const rows = at ? await popNative(cdp, at, 'right') : null
  const chosen = rows !== null && (await pickNative(path))
  await sleep(500)
  return { rows, chosen, hit }
}
const glyphPick = async (cdp, text, label) => pop(cdp, await boxOf(cdp, glyphOf(text)), label ? [label] : [])
const wordPick = async (cdp, word, path) => pop(cdp, await textAt(cdp, PAGE_TEXT, word), path)
async function gripPick(cdp, text, path) {
  await hover(cdp, lineOf(text), 300)
  const at = await cdp.evaluate(`(() => { const l = ${lineOf(text)}; const r = l.getBoundingClientRect(); const y = r.top + r.height / 2; for (let d = 4; d < 24; d++) if (document.elementFromPoint(r.left - d, y) === l) return { x: r.left - d - 2, y }; return null })()`)
  return pop(cdp, at, path)
}

// ── Group 1 — the glyph menu on a page ──────────────────────────────────────

async function group1(cdp) {
  await setting(cdp, true)
  await setBody(cdp, EXAMPLE)
  const menu = await glyphPick(cdp, 'B')
  item(1, 3, 'A-1 A-2 A-3', "B's glyph opens the five types, Bulleted checked, no Delete", show(flat(menu.rows)) === show(typeRows('Bulleted')), seen(menu))
  await shot(cdp, 'g1-glyph-menu')
  const fromB = await glyphPick(cdp, 'B', 'Numbered')
  item(1, 3, 'B-1', 'on: Numbered from B changes B and E', (await body(cdp)) === '- A\n\t1. B\n\t\t- C\n\t\t- D\n\t2. E\n- F', `${seen(fromB)} · ${show(await body(cdp))}`)
  // A pick that wrote nothing leaves ⌘Z to undo the seed itself, so it's pressed only over a change.
  const changed = (await body(cdp)) !== EXAMPLE
  if (changed) await pressKey(cdp, 'z', META)
  item(1, 3, 'A-7', '⌘Z puts the example back in one step', changed && (await body(cdp)) === EXAMPLE, `${seen(fromB)} · ${show(await body(cdp))}`)

  await setting(cdp, false)
  const fromE = await glyphPick(cdp, 'E', 'Numbered')
  item(1, 3, 'B-1 B-3', 'off: Numbered from E sets B, C, D, and E', (await body(cdp)) === '- A\n\t1. B\n\t\t1. C\n\t\t2. D\n\t2. E\n- F', `${seen(fromE)} · ${show(await body(cdp))}`)

  await setBody(cdp, MIXED)
  const off = await glyphPick(cdp, 'B')
  await setting(cdp, true)
  const on = await glyphPick(cdp, 'B')
  item(1, 3, 'A-3', 'a mixed reach checks nothing with the setting off, and Bulleted with it on', off.rows !== null && show(checked(off.rows)) === '[]' && show(checked(on.rows)) === show(['Bulleted ✓']), `${seen(off)} · ${seen(on)}`)

  for (const [text, first, type] of [
    ['1. one\n2. two', 'one', 'Numbered'],
    ['- [ ] open\n- [x] done', 'open', 'Checklist'],
    ['→ a\n→ b', 'a', 'Arrowed'],
    ['+ p', 'p', 'Arrowed'],
  ]) {
    await setBody(cdp, text)
    const own = await glyphPick(cdp, first, type)
    item(1, 3, 'A-1 A-4 B-8 B-12 B-13', `${show(text)}: the glyph checks ${type}, and picking it leaves the text`, show(flat(own.rows)) === show(typeRows(type)) && (await body(cdp)) === text, `${seen(own)} · ${show(await body(cdp))}`)
  }

  await setBody(cdp, '1. one\n2. two\n→ arrow')
  for (const text of ['one', 'arrow']) {
    const before = await selection(cdp)
    const press = await glyphPick(cdp, text)
    const after = await selection(cdp)
    item(1, 3, 'A-9', `a right-press on ${text}'s glyph leaves the caret on the tail`, show(after) === show(before), `${seen(press)} · ${show([before, after])}`)
  }

  await setBody(cdp, EXAMPLE)
  await caretAt(cdp, 0)
  const revealed = await pop(cdp, await textAt(cdp, lineOf('A'), '-'), ['Lists', 'Numbered List'])
  item(1, 3, 'A-9 C-2', "a revealed marker's Lists ▸ acts as A's glyph", (await body(cdp)) === '1. A\n\t- B\n\t\t- C\n\t\t- D\n\t- E\n2. F', `${seen(revealed)} · ${show(await body(cdp))}`)

  await setBody(cdp, '- [] bare')
  const bare = await wordPick(cdp, 'bare', ['Lists', 'Task List'])
  item(1, 3, 'A-9', 'an item drawing no glyph takes Lists ▸ from its text', (await body(cdp)) === '- [ ] bare', `${seen(bare)} · ${show(await body(cdp))}`)

  await setBody(cdp, '> - q1\n> - q2\n>\n> - q3')
  const quoted = await glyphPick(cdp, 'q2', 'Numbered')
  item(1, 3, 'A-10 B-11', 'a blank line in a quote ends the group', (await body(cdp)) === '> 1. q1\n> 2. q2\n>\n> - q3', `${seen(quoted)} · ${show(await body(cdp))}`)

  await setBody(cdp, MIXED)
  await select(cdp, 'B', 'E')
  const inside = await glyphPick(cdp, 'C', 'Checklist')
  item(1, 3, 'B-7', 'a glyph inside a selection changes every item it touches', (await body(cdp)) === '- A\n\t- [ ] B\n\t\t- [ ] C\n\t\t- [ ] D\n\t- [ ] E\n- F', `${seen(inside)} · ${show(await body(cdp))}`)

  await setBody(cdp, EXAMPLE)
  await select(cdp, 'B')
  const outside = await glyphPick(cdp, 'F', 'Numbered')
  item(1, 3, 'B-7', 'a glyph outside the selection acts on its group', (await body(cdp)) === '1. A\n\t- B\n\t\t- C\n\t\t- D\n\t- E\n2. F', `${seen(outside)} · ${show(await body(cdp))}`)
}

// ── Groups 2 and 3 — a table cell, focused and at rest ──────────────────────

const CELL = (text) => `| Lists | Other |\n| --- | --- |\n| ${text} | x |`
const restingCell = (word) => `[...document.querySelectorAll('.mdpm-tbl-cell-static')].find((e) => e.textContent.includes(${JSON.stringify(word)}))`
const restingGlyph = (word) => `(${restingCell(word)}).querySelector('.md-list-item > [data-src]')`

async function group2(cdp) {
  await setBody(cdp, CELL('- a<br>- b'))
  await mouseAt(cdp, await textAt(cdp, restingCell('b'), 'b'))
  await until('the live cell', () => cdp.evaluate(`!!document.querySelector('.mdpm-tbl-cell-editor .md-list-glyph')`))
  const first = `document.querySelector('.mdpm-tbl-cell-editor .cm-line.md-block-handle .md-list-glyph')`
  const menu = await pop(cdp, await boxOf(cdp, first), [])
  item(2, 3, 'A-4 A-5', "the cell's first glyph opens the glyph menu", show(flat(menu.rows)) === show(typeRows('Bulleted')), seen(menu))
  const line = await boxOf(cdp, `document.querySelector('.mdpm-tbl-cell-editor .cm-line.md-block-handle')`)
  const { rows: grip } = await pop(cdp, { x: line.left + 10, y: line.y }, [])
  item(2, 0, 'A-5', "the inset left of the glyph still opens the grip's menu", flat(grip)[0] === 'Type ▸', show(flat(grip)))
  const second = await pop(cdp, await boxOf(cdp, `[...document.querySelectorAll('.mdpm-tbl-cell-editor .md-list-glyph')][1]`), ['Numbered'])
  await pressKey(cdp, 'Escape')
  await sleep(500)
  item(2, 3, 'A-4', "Numbered from the second line's glyph numbers the cell", (await body(cdp)).endsWith('| 1. a<br>2. b | x |'), `${seen(second)} · ${show(await body(cdp))}`)
  await shot(cdp, 'g2-cell')
}

async function group3(cdp) {
  for (const text of ['- a<br>- b', '1. a<br>2. b', '→ a<br>→ b']) {
    await setBody(cdp, CELL(text))
    const menu = await pop(cdp, await boxOf(cdp, restingGlyph('a')), ['Checklist'])
    const mounted = await cdp.evaluate(`!!document.querySelector('.mdpm-tbl-cell-editor')`)
    item(3, 3, 'A-8', `${show(text)} at rest: the glyph menu's Checklist commits without entering the cell`, flat(menu.rows).length === TYPES.length && !mounted && (await body(cdp)).endsWith('| - [ ] a<br>- [ ] b | x |'), `${seen(menu)} · ${show([mounted, await body(cdp)])}`)
  }
  await setBody(cdp, CELL('> a'))
  const quote = await pop(cdp, await textAt(cdp, restingCell('a'), 'a'), ['Lists', 'Bullet List'])
  item(3, 2, 'C-5', "a resting cell's `> a` becomes an item holding the `>`", (await body(cdp)).endsWith('| - > a | x |'), `${seen(quote)} · ${show(await body(cdp))}`)
  await shot(cdp, 'g3-resting')
}

// ── Group 4 — Lists ▸ and the grip ──────────────────────────────────────────

async function group4(cdp) {
  await setting(cdp, true)
  await setBody(cdp, EXAMPLE)
  const word = await wordPick(cdp, 'E', ['Lists', 'Numbered List'])
  item(4, 3, 'C-1 C-2', "Lists ▸ from E's word acts as E's glyph", (await body(cdp)) === '- A\n\t1. B\n\t\t- C\n\t\t- D\n\t2. E\n- F', `${seen(word)} · ${show(await body(cdp))}`)

  await setBody(cdp, 'Plain.')
  await select(cdp, 'Plain.')
  await wordPick(cdp, 'Plain', ['Lists', 'Bullet List'])
  item(4, 0, 'C-1', 'a plain line still becomes an item', (await body(cdp)) === '- Plain.', show(await body(cdp)))

  await setBody(cdp, EXAMPLE)
  await select(cdp, 'A', 'F')
  const again = await wordPick(cdp, 'C', ['Lists', 'Bullet List'])
  item(4, 2, 'C-3 B-7', 'picking the type a selection already has removes no marker', (await body(cdp)) === EXAMPLE, `${seen(again)} · ${show(await body(cdp))}`)

  await setBody(cdp, MIXED)
  await setting(cdp, false)
  const off = await wordPick(cdp, 'B', [])
  await setting(cdp, true)
  const on = await wordPick(cdp, 'B', [])
  item(4, 2, 'C-4', "Lists ▸'s check follows the reach: none off, Bullet List on", off.rows !== null && show(checked(listsRows(off.rows))) === '[]' && show(checked(listsRows(on.rows))) === show(['Bullet List ✓']), `${off.hit} · ${show([flat(listsRows(off.rows)), flat(listsRows(on.rows))])}`)

  await setBody(cdp, 'plain word here')
  await select(cdp, 'word')
  await wordPick(cdp, 'word', ['Format', 'Bold'])
  item(4, 0, 'C-6', 'Format ▸ Bold still bolds the word under the click', (await body(cdp)) === 'plain **word** here', show(await body(cdp)))

  await setBody(cdp, '- a\n- b\n\n- c')
  await gripPick(cdp, 'a', ['Type', 'Numbered'])
  item(4, 0, 'D-1', "the grip's Type ▸ stops at a blank line", (await body(cdp)) === '1. a\n2. b\n\n- c', show(await body(cdp)))

  await setBody(cdp, EXAMPLE)
  await gripPick(cdp, 'A', ['Type', 'Numbered'])
  item(4, 0, 'D-1', "the grip's Type ▸ switches its whole block whatever the setting", (await body(cdp)) === '1. A\n\t1. B\n\t\t1. C\n\t\t2. D\n\t2. E\n2. F', show(await body(cdp)))

  await setBody(cdp, '')
  await caretAt(cdp, 0)
  await typeText(cdp, '/bul')
  await sleep(500)
  await pressKey(cdp, 'Enter')
  await sleep(500)
  item(4, 0, 'C-1 D-2', 'the / menu turns its empty line into an item', (await body(cdp)) === '- ', show(await body(cdp)))
}

// ── Group 5 — the setting ───────────────────────────────────────────────────

async function group5(cdp) {
  await setting(cdp, true)
  await openSettings(cdp, 'Pages & Writing')
  const order = await cdp.evaluate(`[...document.querySelectorAll('[role="switch"]')].map((s) => s.getAttribute('aria-label'))`)
  const at = order.indexOf('Outliner Lines')
  const on = await cdp.evaluate(`(${SWITCH('Preserve List-Level Formatting')})?.getAttribute('aria-checked') ?? null`)
  item(5, 3, 'E-1 E-2', 'Preserve List-Level Formatting sits under Outliner Lines, on', at >= 0 && order[at + 1] === 'Preserve List-Level Formatting' && order[at + 2] === 'Show Icon In Title' && on === 'true', show([order, on]))
  if (on !== null) await press(cdp, SWITCH('Preserve List-Level Formatting'))
  await shot(cdp, 'g5-settings')
  await closeSettings(cdp)
  await setBody(cdp, EXAMPLE)
  const fromE = await glyphPick(cdp, 'E', 'Numbered')
  item(5, 3, 'E-1', 'turned off in Settings, a pick reaches the nesting without a reload', (await body(cdp)) === '- A\n\t1. B\n\t\t1. C\n\t\t2. D\n\t2. E\n- F', `${seen(fromE)} · ${show(await body(cdp))}`)
  await setting(cdp, true)
}

// ── The run ─────────────────────────────────────────────────────────────────

let cdp
try {
  cdp = (await launch(PORT, 'list-types-shots')).cdp
  await must('a table view', ask(cdp, 'views:save', 'Collection A', 'collection', { id: VIEW_ID, name: 'LT Table', type: 'table', property_order: ['_title'], hidden_properties: [] }, {}))
  await must('show it', ask(cdp, 'mutate', { op: 'setActiveView', path: 'Collection A', kind: 'collection', viewId: VIEW_ID }))
  await createPage(cdp, TITLE)
  await openCollection(cdp)
  await until('the page row', () => cdp.evaluate(`!!${row(TITLE)}`))
  await openPage(cdp, TITLE)
  for (const [g, run] of [[1, group1], [2, group2], [3, group3], [4, group4], [5, group5]]) if (GROUPS.has(g)) await run(cdp)
  cdp.close()
} catch (e) {
  item(0, 0, '—', 'the run reached its end', false, String(e?.stack ?? e))
  if (cdp) await shot(cdp, 'failure').catch(() => {})
} finally {
  await restore()
}
tally(['0', ...[...GROUPS].map(String)], { marks: ['PASS', 'FAIL', 'AHEAD', 'AWAIT'] })
