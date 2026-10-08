import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { ulid } from 'ulidx'
import { parse, stringify } from 'yaml'

const REPO = join(homedir(), 'The Studio/Projects/Project Pommora')
const ELECTRON = join(REPO, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron')
const NEXUS = join(homedir(), 'Test')
const PORT = 9353
const SHOTS = process.env.POMMORA_DRIVE_SHOTS ?? join(tmpdir(), 'text-property-shots')
const GROUPS = new Set(process.argv.slice(2).map(Number))
if (GROUPS.size === 0 || [...GROUPS].some((g) => ![1, 2, 3, 4].includes(g))) {
  console.error('usage: node live-drive.mjs <group…>   (groups 1–4)')
  process.exit(2)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function until(what, fn, ms = 15000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    const v = await fn().catch(() => undefined)
    if (v) return v
    await sleep(100)
  }
  throw new Error(`Timed out waiting for ${what}`)
}
const settles = async (fn, ms = 6000) => until('a settled read', fn, ms).then(() => true, () => false)
// True only when every read across the window holds, so a late write is caught.
async function holds(fn, ms = 6000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (!(await fn().catch(() => false))) return false
    await sleep(200)
  }
  return true
}

async function connect() {
  const target = await until('the app window', async () => {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
    return list.find((t) => t.type === 'page' && t.url.startsWith('app://'))
  }, 30000)
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail })
  const pending = new Map(); let next = 0
  ws.onmessage = (m) => { const { id, result, error } = JSON.parse(m.data); pending.get(id)?.(error ? Promise.reject(new Error(error.message)) : result); pending.delete(id) }
  const send = (method, params = {}) => new Promise((r) => { pending.set(++next, r); ws.send(JSON.stringify({ id: next, method, params })) })
  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text)
    return result.value
  }
  return { send, evaluate, close: () => ws.close() }
}
const ask = (cdp, channel, ...args) => cdp.evaluate(`window.nexus.ask(${JSON.stringify(channel)}, ...${JSON.stringify(args)})`)
const must = async (what, reply) => {
  const r = await reply
  if (!r?.ok) throw new Error(`${what} was refused: ${JSON.stringify(r)}`)
  return r.value
}

const results = []
const check = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${!pass && detail ? `\n      ${detail}` : ''}`) }

// ── Native input ────────────────────────────────────────────────────────────

const osa = (script) => execFileSync('osascript', ['-e', script], { encoding: 'utf8' }).trim()
const key = (code) => osa(`tell application "System Events" to key code ${code}`)
const KEY = { down: 125, right: 124, ret: 36, esc: 53 }

async function activate(cdp, pid) {
  osa(`tell application "System Events" to set frontmost of (first process whose unix id is ${pid}) to true`)
  await cdp.send('Page.bringToFront')
  await sleep(300)
  const front = osa(`tell application "System Events" to get frontmost of (first process whose unix id is ${pid})`)
  if (front !== 'true') throw new Error('The app is not frontmost; no keystroke was sent.')
}

const sel = (css) => `document.querySelector(${JSON.stringify(css)})`
const textEl = (scope, text) =>
  `[...document.querySelectorAll(${JSON.stringify(scope)})].find((e) => e.children.length === 0 && e.textContent.trim() === ${JSON.stringify(text)})`

const boxOf = (cdp, expr) =>
  cdp.evaluate(`(() => { const el = (${expr}); if (!el) throw new Error('no element for ' + ${JSON.stringify(expr)}); const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, left: b.left, top: b.top, right: b.right, bottom: b.bottom } })()`)
const overlaps = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

async function mouseAt(cdp, { x, y }, { button = 'left', modifiers = 0 } = {}) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' })
  for (const type of ['mousePressed', 'mouseReleased'])
    await cdp.send('Input.dispatchMouseEvent', { type, x, y, button, buttons: type === 'mousePressed' ? (button === 'left' ? 1 : 2) : 0, clickCount: 1, modifiers })
  await sleep(500)
}
const mouseClick = async (cdp, expr, opts) => mouseAt(cdp, await boxOf(cdp, expr), opts)
const hover = async (cdp, expr, dwell = 600) => {
  const { x, y } = await boxOf(cdp, expr)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + 20, y, button: 'none' })
  await sleep(100)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' })
  await sleep(dwell)
}

// A freshly popped native menu highlights nothing: the first Down lands on row 1. `seen` runs while the menu is up.
async function chooseNative(cdp, pid, expr, { downs, into = [], seen }) {
  await activate(cdp, pid)
  await mouseClick(cdp, expr, { button: 'right' })
  await sleep(700)
  try {
    if (seen) await seen()
    for (let i = 0; i < downs; i++) key(KEY.down)
    for (const d of into) {
      key(KEY.right)
      for (let i = 0; i < d; i++) key(KEY.down)
    }
    key(KEY.ret)
  } catch (e) {
    key(KEY.esc)
    throw e
  }
  await sleep(800)
}

const click = (cdp, expr) => cdp.evaluate(`(${expr}).click()`)

const VK = { Enter: 13, Escape: 27, Tab: 9, Backspace: 8, b: 66 }
async function pressKey(cdp, name, modifiers = 0) {
  for (const type of ['rawKeyDown', 'keyUp'])
    await cdp.send('Input.dispatchKeyEvent', { type, key: name, code: name.length === 1 ? `Key${name.toUpperCase()}` : name, windowsVirtualKeyCode: VK[name], modifiers })
  await sleep(300)
}
const SHIFT = 8
const META = 4
const typeText = (cdp, text) => cdp.send('Input.insertText', { text })

let shots = 0
const shotPath = (name) => join(SHOTS, `${String(++shots).padStart(2, '0')}-${name}.png`)
async function shot(cdp, name) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(shotPath(name), Buffer.from(data, 'base64'))
}
// A native menu draws outside the web contents, so it is captured from the screen.
const screenShot = (name) => execFileSync('screencapture', ['-x', shotPath(name)])

// ── The Nexus on disk ───────────────────────────────────────────────────────

const SET = 'Collection A/Set Alpha'
const read = (rel) => readFileSync(join(NEXUS, rel), 'utf8')
const pagePath = (title) => `${SET}/${title}.md`
const pageFile = (title) => read(pagePath(title))
const FM = /^---\n([\s\S]*?)\n---\n?/
const frontRaw = (title) => FM.exec(pageFile(title))?.[1] ?? ''
const frontmatter = (title) => parse(frontRaw(title)) ?? {}
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

const mintPageId = () => { const id = ulid(); return `${id.slice(0, 10)}P${id.slice(11)}` }

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
const cellText = (cdp, expr) => cdp.evaluate(`(${expr})?.querySelector('.cell-text')?.textContent ?? null`)
// The value's box stands one line tall whatever it holds.
const oneLine = (cdp, expr) =>
  cdp.evaluate(`(() => { const t = (${expr})?.querySelector('.cell-text'); if (!t) return false; const lh = parseFloat(getComputedStyle(t).lineHeight) || parseFloat(getComputedStyle(t).fontSize) * 1.4; const h = t.getBoundingClientRect().height; const lines = t.textContent.split('\\n').length; return h > 0 && h <= lh * 1.5 && (lines > 1 ? t.scrollHeight > t.clientHeight : true) })()`)
const field = `document.activeElement?.tagName === 'INPUT' ? document.activeElement : null`
const fieldValue = (cdp) => cdp.evaluate(`(${field})?.value ?? null`)
async function pickRow(cdp, label) {
  const row = `[...document.querySelectorAll('[data-picker-portal] *')].filter((e) => e.textContent.trim() === ${JSON.stringify(label)}).at(0)`
  const found = await settles(() => cdp.evaluate(`!!(${row})`), 3000)
  if (!found) throw new Error(`No picker row reads ${label}: ${await cdp.evaluate(`[...document.querySelectorAll('[data-picker-portal]')].map((p) => p.textContent).join(' | ')`)}`)
  await click(cdp, row)
  await sleep(600)
}
const portalOpen = (cdp) => cdp.evaluate(`!!document.querySelector('[data-picker-portal]')`)
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
  const items = await cdp.evaluate(`(() => { const t = (${cell('Drive Items')}).querySelector('.cell-text'); return { first: t.textContent.split('\\n')[0], marks: t.querySelectorAll('[class*="md-list-"]').length } })()`)
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

  await chooseNative(cdp, pid, cell('Drive Prose'), { downs: 1, seen: async () => screenShot('cell-menu') })
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
// The text's content box: the padding the text takes while the pen shows is the room the pen sits in.
const penApart = async (cdp, scope) => {
  const text = await cdp.evaluate(`(() => { const e = (${scope}).querySelector('.cell-text'); if (!e) return null; const b = e.getBoundingClientRect(); return { left: b.left, right: b.right - parseFloat(getComputedStyle(e).paddingRight), top: b.top, bottom: b.bottom } })()`)
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
  const a = await boxOf(cdp, sel('[data-picker-portal]:has(input)')).catch(() => null)
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

async function group2(cdp) {
  await showView(cdp, 'Drive Table')
  await connectionsOn(cdp, cell('Drive Prose'), 'table')
  const ellipsis = {
    prose: (await styleOf(cdp, `(${cell('Drive Prose')}).querySelector('.cell-text')`, ['textOverflow']))?.[0],
    items: (await styleOf(cdp, `(${cell('Drive Items')}).querySelector('.cell-text')`, ['textOverflow']))?.[0],
  }
  check("group 2: at rest Drive Prose's text and Drive Items's end in an ellipsis", ellipsis.prose === 'ellipsis' && ellipsis.items === 'ellipsis', JSON.stringify(ellipsis))

  // The box's scroll width is its widest line's, so a first line shorter than the next is the case a hover scroll would run into blank space.
  await must('a short first line on Drive Empty', ask(cdp, 'mutate', { op: 'setProperty', path: pagePath('Drive Empty'), propertyId: ids[NOTES], value: { kind: 'text', value: 'short\na much longer second line that runs well past the width of the cell it sits in' } }))
  await until("Drive Empty's value", async () => (await cellText(cdp, cell('Drive Empty'))) !== null)
  await hover(cdp, `(${cell('Drive Empty')}).querySelector('.cell-text')`)
  const at = await boxOf(cdp, `(${cell('Drive Empty')}).querySelector('.cell-text')`)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: at.x, y: at.y, deltaX: 300, deltaY: 0 })
  await sleep(500)
  const still = await cdp.evaluate(`(() => { const t = (${cell('Drive Empty')}).querySelector('.cell-text'); return { left: t.scrollLeft, overflow: getComputedStyle(t).textOverflow } })()`)
  check('group 2: hovering and wheeling a value never scrolls it, so its first line stays in view', still.left === 0 && still.overflow === 'ellipsis', JSON.stringify(still))
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
  const flow = await cdp.evaluate(`(() => { const s = (${cardValue('Drive Prose')}).closest('.card-props.is-flow > span'); if (!s) return null; const probe = document.createElement('i'); probe.style.color = 'var(--border-base)'; s.appendChild(probe); const kit = getComputedStyle(probe).color; probe.remove(); const ring = /^(.*) 0px 0px 0px ([\\d.]+)px inset$/.exec(getComputedStyle(s).boxShadow); const others = [...s.parentElement.children].filter((e) => e !== s).map((e) => e.getBoundingClientRect().height); return { ring: ring && { color: ring[1], width: parseFloat(ring[2]) }, kit, tallest: Math.max(0, ...others), h: s.getBoundingClientRect().height } })()`)
  check("group 2: the Compact flow span wears the field's ring in the kit's border color and stands no taller than its neighbors", !!flow?.ring && flow.ring.width > 0 && flow.ring.color === flow.kit && flow.h <= flow.tallest + 1, JSON.stringify(flow))
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
const PAGE_VIEW = `[...document.querySelectorAll('.cm-content')].find((c) => !c.closest('${PANE}')).cmTile.root.view`
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
    return { h: Math.round(el.getBoundingClientRect().height), runs }
  }
  const shown = ${JSON.stringify(SHOWCASE.split('\n'))}
  const out = []
  for (const el of view.contentDOM.children) {
    let at
    try { at = view.posAtDOM(el) } catch { continue }
    const text = view.state.doc.lineAt(at).text
    if (shown.includes(text)) out.push({ text, ...line(el) })
  }
  const caret = document.querySelector('.caret-bar')
  const cs = caret && getComputedStyle(caret)
  return { lines: out, caret: cs ? [cs.backgroundColor, cs.width, cs.height] : null }
})()`

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
  await typeText(cdp, '[[Dri')
  await until('the autocomplete', () => cdp.evaluate(`!!document.querySelector('.mdpm-ac')`), 4000).catch(() => {})
  const ac = await boxOf(cdp, sel('.mdpm-ac')).catch(() => null)
  const paneBox = await boxOf(cdp, sel(PANE))
  check('group 4: [[Dri opens the autocomplete inside the pane', ac && overlaps(ac, paneBox))
  await shot(cdp, 'pane-autocomplete')
  await mouseClick(cdp, `${textEl('.mdpm-ac *', 'Drive Target')}`)
  check('group 4: a press on its row inserts [[Drive Target]] and the pane stays', (await paneDoc(cdp)).includes('🔴==\n[[Drive Target]]') && (await cdp.evaluate(`!!document.querySelector('${PANE}')`)))
  await cdp.evaluate(`(() => { const v = ${PANE_VIEW}; const i = v.state.doc.toString().indexOf('a third line'); v.dispatch({ selection: { anchor: i, head: i + 7 } }) })()`)
  await pressKey(cdp, 'b', META)
  check('group 4: ⌘B wraps the selection in **', (await paneDoc(cdp)).includes('**a third** line'))
  await placeAt(cdp, 'line, plain')
  await pressKey(cdp, 'Enter', SHIFT)
  await typeText(cdp, 'https://example.com')
  await sleep(600)
  check('group 4: a typed URL lands in the Default Link Format', /\nhttps:\/\/example\.com$|\[[^\]]*\]\(https:\/\/example\.com\)|<https:\/\/example\.com>/.test(await paneDoc(cdp)), (await paneDoc(cdp)).split('\n').at(-1))
  await activate(cdp, pid)
  await mouseClick(cdp, `[...document.querySelectorAll('${PANE} .cm-line')].find((l) => l.textContent.startsWith('milk'))`, { button: 'right' })
  await sleep(700)
  screenShot('pane-format-menu')
  key(KEY.esc)
  await sleep(500)
  const typed = await paneDoc(cdp)
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
  check('group 4: a press on another cell saves, closes, and opens nothing', await settles(async () => frontmatter('Drive Prose')[NOTES].endsWith(' xyz')) && !(await cdp.evaluate(`!!document.querySelector('${PANE}') || !!(${field})`)) && !(await portalOpen(cdp)))
  await must('Drive Prose restored', ask(cdp, 'mutate', { op: 'setProperty', path: pagePath('Drive Prose'), propertyId: ids[NOTES], value: { kind: 'text', value: SHOWCASE } }))

  await chooseNative(cdp, pid, `${row('Drive Prose')}.querySelector('.cell-title-text')`, { downs: 9, into: [0] })
  check('group 4: Properties ▸ Drive Notes opens the pane', await settles(() => cdp.evaluate(`!!document.querySelector('${PANE}')`), 3000))
  await shot(cdp, 'pane-from-menu')
  await pressKey(cdp, 'Escape')
  await showView(cdp, 'Drive Cards')
  await mouseClick(cdp, `${card('Drive Empty')}.querySelector('.card-props')`)
  await until('the Cards chooser', () => portalOpen(cdp))
  await pickRow(cdp, NOTES)
  check("group 4: the Cards chooser's Drive Notes opens the pane on Drive Empty", await settles(() => cdp.evaluate(`!!document.querySelector('${PANE}')`), 3000))
  await shot(cdp, 'pane-from-chooser')
  await pressKey(cdp, 'Escape')
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

execFileSync('npm', ['run', 'build'], { cwd: REPO, stdio: ['ignore', 'ignore', 'inherit'] })
const backup = mkdtempSync(join(tmpdir(), 'pommora-text-'))
execFileSync('rsync', ['-a', NEXUS + '/', join(backup, 'Test') + '/'])
const userData = join(backup, 'ud'); mkdirSync(userData)
writeFileSync(join(userData, 'pommora.json'), JSON.stringify({ lastNexusPath: NEXUS }))
mkdirSync(SHOTS, { recursive: true })

let child, cdp
async function restore() {
  if (child) {
    child.kill('SIGTERM')
    await Promise.race([new Promise((r) => child.once('exit', r)), sleep(8000)])
    if (child.exitCode === null) child.kill('SIGKILL')
  }
  const strays = execFileSync('ps', ['-A', '-o', 'pid=,command='], { encoding: 'utf8' }).split('\n').filter((l) => l.includes(userData)).map((l) => Number.parseInt(l, 10))
  for (const pid of strays) try { process.kill(pid, 'SIGKILL') } catch {}
  execFileSync('rsync', ['-a', '--delete', join(backup, 'Test') + '/', NEXUS + '/'])
  rmSync(backup, { recursive: true, force: true })
  console.log(`~/Test restored · screenshots in ${SHOTS}`)
}
process.once('SIGINT', () => restore().then(() => process.exit(130)))
try {
  const env = { ...process.env, POMMORA_USERDATA: userData, POMMORA_DEBUG_PORT: String(PORT) }
  delete env.ELECTRON_RUN_AS_NODE; delete env.ELECTRON_RENDERER_URL
  child = spawn(ELECTRON, ['.'], { cwd: join(REPO, 'Desktop'), env, stdio: 'ignore' })
  const pid = child.pid
  cdp = await connect()
  await until('the sidebar', () => cdp.evaluate(`!!document.querySelector('.row span')`), 30000)
  await sleep(3000)
  await seed(cdp)
  if (GROUPS.has(1)) await group1(cdp, pid)
  if (GROUPS.has(2)) await group2(cdp)
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
