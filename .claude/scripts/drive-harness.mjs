import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { ulid } from 'ulidx'
import { parse } from 'yaml'

export const REPO = join(homedir(), 'The Studio/Projects/Project Pommora')
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

async function connect() {
  const target = await until('the app window', async () => {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
    return list.find(
      (t) => t.type === 'page' && (t.url.startsWith('app://') || t.url.startsWith('http://localhost')),
    )
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

export const boxOf = (cdp, expr) =>
  cdp.evaluate(`(() => { const el = (${expr}); if (!el) throw new Error('no element for ' + ${JSON.stringify(expr)}); const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, left: b.left, top: b.top, right: b.right, bottom: b.bottom } })()`)
export const overlaps = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

export async function mouseAt(cdp, { x, y }, { button = 'left', modifiers = 0 } = {}) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' })
  for (const type of ['mousePressed', 'mouseReleased'])
    await cdp.send('Input.dispatchMouseEvent', { type, x, y, button, buttons: type === 'mousePressed' ? (button === 'left' ? 1 : 2) : 0, clickCount: 1, modifiers })
  await sleep(500)
}
export const mouseClick = async (cdp, expr, opts) => mouseAt(cdp, await boxOf(cdp, expr), opts)
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

const VK = { Enter: 13, Escape: 27, Tab: 9, Backspace: 8, b: 66 }
export async function pressKey(cdp, name, modifiers = 0) {
  for (const type of ['rawKeyDown', 'keyUp'])
    await cdp.send('Input.dispatchKeyEvent', { type, key: name, code: name.length === 1 ? `Key${name.toUpperCase()}` : name, windowsVirtualKeyCode: VK[name], modifiers })
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

// ── The run ─────────────────────────────────────────────────────────────────

/** Builds the app, backs up `~/Test`, and launches the build with its own userData on `debugPort`, answering once the sidebar draws. */
export async function launch(debugPort, shotsName) {
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

/** Attaches to an instance already listening on `debugPort` — the dev instance, whose renderer the Vite server serves — with no build, backup, or launch; `restore` then has nothing to put back. */
export async function attach(debugPort) {
  port = debugPort
  return { cdp: await connect() }
}

// A build that failed before the backup leaves nothing to restore.
export async function restore() {
  if (!backup) return
  if (child) {
    child.kill('SIGTERM')
    await Promise.race([new Promise((r) => child.once('exit', r)), sleep(8000)])
    if (child.exitCode === null) child.kill('SIGKILL')
  }
  const strays = execFileSync('ps', ['-A', '-o', 'pid=,command='], { encoding: 'utf8' }).split('\n').filter((l) => l.includes(userData)).map((l) => Number.parseInt(l, 10))
  for (const pid of strays) try { process.kill(pid, 'SIGKILL') } catch {}
  execFileSync('rsync', ['-a', '--delete', join(backup, 'Test') + '/', NEXUS + '/'])
  rmSync(backup, { recursive: true, force: true })
  console.log(`~/Test restored · screenshots in ${shotsDir}`)
}
