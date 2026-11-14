import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  activeTab, ask, boxOf, click, clicks, closePanel, holds, hover, closeSettings, escapeAll, FM, inMain, labels, launch, manageButton, manageRow, menuByEvent, mintPageId,
  mouseAt, mouseClick, must, NEXUS, openPanel, openSettings, PANE_LAYER, phasedItem, ribbon, pickNative, popNative, pressKey, press, resizeBy, restore, settles,
  META, SETTINGS_BUTTON, shot, sleep, SWITCH, tally, typeText, until, zoom,
} from '../drive-harness.mjs'
import { parse } from 'yaml'

const PORT = 9423
const BUILT = ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11']
const argv = process.argv.slice(2)
const at = argv.indexOf('--landed')
const LANDED = at >= 0 ? Number(argv[at + 1]) : NaN
const GROUPS = new Set(argv.filter((a, i) => i !== at && i !== at + 1))
if (!Number.isInteger(LANDED) || GROUPS.size === 0 || [...GROUPS].some((g) => !BUILT.includes(g))) {
  console.error(`usage: node live-drive.mjs <group…> --landed <phase>   (groups ${BUILT.join(', ')}; --landed 0 is the baseline)`)
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
/** A page's title by its id: group 11's read of the tree first, then the seed's pages. */
const titleOf = (id) => listPages.cache.get(id)?.title ?? Object.keys(PAGES).find((t) => PAGES[t].id === id) ?? id

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

/** The registry written as `defs`, answering once the tree reads every one. */
async function writeRegistry(cdp, defs) {
  writeFileSync(abs('.nexus/properties.json'), JSON.stringify({ defs: Object.fromEntries(defs.map((d) => [d.id, d])), order: defs.map((d) => d.id) }, null, 2))
  await until('the definitions', async () => (await ask(cdp, 'nexus:state')).value.tree.config.registry.length === defs.length)
}
/** The registry, its assignment, and each page's stage, written once for every group. */
async function seed(cdp) {
  await writeRegistry(cdp, DEFS)
  for (const d of DEFS) await mutate(cdp, { op: 'assignProperty', containerPath: COLLECTION, propertyId: d.id })
  for (const [title, opt] of Object.entries(STAGES))
    await mutate(cdp, { op: 'setProperty', path: PAGES[title].path, propertyId: STAGE.id, value: { kind: 'select', value: opt } })
  await until('the stages', async () => Object.entries(STAGES).every(([t]) => frontOf(PAGES[t].path)[STAGE.key]))
}

// ── The host's round trip, widened ─────────────────────────────────────────

/** Wraps `mutate`, `views:save`, and `tiles:save` in the main process once, so a drive rule can hold a reply or refuse it; a rule matches one call and is spent. */
const GATE = `(() => {
  const { ipcMain } = process.mainModule.require('electron')
  const g = (globalThis.__vdGate ??= { orig: new Map(), rules: [] })
  for (const ch of ['mutate', 'views:save', 'tiles:save']) {
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
const PORTAL_ROWS = `[...document.querySelectorAll('${PANE_LAYER} [role=button]')]`
const portalRow = (text) => `${PORTAL_ROWS}.find((e) => e.textContent.trim() === ${JSON.stringify(text)})`
/** The last pane `MenuBase` portaled, and its shell. */
const TOP_LAYER = `[...document.querySelectorAll('${PANE_LAYER}')].at(-1)`
const PORTAL_PANE = `(${TOP_LAYER})?.firstElementChild`

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
/** The pointer moved, not pressed, to `to`: by default the window's corner. */
const away = async (cdp, to = { x: 6, y: 6 }) => {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: to.x, y: to.y, button: 'none' })
  await sleep(400)
}
/** One wheel turn delivered where the pointer rests at `at`, then a settle. */
const wheel = async (cdp, at, deltaX, deltaY, settle = 600) => {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: at.x, y: at.y, deltaX, deltaY })
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
  const h = [...document.querySelectorAll('.group-band-head')].find((e) => e.getAttribute('aria-label') === ${JSON.stringify(label)} && e.getClientRects().length && !e.closest('[inert]'))
  const band = h?.closest('.group-band')
  return band ? [...band.querySelectorAll('.data-row[data-rid]')].map((r) => r.dataset.rid) : null
})()`).then((ids) => ids?.map(titleOf) ?? null)
/** A row, found by `rowExpr`, dragged by its grip to `to`. */
const gripDrag = async (cdp, rowExpr, to, opts) => {
  await hover(cdp, rowExpr, 300)
  const grip = await boxOf(cdp, `(${rowExpr}).querySelector('.row-grip')`)
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
    await gripDrag(cdp, dataRow('Page A'), { x: beta1.x, y: beta1.bottom - 3 }, { settle: 300 })
    const staged = await bandRows(cdp, 'Doing')
    const alpha1 = await boxOf(cdp, dataRow('Alpha 1'))
    await gripDrag(cdp, dataRow('Alpha 1'), { x: alpha1.x, y: (await boxOf(cdp, dataRow('Page C'))).top + 3 }, { settle: 300 })
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
  await gripDrag(cdp, dataRow('Page C'), { x: target.x, y: target.top + 3 })
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
const headTexts = (cdp) => cdp.evaluate(`[...document.querySelectorAll('${DRIFT.shell} .table-head .col-header')].filter((h) => h.getClientRects().length && !h.closest('[inert]')).map((h) => h.textContent.trim())`)
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
const card = (title) => visible(`[...document.querySelectorAll('.cards-view [data-rid="${PAGES[title]?.id ?? title}"]')]`)
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
    await mouseClick(cdp, `(${head(label)}).querySelector('[aria-label="New page in group"]')`)
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
  const field = visible(`[...document.querySelectorAll('.detail-title-search')]`)
  if (query) {
    await popNative(cdp, await boxOf(cdp, visible(`[...document.querySelectorAll('.detail-title-text')]`)))
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
/** The Filter's Location tree is the last pane drawn once the rule's values field opens it. */
const locationRow = (title) => `[...(${TOP_LAYER}).querySelectorAll('[role=button][data-reveal-host]')].find((r) => r.getClientRects().length && r.textContent === ${JSON.stringify(title)})`
const locationTitles = (cdp) => cdp.evaluate(`[...(${TOP_LAYER}).querySelectorAll('[role=button][data-reveal-host]')].filter((r) => r.getClientRects().length).map((r) => r.textContent)`)
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

// ── Group 8 — View Tiles ────────────────────────────────────────────────────

/** The homepage's tile board, written whole on disk, so the open board reloads it as another window's write. */
const TILES = '.nexus/interface/homepage/_tiles.json'
const tileOnDisk = () => JSON.parse(readRel(TILES)).tiles[0]
const tileNames = () => tileOnDisk().views.map((v) => v.config.name)
const PILLS = `[...document.querySelectorAll('button[aria-roledescription="sortable"]')].filter((b) => b.getClientRects().length && b.querySelector('svg'))`
const pill = (name) => `${PILLS}.find((b) => b.textContent.trim() === ${JSON.stringify(name)})`
const pillNames = (cdp) => cdp.evaluate(`${PILLS}.map((b) => b.textContent.trim())`)
const TILE_BODY = `(${PILLS}[0] ?? document.querySelector('button .lucide-chevrons-up-down')?.closest('button'))?.closest('[data-reveal-host]').parentElement.parentElement.nextElementSibling`
/** Whether the tile's strip is drawn: its row's space takes height. */
const STRIP_OPEN = `(${PILLS}[0]?.closest('[data-reveal-host]').parentElement.getBoundingClientRect().height ?? 0) > 0`
const DROP_SWITCH = `document.querySelector('button .lucide-chevrons-up-down')?.closest('button')`
const tileRow = (name) => `[...document.querySelectorAll('[data-picker-portal] [role=button]')].find((e) => e.getClientRects().length && e.textContent.trim() === ${JSON.stringify(name)})`
const FIELD = `(document.activeElement?.tagName === 'INPUT' ? document.activeElement : null)`
const fieldLook = `(() => { const f = ${FIELD}; return f && { cls: f.className, size: f.getAttribute('size') } })()`
let tileSource
let boards = 0
/** The board holding one view tile over Collection A, its views `views` and its own keys `extra`, drawn once its title reads this write's own. */
async function showTile(cdp, views, extra = {}) {
  tileSource ??= (await ask(cdp, 'nexus:state')).value.tree.collections.find((c) => c.path === COLLECTION).id
  const id = `01KZVD${'8'.padStart(20, '0')}`
  const title = `VD Board ${++boards}`
  const entry = { id, type: 'view', active: 0, display_title: title, views: views.map((config) => ({ source_id: tileSource, config: { icon: `view-${config.type}`, group: { kind: 'structural' }, property_order: ['_title'], hidden_properties: [], ...config } })), ...extra }
  writeFileSync(abs(TILES), JSON.stringify({ layout: { bands: [{ node: { kind: 'tile', id, h: 260 } }] }, locked: false, tiles: [entry] }, null, 2))
  if (!(await cdp.evaluate(`!!(${visible(`[...document.querySelectorAll('.banner-title, .detail-title')]`)})?.textContent.includes('Test')`))) await mouseClick(cdp, ribbon('Homepage'))
  await until(`the tile's ${title}`, async () => cdp.evaluate(`[...document.querySelectorAll('span')].some((e) => !e.children.length && e.textContent === ${JSON.stringify(title)} && !e.closest('[inert]'))`))
  await sleep(600)
}
const TA = { id: vid('g8tilea'), name: 'VD Tile A', type: 'table' }
const TB = { id: vid('g8tileb'), name: 'VD Tile B', type: 'cards' }
/** The toolbar dropdown open over Collection A's views. */
async function openDropdown(cdp, name) {
  await closeAll(cdp)
  await mouseClick(cdp, VIEWS_BUTTON)
  await until('the views dropdown', async () => cdp.evaluate(`!!${btn(name)}`))
}
/** A row's native menu popped and `path` chosen, answering its rows with their enabled state. */
async function rowMenu(cdp, expr, path) {
  await cdp.evaluate(`(${expr}).scrollIntoView({ block: 'center' })`)
  await sleep(300)
  const rows = await popNative(cdp, await boxOf(cdp, expr))
  await pickNative(path)
  await sleep(600)
  return (rows ?? []).filter((r) => !r.separator).map((r) => (r.enabled ? r.label : `(${r.label})`))
}
/** A rename begun from a row's menu: typed and committed, cancelled by Escape, or committed while `refuse` refuses the write. */
async function renameRow(cdp, expr, name, { cancel = false, refuse } = {}) {
  await rowMenu(cdp, expr, ['Rename'])
  const opened = await settles(async () => cdp.evaluate(`!!${FIELD}`), 3000)
  if (!opened) return false
  await cdp.evaluate(`${FIELD}.select()`)
  await typeText(cdp, name)
  if (refuse) await hold(refuse, '() => true', 1500, true)
  await pressKey(cdp, cancel ? 'Escape' : 'Enter')
  return true
}

/** A toolbar dropdown row renamed with its `views:save` reply held 2.5 s, refused when `refuse`: every frame's drawn row names, `from` or `to`, from the commit until the reply has landed. */
async function heldRename(cdp, from, to, refuse = false) {
  await openDropdown(cdp, from)
  await rowMenu(cdp, btn(from), ['Rename'])
  if (!(await settles(async () => cdp.evaluate(`!!${FIELD}`), 3000))) return { seen: [] }
  await cdp.evaluate(`${FIELD}.select()`)
  await typeText(cdp, to)
  await hold('views:save', '() => true', 2500, refuse)
  await cdp.evaluate(ARM_FRAMES(`[...document.querySelectorAll('[role=button]')].filter((e) => e.getClientRects().length).map((e) => e.textContent.trim()).filter((t) => t === ${JSON.stringify(from)} || t === ${JSON.stringify(to)})`))
  await pressKey(cdp, 'Enter')
  await sleep(3500)
  return { seen: (await frames(cdp)).filter((names) => names.length) }
}
/** A pick a tile pill's menu opened, the tile locked on disk by another window while it's up: whether the pick was still there to make, and the entry after. */
async function lockedPick(cdp, open, pick) {
  await showTile(cdp, [TA, TB])
  await open()
  const board = JSON.parse(readRel(TILES))
  board.tiles[0].locked = true
  writeFileSync(abs(TILES), JSON.stringify(board, null, 2))
  await sleep(2000)
  const picked = await pick()
  await sleep(1200)
  return { picked, entry: tileOnDisk() }
}

async function group8(cdp) {
  const g = '8'
  await showTile(cdp, [TA, TB])

  // Regression: a pill switches the tile's view.
  await mouseClick(cdp, pill(TB.name))
  const switched = await settles(async () => tileOnDisk().active === 1 && (await cdp.evaluate(`!!(${TILE_BODY})?.querySelector('.cards-view')`)))
  reg(g, 'a tile\'s pill switches its view', switched, show(tileOnDisk().active))
  await mouseClick(cdp, pill(TA.name))
  await settles(async () => tileOnDisk().active === 0)

  // BC22 · a new pill's entering class holds until the list next changes.
  const classesOf = (expr) => cdp.evaluate(`[...((${expr})?.classList ?? [])]`)
  const shared = new Set([...(await classesOf(pill(TA.name))), ...(await classesOf(pill(TB.name)))])
  const NEW = `[...document.querySelectorAll('[aria-label="New View"]')].find((e) => e.getClientRects().length)`
  await mouseClick(cdp, NEW, { settle: 150 })
  const newborn = `${PILLS}[2]`
  const born = (await classesOf(newborn)).filter((c) => !shared.has(c))
  await sleep(1500)
  const played = await classesOf(newborn)
  await mouseClick(cdp, NEW, { settle: 400 })
  const next = await classesOf(newborn)
  bc(g, 22, '8.2', 'a new pill\'s entering class stays after its entrance plays, until the tile\'s list next changes', born.length > 0 && born.some((c) => played.includes(c) && !next.includes(c)), show({ born, played, next }))
  await showTile(cdp, [TA, TB])

  // BC23 · a locked tile's pill opens no rename.
  await showTile(cdp, [TA, TB], { locked: true })
  await clicks(cdp, await boxOf(cdp, `(${pill(TB.name)}).querySelector('span')`), 2)
  const lockedField = await cdp.evaluate(`!!${FIELD}`)
  await pressKey(cdp, 'Escape')
  bc(g, 23, '3.2', 'a locked tile\'s view pill opens no rename on a double-click', !lockedField, show(lockedField))
  await showTile(cdp, [TA, TB])

  // BC23 · a tile's duplicate names its copy from the stored entry, a name another window wrote while its menu was up included.
  const seq = await inMain('__drive.seq')
  await cdp.evaluate(`(${pill(TA.name)}).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))`)
  await until('the pill\'s menu', async () => inMain(`__drive.seq > ${seq}`), 3000)
  const board = JSON.parse(readRel(TILES))
  board.tiles[0].views[1].config.name = 'VD Tile A (2)'
  writeFileSync(abs(TILES), JSON.stringify(board, null, 2))
  await until('the stored rename drawn', async () => cdp.evaluate(`!!${pill('VD Tile A (2)')}`))
  await pickNative(['Duplicate'])
  await settles(async () => tileNames().length === 3)
  const copied = tileNames()
  bc(g, 23, '3.2', 'a tile\'s duplicate names its copy from the stored entry, a sibling another window named meanwhile included', same(copied, ['VD Tile A', 'VD Tile A (3)', 'VD Tile A (2)']), show(copied))
  reg(g, 'duplicating in a tile switches the tile to the copy', tileOnDisk().active === 1, show(tileOnDisk().active))

  // Regression: a tile's delete, its Undo, and the last view kept.
  await showTile(cdp, [TA, TB])
  await rowMenu(cdp, pill(TB.name), ['Delete'])
  if (await settles(async () => cdp.evaluate(`!!document.querySelector('[role="alertdialog"]')`), 2000))
    await click(cdp, `[...document.querySelector('[role="alertdialog"]').querySelectorAll('button')].find((b) => b.textContent.trim() === 'Delete')`)
  const gone = await settles(async () => same(tileNames(), [TA.name]))
  const undo = `[...document.querySelectorAll('[role=status] button, [role=alert] button')].find((b) => b.textContent.trim() === 'Undo')`
  const offered = await settles(async () => cdp.evaluate(`!!(${undo})`), 3000)
  if (offered) await click(cdp, undo)
  const restored = await settles(async () => same(tileNames(), [TA.name, TB.name]))
  reg(g, 'a view deleted from a tile leaves the entry and its notice\'s Undo restores it in place', gone && offered && restored, show({ gone, offered, names: tileNames() }))
  await showTile(cdp, [TA])
  const tileLast = await rowMenu(cdp, pill(TA.name), [])

  // F8 · a lock another window writes stops a pick the tile's menu already opened.
  const picker = (label) => `[...document.querySelectorAll('[data-picker-portal] [aria-label="${label}"]')].at(-1)`
  const color = await lockedPick(cdp, async () => {
    await rowMenu(cdp, pill(TB.name), ['Edit Color'])
    await until('the color picker', async () => cdp.evaluate(`!!${picker('red-3')}`))
  }, async () => (await cdp.evaluate(`!!${picker('red-3')}`)) && (await click(cdp, picker('red-3')), true))
  const ICON = `document.querySelector('[data-picker-portal] .lucide-activity')?.closest('button')`
  const icon = await lockedPick(cdp, async () => {
    await rowMenu(cdp, pill(TB.name), ['Edit Icon'])
    await until('the icon picker', async () => cdp.evaluate(`!!${ICON}`))
  }, async () => (await cdp.evaluate(`!!${ICON}`)) && (await mouseClick(cdp, ICON), true))
  const CONFIRM = `[...(document.querySelector('[role="alertdialog"]')?.querySelectorAll('button') ?? [])].find((b) => b.textContent.trim() === 'Delete')`
  const removal = await lockedPick(cdp, async () => {
    await rowMenu(cdp, pill(TB.name), ['Delete'])
    await until('the delete confirm', async () => cdp.evaluate(`!!(${CONFIRM})`))
  }, async () => (await cdp.evaluate(`!!(${CONFIRM})`)) && (await click(cdp, CONFIRM), true))
  await escapeAll(cdp)
  const kept = { color: color.entry.views[1].config.color ?? null, icon: icon.entry.views[1].config.icon, views: removal.entry.views.length, picked: [color.picked, icon.picked, removal.picked] }
  fold(g, 'lock', 'a lock another window writes while a tile pill\'s Edit Color, Edit Icon, or delete confirm is open stops its pick', kept.color === null && kept.icon === 'view-cards' && kept.views === 2, show(kept))

  // Regression: a pill dragged before its sibling reorders the tile's views.
  await showTile(cdp, [TA, TB])
  const a = await boxOf(cdp, pill(TA.name))
  const b = await boxOf(cdp, pill(TB.name))
  await dragPoints(cdp, { x: b.x, y: b.y }, { x: a.left + 3, y: a.y })
  reg(g, 'a pill dragged before its sibling reorders the tile\'s views', await settles(async () => same(tileNames(), [TB.name, TA.name])), show(tileNames()))

  // The shared row, through the tile's dropdown.
  await showTile(cdp, [TA, TB], { view_style: 'dropdown' })
  const openTileList = async () => {
    await escapeAll(cdp)
    await sleep(500)
    await mouseClick(cdp, DROP_SWITCH)
    await until('the tile\'s list', async () => cdp.evaluate(`!!${tileRow(TA.name)}`))
  }
  await openTileList()
  const tileRows = await rowMenu(cdp, tileRow(TB.name), ['Rename'])
  await settles(async () => cdp.evaluate(`!!${FIELD}`), 3000)
  const tileField = await cdp.evaluate(fieldLook)
  await pressKey(cdp, 'Escape')
  const tileRename = {}
  await openTileList()
  tileRename.cancelled = (await renameRow(cdp, tileRow(TB.name), 'VD Tile Never', { cancel: true })) && (await holds(async () => tileNames()[1] === TB.name, 1200))
  await openTileList()
  tileRename.committed = (await renameRow(cdp, tileRow(TB.name), 'VD Tile Renamed')) && (await settles(async () => tileNames()[1] === 'VD Tile Renamed'))
  await openTileList()
  await renameRow(cdp, tileRow('VD Tile Renamed'), 'VD Tile Refused', { refuse: 'tiles:save' })
  await sleep(2500)
  await escapeAll(cdp)
  await mouseClick(cdp, DROP_SWITCH)
  tileRename.refused = { disk: tileNames()[1], drawn: await settles(async () => cdp.evaluate(`!!${tileRow('VD Tile Renamed')} && !${tileRow('VD Tile Refused')}`), 3000) }
  await openTileList()
  await rowMenu(cdp, tileRow(TA.name), ['Edit Color'])
  await until('the color picker', async () => cdp.evaluate(`!!document.querySelector('[data-picker-portal] [aria-label="red-3"]')`))
  await click(cdp, `[...document.querySelectorAll('[data-picker-portal] [aria-label="red-3"]')].at(-1)`)
  const tileColor = await settles(async () => tileOnDisk().views[0].config.color === 'red-3')
  await escapeAll(cdp)
  await openTileList()
  await rowMenu(cdp, tileRow(TA.name), ['Edit Icon'])
  await until('the icon picker', async () => cdp.evaluate(`!!document.querySelector('[data-picker-portal] .lucide-activity')`))
  await mouseClick(cdp, `document.querySelector('[data-picker-portal] .lucide-activity').closest('button')`)
  const tileIcon = await settles(async () => tileOnDisk().views[0].config.icon === 'activity')
  await escapeAll(cdp)

  // The shared row, through the toolbar's dropdown over the same row and menu.
  const V8 = tableView(vid('g8toolbar'), 'VD Bar A')
  const V8B = tableView(vid('g8toolbarb'), 'VD Bar B')
  await must('save', ask(cdp, 'views:save', COLLECTION, 'collection', V8B, {}))
  await mouseClick(cdp, `[...document.querySelectorAll('.row span')].findLast((e) => e.textContent.trim() === 'Collection A')`)
  await showView(cdp, V8)
  await openDropdown(cdp, V8B.name)
  const barRows = await rowMenu(cdp, btn(V8B.name), ['Rename'])
  await settles(async () => cdp.evaluate(`!!${FIELD}`), 3000)
  const barField = await cdp.evaluate(fieldLook)
  await pressKey(cdp, 'Escape')
  bc(g, 22, '8.1', 'a tile dropdown row\'s rename field doesn\'t auto-size, matching the toolbar dropdown\'s', !!tileField && same(tileField, barField), show({ tileField, barField }))
  reg(g, 'the tile\'s and the toolbar\'s row menus offer the same rows, the tile adding its Titles row', same(tileRows.filter((r) => !/Titles$/.test(r)), barRows) && tileRows.length === barRows.length + 1, show({ tileRows, barRows }))
  const barRename = {}
  await openDropdown(cdp, V8B.name)
  barRename.cancelled = (await renameRow(cdp, btn(V8B.name), 'VD Bar Never', { cancel: true })) && (await holds(async () => viewOnDisk(V8B.id)?.name === V8B.name, 1200))
  await openDropdown(cdp, V8B.name)
  barRename.committed = (await renameRow(cdp, btn(V8B.name), 'VD Bar Renamed')) && (await settles(async () => viewOnDisk(V8B.id)?.name === 'VD Bar Renamed'))
  await openDropdown(cdp, 'VD Bar Renamed')
  await renameRow(cdp, btn('VD Bar Renamed'), 'VD Bar Refused', { refuse: 'views:save' })
  await sleep(2500)
  await closeAll(cdp)
  await mouseClick(cdp, VIEWS_BUTTON)
  barRename.refused = { disk: viewOnDisk(V8B.id)?.name, drawn: await settles(async () => cdp.evaluate(`!!${btn('VD Bar Renamed')} && !${btn('VD Bar Refused')}`), 3000) }
  reg(g, 'a rename through the shared row commits, cancels, and stands refused in the tile\'s dropdown', tileRename.cancelled && tileRename.committed && tileRename.refused.disk === 'VD Tile Renamed' && tileRename.refused.drawn, show(tileRename))
  reg(g, 'a rename through the shared row commits, cancels, and stands refused in the toolbar\'s dropdown', barRename.cancelled && barRename.committed && barRename.refused.disk === 'VD Bar Renamed' && barRename.refused.drawn, show(barRename))
  await openDropdown(cdp, V8.name)
  await rowMenu(cdp, btn(V8.name), ['Edit Color'])
  await until('the color picker', async () => cdp.evaluate(`!!document.querySelector('[data-picker-portal] [aria-label="red-3"]')`))
  await click(cdp, `[...document.querySelectorAll('[data-picker-portal] [aria-label="red-3"]')].at(-1)`)
  const barColor = await settles(async () => viewOnDisk(V8.id)?.color === 'red-3')
  await openDropdown(cdp, V8.name)
  await rowMenu(cdp, btn(V8.name), ['Edit Icon'])
  await until('the icon picker', async () => cdp.evaluate(`!!document.querySelector('[data-picker-portal] .lucide-activity')`))
  await mouseClick(cdp, `document.querySelector('[data-picker-portal] .lucide-activity').closest('button')`)
  const barIcon = await settles(async () => viewOnDisk(V8.id)?.icon === 'activity')
  reg(g, 'the shared row\'s Edit Icon and Edit Color save in the tile and the toolbar alike', tileColor && tileIcon && barColor && barIcon, show({ tileColor, tileIcon, barColor, barIcon }))
  await openDropdown(cdp, V8.name)
  const count = (sidecarOnDisk().views ?? []).length
  await rowMenu(cdp, btn(V8.name), ['Duplicate'])
  const copiedBar = await settles(async () => (sidecarOnDisk().views ?? []).length === count + 1)
  await sleep(500)
  reg(g, 'duplicating in the toolbar dropdown leaves the shown view', copiedBar && (await cdp.evaluate(`${VIEWS_BUTTON}.textContent.trim()`)) === V8.name, show({ copiedBar, shown: await cdp.evaluate(`${VIEWS_BUTTON}.textContent.trim()`) }))
  await openDropdown(cdp, V8.name)
  await cdp.evaluate(`(${btn(V8.name)}).scrollIntoView({ block: 'center' })`)
  await sleep(300)
  const order = () => (sidecarOnDisk().views ?? []).map((v) => v.id)
  const from = await boxOf(cdp, btn(V8.name))
  const to = await boxOf(cdp, btn('VD Bar Renamed'))
  await dragPoints(cdp, { x: from.x, y: from.y }, { x: to.x, y: to.top + 3 })
  reg(g, 'a toolbar dropdown row dragged above its sibling reorders the views', await settles(async () => order().indexOf(V8.id) >= 0 && order().indexOf(V8.id) < order().indexOf(V8B.id)), show(order().map((id) => id.slice(-8))))
  // F8 · a dropdown row's rename shows its new name through the held save, and a refusal takes it back.
  const shown = await heldRename(cdp, V8.name, 'VD Bar Held')
  const other = await heldRename(cdp, 'VD Bar Renamed', 'VD Bar Held B')
  const refused = await heldRename(cdp, 'VD Bar Held B', 'VD Bar Unsaved', true)
  const through = (r, to) => r.seen.length > 0 && r.seen.every((names) => same(names, [to]))
  fold(g, 'rename', 'a toolbar dropdown row\'s rename shows the new name through its held save, on the shown view\'s row and another\'s, and a refused one returns to the old', through(shown, 'VD Bar Held') && through(other, 'VD Bar Held B') && same(refused.seen[0], ['VD Bar Unsaved']) && same(refused.seen.at(-1), ['VD Bar Held B']) && viewOnDisk(V8B.id)?.name === 'VD Bar Held B', show({ shown, other, refused }))
  await closeAll(cdp)
  await mouseClick(cdp, `[...document.querySelectorAll('.row span')].findLast((e) => e.textContent.trim() === 'Collection B')`)
  await until('Collection B', async () => cdp.evaluate(`${VIEWS_BUTTON}?.textContent.trim().length > 0 && document.querySelector('.detail-title-text')?.textContent === 'Collection B'`))
  const only = await cdp.evaluate(`${VIEWS_BUTTON}.textContent.trim()`)
  await openDropdown(cdp, only)
  const barLast = await rowMenu(cdp, btn(only), [])
  await closeAll(cdp)
  reg(g, 'the last view can\'t be deleted from either list', tileLast.includes('(Delete)') && barLast.includes('(Delete)'), show({ tileLast, barLast }))

  // Regression: the tile's reveal anchors where each renderer leads, and its view draws at the tile's zoom and padding.
  const peek = async (expr) => {
    await hover(cdp, expr, 1500)
    return cdp.evaluate(STRIP_OPEN)
  }
  await showTile(cdp, [TA, TB], { view_band: false })
  const table = { head: await peek(`(${TILE_BODY}).querySelector('.table-head')`), row: await peek(`(${TILE_BODY}).querySelector('.data-row[data-rid]')`) }
  const tableLook = await cdp.evaluate(`(() => { const body = ${TILE_BODY}; const shell = body.querySelector('.table-shell'); return { fill: getComputedStyle(body.querySelector('.table-head')).getPropertyValue('--heading-fill').trim(), zoom: getComputedStyle(shell).getPropertyValue('--zoom').trim(), embed: getComputedStyle(body).getPropertyValue('--view-embed-zoom').trim() } })()`)
  await showTile(cdp, [TA, { ...TB, set_cards: false, group: { kind: 'flat' } }], { view_band: false, active: 1 })
  const cards = { card: await peek(`(${TILE_BODY}).querySelector('.cards-view .card')`) }
  const cardsLook = await cdp.evaluate(`(() => { const body = ${TILE_BODY}; const view = body.querySelector('.cards-view'); const grid = view.querySelector('.cards-grid'); const z = parseFloat(getComputedStyle(view).zoom) * (parseFloat(getComputedStyle(body).getPropertyValue('--tile-zoom')) || 1); return { zoom: getComputedStyle(view).getPropertyValue('--zoom').trim(), embed: getComputedStyle(body).getPropertyValue('--embed-zoom').trim(), pad: parseFloat(getComputedStyle(grid).paddingLeft) * z, inset: parseFloat(getComputedStyle(body).getPropertyValue('--tile-inset-l')) || 14 } })()`)
  await showTile(cdp, [TA, { ...TB, set_cards: false }], { view_band: false, active: 1 })
  const band = { band: await peek(`(${TILE_BODY}).querySelector('.group-band-row')`), card: await peek(`(${TILE_BODY}).querySelector('.cards-view .card')`) }
  await showTile(cdp, [TA, { ...TB, set_cards: false, ...byStage, filter: { match: 'all', rules: [{ property_id: '_title', op: 'contains', value: 'VD Nothing Matches' }] } }], { view_band: false, active: 1 })
  const empty = { bands: await cdp.evaluate(`(${TILE_BODY}).querySelectorAll('.group-band-row').length`), cards: await cdp.evaluate(`(${TILE_BODY}).querySelectorAll('.card').length`) }
  empty.band = empty.bands > 0 && (await peek(`(${TILE_BODY}).querySelector('.group-band-row')`))
  reg(g, 'a tile\'s reveal anchors to the Table\'s heading, not its rows', table.head && !table.row, show(table))
  reg(g, 'a tile\'s reveal anchors to Cards\' first row of cards', cards.card, show(cards))
  reg(g, 'a grouped Cards tile\'s reveal anchors to its first band as a zone, its cards outside it', band.band && !band.card, show(band))
  item(g, 8, 'T8-3 peek', 'a Cards tile whose bands show with no card drawn anchors its reveal to its first band', empty.cards === 0 && empty.band, show(empty))
  reg(g, 'a tile\'s Table draws at the embed zoom with no heading fill, and its Cards at the embed zoom inside the tile\'s inset', tableLook.fill === 'none' && tableLook.zoom === tableLook.embed && cardsLook.zoom === cardsLook.embed && near(cardsLook.pad, cardsLook.inset), show({ tableLook, cardsLook }))
  await shot(cdp, 'g8-end')
}

// ── Group 9 — MenuBase ──────────────────────────────────────────────────────

/** `MenuBase`'s gap off the trigger a pane hangs from (`MENU_GAP`), the margin it keeps inside the window (`VIEWPORT_MARGIN`), and a pane's scroll ceiling (`PANE_MAX_HEIGHT`). */
const PANE = { gap: 6, margin: 8, cap: '240px' }
const layers = (cdp) => cdp.evaluate(`document.querySelectorAll('${PANE_LAYER}').length`)
/** Where the top pane sits against `trigger`, an element or a rect: the side it opened on, its gap off the trigger, and whether it keeps the window's margin. */
const placement = (cdp, trigger) => cdp.evaluate(`(() => {
  const l = ${TOP_LAYER}; const t = (${trigger}); if (!l || !t) return null
  const p = l.getBoundingClientRect(); const r = t.getBoundingClientRect ? t.getBoundingClientRect() : t
  const side = p.top >= r.bottom - 1 ? 'down' : p.bottom <= r.top + 1 ? 'up' : 'over'
  const m = ${PANE.margin} - 0.5
  return { side, gap: Math.round((side === 'up' ? r.top - p.bottom : p.top - r.bottom) * 10) / 10, inside: p.left >= m && p.top >= m && innerWidth - p.right >= m && innerHeight - p.bottom >= m }
})()`)
const hangs = (p, side = 'down') => p?.side === side && near(p.gap, PANE.gap) && p.inside
/** Runs `act`, which opens a pane, and reads where it hangs off `trigger` once its bloom has played. */
async function opens(cdp, act, trigger) {
  const before = await layers(cdp)
  await act()
  await until('the pane', async () => (await layers(cdp)) > before, 4000).catch(() => {})
  await sleep(600)
  return placement(cdp, trigger)
}
/** Whether `act` closes the top pane. */
async function leaves(cdp, act) {
  const before = await layers(cdp)
  await act()
  return settles(async () => (await layers(cdp)) < before, 3000)
}
const escape = (cdp) => () => pressKey(cdp, 'Escape')
const pressAt = (cdp, point) => () => mouseAt(cdp, point)
/** The scroll ceiling the top pane's list holds, written inline by `MenuScrollFrame`. */
const capOf = (cdp) => cdp.evaluate(`[...(${TOP_LAYER})?.querySelectorAll('*') ?? []].find((e) => e.style.maxHeight)?.style.maxHeight ?? null`)
/** The toolbar's open pane: its positioned surface around the rows. */
const TOOLBAR_SURFACE = `(() => { let e = ${BACK_BAR} ?? ${btn('Visibility')}; while (e && getComputedStyle(e).position !== 'absolute') e = e.parentElement; return e })()`
/** A point inside the toolbar's pane, in its gutter, which no list over it covers. */
const inGutter = async (cdp) => { const s = await boxOf(cdp, TOOLBAR_SURFACE); return { x: s.left + 4, y: s.bottom - 4 } }
/** A point of the window under no pane and no control: the foot of the view. */
const blank = async (cdp) => cdp.evaluate(`({ x: Math.round(innerWidth * 0.6), y: innerHeight - 30 })`)
/** A pane's gutter: the padding of the nearest box around `rowExpr` that pads its sides, its top less the toolbar's notch, which a pane under no notch lacks. */
const gutter = (rowExpr) => `(() => { let e = (${rowExpr}).parentElement; while (e && !parseFloat(getComputedStyle(e).paddingLeft)) e = e.parentElement; const s = getComputedStyle(e); const notch = parseFloat(s.getPropertyValue('--notch-h')) || 0; return [parseFloat(s.paddingTop) - notch, ...[s.paddingRight, s.paddingBottom, s.paddingLeft].map(parseFloat)] })()`
/** The rows of the link autocomplete, each with whether it carries the highlight, which draws as a background image. */
const AC_ROWS = `[...document.querySelectorAll('.mdpm-ac [data-reveal-host]')].filter((r) => r.getBoundingClientRect().height > 0)`
const acRows = (cdp) => cdp.evaluate(`${AC_ROWS}.map((r) => r.textContent.trim())`)
const acLit = (cdp) => cdp.evaluate(`${AC_ROWS}.filter((r) => getComputedStyle(r).backgroundImage !== 'none').map((r) => r.textContent.trim())`)
const acRow = (title) => `${AC_ROWS}.find((r) => r.textContent.trim() === ${JSON.stringify(title)})`
const acEdges = (cdp) => cdp.evaluate(`[...document.querySelectorAll('.mdpm-ac .resize-edge')].map((e) => [...e.classList].find((c) => /^resize-edge-/.test(c)).slice(12)).sort()`)
/** A page's outline: two headings holding sub-headings, then enough more that the list outgrows the pane ceiling, so a resize shows. */
const HEADINGS = ['One', 'One A', 'One B', 'Two', 'Two A', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten']
const outlineShut = (...shut) => HEADINGS.filter((h) => !shut.some((s) => h.startsWith(`${s} `)))

async function group9(cdp) {
  const g = '9'
  await mouseClick(cdp, `[...document.querySelectorAll('.row span')].findLast((e) => e.textContent.trim() === 'Collection A')`)
  const V9 = tableView(vid('g9table'), 'VD Panes')
  await showView(cdp, V9)
  await closeAll(cdp)

  // Value pickers: a Select cell's, then a Date cell's calendar with its today ring.
  const stageCell = `(${dataRow('Page B')}).querySelectorAll('.data-cell')[1]`
  const stageBefore = frontOf(PAGES['Page B'].path)[STAGE.key]
  const cellPlaced = await opens(cdp, () => mouseClick(cdp, stageCell), stageCell)
  const cellCap = await capOf(cdp)
  const cellDismiss = { escape: await leaves(cdp, escape(cdp)) }
  await opens(cdp, () => mouseClick(cdp, stageCell), stageCell)
  cellDismiss.outside = await leaves(cdp, pressAt(cdp, await blank(cdp)))
  reg(g, 'a Select cell\'s picker hangs below its cell inside the window, its list capped at the pane ceiling', hangs(cellPlaced) && cellCap === PANE.cap, show({ cellPlaced, cellCap }))
  reg(g, 'Escape and an outside press each close a Select cell\'s picker, writing nothing', cellDismiss.escape && cellDismiss.outside && same(frontOf(PAGES['Page B'].path)[STAGE.key], stageBefore), show({ cellDismiss, value: frontOf(PAGES['Page B'].path)[STAGE.key] }))

  const dueCell = `(${dataRow('Page B')}).querySelectorAll('.data-cell')[3]`
  const calPlaced = await opens(cdp, () => mouseClick(cdp, dueCell), dueCell)
  // The today ring is the one day pill drawing a shadow, its ring the accent stroke.
  const ring = await cdp.evaluate(`(() => {
    const days = [...(${TOP_LAYER}).querySelectorAll('button')].filter((b) => /^\\d+$/.test(b.textContent.trim()) && b.querySelector('span'))
    const ringed = days.filter((b) => getComputedStyle(b.querySelector('span')).boxShadow !== 'none')
    const pill = ringed[0]?.querySelector('span')
    return { days: days.length, ringed: ringed.map((b) => b.textContent.trim()), ring: pill && getComputedStyle(pill).getPropertyValue('--field-ring').trim(), accent: getComputedStyle(document.documentElement).getPropertyValue('--accent-stroke-hot').trim(), shadow: pill && getComputedStyle(pill).boxShadow }
  })()`)
  const calLeft = await leaves(cdp, escape(cdp))
  reg(g, 'a Date cell\'s calendar hangs below its cell inside the window and closes on Escape, writing nothing', hangs(calPlaced) && calLeft && frontOf(PAGES['Page B'].path)[DUE.key] === undefined, show({ calPlaced, calLeft }))
  reg(g, 'the calendar rings today alone, in the accent stroke', ring.days >= 28 && same(ring.ringed, [String(new Date().getDate())]) && !!ring.accent && ring.ring === ring.accent && /inset/.test(ring.shadow ?? ''), show(ring))
  await shot(cdp, 'g9-pickers')

  // The kit's menu door with Native Menus off: Sort By through both doors, Group By, and the Filter's property list.
  const listPlaced = {}
  for (const [which, pane, field] of [['settings', 'Sort', 'Sort By'], ['editor', 'Sort', 'Sort By'], ['settings', 'Group', 'Group By'], ['settings', 'Filter', 'Filter property']]) {
    await door(cdp, which, pane)
    listPlaced[`${which} ${field}`] = { ...(await opens(cdp, () => mouseClick(cdp, ctl(field)), ctl(field))), cap: await capOf(cdp) }
  }
  const listHangs = (p) => hangs(p) && p.cap === PANE.cap
  reg(g, 'with Native Menus off, the Sort By list hangs below its field inside the window through the Settings door, capped at the pane ceiling', listHangs(listPlaced['settings Sort By']), show(listPlaced['settings Sort By']))
  reg(g, 'with Native Menus off, the Sort By list hangs below its field inside the window through the editor door, capped at the pane ceiling', listHangs(listPlaced['editor Sort By']), show(listPlaced['editor Sort By']))
  reg(g, 'with Native Menus off, the Group By and Filter property lists hang below their fields inside the window', listHangs(listPlaced['settings Group By']) && listPlaced['settings Filter property']?.side === 'down' && hangs(listPlaced['settings Filter property']), show(listPlaced))
  // Each dismissal closes the list alone, the Sort pane under it staying; choosing saves.
  const sortDismiss = {}
  await door(cdp, 'settings', 'Sort')
  await opens(cdp, () => mouseClick(cdp, ctl('Sort By')), ctl('Sort By'))
  sortDismiss.escape = (await leaves(cdp, escape(cdp))) && (await cdp.evaluate(`!!${BACK_BAR}`))
  await opens(cdp, () => mouseClick(cdp, ctl('Sort By')), ctl('Sort By'))
  sortDismiss.outside = (await leaves(cdp, pressAt(cdp, await inGutter(cdp)))) && (await cdp.evaluate(`!!${BACK_BAR}`))
  await opens(cdp, () => mouseClick(cdp, ctl('Sort By')), ctl('Sort By'))
  sortDismiss.choose = (await leaves(cdp, () => click(cdp, portalRow(STAGE.label)))) && (await settles(async () => viewOnDisk(V9.id)?.sort?.[0]?.property_id === STAGE.id))
  reg(g, 'Escape and a press beside the Sort By list each close it alone, the Sort pane staying, and choosing VD Stage closes it and saves the sort', sortDismiss.escape && sortDismiss.outside && sortDismiss.choose, show({ sortDismiss, sort: viewOnDisk(V9.id)?.sort }))
  await door(cdp, 'settings', 'Group')
  await opens(cdp, () => mouseClick(cdp, ctl('Group By')), ctl('Group By'))
  const grouped = (await leaves(cdp, () => click(cdp, portalRow(STAGE.label)))) && (await settles(async () => viewOnDisk(V9.id)?.group?.property_id === STAGE.id))
  reg(g, 'choosing VD Stage from the Group By list closes it and saves the grouping', grouped, show(viewOnDisk(V9.id)?.group))
  await closeAll(cdp)
  await showView(cdp, V9)

  // The Location tree: its own width bounds, a pick that keeps it open, and each dismissal leaving the Filter pane.
  await locationTree(cdp, true)
  const LOCATION_FIELD = `(${ctl('Filter values')}).parentElement`
  const tree = { ...(await placement(cdp, LOCATION_FIELD)), cap: await capOf(cdp), width: await cdp.evaluate(`(() => { const s = getComputedStyle(${PORTAL_PANE}); return [s.minWidth, s.maxWidth] })()`) }
  reg(g, 'the Location tree hangs below its field inside the window, between its 140px floor and 260px ceiling, capped at the pane ceiling', hangs(tree) && same(tree.width, ['140px', '260px']) && tree.cap === PANE.cap, show(tree))
  await click(cdp, locationRow('Set Alpha'))
  const picked = await settles(async () => same(viewOnDisk(V9.id)?.filter?.rules?.[0]?.values, [IDS.alpha]))
  const kept = await cdp.evaluate(`!!${locationRow('Set Beta')}`)
  const treeDismiss = { escape: (await leaves(cdp, escape(cdp))) && (await cdp.evaluate(`!!${BACK_BAR}`)) }
  await opens(cdp, () => mouseClick(cdp, ctl('Filter values')), LOCATION_FIELD)
  treeDismiss.outside = (await leaves(cdp, pressAt(cdp, await inGutter(cdp)))) && (await cdp.evaluate(`!!${BACK_BAR}`))
  reg(g, 'choosing Set Alpha in the Location tree saves the rule and keeps the tree open; Escape and an outside press each close it, the Filter pane staying', picked && kept && treeDismiss.escape && treeDismiss.outside, show({ picked, kept, treeDismiss, filter: viewOnDisk(V9.id)?.filter }))
  await shot(cdp, 'g9-location')
  await closeAll(cdp)

  // The Properties pane's option list, its type editor's rows, and an option's editor pane.
  await door(cdp, 'settings', 'Properties')
  const propertyRow = (label) => `[...document.querySelectorAll('[data-line-row] span')].find((e) => e.textContent.trim() === ${JSON.stringify(label)})?.closest('[role=button]')`
  await click(cdp, propertyRow(STAGE.label))
  await until('the option rows', async () => cdp.evaluate(`!!document.querySelector('[aria-label="Edit Option"]')`))
  await sleep(600)
  const EDIT_OPTION = `[...document.querySelectorAll('[aria-label="Edit Option"]')].find((e) => e.getClientRects().length)`
  const optionLook = async () => cdp.evaluate(`(() => {
    const rows = [...document.querySelectorAll('[aria-label="Edit Option"]')].map((b) => b.closest('[data-line-row]'))
    let list = rows[0]; while (list && rows.some((r) => !list.contains(r))) list = list.parentElement
    let groups = list.parentElement; while (groups && getComputedStyle(groups).rowGap === 'normal') groups = groups.parentElement
    const lead = rows[0].firstElementChild
    const gaps = rows.slice(1).map((r, i) => Math.round(r.getBoundingClientRect().top - rows[i].getBoundingClientRect().bottom))
    return { rows: rows.length, gap: getComputedStyle(list).rowGap, lead: getComputedStyle(list).paddingTop, gaps, groups: getComputedStyle(groups).rowGap, chip: getComputedStyle(lead).columnGap, edit: Number(getComputedStyle(${EDIT_OPTION}).opacity) }
  })()`)
  const options = await optionLook()
  await hover(cdp, `(${EDIT_OPTION}).closest('[data-line-row]')`, 900)
  options.hovered = Number(await cdp.evaluate(`getComputedStyle(${EDIT_OPTION}).opacity`))
  reg(g, 'the Properties pane\'s VD Stage options sit 6px apart under a 6px lead in a 12px-gapped group list, each chip\'s lead 8px, and Edit Option dims until its row is hovered', options.rows === 3 && options.gap === '6px' && options.lead === '6px' && options.gaps.every((d) => d === 6) && options.groups === '12px' && options.chip === '8px' && options.edit < options.hovered && options.hovered > 0, show(options))
  const optionTrigger = EDIT_OPTION
  const popup = await opens(cdp, () => mouseClick(cdp, EDIT_OPTION), optionTrigger)
  const popupDismiss = { escape: (await leaves(cdp, escape(cdp))) && (await cdp.evaluate(`!!${EDIT_OPTION}`)) }
  await opens(cdp, () => mouseClick(cdp, EDIT_OPTION), optionTrigger)
  popupDismiss.outside = (await leaves(cdp, pressAt(cdp, await inGutter(cdp)))) && (await cdp.evaluate(`!!${EDIT_OPTION}`))
  reg(g, 'an option\'s editor pane hangs below its Edit Option inside the window; Escape and an outside press each close it, the Properties pane staying', hangs(popup) && popupDismiss.escape && popupDismiss.outside, show({ popup, popupDismiss }))
  await click(cdp, propertyRow(DUE.label))
  await until('the Date format rows', async () => cdp.evaluate(`!!${ctl('Date Format')}`))
  await sleep(600)
  // The type editor's rows: each row holding a format control, read as the gap between their boxes.
  const formats = await cdp.evaluate(`(() => {
    const ctls = ['Date Format', 'Day Format', 'Time Format'].map((l) => [...document.querySelectorAll('[aria-label="' + l + '"]')].find((e) => e.getClientRects().length)).filter(Boolean)
    let box = ctls[0]; while (box && ctls.some((c) => !box.contains(c))) box = box.parentElement
    const rowOf = (c) => { let r = c; while (r.parentElement !== box) r = r.parentElement; return r.hasAttribute('data-reveal') ? r.firstElementChild.firstElementChild : r }
    const rows = [...new Set(ctls.map(rowOf))].map((r) => r.getBoundingClientRect())
    return { found: ctls.length, rows: rows.length, gaps: rows.slice(1).map((r, i) => Math.round(r.top - rows[i].bottom)), kids: [...box.children].map((c) => [c.hasAttribute('data-reveal'), getComputedStyle(c).marginTop, c.innerText.slice(0, 24)]), pad: getComputedStyle(box).paddingTop }
  })()`)
  reg(g, 'VD Due\'s type editor sets its format rows 8px apart', formats.rows >= 3 && formats.gaps.every((d) => d === 8), show(formats))
  await shot(cdp, 'g9-schema')
  await closeAll(cdp)

  // The editor door's icon picker.
  await door(cdp, 'editor')
  const ICON_BUTTON = ctl('Edit Icon')
  const iconBefore = viewOnDisk(V9.id)?.icon ?? null
  const iconPlaced = await opens(cdp, () => mouseClick(cdp, ICON_BUTTON), ICON_BUTTON)
  const iconEscape = await leaves(cdp, escape(cdp))
  await opens(cdp, () => mouseClick(cdp, ICON_BUTTON), ICON_BUTTON)
  await cdp.evaluate(`(${TOP_LAYER}).querySelector('input').focus()`)
  await typeText(cdp, 'activi')
  await sleep(700)
  const found = await cdp.evaluate(`[...(${TOP_LAYER}).querySelectorAll('button[title]')].map((b) => b.title)`)
  reg(g, 'the editor\'s icon picker hangs below its button inside the window, closes on Escape writing nothing, and narrows to activity under a search', hangs(iconPlaced) && iconEscape && (viewOnDisk(V9.id)?.icon ?? null) === iconBefore && found.includes('activity') && found.every((t) => t.includes('activ')), show({ iconPlaced, iconEscape, found }))
  await closeAll(cdp)

  // A card's value picker.
  const V9C = cardsView(vid('g9cards'), 'VD Panes Cards', { set_cards: false })
  await showView(cdp, V9C)
  const seat = `(${card('Page B')}).querySelector('.card-value')`
  await hover(cdp, seat, 400)
  const seatBox = await boxOf(cdp, seat)
  const cardPlaced = await opens(cdp, () => mouseAt(cdp, { x: seatBox.right - 4, y: seatBox.y }), seat)
  const cardChose = await leaves(cdp, () => click(cdp, portalRow('Done')))
  const cardWrote = await settles(async () => same(frontOf(PAGES['Page B'].path)[STAGE.key], ['Done']))
  reg(g, 'a card\'s VD Stage value opens its picker below it inside the window, and choosing Done writes it and closes the picker', hangs(cardPlaced) && cardChose && cardWrote, show({ cardPlaced, cardChose, value: frontOf(PAGES['Page B'].path)[STAGE.key] }))
  await mutate(cdp, { op: 'setProperty', path: PAGES['Page B'].path, propertyId: STAGE.id, value: { kind: 'select', value: STAGES['Page B'] } })
  await shot(cdp, 'g9-card')

  // The link autocomplete: the caret pane, its resize, its flip at the window's foot, and its heading list's folding.
  const links = mintPageId()
  await mutate(cdp, { op: 'createPage', id: links, parentPath: 'Collection A/Set Alpha', name: 'VD Links', seeds: {} })
  const LINKS = 'Collection A/Set Alpha/VD Links.md'
  await until('VD Links', async () => { try { return !!readRel(LINKS) } catch { return false } })
  writeFileSync(abs(LINKS), `${readRel(LINKS)}${HEADINGS.map((h) => `${h.includes(' ') ? '##' : '#'} ${h}\n\n`).join('')}`)
  await until('VD Links\' card', async () => cdp.evaluate(`!!${card(links)}`))
  await sleep(800)
  await mouseClick(cdp, `(${card(links)}).querySelector('.card-title')`)
  await until('VD Links\' editor', async () => (await cdp.evaluate(`document.querySelector('[role=tab][aria-selected=true]')?.title`)) === 'VD Links')
  await sleep(1000)
  const EDITOR = `[...document.querySelectorAll('.cm-content')].find((c) => !c.closest('[inert]') && c.getClientRects().length).cmTile.root.view`
  const CARET = `${EDITOR}.coordsAtPos(${EDITOR}.state.selection.main.head)`
  /** `[[#` typed a key at a time, as a hand pairs it, on a line of its own at the document's head, or at its foot past `lead`. */
  const typeLink = async (foot, lead = '') => {
    await cdp.evaluate(`(() => { const v = ${EDITOR}; v.focus(); const end = v.state.doc.length; v.dispatch(${foot} ? { changes: { from: end, insert: ${JSON.stringify(lead)} }, selection: { anchor: end + ${lead.length} } } : { changes: { from: 0, insert: '\\n' }, selection: { anchor: 0 } }) })()`)
    await sleep(300)
    return opens(cdp, async () => { for (const ch of ['[', '[', '#']) await typeText(cdp, ch) }, CARET)
  }
  const acPlaced = { ...(await typeLink(false)), edges: await acEdges(cdp) }
  reg(g, 'the link autocomplete hangs below its caret inside the window, its free edges below', hangs(acPlaced) && same(acPlaced.edges, ['e', 's', 'se', 'sw', 'w']), show(acPlaced))
  const acBox = () => cdp.evaluate(`(() => { const r = (${TOP_LAYER}).getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) } })()`)
  const sized = { from: await acBox() }
  await resizeBy(cdp, `document.querySelector('.mdpm-ac .resize-edge-s')`, { dy: -30 })
  sized.shorter = await acBox()
  await resizeBy(cdp, `document.querySelector('.mdpm-ac .resize-edge-e')`, { dx: 60 })
  sized.wider = await acBox()
  reg(g, 'the autocomplete\'s south edge shortens it and its east edge widens it, its top holding', near(sized.shorter.h, sized.from.h - 30, 2) && near(sized.wider.w, sized.from.w + 60, 2) && sized.wider.h === sized.shorter.h && sized.wider.top === sized.from.top, show(sized))

  // The heading list folds by its chevrons, a fold returning the highlight to the first row.
  const listed = { rows: await acRows(cdp), lit: await acLit(cdp) }
  await pressKey(cdp, 'ArrowDown')
  await pressKey(cdp, 'ArrowDown')
  const moved = await acLit(cdp)
  await mouseClick(cdp, `(${acRow('Two')}).querySelector('${DRIFT.chevron}')`)
  await sleep(600)
  const folded = { rows: await acRows(cdp), lit: await acLit(cdp) }
  await mouseClick(cdp, `(${acRow('Two')}).querySelector('${DRIFT.chevron}')`)
  await sleep(600)
  const opened = await acRows(cdp)
  reg(g, 'the autocomplete\'s heading list folds a heading\'s children by its chevron and unfolds them again', same(listed.rows, HEADINGS) && same(folded.rows, outlineShut('Two')) && same(opened, HEADINGS), show({ listed, folded, opened }))
  reg(g, 'folding a heading in the autocomplete returns its highlight to the first row', same(listed.lit, ['One']) && moved.length === 1 && moved[0] !== 'One' && same(folded.lit, ['One']), show({ listed: listed.lit, moved, folded: folded.lit }))
  await mouseClick(cdp, `(${acRow('One')}).querySelector('${DRIFT.chevron}')`)
  await sleep(500)
  const shut = await acRows(cdp)
  const acEscape = await leaves(cdp, escape(cdp))
  await cdp.evaluate(`(() => { const v = ${EDITOR}; const d = v.state.doc.toString(); v.dispatch({ changes: { from: 0, to: d.indexOf(']]') + 3, insert: '' } }) })()`)
  const reopened = { ...(await typeLink(false)), rows: await acRows(cdp) }
  const chose = await leaves(cdp, () => mouseClick(cdp, acRow('One A')))
  const doc = await cdp.evaluate(`${EDITOR}.state.doc.toString()`)
  reg(g, 'Escape closes the autocomplete, reopening it lists every heading unfolded, and choosing One A writes its link and closes it', same(shut, outlineShut('One')) && acEscape && same(reopened.rows, HEADINGS) && chose && doc.startsWith('[[#One A]]'), show({ shut, acEscape, reopened: reopened.rows, chose, head: doc.slice(0, 24) }))
  await shot(cdp, 'g9-autocomplete')
  // At the window's foot the caret pane opens above, its free edges above.
  const foot = { ...(await typeLink(true, '\n'.repeat(60))), edges: await acEdges(cdp) }
  reg(g, 'at the window\'s foot the autocomplete opens above its caret inside the window, its free edges above', hangs(foot, 'up') && same(foot.edges, ['e', 'n', 'ne', 'nw', 'w']), show(foot))
  await pressKey(cdp, 'Escape')
  await shot(cdp, 'g9-autocomplete-foot')

  // The tile's panes: its settings pane, its dropdown list, and its pill's rename.
  const toolbarGutter = await (async () => {
    await mouseClick(cdp, `[...document.querySelectorAll('.row span')].findLast((e) => e.textContent.trim() === 'Collection A')`)
    await until('the view', async () => cdp.evaluate(`!!${VIEWS_BUTTON}`))
    await door(cdp, 'settings')
    const read = await cdp.evaluate(gutter(btn('Visibility')))
    await closeAll(cdp)
    return read
  })()
  await showTile(cdp, [TA, TB])
  const VIEW_SETTINGS = `[...document.querySelectorAll('[aria-label="View settings"]')].find((e) => e.getClientRects().length)`
  const tilePane = await opens(cdp, () => mouseClick(cdp, VIEW_SETTINGS), VIEW_SETTINGS)
  const tileGutter = await cdp.evaluate(gutter(`[...(${TOP_LAYER}).querySelectorAll('[role=button]')].find((e) => e.textContent.trim() === 'Visibility')`))
  reg(g, 'a tile\'s settings pane hangs below its button inside the window, its gutter the toolbar Settings pane\'s', hangs(tilePane) && same(tileGutter, toolbarGutter), show({ tilePane, tileGutter, toolbarGutter }))
  await click(cdp, `[...(${TOP_LAYER}).querySelectorAll('[role=button]')].find((e) => e.textContent.trim() === 'Filter')`)
  await until('the tile\'s Filter pane', async () => cdp.evaluate(`!!${BACK_BAR}`))
  await sleep(700)
  const slid = await placement(cdp, VIEW_SETTINGS)
  await click(cdp, BACK_BAR)
  await sleep(700)
  const back = await placement(cdp, VIEW_SETTINGS)
  const tileDismiss = { escape: await leaves(cdp, escape(cdp)) }
  await opens(cdp, () => mouseClick(cdp, VIEW_SETTINGS), VIEW_SETTINGS)
  tileDismiss.outside = await leaves(cdp, pressAt(cdp, await blank(cdp)))
  reg(g, 'a tile\'s settings pane slides to Filter and back inside the window, and Escape and an outside press each close it', slid?.inside && back?.inside && tileDismiss.escape && tileDismiss.outside, show({ slid, back, tileDismiss }))

  await showTile(cdp, [TA, TB], { view_style: 'dropdown' })
  const listOpen = () => opens(cdp, () => mouseClick(cdp, DROP_SWITCH), DROP_SWITCH)
  const tileList = { ...(await listOpen()), cap: await capOf(cdp) }
  const tileListDismiss = { escape: await leaves(cdp, escape(cdp)) }
  await listOpen()
  tileListDismiss.outside = await leaves(cdp, pressAt(cdp, await blank(cdp)))
  await listOpen()
  await click(cdp, tileRow(TB.name))
  tileListDismiss.choose = (await settles(async () => tileOnDisk().active === 1 && (await cdp.evaluate(`(${DROP_SWITCH}).textContent.trim() === ${JSON.stringify(TB.name)}`)))) && (await holds(async () => (await layers(cdp)) > 0, 1000))
  reg(g, 'a tile\'s view list hangs below its switcher inside the window, capped at the pane ceiling; Escape and an outside press each close it, and choosing VD Tile B switches the tile, the list staying open', listHangs(tileList) && tileListDismiss.escape && tileListDismiss.outside && tileListDismiss.choose, show({ tileList, tileListDismiss, active: tileOnDisk().active }))
  await shot(cdp, 'g9-tile')

  // A pill's rename: Escape cancels, Enter commits, and the field auto-sizes to its text. The lock half is BC23's case.
  await showTile(cdp, [TA, TB])
  const beginRename = async (name) => {
    await clicks(cdp, await boxOf(cdp, `(${pill(name)}).querySelector('span')`), 2)
    return settles(async () => cdp.evaluate(`!!${FIELD}`), 3000)
  }
  const widthOf = () => cdp.evaluate(`Math.round(${FIELD}.getBoundingClientRect().width)`)
  const pillRename = { opened: await beginRename(TB.name) }
  await cdp.evaluate(`${FIELD}.select()`)
  await typeText(cdp, 'VD Never')
  await pressKey(cdp, 'Escape')
  pillRename.cancelled = await holds(async () => tileNames()[1] === TB.name, 1200)
  pillRename.reopened = await beginRename(TB.name)
  await cdp.evaluate(`${FIELD}.select()`)
  await typeText(cdp, 'VD')
  await sleep(200)
  const short = await widthOf()
  await typeText(cdp, ' Pill Renamed Long')
  await sleep(200)
  const long = await widthOf()
  await pressKey(cdp, 'Enter')
  pillRename.committed = await settles(async () => tileNames()[1] === 'VD Pill Renamed Long')
  reg(g, 'a tile pill\'s rename cancels on Escape and commits on Enter', pillRename.opened && pillRename.cancelled && pillRename.reopened && pillRename.committed, show({ pillRename, names: tileNames() }))
  reg(g, 'a tile pill\'s rename field auto-sizes to its text', long - short >= 60, show({ short, long }))
  // The pill holds its new name through a held save: the tile paints its write ahead, so this held before the fold returned the save to the field.
  await beginRename('VD Pill Renamed Long')
  await cdp.evaluate(`${FIELD}.select()`)
  await typeText(cdp, 'VD Pill Held')
  await hold('tiles:save', '() => true', 2500)
  await cdp.evaluate(ARM_FRAMES(`${PILLS}.map((b) => b.textContent.trim()).filter((t) => t === 'VD Pill Renamed Long' || t === 'VD Pill Held')`))
  await pressKey(cdp, 'Enter')
  await sleep(3500)
  const pillHeld = (await frames(cdp)).filter((names) => names.length)
  reg(g, 'a tile pill\'s rename shows its new name through its held save', pillHeld.length > 0 && pillHeld.every((names) => same(names, ['VD Pill Held'])) && tileNames()[1] === 'VD Pill Held', show({ pillHeld, names: tileNames() }))
  await shot(cdp, 'g9-end')
  await trashPage(cdp, LINKS)
}

// ── Group 10 — One Lock per Row ─────────────────────────────────────────────

/** The drag announcer `a11y.ts` mounts, emptied before a gesture so what it says next is that gesture's. */
const ANNOUNCER = `[...document.querySelectorAll('[role=status][aria-live=assertive]')].at(-1)`
const hush = (cdp) => cdp.evaluate(`(() => { const r = ${ANNOUNCER}; if (r) r.textContent = '' })()`)
/** Whether each drawn element of a list names the drag gesture, a parked tab's inert copy left out: described by an element whose text says to press Space. */
const describes = (cdp, list) => cdp.evaluate(`${list}.filter((e) => e.getClientRects().length && !e.closest('[inert]')).map((e) => { const by = e.getAttribute('aria-describedby'); return !!by && /press space/i.test(document.getElementById(by)?.textContent ?? '') })`)
const none = (reads) => reads.length > 0 && reads.every((r) => !r)
const all = (reads) => reads.length > 0 && reads.every((r) => r)
/** What's held: a line row's drag source or a sortable's pressed state, whether a drop line draws, whether the tab bar spills, and what the announcer said. */
const HELD = `(() => ({ held: !!document.querySelector('[data-drag-source], [aria-roledescription=sortable][aria-pressed=true]'), line: [...document.querySelectorAll('.drop-line')].some((l) => l.getClientRects().length), spill: (() => { let e = [...document.querySelectorAll('[role=tab]')].find((t) => t.getClientRects().length)?.parentElement; while (e && e !== document.body) { if (e.style.getPropertyValue('--drag-spill')) return true; e = e.parentElement } return false })(), said: ${ANNOUNCER}?.textContent ?? '' }))()`
/** The nav search's Page A result carried onto the tab bar past its first tab: what's held on the way, the tabs before, and whether its tab opened. */
async function navCarry(cdp) {
  const before = await tabTitles(cdp)
  const firstTab = await boxOf(cdp, `[...document.querySelectorAll('[role=tab]')].find((t) => t.getAttribute('title'))`)
  await hush(cdp)
  let carried
  await dragPoints(cdp, await boxOf(cdp, navRow('Page A')), { x: firstTab.right + 20, y: firstTab.y }, { steps: 14, held: async () => { await sleep(300); carried = await cdp.evaluate(HELD) } })
  const opened = await settles(async () => (await tabTitles(cdp)).filter((t) => t === 'Page A').length > before.filter((t) => t === 'Page A').length, 3000)
  return { carried, before, opened }
}
/** Space on a focused element: whether it lifted, cancelled by Escape when it did. */
async function spaceLift(cdp, expr) {
  await hush(cdp)
  await cdp.evaluate(`(${expr}).focus()`)
  await pressKey(cdp, ' ')
  const read = await cdp.evaluate(HELD)
  if (read.held) await pressKey(cdp, 'Escape')
  return { lifted: read.held && read.said.startsWith('Picked up'), said: read.said }
}
/** A press on `from` carried onto `to`'s top edge: what's held there, then Escape before the release unless `drop`. */
async function pointerLift(cdp, from, to, { drop = false } = {}) {
  await hush(cdp)
  const a = await boxOf(cdp, from)
  const b = await boxOf(cdp, to)
  let read
  await dragPoints(cdp, a, { x: b.x, y: b.top + 3 }, {
    held: async () => {
      await sleep(300)
      read = await cdp.evaluate(HELD)
      if (!drop) await pressKey(cdp, 'Escape')
    },
    settle: 600,
  })
  return { ...read, lifted: read.held && read.said.startsWith('Picked up') }
}
const ROWS = `[...document.querySelectorAll('.data-row[data-rid]')]`
/** The tile's view pills, the ribbon's sortable buttons left out. */
const TILE_PILLS = `${PILLS}.filter((b) => !b.closest('.sidebar-ribbon'))`
const tableHeads = `[...document.querySelectorAll('${DRIFT.shell} .group-band-head')]`
const cardsHeads = `[...document.querySelectorAll('.cards-view .group-band-head')]`
const CARDS = `[...document.querySelectorAll('.cards-view [data-rid]')]`
const zoneOf = (scope) => `[...document.querySelectorAll('${scope} .line-zone')].find((z) => z.getClientRects().length && !z.closest('[inert]'))`
/** A page's Table row or card in the shown view, never a parked tab's or a tile's copy of it. */
const liveRow = (title) => visible(`[...document.querySelectorAll('.data-row[data-rid="${PAGES[title].id}"]')]`)
/** The views dropdown's rows, drawn while it's open. */
const DROPDOWN_ROWS = `[...document.querySelectorAll('[data-line-row]')].filter((r) => !r.closest('nav, ${DRIFT.shell}, .cards-view, .nav-view'))`
const dropdownRow = (name) => `${DROPDOWN_ROWS}.find((r) => r.getClientRects().length && !r.closest('[inert]') && r.textContent.trim() === ${JSON.stringify(name)})`
const paneLine = (label) => `[...(${PANE_ZONE})?.querySelectorAll('[data-line-row]') ?? []].find((r) => r.getClientRects().length && !r.closest('[inert]') && r.textContent.trim() === ${JSON.stringify(label)})`
const sideLine = (title) => `(${sideRow(title)})?.closest('[data-line-row]')`
const NAV_ROWS = `[...document.querySelectorAll('.nav-view [data-line-row]')]`
const navRow = (title) => `${NAV_ROWS}.find((r) => r.getClientRects().length && !r.closest('[inert]') && r.textContent.startsWith(${JSON.stringify(title)}))`
const tabTitles = (cdp) => cdp.evaluate(`[...document.querySelectorAll('[role=tab]')].map((t) => t.getAttribute('title')).filter(Boolean)`)
const tabEl = (title) => `[...document.querySelectorAll('[role=tab]')].find((t) => t.getAttribute('title') === ${JSON.stringify(title)})`
const shownCanvas = `[...document.querySelectorAll('canvas')].find((e) => e.getClientRects().length > 0 && e.getBoundingClientRect().left >= 0)`
/** A Matrix node's anchor, drawn once the pointer rests on the node: the label's title span leads back to it. */
const matrixAnchor = (title) => `[...(${shownCanvas})?.parentElement.querySelectorAll('span') ?? []].find((t) => t.textContent === ${JSON.stringify(title)})?.parentElement.parentElement.previousElementSibling`
/** A keyboard carry: `expr` focused and lifted by Space, `keys` pressed in turn (the last one drops or cancels), then `settle`. */
async function keySteps(cdp, expr, keys, settle = 0) {
  await cdp.evaluate(`(${expr}).focus()`)
  await pressKey(cdp, ' ')
  for (const k of keys) await pressKey(cdp, k)
  await sleep(settle)
}
/** A key pressed on a focused element. */
async function focusThen(cdp, expr, key) {
  await cdp.evaluate(`(${expr}).focus()`)
  await pressKey(cdp, key)
}
async function toCollection(cdp, name) {
  await closeAll(cdp)
  await mouseClick(cdp, `[...document.querySelectorAll('.row span')].findLast((e) => e.textContent.trim() === ${JSON.stringify(name)})`)
  await until(`${name}'s view`, async () => cdp.evaluate(`!!${VIEWS_BUTTON}`))
  await sleep(800)
}
/** Where the drop line stands against the lead it's drawn over, held over `to` while `from` is dragged, cancelled before the release. */
async function lineAgainst(cdp, from, to, lead) {
  let read
  const a = await boxOf(cdp, from)
  const b = await boxOf(cdp, to)
  await dragPoints(cdp, a, { x: b.x, y: b.top + 3 }, {
    held: async () => {
      await sleep(300)
      read = await cdp.evaluate(`(() => { const l = [...document.querySelectorAll('.drop-line')].find((e) => e.getClientRects().length && !e.closest('[inert]')); const c = (${lead}); if (!l || !c) return null; return { line: l.getBoundingClientRect().left, lead: c.getBoundingClientRect().left + parseFloat(getComputedStyle(c).paddingLeft) } })()`)
      await pressKey(cdp, 'Escape')
    },
    settle: 600,
  })
  return read
}

async function group10(cdp) {
  const g = '10'
  await toCollection(cdp, COLLECTION)

  // Regression: a movable Table row and band head still name the gesture and lift by Space; a row moves by keyboard and opens on Enter.
  const V10 = tableView(vid('g10table'), 'VD Movable')
  await showView(cdp, V10)
  const movable = { rows: await describes(cdp, ROWS), heads: await describes(cdp, tableHeads), row: await spaceLift(cdp, liveRow('Page B')), head: await spaceLift(cdp, head('Set Beta')) }
  reg(g, 'a movable Table row and Set band head still name the gesture and lift by Space', all(movable.rows) && all(movable.heads) && movable.row.lifted && movable.head.lifted, show(movable))
  await keySteps(cdp, liveRow('Page C'), ['ArrowUp', 'Enter'])
  const moved = await settles(async () => { const o = (viewOnDisk(V10.id)?.manual_order ?? []).map(titleOf); return o.indexOf('Page C') >= 0 && o.indexOf('Page C') < o.indexOf('Page B') })
  const movedDrawn = only(await shownTitles(cdp), ['Page A', 'Page B', 'Page C'])
  reg(g, 'a movable row still lifts by Space, moves by ArrowUp, and drops by Enter, saving manual_order', moved && same(movedDrawn, ['Page A', 'Page C', 'Page B']), show({ disk: (viewOnDisk(V10.id)?.manual_order ?? []).map(titleOf), movedDrawn }))

  // R P10 · the fold's one indent source: a band's drop line and a row's at the same depth stand at one inset past their lead.
  const bandLine = await lineAgainst(cdp, head('Sub-Set B'), head('Sub-Set A'), head('Sub-Set A'))
  await hover(cdp, liveRow('Page B'), 300)
  const grip = `(${liveRow('Page B')}).querySelector('.row-grip')`
  const rowLine = await lineAgainst(cdp, grip, liveRow('Page A'), `(${liveRow('Page A')}).querySelector('.cell-lead')`)
  await hover(cdp, liveRow('Page B'), 300)
  const deepLine = await lineAgainst(cdp, grip, liveRow('Alpha 1'), `(${liveRow('Alpha 1')}).querySelector('.cell-lead')`)
  const lines = { bandLine, rowLine, deepLine }
  reg(g, 'a band\'s drop line and a row\'s at the same depth stand at one indent, one inset past each lead, and a row a level deeper draws its line one step right', !!bandLine && !!rowLine && !!deepLine && near(bandLine.line, rowLine.line) && near(bandLine.line - bandLine.lead, rowLine.line - rowLine.lead) && near(deepLine.line - rowLine.line, STEP), show(lines))
  await focusThen(cdp, liveRow('Page A'), 'Enter')
  const entered = await settles(async () => (await activeTab(cdp)) === 'Page A', 3000)
  reg(g, 'Enter on a movable Table row still opens its page', entered, show(await activeTab(cdp)))
  await toCollection(cdp, COLLECTION)

  // BC24 · a Table sorted by two keys draws immovable rows beside movable band heads.
  await mutate(cdp, { op: 'setProperty', path: PAGES['Page A'].path, propertyId: DUE.id, value: { kind: 'dateTime', value: '2026-10-22' } })
  await mutate(cdp, { op: 'setProperty', path: PAGES['Page B'].path, propertyId: DUE.id, value: { kind: 'dateTime', value: '2026-11-03' } })
  const V10S = tableView(vid('g10sorted'), 'VD Two Sorts', { sort: [{ property_id: STAGE.id, direction: 'ascending' }, { property_id: DUE.id, direction: 'ascending' }] })
  await showView(cdp, V10S)
  const sorted = { rows: await describes(cdp, ROWS), heads: await describes(cdp, tableHeads) }
  bc(g, 24, 'I-059', 'a Table sorted by two keys names no drag gesture on its rows while its band heads still do', none(sorted.rows) && all(sorted.heads), show(sorted))
  await hover(cdp, liveRow('Page C'), 300)
  const sortedDrag = await pointerLift(cdp, `(${liveRow('Page C')}).querySelector('.row-grip')`, liveRow('Page A'), { drop: true })
  const sortedKept = (await holds(async () => viewOnDisk(V10S.id)?.manual_order === undefined, 1200)) && same(frontOf(PAGES['Page C'].path)[STAGE.key], ['Todo'])
  const sortedSpace = await spaceLift(cdp, liveRow('Page B'))
  const sortedOpened = await settles(async () => (await activeTab(cdp)) === 'Page B', 3000)
  reg(g, 'a two-key sorted Table\'s row draws no drop line under a drag and writes nothing, and Space opens its page rather than lifting it', !sortedDrag.line && sortedKept && !sortedSpace.lifted && sortedOpened, show({ sortedDrag, sortedKept, sortedSpace, tab: await activeTab(cdp) }))
  await toCollection(cdp, COLLECTION)

  // BC24 · a Date band head can't be dragged, so it names no gesture; Space folds it as it did.
  const V10D = tableView(vid('g10dates'), 'VD Dates', { group: { kind: 'property', property_id: DUE.id } })
  await showView(cdp, V10D)
  const dateHeads = await describes(cdp, tableHeads)
  bc(g, 24, 'I-059', 'a Date band head names no drag gesture', none(dateHeads), show({ dateHeads, labels: await headLabels(cdp) }))
  const dateHead = `${tableHeads}.filter((h) => h.getClientRects().length)[0]`
  const dateLabel = await cdp.evaluate(`(${dateHead}).getAttribute('aria-label')`)
  const dated = head(dateLabel)
  const dateSpace = { before: await expanded(cdp, dated), lift: await spaceLift(cdp, dated) }
  dateSpace.folded = await expanded(cdp, dated)
  await spaceLift(cdp, dated)
  dateSpace.unfolded = await expanded(cdp, dated)
  reg(g, 'Space on a Date band head folds it and Space again unfolds it, lifting nothing', dateSpace.before === 'true' && !dateSpace.lift.lifted && dateSpace.folded === 'false' && dateSpace.unfolded === 'true', show(dateSpace))

  // BC24 · a searching Table's rows and heads stay put; its band list keeps the Tab stop it always had.
  const V10Q = tableView(vid('g10search'), 'VD Search Rows')
  await showView(cdp, V10Q)
  await search(cdp, '1')
  const searching = { rows: await describes(cdp, ROWS), heads: await describes(cdp, tableHeads) }
  bc(g, 24, 'I-059', 'a searching Table\'s rows and band heads name no drag gesture', none(searching.rows) && none(searching.heads), show(searching))
  const tableStop = await cdp.evaluate(`(${zoneOf(DRIFT.shell)})?.tabIndex ?? null`)
  const searchHead = { space: await spaceLift(cdp, head('Sub-Set B')), drag: await pointerLift(cdp, head('Sub-Set B'), head('Sub-Set A'), { drop: true }) }
  await hover(cdp, liveRow('Beta 1'), 300)
  const searchRow = await pointerLift(cdp, `(${liveRow('Beta 1')}).querySelector('.row-grip')`, liveRow('Alpha 1'), { drop: true })
  const searchKept = (await holds(async () => viewOnDisk(V10Q.id)?.group_order === undefined && frontOf(PAGES['Beta 1'].path)[STAGE.key] !== undefined, 1200)) && readRel(PAGES['Beta 1'].path).length > 0
  reg(g, 'a searching Table\'s band list keeps its Tab stop, its band head lifts by neither Space nor drag, and a row dragged onto another band draws no line and moves nothing', tableStop === 0 && !searchHead.space.lifted && !searchHead.drag.held && !searchRow.line && searchKept, show({ tableStop, searchHead, searchRow, searchKept }))
  await search(cdp, '')

  // BC24 · a searching Cards view's band list keeps its Tab stop and its heads name no gesture.
  const V10QC = cardsView(vid('g10searchcards'), 'VD Search Cards', { set_cards: false })
  await showView(cdp, V10QC)
  await search(cdp, 'a')
  const cardsStop = await cdp.evaluate(`(${zoneOf('.cards-view')})?.tabIndex ?? null`)
  bc(g, 24, 'I-059', 'a searching Cards view\'s band list keeps its Tab stop', cardsStop === 0, show(cardsStop))
  const cardsSearchHeads = await describes(cdp, cardsHeads)
  bc(g, 24, 'I-059', 'a searching Cards view\'s band heads name no drag gesture', none(cardsSearchHeads), show(cardsSearchHeads))
  const cardsSearch = { space: await spaceLift(cdp, head('Set Beta')), drag: await pointerLift(cdp, head('Set Beta'), head('Set Alpha'), { drop: true }) }
  reg(g, 'a searching Cards band head lifts by neither Space nor drag', !cardsSearch.space.lifted && !cardsSearch.drag.held && (await holds(async () => viewOnDisk(V10QC.id)?.group_order === undefined, 1000)), show(cardsSearch))
  await search(cdp, '')

  // F10 · displace items take the per-item lock: Set cards under a search and cards under two sorts name no gesture and lift by no Space.
  const V10QS = cardsView(vid('g10searchsets'), 'VD Search Set Cards', { set_cards: true })
  await showView(cdp, V10QS)
  await search(cdp, '1')
  const SET_CARDS = `[...document.querySelectorAll('.cards-view .set-cards-row [aria-roledescription=sortable]')].filter((e) => !e.closest('[inert]'))`
  const setCards = { rows: await describes(cdp, SET_CARDS), space: await spaceLift(cdp, `${SET_CARDS}.find((e) => e.getClientRects().length && !e.closest('[inert]'))`) }
  fold(g, 'displace', 'a searching Cards view\'s Set cards name no drag gesture and lift by no Space', none(setCards.rows) && !setCards.space.lifted, show(setCards))
  // A Set card that doesn't lift opens its Set on Space, as a press does; one that lifts leaves the search standing.
  if (await cdp.evaluate(`!!document.querySelector('.detail-title-search')`)) await search(cdp, '')
  await toCollection(cdp, COLLECTION)
  const V10SC = cardsView(vid('g10sortedcards'), 'VD Two Sorts Cards', { set_cards: false, sort: [{ property_id: STAGE.id, direction: 'ascending' }, { property_id: DUE.id, direction: 'ascending' }] })
  await showView(cdp, V10SC)
  const sortedCards = { rows: await describes(cdp, CARDS), space: await spaceLift(cdp, card('Page B')) }
  fold(g, 'displace', 'a Cards view sorted by two keys names no drag gesture on its cards and lifts none by Space', none(sortedCards.rows) && !sortedCards.space.lifted, show(sortedCards))
  await toCollection(cdp, COLLECTION)

  // F10 · a searching ungrouped Cards view draws its band list only around bands, so no empty Tab stop.
  const V10QF = cardsView(vid('g10searchflat'), 'VD Search Flat', { set_cards: false, group: { kind: 'flat' } })
  await showView(cdp, V10QF)
  const EMPTY_STOPS = `[...document.querySelectorAll('.cards-view .line-zone')].filter((z) => z.getClientRects().length && !z.closest('[inert]') && z.tabIndex === 0 && !z.querySelector('.group-band-head')).length`
  const flatStops = { unsearched: await cdp.evaluate(EMPTY_STOPS) }
  await search(cdp, 'Page')
  flatStops.searching = await cdp.evaluate(EMPTY_STOPS)
  flatStops.cards = (await cardTitles(cdp)).length
  await search(cdp, '')
  fold(g, 'flat', 'a searching ungrouped Cards view draws no empty band-list Tab stop', flatStops.cards > 0 && flatStops.searching === 0, show(flatStops))

  // F10 · a row focused under a search inside a band saved collapsed gives its list the Tab stop back once Escape ends the search and the band folds the row away.
  const V10F = tableView(vid('g10searchfold'), 'VD Search Fold', { collapsed_groups: [IDS.alpha] })
  await showView(cdp, V10F)
  await search(cdp, 'Page')
  const tableZone = `(${zoneOf(DRIFT.shell)})`
  await cdp.evaluate(`(${liveRow('Page A')}).focus()`)
  const foldStop = { lent: await cdp.evaluate(`${tableZone}?.tabIndex ?? null`) }
  await pressKey(cdp, 'Escape')
  foldStop.ended = await settles(async () => cdp.evaluate(`![...document.querySelectorAll('.detail-title-lead.is-searching')].some((l) => !l.closest('[inert]'))`), 3000)
  foldStop.folded = await settles(async () => (await expanded(cdp, head('Set Alpha'))) === 'false' && (await cdp.evaluate(`!${tableZone}?.contains(document.activeElement)`)), 3000)
  foldStop.stop = await cdp.evaluate(`${tableZone}?.tabIndex ?? null`)
  fold(g, 'stop', 'a row focused under a search inside a band saved collapsed gives its list the Tab stop back once Escape ends the search and folds the row away', foldStop.lent === -1 && foldStop.ended && foldStop.folded && foldStop.stop === 0, show(foldStop))

  // Regression: cards and Cards band heads still name the gesture and lift by Space and by drag.
  const V10C = cardsView(vid('g10cards'), 'VD Cards Lift', { set_cards: false })
  await showView(cdp, V10C)
  const cardsMovable = { cards: await describes(cdp, CARDS), heads: await describes(cdp, cardsHeads), cardSpace: await spaceLift(cdp, card('Page B')), headSpace: await spaceLift(cdp, head('Set Beta')), cardDrag: await pointerLift(cdp, card('Page C'), card('Page A')), headDrag: await pointerLift(cdp, head('Set Beta'), head('Set Alpha')) }
  const cardsUntouched = await holds(async () => viewOnDisk(V10C.id)?.manual_order === undefined && viewOnDisk(V10C.id)?.group_order === undefined, 1000)
  reg(g, 'a card and a Cards band head still name the gesture and lift by Space and by drag', all(cardsMovable.cards) && all(cardsMovable.heads) && cardsMovable.cardSpace.lifted && cardsMovable.headSpace.lifted && cardsMovable.cardDrag.lifted && cardsMovable.headDrag.lifted && cardsMovable.headDrag.line && cardsUntouched, show(cardsMovable))

  // Regression: the Grouping pane's option and Set lists still lift; the fold's hide controls still hide.
  const V10G = tableView(vid('g10options'), 'VD Option Lists', byStage)
  await showView(cdp, V10G)
  await door(cdp, 'settings', 'Group')
  await until('the option list', async () => cdp.evaluate(`!!${paneLine('Done')}`))
  const options = { rows: await describes(cdp, `[...(${PANE_ZONE}).querySelectorAll('[data-line-row]')]`), space: await spaceLift(cdp, paneLine('Doing')), drag: await pointerLift(cdp, paneLine('Done'), paneLine('Todo')) }
  reg(g, 'the Grouping pane\'s option rows still name the gesture and lift by Space and by drag', all(options.rows) && options.space.lifted && options.drag.lifted && options.drag.line && (await holds(async () => viewOnDisk(V10G.id)?.group?.order === undefined, 800)), show(options))
  const hidden = (id, part) => (viewOnDisk(id)?.hidden_groups ?? []).some((k) => k.includes(part))
  await mouseClick(cdp, ctl('Hide Done'))
  const optionHid = await settles(async () => hidden(V10G.id, 'opt_vd_done'))
  await mouseClick(cdp, ctl('Show Done'))
  const optionShown = await settles(async () => !hidden(V10G.id, 'opt_vd_done'))
  reg(g, 'the Grouping pane\'s option eye hides Done and shows it again', optionHid && optionShown, show(viewOnDisk(V10G.id)?.hidden_groups))
  const V10L = tableView(vid('g10setlist'), 'VD Set List')
  await showView(cdp, V10L)
  await door(cdp, 'settings', 'Group')
  await until('the Set list', async () => cdp.evaluate(`!!${paneRow('Set Beta')}`))
  const setList = { rows: await describes(cdp, `[...(${PANE_ZONE}).querySelectorAll('[data-line-row]')]`), space: await spaceLift(cdp, paneRow('Set Beta')) }
  reg(g, 'the Grouping pane\'s Set rows still name the gesture and lift by Space', all(setList.rows) && setList.space.lifted, show(setList))
  await mouseClick(cdp, ctl('Hide Set Beta'))
  const setHid = await settles(async () => hidden(V10L.id, IDS.beta))
  await mouseClick(cdp, ctl('Show Set Beta'))
  const setShown = await settles(async () => !hidden(V10L.id, IDS.beta))
  reg(g, 'the Grouping pane\'s Set eye hides Set Beta and shows it again', setHid && setShown, show(viewOnDisk(V10L.id)?.hidden_groups))
  await closeAll(cdp)

  // The views dropdown: two views or more lift and switch; one view stays put.
  await openDropdown(cdp, V10.name)
  const listed = { rows: await describes(cdp, DROPDOWN_ROWS), space: await spaceLift(cdp, dropdownRow(V10.name)) }
  await focusThen(cdp, dropdownRow(V10.name), 'Enter')
  listed.switched = await settles(async () => (await cdp.evaluate(`${VIEWS_BUTTON}.textContent.trim()`)) === V10.name, 3000)
  reg(g, 'with two views or more, every dropdown row names the gesture, lifts by Space, and switches the view on Enter', all(listed.rows) && listed.space.lifted && listed.switched, show(listed))
  await toCollection(cdp, 'Collection B')
  await mouseClick(cdp, VIEWS_BUTTON)
  await until('Collection B\'s dropdown', async () => cdp.evaluate(`${DROPDOWN_ROWS}.some((r) => r.getClientRects().length && !r.closest('[inert]'))`))
  const lone = await describes(cdp, DROPDOWN_ROWS)
  bc(g, 24, 'I-059', 'the views list\'s one row names no drag gesture', lone.length === 1 && none(lone), show(lone))
  const loneRow = `${DROPDOWN_ROWS}.find((r) => r.getClientRects().length)`
  const loneLift = { space: await spaceLift(cdp, loneRow) }
  reg(g, 'the views list\'s one row lifts by neither Space nor drag', !loneLift.space.lifted && (await cdp.evaluate(`!(${loneRow}).hasAttribute('data-drag-source')`)), show(loneLift))
  await closeAll(cdp)

  // BC24 · the Trash's and Archive's rows can't be dragged and name no gesture; a row's Space toggles its check.
  await mutate(cdp, { op: 'createPage', id: mintPageId(), parentPath: `${COLLECTION}/Set Alpha`, name: 'VD Binned', seeds: {} })
  await mutate(cdp, { op: 'delete', path: `${COLLECTION}/Set Alpha/VD Binned.md`, kind: 'page' })
  await mutate(cdp, { op: 'createContainer', id: containerId(), parentPath: COLLECTION, kind: 'set', name: 'VD Bin Folder' })
  await mutate(cdp, { op: 'createPage', id: mintPageId(), parentPath: `${COLLECTION}/VD Bin Folder`, name: 'VD Bin Inside', seeds: {} })
  await mutate(cdp, { op: 'delete', path: `${COLLECTION}/VD Bin Folder`, kind: 'set' })
  await mutate(cdp, { op: 'createPage', id: mintPageId(), parentPath: `${COLLECTION}/Set Alpha`, name: 'VD Shelved', seeds: {} })
  await mutate(cdp, { op: 'archive', path: `${COLLECTION}/Set Alpha/VD Shelved.md`, kind: 'page' })
  await openSettings(cdp, 'Trash')
  await until('the trashed folder', async () => cdp.evaluate(`!!${bundleRow('.trash-frame', 'VD Bin Folder')}`))
  await sleep(500)
  const bundles = { trash: await describes(cdp, `[...document.querySelectorAll('.trash-frame .data-row')]`) }
  const binFolder = bundleRow('.trash-frame', 'VD Bin Folder')
  const checked = () => cdp.evaluate(`(${binFolder}).querySelector('[role=checkbox]').getAttribute('aria-checked')`)
  const binSpace = { before: await checked(), lift: await spaceLift(cdp, binFolder) }
  binSpace.after = await checked()
  await spaceLift(cdp, binFolder)
  binSpace.drag = await pointerLift(cdp, binFolder, bundleRow('.trash-frame', 'VD Binned'), { drop: true })
  await closeSettings(cdp)
  await toCollection(cdp, COLLECTION)
  await openDropdown(cdp, V10.name)
  await pressIn(cdp, btn('Archive'))
  await until('the archived page', async () => cdp.evaluate(`!!${bundleRow('.bundle-rows', 'VD Shelved')}`))
  await closeAll(cdp)
  bundles.archive = await describes(cdp, `[...document.querySelectorAll('.bundle-rows .data-row')]`)
  await openDropdown(cdp, V10.name)
  await pressIn(cdp, btn(V10.name))
  await until('the view again', async () => cdp.evaluate(`!${visible(`[...document.querySelectorAll('.bundle-rows')]`)}`))
  await closeAll(cdp)
  bc(g, 24, 'I-059', 'the Trash\'s and Archive\'s rows name no drag gesture', none(bundles.trash) && none(bundles.archive), show(bundles))
  reg(g, 'Space on a Trash row toggles its check, and the row lifts by neither Space nor drag', binSpace.before !== null && binSpace.after !== binSpace.before && !binSpace.lift.lifted && !binSpace.drag.held, show(binSpace))

  // Regression: the sidebar's reorderable rows still name the gesture and lift by Space and by drag.
  const collection = sideRow(COLLECTION)
  if (!(await cdp.evaluate(`!!${sideRow('Set Alpha')}`))) await mouseClick(cdp, chevronOf(collection))
  await until('the sidebar\'s Sets', async () => cdp.evaluate(`!!${sideRow('Set Beta')}`), 3000)
  const sidebar = { rows: await describes(cdp, `[...document.querySelectorAll('nav [data-line-row]')]`), space: await spaceLift(cdp, sideLine('Set Beta')), drag: await pointerLift(cdp, sideLine('Set Beta'), sideLine('Set Alpha')) }
  await mouseClick(cdp, chevronOf(collection))
  reg(g, 'the sidebar\'s reorderable rows still name the gesture and lift by Space and by drag', all(sidebar.rows) && sidebar.space.lifted && sidebar.drag.lifted && sidebar.drag.line, show(sidebar))

  // The nav view: Recents reorder and name the gesture; a search's results stay put, name none, and still carry onto the tab bar.
  await mouseClick(cdp, `[...document.querySelectorAll('[aria-label="New Tab"]')].find((e) => e.getClientRects().length && !e.closest('[inert]'))`)
  await until('the nav view', async () => cdp.evaluate(`${NAV_ROWS}.some((r) => r.getClientRects().length && !r.closest('[inert]'))`))
  await sleep(500)
  const recents = { rows: await describes(cdp, NAV_ROWS), space: await spaceLift(cdp, `${NAV_ROWS}.find((r) => r.getClientRects().length)`) }
  reg(g, 'the nav view\'s Recents rows, which reorder, still name the gesture and lift by Space', all(recents.rows) && recents.space.lifted, show(recents))
  await cdp.evaluate(`[...document.querySelectorAll('input.nav-view-search')].find((e) => e.getClientRects().length && !e.closest('[inert]')).focus()`)
  await typeText(cdp, 'Page')
  await until('the search\'s results', async () => cdp.evaluate(`!!${navRow('Page A')}`))
  await sleep(400)
  const results = await describes(cdp, NAV_ROWS)
  bc(g, 24, 'I-059', 'a nav search\'s result rows name no drag gesture', none(results), show(results))
  const { carried, before, opened } = await navCarry(cdp)
  reg(g, 'a nav search result still carries onto the tab bar by pointer, opening its tab', carried?.held && !carried.line && opened, show({ carried, before, after: await tabTitles(cdp) }))
  const GALLERY = `[...document.querySelectorAll('.nav-view [aria-roledescription=sortable]')]`
  await mouseClick(cdp, `[...document.querySelectorAll('button[title="Switch to Gallery"]')].find((e) => e.getClientRects().length && !e.closest('[inert]'))`)
  await until('the gallery\'s results', async () => cdp.evaluate(`${GALLERY}.some((e) => e.getClientRects().length && !e.closest('[inert]'))`), 3000).catch(() => {})
  const galleryTab = await activeTab(cdp)
  const gallery = { rows: await describes(cdp, GALLERY), space: await spaceLift(cdp, `${GALLERY}.find((e) => e.getClientRects().length && !e.closest('[inert]'))`) }
  fold(g, 'displace', 'a nav search\'s gallery results name no drag gesture and lift by no Space', none(gallery.rows) && !gallery.space.lifted, show(gallery))
  if ((await activeTab(cdp)) !== galleryTab || !(await cdp.evaluate(`!!document.querySelector('button[title="Switch to List"]')`))) {
    await mouseClick(cdp, `[...document.querySelectorAll('[aria-label="New Tab"]')].find((e) => e.getClientRects().length && !e.closest('[inert]'))`)
    await sleep(600)
  }
  await mouseClick(cdp, `[...document.querySelectorAll('button[title="Switch to List"]')].find((e) => e.getClientRects().length && !e.closest('[inert]'))`)
  await until('the list\'s results', async () => cdp.evaluate(`!!${navRow('Page B')}`), 3000).catch(async () => {
    await cdp.evaluate(`[...document.querySelectorAll('input.nav-view-search')].find((e) => e.getClientRects().length && !e.closest('[inert]')).focus()`)
    await typeText(cdp, 'Page')
    await until('the list\'s results again', async () => cdp.evaluate(`!!${navRow('Page B')}`))
  })
  const resultSpace = await spaceLift(cdp, navRow('Page B'))
  const resultOpened = await settles(async () => (await activeTab(cdp)) === 'Page B', 3000)
  reg(g, 'Space on a nav search result opens it rather than lifting it', !resultSpace.lifted && resultOpened, show({ resultSpace, tab: await activeTab(cdp) }))

  // BC24 · the alias list freezes whole while drafting or renaming: a row in a disabled zone names no gesture and lifts by no drag.
  for (const alias of ['vd-one', 'vd-two']) await mutate(cdp, { op: 'editAliases', path: PAGES['Page B'].path, edit: { op: 'add', alias } })
  await openPanel(cdp)
  await until('the Aliases row', async () => cdp.evaluate(`!!${manageRow('Aliases')}`))
  await mouseClick(cdp, manageButton('Aliases'))
  const MANAGE = `document.querySelector('[data-picker-portal] [aria-label="Add alias"]')?.closest('[data-picker-portal]')`
  const ALIASES = `[...((${MANAGE})?.querySelectorAll('[data-line-row]') ?? [])]`
  const ALIAS_FIELD = `(${MANAGE})?.querySelector('input[aria-label="Alias"]')`
  await until('the alias list', async () => cdp.evaluate(`${ALIASES}.length === 2`))
  const aliasRow = (name) => `${ALIASES}.find((r) => r.textContent.trim() === ${JSON.stringify(name)})`
  const aliases = { rows: await describes(cdp, ALIASES), space: await spaceLift(cdp, aliasRow('vd-two')) }
  reg(g, 'the alias list\'s rows still name the gesture and lift by Space', all(aliases.rows) && aliases.space.lifted, show(aliases))
  const frozen = async () => {
    const open = await cdp.evaluate(`!!${ALIAS_FIELD}`)
    const rows = await describes(cdp, ALIASES)
    const drag = await pointerLift(cdp, `${ALIASES}[1]`, `${ALIASES}[0]`)
    return { open, rows, drag }
  }
  await mouseClick(cdp, `(${MANAGE}).querySelector('[aria-label="Add alias"]')`)
  await until('the alias draft', async () => cdp.evaluate(`!!${ALIAS_FIELD}`), 3000).catch(() => {})
  const drafting = await frozen()
  await escapeAll(cdp)
  if (!(await cdp.evaluate(`!!${MANAGE}`))) await mouseClick(cdp, manageButton('Aliases'))
  await until('the alias list again', async () => cdp.evaluate(`${ALIASES}.length === 2 && !${ALIAS_FIELD}`), 3000).catch(() => {})
  await popNative(cdp, await boxOf(cdp, aliasRow('vd-one')))
  await pickNative(['Rename'])
  await until('the alias rename', async () => cdp.evaluate(`!!${ALIAS_FIELD}`), 3000).catch(() => {})
  const renaming = await frozen()
  const still = (r) => r.open && none(r.rows) && !r.drag.held
  bc(g, 24, 'I-059', 'the alias list freezes while drafting and renaming, its rows naming no drag gesture and lifting by no drag', still(drafting) && still(renaming), show({ drafting, renaming }))
  await closeAll(cdp)
  await closePanel(cdp)

  // A tile's pills: unlocked they lift; locked, a displace item in a disabled zone names no gesture and Space switches the view.
  await showTile(cdp, [TA, TB])
  const pills = { rows: await describes(cdp, TILE_PILLS), space: await spaceLift(cdp, pill(TB.name)) }
  reg(g, 'an unlocked tile\'s pills still name the gesture and lift by Space', all(pills.rows) && pills.space.lifted, show(pills))
  await showTile(cdp, [TA, TB], { locked: true })
  const lockedPills = await describes(cdp, TILE_PILLS)
  bc(g, 24, 'I-059', 'a locked tile\'s pills name no drag gesture', none(lockedPills), show(lockedPills))
  const lockedSpace = await spaceLift(cdp, pill(TB.name))
  reg(g, 'Space on a locked tile\'s pill switches the tile\'s view rather than lifting it', !lockedSpace.lifted && (await settles(async () => tileOnDisk().active === 1, 3000)), show({ lockedSpace, active: tileOnDisk().active }))

  // F10 · a tile's lone view pill stays put: no gesture named and no lift, the tile still drawing its view.
  await showTile(cdp, [TA])
  const lonePill = { rows: await describes(cdp, TILE_PILLS), space: await spaceLift(cdp, pill(TA.name)) }
  const loneAt = await boxOf(cdp, pill(TA.name))
  await hush(cdp)
  await dragPoints(cdp, loneAt, { x: loneAt.x + 60, y: loneAt.y }, { held: async () => { await sleep(300); lonePill.drag = await cdp.evaluate(HELD); await pressKey(cdp, 'Escape') }, settle: 600 })
  lonePill.drawn = await cdp.evaluate(`!!(${TILE_BODY})?.querySelector('${DRIFT.shell}')`)
  fold(g, 'pill', 'a tile\'s lone view pill names no drag gesture and lifts by neither Space nor drag', lonePill.rows.length === 1 && none(lonePill.rows) && !lonePill.space.lifted && !lonePill.drag?.held && lonePill.drawn, show(lonePill))

  // BC24 · a locked Matrix lends its node's label a row handle that carries out but never reorders, so it names no gesture.
  await must('the Matrix locked', ask(cdp, 'matrix:write', { display: { locked: true } }))
  await mouseClick(cdp, ribbon('Matrix'))
  await until('the Matrix', async () => cdp.evaluate(`!!${shownCanvas}`))
  await sleep(2500)
  const stage = await boxOf(cdp, shownCanvas)
  let found = false
  for (let y = stage.top + 12; y < stage.bottom && !found; y += 24)
    for (let x = stage.left + 12; x < stage.right && !found; x += 24) {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' })
      found = await cdp.evaluate(`!!${matrixAnchor('Page A')}`)
    }
  const label = found && { handle: await cdp.evaluate(`(${matrixAnchor('Page A')}).hasAttribute('data-line-row')`), describes: (await describes(cdp, `[${matrixAnchor('Page A')}]`))[0] ?? null }
  bc(g, 24, 'I-059', 'a locked Matrix\'s node label names no drag gesture', !!label && label.handle && label.describes === false, show({ found, label }))
  await must('the Matrix unlocked', ask(cdp, 'matrix:write', { display: { locked: false } }))
  await toCollection(cdp, COLLECTION)
  await shot(cdp, 'g10-end')
}

// ── Group 11 — List ─────────────────────────────────────────────────────────

/** A List decision, owned by the List View plan, which `--landed 11` names: printed as `[P11 <decision>]`. */
const decided = (decision, name, pass, detail) => item('11', 11, decision, name, pass, detail)
/** A measurement the decisions name without a rule, printed beside the cases and leaving the tally alone. */
const note = (decision, name, value) => console.log(`NOTE   g11 [P11 ${decision}] ${name}: ${show(value)}`)
const TAGS = { id: 'prop_vl_tags', label: 'VL Tags', key: 'VL Tags', type: 'multiSelect', select_options: [...['One', 'Two', 'Three'].map((k) => ({ id: `opt_vl_${k.toLowerCase()}`, key: k, label: k })), { id: 'opt_vl_long', key: 'A Fourth Tag Long Enough to Pass the Cap', label: 'A Fourth Tag Long Enough to Pass the Cap' }] }
const PHASE = {
  id: 'prop_vl_phase', label: 'VL Phase', key: 'VL Phase', type: 'status',
  status_groups: [
    { id: 'todo', label: 'To Do', color: 'grey', options: [{ id: 'opt_vl_open', key: 'Open', label: 'Open' }] },
    { id: 'done', label: 'Done', color: 'green', options: [{ id: 'opt_vl_closed', key: 'Closed', label: 'Closed' }] },
  ],
}
const COUNT = { id: 'prop_vl_count', label: 'VL Count', key: 'VL Count', type: 'number' }
const METER = { id: 'prop_vl_meter', label: 'VL Meter', key: 'VL Meter', type: 'number', number_family: 'percent' }
const NOTE = { id: 'prop_vl_note', label: 'VL Note', key: 'VL Note', type: 'text' }
const SITE = { id: 'prop_vl_site', label: 'VL Site', key: 'VL Site', type: 'link' }
const DOC = { id: 'prop_vl_doc', label: 'VL Doc', key: 'VL Doc', type: 'file' }
const LIST_DEFS = [TAGS, PHASE, COUNT, METER, NOTE, SITE, DOC]
const ALL_DEFS = [...DEFS, ...LIST_DEFS]
/** `~/Test`'s three Contexts and their Spaces. */
const AREAS = { id: '01KSR4920064F9BEYMWS0N4CZE', label: 'Areas' }
const TOPICS = { id: '01KSR492Z8KC21RH7V9KKQEWGR', label: 'Topics' }
const PROJECTS = { id: '01KSR493YGGCF9DPP5K2GZ512A', label: 'Projects' }
const SPACES = { '01KSR494XRQY616DNQG7AZDVZK': 'Area One', '01KSR495X030KMVAEABNQGFXAH': 'Area Two', '01KSR496W8FEFY4Q66TFJGMK9T': 'Topic One', '01KSR497VGH6D8P4SZTTMNCKYC': 'Project One' }
const [AREA_ONE, AREA_TWO, TOPIC_ONE, PROJECT_ONE] = Object.keys(SPACES)
const CONTEXTS = [AREAS, TOPICS, PROJECTS]
const STAMPS = { _created_at: { type: 'createdTime', label: 'Creation Time' }, _modified_at: { type: 'lastEditedTime', label: 'Last Modified' } }
/** Every column a List can draw, by id, with its type and its label. */
const TYPE_OF = { _title: 'title', ...Object.fromEntries(ALL_DEFS.map((d) => [d.id, d.type])), ...Object.fromEntries(CONTEXTS.map((c) => [c.id, 'context'])), ...Object.fromEntries(Object.entries(STAMPS).map(([id, s]) => [id, s.type])) }
const LABEL_OF = { ...Object.fromEntries(ALL_DEFS.map((d) => [d.id, d.label])), ...Object.fromEntries(CONTEXTS.map((c) => [c.id, c.label])), ...Object.fromEntries(Object.entries(STAMPS).map(([id, s]) => [id, s.label])) }
const idOfLabel = (label) => Object.keys(LABEL_OF).find((id) => LABEL_OF[id] === label)
/** D-2's default sides, stated here as the decision states them. */
const DEFAULT_SIDE = { title: 'left', select: 'left', multiSelect: 'left', status: 'left', context: 'left', dateTime: 'right', number: 'right', link: 'right', checkbox: 'right', text: 'right', file: 'right', createdTime: 'right', lastEditedTime: 'right' }
const sideOf = (view, id) => (id === '_title' ? 'left' : (view.column_sides?.[id] ?? DEFAULT_SIDE[TYPE_OF[id]]))
/** The order every List view of the matrix lists its properties in. */
const LIST_ORDER = ['_title', STAGE.id, TAGS.id, PHASE.id, AREAS.id, DONE.id, DUE.id, COUNT.id, METER.id, NOTE.id, SITE.id, DOC.id]
const listView = (id, name, extra = {}) => ({ id, name, type: 'list', property_order: LIST_ORDER, hidden_properties: [], column_styles: { [METER.id]: { look: 'bar' } }, ...extra })

const ROWS_SET = `${COLLECTION}/Set Beta/VL Rows`
const SUB_A = `${COLLECTION}/Set Beta/Sub-Set A`
const DEEP_SET = `${SUB_A}/VL Deep`
/** Sets made inside VL Deep for a case, each inside the last and holding one row, so Set Beta's bands nest five deep. */
const DEPTHS = ['VL Depth Three', 'VL Depth Four', 'VL Depth Five']
const deepRow = (name) => `${name} Row`
/** Makes the DEPTHS chain, answering what deletes it. */
async function deepChain(cdp) {
  let parentPath = DEEP_SET
  for (const name of DEPTHS) {
    await mutate(cdp, { op: 'createContainer', id: containerId(), parentPath, kind: 'set', name })
    parentPath = `${parentPath}/${name}`
    await mutate(cdp, { op: 'createPage', id: mintPageId(), parentPath, name: deepRow(name), seeds: {} })
  }
  return () => mutate(cdp, { op: 'delete', path: `${DEEP_SET}/${DEPTHS[0]}`, kind: 'set' })
}
const LONG = 'A Long Title Past the Floor'
/** The pages List's cases read: a row of each content kind in VL Rows, and a long-titled row at each indentation depth. */
const LIST_PAGES = [
  ['VL Bare', ROWS_SET, {}],
  ['VL Left', ROWS_SET, { [TAGS.id]: { kind: 'multiSelect', value: ['opt_vl_one'] }, [PHASE.id]: { kind: 'select', value: 'opt_vl_open' }, [AREAS.id]: { kind: 'context', value: [AREA_ONE] } }],
  ['VL Right', ROWS_SET, { [COUNT.id]: { kind: 'number', value: 42 }, [DUE.id]: { kind: 'dateTime', value: '2026-10-22' }, [DONE.id]: { kind: 'checkbox', value: true }, [NOTE.id]: { kind: 'text', value: 'Right note' } }],
  ['VL Both', ROWS_SET, { [STAGE.id]: { kind: 'select', value: 'opt_vd_doing' }, [DUE.id]: { kind: 'dateTime', value: '2026-11-02' }, [SITE.id]: { kind: 'link', value: '[[Page A]]' } }],
  ['VL Crowded', ROWS_SET, {
    [STAGE.id]: { kind: 'select', value: 'opt_vd_todo' }, [TAGS.id]: { kind: 'multiSelect', value: ['opt_vl_one', 'opt_vl_two', 'opt_vl_three', 'opt_vl_long'] }, [PHASE.id]: { kind: 'select', value: 'opt_vl_closed' },
    [AREAS.id]: { kind: 'context', value: [AREA_ONE, AREA_TWO] }, [DONE.id]: { kind: 'checkbox', value: true }, [DUE.id]: { kind: 'dateTime', value: '2026-12-01' }, [COUNT.id]: { kind: 'number', value: 1234567 },
    [METER.id]: { kind: 'number', value: 64 }, [NOTE.id]: { kind: 'text', value: 'A long note that runs well past the maximum any one value may take on a row' },
    [SITE.id]: { kind: 'link', value: '[[VL Nowhere Is a Link Target Long Enough to Pass the Cap]]' }, [DOC.id]: { kind: 'file', value: ['[[Collection A Banner.jpg]]'] },
  }],
  ['VL Full', ROWS_SET, {
    [STAGE.id]: { kind: 'select', value: 'opt_vd_done' }, [TAGS.id]: { kind: 'multiSelect', value: ['opt_vl_two'] }, [PHASE.id]: { kind: 'select', value: 'opt_vl_open' },
    [AREAS.id]: { kind: 'context', value: [AREA_TWO] }, [TOPICS.id]: { kind: 'context', value: [TOPIC_ONE] }, [PROJECTS.id]: { kind: 'context', value: [PROJECT_ONE] },
    [DONE.id]: { kind: 'checkbox', value: true }, [DUE.id]: { kind: 'dateTime', value: '2026-09-09' }, [COUNT.id]: { kind: 'number', value: 7 }, [METER.id]: { kind: 'number', value: 30 },
    [NOTE.id]: { kind: 'text', value: 'Full note' }, [SITE.id]: { kind: 'link', value: '[[Page B]]' }, [DOC.id]: { kind: 'file', value: ['[[Collection A Banner.jpg]]'] },
  }],
  ...[['Zero', COLLECTION], ['One', `${COLLECTION}/Set Beta`], ['Two', SUB_A], ['Three', DEEP_SET]].map(([n, parent]) => [`VL ${n} ${LONG}`, parent, {
    [STAGE.id]: { kind: 'select', value: 'opt_vd_todo' }, [DUE.id]: { kind: 'dateTime', value: '2026-11-20' }, [NOTE.id]: { kind: 'text', value: `Depth ${n}` },
  }]),
]
const LONG_ROWS = LIST_PAGES.map(([t]) => t).filter((t) => t.endsWith(LONG))

/** List's properties registered beside the drive's three and assigned to Collection A, its two Sets, and its pages. */
async function seedList(cdp) {
  await writeRegistry(cdp, ALL_DEFS)
  for (const d of LIST_DEFS) await mutate(cdp, { op: 'assignProperty', containerPath: COLLECTION, propertyId: d.id })
  await mutate(cdp, { op: 'createContainer', id: containerId(), parentPath: `${COLLECTION}/Set Beta`, kind: 'set', name: 'VL Rows' })
  await mutate(cdp, { op: 'createContainer', id: containerId(), parentPath: SUB_A, kind: 'set', name: 'VL Deep' })
  for (const [name, parentPath, seeds] of LIST_PAGES) await mutate(cdp, { op: 'createPage', id: mintPageId(), parentPath, name, seeds })
  await until('List\'s pages', async () => { const held = [...(await listPages(cdp)).values()]; return LIST_PAGES.every(([t]) => held.some((p) => p.title === t)) })
}

/** Every page in Collection A by id: its title, path, front matter on disk, and the Context values the tree resolved. */
async function listPages(cdp) {
  const out = new Map()
  const walk = (n) => {
    for (const p of n.pages ?? []) out.set(p.id, { id: p.id, title: p.title, path: p.path, contexts: p.contextValues ?? {} })
    for (const s of n.sets ?? []) walk(s)
  }
  walk((await ask(cdp, 'nexus:state')).value.tree.collections.find((c) => c.path === COLLECTION))
  for (const p of out.values()) p.fm = frontOf(p.path)
  listPages.cache = out
  return out
}
listPages.cache = new Map()
const ridOf = (title) => [...listPages.cache].find(([, p]) => p.title === title)?.[0] ?? PAGES[title]?.id
const listRow = (title) => visible(`[...document.querySelectorAll('.list-view .data-row[data-rid="${ridOf(title)}"]')]`)
const tableRowOf = (title) => visible(`[...document.querySelectorAll('.table-shell:not(.list-view) .data-row[data-rid="${ridOf(title)}"]')]`)

/** The value a page holds for a column, as the drive reads it from disk and the tree; a checkbox's blank draws, and a stamp always holds. */
function heldValue(page, id) {
  const type = TYPE_OF[id]
  if (id in STAMPS) return { stamp: true }
  if (type === 'context') return page.contexts[id]?.length ? page.contexts[id] : null
  const v = page.fm[ALL_DEFS.find((d) => d.id === id).key]
  if (type === 'checkbox') return v === true
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0) ? null : v
}
/** The columns a view shows, in its order, Title first unless ordered later. */
const columnsOf = (view) => {
  const shown = view.property_order.filter((id) => !view.hidden_properties.includes(id) && id in TYPE_OF)
  return shown.includes('_title') ? shown : ['_title', ...shown]
}
/** What a row should draw on each side, in order: the view's shown columns, Title first unless ordered later, each that holds a value or draws its blank (B-4), on its side (D-1, D-2, E-9). */
function expectedSides(view, page) {
  const drawn = columnsOf(view).filter((id) => id === '_title' || heldValue(page, id) !== null)
  return { left: drawn.filter((id) => sideOf(view, id) === 'left'), right: drawn.filter((id) => sideOf(view, id) === 'right') }
}
/** The time a page's id was minted, its created stamp (`Core/Views/pageValues.ts`): the id's first ten Crockford base-32 digits, in ms. */
const idTime = (id) => new Date([...id.slice(0, 10)].reduce((t, c) => t * 32 + '0123456789ABCDEFGHJKMNPQRSTVWXYZ'.indexOf(c), 0))
/** A date as a view's Full Date format draws it, the default every case's view keeps. */
const fullDate = (d) => {
  const n = d.getDate()
  const th = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' })[n % 10] ?? 'th'
  return `${d.toLocaleString('en-US', { month: 'long' })} ${n}${th}, ${d.getFullYear()}`
}
/** Whether a drawn value shows what its page holds for `id`: its option labels, digits, text, link, file, Space, its date as the Full Date format writes it (a created stamp's from its id's time, a modified one's from its file's), a bar, or a checkbox in its state. */
function shows(view, page, id, seat) {
  const v = heldValue(page, id)
  const type = TYPE_OF[id]
  const words = (x) => [x].flat().map(String)
  switch (type) {
    case 'select': case 'multiSelect': case 'status': return words(v).every((k) => seat.text.includes(k))
    case 'context': return v.every((s) => seat.text.includes(SPACES[s]))
    case 'number': return view.column_styles?.[id]?.look === 'bar' ? seat.bar : seat.text.replace(/\D/g, '').includes(String(v))
    case 'text': return seat.text.startsWith(String(v).slice(0, 10))
    case 'link': return seat.text.includes(String(v).replace(/^\[\[|\]\]$/g, ''))
    case 'file': return seat.text.includes('Collection A Banner')
    case 'checkbox': return seat.check && seat.checked === v
    case 'dateTime': return seat.text === fullDate(new Date(`${String(v).slice(0, 10)}T12:00`))
    case 'createdTime': return seat.text === fullDate(idTime(page.id))
    case 'lastEditedTime': return seat.text === fullDate(statSync(abs(page.path)).mtime)
    default: return false
  }
}

/** Every drawn List row: the band it sits in, its boxes, its two groups' parts with the bars inside each value, its grip, its + and what stands before it, and the zoom it draws at, each in page pixels. */
const LIST_READ = `(() => {
  const box = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width, h: b.height, cy: b.top + b.height / 2 } }
  const part = (c) => c.classList.contains('list-view-title')
    ? { kind: 'title', box: box(c), text: c.querySelector('.cell-title-text')?.getBoundingClientRect().width ?? 0, icon: !!c.querySelector('.cell-title > svg'), name: c.dataset.title }
    : c.classList.contains('value-seat')
      ? { kind: 'seat', box: box(c), text: c.textContent.trim(), bar: !!c.querySelector('.cell-bar'), check: !!c.querySelector('.cell-checkbox'), checked: !!c.querySelector('.checkbox-checked'), bars: barClass ? c.getElementsByClassName(barClass).length : 0 }
      : { kind: c.getAttribute('aria-hidden') === 'true' ? 'bar' : c.tagName.toLowerCase(), box: box(c) }
  const group = (g) => g && { box: box(g), sw: g.scrollWidth, cw: g.clientWidth, parts: [...g.children].map(part) }
  const shell = [...document.querySelectorAll('.list-view')].find((e) => e.getClientRects().length && !e.closest('[inert]'))
  const barClass = shell?.querySelector('.list-view-group > [aria-hidden="true"]')?.className
  const bands = [...(shell?.querySelectorAll('.group-band') ?? [])]
  const rows = [...(shell?.querySelectorAll('.data-row[data-rid]') ?? [])].filter((r) => r.getClientRects().length).map((r) => {
    const line = r.querySelector('.list-view-line')
    const z = line.currentCSSZoom ?? 1
    const right = line.querySelector(':scope > .list-view-right')
    const left = line.querySelector(':scope > .list-view-group:not(.list-view-right)')
    const add = line.querySelector(':scope > .list-view-add')
    const lb = box(line)
    return {
      rid: r.dataset.rid, band: bands.indexOf(r.parentElement.closest('.group-band')), z, depth: r.querySelector('.cell-lead').style.paddingLeft, row: box(r), rowSW: r.scrollWidth, rowCW: r.clientWidth, line: lb,
      lineEnd: lb.r - parseFloat(getComputedStyle(line).paddingRight) * z, last: line.lastElementChild === add ? 'add' : line.lastElementChild === right ? 'right' : 'left',
      grip: box(r.querySelector('.row-grip')), left: group(left), right: group(right), add: add && { box: box(add), opacity: getComputedStyle(add).opacity, held: add.hasAttribute('data-reveal-held'), after: add.previousElementSibling?.classList.contains('list-view-group') ?? false },
    }
  })
  const cs = shell && getComputedStyle(shell)
  return { rows, shell: shell && { sw: shell.scrollWidth, cw: shell.clientWidth }, tokens: cs && Object.fromEntries(['--list-view-value-max', '--list-view-title-min', '--list-view-wrap-gap'].map((k) => [k, parseFloat(cs.getPropertyValue(k))])) }
})()`
const readList = (cdp) => cdp.evaluate(LIST_READ)
/** A read row's title text width. */
const titleWidth = (r) => r.left.parts.find((p) => p.kind === 'title')?.text
/** Each page's title text width where nothing shares its row, by id, in CSS pixels: the most a title's floor can take. */
async function titleWidths(cdp) {
  await showOn(cdp, 'collection', listView(vid('g11titles'), 'VL Titles', { group: { kind: 'flat' }, property_order: ['_title'] }))
  return Object.fromEntries((await readList(cdp)).rows.map((r) => [r.rid, titleWidth(r) / r.z]))
}

/** The window shown `width` by `height` CSS pixels through the device metrics, which never takes focus; null keeps a side at the window's own size, and both null clears the override. */
let naturalSize
async function viewport(cdp, width, height = null) {
  naturalSize ??= await cdp.evaluate('({ w: innerWidth, h: innerHeight })')
  if (width === null && height === null) await cdp.send('Emulation.clearDeviceMetricsOverride')
  else await cdp.send('Emulation.setDeviceMetricsOverride', { width: Math.round((width ?? naturalSize.w) * zoom), height: Math.round((height ?? naturalSize.h) * zoom), deviceScaleFactor: 0, mobile: false })
  await sleep(250)
}

// ── Group 11 · the configurations ───────────────────────────────────────────

const SIDE_SETS = {
  defaults: {},
  moved: { column_sides: { [STAGE.id]: 'right', [DUE.id]: 'left' } },
  ahead: { property_order: [STAGE.id, TAGS.id, ...LIST_ORDER.filter((id) => id !== STAGE.id && id !== TAGS.id), ...Object.keys(STAMPS)] },
  allLeft: { column_sides: Object.fromEntries(LIST_ORDER.slice(1).map((id) => [id, 'left'])) },
  allRight: { column_sides: Object.fromEntries(LIST_ORDER.slice(1).map((id) => [id, 'right'])) },
  hidden: { hidden_properties: [PHASE.id, DONE.id, NOTE.id] },
  titleRight: { column_sides: { _title: 'right' } },
}
const GROUPINGS = { flat: { group: { kind: 'flat' } }, sets: {}, stage: byStage, setsSub: subGrouped }
const PIPES = {
  none: {},
  filter: { filter: { match: 'all', rules: [{ property_id: '_title', op: 'contains', value: 'VL' }] } },
  sort: { sort: [{ property_id: '_title', direction: 'descending' }] },
  search: {},
}
/** A pairwise cover of sides × grouping × pipeline × surface × Wrap Rows × Outlines × Title Icons × Scale: every pair of two dimensions' values shows in some row, a tile taking no search and drawing at its own size whatever the view's Scale (`ViewHost.tsx`). */
const CONFIGS = [
  ['defaults', 'flat', 'none', 'tile', 0, 0, 0, 1], ['defaults', 'sets', 'search', 'collection', 1, 1, 1, 1.25], ['defaults', 'stage', 'filter', 'collection', 1, 0, 1, 1.25], ['defaults', 'setsSub', 'sort', 'set', 0, 1, 0, 1.25],
  ['moved', 'flat', 'sort', 'collection', 0, 1, 1, 1.25], ['moved', 'sets', 'filter', 'collection', 1, 0, 0, 1], ['moved', 'stage', 'search', 'set', 0, 0, 1, 1], ['moved', 'setsSub', 'none', 'tile', 1, 1, 0, 1],
  ['ahead', 'flat', 'none', 'tile', 1, 1, 1, 1], ['ahead', 'sets', 'search', 'set', 0, 0, 0, 1.25], ['ahead', 'stage', 'filter', 'set', 1, 1, 1, 1], ['ahead', 'setsSub', 'sort', 'collection', 1, 0, 0, 1],
  ['allLeft', 'flat', 'filter', 'collection', 1, 1, 0, 1], ['allLeft', 'sets', 'sort', 'tile', 1, 0, 1, 1], ['allLeft', 'stage', 'none', 'set', 0, 0, 1, 1.25], ['allLeft', 'setsSub', 'search', 'collection', 0, 0, 0, 1],
  ['allRight', 'flat', 'search', 'set', 1, 0, 1, 1.25], ['allRight', 'sets', 'filter', 'tile', 1, 0, 1, 1], ['allRight', 'stage', 'sort', 'collection', 0, 1, 0, 1], ['allRight', 'setsSub', 'none', 'collection', 1, 0, 1, 1],
  ['hidden', 'flat', 'search', 'set', 0, 1, 0, 1.25], ['hidden', 'sets', 'none', 'collection', 1, 1, 0, 1], ['hidden', 'stage', 'sort', 'tile', 0, 1, 0, 1], ['hidden', 'setsSub', 'filter', 'tile', 0, 0, 1, 1],
  ['titleRight', 'flat', 'sort', 'set', 1, 0, 1, 1.25], ['titleRight', 'sets', 'filter', 'tile', 0, 1, 0, 1], ['titleRight', 'stage', 'none', 'tile', 1, 1, 1, 1], ['titleRight', 'setsSub', 'search', 'collection', 0, 0, 0, 1],
]
const configView = (n, [sides, grouping, pipe, , wrap, outlines, icons, scale]) =>
  listView(vid(`g11c${n}`), `VL Config ${n}`, { ...GROUPINGS[grouping], ...PIPES[pipe], ...SIDE_SETS[sides], wrap_rows: !!wrap, hide_outlines: !outlines, hide_page_icons: !icons, ...(scale !== 1 && { view_scale: scale }) })
const configName = (n, [sides, grouping, pipe, surface, wrap, outlines, icons, scale]) =>
  `config ${n}: sides ${sides}, grouping ${grouping}, pipeline ${pipe}, ${surface}, Wrap Rows ${wrap ? 'on' : 'off'}, Outlines ${outlines ? 'on' : 'off'}, Title Icons ${icons ? 'on' : 'off'}, Scale ${scale}`

/** Set Beta's own view, shown from the sidebar. */
async function showSetView(cdp, view, set = 'Set Beta') {
  const path = `${COLLECTION}/${set}`
  await must(`save ${view.name}`, ask(cdp, 'views:save', path, 'set', view, {}))
  await mutate(cdp, { op: 'setActiveView', path, kind: 'set', viewId: view.id })
  await closeAll(cdp)
  if (!(await cdp.evaluate(`!!(${sideRow(set)})`))) await mouseClick(cdp, `(${sideRow(COLLECTION)}).closest('.row').querySelector('${DRIFT.chevron}')`)
  await until(`${set} in the sidebar`, async () => cdp.evaluate(`!!(${sideRow(set)})`))
  await mouseClick(cdp, sideRow(set))
  await until(`${view.name} shown`, async () => (await cdp.evaluate(`${VIEWS_BUTTON}?.textContent ?? ''`)).includes(view.name))
  await sleep(700)
}
/** A view shown on the main pane of Collection A, of Set Beta, or in a View Tile. */
async function showOn(cdp, surface, view) {
  if (surface === 'tile') return showTile(cdp, [view])
  if (surface === 'set') return showSetView(cdp, view)
  if ((await activeTab(cdp)) !== COLLECTION) await toCollection(cdp, COLLECTION)
  await showView(cdp, view)
}

/** Whether a row has crossed its threshold: with Wrap Rows on and a right group, that group on a second line; otherwise its left group scrolling. */
const wrapped = (r) => !!r.right && r.right.box.t > r.left.box.t + 1
const scrolls = (r) => r.left.sw > r.left.cw + 1
const crossed = (wrap) => (r) => (wrap && r.right ? wrapped(r) : scrolls(r))

/** Each drawn row against its page: its two groups' items in order, drawn left to right, each value showing what its page holds, a bar between each two items and none inside one, the Title Icons switch, and the + after the last group, on its line, with no bar before it. */
function structureErrors(view, read) {
  const errors = read.rows.length === 0 ? ['no row drawn'] : []
  for (const r of read.rows) {
    const page = listPages.cache.get(r.rid)
    if (!page) continue
    const want = expectedSides(view, page)
    for (const side of ['left', 'right']) {
      const g = r[side]
      const ids = want[side]
      if (!g) { if (ids.length) errors.push(`${page.title}: no ${side} group for ${ids}`); continue }
      const items = g.parts.filter((p) => p.kind !== 'bar')
      const kinds = g.parts.map((p) => (p.kind === 'bar' ? 'bar' : 'item'))
      if (items.length !== ids.length) errors.push(`${page.title} ${side}: ${items.length} items for ${ids.length} (${ids})`)
      else items.forEach((p, i) => {
        if ((ids[i] === '_title') !== (p.kind === 'title')) errors.push(`${page.title} ${side}[${i}]: ${p.kind} where ${ids[i]} belongs`)
        else if (p.kind === 'seat' && !shows(view, page, ids[i], p)) errors.push(`${page.title} ${side}[${i}]: "${p.text}" doesn't show ${ids[i]}`)
        else if (p.kind === 'seat' && p.bars > 0) errors.push(`${page.title} ${side}[${i}]: a bar between two of ${ids[i]}'s values`)
        else if (p.kind === 'title' && p.icon === !!view.hide_page_icons) errors.push(`${page.title}: title icon ${p.icon} under hide_page_icons ${view.hide_page_icons}`)
      })
      if (kinds.join() !== items.map(() => 'item').join(',bar,')) errors.push(`${page.title} ${side}: parts ${kinds}`)
      if (items.some((p, i) => i > 0 && p.box.l < items[i - 1].box.l)) errors.push(`${page.title} ${side}: drawn out of its order`)
    }
    if (r.add && (r.last !== 'add' || !r.add.after)) errors.push(`${page.title}: the + isn't the line's last, after a group with no bar between`)
    const before = r.right ?? r.left
    if (r.add && r.add.box.l < before.box.r - 0.5) errors.push(`${page.title}: the + stands before its group's end`)
    if (r.add && Math.abs(r.add.box.cy - before.box.cy) > 1) errors.push(`${page.title}: the + off its group's line`)
  }
  return errors
}

/** Every row at the width it was read: nothing overflows, the title holds its floor, each value its cap, the grip its first line, and a wrapped right group sits flush right one row pitch down, an unwrapped one a gap's width off the left. */
function geometryErrors(read, { natural, tableRow, wrap }) {
  const errors = []
  const t = read.tokens
  const one = read.rows.filter((r) => !wrapped(r))
  const pitch = one.length ? one[0].row.h : null
  for (const r of read.rows) {
    const name = titleOf(r.rid)
    const title = titleWidth(r)
    const floor = Math.min(natural[r.rid], t['--list-view-title-min']) * r.z
    if (r.rowSW > r.rowCW + 1 || r.line.r > r.row.r + 0.5) errors.push(`${name}: the row overflows (${r.rowSW} > ${r.rowCW})`)
    if (title !== undefined && title < floor - 0.75) errors.push(`${name}: title ${title.toFixed(1)} under its floor ${floor.toFixed(1)}`)
    for (const p of [...r.left.parts, ...(r.right?.parts ?? [])]) if (p.kind === 'seat' && p.box.w > t['--list-view-value-max'] * r.z + 0.5) errors.push(`${name}: a value ${p.box.w.toFixed(1)} past the cap`)
    if (Math.abs(r.grip.cy - r.left.box.cy) > 0.75) errors.push(`${name}: grip ${r.grip.cy.toFixed(1)} off the first line ${r.left.box.cy.toFixed(1)}`)
    if (wrapped(r)) {
      if (!wrap) errors.push(`${name}: wrapped with Wrap Rows off`)
      if (Math.abs(r.right.box.r - r.lineEnd) > 1) errors.push(`${name}: wrapped right group ends ${r.right.box.r.toFixed(1)}, the line ${r.lineEnd.toFixed(1)}`)
      if (pitch !== null && Math.abs(r.right.box.t - r.left.box.t - pitch) > 1) errors.push(`${name}: second line ${(r.right.box.t - r.left.box.t).toFixed(1)} below the first, the pitch ${pitch.toFixed(1)}`)
    } else if (r.right && r.right.box.l - r.left.box.r < t['--list-view-wrap-gap'] * r.z - 0.75) errors.push(`${name}: groups ${(r.right.box.l - r.left.box.r).toFixed(1)} apart`)
  }
  if (read.shell.sw > read.shell.cw + 1) errors.push(`the shell overflows (${read.shell.sw} > ${read.shell.cw})`)
  const heights = one.map((r) => r.row.h / r.z)
  if (heights.length && Math.max(...heights) - Math.min(...heights) > 0.5) errors.push(`one-line rows ${Math.min(...heights).toFixed(2)} to ${Math.max(...heights).toFixed(2)} tall`)
  if (heights.length && !(Math.max(...heights) < tableRow - 1)) errors.push(`one-line rows ${Math.max(...heights).toFixed(2)} against Table's ${tableRow.toFixed(2)}`)
  return errors
}

/** The List read at a window `w` wide, and `title`'s row in it. */
async function rowAt(cdp, title, w) {
  await viewport(cdp, w)
  const all = await readList(cdp)
  return { all, r: all.rows.find((x) => x.rid === ridOf(title)) }
}
/** The widest window at which `title`'s row has crossed, found by halving between a window narrow enough to cross it and the natural one, which it answers when the row has crossed there already. */
async function thresholdOf(cdp, title, wrap, lo, hi) {
  const at = async (w) => (await rowAt(cdp, title, w)).r
  if (!crossed(wrap)(await at(lo))) return null
  if (crossed(wrap)(await at(hi))) return hi
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2)
    if (crossed(wrap)(await at(mid))) lo = mid
    else hi = mid
  }
  return lo
}

/** The Outlines rail on every band: whether it should draw (a band that isn't the tail and holds a row), its color and width against the outline tokens, where it stands against its head's chevron, its top and bottom against its head and its last drawn member, how that member ends the band, and how many bands down it sits. */
const RAILS = `[...document.querySelectorAll('.list-view .group-band')].filter((b) => b.getClientRects().length && !b.closest('[inert]')).map((b) => {
  const reveal = b.querySelector(':scope > [data-reveal]')
  const s = reveal && getComputedStyle(reveal, '::before')
  const head = b.querySelector(':scope > .group-band-row')
  const chevron = head?.querySelector('.row-chevron')?.getBoundingClientRect()
  const z = b.currentCSSZoom ?? 1
  const drawn = !!s && s.content !== 'none' && parseFloat(s.width) > 0 && parseFloat(s.height) > 0
  const rb = reveal?.getBoundingClientRect()
  const members = !!reveal && [...reveal.querySelectorAll('.data-row')].some((r) => r.getClientRects().length)
  const last = reveal && [...reveal.querySelectorAll('.data-row, .group-band-head')].filter((e) => e.getClientRects().length && e.getBoundingClientRect().height > 0).at(-1)
  const lastBand = last?.closest('.group-band')
  let levels = 0
  for (let e = lastBand; e && e !== b; e = e.parentElement.closest('.group-band')) levels++
  const token = reveal && (() => { const p = document.createElement('span'); p.style.background = 'var(--list-outline-color)'; reveal.appendChild(p); const c = getComputedStyle(p).backgroundColor; p.remove(); return { color: c, width: parseFloat(getComputedStyle(reveal).getPropertyValue('--list-outline-width')) } })()
  const ending = !last ? null : last.classList.contains('group-band-head') ? (lastBand.parentElement.closest('.group-band') === b ? 'a closed or empty band' : 'an open band ending on a closed band') : last.classList.contains('ghost-row') ? 'the ghost' : lastBand === b ? 'a row' : 'an open band ending on a row'
  return {
    label: head?.querySelector('.group-band-head')?.getAttribute('aria-label') ?? 'tail', tail: b.classList.contains('band-tail'), members, drawn, ending, levels,
    look: drawn && s.backgroundColor === token.color && Math.abs(parseFloat(s.width) - token.width) < 0.01,
    x: drawn ? rb.left + (parseFloat(s.left) + parseFloat(s.width) / 2) * z : null, chevron: chevron ? chevron.left + chevron.width / 2 : null,
    top: drawn ? rb.top + parseFloat(s.top) * z : null, bottom: drawn ? rb.bottom - parseFloat(s.bottom) * z : null,
    wantTop: head && reveal ? head.getBoundingClientRect().bottom + parseFloat(getComputedStyle(reveal).getPropertyValue('--list-outline-gap')) * z : null,
    wantBottom: last ? last.getBoundingClientRect().bottom - parseFloat(getComputedStyle(reveal).getPropertyValue('--list-outline-gap')) * z : null,
  }
})`
/** A drawn rail out of place: drawn where it shouldn't be or missing where it should, off its tokens or its chevron, or not spanning from its head's outline gap to its last member's. */
const railErrors = (rails, outlines) => rails.filter((b) => b.drawn !== (!!outlines && !b.tail && b.members) || (b.drawn && (!b.look || Math.abs(b.x - b.chevron) > 1.5 || Math.abs(b.top - b.wantTop) > 0.75 || Math.abs(b.bottom - b.wantBottom) > 0.75)))

const NARROW = 620
const WIDEST = 3000
/** The configurations a screenshot shows, and at which width: wrapped rows at several depths, values ahead of titles, property bands, and a tile. */
const CONFIG_SHOTS = { 2: ['g11-wrapped-depths', 'narrow'], 12: ['g11-values-before-titles', 'narrow'], 3: ['g11-property-bands', 'wide'], 9: ['g11-tile', 'wide'] }

async function configurations(cdp) {
  await listPages(cdp)
  await showView(cdp, tableView(vid('g11tablerow'), 'VL Table Row'))
  const tableRow = Math.min(...(await rowHeights(cdp)))
  const natural = await titleWidths(cdp)
  for (const [i, cfg] of CONFIGS.entries()) {
    const n = i + 1
    const [, grouping, pipe, surface, wrap, outlines, , scale] = cfg
    const name = configName(n, cfg)
    try {
      const view = configView(n, cfg)
      await viewport(cdp, null)
      await showOn(cdp, surface, view)
      if (pipe === 'search') await search(cdp, 'VL')
      await listPages(cdp)
      const wide = await readList(cdp)
      const titles = wide.rows.map((r) => titleOf(r.rid))
      const bands = Object.values(Object.groupBy(wide.rows, (r) => r.band)).map((rows) => rows.map((r) => titleOf(r.rid)))
      const descending = bands.every((t) => same(t, [...t].sort((a, b) => b.localeCompare(a))))
      const piped = pipe === 'filter' || pipe === 'search' ? titles.length > 0 && titles.every((t) => t.startsWith('VL')) : pipe === 'sort' ? titles.length > 0 && descending : titles.length > 0
      const structure = structureErrors(view, wide)
      decided('B-1 · B-2 · B-4 · B-9 · B-11 · D-2 · E-9 · F-1', `${name} — each row draws its title and values on their sides in order, barred, with its + last`, piped && structure.length === 0 && wide.rows.length > 0, show({ piped, titles, structure: structure.slice(0, 6) }))
      const widths = {}
      const rails = {}
      for (const [label, w] of [['wide', null], ['narrow', NARROW]]) {
        await viewport(cdp, w)
        widths[label] = geometryErrors(await readList(cdp), { natural, tableRow, wrap })
        rails[label] = await cdp.evaluate(RAILS)
        if (CONFIG_SHOTS[n]?.[1] === label) await shot(cdp, CONFIG_SHOTS[n][0])
      }
      const zoomed = surface === 'tile' || wide.rows.every((r) => near(r.z, scale, 0.01))
      decided('A-2 · B-12 · C-3 · H-2 · H-3', `${name} — at the view's Scale, wide and narrow, no row or shell overflows, one-line rows match and stand under Table's, titles hold their floor, values their cap, grips their first line`, zoomed && Object.values(widths).every((e) => e.length === 0), show({ zoomed, z: wide.rows[0]?.z, widths }))
      const thresholds = {}
      for (const title of [...LONG_ROWS, 'VL Crowded'].filter((t) => titles.includes(t))) {
        // A row crossed at the window's own width, the crowded row in a tile, is halved toward a window wider than the screen's.
        let w = await thresholdOf(cdp, title, wrap, NARROW, naturalSize.w)
        if (w === naturalSize.w) w = await thresholdOf(cdp, title, wrap, naturalSize.w, WIDEST)
        if (w === null) { thresholds[title] = 'never crossed'; continue }
        if (w === WIDEST) { thresholds[title] = `crossed at ${WIDEST}px`; continue }
        const above = await rowAt(cdp, title, w + 1)
        const below = await rowAt(cdp, title, w)
        const floor = Math.min(natural[ridOf(title)], above.all.tokens['--list-view-title-min']) * above.r.z
        const titleAt = (x) => titleWidth(x.r)
        const errors = [...geometryErrors(above.all, { natural, tableRow, wrap }), ...geometryErrors(below.all, { natural, tableRow, wrap })]
        const wraps = wrap && !!above.r.right
        if (Math.abs(titleAt(above) - floor) > 1.5) errors.push(`above: title ${titleAt(above).toFixed(1)}, floor ${floor.toFixed(1)}`)
        const gap = above.r.right && above.r.right.box.l - above.r.left.box.r
        if (above.r.right && !near(gap, above.all.tokens['--list-view-wrap-gap'] * above.r.z, 1.5)) errors.push(`above: the groups ${gap.toFixed(1)} apart, not the wrap gap`)
        if (wraps && !(wrapped(below.r) && (titleAt(below) > floor + 1.5 || near(titleAt(below), natural[ridOf(title)] * below.r.z, 0.75)))) errors.push(`below: wrapped ${wrapped(below.r)}, title ${titleAt(below).toFixed(1)} past its floor ${floor.toFixed(1)} or at its own width`)
        if (!wraps && !(scrolls(below.r) && Math.abs(titleAt(below) - floor) <= 1.5)) errors.push(`below: scrolls ${scrolls(below.r)}, title ${titleAt(below).toFixed(1)}, floor ${floor.toFixed(1)}`)
        thresholds[title] = { at: w, depth: below.r.depth, wraps, errors }
      }
      decided('H-1 · H-2', `${name} — each long-titled row and the crowded row, a pixel above its wrap or scroll point, holds one line with its title at its floor, and a pixel below it ${wrap ? 'drops its right group to a second line with its title regaining its room up to its own width, or, holding no right group, scrolls its left group' : 'scrolls its left group'} with its title at its floor, its groups the wrap gap apart above it`, Object.keys(thresholds).length > 0 && Object.values(thresholds).every((x) => typeof x === 'object' && x.errors.length === 0), show(thresholds))
      await viewport(cdp, null)
      const railsOff = Object.fromEntries(Object.entries(rails).map(([k, r]) => [k, railErrors(r, outlines)]))
      decided('G-1 · G-2', `${name} — ${outlines ? 'wide and narrow, a rail at each band\'s chevron from its head\'s outline gap to its last member\'s, and none on the tail or on an empty band' : 'no rail on any band'}`, rails.wide.length > 0 && (!outlines || grouping === 'flat' || rails.wide.some((b) => b.drawn)) && Object.values(railsOff).every((e) => e.length === 0), show({ railsOff, endings: rails.wide.filter((b) => b.drawn).map((b) => b.ending) }))
      if (pipe === 'sort') {
        const listOrder = (await readList(cdp)).rows.map((r) => r.rid)
        await showOn(cdp, surface, { ...view, id: vid(`g11c${n}table`), name: `VL Config ${n} Table`, type: 'table' })
        const tableOrder = await cdp.evaluate(`${ROWS}.filter((r) => r.getClientRects().length && !r.closest('[inert], .list-view')).map((r) => r.dataset.rid)`)
        decided('A-2', `${name} — the sort orders the List's rows band by band as it orders a Table's of the same view`, listOrder.length > 0 && same(listOrder, tableOrder), show({ list: listOrder.map(titleOf), table: tableOrder.map(titleOf) }))
      }
      if (pipe === 'search') await search(cdp, '')
    } catch (e) {
      decided('—', `${name} ran to its end`, false, String(e?.stack ?? e).slice(0, 800))
      await closeAll(cdp).catch(() => {})
    }
  }
  await viewport(cdp, null)
}

// ── Group 11 · a row's contents ─────────────────────────────────────────────

const EVERY_ORDER = [...LIST_ORDER, TOPICS.id, PROJECTS.id, ...Object.keys(STAMPS)]
const flatVL = { group: { kind: 'flat' }, ...PIPES.filter }
const itemKinds = (g) => g?.parts.filter((p) => p.kind !== 'bar').map((p) => p.kind) ?? []
const rowIn = (read, title) => read.rows.find((r) => r.rid === ridOf(title))
/** A drawn value's box and its innermost labelled elements' classes, found on a List row by the side and place its column takes. */
const listSeat = (view, title, id) => {
  const want = expectedSides(view, listPages.cache.get(ridOf(title)))
  const side = want.left.includes(id) ? 'left' : 'right'
  return `[...(${listRow(title)}).querySelector('.list-view-line > .list-view-group${side === 'right' ? '.list-view-right' : ':not(.list-view-right)'}').children].filter((c) => c.matches('.list-view-title, .value-seat'))[${want[side].indexOf(id)}]`
}
/** The value a standard card draws in the property row its column's label heads. */
const cardSeat = (title, label) => `[...(${card(ridOf(title))}).querySelectorAll('.card-prop-row')].find((r) => r.querySelector('.card-prop-label')?.textContent.trim() === ${JSON.stringify(label)})?.querySelector('.value-seat')`
/** The computed weight of the text an element draws, and the theme's emphasized weight. */
const weightOf = (expr) => `(() => { const e = (${expr}); return e ? getComputedStyle(e).fontWeight : null })()`
const EMPHASIZED = `getComputedStyle(document.documentElement).getPropertyValue('--weight-emphasized').trim()`
const cardTitleText = (title) => `[...(${card(ridOf(title))}).querySelectorAll('span')].find((e) => !e.children.length && e.textContent.trim() === ${JSON.stringify(title)})`
const leafClasses = (expr) => `[...(${expr}).querySelectorAll('*')].filter((e) => !e.children.length && e.textContent.trim() && e.getClientRects().length).map((e) => e.className).join(' | ')`

async function contents(cdp) {
  const V = listView(vid('g11contents'), 'VL Contents', { ...flatVL, hidden_properties: [DONE.id] })
  await showOn(cdp, 'collection', V)
  await listPages(cdp)
  let read = await readList(cdp)
  const [bare, left, right, both] = ['VL Bare', 'VL Left', 'VL Right', 'VL Both'].map((t) => rowIn(read, t))
  decided('B-4 · B-7', 'a row holding nothing the view shows draws its title alone, its + after the title', same(itemKinds(bare.left), ['title']) && !bare.right && bare.last === 'add' && bare.add.box.l >= bare.left.box.r - 0.5, show(bare))
  decided('B-7', 'a row holding left values only draws no right group, its + after its last left value', itemKinds(left.left).length === 4 && !left.right && left.last === 'add' && left.add.box.l >= left.left.box.r - 0.5, show(left))
  decided('B-1 · B-6', 'a row holding right values only draws its title alone on the left and its values flush right, the + after them', same(itemKinds(right.left), ['title']) && itemKinds(right.right).length === 3 && Math.abs(right.right.box.r - right.lineEnd) <= 1 && right.add.box.l >= right.right.box.r - 0.5, show(right))
  decided('B-1', 'a row holding both draws its title and Stage on the left and its Date and Link flush right', itemKinds(both.left).length === 2 && itemKinds(both.right).length === 2 && Math.abs(both.right.box.r - both.lineEnd) <= 1, show(both))
  const weights = { title: await cdp.evaluate(weightOf(`(${listRow('VL Both')}).querySelector('.cell-title-text')`)), value: await cdp.evaluate(weightOf(`(${listRow('VL Both')}).querySelector('.value-seat')`)) }
  weights.token = await cdp.evaluate(EMPHASIZED)
  // Each title's own width, read where nothing shares its row.
  const natural = Object.fromEntries(Object.entries(await titleWidths(cdp)).map(([rid, w]) => [titleOf(rid), w]))
  await showOn(cdp, 'collection', V)
  await viewport(cdp, NARROW)
  const narrow = await readList(cdp)
  const titleAt = (t) => titleWidth(rowIn(narrow, t))
  const floorRead = { min: narrow.tokens['--list-view-title-min'] * rowIn(narrow, `VL One ${LONG}`).z, long: titleAt(`VL One ${LONG}`), short: titleAt('VL Both'), shortNatural: natural['VL Both'], longNatural: natural[`VL One ${LONG}`] }
  await viewport(cdp, null)
  decided('H-2', 'in the emphasized title weight, a long title at a narrow window stops at exactly the view\'s title minimum of text, and a short one keeps exactly its own width', floorRead.longNatural > floorRead.min && near(floorRead.long, floorRead.min, 0.5) && floorRead.shortNatural < floorRead.min && near(floorRead.short, floorRead.shortNatural, 0.5), show(floorRead))
  await showView(cdp, cardsView(vid('g11weightcards'), 'VL Weight Cards', { ...flatVL, property_order: LIST_ORDER }))
  weights.card = await cdp.evaluate(weightOf(cardTitleText('VL Both')))
  decided('B-16', 'a List title draws in the emphasized weight a card title draws in, and its values in another', !!weights.title && weights.title === weights.token && weights.title === weights.card && weights.value !== weights.title, show(weights))
  await showOn(cdp, 'collection', V)
  read = await readList(cdp)
  const crowded = rowIn(read, 'VL Crowded')
  const crowdedTitle = titleWidth(crowded)
  const fades = await cdp.evaluate(`[...(${listRow('VL Crowded')}).querySelectorAll('.list-view-group')].map((g) => parseFloat(getComputedStyle(g).getPropertyValue('--scroll-fade-trail')) || 0)`)
  const plainFade = await cdp.evaluate(`parseFloat(getComputedStyle((${listRow('VL Both')}).querySelector('.list-view-group')).getPropertyValue('--scroll-fade-trail')) || 0`)
  decided('H-2', 'a crowded row past its width with Wrap Rows off keeps one line, its left group scrolling under its fade with its title at its floor, nothing overflowing', !wrapped(crowded) && scrolls(crowded) && near(crowdedTitle, Math.min(natural['VL Crowded'], read.tokens['--list-view-title-min'] * crowded.z), 0.75) && fades[0] > 0 && plainFade === 0 && crowded.rowSW <= crowded.rowCW + 1, show({ crowdedTitle, natural: natural['VL Crowded'], fades, plainFade, left: [crowded.left.sw, crowded.left.cw] }))
  decided('H-2', 'the same crowded row\'s right group shrinks with its left and scrolls too (stated)', crowded.right.sw > crowded.right.cw + 1 && fades[1] > 0, show({ right: [crowded.right.sw, crowded.right.cw], fades }))
  await showOn(cdp, 'collection', { ...V, id: vid('g11contentswrap'), name: 'VL Contents Wrap', wrap_rows: true })
  read = await readList(cdp)
  const crowdedWrap = rowIn(read, 'VL Crowded')
  decided('H-2', 'a crowded row past its width with Wrap Rows on drops its right group to a second line', wrapped(crowdedWrap) && crowdedWrap.rowSW <= crowdedWrap.rowCW + 1, show(crowdedWrap))

  // Every type, its blank, and each drawn as its Table cell draws it.
  const EVERY = listView(vid('g11every'), 'VL Every', { ...flatVL, property_order: EVERY_ORDER })
  await showOn(cdp, 'collection', EVERY)
  read = await readList(cdp)
  await shot(cdp, 'g11-every-type')
  const full = rowIn(read, 'VL Full')
  const fullErrors = structureErrors(EVERY, { ...read, rows: [full] })
  decided('B-1 · C-1 · D-2', 'a row holding a value of every type draws each, on its type\'s side, showing what its page holds', itemKinds(full.left).length + itemKinds(full.right).length === EVERY_ORDER.length && fullErrors.length === 0, show({ fullErrors, left: itemKinds(full.left), right: itemKinds(full.right) }))
  const bareEvery = rowIn(read, 'VL Bare')
  decided('B-4', 'a row holding no value draws no blank of any type but its unchecked checkbox and the two stamps', same(itemKinds(bareEvery.left), ['title']) && itemKinds(bareEvery.right).length === 3 && bareEvery.right.parts[0].check && !bareEvery.right.parts[0].checked && structureErrors(EVERY, { ...read, rows: [bareEvery] }).length === 0, show(bareEvery))
  const checks = ['VL Right', 'VL Crowded', 'VL Both'].map((t) => rowIn(read, t).right.parts.find((p) => p.check))
  decided('B-4', 'a checked and an unchecked checkbox each draw in their state', checks[0]?.checked && checks[1]?.checked && checks[2] && !checks[2].checked, show(checks))
  const listTexts = await cdp.evaluate(`[${EVERY_ORDER.slice(1).map((id) => `(${listSeat(EVERY, 'VL Full', id)})?.textContent.trim()`).join(', ')}]`)
  const meterBar = await cdp.evaluate(`(() => { const e = (${listSeat(EVERY, 'VL Full', METER.id)}); return { w: e.getBoundingClientRect().width / (e.currentCSSZoom ?? 1), token: parseFloat(getComputedStyle(e).getPropertyValue('--list-view-bar-width')), bar: !!e.querySelector('.cell-bar') } })()`)
  const linkLooks = await cdp.evaluate(`({ resolved: ${leafClasses(listSeat(EVERY, 'VL Both', SITE.id))}, unresolved: ${leafClasses(listSeat(EVERY, 'VL Crowded', SITE.id))} })`)
  const noteSeat = listSeat(EVERY, 'VL Crowded', NOTE.id)
  /** A capped value as drawn: its width against the view's maximum, the part of it cut, how that part ends, whether a fade masks it, the pen, and every item's box on the row. */
  const capRead = (seat) => `(() => { const e = (${seat}); const t = [...e.querySelectorAll('*')].find((x) => x.scrollWidth > x.clientWidth + 1); return { w: e.getBoundingClientRect().width / (e.currentCSSZoom ?? 1), max: parseFloat(getComputedStyle(e).getPropertyValue('--list-view-value-max')), cut: !!t, ellipsis: t ? getComputedStyle(t).textOverflow : null, fade: !!t && [t, ...e.querySelectorAll('*')].some((x) => x.contains(t) && getComputedStyle(x).maskImage !== 'none'), pen: !!e.querySelector('.cell-pen'), boxes: [...(${listRow('VL Crowded')}).querySelectorAll('.value-seat, .list-view-title')].map((x) => { const b = x.getBoundingClientRect(); return [Math.round(b.left * 10) / 10, Math.round(b.width * 10) / 10] }) } })()`
  const noteRead = capRead(noteSeat)
  const atRest = await cdp.evaluate(noteRead)
  await hover(cdp, noteSeat, 700)
  const hovered = await cdp.evaluate(noteRead)
  await away(cdp)
  decided('C-3', 'a long Text value stops at the view\'s value maximum, cut in an ellipsis under its fade, its first line with the pen beside it', near(atRest.w, atRest.max, 0.5) && atRest.cut && atRest.ellipsis === 'ellipsis' && atRest.fade && atRest.pen, show(atRest))
  decided('C-3', 'hovering a Text value grows nothing and moves no neighbor', same(atRest.boxes, hovered.boxes), show({ atRest: atRest.boxes, hovered: hovered.boxes }))
  const linkCap = await cdp.evaluate(capRead(listSeat(EVERY, 'VL Crowded', SITE.id)))
  const tagsCap = await cdp.evaluate(capRead(listSeat(EVERY, 'VL Crowded', TAGS.id)))
  decided('C-3', 'a long Link value stops at the maximum a Text value shares, cut in an ellipsis under its fade, and a Multi-Select holding more than fits stops at the same cap under its fade, spilling past it nowhere', near(linkCap.w, atRest.max, 0.5) && linkCap.cut && linkCap.ellipsis === 'ellipsis' && linkCap.fade && near(tagsCap.w, tagsCap.max, 0.5) && tagsCap.cut && tagsCap.fade, show({ linkCap, tagsCap }))
  decided('C-3', 'a Number in its bar look draws a bar the view\'s bar width wide', meterBar.bar && near(meterBar.w, meterBar.token, 0.5), show(meterBar))
  const scrolled = `(() => { const e = (${noteSeat}); return { group: e.closest('.list-view-group').scrollLeft, value: [...e.querySelectorAll('*')].find((x) => x.scrollWidth > x.clientWidth + 1)?.scrollLeft ?? 0 } })()`
  // The wheel reaches a cap only while the pointer is over it, so each turn is delivered where the pointer rests.
  const at = await boxOf(cdp, noteSeat)
  await away(cdp, at)
  const turn = async (deltaX, deltaY) => {
    await wheel(cdp, at, deltaX, deltaY)
    return cdp.evaluate(scrolled)
  }
  const rest = await cdp.evaluate(scrolled)
  const mouse = await turn(0, 120)
  const pad = await turn(120, 0)
  decided('H-2 · C-3', 'a mouse wheel over a capped value on a crowded row scrolls neither the value nor its group, where a sideways trackpad scroll moves the group and not the value (stated)', same(mouse, rest) && pad.group > rest.group && pad.value === rest.value, show({ rest, mouse, pad }))
  await shot(cdp, 'g11-crowded-scrolled')
  // The wheel's two reaches: over a bar of the crowded row's left group it scrolls the group; over the same capped value on a row whose lane fits, the value.
  await showOn(cdp, 'collection', V)
  const leftBar = await cdp.evaluate(`(() => { const b = (${listRow('VL Crowded')}).querySelector('.list-view-group > [aria-hidden="true"]').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 } })()`)
  await away(cdp, leftBar)
  await wheel(cdp, leftBar, 0, 120, 300)
  // The pointer moves a pixel inside the scrolled lane, onto whatever value now sits there, the hand-over the outer lane must survive.
  const nudged = { x: leftBar.x + 1, y: leftBar.y }
  await away(cdp, nudged)
  await sleep(500)
  const groupLeft = () => cdp.evaluate(`(${listRow('VL Crowded')}).querySelector('.list-view-group').scrollLeft`)
  const groupScroll = { onCap: await cdp.evaluate(`(() => { const g = (${listRow('VL Crowded')}).querySelector('.list-view-group'); const cap = document.elementFromPoint(${nudged.x}, ${nudged.y})?.closest('.over-scroll-cap'); return !!cap && cap !== g && g.contains(cap) })()`), inside: await groupLeft() }
  await away(cdp)
  await sleep(800)
  groupScroll.left = await groupLeft()
  // Scrolled again, VD Stage's pane pressed open from the part of its value the group still shows, and an option picked, the pointer resting where the pane was.
  await away(cdp, leftBar)
  await wheel(cdp, leftBar, 0, 120, 300)
  const stageAt = await cdp.evaluate(`(() => { const s = (${listSeat(V, 'VL Crowded', STAGE.id)}).getBoundingClientRect(); const g = (${listRow('VL Crowded')}).querySelector('.list-view-group').getBoundingClientRect(); return { x: (Math.max(s.left, g.left) + Math.min(s.right, g.right)) / 2, y: s.top + s.height / 2 } })()`)
  await mouseAt(cdp, stageAt)
  await until('VD Stage\'s options', async () => cdp.evaluate(`!!${portalRow('Doing')}`), 3000)
  groupScroll.open = await groupLeft()
  await mouseClick(cdp, portalRow('Doing'))
  await sleep(800)
  groupScroll.picked = await groupLeft()
  groupScroll.offRow = !(await cdp.evaluate(`(() => { const p = document.querySelector(':hover:not(:has(:hover))'); return !!p && (${listRow('VL Crowded')}).contains(p) })()`))
  await mutate(cdp, { op: 'setProperty', path: listPages.cache.get(ridOf('VL Crowded')).path, propertyId: STAGE.id, value: { kind: 'select', value: 'opt_vd_todo' } })
  const LANE = listView(vid('g11wheellane'), 'VL Wheel Lane', { ...flatVL, property_order: ['_title', NOTE.id] })
  await showOn(cdp, 'collection', LANE)
  const laneNote = listSeat(LANE, 'VL Crowded', NOTE.id)
  const laneAt = await boxOf(cdp, laneNote)
  await away(cdp, laneAt)
  const laneScrolled = `(() => { const e = (${laneNote}); const g = e.closest('.list-view-group'); return { fits: g.scrollWidth <= g.clientWidth + 1, value: [...e.querySelectorAll('*')].find((x) => x.scrollWidth > x.clientWidth + 1)?.scrollLeft ?? null } })()`
  const laneRest = await cdp.evaluate(laneScrolled)
  await wheel(cdp, laneAt, 0, 120)
  const laneWheeled = await cdp.evaluate(laneScrolled)
  await away(cdp)
  decided('H-2', 'a mouse wheel over a bar of a crowded row\'s left group scrolls the group, which stays scrolled while the pointer is inside it, a value now under it included, and returns to its start once the pointer leaves the row, or once a value\'s pane opened from it closes on a pick with the pointer off the row', groupScroll.onCap && groupScroll.inside > 0 && groupScroll.left === 0 && groupScroll.open > 0 && groupScroll.offRow && groupScroll.picked === 0, show({ groupScroll }))
  decided('C-3', 'a mouse wheel over a capped value on a row whose lane fits scrolls the value', laneRest.fits && laneRest.value === 0 && laneWheeled.value > 0, show({ laneRest, laneWheeled }))

  await showOn(cdp, 'collection', { ...EVERY, id: vid('g11everyplain'), name: 'VL Every Plain', column_styles: {} })
  const plainMeter = await cdp.evaluate(`(${listSeat(EVERY, 'VL Full', METER.id)})?.textContent.trim()`)
  decided('C-1', 'the same Number in its plain look draws its digits', plainMeter === '30%', show(plainMeter))
  const T = tableView(vid('g11everytable'), 'VL Every Table', { ...flatVL, property_order: EVERY_ORDER, column_styles: EVERY.column_styles })
  await showView(cdp, T)
  const tableTexts = await cdp.evaluate(`[...(${tableRowOf('VL Full')}).querySelectorAll('.data-cell')].slice(1).map((c) => c.textContent.trim())`)
  const tableLinks = await cdp.evaluate(`({ resolved: ${leafClasses(`(${tableRowOf('VL Both')}).querySelectorAll('.data-cell')[${EVERY_ORDER.indexOf(SITE.id)}]`)}, unresolved: ${leafClasses(`(${tableRowOf('VL Crowded')}).querySelectorAll('.data-cell')[${EVERY_ORDER.indexOf(SITE.id)}]`)} })`)
  decided('C-1', 'each type\'s value draws the text its Table cell draws', same(listTexts, tableTexts), show({ ids: EVERY_ORDER.slice(1), listTexts, tableTexts }))
  decided('C-1', 'a Link that resolves and one that doesn\'t each draw as their Table cells draw them, and differently from each other', !!linkLooks.resolved && linkLooks.resolved !== linkLooks.unresolved && same(linkLooks, tableLinks), show({ linkLooks, tableLinks }))
}

// ── Group 11 · a row's gestures ─────────────────────────────────────────────

/** What a press left behind: the panes up and what the top one holds, a field taking keys outside them, the TextPane, and the active tab. */
const RESPONSE = `(() => {
  const panes = [...document.querySelectorAll('${PANE_LAYER}')].filter((p) => p.getClientRects().length && p.textContent.trim())
  const top = panes.at(-1)
  const a = document.activeElement
  return {
    panes: panes.length,
    pane: top ? { field: !!top.querySelector('input, .cm-editor'), calendar: !!top.querySelector('[aria-label="Next month"]'), rows: top.querySelectorAll('[role=button]').length > 0 } : null,
    field: !!a && a !== document.body && (a.tagName === 'INPUT' || !!a.closest('.cm-editor')) && !a.closest('${PANE_LAYER}'),
    textPane: !!document.querySelector('.text-pane'),
    tab: document.querySelector('[role=tab][aria-selected=true]')?.getAttribute('title') ?? null,
  }
})()`
/** An element brought into its scrolling group's view, answering the point a press on its middle lands at, and whether the element drawn there is it. */
async function aim(cdp, expr) {
  await cdp.evaluate(`(${expr}).scrollIntoView({ block: 'nearest', inline: 'nearest' })`)
  await sleep(250)
  const at = await boxOf(cdp, expr)
  return { ...at, hit: await cdp.evaluate(`(${expr}).contains(document.elementFromPoint(${at.x}, ${at.y}))`) }
}
/** A press at `at`, or on the element `at` names, and what it left behind, a native menu or file dialog it raised included, each closed again. */
async function pressReads(cdp, at) {
  const point = typeof at === 'string' ? await aim(cdp, at) : at
  const [seq, dialogs] = [await inMain('__drive.seq'), await inMain('__drive.dialogs')]
  await mouseAt(cdp, point, { settle: 800 })
  const read = { ...(await cdp.evaluate(RESPONSE)), menu: (await inMain('__drive.seq')) > seq, dialog: (await inMain('__drive.dialogs')) > dialogs, ...(point.hit === false && { missed: true }) }
  if (read.menu) await pickNative([])
  await escapeAll(cdp)
  await pressKey(cdp, 'Escape')
  await sleep(300)
  return read
}
const quiet = (r, tab) => !r.missed && r.panes === 0 && !r.field && !r.textPane && !r.menu && !r.dialog && r.tab === tab

async function gestures(cdp) {
  const V = listView(vid('g11gestures'), 'VL Gestures', { ...flatVL, property_order: EVERY_ORDER, wrap_rows: true })
  await showOn(cdp, 'collection', V)
  await listPages(cdp)
  const back = () => showOn(cdp, 'collection', V)

  // B-3 · the title alone opens the page: its text and its icon, with Title Icons on and off, and in a tile.
  const opens = async (expr, title, reshow) => {
    const at = await aim(cdp, expr)
    await mouseAt(cdp, at, { settle: 300 })
    const ok = await settles(async () => (await activeTab(cdp)) === title, 4000)
    const tab = await activeTab(cdp)
    const tabs = await tabTitles(cdp)
    await reshow()
    return { ok, tab, tabs, hit: at.hit }
  }
  const byText = await opens(`(${listRow('VL Both')}).querySelector('.cell-title-text')`, 'VL Both', back)
  const byIcon = await opens(`(${listRow('VL Both')}).querySelector('.cell-title > svg')`, 'VL Both', back)
  const NOICONS = { ...V, id: vid('g11gesturesnoicon'), name: 'VL Gestures No Icons', hide_page_icons: true }
  await showOn(cdp, 'collection', NOICONS)
  const iconless = await opens(`(${listRow('VL Both')}).querySelector('.cell-title-text')`, 'VL Both', back)
  decided('B-3', 'a List title\'s press opens its page, on its text and on its icon, and with Title Icons off', byText.ok && byIcon.ok && iconless.ok, show({ byText, byIcon, iconless }))
  await showOn(cdp, 'tile', { ...V, id: vid('g11gesturestile'), name: 'VL Gestures Tile' })
  const fromTile = await opens(`(${listRow('VL Both')}).querySelector('.cell-title-text')`, 'VL Both', back)
  decided('B-3', 'a List title\'s press in a View Tile opens its page', fromTile.ok, show(fromTile))

  // B-3 · the row's empty stretch and a stamp do nothing on a press, on one line and on a wrapped row's second.
  await back()
  const stamp = await pressReads(cdp, listSeat(V, 'VL Both', '_created_at'))
  decided('B-3', 'a press on a Created value opens nothing', quiet(stamp, COLLECTION), show(stamp))
  const STRETCH = { ...V, id: vid('g11stretch'), name: 'VL Stretch', property_order: LIST_ORDER }
  await showOn(cdp, 'collection', STRETCH)
  const one = rowIn(await readList(cdp), 'VL Both')
  const stretch = { x: (one.left.box.r + one.right.box.l) / 2, y: one.left.box.cy }
  const presses = { stretch: await pressReads(cdp, stretch) }
  const stretchMenu = labels(await popNative(cdp, stretch))
  await pickNative([])
  await viewport(cdp, NARROW)
  const two = rowIn(await readList(cdp), 'VL Both')
  const second = { x: (two.line.l + two.right.box.l) / 2, y: two.right.box.cy }
  const room = wrapped(two) && two.right.box.l - two.line.l > 20
  presses.second = room ? await pressReads(cdp, second) : show(two)
  const secondMenu = room ? labels(await popNative(cdp, second)) : []
  await pickNative([])
  await viewport(cdp, null)
  decided('B-3', 'a press on a List row\'s empty stretch opens nothing, on its one line and on a wrapped row\'s second', quiet(presses.stretch, COLLECTION) && room && quiet(presses.second, COLLECTION), show(presses))

  // The page menu from the stretch, as a Table title's.
  await showView(cdp, tableView(vid('g11gesturestable'), 'VL Gestures Table', flatVL))
  const tableMenu = labels(await popNative(cdp, await boxOf(cdp, `(${tableRowOf('VL Both')}).querySelector('.cell-title-text')`)))
  await pickNative([])
  decided('B-3 · A-2', 'a right-click on a List row\'s empty stretch, on one line and on a wrapped second, pops the page menu a Table title pops', tableMenu.includes('Rename') && same(stretchMenu, tableMenu) && same(secondMenu, tableMenu), show({ stretchMenu, secondMenu, tableMenu }))

  // The page menu's Rename renames the page from a List row.
  await back()
  const left = rowIn(await readList(cdp), 'VL Left')
  await popNative(cdp, { x: left.left.box.r + 20, y: left.left.box.cy })
  await pickNative(['Rename'])
  const field = await settles(async () => cdp.evaluate(`document.activeElement?.tagName === 'INPUT' && !!document.activeElement.closest('.list-view')`), 3000)
  const renameWeight = { list: await cdp.evaluate(weightOf('document.activeElement')) }
  if (field) {
    await cdp.evaluate('document.activeElement.select()')
    await typeText(cdp, 'VL Left Renamed')
    await pressKey(cdp, 'Enter')
  }
  const renamed = await settles(async () => [...(await listPages(cdp)).values()].some((p) => p.title === 'VL Left Renamed'))
  const drawn = await cdp.evaluate(`(${listRow('VL Left Renamed')})?.querySelector('.cell-title-text')?.textContent ?? null`)
  decided('B-3 · A-2', 'the page menu\'s Rename from a List row renames its page', field && renamed && drawn === 'VL Left Renamed', show({ field, renamed, drawn }))
  const path = [...listPages.cache.values()].find((p) => p.title === 'VL Left Renamed')?.path
  if (path) await mutate(cdp, { op: 'rename', path, kind: 'page', newName: 'VL Left' })
  await until('VL Left back', async () => [...(await listPages(cdp)).values()].some((p) => p.title === 'VL Left'))
  await showView(cdp, cardsView(vid('g11renamecards'), 'VL Rename Cards', { ...flatVL, property_order: LIST_ORDER }))
  await popNative(cdp, await boxOf(cdp, cardTitleText('VL Left')))
  await pickNative(['Rename'])
  await settles(async () => cdp.evaluate(`document.activeElement?.tagName === 'INPUT' && !!document.activeElement.closest('.cards-view')`), 3000)
  renameWeight.card = await cdp.evaluate(weightOf('document.activeElement'))
  await pressKey(cdp, 'Escape')
  renameWeight.token = await cdp.evaluate(EMPHASIZED)
  decided('B-16', 'a List title\'s rename field draws in the emphasized weight a card title\'s rename field does', !!renameWeight.list && renameWeight.list === renameWeight.token && renameWeight.list === renameWeight.card, show(renameWeight))

  // A-4 · a press on a value carried down across the next rows sweeps nothing on a List, where the same press on a Table's cell sweeps its column.
  const sweep = async (cellOf) => {
    const a = await boxOf(cdp, cellOf('VL Left'))
    const b = await boxOf(cdp, cellOf('VL Crowded'))
    let swept
    await dragPoints(cdp, a, { x: a.x, y: b.y }, { steps: 10, held: async () => { await sleep(300); swept = await cdp.evaluate(`document.querySelectorAll('.cell-sweep').length`); await pressKey(cdp, 'Escape') }, settle: 500 })
    await escapeAll(cdp)
    return swept
  }
  const SWEEP = listView(vid('g11sweep'), 'VL Sweep', { ...flatVL, property_order: LIST_ORDER })
  await showOn(cdp, 'collection', SWEEP)
  const onList = await sweep((t) => listSeat(SWEEP, t, TAGS.id))
  await showView(cdp, tableView(vid('g11sweept'), 'VL Sweep Table', { ...flatVL, property_order: LIST_ORDER }))
  const onTable = await sweep((t) => `(${tableRowOf(t)}).querySelectorAll('.data-cell')[${LIST_ORDER.indexOf(TAGS.id)}]`)
  decided('A-4', 'a press on a List value carried across the rows below sweeps no cells, where a Table cell\'s sweeps its column', onList === 0 && onTable > 1, show({ onList, onTable }))
}

// ── Group 11 · values ───────────────────────────────────────────────────────

/** What a press on each type's value opens, by the response a press leaves behind; a checkbox's toggle is read from the page. */
const PRESS = {
  select: (r) => !!r.pane?.rows, multiSelect: (r) => !!r.pane?.rows, status: (r) => !!r.pane?.rows, context: (r) => !!r.pane?.rows,
  dateTime: (r) => !!r.pane?.calendar, number: (r) => r.field, bar: (r) => !!r.pane?.field, text: (r) => r.field || r.textPane,
  checkbox: (r) => r.toggled === true, link: (r) => r.tab === 'Page B', file: (r) => r.dialog, createdTime: (r) => quiet(r, COLLECTION), lastEditedTime: (r) => quiet(r, COLLECTION),
}
/** The rows each type's right-click names, as C-1, C-2, and C-4 do: its Style or Format, its Clear where it can be emptied, and its Remove (a File's reads Remove from View, beside its own Remove File). */
const MENU = {
  select: ['Style', 'Clear', 'Remove'], multiSelect: ['Style', 'Clear', 'Remove'], status: ['Style', 'Clear', 'Remove'], context: ['Clear', 'Remove'],
  dateTime: ['Format', 'Clear', 'Remove'], number: ['Remove'], bar: ['Style', 'Remove'], text: ['Clear', 'Remove'], checkbox: ['Style', 'Remove'],
  link: ['Format', 'Clear', 'Remove'], file: ['Remove from View'], createdTime: ['Format', 'Remove'], lastEditedTime: ['Format', 'Remove'],
}

async function values(cdp) {
  const V = listView(vid('g11values'), 'VL Values', { ...flatVL, property_order: EVERY_ORDER })
  const C = cardsView(vid('g11valuecards'), 'VL Value Cards', { ...flatVL, property_order: EVERY_ORDER, column_styles: V.column_styles })
  const ids = EVERY_ORDER.slice(1)
  const pass = async (view, seatOf) => {
    await showOn(cdp, 'collection', view)
    await listPages(cdp)
    const out = {}
    for (const id of ids) {
      // Pressed on its first drawn text, the press counting as landed while the element drawn there is the value's.
      const point = await aim(cdp, `(() => { const e = (${seatOf(id)}); return [...e.querySelectorAll('*')].find((x) => !x.children.length && x.textContent.trim() && x.getClientRects().length) ?? e })()`)
      out[id] = { click: await pressReads(cdp, { ...point, hit: await cdp.evaluate(`(${seatOf(id)}).contains(document.elementFromPoint(${point.x}, ${point.y}))`) }) }
      if (out[id].click.tab !== COLLECTION) await showOn(cdp, 'collection', view)
      if (TYPE_OF[id] === 'checkbox') {
        out[id].click.toggled = await settles(async () => frontOf(listPages.cache.get(ridOf('VL Full')).path)[DONE.key] !== true, 2000)
        await mutate(cdp, { op: 'setProperty', path: listPages.cache.get(ridOf('VL Full')).path, propertyId: id, value: { kind: 'checkbox', value: true } })
      }
      const rows = await popNative(cdp, await aim(cdp, seatOf(id)))
      out[id].menu = labels(rows)
      await pickNative([])
      await sleep(300)
    }
    return out
  }
  const list = await pass(V, (id) => listSeat(V, 'VL Full', id))
  const cards = await pass(C, (id) => cardSeat('VL Full', LABEL_OF[id]))
  const clicks = ids.filter((id) => !same(list[id].click, cards[id].click))
  const menus = ids.filter((id) => !same(list[id].menu, cards[id].menu))
  const kindOf = (id) => (id === METER.id ? 'bar' : TYPE_OF[id])
  const answered = Object.fromEntries(ids.map((id) => [LABEL_OF[id], !list[id].click.missed && PRESS[kindOf(id)](list[id].click)]))
  const named = Object.fromEntries(ids.map((id) => [LABEL_OF[id], MENU[kindOf(id)].every((l) => list[id].menu.includes(l))]))
  decided('C-1 · B-3', 'each type\'s value on a List row answers a press as the decisions name it, as the same value on a card does: options for a choice or a Context, the calendar for a date, a field for a number or a Text, the toggle for a checkbox, its page for a Link, the file dialog for a File, and nothing for a Created or a Modified', clicks.length === 0 && Object.values(answered).every(Boolean), show({ clicks, answered, list: Object.fromEntries(ids.map((id) => [LABEL_OF[id], list[id].click])) }))
  decided('C-1 · C-2 · C-4', 'each type\'s value on a List row pops the right-click menu the same value pops on a card, holding its Style or Format where its type has one, its Clear where it can be emptied, and its Remove', menus.length === 0 && Object.values(named).every(Boolean), show({ menus, named, list: Object.fromEntries(ids.map((id) => [LABEL_OF[id], list[id].menu])) }))

  // C-1 · a Select's pane, pressed open on a List value, picks an option into the page.
  await showOn(cdp, 'collection', V)
  await pressIn(cdp, listSeat(V, 'VL Full', STAGE.id))
  await until('VD Stage\'s options', async () => cdp.evaluate(`!!${portalRow('Todo')}`), 3000)
  await mouseClick(cdp, portalRow('Todo'))
  const picked = await settles(async () => reads(valueOf('VL Full', STAGE), 'Todo'))
  await closeAll(cdp)
  const pickedDrawn = await cdp.evaluate(`(${listSeat(V, 'VL Full', STAGE.id)})?.textContent ?? ''`)
  await mutate(cdp, { op: 'setProperty', path: listPages.cache.get(ridOf('VL Full')).path, propertyId: STAGE.id, value: { kind: 'select', value: 'opt_vd_done' } })
  decided('C-1', 'Todo picked from VL Full\'s VD Stage pane writes it to the page and the row draws it', picked && /Todo/.test(pickedDrawn), show({ value: frontOf(listPages.cache.get(ridOf('VL Full')).path)[STAGE.key], pickedDrawn }))

  // C-4 · a Link's Format picked on a List row writes this view alone.
  await showOn(cdp, 'collection', V)
  const site = listSeat(V, 'VL Both', SITE.id)
  const rows = await popNative(cdp, await boxOf(cdp, site))
  const formats = (rows ?? []).find((r) => r.label === 'Format')?.submenu ?? []
  const pick = formats.find((r) => !r.checked && !r.separator)?.label
  await pickNative(['Format', pick])
  const look = await settles(async () => !!viewOnDisk(V.id)?.column_styles?.[SITE.id]?.look)
  const others = sidecarOnDisk().views.filter((v) => v.id !== V.id && v.column_styles?.[SITE.id]).map((v) => v.name)
  const definition = JSON.parse(readRel('.nexus/properties.json')).defs[SITE.id]
  const reread = (await popNative(cdp, await boxOf(cdp, site)) ?? []).find((r) => r.label === 'Format')?.submenu?.find((r) => r.checked)?.label
  await pickNative([])
  decided('C-4', 'a Link\'s Format picked from a List value\'s right-click writes that view\'s look alone, the menu checking the pick again, no other view\'s and not the property\'s own', !!pick && look && reread === pick && others.length === 0 && definition.link_display === undefined, show({ pick, reread, stored: viewOnDisk(V.id)?.column_styles?.[SITE.id], others, definition }))

  // C-2 · a value's Remove hides its property from the view.
  const due = listSeat(V, 'VL Both', DUE.id)
  await popNative(cdp, await boxOf(cdp, due))
  await pickNative(['Remove'])
  const hidden = await settles(async () => (viewOnDisk(V.id)?.hidden_properties ?? []).includes(DUE.id))
  await sleep(400)
  const after = await readList(cdp)
  const drawn = structureErrors(viewOnDisk(V.id), after)
  decided('C-2', 'a List value\'s Remove hides its property from the view, every row drawn as the view now stores it', hidden && after.rows.length > 0 && drawn.length === 0, show({ hidden: viewOnDisk(V.id)?.hidden_properties, drawn: drawn.slice(0, 6) }))
}

// ── Group 11 · the + ────────────────────────────────────────────────────────

const addRow = (label) => `[...(${TOP_LAYER})?.querySelectorAll('[role=button]') ?? []].find((e) => e.getClientRects().length && e.textContent.trim() === ${JSON.stringify(label)})`
const paneUp = async (cdp) => (await cdp.evaluate(RESPONSE)).panes > 0
/** A row's + marked, so a later read tells whether it is still the same element. */
/** A List row's +. */
const addOf = (title) => `(${listRow(title)})?.querySelector('.list-view-add')`
const markAdd = (title) => `(() => { window.__vlAdd = ${addOf(title)}; return !!window.__vlAdd })()`
const sameAdd = (title) => `(() => { const a = ${addOf(title)}; return !!a && a === window.__vlAdd })()`
const valueOf = (title, def) => frontOf(listPages.cache.get(ridOf(title)).path)[def.key]
/** Whether a Select's stored value reads `label`, written bare or as a one-item list. */
const reads = (v, label) => same([v].flat(), [label])

async function plus(cdp) {
  const V = listView(vid('g11adds'), 'VL Adds', { ...flatVL, property_order: ['_title', STAGE.id, PHASE.id, AREAS.id] })
  await showOn(cdp, 'collection', V)
  await listPages(cdp)
  await away(cdp)
  const rest = rowIn(await readList(cdp), 'VL Left')
  await hover(cdp, listRow('VL Left'), 500)
  const hovered = rowIn(await readList(cdp), 'VL Left')
  const boxes = (r) => [r.left.box, r.add.box].map((b) => [b.l, b.w].map((n) => Math.round(n * 10) / 10))
  decided('B-6 · B-10', 'a row\'s + is unseen at rest in a slot it keeps, and shows on hover with nothing on the row moving', rest.add.opacity === '0' && hovered.add.opacity === '1' && rest.add.box.w > 0 && same(boxes(rest), boxes(hovered)), show({ rest: [rest.add.opacity, boxes(rest)], hovered: [hovered.add.opacity, boxes(hovered)] }))

  // B-6 · the + opens the Add list and holds while it's open; a left and a right property added from a row with no right values keep it open.
  await cdp.evaluate(markAdd('VL Left'))
  await mouseClick(cdp, addOf('VL Left'))
  const opened = await settles(async () => cdp.evaluate(`!!(${addRow(STAGE.label)})`), 3000)
  const offered = await cdp.evaluate(`[...(${TOP_LAYER})?.querySelectorAll('[role=button]') ?? []].map((e) => e.textContent.trim())`)
  await away(cdp, await boxOf(cdp, listRow('VL Both')))
  const held = rowIn(await readList(cdp), 'VL Left').add
  decided('B-6', 'a row\'s + opens the Add list of what the row doesn\'t draw, and stays shown while the list is open', opened && offered.includes(TAGS.label) && !offered.includes(PHASE.label) && held.opacity === '1' && held.held, show({ offered, held }))
  await closeAll(cdp)

  // B-6 · B-7 · a Multi-Select added from a row with no right values, on the left and on the right, takes two picks with the list open and the same + throughout.
  const addTwo = async (view, side, title = 'VL Bare') => {
    await showOn(cdp, 'collection', view)
    await hover(cdp, listRow(title), 400)
    await cdp.evaluate(markAdd(title))
    await mouseClick(cdp, addOf(title))
    await until('the Add list', async () => cdp.evaluate(`!!(${addRow(TAGS.label)})`), 3000)
    await mouseClick(cdp, addRow(TAGS.label))
    await until('Tags\' options', async () => cdp.evaluate(`!!(${addRow('One')})`), 3000)
    await mouseClick(cdp, addRow('One'))
    const first = { value: await settles(async () => same(valueOf(title, TAGS), ['One'])), open: await paneUp(cdp), same: await cdp.evaluate(sameAdd(title)) }
    await mouseClick(cdp, addRow('Three'))
    const second = { value: await settles(async () => same(valueOf(title, TAGS), ['One', 'Three'])), open: await paneUp(cdp), same: await cdp.evaluate(sameAdd(title)) }
    const before = rowIn(await readList(cdp), title)
    await closeAll(cdp)
    await away(cdp)
    const row = rowIn(await readList(cdp), title)
    const group = row[side]
    const seats = group?.parts.filter((p) => p.kind !== 'bar') ?? []
    const added = seats.find((p) => p.kind === 'seat' && /One/.test(p.text) && /Three/.test(p.text))
    const atEnd = !!added && added.box.r >= Math.max(...seats.map((p) => p.box.r)) - 0.5 && (side === 'left' || near(added.box.r, row.lineEnd, 1))
    const shown = viewOnDisk(view.id)?.property_order?.at(-1) === TAGS.id
    await mutate(cdp, { op: 'setProperty', path: listPages.cache.get(ridOf(title)).path, propertyId: TAGS.id, value: null })
    await settles(async () => valueOf(title, TAGS) === undefined)
    return { first, second, atEnd, seats: seats.length, shown, last: before.last, after: row.add ? row.add.box.l >= group.box.r - 0.5 : null }
  }
  // A single Select picked from the Add list, on a List row and on a compact card.
  const singlePick = async (view, opener) => {
    await showOn(cdp, 'collection', view)
    await opener()
    await until('the Add list', async () => cdp.evaluate(`!!(${addRow(STAGE.label)})`), 3000)
    await mouseClick(cdp, addRow(STAGE.label))
    await until('Stage\'s options', async () => cdp.evaluate(`!!(${addRow('Todo')})`), 3000)
    await mouseClick(cdp, addRow('Todo'))
    const read = { value: await settles(async () => reads(valueOf('VL Bare', STAGE), 'Todo')), open: await paneUp(cdp) }
    await closeAll(cdp)
    await mutate(cdp, { op: 'setProperty', path: listPages.cache.get(ridOf('VL Bare')).path, propertyId: STAGE.id, value: null })
    await settles(async () => valueOf('VL Bare', STAGE) === undefined)
    return read
  }
  const onList = await singlePick(listView(vid('g11addsingle'), 'VL Add Single', { ...flatVL, property_order: ['_title', DUE.id] }), async () => {
    await hover(cdp, listRow('VL Bare'), 400)
    await mouseClick(cdp, addOf('VL Bare'))
  })
  const onCard = await singlePick(cardsView(vid('g11addsinglecard'), 'VL Add Single Card', { ...flatVL, format: 'compact', property_order: ['_title', DUE.id] }), async () => {
    const c = card(ridOf('VL Bare'))
    await hover(cdp, c, 400)
    await mouseClick(cdp, `(${c}).querySelector('.card-props') ?? (${c}).querySelector('.card-text')`)
  })
  decided('B-6 · C-1', 'a single Select picked from a List row\'s Add list writes it and closes the list, as the same pick on a card does', onList.value && onCard.value && !onList.open && !onCard.open, show({ onList, onCard }))

  const ON = (side) => listView(vid(`g11add${side}`), `VL Add ${side}`, { ...flatVL, property_order: ['_title', STAGE.id, DUE.id], column_sides: { [TAGS.id]: side } })
  for (const side of ['left', 'right']) {
    const r = await addTwo(ON(side), side)
    decided('B-6 · B-7 · C-2 · D-3', `a Multi-Select on the ${side} added from a row with no right values takes two picks, shows on the view at the far end of its side and draws on the ${side}, the list staying open and the + the same element trailing ${side === 'left' ? 'the left group' : 'the new right group'}`, r.first.value && r.first.open && r.first.same && r.second.value && r.second.open && r.second.same && r.atEnd && r.seats === (side === 'left' ? 2 : 1) && r.shown && r.last === 'add' && r.after, show(r))
  }
  // D-3 · on a row already holding values on that side, the new one draws at the side's far end: last on the left, at the row's edge on the right.
  for (const [side, title] of [['left', 'VL Both'], ['right', 'VL Right']]) {
    const r = await addTwo(ON(side), side, title)
    decided('D-3', `a Multi-Select on the ${side} added from ${title}, which holds ${side} values already, draws at the far end of its side${side === 'right' ? ', at the row\'s edge beside the +' : ''}`, r.second.value && r.atEnd && r.seats > 1 && r.shown && r.after, show(r))
  }
  await shot(cdp, 'g11-plus')

  // B-10 · the + leaves a row with nothing left to add.
  const FULL = listView(vid('g11full'), 'VL Full View', { ...flatVL, property_order: EVERY_ORDER.filter((id) => !(id in STAMPS)) })
  await showOn(cdp, 'collection', FULL)
  const fullRead = await readList(cdp)
  const fullRow = rowIn(fullRead, 'VL Full')
  decided('B-10', 'a row drawing every property and Context draws no +, where the others keep theirs', !fullRow.add && fullRead.rows.filter((r) => r !== fullRow).every((r) => r.add), show({ full: fullRow.add, others: fullRead.rows.filter((r) => !r.add).map((r) => titleOf(r.rid)) }))
  const ends = fullRead.rows.filter((r) => r.right)
  const edges = ends.map((r) => r.right.box.r)
  decided('B-10', 'every row\'s right group ends on one line, a row with no + as one with it', ends.some((r) => r.add) && ends.some((r) => !r.add) && Math.max(...edges) - Math.min(...edges) <= 1, show(ends.map((r) => [titleOf(r.rid), !!r.add, r.right.box.r.toFixed(1)])))

  // B-2 · compact cards keep their look: no bar between their values, where the same values on a List are barred.
  const barClass = await cdp.evaluate(`document.querySelector('.list-view .list-view-group > [aria-hidden="true"]')?.className ?? null`)
  const listBars = await cdp.evaluate(`document.querySelector('.list-view').getElementsByClassName(${JSON.stringify(barClass)}).length`)
  await showView(cdp, cardsView(vid('g11compactbars'), 'VL Compact Bars', { ...flatVL, format: 'compact', property_order: EVERY_ORDER.filter((id) => !(id in STAMPS)) }))
  const cardBars = await cdp.evaluate(`${visible(`[...document.querySelectorAll('.cards-view')]`)}.getElementsByClassName(${JSON.stringify(barClass)}).length`)
  decided('B-2', 'compact cards draw no bar between their values, where a List row draws one between each two (stated)', !!barClass && listBars > 0 && cardBars === 0, show({ barClass, listBars, cardBars }))
}

// ── Group 11 · creation ─────────────────────────────────────────────────────

/** The hover or standing ghost row drawn. */
const GHOST_ROW = visible(`[...document.querySelectorAll('.data-row.ghost-row')]`)
const ghostShown = `!!${GHOST_ROW}`
const NEW_IN_GROUP = '[aria-label="New page in group"]'

async function creation(cdp) {
  const V = listView(vid('g11create'), 'VL Create', { property_order: LIST_ORDER })
  await showOn(cdp, 'collection', V)
  await listPages(cdp)
  let lead
  let ghostWeight
  const ghost = await birth(cdp, async () => {
    await hover(cdp, listRow('VL Both'), 1500)
    lead = await cdp.evaluate(`(() => { const g = ${GHOST_ROW}; const r = (${listRow('VL Both')}); if (!g) return null; const cl = (e) => [Math.round(${leadOf("e.querySelector('.cell-lead')")}.content), Math.round(e.getBoundingClientRect().height * 10) / 10]; return { ghost: cl(g), row: cl(r), after: !!(r.compareDocumentPosition(g) & Node.DOCUMENT_POSITION_FOLLOWING) } })()`)
    ghostWeight = await cdp.evaluate(weightOf(`${GHOST_ROW}?.querySelector('.cell-title-text')`))
    await mouseClick(cdp, GHOST_ROW)
  }, 'VL Ghost')
  const order = JSON.parse(readRel(`${ROWS_SET}/_pageset.json`)).page_order ?? []
  decided('A-2 · B-12', 'a List row\'s hover ghost stands under it at its indent and height, and its press names a newborn placed after it in its Set', !!lead && lead.after && same(lead.ghost, lead.row) && ghost.first?.field && ghost.landed && ghost.at === `${ROWS_SET}/VL Ghost.md` && order.indexOf(ghost.first?.rid) === order.indexOf(ridOf('VL Both')) + 1, show({ lead, ghost, order }))
  await trashPage(cdp, ghost.at)

  // B-6 · a row's + is the band's +: one look, revealed alike on the hover of what carries it.
  const ADD_LOOK = (expr) => `(() => { const e = (${expr}); const cs = getComputedStyle(e); const z = e.currentCSSZoom ?? 1; const b = e.getBoundingClientRect(); const g = e.querySelector('svg').getBoundingClientRect(); return { glyph: ${glyphOf('e')}, box: [b.width, b.height, g.width, g.height].map((n) => Math.round(n / z * 10) / 10), color: cs.color, radius: cs.borderRadius, fill: cs.backgroundColor, opacity: cs.opacity } })()`
  const rowAdd = addOf('VL Both')
  const bandAdd = `(${head('VL Rows')}).querySelector('${NEW_IN_GROUP}')`
  await away(cdp)
  const looks = { rest: [await cdp.evaluate(ADD_LOOK(rowAdd)), await cdp.evaluate(ADD_LOOK(bandAdd))] }
  await hover(cdp, listRow('VL Both'), 500)
  looks.rowHover = await cdp.evaluate(ADD_LOOK(rowAdd))
  await hover(cdp, head('VL Rows'), 500)
  looks.bandHover = await cdp.evaluate(ADD_LOOK(bandAdd))
  await away(cdp)
  decided('B-6 · I-3', 'a row\'s + draws as a Set band\'s +, the same glyph, size, and color, unseen at rest and shown on its carrier\'s hover', looks.rest[0].opacity === '0' && looks.rowHover.opacity === '1' && same(looks.rest[0], looks.rest[1]) && same(looks.rowHover, looks.bandHover), show(looks))

  // A-2 · B-8 · a Set band's + creates a page in its Set; a property band's head carries none.
  const band = await birth(cdp, async () => {
    await hover(cdp, head('VL Rows'), 400)
    await mouseClick(cdp, `(${head('VL Rows')}).querySelector('${NEW_IN_GROUP}')`)
  }, 'VL Band')
  const bandLast = (JSON.parse(readRel(`${ROWS_SET}/_pageset.json`)).page_order ?? []).at(-1)
  decided('A-2 · B-8', 'a List Set band\'s + names a newborn last in its Set', band.first?.field && band.landed && band.at === `${ROWS_SET}/VL Band.md` && bandLast === band.first?.rid, show({ band, last: bandLast }))
  await trashPage(cdp, band.at)
  const pluses = async () => cdp.evaluate(`${HEADS}.map((h) => [h.getAttribute('aria-label'), !!h.querySelector('${NEW_IN_GROUP}')])`)
  await showOn(cdp, 'collection', listView(vid('g11createstage'), 'VL Create Stage', { property_order: LIST_ORDER, ...byStage }))
  const listHeads = await pluses()
  await showView(cdp, tableView(vid('g11createstaget'), 'VL Create Stage Table', byStage))
  const tableHeads = await pluses()
  decided('A-2', 'a property band\'s head carries no + on a List, as on a Table (stated)', listHeads.length > 0 && listHeads.every(([, p]) => !p) && same(listHeads, tableHeads), show({ listHeads, tableHeads }))

  await showOn(cdp, 'collection', listView(vid('g11createnosub'), 'VL Create No Sub', { property_order: LIST_ORDER, ...byStage, sub_group: { property_id: PHASE.id, order_mode: 'configured' } }))
  const nested = await cdp.evaluate(`[...document.querySelectorAll('.list-view .group-band .group-band')].filter((b) => b.getClientRects().length && !b.closest('[inert]')).length`)
  decided('A-2', 'a List grouped by a property draws its three option bands and no sub-group under them, a sub-grouping saved beside it included (stated)', nested === 0 && same(await headLabels(cdp), ['Todo', 'Doing', 'Done']), show({ nested, heads: await headLabels(cdp) }))

  // A-2 · an empty sub-band draws on a List as on a Table, and the tail row after one stands at Table's indent (stated: it reads as that band's).
  const subHeads = async () => ({ heads: await headLabels(cdp), tail: Math.round((await cdp.evaluate(leadOf(`${visible(`[...document.querySelectorAll('.data-row[data-rid="${ridOf(`VL Zero ${LONG}`)}"]')]`)}?.querySelector('.cell-lead')`)))?.content ?? NaN) })
  await showOn(cdp, 'collection', listView(vid('g11createsub'), 'VL Create Sub', { property_order: LIST_ORDER, ...subGrouped }))
  const listSub = await subHeads()
  await shot(cdp, 'g11-empty-band')
  await showView(cdp, tableView(vid('g11createsubt'), 'VL Create Sub Table', subGrouped))
  const tableSub = await subHeads()
  decided('A-2', 'a sub-grouped List draws its empty Done bands, and its tail row after one, where a Table does', listSub.heads.includes('Done') && same(listSub, tableSub), show({ listSub, tableSub }))

  // A-2 · the standing ghost on an empty Collection.
  const B = 'Collection B'
  const BV = listView(vid('g11standing'), 'VL Standing', { property_order: ['_title'] })
  await must('save VL Standing', ask(cdp, 'views:save', B, 'collection', BV, {}))
  await mutate(cdp, { op: 'setActiveView', path: B, kind: 'collection', viewId: BV.id })
  await toCollection(cdp, B)
  const standing = await cdp.evaluate(ghostShown)
  const standingWeight = await cdp.evaluate(weightOf(`${GHOST_ROW}?.querySelector('.cell-title-text')`))
  const born = await birth(cdp, () => mouseClick(cdp, GHOST_ROW), 'VL Standing Page')
  const bornPath = (await ask(cdp, 'nexus:state')).value.tree.collections.find((c) => c.path === B)?.pages?.find((p) => p.title === 'VL Standing Page')?.path
  decided('A-2', 'an empty Collection\'s List stands a ghost row with no hover, whose press names a newborn in the Collection', standing && born.first?.field && bornPath === `${B}/VL Standing Page.md`, show({ standing, born, bornPath }))
  if (bornPath) await mutate(cdp, { op: 'delete', path: bornPath, kind: 'page' })
  await toCollection(cdp, COLLECTION)
  await showView(cdp, cardsView(vid('g11ghostcards'), 'VL Ghost Cards', { set_cards: false }))
  await hover(cdp, card('Page C'), 1500)
  const cardGhost = await cdp.evaluate(weightOf(`[...(document.querySelector('.ghost-card')?.querySelectorAll('span') ?? [])].find((e) => !e.children.length && e.textContent.trim() === 'New Page')`))
  const token = await cdp.evaluate(EMPHASIZED)
  decided('B-16 · A-2', 'a List\'s hover ghost and standing ghost title New Page in the emphasized weight a Cards ghost does', !!cardGhost && ghostWeight === token && ghostWeight === cardGhost && standingWeight === cardGhost, show({ ghostWeight, standingWeight, cardGhost, token }))
  await away(cdp)

  // B-4 · a newborn row's stamps are null until its values load (`viewRow.ts`): it draws none blank in between, then both.
  await showOn(cdp, 'collection', listView(vid('g11newborn'), 'VL Newborn View', { ...flatVL, property_order: ['_title', '_created_at', '_modified_at'] }))
  const newborn = mintPageId()
  await cdp.evaluate(ARM_FRAMES(`[...document.querySelectorAll('.list-view .data-row[data-rid="${newborn}"]')].filter((r) => !r.closest('[inert]')).map((r) => [...r.querySelectorAll('.value-seat')].map((e) => e.textContent.trim()))`))
  await mutate(cdp, { op: 'createPage', id: newborn, parentPath: ROWS_SET, name: 'VL Newborn', seeds: {} })
  await sleep(1500)
  const stamps = await frames(cdp)
  const wantStamps = [fullDate(idTime(newborn)), fullDate(statSync(abs(`${ROWS_SET}/VL Newborn.md`)).mtime)]
  decided('B-4', 'a newborn row draws no blank stamp while its values load, each stamp it draws its created or modified date, and then both', stamps.length > 0 && stamps.every((f) => f.flat().every((t) => wantStamps.includes(t))) && same(stamps.at(-1), [wantStamps]), show({ stamps, wantStamps }))
  await trashPage(cdp, `${ROWS_SET}/VL Newborn.md`)
}

// ── Group 11 · a row's drag ─────────────────────────────────────────────────

const manualOf = (view) => (viewOnDisk(view.id)?.manual_order ?? []).map(titleOf)
const before = (list, a, b) => list.indexOf(a) >= 0 && list.indexOf(a) < list.indexOf(b)
const keyMove = (cdp, title, keys) => keySteps(cdp, listRow(title), [...keys, 'Enter'], 900)

async function drags(cdp) {
  const V = listView(vid('g11drag'), 'VL Drag', { property_order: LIST_ORDER })
  await showOn(cdp, 'collection', V)
  await listPages(cdp)
  const drawnTitles = async () => (await readList(cdp)).rows.map((r) => titleOf(r.rid))
  let target = await boxOf(cdp, listRow('VL Left'))
  await gripDrag(cdp, listRow('VL Right'), { x: target.x, y: target.top + 3 })
  const within = await settles(async () => before(manualOf(V), 'VL Right', 'VL Left'))
  decided('A-2', 'a List row dragged by its grip above another in its band saves the manual order and draws there', within && before(await drawnTitles(), 'VL Right', 'VL Left'), show({ disk: manualOf(V), drawn: await drawnTitles() }))
  const LIST_ROWS = `[...document.querySelectorAll('.list-view .data-row[data-rid]')]`
  const plain = await describes(cdp, LIST_ROWS)
  decided('A-2', 'a plain List\'s rows each name the drag gesture', all(plain), show({ rows: plain.length, described: plain.filter(Boolean).length }))
  await keyMove(cdp, 'VL Both', ['ArrowUp'])
  const keyed = manualOf(V)
  const drawnKeyed = await drawnTitles()
  decided('A-2', 'a List row lifts by Space, steps by ArrowUp, and drops by Enter, saving the manual order', await settles(async () => before(manualOf(V), 'VL Both', 'VL Left'), 2000) && before(drawnKeyed, 'VL Both', 'VL Left'), show({ keyed, drawnKeyed }))

  // A row stepped by keyboard past its band's top does on a List what it does on a Table.
  const topStep = async (view, rowExpr) => {
    await showOn(cdp, 'collection', view)
    await keySteps(cdp, rowExpr, ['ArrowUp', 'Enter'], 1200)
    const p = (await listPages(cdp)).get(ridOf('VL Bare'))
    return { path: p.path, last: (await bandRows(cdp, 'Sub-Set B'))?.at(-1) ?? null }
  }
  const rowsOrder = () => JSON.parse(readRel(`${ROWS_SET}/_pageset.json`)).page_order ?? []
  const topOrder = [ridOf('VL Bare'), ...rowsOrder().filter((id) => id !== ridOf('VL Bare'))]
  const putBack = (path) => mutate(cdp, { op: 'movePage', path, newParentPath: ROWS_SET, order: topOrder })
  await putBack(listPages.cache.get(ridOf('VL Bare')).path)
  const listTop = await topStep(listView(vid('g11dragtop'), 'VL Drag Top', { property_order: LIST_ORDER }), listRow('VL Bare'))
  await putBack(listTop.path)
  const tableTop = await topStep(tableView(vid('g11dragtopt'), 'VL Drag Top Table'), tableRowOf('VL Bare'))
  await putBack(tableTop.path)
  const above = { path: `${COLLECTION}/Set Beta/Sub-Set B/VL Bare.md`, last: 'VL Bare' }
  decided('A-2', 'a List row stepped by keyboard past its band\'s top lands last in the band above, Sub-Set B, as a Table row does (stated)', same(listTop, above) && same(tableTop, above), show({ listTop, tableTop }))
  await showOn(cdp, 'collection', V)

  // Under a search or two sort keys a List row names no drag gesture, as a Table's (the host's one rule).
  await search(cdp, 'VL')
  const searched = await describes(cdp, LIST_ROWS)
  await search(cdp, '')
  await showOn(cdp, 'collection', listView(vid('g11dragsorted'), 'VL Drag Sorted', { property_order: LIST_ORDER, sort: [{ property_id: STAGE.id, direction: 'ascending' }, { property_id: '_title', direction: 'ascending' }] }))
  const sortedRows = await describes(cdp, LIST_ROWS)
  decided('A-2', 'a searching List and one sorted by two keys name no drag gesture on their rows, as a Table\'s', none(searched) && none(sortedRows), show({ searched: searched.length, sortedRows: sortedRows.length, anyDescribed: [...searched, ...sortedRows].some(Boolean) }))
  await showOn(cdp, 'collection', V)

  // Across indentation levels: Page A from Set Alpha into Sub-Set A.
  target = await boxOf(cdp, listRow('Alpha 2'))
  await gripDrag(cdp, listRow('Page A'), { x: target.x, y: target.top + 3 })
  const deeper = await settles(async () => (await listPages(cdp)).get(PAGES['Page A'].id)?.path === `${SUB_A}/Page A.md`)
  const depth = rowIn(await readList(cdp), 'Page A')?.depth
  decided('A-2', 'a List row dragged into a deeper Set\'s rows moves its page there and draws it at that Set\'s indent', deeper && depth === rowIn(await readList(cdp), 'Alpha 2')?.depth, show({ path: listPages.cache.get(PAGES['Page A'].id)?.path, depth }))
  if (deeper) await mutate(cdp, { op: 'movePage', path: `${SUB_A}/Page A.md`, newParentPath: `${COLLECTION}/Set Alpha` })

  // Across the band end a Set's own last row keeps before its nested band: VL One's long title onto Alpha 1 by pointer, then back down by keyboard.
  const one = `VL One ${LONG}`
  target = await boxOf(cdp, listRow('Alpha 1'))
  await gripDrag(cdp, listRow(one), { x: target.x, y: target.top + 3 })
  const intoSub = await settles(async () => (await listPages(cdp)).get(ridOf(one))?.path === `${SUB_A}/${one}.md`)
  const intoDepth = rowIn(await readList(cdp), one)?.depth === rowIn(await readList(cdp), 'Alpha 1')?.depth
  await keyMove(cdp, one, ['ArrowUp'])
  const backOut = await settles(async () => (await listPages(cdp)).get(ridOf(one))?.path === `${COLLECTION}/Set Beta/${one}.md`)
  decided('A-2 · B-15', 'a Set\'s own last row dragged across its band end onto a nested band\'s first row moves into that band at its indent, and a keyboard step up past that band\'s top returns it', intoSub && intoDepth && backOut, show({ intoSub, intoDepth, path: listPages.cache.get(ridOf(one))?.path }))
  if (!backOut) await mutate(cdp, { op: 'movePage', path: listPages.cache.get(ridOf(one)).path, newParentPath: `${COLLECTION}/Set Beta` })

  // Across bands: VL Both from Doing into Todo, by pointer and by keyboard.
  const S = listView(vid('g11dragstage'), 'VL Drag Stage', { property_order: LIST_ORDER, ...byStage })
  const bothDoing = () => mutate(cdp, { op: 'setProperty', path: listPages.cache.get(ridOf('VL Both')).path, propertyId: STAGE.id, value: { kind: 'select', value: 'opt_vd_doing' } })
  await showOn(cdp, 'collection', S)
  await listPages(cdp)
  target = await boxOf(cdp, listRow('Page A'))
  await gripDrag(cdp, listRow('VL Both'), { x: target.x, y: target.top + 3 })
  const crossedBand = await settles(async () => reads(valueOf('VL Both', STAGE), 'Todo'))
  decided('A-2', 'a List row dragged across property bands takes the band\'s value', crossedBand, show(valueOf('VL Both', STAGE)))
  await bothDoing()
  const doingRows = async () => (await bandRows(cdp, 'Doing').catch(() => null)) ?? []
  await until('VL Both back in Doing', async () => (await doingRows()).includes('VL Both'), 5000)
  const doing = await doingRows()
  await keyMove(cdp, 'VL Both', Array(doing.indexOf('VL Both') + 1).fill('ArrowUp'))
  const keyedBand = await settles(async () => reads(valueOf('VL Both', STAGE), 'Todo'), 3000)
  decided('A-2', 'a List row stepped by keyboard past its band\'s head takes the band above\'s value', keyedBand, show({ doing, value: valueOf('VL Both', STAGE) }))
  await bothDoing()

  // A-2 · a row's and a band's drag at the view's Scale, a wrapped row's drag, and a row's drag in a View Tile, each landing where it was dropped.
  const gripOnto = async (title, onto, view) => {
    await cdp.evaluate(`(${listRow(onto)}).scrollIntoView({ block: 'center' })`)
    await sleep(300)
    const t = await boxOf(cdp, listRow(onto))
    await gripDrag(cdp, listRow(title), { x: t.x, y: t.top + 3 })
    return settles(async () => before(view ? manualOf(view) : tileManual(), title, onto))
  }
  const SCALED = listView(vid('g11dragscale'), 'VL Drag Scale', { property_order: LIST_ORDER, view_scale: 1.25 })
  await showOn(cdp, 'collection', SCALED)
  const scaledRow = await gripOnto('VL Right', 'VL Left', SCALED)
  const beta = await boxOf(cdp, head('Set Beta'))
  const alpha = await boxOf(cdp, head('Set Alpha'))
  await dragPoints(cdp, { x: beta.x, y: beta.y }, { x: alpha.x, y: alpha.top + 2 })
  const scaledBand = await settles(async () => before(viewOnDisk(SCALED.id)?.group_order ?? [], IDS.beta, IDS.alpha))
  const drawnSets = (await headLabels(cdp)).filter((l) => l.startsWith('Set '))
  decided('A-2', 'at the view\'s Scale of 1.25, a List row dragged by its grip lands above the row it was dropped on, and a Set band dragged by its head lands above Set Alpha, each saved and drawn there', scaledRow && scaledBand && same(drawnSets, ['Set Beta', 'Set Alpha']) && before((await readList(cdp)).rows.map((r) => titleOf(r.rid)), 'VL Right', 'VL Left') && near((await readList(cdp)).rows[0]?.z, 1.25, 0.01), show({ scaledRow, scaledBand, drawnSets, order: viewOnDisk(SCALED.id)?.group_order }))
  const WRAPPED = listView(vid('g11dragwrap'), 'VL Drag Wrapped', { property_order: LIST_ORDER, wrap_rows: true })
  await showOn(cdp, 'collection', WRAPPED)
  await viewport(cdp, NARROW)
  const two = `VL Two ${LONG}`
  const wasWrapped = wrapped(rowIn(await readList(cdp), two))
  const wrappedRow = await gripOnto(two, 'Alpha 1', WRAPPED)
  await viewport(cdp, null)
  decided('A-2', 'a List row wrapped to two lines, dragged by its grip, lands above the row it was dropped on', wasWrapped && wrappedRow, show({ wasWrapped, order: manualOf(WRAPPED) }))

  // A-2 · a Set band dragged by its head at the view's own Scale lands above its sibling.
  const PLAIN = listView(vid('g11dragband'), 'VL Drag Band', { property_order: LIST_ORDER })
  await showOn(cdp, 'collection', PLAIN)
  const betaHead = await boxOf(cdp, head('Set Beta'))
  const alphaHead = await boxOf(cdp, head('Set Alpha'))
  await dragPoints(cdp, { x: betaHead.x, y: betaHead.y }, { x: alphaHead.x, y: alphaHead.top + 2 })
  const plainBand = await settles(async () => before(viewOnDisk(PLAIN.id)?.group_order ?? [], IDS.beta, IDS.alpha))
  const plainSets = (await headLabels(cdp)).filter((l) => l.startsWith('Set '))
  decided('A-2', 'a List\'s Set band dragged by its head above Set Alpha saves the group order and draws there', plainBand && same(plainSets, ['Set Beta', 'Set Alpha']), show({ order: viewOnDisk(PLAIN.id)?.group_order, plainSets }))

  // A-2 · a row dropped on a Set's head lands in that Set: an open Set, a collapsed one that springs open under the held row, and an empty one.
  const pageB = () => listPages.cache.get(PAGES['Page B'].id)?.path
  const inBand = (title, label) => cdp.evaluate(`(() => { const r = ${listRow(title)}; const h = ${head(label)}; return !!r && !!h && r.closest('.group-band') === h.closest('.group-band') })()`)
  const ontoHead = async (label, held) => {
    const to = await boxOf(cdp, head(label))
    await gripDrag(cdp, listRow('Page B'), { x: to.x, y: to.y }, held ? { held } : undefined)
    const landed = await settles(async () => (await listPages(cdp)).get(PAGES['Page B'].id)?.path?.startsWith(`${COLLECTION}/${label}/Page B`))
    return { landed, path: pageB(), drawn: await settles(() => inBand('Page B', label), 3000) }
  }
  const homeB = async () => {
    if (pageB() !== PAGES['Page B'].path) await mutate(cdp, { op: 'movePage', path: pageB(), newParentPath: `${COLLECTION}/Set Alpha` })
    await until('Page B home', async () => (await listPages(cdp)).get(PAGES['Page B'].id)?.path === PAGES['Page B'].path, 5000)
  }
  const ROWS_HEADS = listView(vid('g11draghead'), 'VL Drag Head', { property_order: LIST_ORDER })
  await showOn(cdp, 'collection', ROWS_HEADS)
  const open = await ontoHead('Set Beta')
  decided('A-2', 'a List row dropped on an open Set\'s head moves its page into that Set and draws it in that band', open.landed && open.drawn, show(open))
  await homeB()
  await showOn(cdp, 'collection', listView(vid('g11dragfold'), 'VL Drag Folded', { property_order: LIST_ORDER, collapsed_groups: [IDS.beta] }))
  let sprang = null
  const folded = await ontoHead('Set Beta', async () => {
    await sleep(1500)
    sprang = await expanded(cdp, head('Set Beta'))
  })
  decided('A-2', 'a List row held over a collapsed Set\'s head springs it open, and dropped there moves its page into that Set', sprang === 'true' && folded.landed && folded.drawn, show({ sprang, ...folded }))
  await homeB()
  const hollowId = containerId()
  await mutate(cdp, { op: 'createContainer', id: hollowId, parentPath: COLLECTION, kind: 'set', name: 'VL Hollow' })
  await showOn(cdp, 'collection', listView(vid('g11draghollow'), 'VL Drag Hollow', { property_order: LIST_ORDER, collapsed_groups: [IDS.beta] }))
  await until('VL Hollow\'s head', async () => cdp.evaluate(`!!(${head('VL Hollow')})`))
  const hollow = await ontoHead('VL Hollow')
  decided('A-2', 'a List row dropped on an empty Set\'s head moves its page into that Set and draws it in that band', hollow.landed && hollow.drawn, show(hollow))
  await homeB()
  await mutate(cdp, { op: 'delete', path: `${COLLECTION}/VL Hollow`, kind: 'set' })

  await showOn(cdp, 'tile', listView(vid('g11dragtile'), 'VL Drag Tile', { property_order: LIST_ORDER }))
  const tileRow = await gripOnto('VL Right', 'VL Left')
  decided('A-2', 'a List row in a View Tile dragged by its grip lands above the row it was dropped on, saved in the tile', tileRow, show(tileManual()))

  // A-2 · in a View Tile's List of Sets, a row dragged into another Set's rows moves its page there, at that Set's indent.
  await cdp.evaluate(`(${listRow('Page B')}).scrollIntoView({ block: 'start' })`)
  await sleep(300)
  const pageBRow = await boxOf(cdp, listRow('Page B'))
  await gripDrag(cdp, listRow('Alpha 1'), { x: pageBRow.x, y: pageBRow.top + 3 })
  const tileMoved = await settles(async () => (await listPages(cdp)).get(PAGES['Alpha 1'].id)?.path === `${COLLECTION}/Set Alpha/Alpha 1.md`)
  const tileRead = await readList(cdp)
  const tileDrawn = before(tileRead.rows.map((r) => titleOf(r.rid)), 'Alpha 1', 'Page B') && rowIn(tileRead, 'Alpha 1')?.depth === rowIn(tileRead, 'Page B')?.depth
  decided('A-2', 'a List row in a View Tile dragged into another Set\'s rows moves its page there and draws it at that Set\'s indent, above the row it was dropped on', tileMoved && tileDrawn, show({ path: listPages.cache.get(PAGES['Alpha 1'].id)?.path, drawn: tileRead.rows.map((r) => titleOf(r.rid)), depth: rowIn(tileRead, 'Alpha 1')?.depth }))
  if (tileMoved) await mutate(cdp, { op: 'movePage', path: `${COLLECTION}/Set Alpha/Alpha 1.md`, newParentPath: SUB_A })
}
/** The manual order the homepage's View Tile stores, by title. */
const tileManual = () => (tileOnDisk()?.views[0]?.config?.manual_order ?? []).map(titleOf)

// ── Group 11 · the property pane ────────────────────────────────────────────

/** The pane's two-column grid: the nearest element holding both its Left and Right headings, or null with no pane up. */
const PANE_GRID = `(() => { const leaf = (t) => [...document.querySelectorAll('*')].find((e) => !e.children.length && e.textContent.trim() === t && !e.closest('[role=button], [inert]') && e.getClientRects().length); const L = leaf('Left'), R = leaf('Right'); let g = L?.parentElement; while (g && R && !g.contains(R)) g = g.parentElement; return R ? g : null })()`
/** List's two-column pane as drawn: each column's heading and width, its rows with their eyes, hidden foot, and zone, each row's width and the width its content takes unbounded, whether its name is cut and how, and whether a row is held. */
const SIDES_READ = `(() => {
  const layer = document.body
  const grid = ${PANE_GRID}
  if (!grid) return { columns: null }
  const z = grid.currentCSSZoom ?? 1
  const box = (e) => { const b = e.getBoundingClientRect(); return { t: b.top, b: b.bottom, l: b.left, r: b.right, h: b.height, x: b.left + b.width / 2, y: b.top + b.height / 2 } }
  const eye = (r) => r.querySelector('[aria-label^="Hide "], [aria-label^="Show "]')?.getAttribute('aria-label') ?? null
  const dim = (r) => Math.min(...[r, ...r.querySelectorAll('*')].map((e) => Number(getComputedStyle(e).opacity)))
  const scroller = (() => { let e = grid.parentElement; while (e && e !== layer && !(e.scrollHeight > e.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(e).overflowY))) e = e.parentElement; return e && e !== layer ? e : null })()
  const natural = (r) => { const c = r.cloneNode(true); c.style.cssText = 'position: absolute; visibility: hidden; width: max-content; max-width: none; transform: none'; r.parentElement.appendChild(c); const w = c.getBoundingClientRect().width / z; c.remove(); return w }
  const name = (r) => [...r.querySelectorAll('*')].find((e) => !e.children.length && e.textContent.trim() && !e.closest('button'))
  const sizes = (r) => { const t = name(r); return { w: r.getBoundingClientRect().width / z, natural: natural(r), cut: !!t && t.scrollWidth > t.clientWidth + 1, ellipsis: t ? getComputedStyle(t).textOverflow : null } }
  return {
    ...${HELD},
    scroll: scroller && { top: scroller.scrollTop, max: scroller.scrollHeight - scroller.clientHeight },
    kit: (() => { const p = document.createElement('div'); p.style.cssText = 'background: var(--fill-quaternary); padding-top: var(--row-pad-compact)'; grid.appendChild(p); const cs = getComputedStyle(p); const k = { fill: cs.backgroundColor, pad: cs.paddingTop }; p.remove(); return k })(),
    columns: [...grid.children].map((col) => {
      const list = col.lastElementChild
      const zone = list.firstElementChild
      return {
        heading: col.firstElementChild.textContent.trim(), w: col.getBoundingClientRect().width / z, fill: getComputedStyle(col.lastElementChild).backgroundColor,
        pads: [...col.querySelectorAll('[aria-roledescription=sortable] > *')].map((r) => getComputedStyle(r).paddingTop),
        rows: [...zone.querySelectorAll('[aria-roledescription=sortable]')].map((r) => ({ label: r.textContent.trim(), eye: eye(r), box: box(r), ...sizes(r) })),
        hidden: [...list.children].slice(1).map((r) => ({ label: r.textContent.trim(), eye: eye(r), dim: dim(r), box: box(r), ...sizes(r) })),
        zone: box(zone), spill: zone.style.getPropertyValue('--drag-spill'),
      }
    }),
  }
})()`
const sidesRead = (cdp) => cdp.evaluate(SIDES_READ)
/** The pane's scrolling body scrolled to its foot, or to its head. */
const PANE_TO = (end) => `(() => { let e = ${PANE_GRID}; while (e && !(e.scrollHeight > e.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(e).overflowY))) e = e.parentElement; if (e) e.scrollTop = ${end === 'foot' ? 'e.scrollHeight' : '0'}; return !!e })()`
const labelOf = (id) => (id === '_title' ? 'Title' : LABEL_OF[id])
/** The rows each column should list for a view as stored: Left as its group reads, Right from the row's edge inward (E-3), and each side's hidden foot (E-5). */
function paneOf(view) {
  const cols = columnsOf(view)
  const hidden = Object.keys(TYPE_OF).filter((id) => id !== '_title' && !cols.includes(id))
  const on = (ids, side) => ids.filter((id) => sideOf(view, id) === side).map(labelOf)
  return { left: on(cols, 'left'), right: on(cols, 'right').reverse(), hiddenLeft: on(hidden, 'left').sort(), hiddenRight: on(hidden, 'right').sort() }
}
/** A pane row's element by its column and label: a zone row, or a hidden row at the foot. */
const sideRowEl = (label, { hidden = false } = {}) => `[...document.querySelectorAll('${hidden ? 'div' : '[aria-roledescription=sortable]'}')].find((r) => r.getClientRects().length && !r.closest('[inert], .list-view, nav') && r.textContent.trim() === ${JSON.stringify(label)} && ${hidden ? "!r.closest('[aria-roledescription=sortable]') && !r.querySelector('[aria-roledescription=sortable]') && !!r.querySelector('[aria-label^=\"Show \"]') && r.parentElement.firstElementChild !== r" : 'true'})`
/** Every `views:save` counted from now, through a rule that matches none. */
const countSaves = () => inMain(`(() => { globalThis.__vlSaves = 0; ${GATE}; const g = globalThis.__vdGate; g.rules = g.rules.filter((r) => !r.counts); g.rules.push({ channel: 'views:save', counts: true, match: () => { globalThis.__vlSaves++; return false } }) })()`)
const saves = () => inMain('globalThis.__vlSaves')
const stopCounting = () => inMain(`(() => { const g = globalThis.__vdGate; if (g) g.rules = g.rules.filter((r) => !r.counts) })()`)
/** A Text property added to Collection A for one case and known to the drive's tables, answering its id; `dropProperty` deletes it and forgets it. */
async function addTextProperty(cdp, label) {
  const id = (await must(`add ${label}`, ask(cdp, 'mutate', { op: 'addProperty', containerPath: COLLECTION, draft: { label, type: 'text' } }))).created.propertyId
  TYPE_OF[id] = 'text'
  LABEL_OF[id] = label
  return id
}
async function dropProperty(cdp, id) {
  await must(`delete ${LABEL_OF[id]}`, ask(cdp, 'mutate', { op: 'deleteProperty', propertyId: id }))
  delete TYPE_OF[id]
  delete LABEL_OF[id]
}
const shapeErrors = (read, view) => {
  const want = paneOf(view)
  const [left, right] = read.columns ?? []
  const errors = []
  if (!left || left.heading !== 'Left' || right?.heading !== 'Right') return [`columns ${show(read.columns?.map((c) => c.heading))}`]
  for (const c of read.columns) if (c.fill !== read.kit.fill || c.pads.some((p) => p !== read.kit.pad)) errors.push(`${c.heading} filled ${c.fill} with rows padded ${show(c.pads)}, not the kit's ${read.kit.fill} and ${read.kit.pad}`)
  if (!same(left.rows.map((r) => r.label), want.left)) errors.push(`Left ${show(left.rows.map((r) => r.label))}, wanted ${show(want.left)}`)
  if (!same(right.rows.map((r) => r.label), want.right)) errors.push(`Right ${show(right.rows.map((r) => r.label))}, wanted ${show(want.right)}`)
  if (!same(left.hidden.map((r) => r.label).sort(), want.hiddenLeft)) errors.push(`Left's foot ${show(left.hidden.map((r) => r.label))}, wanted ${show(want.hiddenLeft)}`)
  if (!same(right.hidden.map((r) => r.label).sort(), want.hiddenRight)) errors.push(`Right's foot ${show(right.hidden.map((r) => r.label))}, wanted ${show(want.hiddenRight)}`)
  if (left.rows.find((r) => r.label === 'Title')?.eye) errors.push('Title carries an eye')
  for (const r of [...left.hidden, ...right.hidden]) if (!(r.dim < 1) || !r.eye?.startsWith('Show')) errors.push(`${r.label} at the foot isn't ghosted with its eye off (${r.dim}, ${r.eye})`)
  return errors
}
/** E-4's widths: two equal columns as wide as their widest row needs, hidden rows included, every name whole, and past `PANE_CAP`, both at it with the longer names cut in an ellipsis. */
const PANE_CAP = 180
const widthErrors = (read) => {
  const [a, b] = read.columns
  const rows = [...a.rows, ...a.hidden, ...b.rows, ...b.hidden]
  const widest = Math.max(...rows.map((x) => x.natural))
  const rowW = Math.max(...rows.map((x) => x.w))
  const errors = []
  if (!near(a.w, b.w, 0.5)) errors.push(`columns ${a.w.toFixed(1)} and ${b.w.toFixed(1)}`)
  if (rows.some((x) => !near(x.w, rowW, 0.5))) errors.push(`rows ${show(rows.map((x) => x.w.toFixed(1)))} unequal`)
  if (widest <= rowW + 0.5) {
    if (!near(widest, rowW, 1)) errors.push(`rows ${rowW.toFixed(1)} wide for a widest name's ${widest.toFixed(1)}`)
    if (!(a.w < PANE_CAP - 0.5)) errors.push(`columns ${a.w.toFixed(1)} at the cap with every name fitting`)
    if (rows.some((x) => x.cut)) errors.push(`${rows.filter((x) => x.cut).map((x) => x.label)} cut`)
  } else {
    if (!near(a.w, PANE_CAP, 0.5)) errors.push(`columns ${a.w.toFixed(1)} under a name past the cap`)
    const long = rows.filter((x) => x.natural > rowW + 0.5)
    if (!long.every((x) => x.cut && x.ellipsis === 'ellipsis')) errors.push(`${show(long.map((x) => [x.label, x.cut, x.ellipsis]))} not cut in an ellipsis`)
  }
  return errors
}
/** A column's shown rows' tops, where its slot stands, its last shown row's bottom, its first hidden row's top, and whether its zone spills, light enough to read each frame; the held row, drawn wherever the pointer takes it, left out. */
const COLUMN_EDGE = (i) => `(() => {
  const col = (${PANE_GRID})?.children[${i}]
  if (!col) return null
  const list = col.lastElementChild
  const zone = list.firstElementChild
  const rows = [...zone.querySelectorAll('[aria-roledescription=sortable]')].filter((r) => r.getAttribute('aria-pressed') !== 'true' && !r.hasAttribute('data-drag-source'))
  const hidden = list.children[1]
  return { tops: rows.map((r) => Math.round(r.getBoundingClientRect().top)), last: Math.max(...rows.map((r) => r.getBoundingClientRect().bottom)), hidden: hidden ? hidden.getBoundingClientRect().top : Infinity, spill: !!zone.style.getPropertyValue('--drag-spill') }
})()`
const firstLeftOf = (read) => read.columns[0].rows.find((x) => x.label !== 'Title').label
/** A pane row carried to `to`, `held` read before the release. */
async function paneDrag(cdp, from, to, held) {
  const a = await boxOf(cdp, from)
  let read
  await dragPoints(cdp, a, to, { steps: 16, held: async () => { await sleep(350); read = held ? await held() : null }, settle: 900 })
  return read
}

async function pane(cdp) {
  const V = listView(vid('g11pane'), 'VL Pane', { ...flatVL, property_order: ['_title', STAGE.id, TAGS.id, DUE.id, NOTE.id, SITE.id] })
  await showOn(cdp, 'collection', V)
  await listPages(cdp)
  const stored = () => viewOnDisk(V.id)
  const drawnAsStored = async () => structureErrors(stored(), await readList(cdp))

  for (const which of ['settings', 'editor']) {
    await door(cdp, which, which === 'settings' ? 'Visibility' : 'Layout')
    const read = await sidesRead(cdp)
    const errors = read.columns ? [...shapeErrors(read, stored()), ...widthErrors(read)] : ['no pane']
    decided('E-1 · E-2 · E-3 · E-4 · E-5 · E-8', `the ${which === 'settings' ? 'Settings door\'s Visibility' : 'editor door\'s Layout'} opens List's pane: Left and Right side by side, equal and as wide as their widest name, under the cap, Left as the left group reads with Title and no eye, Right from the row's edge inward, each hidden property ghosted at its own column's foot`,
      errors.length === 0 && read.columns.length === 2 && read.columns[0].zone.l < read.columns[1].zone.l, show({ errors, widths: read.columns?.map((c) => c.w) }))
    if (which === 'settings') await shot(cdp, 'g11-pane')
  }
  await door(cdp, 'settings', 'Layout')
  const layoutHolds = (await sidesRead(cdp)).columns
  decided('E-1', 'Settings\' Layout on a List holds no Left and Right columns', layoutHolds === null, show(layoutHolds))

  // Through the Settings door: within a column, across both ways, Title held, the hidden foot inert, a carried row making room.
  await door(cdp, 'settings', 'Visibility')
  await countSaves()
  let r = await sidesRead(cdp)
  const leftRow = (label) => r.columns[0].rows.find((x) => x.label === label).box
  const rightRow = (label) => r.columns[1].rows.find((x) => x.label === label).box
  const withinHeld = await paneDrag(cdp, sideRowEl(TAGS.label), { x: leftRow(STAGE.label).x, y: leftRow(STAGE.label).t + 3 }, () => sidesRead(cdp))
  const within = await settles(async () => before(stored().property_order, TAGS.id, STAGE.id))
  decided('E-7', 'a pane row dragged within its column reorders the view, and the List draws it', within && (await saves()) === 1 && (await drawnAsStored()).length === 0, show({ order: stored().property_order, saves: await saves() }))
  decided('E-7', 'a pane row held over its column draws no drop line, the pane\'s stated exception', withinHeld?.held === true && withinHeld.line === false, show({ held: withinHeld?.held, line: withinHeld?.line }))

  await countSaves()
  r = await sidesRead(cdp)
  const footBefore = r.columns[1].hidden[0]?.box.t
  const restWidths = r.columns.map((c) => c.w)
  const roomRead = await paneDrag(cdp, sideRowEl(STAGE.label), { x: rightRow(NOTE.label).x, y: rightRow(NOTE.label).t + 3 }, () => sidesRead(cdp))
  const room = roomRead?.columns[1]
  const crossed1 = await settles(async () => stored().column_sides?.[STAGE.id] === 'right')
  const right1 = (await sidesRead(cdp)).columns[1].rows.map((x) => x.label)
  const carried = rightRow(NOTE.label).b - rightRow(NOTE.label).t
  decided('E-7 · I-4', 'a pane row dragged from Left into Right lands between the rows it was dropped between, writing its side and place in one save, and the List draws it there', crossed1 && same(right1, [SITE.label, STAGE.label, NOTE.label, DUE.label]) && (await saves()) === 1 && (await drawnAsStored()).length === 0, show({ right1, saves: await saves(), sides: stored().column_sides, order: stored().property_order }))
  const lastZoneRow = room?.rows.at(-1)?.box.b
  decided('E-4', 'the columns keep their widths while a row is carried from one into the other', !!roomRead?.held && same(roomRead.columns.map((c) => Math.round(c.w * 10)), restWidths.map((w) => Math.round(w * 10))), show({ restWidths, held: roomRead?.columns.map((c) => c.w) }))
  decided('E-10', 'a row carried into the Right column grows its zone by the row, so its hidden foot moves down and nothing draws over it', !!room && parseFloat(room.spill) > 0 && room.hidden[0].box.t - footBefore >= carried - 1 && room.hidden[0].box.t >= room.zone.b - 0.5 && room.hidden[0].box.t >= lastZoneRow - 0.5, show({ footBefore, during: room?.hidden[0]?.box.t, zone: room?.zone, spill: room?.spill, carried }))

  // E-10 · a carry into Right that leaves without a drop, and one Escape cancels: the room closes with the rows gliding back, the last shown row never drawn over the first hidden one.
  const glides = {}
  const leftBefore = (await sidesRead(cdp)).columns[0].rows.map((x) => x.label)
  for (const how of ['leave', 'escape']) {
    await countSaves()
    r = await sidesRead(cdp)
    const from = await boxOf(cdp, sideRowEl(firstLeftOf(r)))
    const into = { x: r.columns[1].zone.x, y: r.columns[1].rows.at(-1).box.t + 3 }
    await cdp.evaluate(ARM_FRAMES(COLUMN_EDGE(1)))
    await dragPoints(cdp, from, into, { steps: 16, held: async () => {
      await sleep(400)
      if (how === 'escape') return pressKey(cdp, 'Escape')
      for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: into.x + i * 60, y: into.y + i * 40, button: 'left', buttons: 1 }); await sleep(16) }
      await sleep(400)
    }, settle: 1200 })
    const seen = await frames(cdp)
    glides[how] = { samples: seen.length, grew: seen.some((e) => e && e.spill), over: seen.filter((e) => e && e.last > e.hidden + 0.5), saves: await saves(), after: (await sidesRead(cdp)).columns.map((c) => c.rows.map((x) => x.label)) }
  }
  decided('E-10', 'a row carried into Right and taken out again without a drop, or cancelled by Escape, makes room and closes it, the column\'s last shown row never over its first hidden one, nothing written', Object.values(glides).every((g) => g.samples > 3 && g.grew && g.over.length === 0 && g.saves === 0 && same(g.after, [leftBefore, right1])), show(glides))

  await countSaves()
  r = await sidesRead(cdp)
  await paneDrag(cdp, sideRowEl(NOTE.label), { x: r.columns[0].zone.x, y: r.columns[0].rows.at(-1).box.b - 2 })
  const crossed2 = await settles(async () => stored().column_sides?.[NOTE.id] === 'left')
  decided('E-7', 'a pane row dragged from Right into Left takes the left side where it was dropped, in one save', crossed2 && (await sidesRead(cdp)).columns[0].rows.at(-1).label === NOTE.label && (await saves()) === 1 && (await drawnAsStored()).length === 0, show({ left: (await sidesRead(cdp)).columns[0].rows.map((x) => x.label), sides: stored().column_sides, saves: await saves() }))

  await countSaves()
  r = await sidesRead(cdp)
  const title = await paneDrag(cdp, sideRowEl('Title'), { x: r.columns[1].zone.x, y: r.columns[1].rows[0].box.t + 3 }, () => sidesRead(cdp))
  await sleep(400)
  decided('E-8 · E-9', 'Title, lifted and carried toward Right, stays in Left and writes nothing', title?.held === true && !title.columns[1].rows.some((x) => x.label === 'Title') && (await sidesRead(cdp)).columns[0].rows.some((x) => x.label === 'Title') && (await saves()) === 0 && !stored().column_sides?._title, show({ held: title?.held, during: title?.columns[1].rows.map((x) => x.label), saves: await saves() }))
  await countSaves()
  r = await sidesRead(cdp)
  const afterTitle = r.columns[0].rows[1]
  await paneDrag(cdp, sideRowEl('Title'), { x: afterTitle.box.x, y: afterTitle.box.b - 3 })
  const ahead = idOfLabel(afterTitle.label)
  const titleMoved = await settles(async () => before(stored().property_order, ahead, '_title'))
  const leads = (await readList(cdp)).rows.filter((x) => x.left.parts[0]?.kind === 'seat').map((x) => titleOf(x.rid))
  decided('E-8 · B-11', 'Title dragged below another Left row reorders within Left, so that value draws ahead of the title', titleMoved && (await saves()) === 1 && leads.length > 0 && (await drawnAsStored()).length === 0, show({ ahead: afterTitle.label, order: stored().property_order, leads, saves: await saves() }))

  await countSaves()
  const foot = sideRowEl(COUNT.label, { hidden: true })
  const footRead = await paneDrag(cdp, foot, { x: r.columns[1].zone.x, y: r.columns[1].rows[0].box.t + 3 }, async () => (await cdp.evaluate(HELD)).held)
  decided('E-5 · E-7', 'a hidden row at a column\'s foot lifts no drag and writes nothing', footRead === false && (await saves()) === 0, show({ lifted: footRead, saves: await saves() }))

  // E-5 · E-6 · the eye, on VL Tags stored off its default side: it leaves for its own column's foot and returns to its place and side after another row moves.
  await must('VL Tags stored Right', ask(cdp, 'views:save', COLLECTION, 'collection', stored(), { column_sides: { [TAGS.id]: 'right' } }))
  await until('VL Tags in Right', async () => (await sidesRead(cdp)).columns[1].rows.some((x) => x.label === TAGS.label))
  const shownOrder = stored().property_order
  const shownAt = (await sidesRead(cdp)).columns[1].rows.map((x) => x.label).indexOf(TAGS.label)
  await countSaves()
  await mouseClick(cdp, ctl(`Hide ${TAGS.label}`))
  await settles(async () => stored().hidden_properties.includes(TAGS.id))
  r = await sidesRead(cdp)
  const atFoot = r.columns[1].hidden.find((x) => x.label === TAGS.label)
  await paneDrag(cdp, sideRowEl(DUE.label), { x: rightRow(SITE.label).x, y: r.columns[1].rows[0].box.t + 3 })
  await settles(async () => stored().property_order.indexOf(DUE.id) !== shownOrder.indexOf(DUE.id))
  await mouseClick(cdp, ctl(`Show ${TAGS.label}`))
  await settles(async () => !stored().hidden_properties.includes(TAGS.id))
  const back = stored()
  const unmoved = (o) => o.filter((id) => id !== DUE.id)
  const backRead = await sidesRead(cdp)
  const backRight = backRead.columns[1].rows.map((x) => x.label)
  const neighbors = (labels) => labels.filter((l) => l !== DUE.label)
  decided('E-5 · E-6', 'a property stored off its default side, hidden by its eye, rests ghosted at its own column\'s foot, and shown again after another row moved returns to its place and side', !!atFoot && atFoot.dim < 1 && !same(back.property_order, shownOrder) && same(unmoved(back.property_order), unmoved(shownOrder)) && back.column_sides?.[TAGS.id] === 'right' && neighbors(backRight).indexOf(TAGS.label) === neighbors(paneOf({ ...back, property_order: shownOrder }).right).indexOf(TAGS.label) && shownAt >= 0 && shapeErrors(backRead, back).length === 0 && (await drawnAsStored()).length === 0, show({ atFoot, shownOrder, back: back.property_order, sides: back.column_sides, backRight }))
  await must('VL Tags stored Left', ask(cdp, 'views:save', COLLECTION, 'collection', stored(), { column_sides: { [TAGS.id]: 'left' } }))
  await until('VL Tags in Left', async () => (await sidesRead(cdp)).columns[0].rows.some((x) => x.label === TAGS.label))

  // E-7 · the keyboard: Space lifts, an arrow steps, Space drops; Escape cancels and the pane stays.
  await countSaves()
  const firstLeft = (await sidesRead(cdp)).columns[0].rows.map((x) => x.label)
  await keySteps(cdp, sideRowEl(firstLeft[1]), ['ArrowDown', ' '], 900)
  const stepped = (await sidesRead(cdp)).columns[0].rows.map((x) => x.label)
  decided('E-7', 'a pane row lifts by Space, steps down by an arrow, and drops by Space, saving the order', stepped[2] === firstLeft[1] && (await saves()) === 1, show({ firstLeft, stepped, saves: await saves() }))
  await countSaves()
  await keySteps(cdp, sideRowEl(stepped[1]), ['ArrowDown', 'Escape'], 600)
  decided('E-7', 'Escape on a lifted pane row through the Settings door cancels it and leaves the pane open', same((await sidesRead(cdp))?.columns[0].rows.map((x) => x.label), stepped) && (await saves()) === 0 && (await cdp.evaluate(`!!${BACK_BAR}`)), show({ after: (await sidesRead(cdp))?.columns[0].rows.map((x) => x.label), saves: await saves() }))

  await countSaves()
  await keySteps(cdp, sideRowEl(stepped[1]), ['ArrowRight', ' '], 800)
  const across = await sidesRead(cdp)
  decided('E-7', 'a keyboard lift steps no row across the pane\'s columns; the Move rows carry a side (stated)', same(across.columns[0].rows.map((x) => x.label), stepped) && !across.columns[1].rows.some((x) => x.label === stepped[1]), show({ left: across.columns[0].rows.map((x) => x.label), saves: await saves() }))

  // E-7 · Move to Left and Move to Right write the side alone (stated: the property lands where its stored order puts it); Title offers none.
  const moveOf = async (label, hidden = false) => {
    const rows = await popNative(cdp, await boxOf(cdp, sideRowEl(label, { hidden })))
    return labels(rows)
  }
  const titleMenu = await moveOf('Title')
  await pickNative([])
  const beforeMove = stored()
  const leftMenu = await moveOf(STAGE.label)
  await pickNative([leftMenu[0]])
  await settles(async () => sideOf(stored(), STAGE.id) !== sideOf(beforeMove, STAGE.id))
  const moved = stored()
  decided('E-7', 'a pane row\'s right-click offers Move to the other side and writes the side alone, the property landing where its stored order puts it (stated); Title\'s offers none', titleMenu.length === 0 && /^Move to (Left|Right)$/.test(leftMenu[0] ?? '') && sideOf(moved, STAGE.id) !== sideOf(beforeMove, STAGE.id) && same(moved.property_order, beforeMove.property_order) && shapeErrors(await sidesRead(cdp), moved).length === 0 && (await drawnAsStored()).length === 0, show({ titleMenu, leftMenu, sides: moved.column_sides }))
  const hiddenMenu = await moveOf(DOC.label, true)
  await pickNative([hiddenMenu[0]])
  const docSide = await settles(async () => stored().column_sides?.[DOC.id] === 'left')
  decided('E-5 · E-7', 'a hidden row\'s Move to Left takes it to the other column\'s foot', hiddenMenu[0] === 'Move to Left' && docSide && (await sidesRead(cdp)).columns[0].hidden.some((x) => x.label === DOC.label), show({ hiddenMenu, sides: stored().column_sides }))
  await shot(cdp, 'g11-pane-moved')
  await closeAll(cdp)

  // E-7 · a row dropped into an empty column, and a drag in a scrolled column.
  const EMPTY = listView(vid('g11paneempty'), 'VL Pane Empty', { ...flatVL, property_order: ['_title', STAGE.id, TAGS.id] })
  await showOn(cdp, 'collection', EMPTY)
  await door(cdp, 'settings', 'Visibility')
  r = await sidesRead(cdp)
  const emptySlot = await paneDrag(cdp, sideRowEl(TAGS.label), { x: r.columns[1].zone.x, y: r.columns[1].zone.t + 4 }, () => cdp.evaluate(`document.querySelector('.drop-slot')?.getBoundingClientRect().height ?? null`))
  const rowHeight = r.columns[0].rows.find((x) => x.label === TAGS.label)?.box.h
  const intoEmpty = await settles(async () => viewOnDisk(EMPTY.id)?.column_sides?.[TAGS.id] === 'right')
  decided('E-4 · E-7', 'the empty Right column stands as wide as Left, draws the slot of a pane row carried into it one row tall, and takes the row dropped there', r.columns[1].rows.length === 0 && near(r.columns[1].w, r.columns[0].w, 0.5) && near(emptySlot, rowHeight) && intoEmpty && same((await sidesRead(cdp)).columns[1].rows.map((x) => x.label), [TAGS.label]), show({ before: r.columns[1].rows.length, widths: r.columns.map((c) => c.w), emptySlot, rowHeight, sides: viewOnDisk(EMPTY.id)?.column_sides }))
  await closeAll(cdp)
  // E-4 · a name past the cap: both columns at it, the name cut in an ellipsis that scrolls on hover, the widths holding while that row is carried out of its column.
  const longLabel = 'VL A Property Named Past the Column Cap'
  const longId = await addTextProperty(cdp, longLabel)
  const LONGPANE = listView(vid('g11panelong'), 'VL Pane Long', { ...flatVL, property_order: ['_title', STAGE.id, longId] })
  await showOn(cdp, 'collection', LONGPANE)
  await door(cdp, 'settings', 'Visibility')
  r = await sidesRead(cdp)
  const capped = widthErrors(r)
  const longName = `[...(${sideRowEl(longLabel)}).querySelectorAll('*')].find((e) => !e.children.length && e.textContent.trim() && !e.closest('button'))`
  const nameAt = await boxOf(cdp, longName)
  await away(cdp, nameAt)
  await wheel(cdp, nameAt, 0, 120, 500)
  const nameScroll = await cdp.evaluate(`(() => { let e = ${longName}; while (e && !(e.scrollLeft > 0)) e = e.parentElement; return e ? e.scrollLeft : 0 })()`)
  const longHeld = await paneDrag(cdp, sideRowEl(longLabel), { x: r.columns[0].zone.x, y: r.columns[0].rows.at(-1).box.b - 2 }, async () => { const h = await sidesRead(cdp); await pressKey(cdp, 'Escape'); return h })
  decided('E-4', 'a property name past the cap stands both columns at 180px, cut in an ellipsis that scrolls on hover, and the widths hold while its row is carried out of its column', r.columns.every((c) => near(c.w, PANE_CAP, 0.5)) && capped.length === 0 && nameScroll > 0 && !!longHeld?.held && longHeld.columns.every((c) => near(c.w, PANE_CAP, 0.5)), show({ capped, widths: r.columns.map((c) => c.w), nameScroll, held: longHeld?.columns.map((c) => c.w) }))
  await closeAll(cdp)
  await dropProperty(cdp, longId)
  // Ten Text properties more than the pane's 440px holds, assigned for this case alone.
  const fillers = []
  for (let i = 1; i <= 10; i++) fillers.push(await addTextProperty(cdp, `VL Filler ${i}`))
  const TALL = listView(vid('g11panetall'), 'VL Pane Tall', { ...flatVL, property_order: [...EVERY_ORDER, ...fillers] })
  await showOn(cdp, 'collection', TALL)
  await door(cdp, 'settings', 'Visibility')
  await cdp.evaluate(PANE_TO('foot'))
  await sleep(400)
  r = await sidesRead(cdp)
  const rightLabels = r.columns[1].rows.map((x) => x.label)
  const last = r.columns[1].rows.at(-1)
  await paneDrag(cdp, sideRowEl(last.label), { x: last.box.x, y: r.columns[1].rows.at(-3).box.t + 3 })
  const scrolledOrder = await settles(async () => (await sidesRead(cdp)).columns[1].rows.map((x) => x.label).indexOf(last.label) === rightLabels.length - 3)
  decided('E-7', 'a pane row dragged in a scrolled column reorders it', !!r.scroll && r.scroll.top > 0 && scrolledOrder && shapeErrors(await sidesRead(cdp), viewOnDisk(TALL.id)).length === 0, show({ scroll: r.scroll, rightLabels, after: (await sidesRead(cdp)).columns[1].rows.map((x) => x.label) }))
  // E-10 · a still hold of over a second over the column's foot, the carried row's own slot scrolled out of view at its head: the slot stays where it opened.
  await cdp.evaluate(PANE_TO('head'))
  await sleep(300)
  r = await sidesRead(cdp)
  const lifted = r.columns[1].rows[1].box
  const move = async (x, y) => { await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1 }); await sleep(16) }
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: lifted.x, y: lifted.y, button: 'none' })
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: lifted.x, y: lifted.y, button: 'left', buttons: 1, clickCount: 1 })
  for (let i = 1; i <= 6; i++) await move(lifted.x, lifted.y + i * 4)
  await cdp.evaluate(PANE_TO('foot'))
  await sleep(300)
  const paneAtFoot = await sidesRead(cdp)
  const footRow = paneAtFoot.columns[1].rows.at(-3).box
  for (let i = 1; i <= 10; i++) await move(lifted.x, lifted.y + 24 + ((footRow.y - lifted.y - 24) * i) / 10)
  await sleep(500)
  const heldStill = (await cdp.evaluate(HELD)).held
  await cdp.evaluate(ARM_FRAMES(`(${COLUMN_EDGE(1)})?.tops`))
  await sleep(1300)
  const still = await frames(cdp)
  const stillTops = still[0] ?? []
  const stillPitch = Math.min(...stillTops.slice(1).map((t, i) => t - stillTops[i]))
  const slotAt = stillTops.findIndex((t, i) => i > 0 && t - stillTops[i - 1] > stillPitch * 1.5 && footRow.y > stillTops[i - 1] + stillPitch - 0.5 && footRow.y < t + 0.5)
  await pressKey(cdp, 'Escape')
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: lifted.x, y: footRow.y, button: 'left', buttons: 0, clickCount: 1 })
  await sleep(800)
  decided('E-10', 'a row held still for over a second over the column\'s foot, its own slot scrolled out of view, opens its slot under the pointer and keeps it there', heldStill && paneAtFoot.scroll?.top > 0 && slotAt > 0 && still.length === 1, show({ heldStill, slotAt, pointer: footRow.y, scroll: paneAtFoot.scroll, readings: still.length, still: still.slice(0, 3) }))
  await closeAll(cdp)
  for (const id of fillers) await dropProperty(cdp, id)

  // E-10 · a View Tile low on its board opens its settings upward: a row carried into Right grows the column, the pane grows up under the pointer, and the slot opens in the gap the pointer is over, where the row lands.
  const UP = listView(vid('g11paneup'), 'VL Pane Up', { ...flatVL, property_order: ['_title', STAGE.id, TAGS.id, DUE.id, NOTE.id, SITE.id] })
  await showTile(cdp, [UP])
  const filler = { id: `01KZVD${'7'.padStart(20, '0')}`, type: 'view', active: 0, display_title: 'VL Filler Board', views: [{ source_id: tileSource, config: { type: 'table', icon: 'view-table', group: { kind: 'flat' }, property_order: ['_title'], hidden_properties: [] } }] }
  const board = JSON.parse(readRel(TILES))
  const low = Math.max(200, (await cdp.evaluate('innerHeight')) - 420)
  writeFileSync(abs(TILES), JSON.stringify({ ...board, layout: { bands: [{ node: { kind: 'tile', id: filler.id, h: low } }, ...board.layout.bands] }, tiles: [filler, ...board.tiles] }, null, 2))
  await until('the low tile', async () => cdp.evaluate(`[...document.querySelectorAll('[aria-label="View settings"]')].filter((e) => e.getClientRects().length).length === 2`))
  await sleep(600)
  const upButton = `[...document.querySelectorAll('[aria-label="View settings"]')].filter((e) => e.getClientRects().length).at(-1)`
  await mouseClick(cdp, upButton)
  await until('the tile\'s settings', async () => cdp.evaluate(`!!${portalRow('Visibility')}`))
  await click(cdp, portalRow('Visibility'))
  await until('the tile\'s columns', async () => !!(await sidesRead(cdp)).columns)
  await sleep(500)
  r = await sidesRead(cdp)
  const opensUp = await cdp.evaluate(`(${TOP_LAYER}).firstElementChild.getBoundingClientRect().bottom <= (${upButton}).getBoundingClientRect().top + 1`)
  const [r0, r1] = r.columns[1].rows
  const gapAt = { x: r0.box.x, y: r0.box.b - 4 }
  const carriedLabel = firstLeftOf(r)
  const slotRead = await paneDrag(cdp, sideRowEl(carriedLabel), gapAt, () => cdp.evaluate(COLUMN_EDGE(1)))
  const tops = slotRead?.tops ?? []
  const pitch = r1.box.t - r0.box.t
  const opened = tops.findIndex((t, i) => i > 0 && t - tops[i - 1] > pitch * 1.5)
  const pointerIn = opened > 0 && gapAt.y > tops[opened - 1] + pitch - 0.5 && gapAt.y < tops[opened] + 0.5
  const landed = await settles(async () => (await sidesRead(cdp))?.columns?.[1].rows.map((x) => x.label).indexOf(carriedLabel) === opened)
  decided('E-10', 'a View Tile low on its board opens its settings upward, and a row carried into Right between two rows opens its slot under the pointer and lands at that slot', opensUp && opened === 1 && pointerIn && landed, show({ opensUp, tops, opened, pointer: gapAt.y, landed: (await sidesRead(cdp))?.columns?.[1].rows.map((x) => x.label) }))
  await closeAll(cdp)
  await toCollection(cdp, COLLECTION)

  // The editor door: a drag across, the eye, and Escape on a lift leaving the editor open.
  await showOn(cdp, 'collection', V)
  await door(cdp, 'editor', 'Layout')
  await countSaves()
  r = await sidesRead(cdp)
  const fromRight = r.columns[1].rows[0].label
  await paneDrag(cdp, sideRowEl(fromRight), { x: r.columns[0].zone.x, y: r.columns[0].rows.at(-1).box.b - 2 })
  const editorCross = await settles(async () => (await sidesRead(cdp)).columns[0].rows.some((x) => x.label === fromRight) && sideOf(stored(), idOfLabel(fromRight)) === 'left')
  decided('E-2 · E-7', 'through the editor door, a pane row dragged from Right into Left lands there in one save', editorCross && (await saves()) === 1 && shapeErrors(await sidesRead(cdp), stored()).length === 0, show({ fromRight, saves: await saves() }))
  await mouseClick(cdp, ctl(`Hide ${fromRight}`))
  const editorEye = await settles(async () => (await sidesRead(cdp)).columns[0].hidden.some((x) => x.label === fromRight))
  await mouseClick(cdp, ctl(`Show ${fromRight}`))
  const editorShown = await settles(async () => (await sidesRead(cdp)).columns[0].rows.some((x) => x.label === fromRight))
  decided('E-2 · E-5', 'through the editor door, the eye hides a property to its foot and shows it again', editorEye && editorShown, show({ editorEye, editorShown }))
  await countSaves()
  await keySteps(cdp, sideRowEl(STAGE.label), ['ArrowUp', 'Escape'], 600)
  decided('E-2 · E-7', 'Escape on a lifted pane row through the editor door cancels it and leaves the editor open', (await saves()) === 0 && (await cdp.evaluate(`!!${BACK_BAR}`)) && !!(await sidesRead(cdp))?.columns, show({ saves: await saves() }))
  await stopCounting()
}

// ── Group 11 · the switches and the kind ────────────────────────────────────

const switchEl = (label) => visible(`[...document.querySelectorAll('[role=switch][aria-label="${label}"]')]`)
const railsDrawn = async (cdp) => (await cdp.evaluate(RAILS)).filter((b) => b.drawn).length
/** List's three switches: the key each writes, the value it writes switched on, and what the List draws for it. */
const LIST_SWITCHES = [
  { label: 'Title Icons', key: 'hide_page_icons', checked: (v) => !v, draws: async (cdp) => (await readList(cdp)).rows.some((r) => r.left.parts.some((p) => p.kind === 'title' && p.icon)) },
  { label: 'Outlines', key: 'hide_outlines', checked: (v) => !v, draws: async (cdp) => (await railsDrawn(cdp)) > 0 },
  { label: 'Wrap Rows', key: 'wrap_rows', checked: (v) => !!v, draws: async (cdp) => wrapped(rowIn(await readList(cdp), 'VL Crowded')) },
]

async function switches(cdp) {
  const V = listView(vid('g11switch'), 'VL Switches', { property_order: LIST_ORDER })
  await showOn(cdp, 'collection', V)
  await listPages(cdp)
  for (const which of ['editor', 'settings']) {
    await door(cdp, which, which === 'settings' ? 'Layout' : undefined)
    const found = await cdp.evaluate(`[${LIST_SWITCHES.map((w) => `!!(${switchEl(w.label)})`).join(', ')}]`)
    decided('F-1 · F-2 · I-5', `List's Title Icons, Outlines, and Wrap Rows sit ${which === 'editor' ? 'at the view editor\'s root, before Layout is pressed' : 'in the footing of Settings\' Layout'}`, found.every(Boolean), show(found))
    for (const w of LIST_SWITCHES) {
      for (const turn of [0, 1]) {
        await door(cdp, which, which === 'settings' ? 'Layout' : undefined)
        const was = viewOnDisk(V.id)?.[w.key]
        const checkedBefore = await cdp.evaluate(`(${switchEl(w.label)}).getAttribute('aria-checked') === 'true'`)
        await mouseClick(cdp, switchEl(w.label))
        const wrote = await settles(async () => !!viewOnDisk(V.id)?.[w.key] !== !!was)
        await closeAll(cdp)
        const now = viewOnDisk(V.id)?.[w.key]
        const drawn = await w.draws(cdp)
        decided('F-1 · F-2 · G-1 · H-1', `through the ${which === 'settings' ? 'Settings door' : 'editor door'}, ${w.label} switched ${w.checked(now) ? 'on' : 'off'} writes ${w.key} and the List ${w.checked(now) ? 'draws' : 'stops drawing'} it`, wrote && checkedBefore === w.checked(was) && drawn === w.checked(now), show({ was, now, checkedBefore, drawn, turn }))
      }
    }
  }
  await showView(cdp, tableView(vid('g11switchtable'), 'VL Switch Table'))
  await door(cdp, 'editor')
  const tableRoot = await cdp.evaluate(`!!(${switchEl('Title Icons')})`)
  await door(cdp, 'settings', 'Layout')
  const tableLayout = await cdp.evaluate(`!!(${switchEl('Title Icons')})`)
  decided('F-2', 'Table\'s Title Icons stays in Layout and off the view editor\'s root', !tableRoot && tableLayout, show({ tableRoot, tableLayout }))
  await closeAll(cdp)

  // B-5 · a List draws no line between rows and offers no switch for one, where a Table does both.
  const BORDERS = `[...document.querySelectorAll('${DRIFT.shell} .data-row[data-rid]')].filter((r) => r.getClientRects().length && !r.closest('[inert]')).flatMap((r) => [r, ...r.querySelectorAll('.data-cell')]).reduce((n, e) => { const cs = getComputedStyle(e); return n + ['Top', 'Bottom'].reduce((m, k) => m + (cs['border' + k + 'Style'] === 'none' ? 0 : parseFloat(cs['border' + k + 'Width'])), 0) }, 0)`
  const SWITCH_LABELS = `[...document.querySelectorAll('[role=switch][aria-label]')].filter((e) => e.getClientRects().length && !e.closest('[inert]')).map((e) => e.getAttribute('aria-label'))`
  const lines = {}
  for (const [kind, make] of [['list', listView], ['table', tableView]]) {
    await showOn(cdp, 'collection', make(vid(`g11lines${kind}`), `VL Lines ${kind}`, { property_order: LIST_ORDER, hide_borders: false }))
    lines[kind] = { borders: await cdp.evaluate(BORDERS) }
    await door(cdp, 'settings', 'Layout')
    lines[kind].switches = await cdp.evaluate(SWITCH_LABELS)
    await closeAll(cdp)
  }
  decided('B-5 · G-1 · H-1', 'a List draws no line between its rows, its Hide Borders stored off, and its Layout offers no switch for one but Outlines and Wrap Rows, where a Table draws them and offers Hide Borders and neither of List\'s', lines.list.borders === 0 && !lines.list.switches.includes('Hide Borders') && ['Outlines', 'Wrap Rows'].every((l) => lines.list.switches.includes(l) && !lines.table.switches.includes(l)) && lines.table.borders > 0 && lines.table.switches.includes('Hide Borders'), show(lines))

  // G-1 · G-2 · each way a band ends its rail, at every depth of Sets nested five deep, wide and with its last row wrapped: a row, an open band ending on a row, the hover ghost, a closed band, and an open band ending on a closed one.
  const drop = await deepChain(cdp)
  await showOn(cdp, 'collection', listView(vid('g11railends'), 'VL Rail Ends', { property_order: LIST_ORDER, wrap_rows: true }))
  await until('the deepest band', async () => cdp.evaluate(`!!${head(DEPTHS.at(-1))}`))
  await listPages(cdp)
  const ends = {}
  for (const [label, w] of [['open', null], ['open, wrapped', NARROW]]) {
    await viewport(cdp, w)
    ends[label] = await cdp.evaluate(RAILS)
  }
  await viewport(cdp, null)
  await hover(cdp, listRow(deepRow(DEPTHS.at(-1))), 1600)
  ends.ghost = await cdp.evaluate(RAILS)
  await away(cdp)
  await sleep(900)
  for (const name of [...DEPTHS].reverse()) {
    await mouseClick(cdp, chevronOf(head(name)))
    await until(`${name} closed`, async () => (await expanded(cdp, head(name))) === 'false', 3000)
    ends[`${name} closed`] = await cdp.evaluate(RAILS)
    await mouseClick(cdp, chevronOf(head(name)))
    await until(`${name} open`, async () => (await expanded(cdp, head(name))) === 'true', 3000)
  }
  await drop()
  const drawn = Object.values(ends).flat().filter((b) => b.drawn)
  const seen = [...new Set(drawn.map((b) => b.ending))]
  const deepest = Object.fromEntries(seen.map((e) => [e, Math.max(...drawn.filter((b) => b.ending === e).map((b) => b.levels))]))
  const endErrors = Object.fromEntries(Object.entries(ends).map(([k, r]) => [k, railErrors(r, true)]))
  decided('G-1 · G-2', 'a band\'s rail ends its outline gap above its last member when that is a row, an open band ending on a row, the hover ghost, a closed band, or an open band ending on a closed one, through as many open bands as Sets nested five deep hold, wide and with the last row wrapped', ['a row', 'an open band ending on a row', 'the ghost', 'a closed or empty band', 'an open band ending on a closed band'].every((e) => seen.includes(e)) && ['an open band ending on a row', 'the ghost', 'an open band ending on a closed band'].every((e) => deepest[e] >= 4) && Object.values(endErrors).every((e) => e.length === 0), show({ deepest, endErrors }))
}

const TILE = (label) => visible(`[...document.querySelectorAll('button[aria-label="${label}"]')]`)
const DRAWS = { list: '.list-view', table: `${DRIFT.shell} .table-head`, cards: '.cards-view' }

async function kinds(cdp) {
  // B-11 · a column dragged ahead of Title in a Table draws ahead of the title once the view is a List.
  const AHEAD = tableView(vid('g11ahead'), 'VL Ahead', { ...flatVL, property_order: ['_title', STAGE.id, DUE.id] })
  await showView(cdp, AHEAD)
  await listPages(cdp)
  const stageHead = await boxOf(cdp, header(STAGE.label))
  const titleHead = await boxOf(cdp, header('Title'))
  await dragPoints(cdp, stageHead, { x: titleHead.left + 3, y: titleHead.y })
  const reordered = await settles(async () => viewOnDisk(AHEAD.id)?.property_order?.[0] === STAGE.id)
  await door(cdp, 'settings', 'Layout')
  await mouseClick(cdp, TILE('List'))
  await settles(async () => viewOnDisk(AHEAD.id)?.type === 'list')
  await closeAll(cdp)
  const both = rowIn(await readList(cdp), 'VL Both')
  decided('B-11', 'a property dragged ahead of Title in a Table view draws ahead of the title once the view is a List', reordered && same(both?.left.parts.filter((p) => p.kind !== 'bar').map((p) => p.kind), ['seat', 'title']), show({ order: viewOnDisk(AHEAD.id)?.property_order, left: both?.left.parts.map((p) => p.kind) }))

  const start = tableView(vid('g11kinds'), 'VL Kinds', { property_order: [STAGE.id, '_title', TAGS.id, DUE.id, NOTE.id, SITE.id], hidden_properties: [NOTE.id], column_sides: { [DUE.id]: 'left', [STAGE.id]: 'right' }, ...flatVL })
  await showView(cdp, start)
  await listPages(cdp)
  const kept = (v) => ({ order: v.property_order, hidden: v.hidden_properties, sides: v.column_sides })
  const original = kept(viewOnDisk(start.id))
  let tableRows = await rowHeights(cdp)
  for (const [which, to] of [['settings', 'list'], ['settings', 'table'], ['editor', 'list'], ['editor', 'cards'], ['settings', 'list']]) {
    await door(cdp, which, which === 'settings' ? 'Layout' : undefined)
    await mouseClick(cdp, TILE(to[0].toUpperCase() + to.slice(1)))
    const typed = await settles(async () => viewOnDisk(start.id)?.type === to)
    await closeAll(cdp)
    const drawsIt = await settles(async () => cdp.evaluate(`!!${visible(`[...document.querySelectorAll('${DRAWS[to]}')]`)}`), 3000)
    const stored = viewOnDisk(start.id)
    const extra = to === 'list' ? structureErrors(stored, await readList(cdp)) : to === 'table' ? (await headTexts(cdp)).filter((h) => h === NOTE.label) : []
    const rows = to === 'list' ? (await readList(cdp)).rows.filter((r) => !wrapped(r)).map((r) => r.row.h) : []
    const shorter = to !== 'list' || (rows.length > 0 && Math.max(...rows) < Math.min(...tableRows) - 1)
    decided('A-1 · I-4', `the ${which === 'settings' ? 'Settings door\'s' : 'editor door\'s'} ${to} tile switches the view to ${to}, its order, sides, and hidden set kept${to === 'list' ? ', each row drawn by them and shorter than the Table row it replaced' : ''}`, typed && drawsIt && same(kept(stored), original) && extra.length === 0 && shorter, show({ typed, drawsIt, kept: kept(stored), extra, rows: rows.slice(0, 3), tableRows: tableRows.slice(0, 3) }))
    if (to === 'table') tableRows = await rowHeights(cdp)
  }
  await countSaves()
  await door(cdp, 'settings', 'Layout')
  await mouseClick(cdp, TILE('Gallery'))
  await sleep(800)
  decided('A-3', 'the Gallery tile on a List writes nothing and leaves it a List', (await saves()) === 0 && viewOnDisk(start.id)?.type === 'list', show({ saves: await saves(), type: viewOnDisk(start.id)?.type }))
  await stopCounting()
  await closeAll(cdp)
  await showView(cdp, { ...listView(vid('g11gallery'), 'VL Gallery', flatVL), type: 'gallery' })
  const drawn = await cdp.evaluate(`Object.fromEntries(Object.entries(${show(DRAWS)}).map(([k, sel]) => [k, !!${visible('[...document.querySelectorAll(sel)]')}]))`)
  decided('A-3', 'a view saved as a Gallery, which has no renderer, draws as a Table', same(drawn, { list: false, table: true, cards: false }), show(drawn))

  // G-1 · H-1 · a Table view of Sets switched to a List draws with Outlines on and Wrap Rows off.
  const FRESH = tableView(vid('g11fresh'), 'VL Fresh', { property_order: LIST_ORDER })
  await showView(cdp, FRESH)
  await door(cdp, 'settings', 'Layout')
  await mouseClick(cdp, TILE('List'))
  await settles(async () => viewOnDisk(FRESH.id)?.type === 'list')
  await closeAll(cdp)
  const fresh = { stored: viewOnDisk(FRESH.id), rails: await railsDrawn(cdp), crowded: wrapped(rowIn(await readList(cdp), 'VL Crowded')) }
  await door(cdp, 'settings', 'Layout')
  fresh.switches = await cdp.evaluate(`({ outlines: (${switchEl('Outlines')})?.getAttribute('aria-checked'), wrap: (${switchEl('Wrap Rows')})?.getAttribute('aria-checked') })`)
  await closeAll(cdp)
  decided('G-1 · H-1', 'a view newly switched to a List draws its rails, Outlines on, and doesn\'t wrap its crowded row, Wrap Rows off', fresh.rails > 0 && !fresh.crowded && fresh.switches.outlines === 'true' && fresh.switches.wrap === 'false' && !fresh.stored.hide_outlines && !fresh.stored.wrap_rows, show(fresh))

  // G-3 · Colored Outlines draws an option band's rail in its chip's solid, at the top level and under a Set, and a Set's rail in the outline token.
  const RAIL_COLORS = `[...document.querySelectorAll('.list-view .group-band:not(.band-tail)')].filter((b) => b.getClientRects().length).map((b) => { const reveal = b.querySelector(':scope > [data-reveal]'); const paint = (v) => { const p = document.createElement('span'); p.style.background = v; reveal.appendChild(p); const c = getComputedStyle(p).backgroundColor; p.remove(); return c }; return { option: !!b.style.getPropertyValue('--band-color'), rail: getComputedStyle(reveal, '::before').backgroundColor, band: paint('var(--band-color)'), token: paint('var(--list-outline-color)') } })`
  const colored = {}
  for (const [label, grouping, on] of [['property', byStage, true], ['sub-group', subGrouped, true], ['off', byStage, false]]) {
    await showOn(cdp, 'collection', listView(vid(`g11colored${label}`), `VL Colored ${label}`, { ...grouping, colored_outlines: on }))
    await listPages(cdp)
    colored[label] = await cdp.evaluate(RAIL_COLORS)
  }
  const railsIn = (bands, on) => bands.some((b) => b.option) && bands.every((b) => b.rail === (on && b.option ? b.band : b.token) && (!b.option || b.band !== b.token))
  decided('G-3', 'with Colored Outlines on, each option band\'s rail draws in its chip\'s solid at the top level and under a Set, a Set\'s rail keeps the outline token, and with it off every rail does', railsIn(colored.property, true) && railsIn(colored['sub-group'], true) && colored['sub-group'].some((b) => !b.option) && railsIn(colored.off, false), show(colored))

  // D-1 · a property's side is its own setting: a Table alignment moves nothing on a List, and a side aligns nothing on a Table.
  const ALIGNED = listView(vid('g11aligned'), 'VL Aligned', { ...flatVL, column_alignments: { [STAGE.id]: 'right', [DUE.id]: 'left' }, column_sides: { [COUNT.id]: 'left' } })
  await showOn(cdp, 'collection', ALIGNED)
  const sides = structureErrors(ALIGNED, await readList(cdp))
  const ALIGN = (id) => `(() => { const c = (${tableRowOf('VL Crowded')}).querySelectorAll('.data-cell')[${LIST_ORDER.indexOf(id)}]; const cs = getComputedStyle(c); const inner = c.firstElementChild ? getComputedStyle(c.firstElementChild) : cs; return [cs.textAlign, cs.justifyContent, inner.textAlign, inner.justifyContent].join(' ') })()`
  const aligns = {}
  for (const [key, extra] of [['sided', {}], ['unsided', { column_sides: {} }]]) {
    await showView(cdp, { ...ALIGNED, ...extra, id: vid(`g11aligned${key}`), name: `VL Aligned ${key}`, type: 'table' })
    aligns[key] = { stage: await cdp.evaluate(ALIGN(STAGE.id)), count: await cdp.evaluate(ALIGN(COUNT.id)) }
  }
  decided('D-1', 'a List draws each property on its side whatever its Table alignment, and a Table aligns VD Stage right by its alignment and VL Count alike whether or not the List stores it Left', sides.length === 0 && /right|end/.test(aligns.sided.stage) && same(aligns.sided, aligns.unsided), show({ sides, aligns }))
}

// ── Group 11 · the spacing between groups and the banner line ─────────────────

async function closeTab(cdp, title) {
  await hover(cdp, tabEl(title), 300)
  await mouseClick(cdp, `(${tabEl(title)}).querySelector('[aria-label="Close Tab"]')`)
  await until(`${title}'s tab closed`, async () => !(await tabTitles(cdp)).includes(title), 4000)
}
/** The room that reads between each band head, row, or hover ghost and the one above it, and from the last to the view's end: content to content, inside a head's and a row's lead cell's padding, in the view's own pixels. */
const ROOMS = `(() => {
  const shell = ${visible(`[...document.querySelectorAll('.table-shell')]`)}
  const inner = (e) => { const b = e.getBoundingClientRect(), cs = getComputedStyle(e), z = e.currentCSSZoom ?? 1; return { t: b.top + parseFloat(cs.paddingTop) * z, b: b.bottom - parseFloat(cs.paddingBottom) * z, z } }
  const kind = (e) => (e.classList.contains('group-band-head') ? 'head' : e.closest('.band-tail') ? 'tail' : 'row')
  const els = [...shell.querySelectorAll('.data-row[data-rid], .data-row.ghost-row, .group-band-head')].filter((e) => e.getClientRects().length && e.getBoundingClientRect().height > 0)
  const items = els.map((e) => ({ id: e.classList.contains('ghost-row') ? 'ghost' : (e.getAttribute('aria-label') ?? e.dataset.rid), kind: kind(e), ...inner(kind(e) === 'head' ? e : e.querySelector('.data-cell')) }))
  const room = (a, b) => Math.round((b - a) / items[0].z * 100) / 100
  const end = { id: 'end', kind: 'end', t: inner(shell.querySelector('.table-grid')).b }
  return [...items.slice(1), end].map((e, i) => ({ id: e.id, pair: items[i].kind + '>' + e.kind, room: room(items[i].b, e.t) }))
})()`
const SPACINGS = [
  ['Sets, open and nested five deep', {}, []],
  ['Sets nested five deep, the deepest closed', {}, [DEPTHS.at(-1)]],
  ['Sets nested five deep, the third level closed', {}, [DEPTHS[0]]],
  ['Sets, every band closed', {}, ['Set Alpha', 'Set Beta']],
  ['a nested band closed', {}, ['Sub-Set A']],
  ['property bands, open', byStage, []],
  ['property bands, every band closed', byStage, ['Todo', 'Doing', 'Done']],
  ['Sets sub-grouped by a property, open', subGrouped, []],
  ['Sets sub-grouped by a property, Set Beta first', { ...subGrouped, group_order: [IDS.beta, IDS.alpha] }, []],
  ['Sets, the ungrouped rows on top', { ungrouped_placement: 'top' }, []],
]
const LINE = (cls) => `(() => { const e = ${visible(`[...document.querySelectorAll('${cls}')]`)}; if (!e) return null; const b = e.getBoundingClientRect(); return { l: Math.round(b.left * 10) / 10, r: Math.round(b.right * 10) / 10, border: getComputedStyle(e).borderBottomWidth } })()`

async function frame(cdp) {
  // B-15 · the room that reads between a List's groups is a Table's, with Sets nested five deep: from a band's last row or the tail's to the next heading, between headings, and to the view's end; a heading to its first row stays compact (stated), and the room before the ungrouped tail rows is measured.
  const drop = await deepChain(cdp)
  await listPages(cdp)
  for (const [name, grouping, closed] of SPACINGS) {
    const rooms = {}
    for (const kind of ['list', 'table']) {
      const v = (kind === 'list' ? listView : tableView)(vid(`g11gap${kind}${SPACINGS.findIndex((x) => x[0] === name)}`), `VL Gaps ${kind}`, { ...grouping, property_order: LIST_ORDER })
      await showOn(cdp, 'collection', v)
      for (const label of closed) {
        await mouseClick(cdp, chevronOf(head(label)))
        await until(`${label} closed`, async () => (await expanded(cdp, head(label))) === 'false', 3000)
      }
      await away(cdp)
      await sleep(400)
      rooms[kind] = await cdp.evaluate(ROOMS)
      if (kind === 'list' && closed.length === 2) await shot(cdp, 'g11-closed-sets')
    }
    const pairs = rooms.list.map((l, i) => ({ ...l, table: rooms.table[i]?.id === l.id ? rooms.table[i].room : null }))
    const kept = pairs.filter((p) => ['row>head', 'head>head', 'row>end', 'tail>head', 'tail>end'].includes(p.pair))
    const off = kept.filter((p) => p.table === null || Math.abs(p.room - p.table) > 0.5)
    const compact = pairs.filter((p) => p.pair === 'head>row' && !(p.room < p.table))
    decided('B-15', `a List with ${name} reads a Table's room from a band's last row or the tail's to the next heading, between headings, and to its end, and a heading's own room to its first row stays under it (stated)`, rooms.list.length === rooms.table.length && kept.some((p) => p.room > 0) && off.length === 0 && compact.length === 0, show({ off, compact, kept }))
    note('B-15', `${name}: the room before and between the ungrouped tail rows, List against Table`, pairs.filter((p) => p.pair.endsWith('>tail')).map((p) => [p.pair, p.room, p.table]))
  }
  // B-15 · the hover ghost under a band's last row, before a nested band, before a sibling, and five bands deep before a sibling of its fourth enclosing band: the heading below moves by the ghost's height and stands a Table's room below the ghost.
  const ghosts = {}
  for (const [kind, make, rowOf] of [['list', listView, listRow], ['table', tableView, tableRowOf]]) {
    await showOn(cdp, 'collection', make(vid(`g11ghostgap${kind}`), `VL Ghost Gap ${kind}`, { property_order: LIST_ORDER }))
    for (const [title, next] of [[`VL One ${LONG}`, 'Sub-Set A'], ['Beta 1', 'VL Rows'], [deepRow(DEPTHS.at(-1)), 'Sub-Set B']]) {
      const top = () => cdp.evaluate(`(${head(next)}).getBoundingClientRect().top`)
      await cdp.evaluate(`(${rowOf(title)}).scrollIntoView({ block: 'center' })`)
      await away(cdp)
      await sleep(700)
      const rest = await top()
      await hover(cdp, rowOf(title), 1600)
      const ghost = await cdp.evaluate(`(${GHOST_ROW})?.getBoundingClientRect().height ?? null`)
      const up = await top()
      const room = (await cdp.evaluate(ROOMS)).find((p) => p.id === next && p.pair === 'row>head')?.room
      await away(cdp)
      await sleep(900)
      ghosts[`${kind} ${next}`] = { ghost, moved: up - rest, back: (await top()) - rest, room }
    }
  }
  const ghostOff = Object.entries(ghosts).filter(([k, g]) => !g.ghost || !near(g.moved, g.ghost, 0.5) || !near(g.back, 0, 0.5) || (k.startsWith('list') && !near(g.room, ghosts[k.replace('list', 'table')].room, 0.5)))
  await drop()
  decided('B-15', 'with the hover ghost up under a band\'s last row, before a nested band, before a sibling, and five bands deep, the heading below moves by exactly the ghost\'s height and back, and stands a Table\'s room below the ghost', ghostOff.length === 0 && Object.keys(ghosts).length === 6, show(ghosts))

  // B-14 · the line under a bannerless header is inset over a List as over Cards; under a banner it spans alike over every kind (stated).
  const lines = { bannerless: {}, banner: {} }
  for (const kind of ['list', 'cards', 'table']) {
    const make = { list: listView, cards: cardsView, table: tableView }[kind]
    await showSetView(cdp, make(vid(`g11line${kind}`), `VL Line ${kind}`, { property_order: LIST_ORDER }))
    lines.bannerless[kind] = await cdp.evaluate(LINE('.banner-empty'))
    await showOn(cdp, 'collection', make(vid(`g11banner${kind}`), `VL Banner ${kind}`, { property_order: LIST_ORDER }))
    lines.banner[kind] = await cdp.evaluate(LINE('.banner'))
  }
  const bl = lines.bannerless
  decided('B-14', 'the line under a bannerless header over a List is inset as over Cards, not bled as over a Table', !!bl.list && same(bl.list, bl.cards) && !same(bl.list, bl.table), show(bl))
  decided('B-14', 'the line under a banner spans alike over a List, Cards, and a Table (stated)', !!lines.banner.list && same(lines.banner.list, lines.banner.cards) && same(lines.banner.list, lines.banner.table), show(lines.banner))
}

// ── Group 11 · the shared pieces' regressions ───────────────────────────────

async function shared(cdp) {
  // E-6 · a hidden Table column keeps its place through a heading drag.
  const T = tableView(vid('g11hiddenplace'), 'VL Hidden Place')
  await showView(cdp, T)
  await menuChoose(cdp, header(DONE.label), 'Hide')
  await settles(async () => (viewOnDisk(T.id)?.hidden_properties ?? []).includes(DONE.id))
  const from = await boxOf(cdp, header(STAGE.label))
  const to = await boxOf(cdp, header(DUE.label))
  await dragPoints(cdp, from, { x: to.right - 3, y: to.y })
  await settles(async () => before(viewOnDisk(T.id).property_order, DUE.id, STAGE.id))
  await door(cdp, 'settings', 'Visibility')
  await mouseClick(cdp, ctl(`Show ${DONE.label}`))
  await settles(async () => !(viewOnDisk(T.id)?.hidden_properties ?? []).includes(DONE.id))
  await closeAll(cdp)
  const heads = await headTexts(cdp)
  decided('E-6', 'a hidden Table column shown again after another column was dragged past it returns to its own place', same(heads.slice(1), [DONE.label, DUE.label, STAGE.label]), show({ heads, order: viewOnDisk(T.id)?.property_order }))

  // E-6 · the same on Cards, its property reordered through its Visibility pane's list.
  const CE = cardsView(vid('g11hiddencards'), 'VL Hidden Cards', { property_order: ['_title', STAGE.id, DONE.id, DUE.id] })
  await showView(cdp, CE)
  await door(cdp, 'settings', 'Visibility')
  const lineRow = (label) => `${DROPDOWN_ROWS}.find((r) => r.getClientRects().length && r.textContent.trim() === ${JSON.stringify(label)})`
  await mouseClick(cdp, ctl(`Hide ${DONE.label}`))
  await settles(async () => (viewOnDisk(CE.id)?.hidden_properties ?? []).includes(DONE.id))
  await sleep(400)
  const dueRow = await boxOf(cdp, lineRow(DUE.label))
  await dragPoints(cdp, await boxOf(cdp, lineRow(STAGE.label)), { x: dueRow.x, y: dueRow.bottom - 3 })
  await settles(async () => before(viewOnDisk(CE.id).property_order, DUE.id, STAGE.id))
  await mouseClick(cdp, ctl(`Show ${DONE.label}`))
  await settles(async () => !(viewOnDisk(CE.id)?.hidden_properties ?? []).includes(DONE.id))
  await closeAll(cdp)
  const cardOrder = await cdp.evaluate(`[...(${card('Page C')}).querySelectorAll('.card-prop-label')].map((e) => e.textContent.trim())`)
  decided('E-6', 'a hidden Cards property shown again after another was dragged past it in Visibility returns to its own place', !(viewOnDisk(CE.id)?.hidden_properties ?? []).includes(DONE.id) && same(viewOnDisk(CE.id)?.property_order, ['_title', DONE.id, DUE.id, STAGE.id]) && same(cardOrder.filter((l) => [DONE.label, DUE.label, STAGE.label].includes(l)), [DONE.label, DUE.label, STAGE.label].filter((l) => cardOrder.includes(l))), show({ order: viewOnDisk(CE.id)?.property_order, cardOrder }))

  // C-4 · a Link's Format on a card and in a Table cell, and none in the Properties panel.
  const formatIn = async (expr) => {
    if (!(await cdp.evaluate(`!!(${expr})`))) return 'not found'
    const rows = await popNative(cdp, await aim(cdp, expr))
    await pickNative([])
    return labels(rows).includes('Format')
  }
  const LT = tableView(vid('g11linktable'), 'VL Link Table', { ...flatVL, property_order: ['_title', SITE.id] })
  await showView(cdp, LT)
  await listPages(cdp)
  const cell = await formatIn(`(${tableRowOf('VL Both')}).querySelectorAll('.data-cell')[1]`)
  const LC = cardsView(vid('g11linkcards'), 'VL Link Cards', { ...flatVL, property_order: ['_title', SITE.id] })
  await showView(cdp, LC)
  const onCard = await formatIn(cardSeat('VL Both', SITE.label))
  await showOn(cdp, 'collection', listView(vid('g11linkopen'), 'VL Link Open', { ...flatVL, property_order: LIST_ORDER }))
  await mouseClick(cdp, `(${listRow('VL Both')}).querySelector('.cell-title-text')`)
  await until('VL Both\'s tab', async () => (await activeTab(cdp)) === 'VL Both')
  // The page's Properties panel, told open by its rows, since a List's + shares the panel's Add Property label.
  const panelOpen = async () => {
    if (!(await cdp.evaluate(`!!document.querySelector('[data-property-row]')`))) await mouseClick(cdp, SETTINGS_BUTTON)
    await until('the Properties panel', () => cdp.evaluate(`!!document.querySelector('[data-property-row]')`))
    await sleep(400)
  }
  await panelOpen()
  const panelSeat = `document.querySelector('[data-property-row="${SITE.id}"]')`
  const inPanel = await formatIn(panelSeat)
  decided('C-4', 'a Link value\'s right-click offers its view\'s Format on a card and in a Table cell, and none in the Properties panel', cell === true && onCard === true && inPanel === false, show({ cell, onCard, inPanel }))

  // I-2 · a panel value pressed and moved 8px lifts nothing, where 20px lifts its row.
  const lift = async (dy) => {
    await panelOpen()
    const a = await boxOf(cdp, `document.querySelector('[data-property-row="${STAGE.id}"]')`)
    let held
    await dragPoints(cdp, a, { x: a.x, y: a.y + dy }, { steps: 4, held: async () => { await sleep(250); held = await cdp.evaluate(`!!document.querySelector('[data-drag-source]')`); if (held) await pressKey(cdp, 'Escape') }, settle: 500 })
    await escapeAll(cdp)
    return held
  }
  const eight = await lift(8)
  const twenty = await lift(20)
  reg('11', 'a value in the Properties panel pressed and moved 8px lifts nothing, where 20px lifts its row', eight === false && twenty === true, show({ eight, twenty }))
  if (await cdp.evaluate(`!!document.querySelector('[data-property-row]')`)) await mouseClick(cdp, SETTINGS_BUTTON)
  await toCollection(cdp, COLLECTION)

  // I-3 · a Table Set band's + still creates in its Set; H-3 · a Table row's grip at its row's center, the List's first line kept out of it.
  await showView(cdp, tableView(vid('g11tableband'), 'VL Table Band'))
  const band = await birth(cdp, async () => {
    await hover(cdp, head('VL Rows'), 400)
    await mouseClick(cdp, `(${head('VL Rows')}).querySelector('${NEW_IN_GROUP}')`)
  }, 'VL Table Band Page')
  const tableBandLast = (JSON.parse(readRel(`${ROWS_SET}/_pageset.json`)).page_order ?? []).at(-1)
  reg('11', 'a Table Set band\'s + still names a newborn last in its Set', band.first?.field && band.landed && band.at === `${ROWS_SET}/VL Table Band Page.md` && tableBandLast === band.first?.rid, show({ band, last: tableBandLast }))
  await trashPage(cdp, band.at)
  const grip = await cdp.evaluate(`(() => { const r = ${tableRowOf('VL Bare')}; const g = r.querySelector('.row-grip').getBoundingClientRect(); const b = r.querySelector('.cell-lead').getBoundingClientRect(); return { off: Math.abs((g.top + g.height / 2) - (b.top + b.height / 2)), firstLine: getComputedStyle(r).getPropertyValue('--row-first-line') } })()`)
  reg('11', 'a Table row\'s grip sits at its lead cell\'s center, List\'s first line unset on it', grip.off <= 0.1 && grip.firstLine === '', show(grip))

  // The drag spill List's pane reads leaves Cards' and the tab bar's drags as they were.
  // A card carried into another Set's band: once where the band's cards leave room on its last row, and once, at a window narrowed until Set Alpha's three cards fill their row, where they don't.
  // List's pages are filtered out, so each band holds the seed's few cards and every card stays in the window as it narrows.
  const CB = cardsView(vid('g11spill'), 'VL Spill Cards', { set_cards: false, filter: { match: 'all', rules: [{ property_id: '_title', op: 'does_not_contain', value: 'VL' }] } })
  await showView(cdp, CB)
  const GRID = (title) => `(() => { const g = (${card(title)}).closest('.cards-grid'); return { cards: g.querySelectorAll('[data-rid]').length, columns: getComputedStyle(g).gridTemplateColumns.split(' ').length, spill: parseFloat(getComputedStyle(g).getPropertyValue('--drag-spill')) || 0 } })()`
  const carry = async (from, onto, lands) => {
    const a = await boxOf(cdp, card(from))
    const b = await boxOf(cdp, card(onto))
    let grid
    await dragPoints(cdp, a, { x: b.x, y: b.y }, { steps: 16, held: async () => { await sleep(400); grid = await cdp.evaluate(GRID(onto)) } })
    const landed = await settles(async () => (await listPages(cdp)).get(PAGES[from].id)?.path === `${lands}/${from}.md`)
    if (landed) await mutate(cdp, { op: 'movePage', path: `${lands}/${from}.md`, newParentPath: PAGES[from].path.slice(0, PAGES[from].path.lastIndexOf('/')) })
    await sleep(600)
    return { grid, landed }
  }
  const roomy = await carry('Page C', 'Beta 1', `${COLLECTION}/Set Beta`)
  let width = naturalSize?.w ?? (await cdp.evaluate('innerWidth'))
  while (width > 480 && (await cdp.evaluate(GRID('Page A'))).columns !== 3) await viewport(cdp, (width -= 20))
  const full = await carry('Beta 1', 'Page A', `${COLLECTION}/Set Alpha`)
  await viewport(cdp, null)
  const arms = [roomy, full].map((r) => !!r.grid && (r.grid.spill > 0) === (r.grid.cards % r.grid.columns === 0) && r.landed)
  reg('11', 'a card carried into another Set\'s band spills that band a row only when its cards fill their last row, and lands in its Set', arms.every(Boolean) && roomy.grid.spill === 0 && full.grid.spill > 0, show({ roomy, full }))
  // The tab bar, an x-axis zone, takes no spill when a foreign item is carried onto it: a nav search's result, its tab not yet open.
  for (const t of (await tabTitles(cdp)).filter((x) => x !== COLLECTION)) await closeTab(cdp, t)
  await mouseClick(cdp, `[...document.querySelectorAll('[aria-label="New Tab"]')].find((e) => e.getClientRects().length && !e.closest('[inert]'))`)
  await until('the nav view', async () => cdp.evaluate(`[...document.querySelectorAll('input.nav-view-search')].some((e) => e.getClientRects().length && !e.closest('[inert]'))`))
  await cdp.evaluate(`[...document.querySelectorAll('input.nav-view-search')].find((e) => e.getClientRects().length && !e.closest('[inert]')).focus()`)
  await typeText(cdp, 'Page')
  await until('the search\'s results', async () => cdp.evaluate(`!!${navRow('Page A')}`))
  await sleep(400)
  const { carried, before, opened } = await navCarry(cdp)
  reg('11', 'a nav search\'s result carried onto the tab bar spills no room there, and opens its tab', carried?.held && carried.spill === false && opened, show({ carried, before, after: await tabTitles(cdp) }))
  for (const t of (await tabTitles(cdp)).filter((x) => x !== COLLECTION)) await closeTab(cdp, t)
  await toCollection(cdp, COLLECTION)

  // H-3 · a Trash row's check at its lead cell's center, on a page this case trashes, and a List band's chevron at its head's center under wrapped rows.
  await mutate(cdp, { op: 'createPage', id: mintPageId(), parentPath: ROWS_SET, name: 'VL Trashed', seeds: {} })
  await trashPage(cdp, `${ROWS_SET}/VL Trashed.md`)
  await openSettings(cdp, 'Trash')
  await until('the Trash rows', async () => cdp.evaluate(`!!document.querySelector('.trash-frame .data-row')`))
  await hover(cdp, `document.querySelector('.trash-frame .data-row')`, 400)
  const check = await cdp.evaluate(`(() => { const r = document.querySelector('.trash-frame .data-row'); const c = r.querySelector('.row-check').getBoundingClientRect(); const b = r.querySelector('.cell-lead').getBoundingClientRect(); return { off: Math.abs((c.top + c.height / 2) - (b.top + b.height / 2)), h: b.height } })()`)
  await closeSettings(cdp)
  await showOn(cdp, 'collection', listView(vid('g11chevron'), 'VL Chevron', { property_order: LIST_ORDER, wrap_rows: true }))
  await viewport(cdp, NARROW)
  const chevrons = await cdp.evaluate(`${HEADS}.map((h) => { const c = h.querySelector('${DRIFT.chevron}, .row-chevron').getBoundingClientRect(); const b = h.getBoundingClientRect(); return Math.round(Math.abs((c.top + c.height / 2) - (b.top + b.height / 2)) * 100) / 100 })`)
  const anyWrapped = (await readList(cdp)).rows.some(wrapped)
  await viewport(cdp, null)
  decided('H-3', 'a Trash row\'s check sits at its lead cell\'s center, and every List band\'s chevron at its head\'s center while rows wrap', check.off <= 0.5 && chevrons.length > 0 && chevrons.every((d) => d <= 0.75) && anyWrapped, show({ check, chevrons, anyWrapped }))
}

/** Every live row's height in the view's own pixels. */
const rowHeights = (cdp) => cdp.evaluate(`${ROWS}.filter((r) => r.getClientRects().length && !r.closest('[inert]')).map((r) => r.getBoundingClientRect().height / (r.currentCSSZoom ?? 1))`)

// ── The eyes and the pane rows' focus ──

const eyeOf = (row) => `(${row})?.querySelector('button[aria-label^="Hide "], button[aria-label^="Show "]')`
const eyeOpacity = (cdp, row) => cdp.evaluate(`(() => { const e = ${eyeOf(row)}; return e ? +getComputedStyle(e).opacity : null })()`)
const keyFocus = async (cdp, row) => { await pressKey(cdp, 'Shift'); await cdp.evaluate(`(${row}).focus()`); await sleep(400) }
/** A shown row's eye at rest, under its row's hover, on its row's keyboard focus, and lifted by Space; a hidden row's eye at rest. */
async function eyeReads(cdp, shown, hidden, { lifts = true } = {}) {
  await away(cdp)
  const rest = await eyeOpacity(cdp, shown)
  const hiddenEye = await eyeOpacity(cdp, hidden)
  await hover(cdp, shown, 500)
  const hovered = await eyeOpacity(cdp, shown)
  await away(cdp)
  await keyFocus(cdp, shown)
  const focused = await eyeOpacity(cdp, shown)
  let lifted = null
  if (lifts) {
    await pressKey(cdp, ' ')
    await sleep(400)
    lifted = await eyeOpacity(cdp, shown)
    await pressKey(cdp, 'Escape')
    await sleep(400)
  }
  await cdp.evaluate('document.activeElement?.blur()')
  return { rest, hovered, focused, lifted, hiddenEye }
}
const GHOST = (cdp) => cdp.evaluate(`+getComputedStyle(document.documentElement).getPropertyValue('--state-ghost')`)
const eyesHold = (r, ghost, lifts = true) => r.rest === 0 && Math.abs(r.hovered - ghost) < 0.01 && Math.abs(r.focused - ghost) < 0.01 && (!lifts || r.lifted === 0) && r.hiddenEye === 1
/** A row wrapper on keyboard focus: its outline, and whether the menu row it holds wears the focus wash. */
const focusLook = async (cdp, row) => {
  await keyFocus(cdp, row)
  const look = await cdp.evaluate(`(() => { const w = (${row}); return { focusVisible: w.matches(':focus-visible'), outline: getComputedStyle(w).outlineStyle, wash: getComputedStyle(w.querySelector('[data-reveal-host]')).backgroundImage } })()`)
  await cdp.evaluate('document.activeElement?.blur()')
  return look
}

async function eyes(cdp) {
  const ghost = await GHOST(cdp)
  const T = tableView(vid('g11eyest'), 'VL Eyes Table', { hidden_properties: [DUE.id], group: { kind: 'property', property_id: STAGE.id }, hidden_groups: [`${STAGE.id}/opt_vd_done`] })
  await showOn(cdp, 'collection', T)
  await door(cdp, 'settings', 'Visibility')
  const tableLook = await focusLook(cdp, paneLine(STAGE.label))
  const tableTitle = await cdp.evaluate(`${eyeOf(paneLine('Title'))} === null`)
  const table = await eyeReads(cdp, paneLine(STAGE.label), paneLine(DUE.label))
  decided('E-11 · E-8', 'a Table\'s Visibility eye rests hidden, shows dimmed on its row\'s hover and keyboard focus, hides while its row is lifted, a hidden row\'s eye stands, and Title holds none', eyesHold(table, ghost) && tableTitle, show({ table, tableTitle, ghost }))
  await door(cdp, 'settings', 'Group')
  const options = await eyeReads(cdp, paneLine('Todo'), paneLine('Done'), { lifts: false })
  decided('E-11', 'a Group pane option\'s eye rests hidden, shows dimmed on its row\'s hover and keyboard focus, and a hidden option\'s eye stands', eyesHold(options, ghost, false), show({ options, ghost }))

  const L = listView(vid('g11eyesl'), 'VL Eyes List', { ...flatVL, property_order: ['_title', STAGE.id, NOTE.id] })
  await showOn(cdp, 'collection', L)
  await door(cdp, 'settings', 'Visibility')
  const sidesLook = await focusLook(cdp, sideRowEl(STAGE.label))
  const sidesTitle = await cdp.evaluate(`${eyeOf(sideRowEl('Title'))} === null`)
  const sides = await eyeReads(cdp, sideRowEl(STAGE.label), sideRowEl(DUE.label, { hidden: true }))
  decided('E-11 · E-8', 'a List\'s Sides eye rests hidden, shows dimmed on its row\'s hover and keyboard focus, hides while its row is lifted, a hidden row\'s eye stands, and Title holds none', eyesHold(sides, ghost) && sidesTitle, show({ sides, sidesTitle, ghost }))
  decided('E-4', 'a Sides row on keyboard focus draws no outline and wears the focus wash, as a Table\'s Visibility row does', sidesLook.focusVisible && sidesLook.outline === 'none' && sidesLook.wash.includes('gradient') && same(sidesLook, tableLook), show({ sidesLook, tableLook }))
}

async function group11(cdp) {
  await seedList(cdp)
  await toCollection(cdp, COLLECTION)
  // Each section reads on its own, so one that throws fails there and the next runs.
  for (const [name, run] of Object.entries({ configurations, contents, gestures, values, plus, creation, drags, pane, eyes, switches, kinds, frame, shared })) {
    try {
      await run(cdp)
    } catch (e) {
      decided('—', `the ${name} section ran to its end`, false, String(e?.stack ?? e).slice(0, 800))
      await shot(cdp, `g11-${name}-failure`).catch(() => {})
    }
    await viewport(cdp, null)
    await closeAll(cdp)
  }
}

// ── The run ─────────────────────────────────────────────────────────────────

let cdp
try {
  ;({ cdp } = await launch(PORT, 'views-drive-shots'))
  await seed(cdp)
  await mouseClick(cdp, `[...document.querySelectorAll('.row span')].findLast((e) => e.textContent.trim() === 'Collection A')`)
  await sleep(1200)
  for (const g of BUILT) if (GROUPS.has(g)) await { 2: group2, 3: group3, 4: group4, 5: group5, 6: group6, 7: group7, 8: group8, 9: group9, 10: group10, 11: group11 }[g](cdp)
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
