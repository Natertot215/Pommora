import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { ulid } from 'ulidx'
import { parse } from 'yaml'

const REPO = join(homedir(), 'The Studio/Projects/Project Pommora')
const ELECTRON = join(REPO, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron')
const NEXUS = join(homedir(), 'Test')
const PORT = 9343
const SHOTS = process.env.POMMORA_DRIVE_SHOTS ?? join(tmpdir(), 'option-picker-shots')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function until(what, fn, ms = 30000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    const v = await fn().catch(() => undefined)
    if (v) return v
    await sleep(100)
  }
  throw new Error(`Timed out waiting for ${what}`)
}
async function connect() {
  const target = await until('the app window', async () => {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
    return list.find((t) => t.type === 'page' && t.url.startsWith('app://'))
  })
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

const results = []
const check = (name, pass, detail) => { results.push({ name, pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `\n      ${detail}` : ''}`) }

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

const PICKER_ROWS = '[data-picker-portal] [data-line-row]'
const TITLE_FIELD = '[aria-label="Option Title"]'
const sel = (css) => `document.querySelector(${JSON.stringify(css)})`
const textEl = (scope, text) =>
  `[...document.querySelectorAll(${JSON.stringify(scope)})].find((e) => e.children.length === 0 && e.textContent.trim() === ${JSON.stringify(text)})`
const pickerRow = (label) =>
  `[...document.querySelectorAll(${JSON.stringify(PICKER_ROWS)})].find((e) => e.textContent.trim() === ${JSON.stringify(label)})`

const boxOf = (cdp, expr) =>
  cdp.evaluate(`(() => { const el = (${expr}); if (!el) throw new Error('no element for ' + ${JSON.stringify(expr)}); const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 } })()`)

async function mouseClick(cdp, expr, button = 'left') {
  const { x, y } = await boxOf(cdp, expr)
  for (const type of ['mousePressed', 'mouseReleased'])
    await cdp.send('Input.dispatchMouseEvent', { type, x, y, button, clickCount: 1 })
  await sleep(500)
}

// A freshly popped native menu highlights nothing: the first Down lands on row 1.
async function chooseNative(cdp, pid, expr, { downs, into = [] }) {
  await activate(cdp, pid)
  await mouseClick(cdp, expr, 'right')
  try {
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
  await sleep(600)
}

const click = (cdp, expr) => cdp.evaluate(`(${expr}).click()`)

const VK = { Enter: 13, Escape: 27 }
async function pressKey(cdp, name) {
  for (const type of ['keyDown', 'keyUp'])
    await cdp.send('Input.dispatchKeyEvent', { type, key: name, code: name, windowsVirtualKeyCode: VK[name] })
  await sleep(300)
}
async function enter(cdp) {
  await pressKey(cdp, 'Enter')
  await sleep(800)
}
async function retitle(cdp, text) {
  await cdp.evaluate(`(() => { const f = ${sel(TITLE_FIELD)}; f.focus(); f.select() })()`)
  if (text) await cdp.send('Input.insertText', { text })
  else await cdp.evaluate(`(() => { const f = document.activeElement; f.value = '' })()`)
  await cdp.evaluate(`document.activeElement.blur()`)
  await sleep(800)
}

async function sweep(cdp, a, b, { steps, held }) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: a.x, y: a.y, button: 'left', buttons: 1, clickCount: 1 })
  for (let i = 1; i <= steps; i++)
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x, y: a.y + ((b.y - a.y) * i) / steps, button: 'left', buttons: 1 })
  if (held) await held()
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', buttons: 0, clickCount: 1 })
  await sleep(800)
}
async function drag(cdp, from, to, held) {
  const a = await boxOf(cdp, from)
  const b = await boxOf(cdp, to)
  await sweep(cdp, a, { x: b.x, y: b.y - 6 }, { steps: 8, held })
}

let shots = 0
async function shot(cdp, name) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(SHOTS, `${String(++shots).padStart(2, '0')}-${name}.png`), Buffer.from(data, 'base64'))
}

const registry = () => JSON.parse(readFileSync(join(NEXUS, '.nexus/properties.json'), 'utf8')).defs
const defNamed = (name) => Object.values(registry()).find((d) => d.name === name)
const optionValues = (name) => (defNamed(name).select_options ?? []).map((o) => o.value)
const read = (rel) => readFileSync(join(NEXUS, rel), 'utf8')
const page = (title) => read(`Collection A/Set Alpha/${title}.md`)
const frontmatter = (title) => parse(/^---\n([\s\S]*?)\n---/.exec(page(title))[1])
const lists = (title, prop, value) => [frontmatter(title)[prop]].flat().includes(value)
const driveView = () => JSON.parse(read('Collection A/_pagecollection.json')).views.find((v) => v.name === 'Drive Table')

const mintPageId = () => { const id = ulid(); return `${id.slice(0, 10)}P${id.slice(11)}` }

const PROPS = { 'Drive Select': 'select', 'Drive Multi': 'multiSelect', 'Drive Status': 'status' }
const ids = {}
async function seed(cdp) {
  for (const [name, type] of Object.entries(PROPS)) {
    const r = await ask(cdp, 'schema:add', 'Collection A', { id: '', name, type })
    check(`seed: ${name} added`, r.ok, JSON.stringify(r))
    ids[name] = r.value?.id
  }
  for (const [name, titles] of [['Drive Select', ['Alpha', 'Beta']], ['Drive Multi', ['One', 'Two']]])
    for (const title of titles) {
      const r = await ask(cdp, 'property:editOption', ids[name], { op: 'add', groupId: 'select', title })
      check(`seed: ${name} ${title}`, r.ok, JSON.stringify(r))
    }
  const view = await ask(cdp, 'views:save', 'Collection A', 'collection', { id: 'view_01KZDRIVE0000000000000TABLE', name: 'Drive Table', type: 'table', property_order: ['_title', ...Object.keys(PROPS).map((name) => ids[name])], hidden_properties: [] }, {})
  check('seed: Drive Table view', view.ok, JSON.stringify(view))
  const one = await ask(cdp, 'mutate', { op: 'createPage', id: mintPageId(), parentPath: 'Collection A/Set Alpha', name: 'Drive One', seeds: { [ids['Drive Select']]: { kind: 'select', value: 'Alpha' }, [ids['Drive Multi']]: { kind: 'multiSelect', value: ['One'] } } })
  const two = await ask(cdp, 'mutate', { op: 'createPage', id: mintPageId(), parentPath: 'Collection A/Set Alpha', name: 'Drive Two', seeds: { [ids['Drive Select']]: { kind: 'select', value: 'Beta' } } })
  check('seed: Drive One and Drive Two', one.ok && two.ok && lists('Drive One', 'Drive Select', 'Alpha') && lists('Drive Two', 'Drive Select', 'Beta'), JSON.stringify([one, two]))
  await sleep(1500)
  await openDriveTable(cdp)
}

const VIEWS_BUTTON = `[...document.querySelectorAll('button')].find((b) => b.title === 'Views' || b.getAttribute('aria-label') === 'Views')`
async function openDriveTable(cdp) {
  await click(cdp, `[...document.querySelectorAll('.row span')].findLast((e) => e.textContent.trim() === 'Collection A')`)
  await until('the collection toolbar', () => cdp.evaluate(`!!(${VIEWS_BUTTON})`))
  await sleep(800)
  if (await cdp.evaluate(`!!${textEl('.data-row .cell-title-text', 'Drive One')}`)) return
  await mouseClick(cdp, VIEWS_BUTTON)
  await sleep(600)
  await click(cdp, `${textEl('body *', 'Drive Table')}.closest('[role=button],button,[data-line-row]')`)
  await until('the Drive Table rows', () => cdp.evaluate(`!!${textEl('.data-row .cell-title-text', 'Drive One')}`))
  await sleep(500)
  await pressKey(cdp, 'Escape')
}

const portalOpen = (cdp) => cdp.evaluate(`!!document.querySelector('[data-picker-portal]')`)
const popupOpen = (cdp) => cdp.evaluate(`!!document.querySelector(${JSON.stringify(TITLE_FIELD)})`)
const drafting = (cdp) => cdp.evaluate(`!!document.querySelector('[data-picker-portal] input')`)
const cell = (title, prop) => `[...document.querySelectorAll('.data-row')].find((r) => r.textContent.includes(${JSON.stringify(title)})).querySelectorAll('.data-cell')[${Object.keys(PROPS).indexOf(prop) + 1}]`
async function openCellPicker(cdp, title, prop) {
  while (await portalOpen(cdp)) await pressKey(cdp, 'Escape')
  await mouseClick(cdp, cell(title, prop))
  if (!(await portalOpen(cdp))) throw new Error(`${title}'s ${prop} picker did not open`)
}
async function newOption(cdp, title) {
  await click(cdp, sel('[data-picker-portal] [aria-label="New Option"]'))
  await sleep(500)
  if (title) await cdp.send('Input.insertText', { text: title })
}

async function proveNativeMenu(cdp, pid) {
  await openCellPicker(cdp, 'Drive One', 'Drive Select')
  await shot(cdp, 'table-picker-standard')
  await chooseNative(cdp, pid, pickerRow('Alpha'), { downs: 2 })
  if (!(await popupOpen(cdp))) throw new Error('The native menu did not reach Edit Option; the terminal needs Accessibility permission.')
  check('the native menu reaches Edit Option', true)
  await shot(cdp, 'table-popup-over-picker')
  await pressKey(cdp, 'Escape')
}

async function stepCreate(cdp) {
  await openCellPicker(cdp, 'Drive One', 'Drive Select')
  await newOption(cdp, 'Fresh')
  await shot(cdp, 'draft-standard')
  await enter(cdp)
  const fresh = defNamed('Drive Select').select_options.find((o) => o.value === 'Fresh')
  check('create: Fresh is appended with no color', optionValues('Drive Select').at(-1) === 'Fresh' && fresh && !('color' in fresh), JSON.stringify(optionValues('Drive Select')))
  check('create: Drive One still holds Alpha alone', lists('Drive One', 'Drive Select', 'Alpha') && !lists('Drive One', 'Drive Select', 'Fresh'))
  await shot(cdp, 'table-created')
}

async function stepRefuseBlankAndEscape(cdp) {
  const before = optionValues('Drive Select')
  await newOption(cdp, '')
  await enter(cdp)
  check('blank Enter adds nothing and closes the draft', JSON.stringify(optionValues('Drive Select')) === JSON.stringify(before) && !(await drafting(cdp)))
  await newOption(cdp, 'Nope')
  await pressKey(cdp, 'Escape')
  await sleep(600)
  check('Escape on a typed draft adds nothing', JSON.stringify(optionValues('Drive Select')) === JSON.stringify(before) && (await portalOpen(cdp)))
}

async function stepRefuseDuplicate(cdp) {
  const before = optionValues('Drive Select')
  await newOption(cdp, 'alpha')
  await enter(cdp)
  check('a case-variant duplicate is refused with a notice', JSON.stringify(optionValues('Drive Select')) === JSON.stringify(before) && (await cdp.evaluate(`!!document.querySelector('[role="alert"]')`)))
}

async function stepDragReorder(cdp) {
  await drag(cdp, pickerRow('Fresh'), pickerRow('Alpha'), () => shot(cdp, 'drag-band'))
  const order = optionValues('Drive Select')
  check('drag: Fresh lands above Alpha', order.indexOf('Fresh') === order.indexOf('Alpha') - 1, JSON.stringify(order))
  await shot(cdp, 'table-reordered')
}

async function stepStyleCompact(cdp, pid) {
  await chooseNative(cdp, pid, pickerRow('Alpha'), { downs: 1, into: [1] })
  await sleep(800)
  check('Style ▸ Compact lands in the view sidecar', driveView().column_styles?.[ids['Drive Select']]?.look === 'compact', JSON.stringify(driveView().column_styles))
  await openCellPicker(cdp, 'Drive One', 'Drive Select')
  await shot(cdp, 'table-picker-compact')
  await newOption(cdp, 'Compact')
  await shot(cdp, 'draft-compact')
  await pressKey(cdp, 'Escape')
  await chooseNative(cdp, pid, `document.querySelectorAll(${JSON.stringify(PICKER_ROWS)})[1]`, { downs: 1, into: [0] })
  await sleep(800)
  check('Style ▸ Standard lands in the view sidecar', driveView().column_styles?.[ids['Drive Select']]?.look === undefined, JSON.stringify(driveView().column_styles))
}

async function stepEditOption(cdp, pid) {
  await openCellPicker(cdp, 'Drive One', 'Drive Select')
  await chooseNative(cdp, pid, pickerRow('Beta'), { downs: 2 })
  await retitle(cdp, 'Gamma')
  check('popup rename: the registry and Drive Two read Gamma', optionValues('Drive Select').includes('Gamma') && lists('Drive Two', 'Drive Select', 'Gamma'), JSON.stringify(optionValues('Drive Select')))
  check('popup rename: the popup stays open on Gamma', (await popupOpen(cdp)) && (await cdp.evaluate(`${sel(TITLE_FIELD)}.value`)) === 'Gamma')
  await retitle(cdp, '')
  check('popup blank title: the field reads Gamma and nothing was written', (await cdp.evaluate(`${sel(TITLE_FIELD)}.value`)) === 'Gamma' && optionValues('Drive Select').includes('Gamma'))
  await click(cdp, sel('[data-picker-portal] button[aria-label="red-4"]'))
  await sleep(600)
  await click(cdp, sel('[data-picker-portal] [aria-label="Appearance"]'))
  await sleep(600)
  await click(cdp, sel('[data-picker-portal] [aria-label="Edit Icon"]'))
  await sleep(600)
  await click(cdp, sel('[data-picker-portal] button[title]'))
  await sleep(800)
  const gamma = defNamed('Drive Select').select_options.find((o) => o.value === 'Gamma')
  check('popup: color, appearance, and icon land on Gamma', gamma?.color !== undefined && gamma?.appearance === 'clear' && gamma?.icon !== undefined, JSON.stringify(gamma))
  await shot(cdp, 'table-popup-edited')
  while (await portalOpen(cdp)) await pressKey(cdp, 'Escape')
}

const confirmButton = (action) => `[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === ${JSON.stringify(action)} && b.closest('[aria-label]')?.getAttribute('aria-label').startsWith(${JSON.stringify(action)}))`
async function stepClearRemove(cdp, pid) {
  const r = await ask(cdp, 'mutate', { op: 'setProperty', path: 'Collection A/Set Alpha/Drive Two.md', propertyId: ids['Drive Select'], value: { kind: 'select', value: 'Alpha' } })
  check('clear: Drive Two holds Alpha', r.ok && lists('Drive Two', 'Drive Select', 'Alpha'), JSON.stringify(r))
  await openEditor(cdp, 'Drive Select')
  const alphaRow = `[...document.querySelectorAll('[data-line-row]')].find((r) => r.textContent.trim() === 'Alpha' && r.querySelector('[aria-label="Edit Option"]'))`
  await chooseNative(cdp, pid, alphaRow, { downs: 3 })
  check('Clear asks, naming the one Item holding Alpha', await cdp.evaluate(`document.body.innerText.includes('Clear “Alpha” from 1 Item?')`))
  await shot(cdp, 'editor-clear-confirm')
  await click(cdp, confirmButton('Clear'))
  await sleep(1000)
  check('Clear strips Alpha from every page and keeps the option', !lists('Drive Two', 'Drive Select', 'Alpha') && optionValues('Drive Select').includes('Alpha'))
  await chooseNative(cdp, pid, alphaRow, { downs: 4 })
  check('Remove asks, naming no Item', await cdp.evaluate(`document.body.innerText.includes('stripped from 0 Items.')`))
  await click(cdp, confirmButton('Remove'))
  await sleep(1000)
  check('Remove deletes Alpha from the registry', !optionValues('Drive Select').includes('Alpha'), JSON.stringify(optionValues('Drive Select')))
  while (await portalOpen(cdp)) await pressKey(cdp, 'Escape')
  await pressKey(cdp, 'Escape')
}

async function surfaceCreateDragMenu(cdp, pid, tag, title, { editOptionDowns }) {
  await newOption(cdp, title)
  await enter(cdp)
  check(`${tag}: ${title} is appended and assigned nowhere`, optionValues('Drive Select').at(-1) === title && !lists('Drive One', 'Drive Select', title) && !lists('Drive Two', 'Drive Select', title), JSON.stringify(optionValues('Drive Select')))
  await drag(cdp, pickerRow(title), `document.querySelectorAll(${JSON.stringify(PICKER_ROWS)})[0]`)
  check(`${tag}: ${title} drags to the top`, optionValues('Drive Select')[0] === title, JSON.stringify(optionValues('Drive Select')))
  await chooseNative(cdp, pid, pickerRow(title), { downs: editOptionDowns })
  check(`${tag}: Edit Option opens the popup`, await popupOpen(cdp))
  await shot(cdp, `${tag}-popup`)
  await pressKey(cdp, 'Escape')
  while (await portalOpen(cdp)) await pressKey(cdp, 'Escape')
}

async function stepCardsAndMass(cdp, pid) {
  const r = await ask(cdp, 'views:save', 'Collection A', 'collection', driveView(), { type: 'cards' })
  check('cards: the view switches to Cards', r.ok && driveView().type === 'cards')
  await sleep(1500)
  await mouseClick(cdp, `[...document.querySelectorAll('[data-rid]')].find((c) => c.textContent.includes('Drive One')).querySelector('.card-prop-row .card-value')`)
  if (!(await portalOpen(cdp))) throw new Error("Drive One's card picker did not open")
  await shot(cdp, 'card-picker')
  await surfaceCreateDragMenu(cdp, pid, 'cards', 'Card New', { editOptionDowns: 2 })
  const back = await ask(cdp, 'views:save', 'Collection A', 'collection', driveView(), { type: 'table' })
  check('mass: the view switches back to Table', back.ok && driveView().type === 'table')
  await sleep(1500)
  await sweep(cdp, await boxOf(cdp, cell('Drive One', 'Drive Select')), await boxOf(cdp, cell('Drive Two', 'Drive Select')), { steps: 6 })
  if (!(await portalOpen(cdp))) throw new Error('The mass picker did not open from the sweep')
  await shot(cdp, 'mass-picker')
  await surfaceCreateDragMenu(cdp, pid, 'mass', 'Mass New', { editOptionDowns: 2 })
}

async function stepPanel(cdp, pid) {
  const r = await ask(cdp, 'mutate', { op: 'setProperty', path: 'Collection A/Set Alpha/Drive One.md', propertyId: ids['Drive Select'], value: { kind: 'select', value: 'Fresh' } })
  check('panel: Drive One holds Fresh, so its row shows', r.ok && lists('Drive One', 'Drive Select', 'Fresh'), JSON.stringify(r))
  await sleep(800)
  await mouseClick(cdp, textEl('.data-row .cell-title-text', 'Drive One'))
  await sleep(1500)
  await mouseClick(cdp, `[...document.querySelectorAll('button')].find((b) => b.title === 'Settings')`)
  await sleep(800)
  await mouseClick(cdp, sel(`[data-property-row="${ids['Drive Select']}"]`))
  if (!(await portalOpen(cdp))) throw new Error("The Properties panel's picker did not open")
  await shot(cdp, 'panel-picker')
  await surfaceCreateDragMenu(cdp, pid, 'panel', 'Panel New', { editOptionDowns: 1 })
  await openDriveTable(cdp)
}

async function stepMulti(cdp) {
  await openCellPicker(cdp, 'Drive One', 'Drive Multi')
  await shot(cdp, 'multi-picker')
  await newOption(cdp, 'Three')
  await enter(cdp)
  check('multi: Three is appended and Drive One still holds One alone', optionValues('Drive Multi').at(-1) === 'Three' && lists('Drive One', 'Drive Multi', 'One') && !lists('Drive One', 'Drive Multi', 'Three'), JSON.stringify(optionValues('Drive Multi')))
  while (await portalOpen(cdp)) await pressKey(cdp, 'Escape')
}

const statusGroups = () => defNamed('Drive Status').status_groups
async function openEditor(cdp, name) {
  await mouseClick(cdp, `[...document.querySelectorAll('button')].find((b) => b.title === 'Settings')`)
  await sleep(800)
  await click(cdp, `[...document.querySelectorAll('button, [role=button]')].find((b) => b.textContent.trim() === 'Properties')`)
  await sleep(800)
  await click(cdp, `${textEl('span', name)}.closest('[role=button],button,[data-line-row]')`)
  await sleep(1000)
}

async function stepEditor(cdp, pid) {
  await openEditor(cdp, 'Drive Status')
  await shot(cdp, 'editor')
  const firstRow = `[...document.querySelectorAll('[data-line-row]')].find((r) => r.querySelector('[aria-label="Edit Option"]'))`
  const first = statusGroups()[0].options[0].value
  await chooseNative(cdp, pid, firstRow, { downs: 2 })
  check('editor: Edit Option opens the popup', await popupOpen(cdp))
  await retitle(cdp, 'Opened')
  check('editor: the popup rename lands in status_groups', statusGroups()[0].options[0].value === 'Opened' && !statusGroups().flatMap((g) => g.options).some((o) => o.value === first), JSON.stringify(statusGroups()[0].options))
  await pressKey(cdp, 'Escape')
  await click(cdp, `${firstRow}.querySelector('[aria-label="Edit Option"]')`)
  await sleep(500)
  const opened = await popupOpen(cdp)
  await click(cdp, `${firstRow}.querySelector('[aria-label="Edit Option"]')`)
  await sleep(800)
  check('editor: the pen opens and closes the popup', opened && !(await popupOpen(cdp)))
  const count = statusGroups().flatMap((g) => g.options).length
  await click(cdp, sel('[aria-label^="Add to"]'))
  await sleep(500)
  await shot(cdp, 'editor-draft')
  await enter(cdp)
  check('editor: a blank + adds nothing and closes the draft', statusGroups().flatMap((g) => g.options).length === count && !(await drafting(cdp)))
  await click(cdp, sel('[aria-label^="Add to"]'))
  await sleep(500)
  await cdp.send('Input.insertText', { text: 'Added' })
  await enter(cdp)
  check('editor: + appends Added to the first group', statusGroups()[0].options.at(-1)?.value === 'Added' && statusGroups().flatMap((g) => g.options).length === count + 1, JSON.stringify(statusGroups()[0].options))
  const heading = `[...document.querySelectorAll('span')].find((e) => e.children.length === 0 && e.textContent.trim() === ${JSON.stringify(statusGroups()[0].label)} && !e.closest('[data-line-row]'))`
  await cdp.evaluate(`(${heading}).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))`)
  await sleep(400)
  await cdp.evaluate(`document.activeElement.select()`)
  await cdp.send('Input.insertText', { text: 'Queued' })
  await enter(cdp)
  check("editor: the heading's inline rename relabels the group", statusGroups()[0].label === 'Queued', JSON.stringify(statusGroups()[0].label))
  while (await portalOpen(cdp)) await pressKey(cdp, 'Escape')
  await pressKey(cdp, 'Escape')
}

async function stepHostRefusal(cdp) {
  const r = await ask(cdp, 'property:editOption', ids['Drive Select'], { op: 'add', groupId: 'select', title: '' })
  check('the host refuses a blank option title', r.ok === false, JSON.stringify(r))
}

execFileSync('npm', ['run', 'build'], { cwd: REPO, stdio: ['ignore', 'ignore', 'inherit'] })
const backup = mkdtempSync(join(tmpdir(), 'pommora-live-'))
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
  await until('the sidebar', () => cdp.evaluate(`!!document.querySelector('.row span')`))
  await sleep(3000)
  await seed(cdp)
  await proveNativeMenu(cdp, pid)
  await stepCreate(cdp)
  await stepRefuseBlankAndEscape(cdp)
  await stepRefuseDuplicate(cdp)
  await stepDragReorder(cdp)
  await stepStyleCompact(cdp, pid)
  await stepEditOption(cdp, pid)
  await stepCardsAndMass(cdp, pid)
  await stepPanel(cdp, pid)
  await stepMulti(cdp)
  await stepEditor(cdp, pid)
  await stepClearRemove(cdp, pid)
  await stepHostRefusal(cdp)
  cdp.close()
} catch (e) {
  check(`the run reached its end`, false, String(e?.stack ?? e))
  if (cdp) {
    await shot(cdp, 'failure').catch(() => {})
    console.log(await cdp.evaluate(`JSON.stringify({ url: location.href, buttons: [...document.querySelectorAll('button')].map((b) => b.title || b.getAttribute('aria-label') || b.textContent.trim().slice(0, 20)).slice(0, 40), text: document.body.innerText.slice(0, 400) })`).catch((err) => String(err)))
  }
} finally {
  await restore()
}
console.log(`${results.filter((r) => r.pass).length}/${results.length} passed`)
process.exit(results.every((r) => r.pass) ? 0 : 1)
