import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  ask, boxOf, click, hover, closeSettings, escapeAll, FM, inMain, labels, launch, menuByEvent, mintPageId, mouseClick, must, NEXUS,
  openSettings, phasedItem, pickNative, popNative, pressKey, press, restore, settles, SETTINGS_BUTTON, shot, sleep, SWITCH, tally,
  typeText, until,
} from '../drive-harness.mjs'
import { parse } from 'yaml'

const PORT = 9423
const BUILT = ['2', '3', '4', '5', '6', '7']
const argv = process.argv.slice(2)
const at = argv.indexOf('--landed')
const LANDED = at >= 0 ? Number(argv[at + 1]) : NaN
const GROUPS = new Set(argv.filter((a, i) => i !== at && i !== at + 1))
if (!Number.isInteger(LANDED) || GROUPS.size === 0 || [...GROUPS].some((g) => !BUILT.includes(g))) {
  console.error(`usage: node live-drive.mjs <group…> --landed <phase>   (groups ${BUILT.join(', ')}; 8 to 10 land at their checkpoints; --landed 0 is the baseline)`)
  process.exit(2)
}

// ── Items ───────────────────────────────────────────────────────────────────

const item = phasedItem(LANDED)
/** A behavior change, owned by the phase its group is numbered for. */
const bc = (group, n, decision, name, pass, detail) => item(group, Number(group), `BC${n} ${decision}`, name, pass, detail)
/** A behavior a phase's checkpoint fold lands, owned by that phase and tagged `F<phase> <tag>`. */
const fold = (group, tag, name, pass, detail) => item(group, Number(group), `F${group} ${tag}`, name, pass, detail)
/** A crossing the phase rewired, owned by phase 0, so it holds at every head. */
const reg = (group, name, pass, detail) => item(group, 0, `R P${group}`, name, pass, detail)
const show = (v) => JSON.stringify(v)
const same = (a, b) => show(a) === show(b)

// ── Drift: selector differences between the closed phases, keyed by the last phase landed ─

const DRIFT = {
  /** Task 4-3 renamed the shell the Table and Archive wear. */
  shell: LANDED >= 4 ? '.table-shell' : '.table-view',
  /** Task 4-1 replaced the Trash's own heading classes with the bundle table's `.col-header` cells. */
  trashTitleHead: LANDED >= 4 ? '.trash-frame .table-head .col-header:first-child' : '.trash-head-name',
  trashDateHead: LANDED >= 4 ? '.trash-frame .table-head .col-header:last-child' : '.trash-head-date',
  /** Task 3-3 relabeled the views dropdown's placeholder. */
  more: LANDED >= 3 ? 'More actions' : 'More',
  /** Task 3-3 renamed both page-icon switches; the label is BC3's own case, and the toggle crossing finds the switch by it. */
  titleIcons: (kind) => (LANDED >= 3 ? 'Title Icons' : kind === 'cards' ? 'Hide Icons' : 'Page Icons'),
  /** Task 7-1 renamed the disclosure chevron's attribute. */
  chevron: LANDED >= 7 ? '[data-chevron]' : '[data-drop-outline]',
  /** Phase 7's checkpoint removed the bundle table's date class; a row's last cell is its date. */
  bundleDate: LANDED >= 7 ? '.data-cell:last-child' : '.bundle-date',
}

// ── The Nexus on disk ───────────────────────────────────────────────────────

const COLLECTION = 'Collection A'
const SIDECAR = `${COLLECTION}/_pagecollection.json`
const abs = (rel) => join(NEXUS, rel)
const readRel = (rel) => readFileSync(abs(rel), 'utf8')
const frontOf = (rel) => parse(FM.exec(readRel(rel))?.[1] ?? '') ?? {}
const viewOnDisk = (id) => JSON.parse(readRel(SIDECAR)).views.find((v) => v.id === id)
const sidecarOnDisk = () => JSON.parse(readRel(SIDECAR))

const IDS = {
  alpha: '01KSR49GMRK0EA1TQ9E9RX4Y78',
  beta: '01KSR49HM0K5861MA80JE8GVA1',
  subA: '01KSR49NH0C1KE3XAQQ3BW79TP',
  subB: '01KSR49QFGHT29TQJCPK7REV5W',
}
const PAGES = {
  'Page A': { id: '01KSR49DQ0P48X68X71R6G8Z6J', path: 'Collection A/Set Alpha/Page A.md' },
  'Page B': { id: '01KSR49EP8P479QN3EVW9BCSRG', path: 'Collection A/Set Alpha/Page B.md' },
  'Page C': { id: '01KSR49FNGPRPCP80E3F8DQ08K', path: 'Collection A/Set Alpha/Page C.md' },
  'Alpha 1': { id: '01KSR49JK8PC11KBN4CT7QCGG7', path: 'Collection A/Set Beta/Sub-Set A/Alpha 1.md' },
  'Alpha 2': { id: '01KSR49KJGPX0199PNNTTJHKJW', path: 'Collection A/Set Beta/Sub-Set A/Alpha 2.md' },
  'Alpha 3': { id: '01KSR49MHRP5XZ51E9TG2SEZYP', path: 'Collection A/Set Beta/Sub-Set A/Alpha 3.md' },
  'Beta 1': { id: '01KSR49PG8PNMNYNC79QK4MFP9', path: 'Collection A/Set Beta/Sub-Set B/Beta 1.md' },
}
const titleOf = (id) => Object.keys(PAGES).find((t) => PAGES[t].id === id) ?? id

const STAGE = {
  id: 'prop_vd_stage', label: 'VD Stage', key: 'VD Stage', type: 'select',
  select_options: [
    { id: 'opt_vd_todo', key: 'Todo', label: 'Todo' },
    { id: 'opt_vd_doing', key: 'Doing', label: 'Doing' },
    { id: 'opt_vd_done', key: 'Done', label: 'Done' },
  ],
}
const DONE = { id: 'prop_vd_done', label: 'VD Done', key: 'VD Done', type: 'checkbox' }
const DUE = { id: 'prop_vd_due', label: 'VD Due', key: 'VD Due', type: 'dateTime' }
const DEFS = [STAGE, DONE, DUE]
/** Every option but Done holds a page, so Done is the empty option band E-3 reaches. */
const STAGES = { 'Page A': 'opt_vd_todo', 'Page B': 'opt_vd_doing', 'Page C': 'opt_vd_todo', 'Alpha 1': 'opt_vd_todo', 'Alpha 2': 'opt_vd_doing', 'Beta 1': 'opt_vd_doing' }

const mutate = (cdp, req) => must(`${req.op}`, ask(cdp, 'mutate', req))
const views = async (cdp) => (await ask(cdp, 'nexus:state')).value.tree.collections.find((c) => c.path === COLLECTION)?.views ?? []
/** A view written whole through the channel, then shown. */
async function showView(cdp, view) {
  await must(`save ${view.name}`, ask(cdp, 'views:save', COLLECTION, 'collection', view, {}))
  await mutate(cdp, { op: 'setActiveView', path: COLLECTION, kind: 'collection', viewId: view.id })
  await until(`${view.name} shown`, async () => (await cdp.evaluate(`document.querySelector('button[title=Views]')?.textContent ?? ''`)).includes(view.name))
  await sleep(700)
}
/** A view id the drive owns, one per configuration, so a save always writes a fresh view whole. */
const vid = (tag) => `view_01KZVD${tag.toUpperCase().padStart(20, '0')}`
const tableView = (id, name, extra = {}) => ({ id, name, type: 'table', property_order: ['_title', STAGE.id, DONE.id, DUE.id], hidden_properties: [], ...extra })
const cardsView = (id, name, extra = {}) => ({ id, name, type: 'cards', property_order: ['_title', STAGE.id], hidden_properties: [], ...extra })

/** The registry, its assignment, and each page's stage, written once for every group. */
async function seed(cdp) {
  writeFileSync(abs('.nexus/properties.json'), JSON.stringify({ defs: Object.fromEntries(DEFS.map((d) => [d.id, d])), order: DEFS.map((d) => d.id) }, null, 2))
  await until('the definitions', async () => (await ask(cdp, 'nexus:state')).value.tree.config.registry.length === DEFS.length)
  for (const d of DEFS) await mutate(cdp, { op: 'assignProperty', containerPath: COLLECTION, propertyId: d.id })
  for (const [title, opt] of Object.entries(STAGES))
    await mutate(cdp, { op: 'setProperty', path: PAGES[title].path, propertyId: STAGE.id, value: { kind: 'select', value: opt } })
  await until('the stages', async () => Object.entries(STAGES).every(([t]) => frontOf(PAGES[t].path)[STAGE.key]))
}

// ── The host's round trip, widened ─────────────────────────────────────────

/** Wraps `mutate` and `views:save` in the main process once, so a drive rule can hold a reply or refuse it; a rule matches one call and is spent. */
const GATE = `(() => {
  const { ipcMain } = process.mainModule.require('electron')
  const g = (globalThis.__vdGate ??= { orig: new Map(), rules: [] })
  for (const ch of ['mutate', 'views:save']) {
    if (g.orig.has(ch)) continue
    const f = ipcMain._invokeHandlers.get(ch)
    g.orig.set(ch, f)
    ipcMain._invokeHandlers.set(ch, async (e, ...args) => {
      const rule = g.rules.find((r) => r.channel === ch && r.match(args))
      if (rule) {
        g.rules.splice(g.rules.indexOf(rule), 1)
        await new Promise((r) => setTimeout(r, rule.delay))
        if (rule.refuse) return { ok: false, error: { message: 'Refused by the drive.' } }
      }
      return f(e, ...args)
    })
  }
  return true
})()`
/** Holds the next `channel` call `match` (a function source over the call's arguments) accepts for `delay` ms, refusing it when `refuse`. */
async function hold(channel, match, delay, refuse = false) {
  await inMain(GATE)
  await inMain(`globalThis.__vdGate.rules.push({ channel: ${JSON.stringify(channel)}, match: ${match}, delay: ${delay}, refuse: ${refuse} })`)
}
const ungate = () => inMain(`(() => { const g = globalThis.__vdGate; if (!g) return; g.rules.length = 0; const { ipcMain } = process.mainModule.require('electron'); for (const [ch, f] of g.orig) ipcMain._invokeHandlers.set(ch, f); delete globalThis.__vdGate })()`)

// ── Surfaces ────────────────────────────────────────────────────────────────

const VIEWS_BUTTON = `document.querySelector('button[title="Views"]')`
const visible = (list) => `${list}.find((e) => e.getClientRects().length > 0 && !e.closest('[inert]'))`
const ctl = (aria) => visible(`[...document.querySelectorAll(${JSON.stringify(`[aria-label="${aria}"]`)})]`)
const btn = (text) => visible(`[...document.querySelectorAll('[role=button]')].filter((e) => e.textContent.trim() === ${JSON.stringify(text)})`)
const BACK_BAR = visible(`[...document.querySelectorAll('[role=button]')].filter((e) => e.querySelector('.lucide-chevron-left'))`)
const glyphOf = (expr) => `[...((${expr})?.querySelector('svg')?.classList ?? [])].find((c) => c.startsWith('lucide-')) ?? null`
/** The glyph leading the row a control sits in: the first glyph of the nearest ancestor holding one outside the control. */
const rowGlyph = (expr) => `(() => { const c = (${expr}); let el = c?.parentElement; while (el) { const g = [...el.querySelectorAll('svg')].find((s) => !c.contains(s)); if (g) return [...g.classList].find((x) => x.startsWith('lucide-')) ?? null; el = el.parentElement } return null })()`
const PORTAL_ROWS = `[...document.querySelectorAll('[data-picker-portal]:not([data-dismissal-shield]) [role=button]')]`
const portalRow = (text) => `${PORTAL_ROWS}.find((e) => e.textContent.trim() === ${JSON.stringify(text)})`
const PORTAL_PANE = `[...document.querySelectorAll('[data-picker-portal]:not([data-dismissal-shield])')].at(-1)?.firstElementChild`

/** A press on an element scrolled into its list's view first, since a press lands where the element is drawn. */
async function pressIn(cdp, expr) {
  await cdp.evaluate(`(${expr}).scrollIntoView({ block: 'center' })`)
  await sleep(300)
  await mouseClick(cdp, expr)
}
const pressed = (cdp, expr) => cdp.evaluate(`(${expr})?.getAttribute('aria-pressed') === 'true'`)
/** Every pane and dropdown closed. */
async function closeAll(cdp) {
  await escapeAll(cdp)
  for (let i = 0; i < 3 && (await cdp.evaluate(`!!${BACK_BAR}`)); i++) await pressKey(cdp, 'Escape')
  if (await pressed(cdp, SETTINGS_BUTTON)) await mouseClick(cdp, SETTINGS_BUTTON)
  if (await pressed(cdp, VIEWS_BUTTON)) await mouseClick(cdp, VIEWS_BUTTON)
  await sleep(300)
}
/** Opens a view pane through one of its two doors: the toolbar's Settings, or the views dropdown's editor for the shown view. */
async function door(cdp, which, pane) {
  await closeAll(cdp)
  if (which === 'settings') {
    await mouseClick(cdp, SETTINGS_BUTTON)
    await until('the Settings pane', async () => cdp.evaluate(`!!${btn('Visibility')}`))
  } else {
    const name = await cdp.evaluate(`${VIEWS_BUTTON}.textContent.trim()`)
    await mouseClick(cdp, VIEWS_BUTTON)
    await until('the views dropdown', async () => cdp.evaluate(`!!${ctl(`Edit ${name}`)}`))
    await pressIn(cdp, ctl(`Edit ${name}`))
    await until('the view editor', async () => cdp.evaluate(`!!${btn('Layout')}`))
  }
  await sleep(500)
  if (pane) {
    await mouseClick(cdp, btn(pane))
    await until(`the ${pane} pane`, async () => cdp.evaluate(`!!${BACK_BAR}`))
    await sleep(600)
  }
}
/** A setting the Settings window holds, switched to `on`. */
async function setting(cdp, label, on) {
  await openSettings(cdp, 'Interface')
  if ((await cdp.evaluate(`(${SWITCH(label)}).getAttribute('aria-checked') === 'true'`)) !== on) await press(cdp, SWITCH(label))
  await settles(async () => (await cdp.evaluate(`(${SWITCH(label)}).getAttribute('aria-checked') === 'true'`)) === on)
  await closeSettings(cdp)
}

const shownRids = (cdp) => cdp.evaluate(`[...document.querySelectorAll('.data-row[data-rid]')].filter((r) => r.getClientRects().length).map((r) => r.dataset.rid)`)
const shownTitles = async (cdp) => (await shownRids(cdp)).map(titleOf)

/** A press at `a`, carried to `b` in steps with the button held, `held` run before the release. */
async function dragPoints(cdp, a, b, { steps = 12, held, settle = 900 } = {}) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x, y: a.y, button: 'none' })
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: a.x, y: a.y, button: 'left', buttons: 1, clickCount: 1 })
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x + ((b.x - a.x) * i) / steps, y: a.y + ((b.y - a.y) * i) / steps, button: 'left', buttons: 1 })
    await sleep(16)
  }
  if (held) await held()
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', buttons: 0, clickCount: 1 })
  await sleep(settle)
}
/** Right-clicks `expr` and chooses `label` from the menu it pops, native or in-app, answering the menu's labels. */
async function menuChoose(cdp, expr, label) {
  const box = await boxOf(cdp, expr)
  const rows = await popNative(cdp, box)
  if (rows) {
    await pickNative([label].flat())
    await sleep(800)
    return labels(rows)
  }
  const drawn = await cdp.evaluate(`${PORTAL_ROWS}.map((e) => e.textContent.trim())`)
  if (drawn.includes(label)) await click(cdp, portalRow(label))
  await sleep(800)
  return drawn
}
/** Where a row, cell, or heading leads: its content box's left edge, its first glyph, and its first text, a hidden measuring copy aside. */
const leadOf = (expr) => `(() => {
  const el = (${expr}); if (!el) return null
  const cs = getComputedStyle(el); const box = el.getBoundingClientRect()
  const content = box.left + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth)
  const w = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
  let glyph = null, text = null
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const host = n.nodeType === 1 ? n : n.parentElement
    if (host.getClientRects().length === 0 || getComputedStyle(host).visibility === 'hidden') continue
    if (n.nodeType === 1 && n.tagName.toLowerCase() === 'svg' && !glyph) glyph = n.getBoundingClientRect()
    if (n.nodeType === 3 && n.textContent.trim() && !text) { const r = document.createRange(); r.selectNodeContents(n); text = r.getBoundingClientRect() }
  }
  const lead = Math.min(glyph?.left ?? Infinity, text?.left ?? Infinity)
  return { content, lead, glyphRight: glyph?.right ?? null, textLeft: text?.left ?? null }
})()`
const near = (a, b, tol = 1) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= tol

// ── Group 2 — The Views Root and the Live View ──────────────────────────────

const byStage = { group: { kind: 'property', property_id: STAGE.id, order_mode: 'configured' } }
/** The drawn rows a band holds, by title: the rows between its head and the next head. */
const bandRows = (cdp, label) => cdp.evaluate(`(() => {
  const h = [...document.querySelectorAll('.group-band-head')].find((e) => e.getAttribute('aria-label') === ${JSON.stringify(label)} && e.getClientRects().length)
  const band = h?.closest('.group-band')
  return band ? [...band.querySelectorAll('.data-row[data-rid]')].map((r) => r.dataset.rid) : null
})()`).then((ids) => ids?.map(titleOf) ?? null)
const gripDrag = async (cdp, title, to, opts) => {
  await hover(cdp, dataRow(title), 300)
  const grip = await boxOf(cdp, `(${dataRow(title)}).querySelector('.row-grip')`)
  await dragPoints(cdp, { x: grip.x, y: grip.y }, to, opts)
}

async function group2(cdp) {
  const g = '2'

  // BC1 · a refused cross-band drop that a later write composed over returns its row to its prior slot, with the view's manual order stored and absent.
  const refusedDrop = async (view) => {
    await showView(cdp, view)
    const todoBefore = await bandRows(cdp, 'Todo')
    await hold('mutate', `(args) => JSON.stringify(args).includes(${JSON.stringify(PAGES['Page A'].path)})`, 3500, true)
    const beta1 = await boxOf(cdp, dataRow('Beta 1'))
    await gripDrag(cdp, 'Page A', { x: beta1.x, y: beta1.bottom - 3 }, { settle: 300 })
    const staged = await bandRows(cdp, 'Doing')
    const alpha1 = await boxOf(cdp, dataRow('Alpha 1'))
    await gripDrag(cdp, 'Alpha 1', { x: alpha1.x, y: (await boxOf(cdp, dataRow('Page C'))).top + 3 }, { settle: 300 })
    await sleep(4500)
    const todoAfter = await bandRows(cdp, 'Todo')
    const disk = (viewOnDisk(view.id)?.manual_order ?? []).map(titleOf)
    return { todoBefore, staged, todoAfter, disk, value: frontOf(PAGES['Page A'].path)[STAGE.key] }
  }
  const aFirst = (list) => list.indexOf('Page A') >= 0 && list.indexOf('Page A') < list.indexOf('Page C') && list.indexOf('Page A') < list.indexOf('Alpha 1')
  const returned = (r) => r.staged?.includes('Page A') && same(r.value, ['Todo']) && aFirst(r.todoAfter ?? []) && aFirst(r.disk)
  const stored = Object.values(PAGES).map((p) => p.id)
  const ranked = await refusedDrop(tableView(vid('g2ranked'), 'VD Ranked', { ...byStage, manual_order: stored }))
  bc(g, 1, 'I-070', 'with a stored manual order, a refused drop of Page A into Doing, with Alpha 1 reordered over it meanwhile, returns Page A to the head of Todo', returned(ranked), show(ranked))
  const V2 = tableView(vid('g2refused'), 'VD Refused', byStage)
  const unranked = await refusedDrop(V2)
  bc(g, 1, 'I-070', 'a refused drop of Page A into Doing, with Alpha 1 reordered over it meanwhile, returns Page A to the head of Todo', returned(unranked), show(unranked))
  reg(g, 'the reorder made during the refused drop\'s round trip stands: Alpha 1 above Page C', [ranked, unranked].every((r) => (r.todoAfter ?? []).indexOf('Alpha 1') >= 0 && r.todoAfter.indexOf('Alpha 1') < r.todoAfter.indexOf('Page C')), show([ranked.todoAfter, unranked.todoAfter]))
  await shot(cdp, 'g2-refused')

  // Regression: the view button's toggle, now the setViewButton op.
  const toggled = await menuChoose(cdp, VIEWS_BUTTON, 'Show Title')
  const labeled = await settles(async () => sidecarOnDisk().view_button === 'labeled')
  reg(g, 'the view button\'s menu Show Title saves view_button labeled', toggled.includes('Show Title') && labeled, show({ toggled, key: sidecarOnDisk().view_button }))
  const untoggled = await menuChoose(cdp, VIEWS_BUTTON, 'Hide Title')
  reg(g, 'Hide Title takes it back to the icon', untoggled.includes('Hide Title') && (await settles(async () => (sidecarOnDisk().view_button ?? 'icon') === 'icon')), show({ untoggled, key: sidecarOnDisk().view_button }))

  // Regression: the shown-column predicate, through the Visibility pane and the heading.
  await door(cdp, 'settings', 'Visibility')
  await mouseClick(cdp, ctl(`Hide ${DONE.label}`))
  const hid = await settles(async () => (viewOnDisk(V2.id)?.hidden_properties ?? []).includes(DONE.id))
  await closeAll(cdp)
  reg(g, 'Visibility\'s eye hides VD Done from the view and its heading', hid && !(await headTexts(cdp)).includes(DONE.label), show({ disk: viewOnDisk(V2.id)?.hidden_properties, drawn: await headTexts(cdp) }))
  await door(cdp, 'settings', 'Visibility')
  await mouseClick(cdp, ctl(`Show ${DONE.label}`))
  const shownAgain = await settles(async () => !(viewOnDisk(V2.id)?.hidden_properties ?? []).includes(DONE.id))
  await closeAll(cdp)
  reg(g, 'its eye shows VD Done again', shownAgain && (await headTexts(cdp)).includes(DONE.label), show(await headTexts(cdp)))

  // Regression: the Filter's targets, now plain options.
  await door(cdp, 'settings', 'Filter')
  await mouseClick(cdp, ctl('Filter property'))
  await until('the property list', async () => cdp.evaluate(`${PORTAL_ROWS}.length > 0`), 3000).catch(() => {})
  const targets = await cdp.evaluate(`${PORTAL_ROWS}.map((e) => e.textContent.trim())`)
  await closeAll(cdp)
  reg(g, 'the Filter\'s property list offers Title, Location, and the Collection\'s properties', ['Title', 'Location', STAGE.label, DONE.label, DUE.label].every((t) => targets.includes(t)), show(targets))

  // Regression: a Date cell reads the Nexus's date form.
  await mutate(cdp, { op: 'setProperty', path: PAGES['Page A'].path, propertyId: DUE.id, value: { kind: 'dateTime', value: '2026-10-22' } })
  const due = await settles(async () => /2026|26/.test(await cdp.evaluate(`(${dataRow('Page A')}).querySelectorAll('.data-cell')[3]?.textContent ?? ''`)))
  reg(g, 'a Date cell draws its value in the Nexus\'s date form', due, show(await cdp.evaluate(`(${dataRow('Page A')}).querySelectorAll('.data-cell')[3]?.textContent ?? ''`)))

  // Regression: a sorted, ungrouped view reassigns a row dropped into another value's run.
  const V2S = tableView(vid('g2sortrun'), 'VD Sort Run', { group: { kind: 'flat' }, sort: [{ property_id: STAGE.id, direction: 'ascending' }] })
  await showView(cdp, V2S)
  const run = await shownTitles(cdp)
  const lastDoing = run.filter((t) => STAGES[t] === 'opt_vd_doing').at(-1)
  const target = await boxOf(cdp, dataRow(lastDoing))
  await gripDrag(cdp, 'Page C', { x: target.x, y: target.top + 3 })
  const reassigned = await settles(async () => same(frontOf(PAGES['Page C'].path)[STAGE.key], ['Doing']))
  reg(g, 'Page C dropped inside the Doing run of a view sorted by VD Stage takes Doing', reassigned, show({ run, value: frontOf(PAGES['Page C'].path)[STAGE.key] }))
  await mutate(cdp, { op: 'setProperty', path: PAGES['Page C'].path, propertyId: STAGE.id, value: { kind: 'select', value: STAGES['Page C'] } })

  // Regression: a created page is placed beside its anchor in the Set's order.
  const V2C = tableView(vid('g2create'), 'VD Create')
  await showView(cdp, V2C)
  const made = await birth(cdp, async () => {
    await hover(cdp, dataRow('Page A'), 1500)
    await mouseClick(cdp, `document.querySelector('.data-row.ghost-row')`)
  }, 'VD Beside')
  const order = JSON.parse(readRel('Collection A/Set Alpha/_pageset.json')).page_order ?? []
  const drawnAfter = await shownTitles(cdp)
  reg(g, 'a page created from the ghost after Page A draws after it and is ordered after it in Set Alpha', made.landed && order.indexOf(made.first?.rid) === order.indexOf(PAGES['Page A'].id) + 1 && drawnAfter.indexOf(made.first?.rid) === drawnAfter.indexOf('Page A') + 1, show({ order: order.map(titleOf), drawnAfter }))
  await trashPage(cdp, made.at)

  // Regression: deleting a view from the dropdown, then its Undo.
  const V2D = tableView(vid('g2delete'), 'VD Doomed')
  await showView(cdp, V2D)
  await closeAll(cdp)
  await mouseClick(cdp, VIEWS_BUTTON)
  await until('the views dropdown', async () => cdp.evaluate(`!!${btn('VD Doomed')}`))
  await cdp.evaluate(`(${btn('VD Doomed')}).scrollIntoView({ block: 'center' })`)
  await menuChoose(cdp, btn('VD Doomed'), 'Delete')
  if (await settles(async () => cdp.evaluate(`!!document.querySelector('[role="alertdialog"]')`), 2000))
    await click(cdp, `[...document.querySelector('[role="alertdialog"]').querySelectorAll('button')].find((b) => b.textContent.trim() === 'Delete')`)
  const gone = await settles(async () => !viewOnDisk(V2D.id))
  const undo = `[...document.querySelectorAll('[role=status] button, [role=alert] button')].find((b) => b.textContent.trim() === 'Undo')`
  const offered = await settles(async () => cdp.evaluate(`!!(${undo})`), 3000)
  if (offered) await click(cdp, undo)
  const restored = await settles(async () => !!viewOnDisk(V2D.id))
  reg(g, 'a view deleted from the dropdown leaves the sidecar and its notice\'s Undo restores it', gone && offered && restored, show({ gone, offered, restored }))
  await closeAll(cdp)
}

// ── Group 3 — One Pane Route ────────────────────────────────────────────────

const V3_TABLE = tableView(vid('g3table'), 'VD Table')
const V3_CARDS = cardsView(vid('g3cards'), 'VD Cards')

async function group3(cdp) {
  const g = '3'

  // BC2 · the toolbar's button reads the staged name and icon while the write is held.
  await showView(cdp, V3_TABLE)
  await door(cdp, 'editor')
  await mouseClick(cdp, ctl('Title'))
  await until('the title field', async () => cdp.evaluate(`document.activeElement?.tagName === 'INPUT'`))
  await hold('views:save', '() => true', 2500)
  await cdp.evaluate('document.activeElement.select()')
  await typeText(cdp, 'VD Staged')
  await pressKey(cdp, 'Enter')
  await sleep(300)
  const staged = { button: await cdp.evaluate(`${VIEWS_BUTTON}.textContent.trim()`), disk: viewOnDisk(V3_TABLE.id)?.name }
  bc(g, 2, '1.11', 'a rename from the editor\'s title shows on the toolbar\'s button while its write is held', staged.button === 'VD Staged' && staged.disk === 'VD Table', show(staged))
  const landed = await settles(async () => viewOnDisk(V3_TABLE.id)?.name === 'VD Staged')
  reg(g, 'the editor\'s title rename lands in the sidecar and the button keeps it', landed && (await cdp.evaluate(`${VIEWS_BUTTON}.textContent.trim()`)) === 'VD Staged', show(viewOnDisk(V3_TABLE.id)?.name))

  await mouseClick(cdp, ctl('Edit Icon'))
  await until('the icon picker', async () => cdp.evaluate(`!!document.querySelector('[data-picker-portal] .lucide-activity')`))
  await hold('views:save', '() => true', 2500)
  await mouseClick(cdp, `document.querySelector('[data-picker-portal] .lucide-activity').closest('button')`)
  await sleep(300)
  const iconed = { button: await cdp.evaluate(glyphOf(VIEWS_BUTTON)), disk: viewOnDisk(V3_TABLE.id)?.icon ?? null }
  bc(g, 2, '1.11', 'an icon picked in the editor shows on the toolbar\'s button while its write is held', iconed.button === 'lucide-activity' && iconed.disk !== 'activity', show(iconed))
  reg(g, 'the picked icon lands in the sidecar', await settles(async () => viewOnDisk(V3_TABLE.id)?.icon === 'activity'), show(viewOnDisk(V3_TABLE.id)?.icon))
  await shot(cdp, 'g3-staged')

  // Regression: every pane through both doors.
  for (const pane of ['Visibility', 'Layout', 'Group', 'Filter', 'Sort']) {
    await door(cdp, 'settings', pane)
    const bar = await cdp.evaluate(`${BACK_BAR}?.textContent.trim() ?? ''`)
    reg(g, `the Settings door opens ${pane}`, bar.startsWith('Settings') && bar.length > 'Settings'.length, show(bar))
  }
  for (const pane of ['Layout', 'Group', 'Filter', 'Sort']) {
    await door(cdp, 'editor', pane)
    const bar = await cdp.evaluate(`${BACK_BAR}?.textContent.trim() ?? ''`)
    reg(g, `the editor door opens ${pane}`, bar.startsWith('Views') && bar.length > 'Views'.length, show(bar))
  }

  // BC3 · both page-icon switches read Title Icons with file-text, on meaning shown, through both doors.
  const titleIconsSwitch = async (kind, which) => {
    await door(cdp, which, 'Layout')
    const sw = ctl(DRIFT.titleIcons(kind))
    const read = await cdp.evaluate(`({ label: (${sw})?.getAttribute('aria-label') ?? null, checked: (${sw})?.getAttribute('aria-checked') ?? null, glyph: ${rowGlyph(sw)}, title: !!(${ctl('Title Icons')}) })`)
    return read
  }
  for (const [kind, view] of [['table', tableView(vid('g3icons'), 'VD Icons')], ['cards', V3_CARDS]]) {
    await showView(cdp, view)
    for (const which of ['settings', 'editor']) {
      const r = await titleIconsSwitch(kind, which)
      bc(g, 3, 'F-2', `${kind === 'table' ? "Table's" : "Cards'"} page-icon switch reads Title Icons with file-text, checked while icons show, through the ${which === 'settings' ? 'Settings' : 'editor'} door`,
        r.title && r.label === 'Title Icons' && r.glyph === 'lucide-file-text' && r.checked === 'true', show(r))
    }
    // The toggle from icons shown hides them and writes the persisted key.
    await door(cdp, 'settings', 'Layout')
    const glyphs = () => cdp.evaluate(`[...document.querySelectorAll('${kind === 'table' ? `${DRIFT.shell} .data-row .cell-title svg` : '.cards-view .card svg.lucide-file-text'}')].filter((s) => !s.closest('.card-thumb')).length`)
    const before = await glyphs()
    await mouseClick(cdp, ctl(DRIFT.titleIcons(kind)))
    const wrote = await settles(async () => viewOnDisk(view.id)?.hide_page_icons === true)
    await closeAll(cdp)
    const after = await glyphs()
    reg(g, `${kind === 'table' ? "Table's" : "Cards'"} page-icon switch hides the title glyphs and writes hide_page_icons`, wrote && before > 0 && after === 0, show({ before, after, key: viewOnDisk(view.id)?.hide_page_icons }))
  }

  // BC4 · Grouping's Order rows: folder for the Sets order, arrow-down-up for a property's.
  await showView(cdp, tableView(vid('g3sets'), 'VD Sets'))
  for (const which of ['settings', 'editor']) {
    await door(cdp, which, 'Group')
    const glyph = await cdp.evaluate(rowGlyph(ctl('Order')))
    bc(g, 4, 'E-5', `the Sets order row takes the folder glyph through the ${which === 'settings' ? 'Settings' : 'editor'} door`, /^lucide-folder/.test(glyph ?? ''), show(glyph))
  }
  await showView(cdp, tableView(vid('g3sub'), 'VD Sub', { sub_group: { property_id: STAGE.id, order_mode: 'configured' } }))
  await door(cdp, 'settings', 'Group')
  const subOrder = await cdp.evaluate(`[...document.querySelectorAll('[aria-label="Order"]')].filter((e) => e.getClientRects().length && !e.closest('[inert]')).map((e) => ${rowGlyph('e')})`)
  bc(g, 4, 'E-5', 'a sub-grouping\'s Order row takes arrow-down-up', subOrder.length === 2 && subOrder[1] === 'lucide-arrow-down-up', show(subOrder))
  await showView(cdp, tableView(vid('g3prop'), 'VD Property', { group: { kind: 'property', property_id: STAGE.id, order_mode: 'configured' } }))
  await door(cdp, 'settings', 'Group')
  const propOrder = await cdp.evaluate(rowGlyph(ctl('Order')))
  bc(g, 4, 'E-5', 'a property grouping\'s Order row takes arrow-down-up', propOrder === 'lucide-arrow-down-up', show(propOrder))

  // BC5 · Cards' three pickers open over the pane as every other picker does.
  const paneLook = () => cdp.evaluate(`(() => { const p = ${PORTAL_PANE}; if (!p) return null; const s = getComputedStyle(p); return s.backgroundColor + ' | ' + s.backdropFilter })()`)
  await door(cdp, 'settings', 'Group')
  await mouseClick(cdp, ctl('Group By'))
  await until('the Group By list', async () => cdp.evaluate(`!!${PORTAL_PANE}`))
  await sleep(400)
  const reference = await paneLook()
  await closeAll(cdp)
  await showView(cdp, cardsView(vid('g3pickers'), 'VD Pickers'))
  for (const [which, pickers] of [['editor', ['Card Image', 'Card Scale']], ['settings', ['Card Image']]]) {
    for (const picker of pickers) {
      await door(cdp, which, which === 'settings' ? 'Layout' : undefined)
      await mouseClick(cdp, ctl(picker))
      const opened = await settles(async () => cdp.evaluate(`!!${PORTAL_PANE}`), 3000)
      await sleep(400)
      const look = await paneLook()
      bc(g, 5, 'F-6', `Cards' ${picker} picker opens over the pane like every other picker, through the ${which === 'settings' ? 'Settings' : 'editor'} door`, opened && look === reference, show({ look, reference }))
    }
  }

  // BC6 · the dropdown's More placeholder draws as Settings' does.
  await door(cdp, 'settings')
  const settingsMore = await cdp.evaluate(`(${ctl('More actions')})?.className ?? null`)
  await closeAll(cdp)
  await mouseClick(cdp, VIEWS_BUTTON)
  await until('the views dropdown', async () => cdp.evaluate(`!!${ctl('New View')}`))
  const more = await cdp.evaluate(`(() => { const m = ${ctl(DRIFT.more)}; return m && { label: m.getAttribute('aria-label'), glyph: ${glyphOf('m')}, disabled: m.disabled, cls: m.className, last: m.parentElement?.lastElementChild === m } })()`)
  bc(g, 6, 'F-9', 'the views dropdown\'s placeholder reads More actions with the ellipsis glyph, drawn as Settings\' footer button', more?.label === 'More actions' && more.glyph === 'lucide-ellipsis' && more.cls === settingsMore, show({ more, settingsMore }))
  reg(g, 'the views dropdown\'s footing ends in its disabled placeholder', more?.disabled === true && more.last, show(more))
  await closeAll(cdp)

  // BC7 · the Filter's property and operator lists through the menu door, both settings; with Native Menus off they already drew as Sort's lists do.
  const V3_FILTER = tableView(vid('g3filter'), 'VD Filter')
  await showView(cdp, V3_FILTER)
  const listLook = async (trigger) => {
    await mouseClick(cdp, trigger)
    await until('the list', async () => cdp.evaluate(`${PORTAL_ROWS}.length > 0`), 3000).catch(() => {})
    await sleep(300)
    const rows = await cdp.evaluate(`${PORTAL_ROWS}.map((e) => ({ text: e.textContent.trim(), cls: e.className, glyph: ${glyphOf('e')} }))`)
    await pressKey(cdp, 'Escape')
    await sleep(300)
    return rows
  }
  await door(cdp, 'settings', 'Sort')
  const sortRows = await listLook(ctl('Sort By'))
  const sortPlain = sortRows.find((r) => r.text !== 'None')?.cls
  const sortCurrent = sortRows.find((r) => r.text === 'None')?.cls
  await door(cdp, 'settings', 'Filter')
  const filterTargets = await listLook(ctl('Filter property'))
  reg(g, 'with Native Menus off, the Filter\'s property list draws Sort\'s compact rows', filterTargets.length > 0 && filterTargets.every((r) => r.cls === sortPlain), show({ filterTargets: filterTargets.map((r) => r.cls), sortPlain }))
  await mouseClick(cdp, ctl('Filter property'))
  await until('the property list', async () => cdp.evaluate(`!!${portalRow(DONE.label)}`))
  await click(cdp, portalRow(DONE.label))
  await until('the Checkbox rule', async () => cdp.evaluate(`!!${ctl('Filter operator')}`))
  await sleep(400)
  const closed = await cdp.evaluate(`({ text: (${ctl('Filter operator')}).textContent.trim(), glyph: ${glyphOf(ctl('Filter operator'))} })`)
  bc(g, 7, 'F-7', 'the Checkbox rule\'s closed operator reads Checked with the plain square-check glyph', closed.text === 'Checked' && closed.glyph === 'lucide-square-check', show(closed))
  const ops = await listLook(ctl('Filter operator'))
  bc(g, 7, 'F-7', 'the Checkbox operators list Checked and Unchecked with square-check and square', same(ops.map((r) => [r.text, r.glyph]), [['Checked', 'lucide-square-check'], ['Unchecked', 'lucide-square']]), show(ops.map((r) => [r.text, r.glyph])))
  reg(g, 'with Native Menus off, the operator list rings its current row as Sort\'s does', ops.length === 2 && ops[0].cls === sortCurrent && ops[1].cls === sortPlain, show({ ops: ops.map((r) => r.cls), sortCurrent, sortPlain }))
  const filtered = await settles(async () => (await shownRids(cdp)).length === 0)
  reg(g, 'a Checked rule over VD Done saves and empties the view, no page being checked', filtered && viewOnDisk(V3_FILTER.id)?.filter?.rules?.length === 1, show(viewOnDisk(V3_FILTER.id)?.filter))

  await setting(cdp, 'Use Native Menus', true)
  for (const which of ['settings', 'editor']) {
    await door(cdp, which, 'Filter')
    const targets = await popNative(cdp, await boxOf(cdp, ctl('Filter property')), 'left')
    await pickNative([])
    const operators = await popNative(cdp, await boxOf(cdp, ctl('Filter operator')), 'left')
    await pickNative([])
    await sleep(300)
    bc(g, 7, 'F-7', `with Native Menus on, the Filter's property list is a system menu through the ${which === 'settings' ? 'Settings' : 'editor'} door`, labels(targets).includes(STAGE.label) && !(await cdp.evaluate(`${PORTAL_ROWS}.length > 0`)), show(labels(targets)))
    bc(g, 7, 'F-7', `with Native Menus on, the Filter's operator list is a system menu reading Checked and Unchecked through the ${which === 'settings' ? 'Settings' : 'editor'} door`, same(labels(operators), ['Checked', 'Unchecked']), show(labels(operators)))
  }
  await door(cdp, 'settings', 'Sort')
  const sortNative = await popNative(cdp, await boxOf(cdp, ctl('Sort By')), 'left')
  await pickNative([])
  reg(g, 'with Native Menus on, Sort\'s list is a system menu', labels(sortNative).includes(STAGE.label), show(labels(sortNative)))
  await closeAll(cdp)
  await setting(cdp, 'Use Native Menus', false)
  await shot(cdp, 'g3-end')
}

// ── Group 4 — The Table and the Second Table ────────────────────────────────

const header = (label) => visible(`[...document.querySelectorAll('${DRIFT.shell} .table-head .col-header')].filter((h) => h.textContent.trim() === ${JSON.stringify(label)})`)
const headTexts = (cdp) => cdp.evaluate(`[...document.querySelectorAll('${DRIFT.shell} .table-head .col-header')].filter((h) => h.getClientRects().length).map((h) => h.textContent.trim())`)
const dataRow = (title) => `document.querySelector('.data-row[data-rid="${PAGES[title]?.id ?? title}"]')`

/** The date column of a bundle table: its heading and every date, each left-aligned in its cell, and the heading's lead over the dates'. */
async function dateColumn(cdp, scope, dateHead) {
  return cdp.evaluate(`(() => {
    const head = ${leadOf(dateHead)}
    const cells = [...document.querySelectorAll('${scope} ${DRIFT.bundleDate}')].filter((c) => c.getClientRects().length).map((c) => ${leadOf('c')})
    return { head, cells }
  })()`)
}
const leftAligned = (col) => !!col.head && col.cells.length > 0 && near(col.head.lead, col.head.content) && col.cells.every((c) => near(c.lead, c.content))
const linedUp = (col) => !!col.head && col.cells.length > 0 && col.cells.every((c) => near(c.lead, col.head.lead))

async function group4(cdp) {
  const g = '4'
  const V4 = tableView(vid('g4columns'), 'VD Columns')
  await showView(cdp, V4)

  // Regression: the column gestures 4-2 moved into useColumns, and the header TableView now draws.
  const from = await boxOf(cdp, header(DONE.label))
  const to = await boxOf(cdp, header(STAGE.label))
  await dragPoints(cdp, { x: from.x, y: from.y }, { x: to.left + 6, y: to.y })
  const order = await settles(async () => same(viewOnDisk(V4.id)?.property_order, ['_title', DONE.id, STAGE.id, DUE.id]))
  reg(g, 'dragging VD Done\'s heading before VD Stage saves the column order and redraws the heading', order && same(await headTexts(cdp), ['Title', DONE.label, STAGE.label, DUE.label]), show({ disk: viewOnDisk(V4.id)?.property_order, drawn: await headTexts(cdp) }))

  const widthBefore = (await boxOf(cdp, header(STAGE.label))).right - (await boxOf(cdp, header(STAGE.label))).left
  const grip = await boxOf(cdp, `(${header(STAGE.label)}).querySelector('.col-resizer')`)
  await dragPoints(cdp, { x: grip.x, y: grip.y }, { x: grip.x + 60, y: grip.y }, { steps: 8 })
  const widened = await settles(async () => (viewOnDisk(V4.id)?.column_widths?.[STAGE.id] ?? 0) >= widthBefore + 50)
  reg(g, 'dragging VD Stage\'s resizer 60px saves its wider width', widened, show({ before: widthBefore, disk: viewOnDisk(V4.id)?.column_widths }))

  const rows = await menuChoose(cdp, header(DUE.label), 'Hide')
  const hidden = await settles(async () => (viewOnDisk(V4.id)?.hidden_properties ?? []).includes(DUE.id))
  reg(g, 'the heading\'s menu Hide hides VD Due and drops its column', rows.includes('Hide') && hidden && !(await headTexts(cdp)).includes(DUE.label), show({ rows, hidden: viewOnDisk(V4.id)?.hidden_properties, drawn: await headTexts(cdp) }))

  const gripOf = async (title) => {
    await hover(cdp, dataRow(title), 300)
    return boxOf(cdp, `(${dataRow(title)}).querySelector('.row-grip')`)
  }
  const cGrip = await gripOf('Page C')
  const aRow = await boxOf(cdp, dataRow('Page A'))
  await dragPoints(cdp, { x: cGrip.x, y: cGrip.y }, { x: cGrip.x, y: aRow.top + 3 })
  const ranked = await settles(async () => (viewOnDisk(V4.id)?.manual_order ?? []).indexOf(PAGES['Page C'].id) >= 0 && viewOnDisk(V4.id).manual_order.indexOf(PAGES['Page C'].id) < viewOnDisk(V4.id).manual_order.indexOf(PAGES['Page A'].id))
  const drawn = (await shownTitles(cdp)).filter((t) => ['Page A', 'Page B', 'Page C'].includes(t))
  reg(g, 'a row dragged by its grip above Page A saves the manual order and draws there', ranked && same(drawn, ['Page C', 'Page A', 'Page B']), show({ drawn, disk: viewOnDisk(V4.id)?.manual_order?.map(titleOf) }))
  reg(g, 'the Table wears the shell class', await cdp.evaluate(`!!document.querySelector('${DRIFT.shell} .table-grid')`))
  await shot(cdp, 'g4-columns')

  // BC9 · the Trash's date column.
  const scratch = async (name) => {
    const id = mintPageId()
    await mutate(cdp, { op: 'createPage', id, parentPath: 'Collection A/Set Alpha', name, seeds: {} })
    return `Collection A/Set Alpha/${name}.md`
  }
  await mutate(cdp, { op: 'delete', path: await scratch('VD Trashed'), kind: 'page' })
  await openSettings(cdp, 'Trash')
  await until('the Trash rows', async () => cdp.evaluate(`!!document.querySelector('.trash-frame .data-row')`))
  await sleep(600)
  const trash = await dateColumn(cdp, '.trash-frame', `document.querySelector('${DRIFT.trashDateHead}')`)
  bc(g, 9, 'F-8', 'the Trash\'s date heading and its dates left-align in their cells', leftAligned(trash), show(trash))
  bc(g, 9, 'F-8', 'the Trash\'s date heading leads where its dates do', linedUp(trash), show(trash))
  const name = await cdp.evaluate(leadOf(`document.querySelector('${DRIFT.trashTitleHead}')`))
  bc(g, 9, 'F-8', 'the Trash\'s title heading sets its glyph 6px from its label', near(name?.textLeft - name?.glyphRight, 6, 0.5), show(name))
  await shot(cdp, 'g4-trash', `document.querySelector('.trash-frame')`)
  await closeSettings(cdp)

  // BC9 · the Archive's date column.
  await mutate(cdp, { op: 'archive', path: await scratch('VD Archived'), kind: 'page' })
  await closeAll(cdp)
  await mouseClick(cdp, VIEWS_BUTTON)
  await until('the Archive row', async () => cdp.evaluate(`!!${btn('Archive')}`))
  await pressIn(cdp, btn('Archive'))
  await until('the Archive rows', async () => cdp.evaluate(`!!${visible(`[...document.querySelectorAll('.bundle-rows .data-row')]`)}`))
  await closeAll(cdp)
  await sleep(500)
  const archive = await dateColumn(cdp, '.bundle-rows', visible(`[...document.querySelectorAll('${DRIFT.shell} .table-head .col-header:last-child')]`))
  bc(g, 9, 'F-8', 'the Archive\'s date heading and its dates left-align in their cells', leftAligned(archive), show(archive))
  bc(g, 9, 'F-8', 'the Archive\'s date heading leads where its dates do', linedUp(archive), show(archive))
  reg(g, 'the Archive wears the shell class', await cdp.evaluate(`!!${visible(`[...document.querySelectorAll('${DRIFT.shell} .bundle-rows')]`)}`))
  await shot(cdp, 'g4-archive')
  await mouseClick(cdp, VIEWS_BUTTON)
  await until('the views dropdown', async () => cdp.evaluate(`!!${btn(V4.name)}`))
  await pressIn(cdp, btn(V4.name))
  await until('the view again', async () => cdp.evaluate(`!!${dataRow('Page A')}`))
  await closeAll(cdp)
}

// ── Group 5 — The Host and Its Renderers ────────────────────────────────────

/** Every page and Set in Collection A by id, with its title and path. */
async function held(cdp) {
  const out = new Map()
  const walk = (n) => {
    for (const p of n.pages ?? []) out.set(p.id, { title: p.title, path: p.path })
    for (const s of n.sets ?? []) { out.set(s.id, { title: s.title, path: s.path }); walk(s) }
  }
  walk((await ask(cdp, 'nexus:state')).value.tree.collections.find((c) => c.path === COLLECTION))
  return out
}
/** Watches for the first visible element carrying a `data-rid` that wasn't drawn when armed, noting whether its name field rode in with it. */
const ARM_BIRTH = `(() => {
  const before = new Set([...document.querySelectorAll('[data-rid]')].map((e) => e.dataset.rid))
  const log = { first: null }
  const look = () => {
    if (log.first) return
    const born = [...document.querySelectorAll('[data-rid]')].find((e) => !before.has(e.dataset.rid) && e.getClientRects().length)
    if (born) { log.first = { rid: born.dataset.rid, field: !!born.querySelector('input') }; obs.disconnect() }
  }
  const obs = new MutationObserver(look)
  obs.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-rid'] })
  window.__vdBirth = log
  return true
})()`
/** Runs a create gesture, then names the newborn `name` through the field it opened; answers the first frame's read and where the page landed. */
async function birth(cdp, act, name) {
  await cdp.evaluate(ARM_BIRTH)
  await act()
  const first = await until('the newborn', async () => cdp.evaluate('window.__vdBirth.first'), 6000).catch(() => null)
  const named = await settles(async () => cdp.evaluate(`!!document.querySelector('[data-rid="${first?.rid}"] input') && document.activeElement === document.querySelector('[data-rid="${first?.rid}"] input')`), 3000)
  if (named) {
    await typeText(cdp, name)
    await pressKey(cdp, 'Enter')
  }
  const landed = first && (await settles(async () => (await held(cdp)).get(first.rid)?.title === name))
  return { first, named, landed, at: first && (await held(cdp)).get(first.rid)?.path }
}
const trashPage = async (cdp, path) => path && mutate(cdp, { op: 'delete', path, kind: 'page' })
/** Records, from now, every text a title shows: its field's value while editing, its label after. */
const ARM_TITLE = (rid) => `(() => {
  const seen = []
  const read = () => { const el = document.querySelector('[data-rid="${rid}"]'); if (!el) return; const f = el.querySelector('input'); const t = f ? 'field:' + f.value : (el.querySelector('.card-title, .cell-title-text')?.textContent ?? '').trim(); if (seen.at(-1) !== t) seen.push(t) }
  read()
  const obs = new MutationObserver(read)
  obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true })
  window.__vdTitle = { seen, stop: () => obs.disconnect() }
  return true
})()`
const card = (title) => `document.querySelector('.cards-view [data-rid="${PAGES[title]?.id ?? title}"]')`
/** Polls an in-page reading every frame for `ms`, answering each distinct reading in order. */
const ARM_FRAMES = (expr) => `(() => { const seen = []; let on = true; const tick = () => { if (!on) return; const v = JSON.stringify(${expr}); if (seen.at(-1) !== v) seen.push(v); requestAnimationFrame(tick) }; tick(); window.__vdFrames = { seen, stop: () => { on = false } }; return true })()`
const frames = async (cdp) => (await cdp.evaluate('(() => { window.__vdFrames.stop(); return window.__vdFrames.seen })()')).map((v) => JSON.parse(v))

async function group5(cdp) {
  const g = '5'
  const V5 = tableView(vid('g5table'), 'VD Create Table')
  await showView(cdp, V5)
  const ALPHA = 'Collection A/Set Alpha/'

  // BC10 · a create opens its name field with its row, through every Table door.
  const bandAdd = async (label) => {
    await hover(cdp, head(label), 300)
    await mouseClick(cdp, `(${head(label)}).querySelector('[aria-label="New page in group"], .group-band-add')`)
  }
  const plus = await birth(cdp, () => bandAdd('Set Alpha'), 'VD Plus')
  bc(g, 10, 'I-040', 'the Table band\'s + opens the newborn\'s name field in the frame its row first draws', plus.first?.field === true, show(plus))
  reg(g, 'the name typed in the band +\'s newborn names its page in Set Alpha', plus.landed && plus.at === `${ALPHA}VD Plus.md`, show(plus))
  await trashPage(cdp, plus.at)

  const ghost = await birth(cdp, async () => {
    await hover(cdp, dataRow('Page C'), 1500)
    await mouseClick(cdp, `document.querySelector('.data-row.ghost-row')`)
  }, 'VD Ghost')
  bc(g, 10, 'I-040', 'the Table\'s ghost opens the newborn\'s name field in the frame its row first draws', ghost.first?.field === true, show(ghost))
  reg(g, 'the Table ghost\'s newborn lands after Page C in Set Alpha', ghost.landed && ghost.at === `${ALPHA}VD Ghost.md`, show(ghost))
  await trashPage(cdp, ghost.at)

  const below = await birth(cdp, () => menuChoose(cdp, `(${dataRow('Page A')}).querySelector('.cell-title-text')`, 'New Page Below'), 'VD Below')
  bc(g, 10, 'I-040', 'the title menu\'s New Page Below opens the newborn\'s name field in the frame its row first draws', below.first?.field === true, show(below))
  await trashPage(cdp, below.at)

  const bandMenu = await birth(cdp, () => menuChoose(cdp, head('Set Alpha'), 'New Page'), 'VD Band Menu')
  bc(g, 10, 'D-2', 'a Set band\'s menu New Page creates through the view, opening the newborn\'s field with its row', bandMenu.first?.field === true && bandMenu.at === `${ALPHA}VD Band Menu.md`, show(bandMenu))
  await trashPage(cdp, bandMenu.at)
  await shot(cdp, 'g5-creates')

  // BC12c, BC13 · the Table's anchored ghost holds its place until the newborn lands, and a press on it meanwhile does nothing.
  await hover(cdp, dataRow('Page C'), 1500)
  await inMain(GATE)
  await inMain(`globalThis.__vdGate.creates = 0`)
  await hold('mutate', `(args) => args[0]?.op === 'createPage' && ++globalThis.__vdGate.creates > 0`, 2500)
  const rowsBefore = (await shownRids(cdp)).length
  await cdp.evaluate(ARM_FRAMES(`({ ghost: !!document.querySelector('.data-row.ghost-row'), rows: document.querySelectorAll('.data-row[data-rid]').length })`))
  await mouseClick(cdp, `document.querySelector('.data-row.ghost-row')`, { settle: 400 })
  const heldGhost = await cdp.evaluate(`!!document.querySelector('.data-row.ghost-row')`)
  if (heldGhost) await mouseClick(cdp, `document.querySelector('.data-row.ghost-row')`, { settle: 200 })
  await settles(async () => (await shownRids(cdp)).length > rowsBefore, 6000)
  await sleep(600)
  const seen = await frames(cdp)
  const creates = await inMain('globalThis.__vdGate.creates')
  await pressKey(cdp, 'Escape')
  const gap = seen.some((f) => !f.ghost && f.rows === rowsBefore)
  bc(g, 13, '2.4', 'the Table\'s anchored ghost stays drawn until its newborn lands, no frame showing neither', heldGhost && !gap, show({ heldGhost, seen }))
  bc(g, 12, 'D-1', 'a press on the Table ghost held for an in-flight create starts no second create', heldGhost && creates === 1, show({ heldGhost, creates }))
  const born = [...(await held(cdp)).values()].filter((p) => p.path.startsWith(`${ALPHA}`) && !Object.values(PAGES).some((q) => q.path === p.path))
  for (const p of born) await trashPage(cdp, p.path)

  // Regression: renames through every entry point, the title cell's open, and its value seat.
  const renameVia = async (expr, from, to) => {
    await menuChoose(cdp, expr, 'Rename')
    const field = await settles(async () => cdp.evaluate(`document.activeElement?.tagName === 'INPUT'`), 3000)
    if (field) {
      await cdp.evaluate('document.activeElement.select()')
      await typeText(cdp, to)
      await pressKey(cdp, 'Enter')
    }
    return field && settles(async () => [...(await held(cdp)).values()].some((p) => p.title === to))
  }
  const back = async (dir, from, to, kind = 'page') => ask(cdp, 'mutate', { op: 'rename', path: `${dir}/${to}${kind === 'page' ? '.md' : ''}`, kind, newName: from })
  reg(g, 'the Table title\'s menu Rename renames the page', await renameVia(`(${dataRow('Page A')}).querySelector('.cell-title-text')`, 'Page A', 'VD Renamed A'))
  await back('Collection A/Set Alpha', 'Page A', 'VD Renamed A')
  await sleep(800)
  reg(g, 'a Set band\'s menu Rename renames the Set', await renameVia(head('Set Alpha'), 'Set Alpha', 'VD Alpha'))
  await back('Collection A', 'Set Alpha', 'VD Alpha', 'set')
  await sleep(800)

  await mouseClick(cdp, `(${dataRow('Page B')}).querySelector('.cell-title-text')`)
  const opened = await settles(async () => (await cdp.evaluate(`document.querySelector('[role=tab][aria-selected=true]')?.title`)) === 'Page B')
  reg(g, 'a Table title\'s press opens its page', opened)
  await mouseClick(cdp, `[...document.querySelectorAll('.row span')].findLast((e) => e.textContent.trim() === 'Collection A')`)
  await until('the view', async () => cdp.evaluate(`!!${dataRow('Page B')}`))
  await sleep(600)
  const cell = `(${dataRow('Page C')}).querySelectorAll('.data-cell')[1]`
  await mouseClick(cdp, cell)
  await until('the stage picker', async () => cdp.evaluate(`!!${portalRow('Done')}`), 3000).catch(() => {})
  if (await cdp.evaluate(`!!${portalRow('Done')}`)) await click(cdp, portalRow('Done'))
  const picked = await settles(async () => JSON.stringify(frontOf(PAGES['Page C'].path)[STAGE.key]).includes('Done'))
  reg(g, 'a Table Select cell picks through its value seat', picked, show(frontOf(PAGES['Page C'].path)[STAGE.key]))
  await escapeAll(cdp)
  await mutate(cdp, { op: 'setProperty', path: PAGES['Page C'].path, propertyId: STAGE.id, value: { kind: 'select', value: STAGES['Page C'] } })

  // Cards: creation, the title rename, and the hover ghost.
  const V5C = cardsView(vid('g5cards'), 'VD Create Cards', { set_cards: false })
  await showView(cdp, V5C)
  const cPlus = await birth(cdp, () => bandAdd('Set Alpha'), 'VD Card Plus')
  bc(g, 10, 'I-040', 'the Cards band\'s + opens the newborn\'s name field in the frame its card first draws', cPlus.first?.field === true, show(cPlus))
  await trashPage(cdp, cPlus.at)
  const cGhost = await birth(cdp, async () => {
    await hover(cdp, card('Page C'), 1500)
    await mouseClick(cdp, `document.querySelector('.ghost-card')`)
  }, 'VD Card Ghost')
  bc(g, 10, 'I-040', 'the Cards ghost opens the newborn\'s name field in the frame its card first draws', cGhost.first?.field === true, show(cGhost))
  reg(g, 'the Cards ghost\'s newborn lands in Set Alpha under its typed name', cGhost.landed && cGhost.at === `${ALPHA}VD Card Ghost.md`, show(cGhost))
  await trashPage(cdp, cGhost.at)

  await menuChoose(cdp, `(${card('Page B')}).querySelector('.card-title')`, 'Rename')
  const cField = await settles(async () => cdp.evaluate(`!!(${card('Page B')})?.querySelector('input')`), 3000)
  let titles = null
  if (cField) {
    await cdp.evaluate('document.activeElement.select()')
    await typeText(cdp, 'VD Card B')
    await cdp.evaluate(ARM_TITLE(PAGES['Page B'].id))
    await pressKey(cdp, 'Enter')
    await settles(async () => [...(await held(cdp)).values()].some((p) => p.title === 'VD Card B'))
    await sleep(800)
    titles = await cdp.evaluate('(() => { window.__vdTitle.stop(); return window.__vdTitle.seen })()')
  }
  const after = titles?.slice(titles.findIndex((t) => !t.startsWith('field:'))) ?? []
  bc(g, 11, 'D-1', 'a Cards title rename commits with no frame showing the old title', cField && after.length > 0 && !after.includes('Page B') && after.at(-1) === 'VD Card B', show(titles))
  if (cField) await back('Collection A/Set Alpha', 'Page B', 'VD Card B')
  await sleep(800)

  // BC12 · the Cards ghost reads the view's naming: a page-menu rename folds it away, and a sidebar rename leaves it.
  const TRACK = `(() => { const gc = document.querySelector('.ghost-card'); return gc ? gc.closest('[data-reveal]').style.gridTemplateRows : 'gone' })()`
  await hover(cdp, card('Page C'), 1500)
  const before = await settles(async () => (await cdp.evaluate(TRACK)) === '1fr', 3000)
  // The ghost's fold wrapper's rows track each frame and when it changed: a fold holds `0fr` with the ghost inside for the fold's length; a vanish leaves as the rename opens.
  await cdp.evaluate(`(() => { const seen = []; let on = true; const tick = () => { if (!on) return; const v = ${TRACK}; if (seen.at(-1)?.[0] !== v) seen.push([v, Math.round(performance.now())]); requestAnimationFrame(tick) }; tick(); window.__vdFold = { seen, stop: () => { on = false } }; return true })()`)
  // The menu pops from a `contextmenu` event, as the keyboard's menu key raises it, since a press anywhere clears the ghost before any menu opens; Rename is chosen the moment it pops, inside the fold.
  const seq = await inMain('__drive.seq')
  const chose = inMain(`new Promise((done) => { const t = setInterval(() => { if (__drive.seq > ${seq}) { clearInterval(t); done(__drive.choose(['Rename'])) } }, 2) })`)
  await cdp.evaluate(`(${card('Page C')}).querySelector('.card-title').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))`)
  const rows = await chose
  await sleep(900)
  const fade = await cdp.evaluate('(() => { window.__vdFold.stop(); return window.__vdFold.seen })()')
  await pressKey(cdp, 'Escape')
  const folded = fade.find(([v]) => v === '0fr')
  const gone = fade.find(([v]) => v === 'gone')
  bc(g, 12, 'D-1', 'a Cards ghost closing as a page-menu rename opens folds away rather than vanishing', before && rows && fade[0]?.[0] === '1fr' && !!folded && !!gone && gone[1] - folded[1] >= 120, show({ before, fade }))
  await sleep(500)

  const sidebarRow = `[...document.querySelectorAll('.row span')].findLast((e) => e.textContent.trim() === 'Collection B')`
  await menuChoose(cdp, sidebarRow, 'Rename')
  const sideField = await settles(async () => cdp.evaluate(`document.activeElement?.tagName === 'INPUT'`), 3000)
  await hover(cdp, card('Page A'), 1500)
  const ghostDuring = await cdp.evaluate(`!!document.querySelector('.ghost-card')`)
  bc(g, 12, 'D-1', 'a sidebar rename open leaves the Cards hover ghost drawn', sideField && ghostDuring, show({ sideField, ghostDuring }))
  await pressKey(cdp, 'Escape')
  await sleep(500)
  await shot(cdp, 'g5-end')
}

// ── Group 6 — The Pipeline and the Bands ────────────────────────────────────

const HEADS = `[...document.querySelectorAll('.group-band-head')].filter((h) => h.getClientRects().length > 0 && !h.closest('[inert]'))`
const headLabels = (cdp) => cdp.evaluate(`${HEADS}.map((h) => h.getAttribute('aria-label'))`)
/** The `n`th head reading `label` (0-based), in document order. */
const head = (label, n = 0) => `${HEADS}.filter((h) => h.getAttribute('aria-label') === ${JSON.stringify(label)})[${n}]`
const chevronOf = (expr) => `(${expr}).querySelector('${DRIFT.chevron}')`
const expanded = (cdp, expr) => cdp.evaluate(`(${expr})?.getAttribute('aria-expanded') ?? null`)
const cardTitles = async (cdp) => (await cdp.evaluate(`[...document.querySelectorAll('.cards-view [data-rid]')].filter((c) => c.getClientRects().length).map((c) => c.dataset.rid)`)).map(titleOf)
const only = (list, keep) => list.filter((t) => keep.includes(t))
/** The labels between a head and the next head at its own depth or above: what the band holds. */
const within = (labels, from, until) => labels.slice(labels.indexOf(from) + 1, until ? labels.indexOf(until) : undefined)
const BETA_PAGES = ['Alpha 1', 'Alpha 2', 'Alpha 3', 'Beta 1']
const SUBSET_ORDER = [IDS.alpha, IDS.beta, IDS.subB, IDS.subA]
const subGrouped = { sub_group: { property_id: STAGE.id, order_mode: 'configured' } }

/** A Set's id: a page id with the kind mark a container carries. */
const containerId = () => { const id = mintPageId(); return `${id.slice(0, 10)}0${id.slice(11)}` }
/** A refused cross-parent nest of VD Delta, a Set the stored group_order never ranked, into Set Alpha, with VD Gamma dragged above Set Beta inside the hold, on a surface drawing the Collection's Sets as rows: `open` shows it, `row` finds a Set's row by title, and `labels` reads the rows drawn. */
async function refusedNest(cdp, tag, { open, row, labels }) {
  const gamma = containerId()
  const delta = containerId()
  const inner = containerId()
  // Set Alpha takes a sub-Set, so a nest into it lands before a ranked sibling and the drop stages a group_order of its own.
  await mutate(cdp, { op: 'createContainer', id: inner, parentPath: 'Collection A/Set Alpha', kind: 'set', name: 'VD Inner' })
  await mutate(cdp, { op: 'createContainer', id: gamma, parentPath: COLLECTION, kind: 'set', name: 'VD Gamma' })
  await mutate(cdp, { op: 'createContainer', id: delta, parentPath: COLLECTION, kind: 'set', name: 'VD Delta' })
  const view = tableView(vid(tag), 'VD Nest', { group_order: [IDS.alpha, inner, IDS.beta, IDS.subA, IDS.subB, gamma] })
  await showView(cdp, view)
  await open?.()
  await until('VD Delta\'s row', async () => cdp.evaluate(`!!(${row('VD Delta')})`))
  const TOP = ['Set Alpha', 'Set Beta', 'VD Gamma', 'VD Delta']
  const top = async () => (await labels()).filter((l) => TOP.includes(l))
  const before = await top()
  await hold('mutate', `(args) => args[0]?.op === 'moveSet' && JSON.stringify(args).includes('VD Delta')`, 3500, true)
  const from = await boxOf(cdp, row('VD Delta'))
  const into = await boxOf(cdp, row('Set Alpha'))
  await dragPoints(cdp, { x: from.x, y: from.y }, { x: into.x, y: into.y }, { settle: 300 })
  const nested = await top()
  const gammaAt = await boxOf(cdp, row('VD Gamma'))
  const betaAt = await boxOf(cdp, row('Set Beta'))
  await dragPoints(cdp, { x: gammaAt.x, y: gammaAt.y }, { x: betaAt.x, y: betaAt.top + 2 }, { settle: 300 })
  const regrouped = await top()
  await sleep(4500)
  const after = await top()
  const names = { [IDS.alpha]: 'Set Alpha', [IDS.beta]: 'Set Beta', [IDS.subA]: 'Sub-Set A', [IDS.subB]: 'Sub-Set B', [inner]: 'VD Inner', [gamma]: 'VD Gamma', [delta]: 'VD Delta' }
  const saved = (viewOnDisk(view.id)?.group_order ?? []).map((id) => names[id] ?? id)
  const atRoot = (await held(cdp)).get(delta)?.path === 'Collection A/VD Delta'
  await closeAll(cdp)
  for (const name of ['VD Gamma', 'VD Delta', 'Set Alpha/VD Inner']) await mutate(cdp, { op: 'delete', path: `Collection A/${name}`, kind: 'set' })
  const pass = atRoot && same(after, ['Set Alpha', 'VD Gamma', 'Set Beta', 'VD Delta']) && saved.at(-1) === 'VD Delta' && saved.indexOf('VD Gamma') < saved.indexOf('Set Beta')
  return { pass, before, nested, regrouped, after, saved, atRoot }
}

async function group6(cdp) {
  const g = '6'

  // BC14 · a custom Set order orders the pages a band gathers from nested Sets.
  await showView(cdp, cardsView(vid('g6cardsorder'), 'VD Cards Order', { set_cards: false, group_order: SUBSET_ORDER }))
  const gathered = only(await cardTitles(cdp), BETA_PAGES)
  bc(g, 14, 'E-2', 'a Cards band gathers Sub-Set B\'s page ahead of Sub-Set A\'s under their custom Set order', same(gathered, ['Beta 1', 'Alpha 1', 'Alpha 2', 'Alpha 3']), show(gathered))
  await shot(cdp, 'g6-cards-order')
  await showView(cdp, tableView(vid('g6tablegather'), 'VD Table Gather', { group_order: SUBSET_ORDER, ...subGrouped }))
  const doing = only(await shownTitles(cdp), ['Alpha 2', 'Beta 1'])
  bc(g, 14, 'E-2', 'a sub-grouped Table band gathers Sub-Set B\'s Doing page ahead of Sub-Set A\'s', same(doing, ['Beta 1', 'Alpha 2']), show(doing))
  await showView(cdp, cardsView(vid('g6cardssort'), 'VD Cards Sort', { set_cards: false, group_order: SUBSET_ORDER, sort: [{ property_id: '_title', direction: 'ascending' }] }))
  const sorted = only(await cardTitles(cdp), BETA_PAGES)
  reg(g, 'a sort still orders a gathered Cards band over the custom Set order', same(sorted, ['Alpha 1', 'Alpha 2', 'Alpha 3', 'Beta 1']), show(sorted))
  const manual = ['Alpha 3', 'Beta 1', 'Alpha 1', 'Alpha 2']
  await showView(cdp, cardsView(vid('g6cardsmanual'), 'VD Cards Manual', { set_cards: false, group_order: SUBSET_ORDER, manual_order: manual.map((t) => PAGES[t].id) }))
  const ranked = only(await cardTitles(cdp), BETA_PAGES)
  reg(g, 'a manual page order still orders a gathered Cards band over the custom Set order', same(ranked, manual), show(ranked))

  // BC15 · empty option bands under each Set, governed by Hide Empty Groups.
  const V6_SUB = tableView(vid('g6tablesub'), 'VD Table Sub', subGrouped)
  await showView(cdp, V6_SUB)
  let heads = await headLabels(cdp)
  bc(g, 15, 'E-3', 'a sub-grouped Table shows the empty Done band under Set Alpha', within(heads, 'Set Alpha', 'Set Beta').includes('Done'), show(heads))
  await shot(cdp, 'g6-table-sub')
  await showView(cdp, tableView(vid('g6tablehide'), 'VD Table Hide', { ...subGrouped, hide_empty_groups: true }))
  heads = await headLabels(cdp)
  reg(g, 'under Hide Empty Groups no empty option band shows under any Set', heads.length > 0 && !heads.includes('Done'), show(heads))
  await showView(cdp, tableView(vid('g6tabletop'), 'VD Table Top', { group: { kind: 'property', property_id: STAGE.id, order_mode: 'configured' } }))
  heads = await headLabels(cdp)
  reg(g, 'a property grouping shows its empty Done band at the top level', heads.includes('Done'), show(heads))
  await showView(cdp, tableView(vid('g6tablefilter'), 'VD Table Filter', { ...subGrouped, filter: { match: 'all', rules: [{ property_id: '_title', op: 'contains', value: 'Page' }] } }))
  heads = await headLabels(cdp)
  reg(g, 'a Set a filter empties leaves the sub-grouped view, its empty option bands with it', same(heads, ['Set Alpha', 'Todo', 'Doing', 'Done']) || same(heads, ['Set Alpha', 'Todo', 'Doing']), show(heads))

  // BC15 · the empty bands take row and bucket drops.
  await showView(cdp, V6_SUB)
  await hover(cdp, dataRow('Page A'), 300)
  const grip = await boxOf(cdp, `(${dataRow('Page A')}).querySelector('.row-grip')`)
  const doneHead = await cdp.evaluate(`!!(${head('Done')})`)
  if (doneHead) {
    const target = await boxOf(cdp, head('Done'))
    await dragPoints(cdp, { x: grip.x, y: grip.y }, { x: target.x, y: target.y })
  }
  const moved = await settles(async () => same(frontOf(PAGES['Page A'].path)[STAGE.key], ['Done']) || frontOf(PAGES['Page A'].path)[STAGE.key] === 'Done')
  bc(g, 15, 'E-3', 'a row dropped on Set Alpha\'s empty Done band takes Done', doneHead && moved, show({ doneHead, value: frontOf(PAGES['Page A'].path)[STAGE.key] }))
  await mutate(cdp, { op: 'setProperty', path: PAGES['Page A'].path, propertyId: STAGE.id, value: { kind: 'select', value: 'opt_vd_todo' } })
  await sleep(800)
  const emptyDone = `${HEADS}.filter((h) => h.getAttribute('aria-label') === 'Done').find((h) => { const n = h.closest('.group-band'); return n && !n.querySelector('.data-row') })`
  const bucketed = await cdp.evaluate(`!!(${emptyDone})`)
  if (bucketed) {
    const from = await boxOf(cdp, emptyDone)
    const todo = await boxOf(cdp, head('Todo'))
    await dragPoints(cdp, { x: from.x, y: from.y }, { x: todo.x, y: todo.top + 2 })
  }
  const reordered = await settles(async () => viewOnDisk(V6_SUB.id)?.sub_group?.order?.[0] === 'opt_vd_done')
  bc(g, 15, 'E-3', 'an empty Done band dragged above Todo under its Set saves the sub-group\'s order', bucketed && reordered, show({ bucketed, sub: viewOnDisk(V6_SUB.id)?.sub_group }))

  // BC15 · a Set holding only empty bands springs open on a drag.
  const hollowId = containerId()
  await mutate(cdp, { op: 'createContainer', id: hollowId, parentPath: COLLECTION, kind: 'set', name: 'VD Hollow' })
  await showView(cdp, tableView(vid('g6hollow'), 'VD Hollow View', { ...subGrouped, collapsed_groups: [hollowId] }))
  await until('VD Hollow\'s head', async () => cdp.evaluate(`!!(${head('VD Hollow')})`)).catch(() => {})
  await hover(cdp, dataRow('Page B'), 300)
  const bGrip = await boxOf(cdp, `(${dataRow('Page B')}).querySelector('.row-grip')`)
  const hollow = await boxOf(cdp, head('VD Hollow')).catch(() => null)
  let sprang = null
  if (hollow)
    await dragPoints(cdp, { x: bGrip.x, y: bGrip.y }, { x: hollow.x, y: hollow.y }, {
      held: async () => {
        await sleep(1500)
        sprang = { open: await expanded(cdp, head('VD Hollow')), within: within(await headLabels(cdp), 'VD Hollow') }
        await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: bGrip.x, y: bGrip.y, button: 'left', buttons: 1 })
        await sleep(400)
      },
    })
  bc(g, 15, 'E-3', 'a collapsed Set holding only empty bands springs open under a dragged row', sprang?.open === 'true' && sprang.within.includes('Done'), show(sprang))
  reg(g, 'a drag carried back to its row moves nothing', frontOf(PAGES['Page B'].path)[STAGE.key] !== undefined && (await shownRids(cdp)).includes(PAGES['Page B'].id), show(frontOf(PAGES['Page B'].path)))
  await mutate(cdp, { op: 'delete', path: 'Collection A/VD Hollow', kind: 'set' })

  // BC16 · the drop line over a tail row sits at the row's indent.
  await showView(cdp, tableView(vid('g6tail'), 'VD Tail', { group: { kind: 'property', property_id: STAGE.id, order_mode: 'configured' } }))
  await hover(cdp, dataRow('Page B'), 300)
  const tGrip = await boxOf(cdp, `(${dataRow('Page B')}).querySelector('.row-grip')`)
  const tail = await boxOf(cdp, dataRow('Alpha 3'))
  const banded = await boxOf(cdp, dataRow('Page A'))
  const lineOver = (title) => cdp.evaluate(`(() => { const l = [...document.querySelectorAll('.drop-line')].find((e) => e.getClientRects().length); const c = document.querySelector('.data-row[data-rid="${PAGES[title].id}"] .cell-lead'); if (!l || !c) return null; return l.getBoundingClientRect().left - (c.getBoundingClientRect().left + parseFloat(getComputedStyle(c).paddingLeft)) })()`)
  const line = {}
  await dragPoints(cdp, { x: tGrip.x, y: tGrip.y }, { x: tail.x, y: tail.top + 4 }, {
    held: async () => {
      await sleep(300)
      line.tail = await lineOver('Alpha 3')
      for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: tail.x, y: tail.top + 4 + ((banded.top + 4 - tail.top - 4) * i) / 6, button: 'left', buttons: 1 })
      await sleep(300)
      line.banded = await lineOver('Page A')
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: tGrip.x, y: tGrip.y, button: 'left', buttons: 1 })
      await sleep(400)
    },
  })
  bc(g, 16, '6.6', 'the drop line over the ungrouped tail\'s row stands off its indent as it does over a banded row', typeof line.tail === 'number' && near(line.tail, line.banded), show(line))

  // F6 · a refused nest of a Set the stored group_order never ranked, after another Set write, returns it to the slot its drop was ranked from.
  const nest = await refusedNest(cdp, 'g6nest', { row: head, labels: () => headLabels(cdp) })
  fold(g, 'nest', 'a refused nest of VD Delta, which the stored group_order never ranked, returns it to the end it was ranked from while VD Gamma\'s reorder over it stands', nest.pass, show(nest))

  // F6 · an empty Location-sorted flat Cards view draws no band and no gap under its Set cards, as an unsorted one doesn't.
  const emptied = { group: { kind: 'flat' }, set_cards: true, filter: { match: 'all', rules: [{ property_id: '_title', op: 'contains', value: 'VD Nothing Matches' }] } }
  const extent = async () => cdp.evaluate(`(() => { const v = [...document.querySelectorAll('.cards-view')].find((e) => e.getClientRects().length); if (!v) return null; const top = v.getBoundingClientRect().top; const drawn = [...v.querySelectorAll('*')].filter((e) => e.getClientRects().length); return { bands: v.querySelectorAll('.group-band').length, grids: v.querySelectorAll('.cards-grid').length, bottom: Math.round(Math.max(...drawn.map((e) => e.getBoundingClientRect().bottom)) - top), setCards: v.querySelectorAll('.set-cards-row .card').length } })()`)
  await showView(cdp, cardsView(vid('g6flatplain'), 'VD Flat Plain', emptied))
  await sleep(500)
  const plain = await extent()
  await showView(cdp, cardsView(vid('g6flatlocation'), 'VD Flat Location', { ...emptied, sort: [{ property_id: '__location__', direction: 'ascending' }] }))
  await sleep(500)
  const located = await extent()
  fold(g, 'flat', 'an empty Location-sorted flat Cards view draws its Set cards with no band or gap below, as an unsorted one does', !!plain && !!located && plain.setCards > 0 && same(located, plain), show({ plain, located }))
  await shot(cdp, 'g6-flat-location')

  // Regression: band collapse and its persistence, Set and bucket drops, and a row moved between Sets.
  const V6_SETS = tableView(vid('g6sets'), 'VD Sets Drops')
  await showView(cdp, V6_SETS)
  await mouseClick(cdp, chevronOf(head('Set Alpha')))
  const folded = await settles(async () => (viewOnDisk(V6_SETS.id)?.collapsed_groups ?? []).includes(IDS.alpha))
  const hiddenRows = !(await shownRids(cdp)).includes(PAGES['Page A'].id)
  reg(g, 'a Table Set band\'s chevron folds it, saving collapsed_groups and hiding its rows', folded && hiddenRows && (await expanded(cdp, head('Set Alpha'))) === 'false', show({ disk: viewOnDisk(V6_SETS.id)?.collapsed_groups, hiddenRows }))
  await mouseClick(cdp, chevronOf(head('Set Alpha')))
  const unfolded = await settles(async () => !(viewOnDisk(V6_SETS.id)?.collapsed_groups ?? []).includes(IDS.alpha) && (await shownRids(cdp)).includes(PAGES['Page A'].id))
  reg(g, 'the chevron again unfolds it and drops it from collapsed_groups', unfolded, show(viewOnDisk(V6_SETS.id)?.collapsed_groups))

  const beta = await boxOf(cdp, head('Set Beta'))
  const alpha = await boxOf(cdp, head('Set Alpha'))
  await dragPoints(cdp, { x: beta.x, y: beta.y }, { x: alpha.x, y: alpha.top + 2 })
  const setOrder = await settles(async () => { const o = viewOnDisk(V6_SETS.id)?.group_order ?? []; return o.indexOf(IDS.beta) >= 0 && o.indexOf(IDS.beta) < o.indexOf(IDS.alpha) })
  const drawnSets = (await headLabels(cdp)).filter((l) => l.startsWith('Set '))
  reg(g, 'Set Beta\'s head dragged above Set Alpha saves the group order and draws there', setOrder && same(drawnSets, ['Set Beta', 'Set Alpha']), show({ disk: viewOnDisk(V6_SETS.id)?.group_order, drawnSets }))

  await hover(cdp, dataRow('Page C'), 300)
  const cGrip = await boxOf(cdp, `(${dataRow('Page C')}).querySelector('.row-grip')`)
  const beta1 = await boxOf(cdp, dataRow('Beta 1'))
  await dragPoints(cdp, { x: cGrip.x, y: cGrip.y }, { x: cGrip.x, y: beta1.top + 3 })
  const relocated = await settles(async () => (await ask(cdp, 'nexus:state')).value.tree.collections[0].sets.find((s) => s.id === IDS.beta)?.sets.find((s) => s.id === IDS.subB)?.pages.some((p) => p.id === PAGES['Page C'].id))
  reg(g, 'a row dropped among Sub-Set B\'s rows moves its page into Sub-Set B', relocated, show(await shownTitles(cdp)))
  if (relocated) await mutate(cdp, { op: 'movePage', path: 'Collection A/Set Beta/Sub-Set B/Page C.md', newParentPath: 'Collection A/Set Alpha' })

  const V6_BUCKETS = tableView(vid('g6buckets'), 'VD Buckets', { group: { kind: 'property', property_id: STAGE.id, order_mode: 'configured' } })
  await showView(cdp, V6_BUCKETS)
  const doingHead = await boxOf(cdp, head('Doing'))
  const todoHead = await boxOf(cdp, head('Todo'))
  await dragPoints(cdp, { x: doingHead.x, y: doingHead.y }, { x: todoHead.x, y: todoHead.top + 2 })
  const bucketOrder = await settles(async () => viewOnDisk(V6_BUCKETS.id)?.group?.order?.[0] === 'opt_vd_doing')
  const drawnBuckets = (await headLabels(cdp)).filter((l) => ['Todo', 'Doing', 'Done'].includes(l))
  reg(g, 'the Doing band dragged above Todo saves the grouping\'s order and draws there', bucketOrder && drawnBuckets[0] === 'Doing', show({ group: viewOnDisk(V6_BUCKETS.id)?.group, drawnBuckets }))

  const V6_CARDS = cardsView(vid('g6cardsfold'), 'VD Cards Fold', { set_cards: false })
  await showView(cdp, V6_CARDS)
  await mouseClick(cdp, chevronOf(head('Set Beta')))
  const cardsFolded = await settles(async () => (viewOnDisk(V6_CARDS.id)?.collapsed_groups ?? []).includes(IDS.beta) && !(await cardTitles(cdp)).includes('Beta 1'))
  reg(g, 'a Cards Set band\'s chevron folds it and saves collapsed_groups', cardsFolded, show(viewOnDisk(V6_CARDS.id)?.collapsed_groups))
  await shot(cdp, 'g6-end')
}

// ── Group 7 — Disclosure and Rows ───────────────────────────────────────────

/** The bundle table's row titled `title` inside `scope`. */
const bundleRow = (scope, title) => `[...document.querySelectorAll('${scope} .data-row')].find((r) => r.getClientRects().length && r.querySelector('.cell-title-text')?.textContent === ${JSON.stringify(title)})`
/** A folder row's chevron pressed twice as one double-click, its `aria-expanded` read before, after each press, and once the double-click has settled. */
async function doubleClickChevron(cdp, rowExpr) {
  const at = await boxOf(cdp, `(${rowExpr}).querySelector('${DRIFT.chevron}')`)
  const open = () => cdp.evaluate(`(${rowExpr})?.getAttribute('aria-expanded') ?? null`)
  const seen = [await open()]
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y, button: 'none' })
  for (const clickCount of [1, 2]) {
    for (const type of ['mousePressed', 'mouseReleased'])
      await cdp.send('Input.dispatchMouseEvent', { type, x: at.x, y: at.y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount })
    await sleep(80)
    seen.push(await open())
  }
  await sleep(700)
  seen.push(await open())
  return seen
}
/** A bundle row's lead cell: its content width, its title's left edge, and its trail's width and whether the trail caps. */
const bundleLead = (rowExpr) => `(() => {
  const r = (${rowExpr}); if (!r) return null
  const cell = r.querySelector('.cell-lead'); const cs = getComputedStyle(cell); const box = cell.getBoundingClientRect(); const trail = r.querySelector('.bundle-trail')
  return { content: box.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), title: r.querySelector('.cell-title').getBoundingClientRect().left, trail: trail.getBoundingClientRect().width, capped: trail.scrollWidth > trail.clientWidth + 1 }
})()`
/** What has focus: whether it's a band head, and whether it sits inside one. */
const FOCUS = `(() => { const a = document.activeElement; return { label: a?.getAttribute('aria-label') ?? null, cls: String(a?.className ?? '').slice(0, 40), head: !!a?.classList.contains('group-band-head'), inHead: !!a?.closest('.group-band-head') } })()`
/** The band list's one Tab stop entered, then Tab: answers where each put focus. */
async function tabThrough(cdp, zone) {
  await cdp.evaluate(`(${zone}).focus()`)
  await sleep(200)
  const entered = await cdp.evaluate(FOCUS)
  await pressKey(cdp, 'Tab')
  return { entered, next: await cdp.evaluate(FOCUS) }
}
/** Enter on a focused head, twice: answers the head's `aria-expanded`, whether it kept focus, and whether `collapsed_groups` holds `key`, after each. */
async function enterFolds(cdp, headExpr, viewId, key) {
  const read = async () => ({ open: await expanded(cdp, headExpr), focused: await cdp.evaluate(`document.activeElement === (${headExpr})`), saved: (viewOnDisk(viewId)?.collapsed_groups ?? []).includes(key) })
  await cdp.evaluate(`(${headExpr}).focus()`)
  await pressKey(cdp, 'Enter')
  await settles(async () => (viewOnDisk(viewId)?.collapsed_groups ?? []).includes(key), 3000)
  const folded = await read()
  await pressKey(cdp, 'Enter')
  await settles(async () => !(viewOnDisk(viewId)?.collapsed_groups ?? []).includes(key), 3000)
  return { folded, unfolded: await read() }
}
const folds = (r) => r.folded.open === 'false' && r.folded.focused && r.folded.saved && r.unfolded.open === 'true' && !r.unfolded.saved
/** The native menu the context-menu key raises on a focused head, closed once read. */
async function menuKey(cdp, headExpr) {
  await cdp.evaluate(`(${headExpr}).focus()`)
  const rows = await menuByEvent(cdp, headExpr)
  await pickNative([])
  return labels(rows)
}
const drawn = (expr) => `(() => { const e = (${expr}); return !!e && e.getClientRects().length > 0 && e.getBoundingClientRect().width >= 8 })()`
/** The view's search, opened from the title's menu and typed into, or emptied. */
async function search(cdp, query) {
  const field = `document.querySelector('.detail-title-search')`
  if (query) {
    await popNative(cdp, await boxOf(cdp, `document.querySelector('.detail-title-text')`))
    await pickNative(['Search'])
    await until('the search field', async () => cdp.evaluate(`!!${field}`), 3000)
    await typeText(cdp, query)
  } else {
    await cdp.evaluate(`${field}.focus(); ${field}.select()`)
    await pressKey(cdp, 'Backspace')
    await pressKey(cdp, 'Escape')
  }
  await sleep(800)
}
/** The sidebar row reading `title`. */
const sideRow = (title) => `[...document.querySelectorAll('nav .row')].find((r) => r.getClientRects().length && r.textContent.trim() === ${JSON.stringify(title)})`
/** The Grouping pane's folder list: the one band list drawn outside the sidebar and the view. */
const PANE_ZONE = `[...document.querySelectorAll('.line-zone')].find((z) => z.getClientRects().length && !z.closest('nav, .sidebar, ${DRIFT.shell}, .cards-view'))`
const paneRow = (title) => `[...(${PANE_ZONE})?.querySelectorAll('[data-line-row]') ?? []].find((r) => r.getClientRects().length && r.firstElementChild?.textContent === ${JSON.stringify(title)})`
const paneTitles = (cdp) => cdp.evaluate(`[...(${PANE_ZONE})?.querySelectorAll('[data-line-row]') ?? []].filter((r) => r.getClientRects().length).map((r) => r.firstElementChild.textContent)`)
/** The Filter's Location tree: the last pane drawn, once the rule's values field opens it. */
const LOCATION_PANE = `[...document.querySelectorAll('[data-picker-portal]:not([data-dismissal-shield])')].at(-1)`
const locationRow = (title) => `[...(${LOCATION_PANE}).querySelectorAll('[role=button][data-reveal-host]')].find((r) => r.getClientRects().length && r.textContent === ${JSON.stringify(title)})`
const locationTitles = (cdp) => cdp.evaluate(`[...(${LOCATION_PANE}).querySelectorAll('[role=button][data-reveal-host]')].filter((r) => r.getClientRects().length).map((r) => r.textContent)`)
/** Where a tree row's folder glyph sits against the row's content edge: flush reads 0. */
const leafLead = (rowExpr) => `(() => { const r = (${rowExpr}); if (!r) return null; const glyph = [...r.querySelectorAll('svg')].find((s) => !s.matches('${DRIFT.chevron}')); return glyph.getBoundingClientRect().left - r.getBoundingClientRect().left - parseFloat(getComputedStyle(r).paddingLeft) })()`
/** The Location rule's tree, opened through the Settings door; `pick` adds the rule first. */
async function locationTree(cdp, pick) {
  await door(cdp, 'settings', 'Filter')
  if (pick) {
    await mouseClick(cdp, ctl('Filter property'))
    await until('the property list', async () => cdp.evaluate(`!!${portalRow('Location')}`))
    await click(cdp, portalRow('Location'))
    await until('the Location rule', async () => cdp.evaluate(`!!${ctl('Filter values')}`))
  }
  await mouseClick(cdp, ctl('Filter values'))
  await until('the Location tree', async () => cdp.evaluate(`!!${locationRow('Set Alpha')}`))
  await sleep(400)
}
/** One nesting step, in px: the decision's `--disclosure-indent`. */
const STEP = 14
const V7_ORDERED = [IDS.beta, IDS.alpha, IDS.subB, IDS.subA]

async function group7(cdp) {
  const g = '7'
  const LONG = 'VD Folder Named Long Enough That Its Inner Trail Caps'

  // BC17 · the Trash's and Archive's folder chevron is the shared control.
  const folder = async (name, page) => {
    await mutate(cdp, { op: 'createContainer', id: containerId(), parentPath: COLLECTION, kind: 'set', name })
    await mutate(cdp, { op: 'createPage', id: mintPageId(), parentPath: `${COLLECTION}/${name}`, name: page, seeds: {} })
    return `${COLLECTION}/${name}`
  }
  await mutate(cdp, { op: 'delete', path: await folder(LONG, 'VD Inside'), kind: 'set' })
  await mutate(cdp, { op: 'archive', path: await folder('VD Shelved', 'VD Shelved Page'), kind: 'set' })
  await openSettings(cdp, 'Trash')
  await until('the trashed folder', async () => cdp.evaluate(`!!${bundleRow('.trash-frame', LONG)}`))
  await sleep(500)
  const trashFolder = bundleRow('.trash-frame', LONG)
  const trashSeen = await doubleClickChevron(cdp, trashFolder)
  bc(g, 17, '7.1', 'the Trash\'s folder chevron opens the folder on a double-click\'s first click and closes it on its second, as the sidebar\'s does', same(trashSeen, ['false', 'true', 'false', 'false']), show(trashSeen))
  if ((await expanded(cdp, trashFolder)) !== 'true') await mouseClick(cdp, `(${trashFolder}).querySelector('${DRIFT.chevron}')`)
  await until('the inner row', async () => cdp.evaluate(`!!${bundleRow('.trash-frame', 'VD Inside')}`), 3000).catch(() => {})
  const outer = await cdp.evaluate(bundleLead(trashFolder))
  const inner = await cdp.evaluate(bundleLead(bundleRow('.trash-frame', 'VD Inside')))
  bc(g, 17, '7.1', 'a nested bundle row\'s trail caps at 55% of its cell, measured inside its indent', !!inner && inner.capped && near(inner.content, outer.content - STEP) && near(inner.trail, 0.55 * inner.content, 1.5), show({ outer, inner }))
  const steps = { bundle: inner && outer && inner.title - outer.title }
  await shot(cdp, 'g7-trash', `document.querySelector('.trash-frame')`)
  await closeSettings(cdp)

  await closeAll(cdp)
  await mouseClick(cdp, VIEWS_BUTTON)
  await until('the Archive row', async () => cdp.evaluate(`!!${btn('Archive')}`))
  await pressIn(cdp, btn('Archive'))
  await until('the archived folder', async () => cdp.evaluate(`!!${bundleRow('.bundle-rows', 'VD Shelved')}`))
  await closeAll(cdp)
  await sleep(500)
  const archiveSeen = await doubleClickChevron(cdp, bundleRow('.bundle-rows', 'VD Shelved'))
  bc(g, 17, '7.1', 'the Archive\'s folder chevron opens the folder on a double-click\'s first click and closes it on its second', same(archiveSeen, ['false', 'true', 'false', 'false']), show(archiveSeen))

  // BC18 · a band head takes no Tab stop of its own; Enter, the menu key, and focus are the head's as they were.
  const V7 = tableView(vid('g7table'), 'VD Disclosure')
  await must(`save ${V7.name}`, ask(cdp, 'views:save', COLLECTION, 'collection', V7, {}))
  await mouseClick(cdp, VIEWS_BUTTON)
  await until('the views dropdown', async () => cdp.evaluate(`!!${btn(V7.name)}`))
  await pressIn(cdp, btn(V7.name))
  await until('the view again', async () => cdp.evaluate(`!!${dataRow('Page A')}`))
  await closeAll(cdp)
  await showView(cdp, V7)
  const tableTab = await tabThrough(cdp, `document.querySelector('${DRIFT.shell} .line-zone')`)
  bc(g, 18, 'C-3', 'Tab from the Table\'s band list passes every band chevron and New Page button by', tableTab.entered.head && !tableTab.next.inHead, show(tableTab))
  const alphaHead = head('Set Alpha')
  const label = await cdp.evaluate(`({ expanded: (${alphaHead}).getAttribute('aria-expanded'), labeled: [...(${alphaHead}).querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).filter((l) => /^(Collapse|Expand) group$/.test(l)) })`)
  bc(g, 18, 'C-3', 'a band head carries aria-expanded and its chevron no Collapse or Expand label', label.expanded === 'true' && label.labeled.length === 0, show(label))
  const cursor = await cdp.evaluate(`getComputedStyle(${chevronOf(alphaHead)}).cursor`)
  bc(g, 18, 'C-3', 'the Table band\'s chevron shows no pointer cursor', cursor !== 'pointer', show(cursor))
  const tableEnter = await enterFolds(cdp, alphaHead, V7.id, IDS.alpha)
  reg(g, 'Enter on a focused Table band head folds it in place, focus kept, and saves collapsed_groups; Enter again unfolds it', folds(tableEnter), show(tableEnter))
  const tableMenu = await menuKey(cdp, alphaHead)
  reg(g, 'the menu key on a focused Table Set band head opens its menu with New Page', tableMenu.includes('New Page'), show(tableMenu))

  // BC19 · the ghost row draws the data rows' lead cell.
  await hover(cdp, dataRow('Page C'), 1500)
  const leads = await cdp.evaluate(`(() => { const read = (row) => { const c = row?.querySelector('.cell-lead'); const rail = c?.querySelector(':scope > .row-rail')?.getBoundingClientRect(); return c && { rail: rail ? [Math.round(rail.left), Math.round(rail.width)] : null, pad: getComputedStyle(c).paddingLeft, left: Math.round(c.getBoundingClientRect().left) } }; return { ghost: read(document.querySelector('.data-row.ghost-row')), data: read(${dataRow('Page C')}) } })()`)
  bc(g, 19, '7.5', 'the ghost row draws the data rows\' lead cell, gutter included', !!leads.ghost?.rail && same(leads.ghost, leads.data), show(leads))
  const pageA = await cdp.evaluate(leadOf(`(${dataRow('Page A')}).querySelector('.cell-lead')`))
  const alpha1 = await cdp.evaluate(leadOf(`(${dataRow('Alpha 1')}).querySelector('.cell-lead')`))
  steps.table = alpha1.content - pageA.content

  const V7C = cardsView(vid('g7cards'), 'VD Disclosure Cards', { set_cards: false })
  await showView(cdp, V7C)
  const cardsTab = await tabThrough(cdp, `[...document.querySelectorAll('.cards-view .line-zone')].find((z) => z.getClientRects().length)`)
  bc(g, 18, 'C-3', 'Tab from the Cards band list passes every band chevron and New Page button by', cardsTab.entered.head && !cardsTab.next.inHead, show(cardsTab))
  const cardsEnter = await enterFolds(cdp, head('Set Alpha'), V7C.id, IDS.alpha)
  reg(g, 'Enter on a focused Cards band head folds it in place, focus kept, and saves collapsed_groups; Enter again unfolds it', folds(cardsEnter), show(cardsEnter))
  const cardsMenu = await menuKey(cdp, head('Set Alpha'))
  reg(g, 'the menu key on a focused Cards Set band head opens its menu with New Page', cardsMenu.includes('New Page'), show(cardsMenu))

  // Regression: a search opens every band, a folded one included, and its chevron changes nothing.
  for (const [kind, view, shown] of [['Table', tableView(vid('g7search'), 'VD Search', { collapsed_groups: [IDS.alpha] }), shownTitles], ['Cards', cardsView(vid('g7searchcards'), 'VD Search Cards', { set_cards: false, collapsed_groups: [IDS.alpha] }), cardTitles]]) {
    await showView(cdp, view)
    await search(cdp, 'Page')
    const opened = { open: await expanded(cdp, head('Set Alpha')), rows: await shown(cdp) }
    await mouseClick(cdp, chevronOf(head('Set Alpha')))
    await sleep(600)
    const pressed = { open: await expanded(cdp, head('Set Alpha')), saved: viewOnDisk(view.id)?.collapsed_groups }
    await search(cdp, '')
    const cleared = await headLabels(cdp)
    reg(g, `a ${kind} search opens every band, a folded one included, and its chevron changes nothing`, opened.open === 'true' && opened.rows.includes('Page A') && pressed.open === 'true' && same(pressed.saved, [IDS.alpha]) && cleared.includes('Set Beta'), show({ opened, pressed, cleared }))
  }

  // Regression: the sidebar's chevron, and one nesting step across the Table, the bundle table, and the sidebar.
  const collection = sideRow('Collection A')
  if (await cdp.evaluate(`!!${sideRow('Set Alpha')}`)) await mouseClick(cdp, chevronOf(collection))
  await sleep(400)
  await mouseClick(cdp, chevronOf(collection))
  const sets = await settles(async () => cdp.evaluate(`!!${sideRow('Set Alpha')} && !!${sideRow('Set Beta')}`), 3000)
  reg(g, 'the sidebar\'s chevron expands a Collection, drawing its Sets', sets, show(sets))
  // The step is read between two nested rows, since a Collection's own row takes the section's padding rather than the nested rows' lead.
  if (sets) {
    await mouseClick(cdp, chevronOf(sideRow('Set Beta')))
    if (await settles(async () => cdp.evaluate(`!!${sideRow('Sub-Set A')}`), 3000))
      steps.sidebar = await cdp.evaluate(`(${sideRow('Sub-Set A')}).firstElementChild.getBoundingClientRect().left - (${sideRow('Set Beta')}).firstElementChild.getBoundingClientRect().left`)
    await mouseClick(cdp, chevronOf(sideRow('Set Beta')))
  }
  await mouseClick(cdp, chevronOf(collection))
  reg(g, 'rows nest by one 14px step in the Table, the bundle table, and the sidebar', Object.keys(steps).length === 3 && Object.values(steps).every((s) => near(s, STEP)), show(steps))

  // BC20 · Hide Disclosure Chevrons reaches the sidebar and the Grouping pane through one rule.
  await openSettings(cdp, 'Interface')
  const caption = await cdp.evaluate(`(() => { let el = ${SWITCH('Hide Disclosure Chevrons')}; while (el && !/gutter/.test(el.textContent)) el = el.parentElement; return el?.textContent.replace('Hide Disclosure Chevrons', '').trim() ?? null })()`)
  await closeSettings(cdp)
  bc(g, 20, 'C-4', 'Hide Disclosure Chevrons\' caption names the sidebar and the Grouping pane', /sidebar/.test(caption ?? '') && /Grouping pane/.test(caption ?? ''), show(caption))
  const sideGeometry = `(() => { const r = ${collection}; const cs = getComputedStyle(r); const box = r.getBoundingClientRect(); return { left: box.left, icon: r.querySelector('.row-icon').getBoundingClientRect().left - box.left - parseFloat(cs.paddingLeft), gap: parseFloat(cs.columnGap) } })()`
  const shownGeometry = await cdp.evaluate(sideGeometry)
  await setting(cdp, 'Hide Disclosure Chevrons', true)
  const hiddenGeometry = await cdp.evaluate(sideGeometry)
  bc(g, 20, 'C-4', 'with Hide Disclosure Chevrons on, a sidebar row keeps its 8px gap where the chevron sat and its hover fill stays where it reaches with chevrons shown', near(hiddenGeometry.left, shownGeometry.left) && near(hiddenGeometry.icon, hiddenGeometry.gap), show({ shownGeometry, hiddenGeometry }))

  const V7O = tableView(vid('g7order'), 'VD Location Order', { group_order: V7_ORDERED })
  await showView(cdp, V7O)
  await door(cdp, 'settings', 'Group')
  await until('the Grouping list', async () => cdp.evaluate(`!!${paneRow('Set Beta')}`))
  const paneChevron = await cdp.evaluate(drawn(`(${paneRow('Set Beta')}).querySelector('${DRIFT.chevron}')`))
  reg(g, 'with Hide Disclosure Chevrons on, the Grouping pane\'s folder list draws no chevron', !paneChevron, show(paneChevron))
  await closeAll(cdp)
  const kept = { band: await cdp.evaluate(drawn(chevronOf(head('Set Beta')))) }
  await locationTree(cdp, true)
  kept.location = await cdp.evaluate(drawn(`(${locationRow('Set Beta')}).querySelector('${DRIFT.chevron}')`))
  await closeAll(cdp)
  await openSettings(cdp, 'Trash')
  await until('the trashed folder', async () => cdp.evaluate(`!!${trashFolder}`))
  kept.bundle = await cdp.evaluate(drawn(`(${trashFolder}).querySelector('${DRIFT.chevron}')`))
  await closeSettings(cdp)
  reg(g, 'bands, the bundle table, and the Location tree keep their chevrons under Hide Disclosure Chevrons', kept.band && kept.location && kept.bundle, show(kept))
  await setting(cdp, 'Hide Disclosure Chevrons', false)

  // BC21 · the Location tree takes the view's custom Set order and the Grouping tree's leaf spacing.
  await door(cdp, 'settings', 'Group')
  await until('the Grouping list', async () => cdp.evaluate(`!!${paneRow('Set Alpha')}`))
  const groupingLeaf = await cdp.evaluate(leafLead(`(${paneRow('Set Alpha')}).firstElementChild`))
  const paneShut = await paneTitles(cdp)
  await mouseClick(cdp, chevronOf(paneRow('Set Beta')))
  await sleep(500)
  const paneOpen = await paneTitles(cdp)
  await mouseClick(cdp, chevronOf(paneRow('Set Beta')))
  await sleep(500)
  const paneShutAgain = await paneTitles(cdp)
  reg(g, 'the Grouping pane\'s folder list expands and collapses by its chevron', !paneShut.includes('Sub-Set A') && paneOpen.includes('Sub-Set A') && paneOpen.includes('Sub-Set B') && !paneShutAgain.includes('Sub-Set A'), show({ paneShut, paneOpen, paneShutAgain }))
  await locationTree(cdp)
  const locationLeaf = await cdp.evaluate(leafLead(locationRow('Set Alpha')))
  const tops = (await locationTitles(cdp)).filter((t) => ['Set Alpha', 'Set Beta'].includes(t))
  await mouseClick(cdp, chevronOf(locationRow('Set Beta')))
  await sleep(500)
  const opened = (await locationTitles(cdp)).filter((t) => t.startsWith('Sub-Set'))
  await mouseClick(cdp, chevronOf(locationRow('Set Beta')))
  await sleep(500)
  const shut = (await locationTitles(cdp)).filter((t) => t.startsWith('Sub-Set'))
  await closeAll(cdp)
  bc(g, 21, 'C-5', 'the Location tree lists Set Beta before Set Alpha and Sub-Set B before Sub-Set A under the view\'s custom Set order', same(tops, ['Set Beta', 'Set Alpha']) && same(opened, ['Sub-Set B', 'Sub-Set A']), show({ tops, opened }))
  bc(g, 21, 'C-5', 'a Location tree leaf sits flush where the Grouping list\'s does', near(locationLeaf, groupingLeaf), show({ locationLeaf, groupingLeaf }))
  reg(g, 'the Filter\'s Location tree expands and collapses by its chevron', opened.length === 2 && shut.length === 0, show({ opened, shut }))
  await shot(cdp, 'g7-trees')

  // F7 · the Grouping pane's refused nest of a Set the stored group_order never ranked returns it to the slot its drop was ranked from.
  const nest = await refusedNest(cdp, 'g7nest', {
    open: async () => {
      await door(cdp, 'settings', 'Group')
      await until('the Grouping list', async () => cdp.evaluate(`!!${paneRow('Set Alpha')}`))
    },
    row: paneRow,
    labels: () => paneTitles(cdp),
  })
  fold(g, 'nest', 'a refused nest of VD Delta in the Grouping pane\'s Set list, which the stored group_order never ranked, returns it to the end it was ranked from while VD Gamma\'s reorder over it stands', nest.pass, show(nest))
  await shot(cdp, 'g7-end')
}

// ── The run ─────────────────────────────────────────────────────────────────

let cdp
try {
  ;({ cdp } = await launch(PORT, 'views-drive-shots'))
  await seed(cdp)
  await mouseClick(cdp, `[...document.querySelectorAll('.row span')].findLast((e) => e.textContent.trim() === 'Collection A')`)
  await sleep(1200)
  for (const g of BUILT) if (GROUPS.has(g)) await { 2: group2, 3: group3, 4: group4, 5: group5, 6: group6, 7: group7 }[g](cdp)
  cdp.close()
} catch (e) {
  item(0, 0, '—', 'the run reached its end', false, String(e?.stack ?? e))
  if (cdp) await shot(cdp, 'failure').catch(() => {})
} finally {
  await ungate().catch(() => {})
  await restore()
}
tally(['0', ...BUILT.filter((g) => GROUPS.has(g))], {
  marks: ['PASS', 'FAIL', 'AHEAD', 'AWAIT'],
  note: ` (--landed ${LANDED}: an item a later phase owns reads AWAIT or AHEAD and leaves the exit code alone)`,
})
