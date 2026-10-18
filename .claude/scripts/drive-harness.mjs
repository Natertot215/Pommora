import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { Worker } from 'node:worker_threads'
import { ulid } from 'ulidx'
import { parse } from 'yaml'

// A baseline worktree (editor-parity/worktree.sh) builds and launches in place of the main checkout.
export const REPO = process.env.POMMORA_DRIVE_REPO ?? join(homedir(), 'The Studio/Projects/Project Pommora')
export const NEXUS = join(homedir(), 'Test')
const ELECTRON = join(REPO, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron')
let port, shotsDir, backup, userData, child

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
export async function until(what, fn, ms = 15000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    const v = await fn().catch(() => undefined)
    if (v) return v
    await sleep(100)
  }
  throw new Error(`Timed out waiting for ${what}`)
}
export const settles = async (fn, ms = 6000) => until('a settled read', fn, ms).then(() => true, () => false)
// True only when every read across the window holds, so a late write is caught.
export async function holds(fn, ms = 6000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (!(await fn().catch(() => false))) return false
    await sleep(200)
  }
  return true
}

async function connect(urls = ['app://']) {
  const target = await until('the app window', async () => {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
    return list.find((t) => t.type === 'page' && urls.some((u) => t.url.startsWith(u)))
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
export const ask = (cdp, channel, ...args) => cdp.evaluate(`window.nexus.ask(${JSON.stringify(channel)}, ...${JSON.stringify(args)})`)
export const must = async (what, reply) => {
  const r = await reply
  if (!r?.ok) throw new Error(`${what} was refused: ${JSON.stringify(r)}`)
  return r.value
}

export const results = []
export const check = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${!pass && detail ? `\n      ${detail}` : ''}`) }

// ── Native input ────────────────────────────────────────────────────────────

export const osa = (script) => execFileSync('osascript', ['-e', script], { encoding: 'utf8' }).trim()
export const key = (code) => osa(`tell application "System Events" to key code ${code}`)
export const KEY = { down: 125, right: 124, ret: 36, esc: 53 }

export async function activate(cdp, pid) {
  osa(`tell application "System Events" to set frontmost of (first process whose unix id is ${pid}) to true`)
  await cdp.send('Page.bringToFront')
  await sleep(300)
  const front = osa(`tell application "System Events" to get frontmost of (first process whose unix id is ${pid})`)
  if (front !== 'true') throw new Error('The app is not frontmost; no keystroke was sent.')
}

export const sel = (css) => `document.querySelector(${JSON.stringify(css)})`
export const textEl = (scope, text) =>
  `[...document.querySelectorAll(${JSON.stringify(scope)})].find((e) => e.children.length === 0 && e.textContent.trim() === ${JSON.stringify(text)})`

// An element drawn as `display: contents` has no box of its own, so its contents' box stands in.
export const boxOf = (cdp, expr) =>
  cdp.evaluate(`(() => { const el = (${expr}); if (!el) throw new Error('no element for ' + ${JSON.stringify(expr)}); let b = el.getBoundingClientRect(); if (!b.width && !b.height && el instanceof Node) { const r = document.createRange(); r.selectNodeContents(el); b = r.getBoundingClientRect() } return { x: b.x + b.width / 2, y: b.y + b.height / 2, left: b.left, top: b.top, right: b.right, bottom: b.bottom } })()`)
export const overlaps = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

export async function mouseAt(cdp, { x, y }, { button = 'left', modifiers = 0, settle = 500 } = {}) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' })
  for (const type of ['mousePressed', 'mouseReleased'])
    await cdp.send('Input.dispatchMouseEvent', { type, x, y, button, buttons: type === 'mousePressed' ? (button === 'left' ? 1 : 2) : 0, clickCount: 1, modifiers })
  await sleep(settle)
}
export const mouseClick = async (cdp, expr, opts) => mouseAt(cdp, await boxOf(cdp, expr), opts)
// Two presses the second counted as such, so the element sees click (detail 1), click (detail 2), then dblclick.
export async function doubleClick(cdp, expr, { settle = 500 } = {}) {
  const { x, y } = await boxOf(cdp, expr)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' })
  for (const clickCount of [1, 2])
    for (const type of ['mousePressed', 'mouseReleased'])
      await cdp.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount })
  await sleep(settle)
}
export async function sweep(cdp, a, b, { steps, held }) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: a.x, y: a.y, button: 'left', buttons: 1, clickCount: 1 })
  for (let i = 1; i <= steps; i++)
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x, y: a.y + ((b.y - a.y) * i) / steps, button: 'left', buttons: 1 })
  if (held) await held()
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', buttons: 0, clickCount: 1 })
  await sleep(800)
}
export async function drag(cdp, from, to, held) {
  const a = await boxOf(cdp, from)
  const b = await boxOf(cdp, to)
  await sweep(cdp, a, { x: b.x, y: b.y - 6 }, { steps: 8, held })
}
export const hover = async (cdp, expr, dwell = 600) => {
  const { x, y } = await boxOf(cdp, expr)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + 20, y, button: 'none' })
  await sleep(100)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' })
  await sleep(dwell)
}

// A freshly popped native menu highlights nothing: the first Down lands on row 1. `seen` runs while the menu is up.
// `edge` presses the element's leading padding, so a link inside it is never the target.
export async function chooseNative(cdp, pid, expr, { downs, into = [], seen, edge = false }) {
  await activate(cdp, pid)
  const box = await boxOf(cdp, expr)
  await mouseAt(cdp, edge ? { x: box.left + 4, y: box.y } : box, { button: 'right' })
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

// The items of the native menu now up, read from the app's window; empty when none is.
export const nativeMenu = (pid) => {
  try {
    return osa(`tell application "System Events" to tell (first process whose unix id is ${pid}) to get name of every menu item of every menu of UI element 1`).split(', ')
  } catch {
    return []
  }
}

export const click = (cdp, expr) => cdp.evaluate(`(${expr}).click()`)

const VK = { Enter: 13, Escape: 27, Tab: 9, Backspace: 8, b: 66, z: 90, ArrowDown: 40, ArrowUp: 38, ' ': 32 }
export async function pressKey(cdp, name, modifiers = 0) {
  for (const type of ['rawKeyDown', 'keyUp'])
    await cdp.send('Input.dispatchKeyEvent', { type, key: name, code: name === ' ' ? 'Space' : name.length === 1 ? `Key${name.toUpperCase()}` : name, windowsVirtualKeyCode: VK[name], modifiers })
  await sleep(300)
}
export const SHIFT = 8
export const META = 4
export const typeText = (cdp, text) => cdp.send('Input.insertText', { text })

let shots = 0
const shotPath = (name) => join(shotsDir, `${String(++shots).padStart(2, '0')}-${name}.png`)
export async function shot(cdp, name) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(shotPath(name), Buffer.from(data, 'base64'))
}
// A native menu draws outside the web contents, so it is captured from the screen.
export const screenShot = (name) => execFileSync('screencapture', ['-x', shotPath(name)])

// ── The Nexus on disk ───────────────────────────────────────────────────────

export const SET = 'Collection A/Set Alpha'
export const read = (rel) => readFileSync(join(NEXUS, rel), 'utf8')
export const pagePath = (title) => `${SET}/${title}.md`
export const pageFile = (title) => read(pagePath(title))
export const FM = /^---\n([\s\S]*?)\n---\n?/
export const frontRaw = (title) => FM.exec(pageFile(title))?.[1] ?? ''
export const frontmatter = (title) => parse(frontRaw(title)) ?? {}
export const mintPageId = () => { const id = ulid(); return `${id.slice(0, 10)}P${id.slice(11)}` }
export const portalOpen = (cdp) => cdp.evaluate(`!!document.querySelector('[data-picker-portal]')`)
export function writeBody(title, body) {
  const text = pageFile(title)
  const m = FM.exec(text)
  writeFileSync(join(NEXUS, pagePath(title)), `${m[0]}${body}`)
}

export const pageIds = {}
export async function createPage(cdp, title, seeds = {}) {
  const id = mintPageId()
  await must(`createPage ${title}`, ask(cdp, 'mutate', { op: 'createPage', id, parentPath: SET, name: title, seeds }))
  pageIds[title] = id
}

// ── Surfaces ────────────────────────────────────────────────────────────────

export const SETTINGS_BUTTON = `document.querySelector('.toolbar-trio > :not([inert]) button[title="Settings"]')`
export async function openCollection(cdp) {
  await click(cdp, `[...document.querySelectorAll('.row span')].findLast((e) => e.textContent.trim() === 'Collection A')`)
  await sleep(1200)
}
export const row = (title) => `document.querySelector('.data-row[data-rid="${pageIds[title]}"]')`
// The inline field holding the focus: a Number's <input>, or the one-line editor's content, read and driven through whichever it is.
export const FIELD = '.value-field'
export const FIELD_VIEW = `document.querySelector('${FIELD} .cm-content').cmTile.root.view`
export const field = `(document.activeElement?.tagName === 'INPUT' || document.activeElement?.matches?.('${FIELD} .cm-content')) ? document.activeElement : null`
const fieldView = `(${field}).cmTile.root.view`
export const fieldValue = (cdp) => cdp.evaluate(`(() => { const f = ${field}; return f ? (f.tagName === 'INPUT' ? f.value : f.cmTile.root.view.state.doc.toString()) : null })()`)
export const selectField = (cdp) => cdp.evaluate(`(() => { const f = ${field}; if (f.tagName === 'INPUT') f.select(); else { const v = ${fieldView}; v.dispatch({ selection: { anchor: 0, head: v.state.doc.length } }) } })()`)
export const blurField = (cdp) => cdp.evaluate(`(${field}).blur()`)
// Whether the field's caret rests at its end, with nothing selected.
export const caretAtFieldEnd = (cdp) => cdp.evaluate(`(() => { const f = ${field}; if (f.tagName === 'INPUT') return f.selectionStart === f.value.length && f.selectionEnd === f.value.length; const s = ${fieldView}.state.selection.main; return s.empty && s.head === ${fieldView}.state.doc.length })()`)
export const activeTab = (cdp) => cdp.evaluate(`document.querySelector('[role=tab][aria-selected=true]')?.getAttribute('title') ?? null`)

// A press on the value's first glyph, so a link inside it is never the target.
export async function openField(cdp, expr) {
  const text = await boxOf(cdp, `(${expr}).querySelector('.cell-text')`).catch(() => null)
  if (text) await mouseAt(cdp, { x: text.left + 3, y: text.y })
  else await mouseClick(cdp, expr)
  await until('the inline field', () => cdp.evaluate(`!!(${field})`))
}
export async function openPage(cdp, title) {
  await mouseClick(cdp, `${row(title)}.querySelector('.cell-title-text')`)
  await until(`${title}'s tab`, async () => (await activeTab(cdp)) === title)
  await sleep(800)
}
export async function openPanel(cdp) {
  if (await cdp.evaluate(`!!document.querySelector('[aria-label="Add Property"]')`)) return
  await mouseClick(cdp, SETTINGS_BUTTON)
  await until('the Properties panel', () => cdp.evaluate(`!!document.querySelector('[aria-label="Add Property"]')`))
  await sleep(500)
}
export async function closePanel(cdp) {
  if (await cdp.evaluate(`!!document.querySelector('[aria-label="Add Property"]')`)) await mouseClick(cdp, SETTINGS_BUTTON)
  await sleep(400)
}
export async function escapeAll(cdp) {
  for (let i = 0; i < 4 && (await portalOpen(cdp)); i++) await pressKey(cdp, 'Escape')
}

export const PEN = '[aria-label="Open in TextPane"]'
export const PANE = '.text-pane'
export const PANE_VIEW = `document.querySelector('${PANE} .cm-content').cmTile.root.view`
export const PAGE_VIEW = `[...document.querySelectorAll('.cm-content')].find((c) => !c.closest('${PANE}') && !c.closest('[inert]')).cmTile.root.view`
export const paneDoc = (cdp) => cdp.evaluate(`${PANE_VIEW}.state.doc.toString()`)
export async function openPane(cdp, scope) {
  await hover(cdp, scope)
  await mouseClick(cdp, `(${scope}).querySelector(${JSON.stringify(PEN)})`)
  await until('the TextPane', () => cdp.evaluate(`!!document.querySelector('${PANE} .cm-editor')`))
  await sleep(500)
}

// A refusal draws as the notification label's alert.
export const refusal = (cdp) => cdp.evaluate(`document.querySelector('[role="alert"]:not([inert])')?.textContent.trim() ?? ''`)

// ── Measurement ─────────────────────────────────────────────────────────────

const clock = () => performance.timeOrigin + performance.now()
const round = (ms) => Math.round(ms * 10) / 10

// Its own thread, so a System Events call blocking this one never stalls the poll. A directory reads as its `.json` files together, which leaves an atomic write's temp file out.
const WATCHER = `
const { parentPort, workerData } = require('node:worker_threads')
const { readdirSync, readFileSync, statSync } = require('node:fs')
const { join } = require('node:path')
const { paths, every, flag } = workerData
const stop = new Int32Array(flag)
const read = (p) => {
  try {
    if (!statSync(p).isDirectory()) return readFileSync(p, 'utf8')
    return readdirSync(p).filter((n) => n.endsWith('.json')).sort().map((n) => n + '\\n' + readFileSync(join(p, n), 'utf8')).join('\\n')
  } catch (e) {
    return e.code === 'ENOENT' ? null : undefined
  }
}
const last = paths.map(read)
const transitions = []
parentPort.postMessage('ready')
while (Atomics.load(stop, 0) === 0) {
  paths.forEach((p, i) => {
    const now = read(p)
    if (now === undefined || now === last[i]) return
    last[i] = now
    transitions.push({ at: performance.timeOrigin + performance.now(), file: i, content: now })
  })
  Atomics.wait(stop, 0, 0, every)
}
parentPort.postMessage({ transitions, final: last })
`

/** Polls each Nexus-relative path every `every` ms until `stop`, which answers how many distinct contents each passed through, each content in turn, and when the first landed. */
export async function watch(rels, every = 5) {
  const flag = new SharedArrayBuffer(4)
  const worker = new Worker(WATCHER, { eval: true, workerData: { paths: rels.map((r) => join(NEXUS, r)), every, flag } })
  const reply = () => new Promise((ok, fail) => { worker.once('message', ok); worker.once('error', fail) })
  await reply()
  return {
    stop: async () => {
      const done = reply()
      const stop = new Int32Array(flag)
      Atomics.store(stop, 0, 1)
      Atomics.notify(stop, 0)
      const { transitions, final } = await done
      await worker.terminate()
      const of = (i) => transitions.filter((t) => t.file === i)
      return {
        writes: Object.fromEntries(rels.map((r, i) => [r, of(i).length])),
        states: Object.fromEntries(rels.map((r, i) => [r, of(i).map((t) => t.content)])),
        firstAt: transitions[0]?.at ?? null,
        final: Object.fromEntries(rels.map((r, i) => [r, final[i]])),
      }
    },
  }
}

// Installed once: the first input since arming, the first mutation or focus move after which `reflect` holds, the frame after it, and every long task.
const PROBE = `(() => {
  if (window.__drive) return window.__drive
  const d = { input: null, reflect: null, paint: null, armedAt: 0, longtasks: [], obs: null, hit: () => {} }
  for (const type of ['pointerdown', 'keydown', 'contextmenu', 'beforeinput'])
    window.addEventListener(type, () => { if (d.input === null) d.input = performance.now() }, true)
  for (const type of ['focusin', 'focusout']) window.addEventListener(type, () => d.hit(), true)
  try { new PerformanceObserver((list) => { for (const e of list.getEntries()) d.longtasks.push(e.startTime) }).observe({ type: 'longtask', buffered: true }) } catch {}
  window.__drive = d
  return d
})()`
const arm = (cdp, reflect) => cdp.evaluate(`(() => {
  const d = ${PROBE}
  d.obs?.disconnect()
  d.input = null; d.reflect = null; d.paint = null; d.armedAt = performance.now()
  const when = () => { try { return !!(${reflect}) } catch { return false } }
  d.hit = () => {
    if (d.reflect !== null || !when()) return
    d.reflect = performance.now()
    d.obs.disconnect()
    requestAnimationFrame(() => { d.paint = performance.now() })
  }
  d.obs = new MutationObserver(() => d.hit())
  d.obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true })
})()`)
const probed = (cdp) => cdp.evaluate(`(() => {
  const d = window.__drive
  const from = d.input ?? d.armedAt
  const since = (t) => (t === null ? null : Math.round((t - from) * 10) / 10)
  return { domMs: since(d.reflect), paintMs: since(d.paint), longtasks: d.longtasks.filter((t) => t >= d.armedAt).length }
})()`)

const COST = ['LayoutCount', 'RecalcStyleCount', 'LayoutDuration', 'RecalcStyleDuration', 'ScriptDuration', 'TaskDuration']
let costOn = false
async function cost(cdp) {
  if (!costOn) await cdp.send('Performance.enable')
  costOn = true
  const { metrics } = await cdp.send('Performance.getMetrics')
  return Object.fromEntries(metrics.filter((m) => COST.includes(m.name)).map((m) => [m.name, m.value]))
}

export const metrics = []
/** Runs one gesture and records its cost: `reflect` is an in-page expression that holds once the DOM shows the gesture, timed from the gesture's first input; `files` are watched for `window` ms from the gesture, timed to their first write; with no files the record closes at the frame after `reflect`, or after `window`. */
export async function measure(cdp, name, act, { reflect = 'false', files = [], window = files.length ? 1500 : 3000 } = {}) {
  await arm(cdp, reflect)
  const before = await cost(cdp)
  const watcher = files.length ? await watch(files) : null
  const t0 = clock()
  await act()
  if (watcher) await sleep(Math.max(0, window - (clock() - t0)))
  else await settles(() => cdp.evaluate('window.__drive.paint !== null'), window)
  const disk = watcher ? await watcher.stop() : null
  const after = await cost(cdp)
  const m = {
    name,
    writes: disk?.writes ?? {},
    diskMs: disk?.firstAt ? round(disk.firstAt - t0) : null,
    ...(await probed(cdp)),
    ...Object.fromEntries(COST.map((k) => [k, k.endsWith('Duration') ? round((after[k] - before[k]) * 1000) : after[k] - before[k]])),
  }
  metrics.push(m)
  return { ...m, states: disk?.states ?? {}, final: disk?.final ?? {} }
}

const pct = (xs, p) => {
  const s = xs.filter((x) => typeof x === 'number').sort((a, b) => a - b)
  return s.length ? s[Math.max(0, Math.ceil(p * s.length) - 1)] : null
}
/** Every gesture name once, with its runs' medians and the 95th percentile of its DOM latency. */
function summarize(list = metrics) {
  const by = new Map()
  for (const m of list) by.set(m.name, [...(by.get(m.name) ?? []), m])
  return [...by].map(([name, ms]) => {
    const med = (k) => pct(ms.map((m) => m[k]), 0.5)
    return {
      name, n: ms.length, writes: Object.values(ms[0].writes).join('/') || '–',
      diskMs: med('diskMs'), domMs: med('domMs'), domP95: pct(ms.map((m) => m.domMs), 0.95), paintMs: med('paintMs'),
      layouts: med('LayoutCount'), styles: med('RecalcStyleCount'), layoutMs: med('LayoutDuration'), styleMs: med('RecalcStyleDuration'),
      scriptMs: med('ScriptDuration'), taskMs: med('TaskDuration'), longtasks: med('longtasks'),
    }
  })
}
const COLUMNS = ['n', 'writes', 'diskMs', 'domMs', 'domP95', 'paintMs', 'layouts', 'styles', 'scriptMs', 'taskMs', 'longtasks']
const cellOf = (v) => (v === null || v === undefined ? '—' : String(v))
const table = (rows, cols) => {
  const width = Math.min(64, Math.max(7, ...rows.map((r) => r.name.length)))
  console.log(['gesture'.padEnd(width), ...cols.map((c) => c.padStart(9))].join(' '))
  for (const r of rows) console.log([r.name.slice(0, width).padEnd(width), ...cols.map((c) => cellOf(r[c]).padStart(9))].join(' '))
}
export const printMetrics = (list = metrics) => table(summarize(list), COLUMNS)

/** Writes every record to `metrics.json` beside the screenshots, answering its path. */
export function writeMetrics() {
  const path = join(shotsDir ?? tmpdir(), 'metrics.json')
  writeFileSync(path, JSON.stringify({ repo: REPO, at: new Date().toISOString(), metrics }, null, 2))
  return path
}

/** Prints each gesture's medians beside a baseline `metrics.json`'s, with the change; a gesture one side lacks reads —. */
export function against(path) {
  const base = new Map(summarize(JSON.parse(readFileSync(path, 'utf8')).metrics).map((r) => [r.name, r]))
  const now = new Map(summarize().map((r) => [r.name, r]))
  const keys = ['domMs', 'domP95', 'paintMs', 'layouts', 'styles', 'scriptMs', 'taskMs']
  const delta = (a, b) => (typeof a === 'number' && typeof b === 'number' ? round(a - b) : null)
  const rows = [...new Set([...base.keys(), ...now.keys()])].map((name) => ({
    name,
    ...Object.fromEntries(keys.flatMap((k) => [[k, now.get(name)?.[k]], [`Δ${k}`, delta(now.get(name)?.[k], base.get(name)?.[k])]])),
  }))
  console.log(`\nagainst ${path}`)
  table(rows, keys.flatMap((k) => [k, `Δ${k}`]))
}

// ── The run ─────────────────────────────────────────────────────────────────

/** Kills every Electron a run left behind: the helpers carry the run's temp dir on their command line, and the main is a helper's parent. */
function sweepStrays() {
  const rows = execFileSync('ps', ['-A', '-o', 'pid=,ppid=,command='], { encoding: 'utf8' }).split('\n').filter((l) => l.includes('pommora-drive-'))
  for (const row of rows) {
    const [pid, ppid] = row.trim().split(/\s+/, 2).map(Number)
    for (const p of ppid > 1 ? [pid, ppid] : [pid]) if (p !== process.pid) try { process.kill(p, 'SIGKILL') } catch {}
  }
}

/** Builds the app, backs up `~/Test`, and launches the build with its own userData on `debugPort`, answering once the sidebar draws. */
export async function launch(debugPort, shotsName) {
  sweepStrays()
  port = debugPort
  shotsDir = process.env.POMMORA_DRIVE_SHOTS ?? join(tmpdir(), shotsName)
  execFileSync('npm', ['run', 'build'], { cwd: REPO, stdio: ['ignore', 'ignore', 'inherit'] })
  backup = mkdtempSync(join(tmpdir(), 'pommora-drive-'))
  execFileSync('rsync', ['-a', NEXUS + '/', join(backup, 'Test') + '/'])
  userData = join(backup, 'ud'); mkdirSync(userData)
  writeFileSync(join(userData, 'pommora.json'), JSON.stringify({ lastNexusPath: NEXUS }))
  mkdirSync(shotsDir, { recursive: true })
  process.once('SIGINT', () => restore().then(() => process.exit(130)))
  const env = { ...process.env, POMMORA_USERDATA: userData, POMMORA_DEBUG_PORT: String(port) }
  delete env.ELECTRON_RUN_AS_NODE; delete env.ELECTRON_RENDERER_URL
  child = spawn(ELECTRON, ['.'], { cwd: join(REPO, 'Desktop'), env, stdio: 'ignore' })
  const cdp = await connect()
  await until('the sidebar', () => cdp.evaluate(`!!document.querySelector('.row span')`), 30000)
  await sleep(3000)
  return { cdp, pid: child.pid }
}

/** Attaches to an instance already listening on `debugPort`, built or the dev instance the Vite server serves, with no build, backup, or launch. */
export async function attach(debugPort) {
  port = debugPort
  return { cdp: await connect(['app://', 'http://localhost']) }
}

// A build that failed before the backup leaves nothing to restore.
export async function restore() {
  if (!backup) return
  if (child) {
    child.kill('SIGTERM')
    await Promise.race([new Promise((r) => child.once('exit', r)), sleep(8000)])
    if (child.exitCode === null) child.kill('SIGKILL')
  }
  sweepStrays()
  execFileSync('rsync', ['-a', '--delete', join(backup, 'Test') + '/', NEXUS + '/'])
  rmSync(backup, { recursive: true, force: true })
  console.log(`~/Test restored · screenshots in ${shotsDir}`)
}
