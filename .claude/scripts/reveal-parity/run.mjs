// run.mjs <label> <port> [surface…] — records every reveal surface of one scratch instance into results/<label>.json; naming surfaces records only those.
import fs from 'node:fs'
import { connect, sleep } from '../editor-parity/cdp.mjs'

const [label, port, ...only] = process.argv.slice(2)
const c = await connect(Number(port))
const out = { label, surfaces: {} }
const PROBE = fs.readFileSync(new URL('./probe.js', import.meta.url), 'utf8')
const SETTLE = 400

// ── Input ──
const ev = (expr) => c.evaluate(expr)
const mouse = (type, x, y, extra = {}) => c.send('Input.dispatchMouseEvent', { type, x, y, button: 'none', ...extra })
const move = (p) => mouse('mouseMoved', p.x, p.y)
const park = () => move({ x: 1, y: 1 })
const key = async (keyName, code, vk, modifiers = 0) => {
  await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: keyName, code, windowsVirtualKeyCode: vk, modifiers })
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: keyName, code, windowsVirtualKeyCode: vk, modifiers })
}
const escape = () => key('Escape', 'Escape', 27)
// Keyboard modality without a binding: Escape would close the glance and the Page Window under test.
const modality = () => key('F13', 'F13', 124)
// Polls `expr` (a point) until it answers; `need` does the same for an element and answers its box.
const needPoint = async (expr, what) => {
  for (let i = 0; i < 50; i++) {
    const p = await ev(expr)
    if (p) return p
    await sleep(100)
  }
  throw new Error(`missing: ${what ?? expr}`)
}
const need = (expr, what) => needPoint(`(() => { const e = ${expr}; return e ? __rv.box(e) : null })()`, what)
// A person's press: the pointer arrives, rests, presses, and lets go where it pressed.
const pressAt = async (p, button = 'left') => {
  await move(p)
  await sleep(SETTLE)
  await mouse('mousePressed', p.x, p.y, { button, buttons: button === 'left' ? 1 : 2, clickCount: 1 })
  await sleep(60)
  await mouse('mouseReleased', p.x, p.y, { button, buttons: 0, clickCount: 1 })
  await sleep(SETTLE)
}
const press = async (expr, what) => pressAt(await need(expr, what))
const q = (sel) => `__rv.q(${JSON.stringify(sel)})`
const byText = (sel, text) => `__rv.byText(${JSON.stringify(sel)}, ${JSON.stringify(text)})`
const reset = async () => {
  await ev(PROBE)
  await park()
  await escape()
  await escape()
  await sleep(SETTLE)
}

// ── Navigation ──
const VIEW_EL = `__rv.q('.content-view .cm-content')?.cmTile?.root?.view`
const VIEW = `__rv.q('.content-view .cm-content').cmTile.root.view`
const ribbon = (name) => press(q(`button[aria-label="${name}"]`), `ribbon ${name}`)
const collection = async (name) => {
  await ribbon('collections')
  await press(byText('.row', name), `row ${name}`)
  await sleep(300)
}
const openPage = async (title, from = 'Collection A') => {
  await collection(from)
  await press(`__rv.all('.content-view *').find((e) => e.children.length === 0 && (e.textContent ?? '').trim() === ${JSON.stringify(title)})`, `page ${title}`)
  await need(`${VIEW_EL} && __rv.q('.detail-title-text')?.textContent.trim() === ${JSON.stringify(title)} ? document.body : null`)
  await sleep(600)
}

// ── Sampling ──
const sample = (ctl) =>
  ev(`(async () => { const e = ${ctl.el}; if (e) await __rv.still(e); return __rv.sample(e, ${JSON.stringify(ctl.pseudo ?? null)}) })()`)
const after = async (fn) => {
  await fn()
  await sleep(SETTLE)
}
// The five settled states: rest, the host hovered off the control, the control hovered, the pointer gone again, and keyboard focus.
async function settled(ctl) {
  console.error(`  settled ${ctl.id}`)
  await need(ctl.el, ctl.id)
  const s = {}
  await after(park)
  s.rest = await sample(ctl)
  const hp = ctl.hostAt ? await ev(ctl.hostAt) : await ev(`__rv.hostPoint(${ctl.host}, ${ctl.el})`)
  if (!hp) throw new Error(`no host point: ${ctl.id}`)
  await after(() => move(hp))
  s.host = await sample(ctl)
  const cp = ctl.controlAt ? await ev(ctl.controlAt) : await need(ctl.el, ctl.id)
  await after(() => move(cp))
  s.control = await sample(ctl)
  await after(park)
  s.off = await sample(ctl)
  if (!ctl.pseudo && ctl.keyboard !== false) {
    await modality()
    await after(() => ev(`(${ctl.el}).focus()`))
    s.key = await sample(ctl)
    await ev(`document.activeElement?.blur?.()`)
    await sleep(SETTLE)
  }
  return s
}

// Samples `ctl` at `ms` after the last pointer event the page saw, reading the elapsed time the sample actually landed at.
const TRIGGER = `(() => { if (!window.__rvMark) { window.__rvMark = { move: 0, down: 0 }; window.addEventListener('pointermove', (e) => { window.__rvMark.move = e.timeStamp }, true); window.addEventListener('pointerdown', (e) => { window.__rvMark.down = e.timeStamp }, true) } })()`
// An `after` sample also waits out any fade still running, since it records where the reveal settled.
async function timedAt(ctl, ms, from = 'move', after = false) {
  return ev(`new Promise((r, no) => { const T = window.__rvMark.${from}; if (!(T > 0)) no(new Error('no ${from} mark')); const go = async () => { const e = performance.now() - T; if (e < ${ms}) return setTimeout(go, 4); const el = ${ctl.el}; if (${after} && el) await __rv.still(el); r({ ...__rv.sample(el, ${JSON.stringify(ctl.pseudo ?? null)}), at: Math.round(e) }) }; go() })`)
}
// A boundary pair: 200 ms before it (redone if the sample landed late) and fade + 100 ms after it.
async function boundary(ctl, trigger, ms, fadeMs, from = 'move') {
  console.error(`  boundary ${ctl.id} @${ms}`)
  for (let tries = 0; tries < 4; tries++) {
    await trigger()
    const before = await timedAt(ctl, Math.max(0, ms - 200), from)
    if (before.at >= ms - 60) continue
    const afterS = await timedAt(ctl, ms + fadeMs + 100, from, true)
    delete before.at
    delete afterS.at
    return { before, after: afterS }
  }
  throw new Error(`boundary ${ctl.id} @${ms}: every sample landed late`)
}

// ── Surfaces ──
const surfaces = []
const surface = (id, fn) => surfaces.push({ id, fn })

surface('addBanner', async () => {
  await openPage('Page A')
  const ctl = { id: 'addBanner', el: q('button[aria-label="Add banner"]'), host: q('.add-banner-strip') }
  return { addBanner: await settled(ctl) }
})

const FADE_AFTER = 450
// The dwell (from entering the host) and the grace (from leaving it), each sampled either side of its boundary.
async function dwellGrace(ctl, inside, outside, dwell, grace) {
  const d = await boundary(ctl, async () => {
    await move(outside)
    await sleep(SETTLE + grace + FADE_AFTER)
    await move(inside)
  }, dwell, FADE_AFTER - 100)
  await sleep(dwell + FADE_AFTER)
  const g = await boundary(ctl, () => move(outside), grace, FADE_AFTER - 100)
  return { dwell: d, grace: g }
}

surface('titleHint', async () => {
  await collection('Collection A')
  const ctl = { id: 'hint', el: q('.detail-title-hint input[placeholder="Search"]'), host: q('.detail-title-lead'), hostAt: `__rv.box(${q('.detail-title-text')})`, keyboard: false }
  const s = await settled(ctl)
  const inside = await ev(`__rv.box(${q('.detail-title-text')})`)
  return { hint: { ...s, ...(await dwellGrace(ctl, inside, { x: inside.x, y: inside.y + 200 }, 1500, 150)) } }
})

surface('sidebarCollapse', async () => {
  const ctl = { id: 'collapse', el: q('button[aria-label="Collapse sidebar"]'), host: `${q('button[aria-label="Collapse sidebar"]')}.closest('.surface-glass')` }
  const s = await settled(ctl)
  await press(ctl.el)
  const hidden = await need(q('button[aria-label="Show sidebar"]'), 'Show sidebar')
  await after(park)
  const whileHidden = await sample(ctl)
  await pressAt(hidden)
  await after(park)
  return { collapse: { ...s, whileHidden, restored: await sample(ctl) } }
})

surface('sidebarLock', async () => {
  await ribbon('collections')
  const row = byText('.row[role=button]', 'Collection B')
  const locked = { id: 'lock', el: `${row}?.querySelector('button[aria-label="Unlock Folder"], button[aria-label="Lock Folder"]')`, host: row }
  const s = await settled(locked)
  // An unlock pressed on the lock itself keeps it until the pointer leaves the row.
  await press(locked.el)
  const afterUnlock = await sample(locked)
  const rowBox = await ev(`__rv.box(${row})`)
  await after(() => move({ x: rowBox.left + 20, y: rowBox.y }))
  const stillOnRow = await sample(locked)
  await after(park)
  const leftRow = await sample(locked)
  return { lock: { ...s, afterUnlock, stillOnRow, leftRow } }
})

const navView = async () => {
  await press(q('[aria-label="Open tabs"] > button[aria-label="New Tab"]'), 'New Tab')
  if (await ev(`!!${q('button[title="Switch to List"]')}`)) await press(q('button[title="Switch to List"]'))
  await need(q('.nav-list'), 'nav list')
  await sleep(300)
}
// Shift summons a location glance over the hovered row; the row must still be hovered when the page arrives.
const GLANCE = `document.querySelector('[data-glance].glance-body')`
const glance = async (rowExpr) => {
  const r = await need(rowExpr, 'glance row')
  await move({ x: r.left + 30, y: r.y })
  await sleep(SETTLE)
  await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Shift', code: 'ShiftLeft', windowsVirtualKeyCode: 16, modifiers: 8 })
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Shift', code: 'ShiftLeft', windowsVirtualKeyCode: 16 })
  await need(GLANCE, 'glance body')
  await sleep(1200)
}

surface('glanceLock', async () => {
  await ribbon('collections')
  await openPage('Page C')
  await navView()
  await glance(byText('.nav-list [role=button] *', 'Page A'))
  const open = { id: 'glanceLock', el: `${GLANCE}?.querySelector('button[aria-label="Lock Preview"]')`, host: GLANCE }
  const s = await settled(open)
  // Lock pins the pane: the pinned lock holds visible while locked, and reveals on hover once unlocked.
  await press(open.el)
  const pinned = { id: 'pinnedLock', el: `${GLANCE}?.querySelector('button[aria-label="Unlock Preview"], button[aria-label="Lock Preview"]')`, host: GLANCE }
  const locked = await settled(pinned)
  await press(pinned.el)
  const unlocked = await settled(pinned)
  await escape()
  await sleep(SETTLE)
  return { glanceLock: s, pinnedLocked: locked, pinnedUnlocked: unlocked }
})

const PLUS = { id: 'tabPlus', el: q('[aria-label="Open tabs"] > button[aria-label="New Tab"]'), host: q('[aria-label="Open tabs"]') }
// The "+" at each place that reveals it from outside the bar, and over toolbar buttons, where it must stay as it is.
const plusFrom = async (points) => {
  const s = {}
  for (const [name, expr] of points) {
    const p = await needPoint(expr, name)
    await after(() => move({ x: p.x, y: p.y }))
    s[name] = await sample(PLUS)
    await after(park)
  }
  return s
}

surface('tabs', async () => {
  await ribbon('collections')
  await openPage('Page A')
  const tab = (i) => `document.querySelectorAll('[aria-label="Open tabs"] .tab[role=tab]')[${i}]`
  const tabs = await ev(`document.querySelectorAll('[aria-label="Open tabs"] .tab[role=tab]').length`)
  const res = {}
  for (let i = 0; i < tabs; i++) {
    const ctl = { id: `tab${i}`, el: `${tab(i)}?.querySelector('button[aria-label="Close Tab"]')`, host: tab(i) }
    if (await ev(`!!(${ctl.el})`)) res[`x${i}`] = await settled(ctl)
  }
  res.plus = await settled(PLUS)
  const bannerless = await plusFrom([
    ['pageAHeader', `__rv.box(${q('.content-view .mdpm-header .detail-title-text')} ?? ${q('.content-view .mdpm-header')})`],
    ['toolbarBack', `__rv.box(${q('.app-toolbar button[aria-label="Back"]')})`],
    ['toolbarRight', `__rv.box(${q('.app-toolbar-right button')})`],
  ])
  await openPage('Page B')
  const upperBanner = (sel) => `(() => { const b = ${q(sel)}; if (!b) return null; const r = __rv.box(b); return { x: r.left + r.w * 0.75, y: r.top + 20 } })()`
  const banner = await plusFrom([['pageBBanner', upperBanner('.content-view .mdpm-header .banner')]])
  await collection('Collection B')
  const collectionBanner = await plusFrom([['collectionBanner', upperBanner('.content-view .detail-scroll .banner')]])
  await navView()
  const nav = await plusFrom([
    ['navBanner', upperBanner('.nav-view-banner')],
  ])
  return { ...res, from: { ...bannerless, ...banner, ...collectionBanner, ...nav } }
})

// The last distance along a ray where the control shows. The whole ray is walked: crossing from one element to another can drop a reveal for a single step.
async function reach(ctl, origin, dx, dy, settle = 250) {
  let last = -1
  for (let d = 0; d <= 360; d += 10) {
    await move({ x: origin.x + dx * d, y: origin.y + dy * d })
    await sleep(settle)
    const s = await sample(ctl)
    if (s.vis > 0.5) last = d
  }
  await park()
  await sleep(SETTLE)
  return last
}

// The bottom toggles: settled states, then each reach from today's anchor (the host's corners) and from the toggles themselves.
async function bottomToggles(host, trail, lead) {
  const res = { trail: await settled({ ...trail, hostAt: `(() => { const r = __rv.box(${host}); return { x: r.x, y: r.y } })()` }) }
  if (lead) res.lead = await settled({ ...lead, hostAt: `(() => { const r = __rv.box(${host}); return { x: r.x, y: r.y } })()` })
  const H = await ev(`__rv.box(${host})`)
  const T = await ev(`__rv.box(${trail.el})`)
  res.trailReach = {
    cornerLeft: await reach(trail, { x: H.right - 2, y: H.bottom - 4 }, -1, 0),
    cornerUp: await reach(trail, { x: H.right - 2, y: H.bottom - 4 }, 0, -1),
    toggleLeft: await reach(trail, { x: T.left, y: T.y }, -1, 0),
    toggleUp: await reach(trail, { x: T.x, y: T.top }, 0, -1),
  }
  if (lead) {
    const L = await ev(`__rv.box(${lead.el})`)
    const edge = await ev(`(() => { const e = ${lead.el}; return e.getBoundingClientRect().left + parseFloat(getComputedStyle(e).paddingLeft) })()`)
    res.leadReach = {
      edgeRight: await reach(lead, { x: edge, y: H.bottom - 4 }, 1, 0),
      edgeUp: await reach(lead, { x: edge + 2, y: H.bottom - 4 }, 0, -1),
      toggleRight: await reach(lead, { x: L.right, y: L.y }, 1, 0),
      toggleUp: await reach(lead, { x: L.x, y: L.top }, 0, -1),
    }
  }
  return res
}

const WINDOW = `document.querySelector('[role=dialog][aria-label="Page Preview"]')`
// Collection C opens pages in a Page Window: two pages make a strip of two tabs.
const pageWindow = async () => {
  if (await ev(`!!${WINDOW}`)) return
  await ribbon('collections')
  if (!(await ev(`!!${byText('.row *', 'Window One')}`))) await press(`${byText('.row', 'Collection C')}?.querySelector('[data-drop-outline]')`, 'Collection C outline')
  await press(byText('.row *', 'Window One'), 'Window One')
  await need(WINDOW, 'page window')
  await press(byText('.row *', 'Window Two'), 'Window Two')
  await sleep(600)
}

surface('windowTabs', async () => {
  await pageWindow()
  const tab = (i) => `${WINDOW}.querySelectorAll('[aria-label="Preview tabs"] .tab[role=tab]')[${i}]`
  const res = {}
  for (let i = 0; i < 2; i++) res[`x${i}`] = await settled({ id: `wtab${i}`, el: `${tab(i)}?.querySelector('button[aria-label="Close Tab"]')`, host: tab(i) })
  // A reopened window publishes no page body to its footer, so the footnotes toggle is recorded while the run's first window stands.
  res.toggles = await bottomToggles(
    WINDOW,
    { id: 'windowFooter', el: `${WINDOW}.querySelector('.window-footer-toggle')`, host: WINDOW },
    { id: 'windowFootnotes', el: `${WINDOW}.querySelector('[data-reveal-lead]')`, host: WINDOW },
  )
  return res
})

surface('navPins', async () => {
  await openPage('Page A')
  await openPage('Page C')
  await navView()
  const row = (t) => `__rv.all('.nav-list [role=button]').find((r) => r.innerText.split('\\n')[0].trim() === ${JSON.stringify(t)})`
  const listPin = (t) => ({ id: `list ${t}`, el: `${row(t)}?.querySelector('button[aria-label="Pin"], button[aria-label="Unpin"]')`, host: row(t) })
  const res = { listPageA: await settled(listPin('Page A')), listPinned: await settled(listPin('Editor Test')) }
  await press(q('button[title="Switch to Gallery"]'), 'Switch to Gallery')
  await need(q('.card'), 'gallery card')
  await sleep(1000)
  const card = (t) => `__rv.all('.card').find((c) => c.innerText.split('\\n')[0].trim() === ${JSON.stringify(t)})`
  const cardPin = (t) => ({ id: `card ${t}`, el: `${card(t)}?.querySelector('button[aria-label="Pin"], button[aria-label="Unpin"]')`, host: card(t) })
  res.cardPageA = await settled(cardPin('Page A'))
  res.cardPinned = await settled(cardPin('Editor Test'))
  await press(q('button[title="Switch to List"]'), 'Switch to List')
  return res
})

surface('trashChecks', async () => {
  await ribbon('settings')
  await press(byText('[role=dialog] *', 'Trash'), 'Trash rail row')
  await need(q('.trash-frame .trash-row'), 'trash row')
  await sleep(SETTLE)
  const rows = await ev(`__rv.all('.trash-frame .trash-row').length`)
  const check = (i) => ({ id: `check${i}`, el: `__rv.all('.trash-frame .trash-row')[${i}]?.querySelector('[role=checkbox]')`, host: `__rv.all('.trash-frame .trash-row')[${i}]` })
  const res = { first: await settled(check(0)) }
  // Checking one row shows every check.
  await press(`__rv.all('.trash-frame .trash-row')[0]`)
  res.checkedOther = rows > 1 ? await settled(check(1)) : null
  res.checkedSelf = await settled(check(0))
  await press(`__rv.all('.trash-frame .trash-row')[0]`)
  await escape()
  await sleep(SETTLE)
  return res
})

surface('bottomToggles', async () => {
  await openPage('Beta 2')
  const cv = q('.content-view')
  return bottomToggles(
    cv,
    { id: 'subfield', el: `${cv}.querySelector(':scope > button[aria-label="Hide Footer"], :scope > button[aria-label="Show Footer"]')`, host: cv },
    { id: 'footnotes', el: `${cv}.querySelector(':scope > [data-reveal-lead]')`, host: cv },
  )
})

const homepage = async () => {
  await ribbon('Homepage')
  await need(`${q('button[aria-label="View settings"]')}`, 'homepage view tile')
  await sleep(SETTLE)
}
const TILE = (sel) => `${q(sel)}?.closest('.tile')`
const PROBE_PAGE = `__rv.all('.tile.tile-base').find((t) => t.querySelector('.page-tile'))`

surface('tileHandle', async () => {
  await homepage()
  await ev(`${PROBE_PAGE}.scrollIntoView({ block: 'center' })`)
  await sleep(SETTLE)
  const plain = { id: 'handle', el: `${PROBE_PAGE}?.querySelector(':scope > .tile-handle')`, host: PROBE_PAGE, keyboard: false }
  const res = { plain: await settled(plain) }
  // Click into the page tile's text: it becomes the editing tile, whose handle answers to proximity alone.
  await press(`${PROBE_PAGE}?.querySelector('.cm-content')`, 'probe page text')
  await need(q('.tile.is-editing-tile'), 'editing tile')
  const T = await ev(`__rv.box(${PROBE_PAGE})`)
  const editing = { ...plain, id: 'editingHandle', hostAt: `({ x: ${T.x}, y: ${T.y} })` }
  res.editing = await settled(editing)
  await after(() => move({ x: T.left + 40, y: T.top + 40 }))
  res.editing.nearCorner = await sample(plain)
  res.editingReach = {
    right: await reach(plain, { x: T.left + 2, y: T.top + 2 }, 1, 0, SETTLE),
    diagonal: await reach(plain, { x: T.left + 2, y: T.top + 2 }, Math.SQRT1_2, Math.SQRT1_2, SETTLE),
  }
  await escape()
  return res
})

const BETA2 = async () => {
  await openPage('Beta 2')
  await ev(`(() => { const v = ${VIEW}; v.dispatch({ selection: { anchor: 0 } }); v.scrollDOM.scrollTop = 0 })()`)
  await sleep(SETTLE)
}
const EMBED = (inner) => `__rv.all('.content-view .mdpm-embed-tile').find((t) => t.querySelector(${JSON.stringify(inner)}))`

surface('tileTitles', async () => {
  await BETA2()
  const crumbsHost = EMBED('.page-tile-crumbs')
  const crumbs = { id: 'crumbs', el: `${crumbsHost}?.querySelector('.page-tile-crumbs')`, host: crumbsHost, keyboard: false }
  await ev(`${crumbsHost}.scrollIntoView({ block: 'center' })`)
  await sleep(SETTLE)
  const res = { crumbs: await settled(crumbs) }
  // A press through the revealed crumbs lands in the embedded page's text.
  const cb = await need(crumbs.el, 'crumbs')
  await pressAt({ x: cb.x, y: cb.y })
  res.crumbsClickThrough = await ev(`(() => { const a = document.activeElement; return { editor: !!a?.closest('.cm-content'), inEmbed: !!a?.closest('.mdpm-embed-tile') } })()`)
  await escape()
  const webHost = EMBED('button.web-tile-title')
  await ev(`${webHost}.scrollIntoView({ block: 'center' })`)
  await sleep(SETTLE)
  res.webTitle = await settled({ id: 'webTitle', el: `${webHost}?.querySelector('button.web-tile-title')`, host: webHost })
  return res
})

const LOCK = (tile) => `${tile}?.querySelector('button[aria-label="Hide Views"], button[aria-label="Show Views"]')`
const SHOWN_TILE = `__rv.all('.tile.tile-base').find((t) => t.querySelector('button[aria-label="Hide Views"]'))`
const HIDDEN_TILE = `__rv.all('.tile.tile-base').find((t) => t.querySelector('button[aria-label="Show Views"]'))`

// With the title row hidden the settings button sits in the band row.
surface('untitledViewTile', async () => {
  await homepage()
  const tile = `__rv.all('.tile.tile-base').find((t) => t.querySelector('button[aria-label="View settings"]')?.parentElement.querySelector('button[aria-label="New View"]'))`
  await ev(`${tile}.scrollIntoView({ block: 'center' })`)
  await sleep(SETTLE)
  const btn = `${tile}?.querySelector('button[aria-label="View settings"]')`
  const res = { settings: await settled({ id: 'untitledSettings', el: btn, host: `${btn}.parentElement` }) }
  await after(async () => move(await ev(`__rv.hostPoint(${tile}, ${btn}.parentElement)`)))
  res.fromBody = await sample({ el: btn })
  return res
})

surface('viewTile', async () => {
  await homepage()
  const shown = SHOWN_TILE
  await ev(`${shown}.scrollIntoView({ block: 'start' })`)
  await sleep(SETTLE)
  const band = `${LOCK(shown)}.parentElement.parentElement`
  const res = {}
  res.settings = await settled({ id: 'settings', el: `${shown}?.querySelector('button[aria-label="View settings"]')`, host: shown })
  res.newView = await settled({ id: 'newView', el: `${shown}?.querySelector('button[aria-label="New View"]')`, host: band })
  // The shown band's lock: a dwell on the band row, a grace after leaving it.
  const lock = { id: 'lock', el: LOCK(shown), host: band, keyboard: false }
  const inBand = await ev(`__rv.hostPoint(${band}, ${LOCK(shown)})`)
  const below = await ev(`(() => { const r = __rv.box(${shown}); return { x: r.x, y: r.bottom - 20 } })()`)
  res.lock = { ...(await settled({ ...lock, hostAt: `(${JSON.stringify(inBand)})` })), ...(await dwellGrace(lock, inBand, below, 1500, 150)) }
  // The hidden band peeks on a dwell over the title row, and its "Show Views" lock with it.
  const hidden = HIDDEN_TILE
  const hiddenId = await ev(`__rv.all('.tile.tile-base').indexOf(${hidden})`)
  const tileN = `__rv.all('.tile.tile-base')[${hiddenId}]`
  const peek = { id: 'peekLock', el: LOCK(tileN), host: tileN, keyboard: false }
  const title = await ev(`__rv.box(${tileN}.querySelector('span[class*="md-h"]'))`)
  const away = await ev(`(() => { const r = __rv.box(${tileN}); return { x: r.x, y: r.top - 30 } })()`)
  res.peek = await dwellGrace(peek, { x: title.x, y: title.y }, away, 1500, 150)
  const head = await ev(`__rv.box(${tileN}.querySelector('.table-head'))`)
  res.peekFromHead = await dwellGrace(peek, { x: head.x, y: head.y }, away, 1500, 150)
  // Show Views from the peeked lock, leaving at once: the lock lingers 2000 ms from the press.
  await move({ x: title.x, y: title.y })
  await sleep(1500 + FADE_AFTER)
  const lb = await need(LOCK(tileN), 'Show Views')
  res.linger = await boundary(peek, async () => {
    await pressAt({ x: lb.x, y: lb.y })
    await move(away)
  }, 2000, FADE_AFTER - 100, 'down')
  res.lingerLabel = await ev(`${LOCK(tileN)}?.getAttribute('aria-label')`)
  const band2 = await ev(`(() => { const l = __rv.box(${LOCK(tileN)}); return { x: l.left - 40, y: l.y } })()`)
  // Hide Views, then Show Views again and re-enter the band 1000 ms into the linger: sampled after the linger, before a fresh dwell could finish.
  await move(band2)
  await sleep(1500 + FADE_AFTER)
  await press(LOCK(tileN))
  await move({ x: title.x, y: title.y })
  await sleep(1500 + FADE_AFTER)
  const lb2 = await need(LOCK(tileN), 'Show Views')
  await pressAt({ x: lb2.x, y: lb2.y })
  await move(away)
  await timedAt(peek, 1000, 'down')
  await move(band2)
  res.lingerReentered = await timedAt(peek, 2000 + FADE_AFTER, 'down')
  delete res.lingerReentered.at
  // Put the band back as the fixture left it: dwell on the band row, then Hide Views.
  await move(band2)
  await sleep(1500 + FADE_AFTER)
  if ((await ev(`${LOCK(tileN)}?.getAttribute('aria-label')`)) === 'Hide Views') await press(LOCK(tileN))
  await after(park)
  return res
})

// A menu row is the last `[role=button]` whose first line reads `text`: menus portal to the end of the body.
const MENU = (text) => `__rv.all('[role=button]').filter((e) => e.innerText.split('\\n')[0].trim() === ${JSON.stringify(text)}).pop()`
const settingsMenu = async () => {
  await press(q('.app-toolbar button[aria-label="Settings"]'), 'toolbar Settings')
  await sleep(SETTLE)
}
const EYE = (label) => q(`button[aria-label="${label}"]`)

surface('groupBandAdd', async () => {
  await collection('Collection A')
  const add = q('button[aria-label="New page in group"]')
  const head = `${add}?.closest('.group-band-head')`
  return { add: await settled({ id: 'groupAdd', el: add, host: head }) }
})

surface('eyes', async () => {
  await collection('Collection A')
  await settingsMenu()
  await press(MENU('Group'), 'Group row')
  const row = (label) => `${EYE(label)}?.closest('.drop-line-host > *')`
  const res = { groupEye: await settled({ id: 'groupEye', el: EYE('Hide Set Alpha'), host: row('Hide Set Alpha') }) }
  await press(EYE('Hide Set Alpha'))
  res.groupHiddenEye = await settled({ id: 'groupHiddenEye', el: EYE('Show Set Alpha'), host: row('Show Set Alpha') })
  await press(EYE('Show Set Alpha'))
  await escape()
  await escape()
  await sleep(SETTLE)
  await settingsMenu()
  await press(MENU('Layout'), 'Layout row')
  const paneEye = EYE('Hide Location')
  res.paneEye = await settled({ id: 'paneEye', el: paneEye, host: `${paneEye}?.parentElement.parentElement` })
  await escape()
  await escape()
  return res
})

surface('propertyAdd', async () => {
  await openPage('Page A')
  await settingsMenu()
  const res = {}
  for (const label of ['Add Property', 'Add Context']) {
    const add = q(`button[aria-label="${label}"]`)
    if (!(await ev(`!!${add}`))) continue
    res[label] = await settled({ id: label, el: add, host: `${add}.parentElement.parentElement` })
  }
  // An open chooser holds its "+" shown.
  const first = Object.keys(res)[0]
  await press(q(`button[aria-label="${first}"]`))
  await after(park)
  res.open = await sample({ el: q(`button[aria-label="${first}"]`) })
  await escape()
  await escape()
  return res
})

const propertyEditor = async (name) => {
  await collection('Collection A')
  await settingsMenu()
  await press(MENU('Properties'), 'Properties row')
  await press(MENU(name), name)
}

surface('statusAdd', async () => {
  await propertyEditor('Fixture Status')
  const res = {}
  for (const g of ['Open', 'Active', 'Done']) {
    const add = q(`button[aria-label="Add to ${g}"]`)
    res[g] = await settled({ id: `add ${g}`, el: add, host: `${add}?.parentElement.parentElement` })
  }
  await escape()
  await escape()
  return res
})

surface('optionPen', async () => {
  await propertyEditor('Fixture Select')
  const pen = q('button[aria-label="Edit Option"]')
  const lead = `${pen}?.parentElement.previousElementSibling`
  const res = { pen: await settled({ id: 'pen', el: pen, host: `${pen}?.parentElement.parentElement`, hostAt: `__rv.box(${lead})` }) }
  await press(pen)
  await after(park)
  res.editing = await sample({ el: pen })
  await escape()
  await escape()
  await escape()
  return res
})

surface('labelRemove', async () => {
  await ribbon('collections')
  await openPage('Editor Test', 'Collection A')
  await settingsMenu()
  const x = `__rv.all('button[aria-label="Remove"]').find((b) => b.parentElement.innerText.includes('Active'))`
  const chip = `${x}?.parentElement`
  const cb = await need(chip, 'label chip')
  const ctl = { id: 'labelX', el: x, host: chip, hostAt: `({ x: ${cb.left + cb.w * 0.25}, y: ${cb.y} })` }
  const res = { x: await settled(ctl) }
  await after(() => move({ x: cb.right - 6, y: cb.y }))
  res.x.zone = await sample(ctl)
  await escape()
  return res
})

surface('tableRowGrip', async () => {
  await homepage()
  const tile = HIDDEN_TILE
  await ev(`${tile}.scrollIntoView({ block: 'center' })`)
  await sleep(SETTLE)
  const row = `${tile}?.querySelector('.data-row[data-rid]')`
  const grip = { id: 'rowGrip', el: `${row}?.querySelector('.cell-lead [title="Drag to reorder"]')`, host: row }
  const res = { grip: await settled(grip) }
  const r = await ev(`__rv.box(${row})`)
  const g = await ev(`__rv.box(${grip.el})`)
  // From inside the row out through the rail the grip sits in.
  res.fromRow = await reach(grip, { x: r.left + 60, y: g.y }, -1, 0)
  return res
})

// A glance holds only pages, and no page renders a reveal host, so the nested case is planted: a copy of the live group-band head inside the glance body.
surface('glanceLeak', async () => {
  await collection('Collection A')
  await navView()
  await glance(`__rv.all('.nav-list [role=button]').find((r) => r.innerText.split('\\n')[0].trim() === 'Page A')`)
  await ev(`(() => { const head = document.querySelector('button[aria-label="New page in group"]').closest('.group-band-head'); const copy = head.cloneNode(true); copy.id = 'rv-planted'; ${GLANCE}.append(copy) })()`)
  const add = `document.querySelector('#rv-planted button[aria-label="New page in group"]')`
  await need(add, 'planted group add')
  const body = await ev(`__rv.hostPoint(${GLANCE}, document.querySelector('#rv-planted'))`)
  await after(() => move(body))
  const res = { onBody: await sample({ el: add }) }
  await escape()
  await sleep(SETTLE)
  return res
})

// The editor's lines: a probe point in the rail left of a line that still hits it (a grip or chevron answers there).
const railOf = (lineExpr) =>
  `(() => { const l = ${lineExpr}; const r = l.getBoundingClientRect(); for (let y = r.top + 3; y < r.bottom - 2; y += 3) for (let d = 2; d < 60; d++) if (l.contains(document.elementFromPoint(r.left - d, y))) return { x: r.left - d - 3, y }; return null })()`
const LINE = (cls, text) => `__rv.all('.content-view .cm-line.${cls}')${text ? `.find((l) => l.textContent.includes(${JSON.stringify(text)}))` : '[0]'}`
// The editor draws only the lines near its viewport: the caret goes to the text, which scrolls it into view.
const intoView = async (text) => {
  await ev(`(() => { const v = ${VIEW}; const at = v.state.doc.toString().indexOf(${JSON.stringify(text)}); v.dispatch({ selection: { anchor: at }, scrollIntoView: true }) })()`)
  await sleep(SETTLE)
  await ev(`${VIEW}.dispatch({ selection: { anchor: 0 } })`)
  await sleep(SETTLE)
  await ev(`(() => { const v = ${VIEW}; const at = v.state.doc.toString().indexOf(${JSON.stringify(text)}); v.scrollDOM.scrollTop = Math.max(0, v.lineBlockAt(at).top - v.scrollDOM.clientHeight / 2) })()`)
  await sleep(SETTLE)
}

surface('codeTag', async () => {
  await BETA2()
  const res = {}
  for (const [name, text] of [['bare', 'bare fence'], ['named', 'const named']]) {
    const first = `(() => { const body = ${LINE('codeblock', text)}; let l = body; while (l && !l.classList.contains('codeblock-first')) l = l.previousElementSibling; return l })()`
    const tag = `${first}?.querySelector('.codeblock-language')`
    await intoView(text)
    const copy = { id: `${name}Copy`, el: `${tag}?.querySelector('svg.codeblock-copy')`, host: tag, keyboard: false }
    const mark = { id: `${name}Mark`, el: `${tag}?.querySelector('svg.codeblock-mark')`, host: tag, keyboard: false }
    const t = await need(tag, `${name} tag`)
    const em = await ev(`parseFloat(getComputedStyle(${tag}).fontSize)`)
    const s = { copy: await settled({ ...copy, hostAt: `(${JSON.stringify({ x: t.x, y: t.y })})`, controlAt: `(${JSON.stringify({ x: t.x, y: t.y })})` }) }
    if (await ev(`!!${mark.el}`)) s.mark = await settled({ ...mark, hostAt: `(${JSON.stringify({ x: t.x, y: t.y })})`, controlAt: `(${JSON.stringify({ x: t.x, y: t.y })})` })
    const inArc = { x: t.left - 10 * em, y: t.bottom + 5 * em }
    await after(() => move(inArc))
    s.inArc = await sample(copy)
    // Under the old arc an invisible element took the pointer; the prose under it should.
    s.inArcHitsText = await ev(`(() => { const e = document.elementFromPoint(${inArc.x}, ${inArc.y}); return !!e?.closest('.cm-line') && !e.closest('.codeblock-language') })()`)
    await after(() => move({ x: t.left - 26 * em, y: t.y }))
    s.farLeft = await sample(copy)
    s.reach = {
      left: await reach(copy, { x: t.left, y: t.y }, -1, 0, SETTLE),
      down: await reach(copy, { x: t.left - 2, y: t.bottom }, 0, 1, SETTLE),
    }
    res[name] = s
  }
  return res
})

surface('editorLines', async () => {
  await BETA2()
  const res = {}
  const divider = LINE('md-citation-divider')
  await intoView('[^1]: A note')
  const dv = { id: 'divider', el: divider, host: divider, hostAt: `__rv.box(${divider})`, controlAt: `__rv.box(${divider})`, keyboard: false }
  res.divider = await settled(dv)
  res.divider.filter = await ev(`getComputedStyle(${divider}).filter`)
  await after(async () => move(await ev(`__rv.box(${divider})`)))
  res.divider.hoverFilter = await ev(`getComputedStyle(${divider}).filter`)
  const heading = LINE('md-foldable', 'Probe Heading')
  await intoView('Probe Heading')
  const chev = { id: 'chevron', el: heading, pseudo: '::before', host: heading, hostAt: `__rv.box(${heading})`, controlAt: railOf(heading) }
  res.chevron = await settled(chev)
  return res
})

// A block grip answers while the pointer is left of the text column beside its block; a transaction elsewhere must leave it lit.
surface('blockGrips', async () => {
  await BETA2()
  const res = {}
  for (const [name, cls, text, el, pseudo] of [
    ['paragraph', 'md-block-handle', 'A paragraph of prose', null, '::before'],
    ['quote', 'md-blockquote-first', 'A quoted line', '.md-blockquote-grip', null],
    ['callout', 'md-callout-first', null, null, '::after'],
  ]) {
    const line = LINE(cls, text)
    await intoView(text ?? '> [!note]')
    const ctl = { id: name, el: el ? `${line}?.querySelector(${JSON.stringify(el)})` : line, pseudo, host: line, hostAt: `__rv.box(${line})`, controlAt: railOf(line), keyboard: false }
    const s = await settled(ctl)
    await after(async () => move(await ev(railOf(line))))
    await ev(`(() => { const v = ${VIEW}; v.dispatch({ selection: { anchor: v.state.doc.length } }) })()`)
    await sleep(SETTLE)
    s.afterTransaction = await sample(ctl)
    await ev(`(() => { const v = ${VIEW}; v.dispatch({ selection: { anchor: 0 } }) })()`)
    res[name] = s
  }
  return res
})

surface('tableGrips', async () => {
  await BETA2()
  const wrap = q('.content-view .mdpm-tbl-wrap')
  await intoView('| One |')
  const res = {}
  const rowGrip = `${wrap}?.querySelector('.mdpm-tbl-grip-row .mdpm-tbl-grip')`
  const colGrip = `${wrap}?.querySelector('.mdpm-tbl-grip-col .mdpm-tbl-grip')`
  const cell = (r, c) => `${wrap}?.querySelectorAll('tr')[${r}]?.querySelectorAll('th, td')[${c}]`
  res.rowGrip = await settled({ id: 'rowGrip', el: rowGrip, host: wrap, hostAt: `__rv.box(${cell(1, 0)})`, keyboard: false })
  res.colGrip = await settled({ id: 'colGrip', el: colGrip, host: wrap, hostAt: `__rv.box(${cell(0, 0)})`, keyboard: false })
  await after(async () => move(await ev(`__rv.box(${cell(1, 1)})`)))
  res.colGripFromBody = await sample({ el: colGrip })
  for (const label of ['Add Column', 'Add Row']) {
    const add = `${wrap}?.querySelector('button[aria-label="${label}"]')`
    res[label] = await settled({ id: label, el: add, host: wrap, hostAt: `__rv.box(${cell(1, 1)})` })
  }
  // Entering a cell hides the adds until the pointer leaves the wrap.
  await pressAt(await ev(`__rv.box(${cell(1, 1)})`))
  await after(async () => move(await ev(`__rv.box(${cell(2, 1)})`)))
  res.addsWhileLive = await sample({ el: `${wrap}?.querySelector('button[aria-label="Add Row"]')` })
  await after(park)
  await after(async () => move(await ev(`__rv.box(${cell(2, 1)})`)))
  res.addsAfterLeave = await sample({ el: `${wrap}?.querySelector('button[aria-label="Add Row"]')` })
  await escape()
  await escape()
  return res
})

surface('autocomplete', async () => {
  await openPage('Beta 1')
  const res = {}
  // The alias picker: each remembered alias carries a HoverRemove ×. Rows commit on mousedown, so these are hovered, never pressed.
  await ev(`(() => { const v = ${VIEW}; v.focus(); v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: '[[Page A|]]' }, selection: { anchor: 9 }, userEvent: 'input.type' }) })()`)
  const forget = q('.mdpm-ac button[aria-label="Forget Test"]')
  await need(forget, 'Forget Test')
  res.forget = await settled({ id: 'forget', el: forget, host: `${forget}.parentElement.parentElement`, keyboard: false })
  // The page list: a page with headings carries a chevron into them.
  await ev(`(() => { const v = ${VIEW}; v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: '[[Page]]' }, selection: { anchor: 6 }, userEvent: 'input.type' }) })()`)
  const chev = `__rv.all('.mdpm-ac button[aria-label^="Headings of"]')[0]`
  await need(chev, 'headings chevron')
  res.chevron = await settled({ id: 'chevron', el: chev, host: `${chev}.parentElement.parentElement`, keyboard: false })
  await ev(`(() => { const v = ${VIEW}; v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: '' } }) })()`)
  await escape()
  return res
})

// ── Run ──
await ev(PROBE)
await ev(TRIGGER)
const failed = []
for (const s of surfaces) {
  if (only.length && !only.includes(s.id)) continue
  console.error(`· ${s.id}`)
  try {
    await reset()
    out.surfaces[s.id] = await s.fn()
  } catch (e) {
    console.error(`  ✗ ${e.message}`)
    out.surfaces[s.id] = { error: String(e.message) }
    failed.push(s.id)
  }
}
fs.mkdirSync(new URL('./results/', import.meta.url), { recursive: true })
const file = new URL(`./results/${label}.json`, import.meta.url)
if (only.length && fs.existsSync(file)) {
  const prev = JSON.parse(fs.readFileSync(file, 'utf8'))
  Object.assign(prev.surfaces, out.surfaces)
  fs.writeFileSync(file, JSON.stringify(prev, null, 1))
} else fs.writeFileSync(file, JSON.stringify(out, null, 1))
c.close()
if (failed.length) {
  console.error(`failed: ${failed.join(', ')}`)
  process.exit(1)
}
