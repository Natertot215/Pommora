#!/usr/bin/env node
// Headless driver for the Links Cleanup's live checks. One process launches (or attaches to) a scratch
// Pommora instance over CDP, seeds a scratch Nexus, and runs scenario files that call the actions below.
//
//   node drive.mjs run <scenario…> [--attach <port>] [--keep] [--build|--no-build] [--only <check-substring>]
//   node drive.mjs launch [--port 9345]        start the scratch instance and leave it running
//   node drive.mjs quit                        stop the scratch instance started by launch/run --keep
//   node drive.mjs seed                        rebuild the scratch Nexus and userData without launching
//   node drive.mjs actions                     list every action a scenario can call
//   node drive.mjs eval '<js>'                 evaluate in the attached renderer (window.__pommora is the store)
//
// Scenarios live in ./scenarios/<name>.mjs and export { name, run(d) }. Screenshots land in ./shots/<name>/.
import { spawn, execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { seedScratch, SCRATCH } from './seed.mjs'

const MAIN_INSPECT_PORT = 9346
const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '../../../..')
const DEFAULT_PORT = 9345
const PID_FILE = join(SCRATCH.root, 'drive.pid')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------------------------------------------------------------- CDP client

class Cdp {
  constructor(ws) {
    this.ws = ws
    this.seq = 0
    this.pending = new Map()
    this.listeners = new Map()
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id !== undefined) {
        const p = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        if (!p) return
        msg.error ? p.reject(new Error(`${msg.error.message} (${JSON.stringify(msg.error.data ?? '')})`)) : p.resolve(msg.result)
      } else for (const fn of this.listeners.get(msg.method) ?? []) fn(msg.params)
    })
  }
  static async connect(url) {
    const ws = new WebSocket(url)
    await new Promise((res, rej) => {
      ws.addEventListener('open', res, { once: true })
      ws.addEventListener('error', rej, { once: true })
    })
    return new Cdp(ws)
  }
  send(method, params = {}) {
    const id = ++this.seq
    this.ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }))
  }
  on(method, fn) {
    this.listeners.set(method, [...(this.listeners.get(method) ?? []), fn])
  }
  close() {
    this.ws.close()
  }
}

async function targets(port) {
  const res = await fetch(`http://127.0.0.1:${port}/json`).catch(() => null)
  if (!res?.ok) return null
  return (await res.json()).filter((t) => t.type === 'page')
}

async function waitForCdp(port, ms = 60000) {
  const until = Date.now() + ms
  while (Date.now() < until) {
    const t = await targets(port)
    if (t?.length) return t
    await sleep(250)
  }
  throw new Error(`no CDP target on ${port} after ${ms}ms`)
}

// ---------------------------------------------------------------- instance

function builtMainIsStale() {
  const out = join(REPO, 'Desktop/out/main/index.js')
  if (!existsSync(out)) return true
  const built = statSync(out).mtimeMs
  const newest = (dir) => {
    let max = 0
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      if (name.name === 'node_modules' || name.name === 'out' || name.name.startsWith('.')) continue
      const p = join(dir, name.name)
      if (name.isDirectory()) max = Math.max(max, newest(p))
      else if (/\.(ts|tsx)$/.test(name.name) && !/\.test\./.test(name.name)) max = Math.max(max, statSync(p).mtimeMs)
    }
    return max
  }
  return Math.max(newest(join(REPO, 'Desktop')), newest(join(REPO, 'Core'))) > built
}

function devRendererUp() {
  try {
    execFileSync('curl', ['-sf', '-o', '/dev/null', 'http://localhost:5173/'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const electronEnv = (port) => {
  const env = { ...process.env, POMMORA_USERDATA: SCRATCH.userData, POMMORA_DEBUG_PORT: String(port) }
  delete env.ELECTRON_RUN_AS_NODE
  return env
}

export async function launch({ port = DEFAULT_PORT, build, reseed = true, log = console.error } = {}) {
  if (reseed) seedScratch()
  mkdirSync(SCRATCH.root, { recursive: true })
  let child
  if (devRendererUp()) {
    const stale = build === true || (build !== false && builtMainIsStale())
    if (stale) {
      log('[drive] built main is older than the sources; building Desktop (npm run build)…')
      execFileSync('npm', ['run', 'build', '-w', 'Desktop'], { cwd: REPO, stdio: 'inherit', env: electronEnv(port) })
    }
    log(`[drive] borrowing the dev renderer on :5173; launching a scratch instance on CDP :${port}`)
    child = spawn(join(REPO, 'node_modules/.bin/electron'), [`--inspect=${MAIN_INSPECT_PORT}`, '.'], {
      cwd: join(REPO, 'Desktop'),
      env: { ...electronEnv(port), ELECTRON_RENDERER_URL: 'http://localhost:5173' },
      detached: true,
      stdio: 'ignore',
    })
  } else {
    log(`[drive] no dev renderer on :5173; starting electron-vite dev with the scratch userData on CDP :${port}`)
    child = spawn('npm', ['run', 'dev'], { cwd: REPO, env: electronEnv(port), detached: true, stdio: 'ignore' })
  }
  child.unref()
  writeFileSync(PID_FILE, String(child.pid))
  await waitForCdp(port)
  return attach(port, child.pid)
}

export function quit() {
  if (!existsSync(PID_FILE)) return false
  const pid = Number(readFileSync(PID_FILE, 'utf8'))
  try {
    process.kill(-pid, 'SIGTERM')
  } catch {
    try {
      process.kill(pid, 'SIGTERM')
    } catch {}
  }
  rmSync(PID_FILE, { force: true })
  return true
}

const MOD = { alt: 1, ctrl: 2, meta: 4, shift: 8 }
const KEYS = {
  Enter: { key: 'Enter', code: 'Enter', vk: 13, text: '\r' },
  Tab: { key: 'Tab', code: 'Tab', vk: 9 },
  Escape: { key: 'Escape', code: 'Escape', vk: 27 },
  Backspace: { key: 'Backspace', code: 'Backspace', vk: 8 },
  Delete: { key: 'Delete', code: 'Delete', vk: 46 },
  ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', vk: 37 },
  ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', vk: 39 },
  ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', vk: 38 },
  ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', vk: 40 },
  Home: { key: 'Home', code: 'Home', vk: 36 },
  End: { key: 'End', code: 'End', vk: 35 },
  Space: { key: ' ', code: 'Space', vk: 32, text: ' ' },
}
const MAC_KEY_CODES = { Escape: 53, Enter: 36, ArrowDown: 125, ArrowUp: 126, ArrowRight: 124, ArrowLeft: 123 }

// ---------------------------------------------------------------- the driver

export async function attach(port = DEFAULT_PORT, pid = null) {
  if (pid === null && existsSync(PID_FILE)) pid = Number(readFileSync(PID_FILE, 'utf8'))
  const list = await waitForCdp(port, 5000)
  const d = new Driver(port, pid)
  await d.useWindow(0, list)
  await d.waitFor(() => !!window.__pommora?.getState?.().tree, { timeout: 60000, every: 200, label: 'the renderer store and its tree' })
  await d.settle(300)
  return d
}

class Driver {
  constructor(port, pid) {
    this.port = port
    this.pid = pid
    this.checks = []
    this.shotDir = join(HERE, 'shots', 'adhoc')
  }

  // -- windows --------------------------------------------------------------
  /** Attach to the nth page target (0 = the main window; a Page Window or settings window is a later one). */
  async useWindow(n = 0, list) {
    const all = list ?? (await targets(this.port)) ?? []
    const sorted = all.filter((t) => !/devtools/.test(t.url))
    const t = sorted[n]
    if (!t) throw new Error(`no window ${n}; have ${sorted.map((x) => x.title || x.url).join(' | ')}`)
    this.cdp?.close()
    this.cdp = await Cdp.connect(t.webSocketDebuggerUrl)
    await this.cdp.send('Runtime.enable')
    await this.cdp.send('Page.enable')
    await this.cdp.send('Page.bringToFront')
    return t
  }
  async windows() {
    return ((await targets(this.port)) ?? []).filter((t) => !/devtools/.test(t.url)).map((t) => ({ title: t.title, url: t.url }))
  }
  async front() {
    if (this.pid) {
      try {
        execFileSync('osascript', ['-e', `tell application "System Events" to set frontmost of (first process whose unix id is ${this.pid}) to true`], { stdio: 'ignore' })
      } catch {}
    }
    await this.cdp.send('Page.bringToFront')
  }

  // -- evaluate -------------------------------------------------------------
  /** Evaluate JS in the renderer; a function is called with the given args (serializable), a string runs as is. Promises are awaited. */
  async eval(fnOrSrc, ...args) {
    const live = "const $$ = (sel) => [...document.querySelectorAll(sel)].filter((e) => !e.closest('[inert]'));"
    const expression = `(() => { ${live} return (${typeof fnOrSrc === 'function' ? `(${fnOrSrc.toString()})(...${JSON.stringify(args)})` : fnOrSrc}) })()`
    const r = await this.cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
    return r.result.value
  }
  store(fn, ...args) {
    return this.eval(`((s, ...a) => (${fn.toString()})(s, ...a))(window.__pommora.getState(), ...${JSON.stringify(args)})`)
  }
  async waitFor(fn, { timeout = 5000, every = 50, label = 'condition' } = {}, ...args) {
    const until = Date.now() + timeout
    let last
    while (Date.now() < until) {
      last = await this.eval(fn, ...args)
      if (last) return last
      await sleep(every)
    }
    throw new Error(`timed out waiting for ${label}; last value ${JSON.stringify(last)}`)
  }
  settle(ms = 120) {
    return sleep(ms)
  }

  // -- store / settings / navigation ----------------------------------------
  /** Sets a setting by key, routing to personalization or device prefs; returns the stored value. */
  setSetting(key, value) {
    return this.store(
      (s, key, value) => {
        if (key in (s.devicePrefs ?? {}) || key === 'defaultLinkFormat') s.setDevicePref(key, value)
        else s.setPersonalization(key, value)
        return window.__pommora.getState().devicePrefs?.[key] ?? 'set'
      },
      key,
      value,
    )
  }
  pages() {
    return this.store((s) => {
      const out = []
      const walk = (n) => {
        if (!n || typeof n !== 'object') return
        if (Array.isArray(n)) return n.forEach(walk)
        if (n.kind === 'page' && typeof n.title === 'string' && typeof n.path === 'string') out.push({ id: n.id, title: n.title, path: n.path })
        for (const v of Object.values(n)) if (v && typeof v === 'object') walk(v)
      }
      walk(s.tree)
      return out
    })
  }
  async page(title) {
    const hits = (await this.pages()).filter((p) => p.title === title)
    if (hits.length !== 1) throw new Error(`page "${title}": ${hits.length} matches`)
    return hits[0]
  }
  /** Opens a page by title in the main window and waits for its editor. */
  async openPage(title, opts = {}) {
    const p = await this.page(title)
    await this.store((s, p, opts) => s.select({ kind: 'page', id: p.id, path: p.path }, opts), p, opts)
    await this.waitFor(() => $$('.cm-content').length > 0, { label: 'the page editor' })
    await this.settle(200)
    return p
  }
  async openCollection(name) {
    const col = await this.store((s, name) => (s.tree?.collections ?? []).find((c) => c.title === name || c.name === name) ?? null, name)
    if (!col) throw new Error(`collection "${name}" not found`)
    await this.store((s, col) => s.select({ kind: 'collection', id: col.id }), col)
    await this.settle(300)
    return col
  }
  async openSet(collection, set) {
    const s = await this.store(
      (st, c, name) => {
        const col = (st.tree?.collections ?? []).find((x) => x.title === c || x.name === c)
        const walk = (nodes) => {
          for (const n of nodes ?? []) {
            if (n.kind === 'set' && (n.title === name || n.name === name)) return n
            const deeper = walk(n.children ?? n.sets)
            if (deeper) return deeper
          }
          return null
        }
        const found = walk(col?.children ?? col?.sets)
        return found ? { id: found.id, path: found.path } : null
      },
      collection,
      set,
    )
    if (!s) throw new Error(`set "${set}" in "${collection}" not found`)
    await this.store((st, s) => st.select({ kind: 'set', id: s.id, path: s.path }), s)
    await this.settle(300)
    return s
  }

  // -- DOM ------------------------------------------------------------------
  count(selector) {
    return this.eval((sel) => $$(sel).length, selector)
  }
  text(selector, nth = 0) {
    return this.eval((sel, n) => $$(sel)[n]?.textContent ?? null, selector, nth)
  }
  texts(selector) {
    return this.eval((sel) => $$(sel).map((e) => e.textContent), selector)
  }
  classes(selector, nth = 0) {
    return this.eval((sel, n) => [...($$(sel)[n]?.classList ?? [])], selector, nth)
  }
  attr(selector, name, nth = 0) {
    return this.eval((sel, a, n) => $$(sel)[n]?.getAttribute(a) ?? null, selector, name, nth)
  }
  /** Every element matching `selector` as { text, classes, attrs } for assertions and reports. */
  spans(selector) {
    return this.eval(
      (sel) => $$(sel).map((e) => ({ text: e.textContent, classes: [...e.classList], src: e.getAttribute('data-src'), link: e.hasAttribute('data-link') })),
      selector,
    )
  }
  rect(selector, nth = 0) {
    return this.eval(
      (sel, n) => {
        const el = $$(sel)[n]
        if (!el) return null
        el.scrollIntoView({ block: 'nearest' })
        const r = el.getBoundingClientRect()
        return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 }
      },
      selector,
      nth,
    )
  }
  /** The viewport point of a text offset inside the first editor whose content matches `within` (a selector; default the page body). */
  async pointAt(offset, within = '.cm-content') {
    return this.eval(
      (sel, off) => {
        const v = $$(sel)[0]?.cmTile?.root?.view
        const c = v?.coordsAtPos(off)
        return c ? { x: (c.left + c.right) / 2, y: (c.top + c.bottom) / 2 } : null
      },
      within,
      offset,
    )
  }

  // -- pointer --------------------------------------------------------------
  async mouse(type, x, y, { button = 'left', mods = 0, clickCount = 1 } = {}) {
    await this.cdp.send('Input.dispatchMouseEvent', { type, x, y, button, modifiers: mods, clickCount, buttons: type === 'mousePressed' ? (button === 'right' ? 2 : 1) : 0 })
  }
  async clickAt(x, y, { button = 'left', mods = {}, dbl = false } = {}) {
    const m = (mods.meta ? MOD.meta : 0) | (mods.shift ? MOD.shift : 0) | (mods.alt ? MOD.alt : 0) | (mods.ctrl ? MOD.ctrl : 0)
    await this.front()
    await this.mouse('mouseMoved', x, y)
    for (let i = 1; i <= (dbl ? 2 : 1); i++) {
      await this.mouse('mousePressed', x, y, { button, mods: m, clickCount: i })
      await this.mouse('mouseReleased', x, y, { button, mods: m, clickCount: i })
    }
    await this.settle()
  }
  /** Left-click the center of an element (`{ meta: true }` for ⌘-click). */
  async click(selector, { nth = 0, mods = {}, dbl = false } = {}) {
    const r = await this.rect(selector, nth)
    if (!r) throw new Error(`click: no element ${selector}[${nth}]`)
    await this.clickAt(r.cx, r.cy, { mods, dbl })
    return r
  }
  /** A real right-click (mousePressed + mouseReleased, button right) at an element; main's native menu pops for editor surfaces. */
  async rightClick(selector, { nth = 0 } = {}) {
    const r = await this.rect(selector, nth)
    if (!r) throw new Error(`rightClick: no element ${selector}[${nth}]`)
    await this.clickAt(r.cx, r.cy, { button: 'right' })
    await sleep(250)
    return r
  }
  async rightClickAt(x, y) {
    await this.clickAt(x, y, { button: 'right' })
    await sleep(250)
  }
  async hover(selector, { nth = 0 } = {}) {
    const r = await this.rect(selector, nth)
    if (!r) throw new Error(`hover: no element ${selector}[${nth}]`)
    await this.mouse('mouseMoved', r.cx, r.cy)
    await this.settle(400)
  }
  /** Drag from one point to another with the left button held (`buttons: 1` on every move). */
  async drag(from, to, steps = 8) {
    await this.mouse('mousePressed', from.x, from.y)
    for (let i = 1; i <= steps; i++) {
      const x = from.x + ((to.x - from.x) * i) / steps
      const y = from.y + ((to.y - from.y) * i) / steps
      await this.cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 1 })
    }
    await this.mouse('mouseReleased', to.x, to.y)
    await this.settle()
  }

  // -- keyboard -------------------------------------------------------------
  /** Press a named key (Enter, Escape, ArrowLeft, …) or a single character, with modifiers; editing commands (Paste, Copy, Cut, SelectAll) ride `commands`. */
  async press(key, { meta = false, shift = false, alt = false, ctrl = false, commands } = {}) {
    const mods = (meta ? MOD.meta : 0) | (shift ? MOD.shift : 0) | (alt ? MOD.alt : 0) | (ctrl ? MOD.ctrl : 0)
    // a printable character outside the table rides its text alone: a punctuation code point read as a virtual key is another key (`(` is ArrowDown, `#` is End, `.` is Delete)
    const k = KEYS[key] ?? { key, code: /^[a-z0-9]$/i.test(key) ? `Key${key.toUpperCase()}` : '', vk: /^[a-z0-9]$/i.test(key) ? key.toUpperCase().charCodeAt(0) : 0, text: key }
    const base = { modifiers: mods, key: k.key, code: k.code, windowsVirtualKeyCode: k.vk, nativeVirtualKeyCode: k.vk }
    await this.cdp.send('Input.dispatchKeyEvent', { type: k.text && !meta && !ctrl ? 'keyDown' : 'rawKeyDown', ...base, ...(k.text && !meta && !ctrl ? { text: k.text, unmodifiedText: k.text } : {}), ...(commands ? { commands } : {}) })
    await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
    await this.settle(60)
  }
  /** Type text one character at a time through real key events, so auto-pair, the picker, and typography fire as they do for a person. */
  async type(text) {
    for (const ch of text) {
      if (ch === '\n') await this.press('Enter')
      else await this.press(ch)
    }
    await this.settle()
  }
  /** Insert text in one input event (fast; no per-key behavior). */
  async insert(text) {
    await this.cdp.send('Input.insertText', { text })
    await this.settle()
  }
  cmd(key) {
    return this.press(key, { meta: true })
  }
  async selectAll() {
    await this.press('a', { meta: true, commands: ['SelectAll'] })
  }
  async copy() {
    await this.press('c', { meta: true, commands: ['Copy'] })
  }
  async cut() {
    await this.press('x', { meta: true, commands: ['Cut'] })
  }
  /** ⌘V against the system clipboard (`clipboard(text)` first to seat one). */
  async paste() {
    await this.press('v', { meta: true, commands: ['Paste'] })
    await this.settle(200)
  }
  /** Put text on the system clipboard, which main and the renderer both read. */
  clipboard(text) {
    execFileSync('pbcopy', { input: text })
  }
  readClipboard() {
    return execFileSync('pbpaste', { encoding: 'utf8' })
  }

  // -- the editor -----------------------------------------------------------
  /** A handle on a CodeMirror editor: the page body by default, or the live cell/pane editor matching `selector`. */
  editor(selector = '.cm-content') {
    const d = this
    const view = (fn, ...args) => d.eval(`((sel, f, ...a) => { const v = $$(sel)[0]?.cmTile?.root?.view; if (!v) throw new Error('no editor at ' + sel); return (${fn.toString()})(v, ...a) })(${JSON.stringify(selector)}, null, ...${JSON.stringify(args)})`)
    return {
      doc: () => view((v) => v.state.doc.toString()),
      setDoc: (text) => view((v, t) => v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: t } }), text),
      caret: (pos) => view((v, p) => (v.focus(), v.dispatch({ selection: { anchor: p }, scrollIntoView: true })), pos),
      select: (from, to) => view((v, a, b) => (v.focus(), v.dispatch({ selection: { anchor: a, head: b }, scrollIntoView: true })), from, to),
      selection: () => view((v) => ({ from: v.state.selection.main.from, to: v.state.selection.main.to })),
      focus: () => view((v) => v.focus()),
      indexOf: (needle, from = 0) => view((v, n, f) => v.state.doc.toString().indexOf(n, f), needle, from),
      /** Place the caret right after `needle`'s nth occurrence (or at `offsetInside` within it). */
      caretIn: async (needle, offsetInside = needle.length, nth = 0) => {
        let at = -1
        for (let i = 0; i <= nth; i++) at = await view((v, n, f) => v.state.doc.toString().indexOf(n, f), needle, at + 1)
        if (at < 0) throw new Error(`caretIn: "${needle}" not in the document`)
        await view((v, p) => (v.focus(), v.dispatch({ selection: { anchor: p }, scrollIntoView: true })), at + offsetInside)
        return at + offsetInside
      },
      undo: () => d.press('z', { meta: true }),
      readOnly: () => view((v) => v.state.readOnly),
    }
  }
  /** Opens a throwaway page and sets its body (autosave writes to the scratch Nexus only). */
  async scratchPage(title, body) {
    await this.openPage(title)
    const ed = this.editor()
    await ed.setDoc(body)
    await this.settle(250)
    return ed
  }

  // -- main process (Node inspector) and native menus -------------------------
  /** Evaluate in the main process through its inspector (`--inspect`); the drive launches the scratch instance with it. */
  async evalMain(expression) {
    if (!this.mainCdp) {
      const list = await (await fetch(`http://127.0.0.1:${MAIN_INSPECT_PORT}/json`)).json()
      this.mainCdp = await Cdp.connect(list[0].webSocketDebuggerUrl)
      await this.mainCdp.send('Runtime.enable')
    }
    const r = await this.mainCdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, includeCommandLineAPI: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
    return r.result.value
  }
  /** Hook main's Menu so a popped native menu is recorded (rows, submenus) and answered by the armed pick instead of shown. */
  async hookNativeMenus() {
    if (this.nativeHooked) return
    await this.evalMain(`(() => {
      if (globalThis.__drive) return 'hooked'
      const req = typeof require === 'function' ? require : process.mainModule.require
      const { Menu } = req('electron')
      const state = { last: null, pick: undefined, popped: 0 }
      globalThis.__drive = state
      const rows = (menu) => menu.items.map((i) => ({ label: i.label, type: i.type, role: i.role ?? null, enabled: i.enabled, visible: i.visible, accelerator: i.accelerator ?? null, submenu: i.submenu ? rows(i.submenu) : undefined }))
      const find = (menu, path) => { const [head, ...rest] = path; const item = menu.items.find((i) => i.label === head); return !item ? null : rest.length ? (item.submenu ? find(item.submenu, rest) : null) : item }
      const popup = Menu.prototype.popup
      Menu.prototype.popup = function (opts = {}) {
        if (state.pick === undefined) return popup.call(this, opts)
        state.last = rows(this)
        state.popped++
        const armed = state.pick
        state.pick = undefined
        const want = armed && typeof armed === 'object' && !Array.isArray(armed) ? armed.pick : armed
        const hold = armed && typeof armed === 'object' && !Array.isArray(armed) ? (armed.holdMs ?? 0) : 0
        setTimeout(() => {
          const item = want === null || want === undefined ? null : find(this, Array.isArray(want) ? want : [want])
          if (!item) return opts.callback?.()
          item.click(undefined, opts.window, opts.window?.webContents)
        }, hold)
      }
      return 'installed'
    })()`)
    this.nativeHooked = true
  }
  /** The next native menu is answered with `pick` (a row label, a [submenu, row] path, or `{ pick, holdMs }` to keep it pending first; null dismisses) instead of being shown, and its rows are kept for `lastNativeMenu()`. */
  async armNativeMenu(pick = null) {
    await this.hookNativeMenus()
    await this.evalMain(`(globalThis.__drive.pick = ${JSON.stringify(pick)}, globalThis.__drive.last = null, true)`)
  }
  /** The rows of the last native menu the hook answered: [{ label, type, role, enabled, submenu? }], or null if none popped since arming. */
  lastNativeMenu() {
    return this.evalMain('JSON.stringify(globalThis.__drive?.last ?? null)').then((v) => JSON.parse(v))
  }
  /** Waits for the armed native menu to pop (main's context-menu can trail a real right-click by a beat) and returns its rows, or null on timeout. */
  async waitNativeMenu(timeout = 3000) {
    const until = Date.now() + timeout
    while (Date.now() < until) {
      const rows = await this.lastNativeMenu()
      if (rows) return rows
      await sleep(80)
    }
    return null
  }
  /** Fire a contextmenu on the element matching `selector` whose text is `text` (null: the first match; `within`: a selector an ancestor must match). The renderer's own doors answer it: links, resting cells, value seats. */
  contextMenuOn(selector, text, within = null) {
    return this.eval(
      (sel, text, within) => {
        const pool = $$(sel).filter((e) => !within || e.closest(within))
        const el = text === null ? pool[0] : (pool.find((e) => e.textContent === text) ?? pool.find((e) => e.textContent?.includes(text)))
        if (!el) return false
        el.scrollIntoView({ block: 'nearest' })
        const b = el.getBoundingClientRect()
        el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: b.x + b.width / 2, clientY: b.y + b.height / 2, button: 2 }))
        return true
      },
      selector,
      text,
      within,
    )
  }
  /** Pop the native menu a contextmenu on (selector, text) raises, answer it with `pick`, and return its rows. */
  async nativeMenuOn(selector, text, pick = null, within = null) {
    await this.armNativeMenu(pick)
    const hit = await this.contextMenuOn(selector, text, within)
    if (!hit) return null
    const rows = await this.waitNativeMenu()
    await this.settle(250)
    return rows
  }

  // -- native menus (main's context menus) ----------------------------------
  /** Navigate the native menu that is open: each step is Down, Up, Right, Left, Enter, or Escape. */
  async menu(...steps) {
    for (const s of steps) {
      const code = MAC_KEY_CODES[s] ?? MAC_KEY_CODES[{ down: 'ArrowDown', up: 'ArrowUp', right: 'ArrowRight', left: 'ArrowLeft', enter: 'Enter', esc: 'Escape' }[s]]
      if (code === undefined) throw new Error(`menu: unknown step ${s}`)
      execFileSync('osascript', ['-e', `tell application "System Events" to key code ${code}`])
      await sleep(120)
    }
    await this.settle(250)
  }
  menuDown(n) {
    return this.menu(...Array(n).fill('down'))
  }
  menuDismiss() {
    return this.menu('esc')
  }
  /** Pick a row of an in-renderer menu (the link menu, Paste As's renderer rows, pickers) by its visible label. */
  async pickRow(label) {
    const ok = await this.waitFor(
      (label) => {
        const el = $$('[role="menuitem"], [role="option"], button, li').find((e) => e.textContent?.trim() === label)
        if (!el) return false
        el.click()
        return true
      },
      { label: `menu row "${label}"` },
      label,
    )
    await this.settle(200)
    return ok
  }
  menuRows() {
    return this.eval(() => $$('[role="menu"] [role="menuitem"], [role="listbox"] [role="option"]').map((e) => e.textContent?.trim()))
  }
  /** The in-renderer menu the store holds open (the link menu, value menus): its rows as { label, action, submenu? }, or null. */
  rendererMenu() {
    return this.store((s) => {
      const m = s.pendingMenu
      if (!m) return null
      const flat = (items) => items.map((i) => ({ label: i.label, action: i.action ?? null, submenu: i.submenu ? flat(i.submenu) : undefined }))
      return flat(m.items)
    })
  }
  /** Settle the open in-renderer menu with an action (or null to dismiss), as a click on its row would. */
  async settleMenu(action = null) {
    await this.store((s, a) => s.pendingMenu?.settle(a), action)
    await this.settle(250)
  }

  // -- screenshots & checks -------------------------------------------------
  async shot(name, selector = null) {
    mkdirSync(this.shotDir, { recursive: true })
    await this.front()
    const clip = selector ? await this.rect(selector) : null
    const r = await this.cdp.send('Page.captureScreenshot', {
      format: 'png',
      ...(clip ? { clip: { x: clip.x, y: clip.y, width: clip.w, height: clip.h, scale: 2 } } : {}),
    })
    const file = join(this.shotDir, `${name}.png`)
    writeFileSync(file, Buffer.from(r.data, 'base64'))
    return file
  }
  /** Record a check: `check('name', value === expected, { value, expected })`. */
  check(name, ok, evidence = {}) {
    this.checks.push({ name, ok: !!ok, evidence })
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  ${JSON.stringify(evidence)}`}`)
    return !!ok
  }
  async checkEq(name, actual, expected) {
    const a = await actual
    return this.check(name, JSON.stringify(a) === JSON.stringify(expected), { actual: a, expected })
  }
  async checkHas(name, selector, cls, nth = 0) {
    const c = await this.classes(selector, nth)
    return this.check(name, c.includes(cls), { classes: c, wanted: cls })
  }
  close() {
    this.cdp?.close()
  }
}

// ---------------------------------------------------------------- CLI

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag)
  return i === -1 ? fallback : process.argv[i + 1]
}
const has = (flag) => process.argv.includes(flag)

async function runScenarios(names) {
  const port = Number(arg('--attach', DEFAULT_PORT))
  const attached = has('--attach') || (await targets(port))?.length
  const d = attached ? await attach(port) : await launch({ port, build: has('--build') ? true : has('--no-build') ? false : undefined })
  const only = arg('--only', null)
  let failed = 0
  try {
    for (const name of names) {
      const mod = await import(pathToFileURL(join(HERE, 'scenarios', `${name}.mjs`)).href)
      d.shotDir = join(HERE, 'shots', name)
      d.checks = []
      console.log(`\n== ${mod.name ?? name} ==`)
      await mod.run(d, { only })
      const bad = d.checks.filter((c) => !c.ok)
      failed += bad.length
      console.log(`-- ${d.checks.length - bad.length}/${d.checks.length} passed${bad.length ? `; failed: ${bad.map((c) => c.name).join(', ')}` : ''}`)
    }
  } finally {
    d.close()
    if (!has('--keep') && !attached) quit()
  }
  process.exit(failed ? 1 : 0)
}

const actions = () => {
  const names = Object.getOwnPropertyNames(Driver.prototype).filter((n) => n !== 'constructor')
  console.log(['launch(opts)', 'attach(port)', 'quit()', ...names.map((n) => `d.${n}`), 'd.editor(sel).{doc,setDoc,caret,select,selection,focus,indexOf,caretIn,undo,readOnly}'].join('\n'))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, ...rest] = process.argv.slice(2)
  const positional = rest.filter((a, i, all) => !a.startsWith('--') && !(i > 0 && ['--attach', '--port', '--only'].includes(all[i - 1])))
  if (cmd === 'run') await runScenarios(positional)
  else if (cmd === 'launch') {
    const d = await launch({ port: Number(arg('--port', DEFAULT_PORT)), build: has('--build') ? true : has('--no-build') ? false : undefined })
    console.log(`launched; CDP :${d.port}; pid ${d.pid}; windows ${JSON.stringify(await d.windows())}`)
    d.close()
  } else if (cmd === 'quit') console.log(quit() ? 'stopped' : 'nothing running')
  else if (cmd === 'seed') console.log(seedScratch())
  else if (cmd === 'actions') actions()
  else if (cmd === 'eval') {
    const d = await attach(Number(arg('--attach', DEFAULT_PORT)))
    console.log(JSON.stringify(await d.eval(positional[0]), null, 2))
    d.close()
  } else {
    console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 12).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
  }
}
