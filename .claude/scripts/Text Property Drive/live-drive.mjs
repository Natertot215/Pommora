import { statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { stringify } from 'yaml'
import {
  activate, ask, boxOf, check, chooseNative, click, FM, frontmatter, frontRaw, hover, holds, key, KEY, launch, META,
  mintPageId, mouseAt, mouseClick, must, nativeMenu, osa, NEXUS, overlaps, pageFile, pagePath, portalOpen, pressKey, read,
  restore, results, screenShot, sel, SET, settles, SHIFT, shot, sleep, typeText, until,
} from '../drive-harness.mjs'

const PORT = 9353
const GROUPS = new Set(process.argv.slice(2).map(Number))
if (GROUPS.size === 0 || [...GROUPS].some((g) => ![1, 2, 3, 4].includes(g))) {
  console.error('usage: node live-drive.mjs <group…>   (groups 1–4)')
  process.exit(2)
}

// ── The Nexus on disk ───────────────────────────────────────────────────────

const has = (title, prop) => Object.hasOwn(frontmatter(title), prop)
// The key's own line and every indented line behind it, exactly as written.
function keyLines(title, prop) {
  const lines = frontRaw(title).split('\n')
  const at = lines.findIndex((l) => l.startsWith(`${prop}:`))
  if (at < 0) return null
  const out = [lines[at]]
  for (let i = at + 1; i < lines.length && /^\s/.test(lines[i]); i++) out.push(lines[i])
  return out.join('\n')
}
function writeFrontLine(title, prop, line) {
  const text = pageFile(title)
  const m = FM.exec(text)
  const kept = m[1].split('\n').filter((l) => !l.startsWith(`${prop}:`))
  writeFileSync(join(NEXUS, pagePath(title)), `---\n${[...kept, line].join('\n')}\n---\n${text.slice(m[0].length)}`)
}
function writeBody(title, body) {
  const text = pageFile(title)
  const m = FM.exec(text)
  writeFileSync(join(NEXUS, pagePath(title)), `${m[0]}${body}`)
}
const inline = (raw) => (typeof raw === 'string' ? raw : stringify(raw, { collectionStyle: 'flow', flowCollectionPadding: false, lineWidth: 0 }).trimEnd())
const collator = new Intl.Collator('en', { sensitivity: 'accent' })
const sidecar = () => JSON.parse(read('Collection A/_pagecollection.json'))
const viewNamed = (name) => sidecar().views.find((v) => v.name === name)
const mtime = (title) => statSync(join(NEXUS, pagePath(title))).mtimeMs

// ── The seed ────────────────────────────────────────────────────────────────

const NOTES = 'Drive Notes'
const LINK = 'Drive Link'
const BAR = 'Drive Bar'
const SHOWCASE = [
  'see [[Drive Target]] and [[Drive Target#Setup]], then [[Nowhere]]',
  'milk with **bold** and _italic_',
  'eggs with ==🔴a highlight🔴==',
  'a third line, plain',
].join('\n')
const TARGET_NOTES = 'see [[#Setup]] first'
const ITEMS = '- milk\n- eggs'
const ids = {}
const pageIds = {}
const VIEWS = {
  'Drive Table': { id: 'view_01KZTEXTDRIVE00000000TABLE', type: 'table' },
  'Drive Cards': { id: 'view_01KZTEXTDRIVE00000000CARDS', type: 'cards', format: 'standard' },
  'Drive Compact': { id: 'view_01KZTEXTDRIVE0000000COMPCT', type: 'cards', format: 'compact' },
}

async function createPage(cdp, title, seeds = {}) {
  const id = mintPageId()
  await must(`createPage ${title}`, ask(cdp, 'mutate', { op: 'createPage', id, parentPath: SET, name: title, seeds }))
  pageIds[title] = id
}

async function seed(cdp) {
  for (const [name, type] of [[NOTES, 'text'], [LINK, 'link'], [BAR, 'number']]) {
    const r = await ask(cdp, 'schema:add', 'Collection A', { id: '', name, type })
    check(`seed: ${name} (${type}) is added`, r.ok, JSON.stringify(r))
    if (!r.ok) throw new Error(`The seed stops: schema:add refused ${name} of type ${type}.`)
    ids[name] = r.value.id
  }
  await must('Drive Bar as a percent', ask(cdp, 'property:setNumberFormat', ids[BAR], { number_family: 'percent' }))
  const order = ['_title', ids[NOTES], ids[LINK], ids[BAR]]
  for (const [name, { id, type, format }] of Object.entries(VIEWS))
    await must(`${name} view`, ask(cdp, 'views:save', 'Collection A', 'collection', {
      id, name, type, property_order: order, hidden_properties: [],
      ...(format ? { format } : {}),
      ...(type === 'table' ? { column_styles: { [ids[BAR]]: { look: 'bar' } } } : {}),
    }, {}))
  const text = (value) => ({ kind: 'text', value })
  await createPage(cdp, 'Drive Target', { [ids[LINK]]: { kind: 'link', value: '[[#Setup]]' }, [ids[NOTES]]: text(TARGET_NOTES) })
  await createPage(cdp, 'Drive Prose', { [ids[NOTES]]: text(SHOWCASE), [ids[BAR]]: { kind: 'number', value: 40 } })
  await createPage(cdp, 'Drive Empty')
  await createPage(cdp, 'Drive Raw')
  await createPage(cdp, 'Drive List')
  await createPage(cdp, 'Drive Foreign')
  await createPage(cdp, 'Drive Items', { [ids[NOTES]]: text(ITEMS) })
  await sleep(800)
  writeBody('Drive Target', `## Setup\n\n${SHOWCASE}\n`)
  writeFrontLine('Drive Raw', NOTES, `${NOTES}: 42`)
  writeFrontLine('Drive List', NOTES, `${NOTES}: [milk, eggs, bread]`)
  writeFrontLine('Drive Foreign', 'description', 'description: see [[Drive Target]] first')
  check('seed: every Drive page is on disk with its value',
    frontmatter('Drive Prose')[NOTES] === SHOWCASE && frontmatter('Drive Target')[NOTES] === TARGET_NOTES &&
    frontmatter('Drive Items')[NOTES] === ITEMS && !has('Drive Empty', NOTES) &&
    keyLines('Drive Raw', NOTES) === `${NOTES}: 42` && keyLines('Drive List', NOTES) === `${NOTES}: [milk, eggs, bread]`)
  await openCollection(cdp)
  await showView(cdp, 'Drive Table')
}

// ── Surfaces ────────────────────────────────────────────────────────────────

const SETTINGS_BUTTON = `document.querySelector('.toolbar-trio > :not([inert]) button[title="Settings"]')`
async function openCollection(cdp) {
  await click(cdp, `[...document.querySelectorAll('.row span')].findLast((e) => e.textContent.trim() === 'Collection A')`)
  await sleep(1200)
}
async function showView(cdp, name) {
  await must(`show ${name}`, ask(cdp, 'mutate', { op: 'setActiveView', path: 'Collection A', kind: 'collection', viewId: VIEWS[name].id }))
  const probe = VIEWS[name].type === 'table' ? `.data-row[data-rid="${pageIds['Drive Prose']}"]` : `[data-rid="${pageIds['Drive Prose']}"] .card-props`
  await until(`${name} on screen`, () => cdp.evaluate(`!!document.querySelector(${JSON.stringify(probe)})`))
  await sleep(600)
}
const row = (title) => `document.querySelector('.data-row[data-rid="${pageIds[title]}"]')`
const cell = (title, prop = NOTES) => `${row(title)}.querySelectorAll('.data-cell')[${[NOTES, LINK, BAR].indexOf(prop) + 1}]`
const card = (title) => `document.querySelector('[data-rid="${pageIds[title]}"]')`
const cardValue = (title, prop = NOTES) =>
  `[...${card(title)}.querySelectorAll('.card-value')].find((v) => v.closest('.card-prop-row')?.querySelector('.card-prop-label')?.textContent.trim() === ${JSON.stringify(prop)} || v.querySelector('.cell-text'))`
const panelRow = (prop = NOTES) => `document.querySelector('[data-property-row="${ids[prop]}"]')`
const cellText = (cdp, expr) =>
  cdp.evaluate(`(() => { const t = (${expr})?.querySelector('.cell-text'); return t ? [...t.querySelectorAll('.cell-text-line')].map((l) => l.textContent).join('\\n') : null })()`)
// The value's box stands one line tall whatever it holds.
const oneLine = (cdp, expr) =>
  cdp.evaluate(`(() => { const t = (${expr})?.querySelector('.cell-text'); if (!t) return false; const lh = parseFloat(getComputedStyle(t).lineHeight) || parseFloat(getComputedStyle(t).fontSize) * 1.4; const h = t.getBoundingClientRect().height; const hidden = [...t.querySelectorAll('.cell-text-line')].slice(1).every((l) => l.getClientRects().length === 0); return h > 0 && h <= lh * 1.5 && hidden })()`)
const field = `document.activeElement?.tagName === 'INPUT' ? document.activeElement : null`
const fieldValue = (cdp) => cdp.evaluate(`(${field})?.value ?? null`)
async function pickRow(cdp, label) {
  const row = `[...document.querySelectorAll('[data-picker-portal] *')].filter((e) => e.textContent.trim() === ${JSON.stringify(label)}).at(0)`
  const found = await settles(() => cdp.evaluate(`!!(${row})`), 3000)
  if (!found) throw new Error(`No picker row reads ${label}: ${await cdp.evaluate(`[...document.querySelectorAll('[data-picker-portal]')].map((p) => p.textContent).join(' | ')`)}`)
  await click(cdp, row)
  await sleep(600)
}
const activeTab = (cdp) => cdp.evaluate(`document.querySelector('[role=tab][aria-selected=true]')?.getAttribute('title') ?? null`)

// A press on the value's first glyph, so a link inside it is never the target.
async function openField(cdp, expr) {
  const text = await boxOf(cdp, `(${expr}).querySelector('.cell-text')`).catch(() => null)
  if (text) await mouseAt(cdp, { x: text.left + 3, y: text.y })
  else await mouseClick(cdp, expr)
  await until('the inline field', () => cdp.evaluate(`!!(${field})`))
}
async function commitField(cdp, expr, text) {
  await openField(cdp, expr)
  await cdp.evaluate(`(${field}).select()`)
  if (text === '') await pressKey(cdp, 'Backspace')
  else await typeText(cdp, text)
  await pressKey(cdp, 'Enter')
  await sleep(900)
}
async function openPage(cdp, title) {
  await mouseClick(cdp, `${row(title)}.querySelector('.cell-title-text')`)
  await until(`${title}'s tab`, async () => (await activeTab(cdp)) === title)
  await sleep(800)
}
async function openPanel(cdp) {
  if (await cdp.evaluate(`!!document.querySelector('[aria-label="Add Property"]')`)) return
  await mouseClick(cdp, SETTINGS_BUTTON)
  await until('the Properties panel', () => cdp.evaluate(`!!document.querySelector('[aria-label="Add Property"]')`))
  await sleep(500)
}
async function closePanel(cdp) {
  if (await cdp.evaluate(`!!document.querySelector('[aria-label="Add Property"]')`)) await mouseClick(cdp, SETTINGS_BUTTON)
  await sleep(400)
}
async function escapeAll(cdp) {
  for (let i = 0; i < 4 && (await portalOpen(cdp)); i++) await pressKey(cdp, 'Escape')
}

// ── Group 1 — the catalog and the field ─────────────────────────────────────

async function group1(cdp, pid) {
  check('group 1: Drive Raw reads 42 and Drive List its flow list', (await cellText(cdp, cell('Drive Raw'))) === '42' && (await cellText(cdp, cell('Drive List'))) === '[milk, eggs, bread]',
    JSON.stringify([await cellText(cdp, cell('Drive Raw')), await cellText(cdp, cell('Drive List'))]))
  const drawn = { first: (await cellText(cdp, cell('Drive Prose')))?.slice(0, 30), lines: (await cellText(cdp, cell('Drive Prose')))?.split('\n').length, oneLine: await oneLine(cdp, cell('Drive Prose')), empty: await cellText(cdp, cell('Drive Empty')) }
  check("group 1: Drive Prose's cell draws every line, one line tall; Drive Empty's is empty",
    drawn.first?.startsWith('see ') && drawn.lines === SHOWCASE.split('\n').length && drawn.oneLine && drawn.empty === null, JSON.stringify(drawn))
  const items = await cdp.evaluate(`(() => { const t = (${cell('Drive Items')}).querySelector('.cell-text'); return { first: t.querySelector('.cell-text-line').textContent, marks: t.querySelectorAll('[class*="md-list-"]').length } })()`)
  check("group 1: Drive Items's list-spelled value reads as prose, its first line the literal - milk", items.first === '- milk' && items.marks === 0, JSON.stringify(items))
  await shot(cdp, 'table-filled-empty')

  for (const title of ['Drive Raw', 'Drive List'])
    await must(`${title}'s Drive Bar`, ask(cdp, 'mutate', { op: 'setProperty', path: pagePath(title), propertyId: ids[BAR], value: { kind: 'number', value: 25 } }))
  await sleep(600)
  check('group 1: an adjacent write keeps the number 42 and the flow list byte for byte',
    keyLines('Drive Raw', NOTES) === `${NOTES}: 42` && keyLines('Drive List', NOTES) === `${NOTES}: [milk, eggs, bread]` &&
    JSON.stringify(frontmatter('Drive List')[NOTES]) === '["milk","eggs","bread"]' && frontmatter('Drive Raw')[BAR] === 25 && frontmatter('Drive List')[BAR] === 25,
    JSON.stringify([keyLines('Drive Raw', NOTES), keyLines('Drive List', NOTES)]))

  await commitField(cdp, cell('Drive Empty'), 'opus')
  check('group 1: typing opus into Drive Empty writes it plain', await settles(async () => keyLines('Drive Empty', NOTES) === `${NOTES}: opus`), keyLines('Drive Empty', NOTES))
  const rawStamp = mtime('Drive Raw')
  await openField(cdp, cell('Drive Raw'))
  const rawField = await fieldValue(cdp)
  await cdp.evaluate(`(${field}).select()`)
  await typeText(cdp, '42')
  await pressKey(cdp, 'Enter')
  check("group 1: Drive Raw's field holds 42, and retyping it writes nothing",
    rawField === '42' && (await holds(async () => mtime('Drive Raw') === rawStamp)) && keyLines('Drive Raw', NOTES) === `${NOTES}: 42`, JSON.stringify([rawField, keyLines('Drive Raw', NOTES)]))
  await commitField(cdp, cell('Drive Empty'), '42')
  check('group 1: a typed 42 lands as the string "42"', await settles(async () => keyLines('Drive Empty', NOTES) === `${NOTES}: "42"`), keyLines('Drive Empty', NOTES))

  const first = SHOWCASE.split('\n')[0]
  const bytes = pageFile('Drive Prose')
  const proseStamp = mtime('Drive Prose')
  await openField(cdp, cell('Drive Prose'))
  const caret = await cdp.evaluate(`(() => { const f = ${field}; return f.selectionStart === f.value.length && f.selectionEnd === f.value.length })()`)
  check("group 1: Drive Prose's field holds the first line, caret at its end", (await fieldValue(cdp)) === first && caret, await fieldValue(cdp))
  await shot(cdp, 'field-open')
  await cdp.evaluate(`(${field}).blur()`)
  check("group 1: an untouched blur leaves Drive Prose's bytes unchanged", (await holds(async () => mtime('Drive Prose') === proseStamp)) && pageFile('Drive Prose') === bytes)
  await commitField(cdp, cell('Drive Prose'), 'a fresh first line')
  const behind = SHOWCASE.split('\n').slice(1).join('\n')
  check('group 1: a new first line lands over the untouched lines as a |- block',
    await settles(async () => frontmatter('Drive Prose')[NOTES] === `a fresh first line\n${behind}` && keyLines('Drive Prose', NOTES).startsWith(`${NOTES}: |-\n  a fresh first line\n`)),
    keyLines('Drive Prose', NOTES))

  await openField(cdp, cell('Drive Items'))
  check("group 1: Drive Items' field shows its first item", (await fieldValue(cdp)) === '- milk', await fieldValue(cdp))
  await pressKey(cdp, 'Escape')
  await commitField(cdp, cell('Drive Items'), '- oats')
  check('group 1: - oats lands as a |- block over - eggs', await settles(async () => keyLines('Drive Items', NOTES) === `${NOTES}: |-\n  - oats\n  - eggs`), keyLines('Drive Items', NOTES))
  await commitField(cdp, cell('Drive Items'), '')
  check('group 1: emptying the first line lands "- eggs" quoted', await settles(async () => keyLines('Drive Items', NOTES) === `${NOTES}: "- eggs"`), keyLines('Drive Items', NOTES))
  await commitField(cdp, cell('Drive Items'), '')
  check('group 1: emptying the last line clears the key', await settles(async () => !has('Drive Items', NOTES)), keyLines('Drive Items', NOTES))
  await commitField(cdp, cell('Drive Items'), '1. a')
  check('group 1: 1. a lands plain', await settles(async () => keyLines('Drive Items', NOTES) === `${NOTES}: 1. a`), keyLines('Drive Items', NOTES))
  await commitField(cdp, cell('Drive Items'), '   ')
  check('group 1: whitespace alone clears the key', await settles(async () => !has('Drive Items', NOTES)), keyLines('Drive Items', NOTES))

  await must('Drive Prose restored', ask(cdp, 'mutate', { op: 'setProperty', path: pagePath('Drive Prose'), propertyId: ids[NOTES], value: { kind: 'text', value: SHOWCASE } }))
  await must('Drive Items restored', ask(cdp, 'mutate', { op: 'setProperty', path: pagePath('Drive Items'), propertyId: ids[NOTES], value: { kind: 'text', value: ITEMS } }))
  await must('Drive Empty restored', ask(cdp, 'mutate', { op: 'setProperty', path: pagePath('Drive Empty'), propertyId: ids[NOTES], value: null }))
  await sleep(800)

  const table = () => viewNamed('Drive Table')
  const titles = () => cdp.evaluate(`[...document.querySelectorAll('.data-row[data-rid]')].map((r) => r.querySelector('.cell-title-text')?.textContent.trim())`)
  const valued = Object.keys(pageIds).filter((t) => has(t, NOTES))
  await must('sort on Drive Notes', ask(cdp, 'views:save', 'Collection A', 'collection', table(), { sort: [{ property_id: ids[NOTES], direction: 'ascending' }] }))
  const expected = [...valued].sort((a, b) => collator.compare(inline(frontmatter(a)[NOTES]), inline(frontmatter(b)[NOTES])))
  const sorted = await settles(async () => JSON.stringify((await titles()).filter((t) => valued.includes(t))) === JSON.stringify(expected))
  check('group 1: a sort on Drive Notes reads A → Z by its text', sorted, JSON.stringify([expected, (await titles()).filter((t) => valued.includes(t))]))
  await must('filter on milk', ask(cdp, 'views:save', 'Collection A', 'collection', table(), { sort: [], filter: { match: 'all', rules: [{ property_id: ids[NOTES], op: 'contains', value: 'milk' }] }, filter_enabled: true }))
  const milky = valued.filter((t) => inline(frontmatter(t)[NOTES]).toLowerCase().includes('milk')).sort()
  check('group 1: contains milk leaves exactly the values holding milk', await settles(async () => JSON.stringify([...(await titles())].sort()) === JSON.stringify(milky)),
    JSON.stringify([milky, await titles()]))
  await must('filter off', ask(cdp, 'views:save', 'Collection A', 'collection', table(), { filter_enabled: false }))
  await until('every row back', async () => (await titles()).includes('Drive Empty'))

  await chooseNative(cdp, pid, cell('Drive Prose'), { downs: 1, edge: true, seen: async () => screenShot('cell-menu') })
  check("group 1: the cell menu's Clear empties the cell and the key", await settles(async () => !has('Drive Prose', NOTES) && (await cellText(cdp, cell('Drive Prose'))) === null), keyLines('Drive Prose', NOTES))
  await must('Drive Prose restored', ask(cdp, 'mutate', { op: 'setProperty', path: pagePath('Drive Prose'), propertyId: ids[NOTES], value: { kind: 'text', value: SHOWCASE } }))
  await until("Drive Prose's value back", async () => (await cellText(cdp, cell('Drive Prose'))) !== null)

  for (const [name, tag] of [['Drive Cards', 'cards-standard'], ['Drive Compact', 'cards-compact']]) {
    await showView(cdp, name)
    const value = cardValue('Drive Prose')
    check(`group 1: ${name} shows Drive Prose's value one line tall`, (await cellText(cdp, value))?.startsWith('see ') && (await oneLine(cdp, value)))
    await shot(cdp, tag)
  }
  await showView(cdp, 'Drive Cards')
  await openField(cdp, cardValue('Drive Prose'))
  check("group 1: a Standard card's field holds the first line", (await fieldValue(cdp)) === SHOWCASE.split('\n')[0], await fieldValue(cdp))
  await pressKey(cdp, 'Escape')
  await showView(cdp, 'Drive Table')

  await openPage(cdp, 'Drive Prose')
  await openPanel(cdp)
  check("group 1: the panel shows Drive Prose's value one line tall", (await cellText(cdp, panelRow()))?.startsWith('see ') && (await oneLine(cdp, panelRow())))
  await shot(cdp, 'panel-filled')
  await openField(cdp, panelRow())
  check("group 1: the panel's field holds the first line", (await fieldValue(cdp)) === SHOWCASE.split('\n')[0], await fieldValue(cdp))
  await pressKey(cdp, 'Escape')
  await closePanel(cdp)
  await openCollection(cdp)
  await openPage(cdp, 'Drive Empty')
  await openPanel(cdp)
  await click(cdp, sel('[aria-label="Add Property"]'))
  await until('the Add Property chooser', () => portalOpen(cdp))
  await pickRow(cdp, NOTES)
  await until('the revealed Drive Notes row', () => cdp.evaluate(`!!${panelRow()}`))
  check('group 1: revealing Drive Notes opens its field empty', await settles(async () => (await fieldValue(cdp)) === ''))
  await pressKey(cdp, 'Escape')
  check('group 1: the panel shows the empty placeholder on Drive Empty', (await cdp.evaluate(`(${panelRow()}).textContent.trim()`)) === '—' && (await cellText(cdp, panelRow())) === null)
  await shot(cdp, 'panel-empty')
  await escapeAll(cdp)
  await closePanel(cdp)
  await openCollection(cdp)
}

// ── Group 2 — the surfaces ──────────────────────────────────────────────────

const connection = (scope, kind, text) =>
  `[...(${scope}).querySelectorAll('.md-connection-${kind}')].find((e) => e.textContent.includes(${JSON.stringify(text)}))`
const PEN = '[aria-label="Open in TextPane"]'
const rectOf = (cdp, expr) =>
  cdp.evaluate(`(() => { const e = (${expr}); if (!e) return null; const b = e.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height } })()`)
const styleOf = (cdp, expr, props) =>
  cdp.evaluate(`(() => { const e = (${expr}); if (!e) return null; const s = getComputedStyle(e); return ${JSON.stringify(props)}.map((p) => s[p]) })()`)
// The text's box: while the pen shows, the text stands clear of it by a margin.
const penApart = async (cdp, scope) => {
  const text = await cdp.evaluate(`(() => { const e = (${scope}).querySelector('.cell-text'); if (!e) return null; const b = e.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom } })()`)
  const pen = await rectOf(cdp, `(${scope}).querySelector(${JSON.stringify(PEN)})`)
  return !!text && !!pen && !overlaps(text, pen)
}
async function penOn(cdp, scope, tag) {
  await hover(cdp, scope)
  const shown = await cdp.evaluate(`(() => { const p = (${scope}).querySelector(${JSON.stringify(PEN)}); return !!p && parseFloat(getComputedStyle(p).opacity) > 0 })()`)
  check(`group 2: ${tag}: hovering the value shows the pen`, shown)
  check(`group 2: ${tag}: on hover the pen's box stands clear of the text's`, await penApart(cdp, scope))
  await shot(cdp, `${tag}-pen`)
  await mouseClick(cdp, `(${scope}).querySelector(${JSON.stringify(PEN)})`)
  const opened = await settles(() => portalOpen(cdp), 3000)
  const a = await boxOf(cdp, sel('[data-picker-portal]:not([data-dismissal-shield])')).catch(() => null)
  const b = await boxOf(cdp, scope)
  // Anchored at the value: across its span, touching or within a few pixels of its box.
  const anchored = a && a.left < b.right && b.left < a.right && a.top < b.bottom + 8 && b.top - 8 < a.bottom
  const glance = await cdp.evaluate(`!!document.querySelector('[data-glance]')`)
  check(`group 2: ${tag}: the pen opens a popover anchored at the value, with no glance up`, opened && anchored && !glance, JSON.stringify({ a, b, glance }))
  await shot(cdp, `${tag}-popover`)
  await escapeAll(cdp)
}
async function connectionsOn(cdp, scope, tag) {
  check(`group 2: ${tag}: Drive Target resolves and Nowhere is a phantom`,
    await cdp.evaluate(`!!${connection(scope, 'resolved', 'Drive Target')} && !!${connection(scope, 'phantom', 'Nowhere')}`))
}
// The label is whole, the value takes at most the row's reach, and `gap` is how far the value's right edge sits from the row's.
const reachOf = (cdp, rowExpr, labelExpr, valueExpr) =>
  cdp.evaluate(`(() => { const r = (${rowExpr}), l = (${labelExpr}), v = (${valueExpr}); if (!r || !l || !v) return null; const cs = getComputedStyle(r); const reach = parseFloat(cs.getPropertyValue('--row-value-reach')) / 100; const content = r.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); const vb = v.getBoundingClientRect(); const text = document.createRange(); text.selectNodeContents(l); return { whole: text.getBoundingClientRect().width <= l.getBoundingClientRect().width + 0.01, share: vb.width / content, reach, gap: r.getBoundingClientRect().right - parseFloat(cs.paddingRight) - parseFloat(cs.borderRightWidth) - vb.right } })()`)
const reached = (r) => !!r && r.whole && r.share <= r.reach + 0.01
const panelLine = (prop = NOTES) => `${panelRow(prop)}.parentElement.parentElement`
const panelLabel = (prop = NOTES) => `[...(${panelLine(prop)}).querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent.trim() === ${JSON.stringify(prop)})`
const cardRow = (title) => `(${cardValue(title)}).closest('.card-prop-row')`

async function group2(cdp, pid) {
  await showView(cdp, 'Drive Table')
  await connectionsOn(cdp, cell('Drive Prose'), 'table')
  await activate(cdp, pid)
  await mouseClick(cdp, connection(cell('Drive Prose'), 'resolved', 'Drive Target'), { button: 'right' })
  await sleep(700)
  const linkMenu = nativeMenu(pid)
  screenShot('link-menu')
  key(KEY.esc)
  await sleep(500)
  check('group 2: right-clicking Drive Target in a Text value opens the link menu, not the cell menu', linkMenu.includes('Copy Link') && !linkMenu.includes('Clear'), JSON.stringify(linkMenu))
  const ellipsis = {
    prose: (await styleOf(cdp, `(${cell('Drive Prose')}).querySelector('.cell-text')`, ['textOverflow']))?.[0],
    items: (await styleOf(cdp, `(${cell('Drive Items')}).querySelector('.cell-text')`, ['textOverflow']))?.[0],
  }
  check("group 2: at rest Drive Prose's text and Drive Items's end in an ellipsis", ellipsis.prose === 'ellipsis' && ellipsis.items === 'ellipsis', JSON.stringify(ellipsis))

  // Only the first line is laid out, so a short first line over a long second has nothing to scroll, and a long first line scrolls to its own end.
  await must('a short first line on Drive Empty', ask(cdp, 'mutate', { op: 'setProperty', path: pagePath('Drive Empty'), propertyId: ids[NOTES], value: { kind: 'text', value: 'short\na much longer second line that runs well past the width of the cell it sits in' } }))
  await until("Drive Empty's value", async () => (await cellText(cdp, cell('Drive Empty'))) !== null)
  const wheel = async (title) => {
    const box = `(${cell(title)}).querySelector('.cell-text')`
    await hover(cdp, box)
    const at = await boxOf(cdp, box)
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: at.x, y: at.y, deltaX: 300, deltaY: 0 })
    await sleep(500)
    return cdp.evaluate(`(() => { const t = ${box}; const s = getComputedStyle(t); const first = t.querySelector('.cell-text-line').getBoundingClientRect().width + parseFloat(s.paddingLeft) + parseFloat(s.paddingRight); return { left: t.scrollLeft, width: t.scrollWidth, first: Math.ceil(first), client: t.clientWidth } })()`)
  }
  const short = await wheel('Drive Empty')
  check('group 2: a short first line over a long second has nothing to scroll', short.left === 0 && short.width <= short.client, JSON.stringify(short))
  const long = await wheel('Drive Prose')
  check("group 2: hovering and wheeling Drive Prose's value scrolls it to its first line's end and no further", long.left > 0 && long.width <= long.first + 1, JSON.stringify(long))
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 4, y: 4, button: 'none' })
  await sleep(600)
  await must('Drive Empty restored', ask(cdp, 'mutate', { op: 'setProperty', path: pagePath('Drive Empty'), propertyId: ids[NOTES], value: null }))
  await until('Drive Empty emptied', async () => (await cellText(cdp, cell('Drive Empty'))) === null)

  await mouseClick(cdp, connection(cell('Drive Prose'), 'resolved', 'Drive Target'))
  check('group 2: a click on Drive Target opens the page', await settles(async () => (await activeTab(cdp)) === 'Drive Target'))
  await openCollection(cdp)
  const tabs = await cdp.evaluate(`document.querySelectorAll('[role=tab]').length`)
  await mouseClick(cdp, connection(cell('Drive Prose'), 'resolved', 'Drive Target'), { modifiers: META })
  check('group 2: ⌘-click opens a second tab', await settles(async () => (await cdp.evaluate(`document.querySelectorAll('[role=tab]').length`)) === tabs + 1))
  await openCollection(cdp)
  await hover(cdp, connection(cell('Drive Prose'), 'resolved', 'Drive Target'), 1500)
  check('group 2: a dwell raises the glance', await settles(() => cdp.evaluate(`!!document.querySelector('[data-glance]')`), 4000))
  await shot(cdp, 'glance')
  await pressKey(cdp, 'Escape')
  await hover(cdp, cell('Drive Prose'))
  await shot(cdp, 'cell-hover-pen')
  await penOn(cdp, cell('Drive Prose'), 'cell')
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
  await sleep(1200)
  const touch = await cdp.evaluate(`[...document.querySelectorAll('.data-row[data-rid] ${PEN}')].map((p) => parseFloat(getComputedStyle(p).opacity))`)
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
  check('group 2: without hover every pen shows at rest', touch.length >= 4 && touch.every((o) => o > 0), JSON.stringify(touch))

  await showView(cdp, 'Drive Cards')
  await connectionsOn(cdp, cardValue('Drive Prose'), 'standard card')
  const cardReach = await reachOf(cdp, cardRow('Drive Prose'), `(${cardRow('Drive Prose')}).querySelector('.card-prop-label')`, cardValue('Drive Prose'))
  const ends = await cdp.evaluate(`(() => { const end = (e) => { const r = document.createRange(); r.selectNodeContents(e); return r.getBoundingClientRect().right }; return [end((${cardValue('Drive Raw')}).querySelector('.cell-text')), end([...${card('Drive Raw')}.querySelectorAll('.card-prop-row')].find((r) => r.querySelector('.card-prop-label').textContent.trim() === ${JSON.stringify(BAR)}).querySelector('.cell-text-scroll'))] })()`)
  check("group 2: a Standard card keeps Drive Notes's label whole and holds the value to the reach", reached(cardReach), JSON.stringify(cardReach))
  check("group 2: on Drive Raw's card, 42 ends where Drive Bar's 25% does", Math.abs(ends[0] - ends[1]) <= 1, JSON.stringify(ends))
  await penOn(cdp, cardValue('Drive Prose'), 'cards-standard')
  await showView(cdp, 'Drive Compact')
  await connectionsOn(cdp, cardValue('Drive Prose'), 'compact card')
  const flow = await cdp.evaluate(`(() => { const s = (${cardValue('Drive Prose')}).closest('.card-props.is-flow > span'); if (!s) return null; const probe = document.createElement('i'); probe.style.color = 'var(--border-base)'; s.appendChild(probe); const kit = getComputedStyle(probe).color; probe.remove(); const ring = /^(.*) 0px 0px 0px ([\\d.]+)px inset$/.exec(getComputedStyle(s).boxShadow); return { ring: ring && { color: ring[1], width: parseFloat(ring[2]) }, kit, floor: parseFloat(getComputedStyle(s).minHeight), h: s.getBoundingClientRect().height } })()`)
  check("group 2: the Compact flow span wears the field's ring in the kit's border color and stands a field's height", !!flow?.ring && flow.ring.width > 0 && flow.ring.color === flow.kit && flow.floor > 0 && flow.h >= flow.floor - 0.5, JSON.stringify(flow))
  await penOn(cdp, cardValue('Drive Prose'), 'cards-compact')

  await showView(cdp, 'Drive Table')
  const bar = await cdp.evaluate(`(() => { const c = ${cell('Drive Prose', BAR)}; const b = c.querySelector('.cell-bar'); const cs = getComputedStyle(c); return { bar: b.getBoundingClientRect().width, room: c.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) } })()`)
  check("group 2: Drive Bar's bar fills its cell", Math.abs(bar.bar - bar.room) <= 1, JSON.stringify(bar))
  await mouseClick(cdp, cell('Drive Prose', BAR))
  check("group 2: Drive Bar's bar still opens its popover", await settles(() => portalOpen(cdp), 3000))
  await escapeAll(cdp)

  await openPage(cdp, 'Drive Prose')
  await openPanel(cdp)
  await connectionsOn(cdp, panelRow(), 'panel')
  const panelReach = await reachOf(cdp, panelLine(), panelLabel(), `${panelRow()}.parentElement`)
  check("group 2: the panel keeps Drive Notes's label whole and holds the value to the reach", reached(panelReach), JSON.stringify(panelReach))
  await penOn(cdp, panelRow(), 'panel')
  await closePanel(cdp)
  await openCollection(cdp)
  await openPage(cdp, 'Drive Raw')
  await openPanel(cdp)
  const panelShort = await reachOf(cdp, panelLine(), panelLabel(), `${panelRow()}.parentElement`)
  check('group 2: the panel sits Drive Raw’s 42 at the row’s right edge', panelShort && Math.abs(panelShort.gap) <= 1, JSON.stringify(panelShort))
  await closePanel(cdp)
  await openCollection(cdp)

  check("group 2: Drive Target's Drive Link reads #Setup", (await cdp.evaluate(`(${cell('Drive Target', LINK)}).textContent.trim()`)) === '#Setup')
  await openPage(cdp, 'Drive Target')
  await openPanel(cdp)
  const rows = [await rectOf(cdp, panelLine()), await rectOf(cdp, panelLine(LINK))].map((r) => r?.height)
  const fonts = [await styleOf(cdp, `${panelRow()}.querySelector('.cell-text')`, ['fontFamily', 'fontSize', 'lineHeight']), await styleOf(cdp, `${panelRow(LINK)}.querySelector('.cell-connection')`, ['fontFamily', 'fontSize', 'lineHeight'])]
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 300, button: 'none' })
  await sleep(500)
  const edges = await cdp.evaluate(`(() => { const end = (e) => { const r = document.createRange(); r.selectNodeContents(e); return r.getBoundingClientRect().right }; return [end(${panelRow()}.querySelector('.cell-text')), end(${panelRow(LINK)}.querySelector('.cell-connection'))] })()`)
  check("group 2: at rest Drive Notes's text ends where Drive Link's does", Math.abs(edges[0] - edges[1]) <= 1, JSON.stringify(edges))
  check("group 2: the panel's Drive Notes row matches Drive Link's in height and type", Math.abs(rows[0] - rows[1]) < 0.5 && !!fonts[0] && JSON.stringify(fonts[0]) === JSON.stringify(fonts[1]), JSON.stringify({ rows, fonts }))
  await mouseClick(cdp, `${panelRow(LINK)}.querySelector('.cell-connection')`)
  const inView = await settles(() => cdp.evaluate(`(() => { const h = [...document.querySelectorAll('.cm-line')].find((l) => l.textContent.includes('Setup')); if (!h) return false; const r = h.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight })()`), 3000)
  check('group 2: a click on #Setup brings the heading into view', inView)
  await shot(cdp, 'link-heading')
  await closePanel(cdp)
  await openCollection(cdp)

  await must('a long device name', ask(cdp, 'sync:renameDevice', 'M'.repeat(64)))
  await mouseClick(cdp, sel('.sidebar-ribbon [aria-label="Settings"]'))
  const DEVICE = '[aria-label="Device name"]'
  await until('the device name field', () => cdp.evaluate(`!!document.querySelector(${JSON.stringify(DEVICE)})`))
  await cdp.evaluate(`document.querySelector(${JSON.stringify(DEVICE)}).scrollIntoView({ block: 'center' })`)
  await sleep(500)
  const deviceRow = `document.querySelector(${JSON.stringify(DEVICE)}).parentElement.parentElement`
  const device = await reachOf(cdp, deviceRow, `[...(${deviceRow}).querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent.trim() === 'This Device')`, `document.querySelector(${JSON.stringify(DEVICE)})`)
  const clipped = await cdp.evaluate(`(() => { const f = document.querySelector(${JSON.stringify(DEVICE)}); return f.scrollWidth > f.clientWidth })()`)
  check('group 2: a long device name clips inside its field and leaves This Device whole', reached(device) && clipped, JSON.stringify({ device, clipped }))
  await shot(cdp, 'settings-device')
  await mouseClick(cdp, sel('.sidebar-ribbon [aria-label="Settings"]'))
  await sleep(600)
}

// ── Group 3 — index and cascade ─────────────────────────────────────────────

async function group3(cdp) {
  await must('rename to Drive Renamed', ask(cdp, 'mutate', { op: 'rename', path: pagePath('Drive Target'), kind: 'page', newName: 'Drive Renamed' }))
  check('group 3: a rename rewrites the links inside Drive Prose',
    await settles(async () => frontmatter('Drive Prose')[NOTES].includes('[[Drive Renamed]]') && frontmatter('Drive Prose')[NOTES].includes('[[Drive Renamed#Setup]]')), frontmatter('Drive Prose')[NOTES])
  check("group 3: Drive Foreign's undeclared description stays", frontmatter('Drive Foreign').description === 'see [[Drive Target]] first')
  await must('description as Text', ask(cdp, 'schema:add', 'Collection A', { id: '', name: 'description', type: 'text' }))
  await must('rename back', ask(cdp, 'mutate', { op: 'rename', path: `${SET}/Drive Renamed.md`, kind: 'page', newName: 'Drive Target' }))
  check("group 3: the rename back restores Drive Prose's links",
    await settles(async () => frontmatter('Drive Prose')[NOTES].includes('[[Drive Target]]') && frontmatter('Drive Prose')[NOTES].includes('[[Drive Target#Setup]]')))
  await must('rename Drive Foreign away and back', ask(cdp, 'mutate', { op: 'rename', path: pagePath('Drive Target'), kind: 'page', newName: 'Drive Renamed' }))
  check('group 3: Drive Foreign reads Drive Renamed', await settles(async () => frontmatter('Drive Foreign').description === 'see [[Drive Renamed]] first'), frontmatter('Drive Foreign').description)
  await must('rename back again', ask(cdp, 'mutate', { op: 'rename', path: `${SET}/Drive Renamed.md`, kind: 'page', newName: 'Drive Target' }))
  await sleep(800)

  await must('renameHeading', ask(cdp, 'mutate', { op: 'renameHeading', path: pagePath('Drive Target'), heading: 'Setup', to: 'Intro' }))
  check("group 3: a heading rename patches Drive Target's own value and Drive Prose's",
    await settles(async () => frontmatter('Drive Target')[NOTES] === 'see [[#Intro]] first' && frontmatter('Drive Prose')[NOTES].includes('[[Drive Target#Intro]]')),
    JSON.stringify([frontmatter('Drive Target')[NOTES], frontmatter('Drive Prose')[NOTES].split('\n')[0]]))
  // `mutate renameHeading` is the editor's settle alone (the cascade); the editor itself writes the body, so the drive writes it here. The watcher sees Setup → Intro, which the values already hold, and then Intro → Setup, which carries them back.
  writeBody('Drive Target', pageFile('Drive Target').slice(FM.exec(pageFile('Drive Target'))[0].length).replace('## Setup', '## Intro'))
  await sleep(2000)
  writeBody('Drive Target', pageFile('Drive Target').slice(FM.exec(pageFile('Drive Target'))[0].length).replace('## Intro', '## Setup'))
  check('group 3: the seen heading rename carries both values back',
    await settles(async () => frontmatter('Drive Target')[NOTES] === TARGET_NOTES && frontmatter('Drive Prose')[NOTES].includes('[[Drive Target#Setup]]'), 10000),
    JSON.stringify([frontmatter('Drive Target')[NOTES], frontmatter('Drive Prose')[NOTES].split('\n')[0]]))

  const before = frontmatter('Drive Prose')[NOTES]
  const trashed = await must('delete Drive Target', ask(cdp, 'mutate', { op: 'delete', path: pagePath('Drive Target'), kind: 'page' }))
  await showView(cdp, 'Drive Table')
  check("group 3: a delete leaves Drive Prose's sentence and shows a phantom",
    (await holds(async () => frontmatter('Drive Prose')[NOTES] === before)) && (await settles(() => cdp.evaluate(`!!${connection(cell('Drive Prose'), 'phantom', 'Drive Target')}`))))
  await shot(cdp, 'phantom-after-delete')
  await must('restore Drive Target', ask(cdp, 'mutate', { op: 'restore', bundlePath: trashed.trashed.bundlePath }))
  check('group 3: a restore resolves it again', await settles(() => cdp.evaluate(`!!${connection(cell('Drive Prose'), 'resolved', 'Drive Target')}`)))
  await shot(cdp, 'resolved-after-restore')
}

// ── Group 4 — TextPane ──────────────────────────────────────────────────────

const PANE = '.text-pane'
const PANE_VIEW = `document.querySelector('${PANE} .cm-content').cmTile.root.view`
const PAGE_VIEW = `[...document.querySelectorAll('.cm-content')].find((c) => !c.closest('${PANE}') && !c.closest('[inert]')).cmTile.root.view`
const paneDoc = (cdp) => cdp.evaluate(`${PANE_VIEW}.state.doc.toString()`)
const focusInPane = (cdp) => cdp.evaluate(`!!document.activeElement?.closest(${JSON.stringify(PANE)})`)
async function openPane(cdp, scope) {
  await hover(cdp, scope)
  await mouseClick(cdp, `(${scope}).querySelector(${JSON.stringify(PEN)})`)
  await until('the TextPane', () => cdp.evaluate(`!!document.querySelector('${PANE} .cm-editor')`))
  await sleep(500)
}
const placeAt = (cdp, needle, end = true) =>
  cdp.evaluate(`(() => { const v = ${PANE_VIEW}; const d = v.state.doc.toString(); const i = d.indexOf(${JSON.stringify(needle)}); const at = ${end} ? v.state.doc.lineAt(i).to : i; v.focus(); v.dispatch({ selection: { anchor: at } }) })()`)
const SNAP_OF = (view) => `(() => {
  const view = ${view}
  const style = (el) => {
    const s = getComputedStyle(el)
    const lines = new Set()
    let fill = 'none'
    for (let e = el; e && !e.classList.contains('cm-line'); e = e.parentElement) {
      const es = getComputedStyle(e)
      for (const d of es.textDecorationLine.split(' ')) if (d !== 'none') lines.add(d)
      if (fill === 'none' && es.backgroundColor !== 'rgba(0, 0, 0, 0)') fill = es.backgroundColor
    }
    return [s.color, s.fontWeight, s.fontStyle, s.fontSize, s.fontFamily.split(',')[0], [...lines].sort().join(' ') || 'none', fill, s.verticalAlign].join('|')
  }
  const line = (el) => {
    const runs = []
    const push = (r) => {
      const last = runs[runs.length - 1]
      if (r.t !== undefined && last && last.t !== undefined && last.s === r.s) last.t += r.t
      else runs.push(r)
    }
    const walk = (node) => {
      for (const n of node.childNodes) {
        if (n.nodeType === 3) { if (n.data) push({ t: n.data, s: style(n.parentElement) }); continue }
        if (n.nodeType !== 1 || n.classList.contains('cm-widgetBuffer')) continue
        if (n.getAttribute('contenteditable') === 'false') push({ w: String(n.className), x: (n.textContent || '').trim().slice(0, 80), s: style(n) })
        else walk(n)
      }
    }
    walk(el)
    return { lineHeight: getComputedStyle(el).lineHeight, runs }
  }
  const shown = ${JSON.stringify(SHOWCASE.split('\n'))}
  const out = []
  for (const el of view.contentDOM.children) {
    let at
    try { at = view.posAtDOM(el) } catch { continue }
    const text = view.state.doc.lineAt(at).text
    if (shown.includes(text)) out.push({ text, ...line(el) })
  }
  const caret = view.dom.querySelector('.caret-bar')
  const cs = caret && getComputedStyle(caret)
  // To a tenth of a pixel: CM draws the caret through the editor's measured scale, which a fractional layout width nudges off 1.
  const px = (v) => Math.round(parseFloat(v) * 10) / 10
  return { lines: out, caret: cs ? [cs.backgroundColor, px(cs.width), px(cs.height)] : null }
})()`

const refusal = (cdp) => cdp.evaluate(`document.querySelector('[role="status"][aria-live="assertive"]')?.textContent.trim() ?? ''`)
// The row menu's sixth row is Properties ▸, which lists the collection's properties in schema order.
const PROPERTIES_NOTES = () => ({ downs: 6, into: [sidecar().properties.indexOf(ids[NOTES])] })

async function group4(cdp, pid) {
  await showView(cdp, 'Drive Table')
  await openPane(cdp, cell('Drive Prose'))
  const caretEnd = await cdp.evaluate(`(() => { const v = ${PANE_VIEW}; return v.hasFocus && v.state.selection.main.head === v.state.doc.length })()`)
  check('group 4: the pen opens TextPane focused, caret at the end', caretEnd)
  const body = await cdp.evaluate(`(() => { const p = document.querySelector('${PANE}'); return { lists: p.querySelectorAll('[class*="md-list-"]').length, bold: !!p.querySelector('strong, .md-strong, [class*=bold]'), italic: !!p.querySelector('em, .md-em, [class*=italic]'), highlight: !!p.querySelector('mark, [class*=highlight]'), resolved: !!p.querySelector('.md-connection-resolved'), phantom: !!p.querySelector('.md-connection-phantom') } })()`)
  check('group 4: the pane draws the marks and both connection classes, and no list',
    body.lists === 0 && body.bold && body.italic && body.highlight && body.resolved && body.phantom, JSON.stringify(body))
  await shot(cdp, 'pane-open')

  await placeAt(cdp, 'eggs with')
  await pressKey(cdp, 'Enter', SHIFT)
  check('group 4: Shift-Enter at the end of a line writes a line break', (await paneDoc(cdp)).includes('🔴==\n\na third line'))
  await shot(cdp, 'pane-break')
  const beforeTab = await paneDoc(cdp)
  await pressKey(cdp, 'Tab')
  check('group 4: Tab inserts nothing and focus stays in the pane', (await paneDoc(cdp)) === beforeTab && (await focusInPane(cdp)))
  // One key at a time, as typing lands: the editor pairs a typed `[`, and a pasted run pairs nothing.
  for (const ch of ['[', '[', 'Dri']) await typeText(cdp, ch)
  await until('the autocomplete', () => cdp.evaluate(`!!document.querySelector('.mdpm-ac')`), 4000).catch(() => {})
  const ac = await boxOf(cdp, sel('.mdpm-ac')).catch(() => null)
  const paneBox = await boxOf(cdp, sel(PANE))
  check('group 4: [[Dri opens the autocomplete inside the pane', ac && overlaps(ac, paneBox))
  await shot(cdp, 'pane-autocomplete')
  // The row's title draws its match apart from the rest, so the row is the innermost element reading the whole title.
  await mouseClick(cdp, `[...document.querySelectorAll('.mdpm-ac *')].find((e) => e.textContent.trim() === 'Drive Target' && [...e.children].every((c) => c.textContent.trim() !== 'Drive Target'))`)
  check('group 4: a press on its row inserts [[Drive Target]] and the pane stays', (await paneDoc(cdp)).includes('🔴==\n[[Drive Target]]') && (await cdp.evaluate(`!!document.querySelector('${PANE}')`)))
  await pressKey(cdp, 'Enter', SHIFT)
  for (const ch of ['[', '[', 'Dri']) await typeText(cdp, ch)
  await until('the autocomplete again', () => cdp.evaluate(`!!document.querySelector('.mdpm-ac')`), 4000).catch(() => {})
  await pressKey(cdp, 'Enter')
  check('group 4: Enter with the autocomplete open picks its row and the pane stays',
    /\[\[Drive Target\]\]\n\[\[Drive [^\]\n]+\]\]\n/.test(await paneDoc(cdp)) && (await cdp.evaluate(`!!document.querySelector('${PANE}')`)), JSON.stringify((await paneDoc(cdp)).split('\n').slice(3, 6)))
  await cdp.evaluate(`(() => { const v = ${PANE_VIEW}; const i = v.state.doc.toString().indexOf('a third line'); v.dispatch({ selection: { anchor: i, head: i + 7 } }) })()`)
  await pressKey(cdp, 'b', META)
  check('group 4: ⌘B wraps the selection in **', (await paneDoc(cdp)).includes('**a third** line'))
  await placeAt(cdp, 'line, plain')
  await pressKey(cdp, 'Enter', SHIFT)
  await cdp.evaluate(`(() => { const dt = new DataTransfer(); dt.setData('text/plain', 'https://example.com'); ${PANE_VIEW}.contentDOM.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })) })()`)
  await sleep(600)
  check('group 4: a pasted URL lands in the Default Link Format', /\n\[[^\]\n]+\]\(https:\/\/example\.com\/?\)$/.test(await paneDoc(cdp)), (await paneDoc(cdp)).split('\n').at(-1))
  // A native menu's rows can't be read back, so type-select proves them: a letter opens the row it begins, Right enters its submenu, and Return takes an entry. A letter no row begins leaves the menu on its first submenu, Format, so the most it writes is an inline mark.
  const menuAt = async (letter, shotName, downs = 0) => {
    const at = await cdp.evaluate(`(() => { const v = ${PANE_VIEW}; const i = v.state.doc.toString().indexOf('milk'); v.focus(); v.dispatch({ selection: { anchor: i, head: i + 4 } }); const c = v.coordsAtPos(i + 2); return { x: c.left, y: (c.top + c.bottom) / 2 } })()`)
    await activate(cdp, pid)
    await mouseAt(cdp, at, { button: 'right' })
    await sleep(700)
    try {
      osa(`tell application "System Events" to keystroke "${letter}"`)
      await sleep(300)
      if (shotName) screenShot(shotName)
      key(KEY.right)
      await sleep(300)
      for (let i = 0; i < downs; i++) key(KEY.down)
      key(KEY.ret)
    } catch (e) {
      key(KEY.esc)
      throw e
    }
    await sleep(600)
  }
  const unformatted = await paneDoc(cdp)
  const unmarked = (doc) => doc.replace(/[*_`]/g, '')
  const blockRows = []
  // Heading's first entry is Paragraph, which writes nothing, so its Heading 1 is the one taken.
  for (const [letter, downs] of [['l', 0], ['h', 1], ['i', 0], ['e', 0]]) {
    await menuAt(letter, undefined, downs)
    const after = await paneDoc(cdp)
    if (unmarked(after) !== unmarked(unformatted)) blockRows.push([letter, after.split('\n')[1]])
    await cdp.evaluate(`(() => { const v = ${PANE_VIEW}; v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: ${JSON.stringify(unformatted)} } }) })()`)
  }
  check("group 4: the pane's native menu holds no Lists, Heading, Insert, or Embed row", blockRows.length === 0 && (await cdp.evaluate(`!!document.querySelector('${PANE}')`)), JSON.stringify(blockRows))
  await menuAt('f', 'pane-format-menu')
  check('group 4: its Format row leads to the marks, Italic first', (await paneDoc(cdp)) === unformatted.replace('milk with', '*milk* with'), (await paneDoc(cdp)).split('\n')[1])
  const typed = await paneDoc(cdp)
  await cdp.evaluate(`(() => { const v = ${PANE_VIEW}; v.focus(); v.dispatch({ selection: { anchor: 0, head: 3 } }) })()`)
  await pressKey(cdp, 'Escape')
  check('group 4: with a range selected the first Escape collapses it and the pane stays', (await cdp.evaluate(`!!document.querySelector('${PANE}') && ${PANE_VIEW}.state.selection.main.empty`)) && (await paneDoc(cdp)) === typed)
  await pressKey(cdp, 'Escape')
  check('group 4: Escape saves and closes as a |- block', await settles(async () => frontmatter('Drive Prose')[NOTES] === typed && keyLines('Drive Prose', NOTES).startsWith(`${NOTES}: |-`)) && !(await cdp.evaluate(`!!document.querySelector('${PANE}')`)))
  await openPane(cdp, cell('Drive Prose'))
  const stamp = mtime('Drive Prose')
  check('group 4: reopening shows the saved document', (await paneDoc(cdp)) === typed)
  await pressKey(cdp, 'Escape')
  await sleep(1200)
  check('group 4: Escape without typing writes nothing', mtime('Drive Prose') === stamp)
  await openPane(cdp, cell('Drive Prose'))
  await typeText(cdp, ' w')
  const entered = await paneDoc(cdp)
  await pressKey(cdp, 'Enter')
  check('group 4: Enter saves and closes', await settles(async () => frontmatter('Drive Prose')[NOTES] === entered) && !(await cdp.evaluate(`!!document.querySelector('${PANE}')`)))
  await openPane(cdp, cell('Drive Prose'))
  await typeText(cdp, ' x')
  await mouseClick(cdp, `document.querySelector('${PANE} [aria-label="Save and close"]')`)
  check('group 4: × saves', await settles(async () => frontmatter('Drive Prose')[NOTES].endsWith(' x')))
  await openPane(cdp, cell('Drive Prose'))
  await typeText(cdp, 'y')
  await mouseAt(cdp, { x: 5, y: 300 })
  check('group 4: a press outside saves', await settles(async () => frontmatter('Drive Prose')[NOTES].endsWith(' xy')))
  await openPane(cdp, cell('Drive Prose'))
  await typeText(cdp, 'z')
  await mouseClick(cdp, cell('Drive Empty'))
  check('group 4: a press on another cell saves, closes, opens nothing, and raises no refusal', await settles(async () => frontmatter('Drive Prose')[NOTES].endsWith(' xyz')) && !(await cdp.evaluate(`!!document.querySelector('${PANE}') || !!(${field})`)) && !(await portalOpen(cdp)) && !(await refusal(cdp)))
  await must('Drive Prose restored', ask(cdp, 'mutate', { op: 'setProperty', path: pagePath('Drive Prose'), propertyId: ids[NOTES], value: { kind: 'text', value: SHOWCASE } }))

  const setNotes = (value) => must('an outside write', ask(cdp, 'mutate', { op: 'setProperty', path: pagePath('Drive Prose'), propertyId: ids[NOTES], value: { kind: 'text', value } }))
  await openPane(cdp, cell('Drive Prose'))
  await setNotes('from elsewhere')
  check('group 4: an outside change reaches an untouched pane', await settles(async () => (await paneDoc(cdp)) === 'from elsewhere'), await paneDoc(cdp))
  await typeText(cdp, '!')
  await setNotes('again')
  check("group 4: an outside change leaves a pane's typing alone", await holds(async () => (await paneDoc(cdp)) === 'from elsewhere!', 2000), await paneDoc(cdp))
  await pressKey(cdp, 'Escape')
  check("group 4: the pane's close writes last", await settles(async () => frontmatter('Drive Prose')[NOTES] === 'from elsewhere!'), frontmatter('Drive Prose')[NOTES])
  await must('Drive Prose restored', ask(cdp, 'mutate', { op: 'setProperty', path: pagePath('Drive Prose'), propertyId: ids[NOTES], value: { kind: 'text', value: SHOWCASE } }))
  await sleep(600)

  const rawBytes = pageFile('Drive Raw')
  await openPane(cdp, cell('Drive Raw'))
  const gone = await must('delete Drive Raw', ask(cdp, 'mutate', { op: 'delete', path: pagePath('Drive Raw'), kind: 'page' }))
  const unmounted = await settles(() => cdp.evaluate(`!document.querySelector('${PANE}')`))
  await must('restore Drive Raw', ask(cdp, 'mutate', { op: 'restore', bundlePath: gone.trashed.bundlePath }))
  check('group 4: a row deleted under an untouched pane unmounts it, writes nothing, and raises no refusal', unmounted && (await settles(async () => pageFile('Drive Raw') === rawBytes)) && !(await refusal(cdp)), keyLines('Drive Raw', NOTES))
  await until("Drive Raw's row back", () => cdp.evaluate(`!!${row('Drive Raw')}`))

  await openPane(cdp, cell('Drive Items'))
  const items = await cdp.evaluate(`document.querySelector('${PANE}').querySelectorAll('[class*="md-list-"]').length`)
  check("group 4: Drive Items's - milk lines read as literal text in the pane", (await paneDoc(cdp)) === ITEMS && items === 0, JSON.stringify([await paneDoc(cdp), items]))
  const retype = async (lines) => {
    await cdp.evaluate(`(() => { const v = ${PANE_VIEW}; v.focus(); v.dispatch({ selection: { anchor: 0, head: v.state.doc.length } }) })()`)
    for (const [i, line] of lines.entries()) {
      if (i > 0) await pressKey(cdp, 'Enter', SHIFT)
      if (line) await typeText(cdp, line)
    }
    await pressKey(cdp, 'Escape')
  }
  for (const [lines, spelled] of [[['- a'], `${NOTES}: "- a"`], [['- a', '- b'], `${NOTES}: |-\n  - a\n  - b`], [['a', 'b', ''], `${NOTES}: |\n  a\n  b`]]) {
    const value = lines.join('\n')
    await retype(lines)
    const landed = await settles(async () => keyLines('Drive Items', NOTES) === spelled && frontmatter('Drive Items')[NOTES] === value)
    await openPane(cdp, cell('Drive Items'))
    const back = { doc: await paneDoc(cdp), lists: await cdp.evaluate(`document.querySelector('${PANE}').querySelectorAll('[class*="md-list-"]').length`) }
    check(`group 4: ${JSON.stringify(value)} lands as ${JSON.stringify(spelled.slice(NOTES.length + 2))} and reopens as the same literal lines`, landed && back.doc === value && back.lists === 0, JSON.stringify([keyLines('Drive Items', NOTES), back]))
  }
  await pressKey(cdp, 'Escape')
  await must('Drive Items restored', ask(cdp, 'mutate', { op: 'setProperty', path: pagePath('Drive Items'), propertyId: ids[NOTES], value: { kind: 'text', value: ITEMS } }))
  await sleep(600)

  await chooseNative(cdp, pid, `${row('Drive Prose')}.querySelector('.cell-title-text')`, PROPERTIES_NOTES())
  check('group 4: Properties ▸ Drive Notes opens the pane', await settles(() => cdp.evaluate(`!!document.querySelector('${PANE}')`), 3000))
  await shot(cdp, 'pane-from-menu')
  await pressKey(cdp, 'Escape')
  await sleep(500)
  await chooseNative(cdp, pid, `${row('Drive Prose')}.querySelector('.cell-title-text')`, PROPERTIES_NOTES())
  await until('the TextPane again', () => cdp.evaluate(`!!document.querySelector('${PANE} .cm-editor')`), 3000).catch(() => {})
  const again = await paneDoc(cdp).catch(() => null)
  await typeText(cdp, 'q')
  check('group 4: a second Properties ▸ open shows the value and types', again === SHOWCASE && (await paneDoc(cdp).catch(() => null)) === `${SHOWCASE}q`, JSON.stringify(again))
  await pressKey(cdp, 'Escape')
  await must('Drive Prose restored', ask(cdp, 'mutate', { op: 'setProperty', path: pagePath('Drive Prose'), propertyId: ids[NOTES], value: { kind: 'text', value: SHOWCASE } }))
  await sleep(600)
  await showView(cdp, 'Drive Cards')
  await openPane(cdp, cardValue('Drive Prose'))
  await pressKey(cdp, 'Escape')
  await sleep(500)
  await openPane(cdp, cardValue('Drive Prose'))
  const reopened = await paneDoc(cdp)
  await typeText(cdp, 'q')
  check('group 4: a Standard card value closed and reopened shows the value and types', reopened === SHOWCASE && (await paneDoc(cdp)) === `${SHOWCASE}q`, JSON.stringify(reopened))
  await pressKey(cdp, 'Escape')
  await must('Drive Prose restored', ask(cdp, 'mutate', { op: 'setProperty', path: pagePath('Drive Prose'), propertyId: ids[NOTES], value: { kind: 'text', value: SHOWCASE } }))
  await sleep(600)
  // A Compact card hides a blank value, so the chooser offers Drive Notes on Drive Empty; a press on the card's own text zone opens it.
  await showView(cdp, 'Drive Compact')
  await click(cdp, `${card('Drive Empty')}.querySelector('.card-text')`)
  await until('the Cards chooser', () => portalOpen(cdp))
  await pickRow(cdp, NOTES)
  check("group 4: the Cards chooser's Drive Notes opens the pane on Drive Empty", await settles(() => cdp.evaluate(`!!document.querySelector('${PANE} .cm-editor')`), 3000))
  await shot(cdp, 'pane-from-chooser')
  await typeText(cdp, 'chosen')
  await pressKey(cdp, 'Escape')
  check("group 4: a word typed in the chooser's pane lands on Drive Empty", await settles(async () => frontmatter('Drive Empty')[NOTES] === 'chosen'), keyLines('Drive Empty', NOTES))
  await must('Drive Empty restored', ask(cdp, 'mutate', { op: 'setProperty', path: pagePath('Drive Empty'), propertyId: ids[NOTES], value: null }))
  await sleep(600)
  await showView(cdp, 'Drive Table')

  await openPage(cdp, 'Drive Target')
  await cdp.evaluate(`(() => { const v = ${PAGE_VIEW}; v.focus(); v.dispatch({ selection: { anchor: v.state.doc.length } }) })()`)
  await sleep(800)
  const page = await cdp.evaluate(SNAP_OF(PAGE_VIEW))
  await shot(cdp, 'parity-page')
  await openCollection(cdp)
  await openPane(cdp, cell('Drive Prose'))
  await sleep(800)
  const pane = await cdp.evaluate(SNAP_OF(PANE_VIEW))
  await shot(cdp, 'parity-pane')
  await pressKey(cdp, 'Escape')
  const same = JSON.stringify(page) === JSON.stringify(pane)
  check('group 4: the pane draws every SHOWCASE line and the caret as the page does', same && page.lines.length === SHOWCASE.split('\n').length,
    same ? `${page.lines.length} lines` : JSON.stringify({ page, pane }).slice(0, 2000))
}

// ── The run ─────────────────────────────────────────────────────────────────

let cdp
try {
  const app = await launch(PORT, 'text-property-shots')
  cdp = app.cdp
  const { pid } = app
  await seed(cdp)
  if (GROUPS.has(1)) await group1(cdp, pid)
  if (GROUPS.has(2)) await group2(cdp, pid)
  if (GROUPS.has(3)) await group3(cdp)
  if (GROUPS.has(4)) await group4(cdp, pid)
  cdp.close()
} catch (e) {
  check('the run reached its end', false, String(e?.stack ?? e))
  if (cdp) {
    await shot(cdp, 'failure').catch(() => {})
    console.log(await cdp.evaluate(`JSON.stringify({ tab: document.querySelector('[role=tab][aria-selected=true]')?.title, text: document.body.innerText.slice(0, 400) })`).catch((err) => String(err)))
  }
} finally {
  await restore()
}
console.log(`${results.filter((r) => r.pass).length}/${results.length} passed`)
process.exit(results.every((r) => r.pass) ? 0 : 1)
