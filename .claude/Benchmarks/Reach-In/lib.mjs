// Launch and drive one built worktree on one Nexus, measuring through the probes instrument.mjs installs.
import { spawn } from 'node:child_process'
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** The harness's own folder, where the patches, scripts, and copied-back results live. */
export const HARNESS = import.meta.dirname
/** The Pommora checkout the worktrees are cut from: POMMORA_REPO, else the repository holding the harness. */
export const REPO =
  process.env.POMMORA_REPO ?? execFileSync('git', ['-C', HARNESS, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
/** The working folder: worktrees, benchmark Nexuses, fills, live clones, userData, and raw results. */
export const WORK = process.env.REACH_IN_WORK ?? join(tmpdir(), 'pommora-reach-in')
/** Copies a working folder's results back beside the harness. */
export const copyBack = (dir) => cpSync(join(WORK, dir), join(HARNESS, dir), { recursive: true })
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
export async function until(what, fn, ms = 600000, every = 100) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    const v = await fn().catch(() => undefined)
    if (v) return v
    await sleep(every)
  }
  throw new Error(`Timed out waiting for ${what}`)
}

async function session(url) {
  const ws = new WebSocket(url)
  await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail })
  const pending = new Map(); const waiting = new Map(); let next = 0
  ws.onmessage = (m) => {
    const { id, method, result, error } = JSON.parse(m.data)
    if (method) { waiting.get(method)?.(); waiting.delete(method); return }
    pending.get(id)?.(error ? Promise.reject(new Error(error.message)) : result); pending.delete(id)
  }
  const send = (method, params = {}) => new Promise((r) => { const id = ++next; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })) })
  const event = (method) => new Promise((r) => waiting.set(method, r))
  const evaluate = async (expression, extra = {}) => {
    const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, ...extra })
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text)
    return result.value
  }
  const evaluateNamed = (expression, extra) =>
    evaluate(expression, extra).catch((e) => { throw new Error(`${e.message} — evaluating ${expression.slice(0, 120)}`) })
  return { send, event, evaluate: evaluateNamed, close: () => ws.close() }
}

// The window shows without activating the app, so a run never takes the screen.
const PATCHES = `(() => {
  const { app, BrowserWindow } = require('electron')
  BrowserWindow.prototype.show = function () { this.setIgnoreMouseEvents(true); this.showInactive() }
  BrowserWindow.prototype.focus = function () {}
  BrowserWindow.prototype.moveTop = function () {}
  app.focus = () => {}
})()`
// Whatever this process spawned dies with it, so a failed run leaves no Electron behind.
const children = new Set()
const killAll = () => { for (const c of children) if (c.exitCode === null) c.kill('SIGKILL') }
process.on('exit', killAll)
process.on('uncaughtException', (e) => { console.error(e); killAll(); process.exit(1) })
process.on('unhandledRejection', (e) => { console.error(e); killAll(); process.exit(1) })
const FOREGROUND = ['--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling']

/** Launches `build`'s Electron on `nexus` with `userData`, answering once the open's repair sweep has finished and IO has gone quiet. */
export async function launch(build, nexus, userData, port, extraPatch = '') {
  mkdirSync(userData, { recursive: true })
  writeFileSync(join(userData, 'pommora.json'), JSON.stringify({ lastNexusPath: nexus }))
  const env = { ...process.env, POMMORA_USERDATA: userData, POMMORA_DEBUG_PORT: String(port) }
  delete env.ELECTRON_RUN_AS_NODE; delete env.ELECTRON_RENDERER_URL
  const electron = join(WORK, build, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron')
  const t0 = Date.now()
  const child = spawn(electron, [`--inspect-brk=${port + 1}`, ...FOREGROUND, '.'], { cwd: join(WORK, build, 'Desktop'), env, stdio: ['ignore', 'ignore', 'pipe'] })
  children.add(child)
  let stderr = ''
  child.stderr.on('data', (d) => { stderr = (stderr + d).slice(-4000) })
  const exited = new Promise((r) => child.once('exit', r))
  const target = await until('the main inspector', async () => (await (await fetch(`http://127.0.0.1:${port + 1}/json/list`)).json())[0], 30000)
  const main = await session(target.webSocketDebuggerUrl)
  const paused = main.event('Debugger.paused')
  await main.send('Debugger.enable')
  await main.send('Runtime.runIfWaitingForDebugger')
  await paused
  await main.evaluate(PATCHES, { includeCommandLineAPI: true, awaitPromise: false })
  if (extraPatch) await main.evaluate(extraPatch, { includeCommandLineAPI: true, awaitPromise: false })
  await main.send('Debugger.resume')
  await main.send('Debugger.disable')
  const app = { child, exited, main, stderr: () => stderr, t0 }
  const bench = await until('the open', () => main.evaluate('globalThis.__bench?.repairAt ? globalThis.__bench : null', { awaitPromise: false }), 900000, 50)
  app.open = { ...bench, wallMs: Date.now() - t0 }
  app.io = () => main.evaluate('JSON.parse(JSON.stringify(globalThis.__benchIo))', { awaitPromise: false })
  await quiet(app)
  app.open.io = await app.io()
  const page = await until('the app window', async () => {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
    return list.find((t) => t.type === 'page' && t.url.startsWith('app://'))
  }, 60000)
  app.cdp = await session(page.webSocketDebuggerUrl)
  await until('the sidebar', () => app.cdp.evaluate(`!!document.querySelector('.row span')`), 60000)
  await quiet(app)
  return app
}

const total = (io) => Object.values(io.calls).reduce((a, b) => a + b, 0)
/** Waits until no machine call has landed for `still` ms, answering when the last one landed. */
export async function quiet(app, still = 600) {
  let last = total(await app.io()), at = Date.now()
  while (Date.now() - at < still) {
    await sleep(50)
    const now = total(await app.io())
    if (now !== last) { last = now; at = Date.now() }
  }
  return at
}

const diff = (a, b) => {
  const out = {}
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = (b[k] ?? 0) - (a[k] ?? 0); if (d) out[k] = d }
  return out
}

/** Asks one channel from the renderer and times it: to the reply, and to the last IO it set off; with the machine calls it made, all and under `.trash`. */
export async function timed(app, channel, ...args) {
  await quiet(app, 400)
  const before = await app.io()
  const t0 = Date.now()
  const reply = await app.cdp.evaluate(`window.nexus.ask(${JSON.stringify(channel)}, ...${JSON.stringify(args)})`)
  const replyMs = Date.now() - t0
  const lastIo = await quiet(app)
  const after = await app.io()
  return { reply, replyMs, settleMs: Math.max(replyMs, lastIo - t0), calls: diff(before.calls, after.calls), trash: diff(before.trash, after.trash) }
}

export async function quit(app) {
  app.cdp?.close(); app.main?.close()
  if (app.child.exitCode === null) {
    app.child.kill('SIGTERM')
    if (!(await Promise.race([app.exited.then(() => true), sleep(15000)]))) app.child.kill('SIGKILL')
    await app.exited
  }
}
