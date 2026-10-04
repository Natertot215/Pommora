// Times a cold open of Collection 01 Ledger's table view, grouped by Stage, on ~/Benchmark-Medium: five fresh launches of the
// built app, each measuring from the sidebar click that opens the tab to the frame after its first data row mounts.
// Run from the repo root: node .claude/Benchmarks/grouped-view-cold.mjs   (runs `npm run build` first, so it measures the
// working tree as it stands). Expects ~/Benchmark-Medium from make-benchmark-nexus.mjs with the Ledger's first view grouped by
// Stage, launches on a scratch userData and debug port 9341, leaves any other instance alone, and kills what it started.

import { execFileSync, spawn } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const REPO = resolve(import.meta.dirname, '../..')
const ELECTRON = join(REPO, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron')
const NEXUS = join(homedir(), 'Benchmark-Medium')
const COLLECTION = 'Collection 01 Ledger'
const PORT = 9341
const RUNS = 5
const SETTLE_MS = 4000
const ROW = '.data-row[data-rid]:not(.ghost-row)'

const ASSETS = join(NEXUS, '.nexus/assets')

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
  await new Promise((ok, fail) => {
    ws.onopen = ok
    ws.onerror = fail
  })
  const pending = new Map()
  let next = 0
  ws.onmessage = (m) => {
    const { id, result, error } = JSON.parse(m.data)
    pending.get(id)?.(error ? Promise.reject(new Error(error.message)) : result)
    pending.delete(id)
  }
  const send = (method, params = {}) =>
    new Promise((r) => {
      pending.set(++next, r)
      ws.send(JSON.stringify({ id: next, method, params }))
    })
  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text)
    return result.value
  }
  return { send, evaluate, close: () => ws.close() }
}

// The collection's sidebar title span, whose click opens the collection's tab.
const FIND_ROW = `[...document.querySelectorAll('.row span')].findLast((s) => s.textContent.trim() === ${JSON.stringify(COLLECTION)})`

const MEASURE = `new Promise((resolve, reject) => {
  if (document.visibilityState !== 'visible') return reject(new Error('window is not visible'))
  if (document.querySelector(${JSON.stringify(ROW)})) return reject(new Error('a data row is already mounted'))
  const span = ${FIND_ROW}
  const timeout = setTimeout(() => reject(new Error('no row within 30s')), 30000)
  let seen = false
  const observer = new MutationObserver(() => {
    if (seen || !document.querySelector(${JSON.stringify(ROW)})) return
    seen = true
    observer.disconnect()
    requestAnimationFrame(() => setTimeout(() => {
      clearTimeout(timeout)
      resolve(performance.now() - t0)
    }, 0))
  })
  observer.observe(document.body, { childList: true, subtree: true })
  const t0 = performance.now()
  span.click()
})`

function launch(userData) {
  const env = { ...process.env, POMMORA_USERDATA: userData, POMMORA_DEBUG_PORT: String(PORT) }
  delete env.ELECTRON_RUN_AS_NODE
  delete env.ELECTRON_RENDERER_URL
  const child = spawn(ELECTRON, ['.'], { cwd: join(REPO, 'Desktop'), env, stdio: 'ignore' })
  return { child, exited: new Promise((r) => child.once('exit', r)), cdp: null }
}

async function ready(app) {
  app.cdp = await connect()
  await until('the sidebar row', () => app.cdp.evaluate(`!!(${FIND_ROW})`))
  await sleep(SETTLE_MS)
}

// SIGTERM runs the app's own quit flush; anything still holding the scratch userData afterwards is ours and goes.
async function quit({ child, exited, cdp }, userData) {
  cdp?.close()
  child.kill('SIGTERM')
  if (!(await Promise.race([exited.then(() => true), sleep(10000)]))) child.kill('SIGKILL')
  await exited
  const strays = execFileSync('ps', ['-A', '-o', 'pid=,command='], { encoding: 'utf8' })
    .split('\n')
    .filter((l) => l.includes(userData))
    .map((l) => Number.parseInt(l, 10))
  for (const pid of strays) process.kill(pid, 'SIGKILL')
}

// Opening a tab captures its thumbnail into the Nexus's assets; the harness takes back whatever a run added.
const listAssets = () => readdirSync(ASSETS, { recursive: true })
function restoreAssets(before) {
  const added = listAssets().filter((p) => !before.includes(p))
  for (const p of added.sort().reverse()) rmSync(join(ASSETS, p), { recursive: true, force: true })
}

function frontmost(pid) {
  const script = `tell application "System Events" to set frontmost of (first process whose unix id is ${pid}) to true`
  try {
    execFileSync('osascript', ['-e', script], { stdio: 'ignore' })
  } catch {}
}

execFileSync('npm', ['run', 'build'], { cwd: REPO, stdio: 'ignore' })
const head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO, encoding: 'utf8' }).trim()
const dirty = execFileSync('git', ['status', '--short'], { cwd: REPO, encoding: 'utf8' }).split('\n').filter(Boolean).length
console.log(`Built ${head}${dirty ? ` + ${dirty} uncommitted paths` : ''}; ${COLLECTION}, grouped by Stage, cold open → first painted row`)

const scratch = mkdtempSync(join(tmpdir(), 'pommora-bench-'))
const warm = join(scratch, 'warm')
const timings = []
const assetsBefore = listAssets()
let app = null
let userData = warm
try {
  mkdirSync(warm)
  writeFileSync(join(warm, 'pommora.json'), JSON.stringify({ lastNexusPath: NEXUS }))
  // One untimed launch seeds the session index; each timed run starts from a copy of it that never opened the collection.
  app = launch(warm)
  await ready(app)
  await quit(app, warm)
  app = null
  for (let i = 1; i <= RUNS; i++) {
    userData = join(scratch, `run-${i}`)
    cpSync(warm, userData, { recursive: true, verbatimSymlinks: true })
    app = launch(userData)
    await ready(app)
    frontmost(app.child.pid)
    await app.cdp.send('Page.bringToFront')
    await sleep(300)
    const ms = await app.cdp.evaluate(MEASURE)
    timings.push(ms)
    console.log(`run ${i}: ${ms.toFixed(1)} ms`)
    await quit(app, userData)
    app = null
  }
} finally {
  if (app) await quit(app, userData)
  rmSync(scratch, { recursive: true, force: true })
  restoreAssets(assetsBefore)
}

const sorted = [...timings].sort((a, b) => a - b)
const median = sorted[Math.floor(sorted.length / 2)]
const spread = sorted.at(-1) - sorted[0]
console.log(`median ${median.toFixed(1)} ms, spread ${spread.toFixed(1)} ms (${((spread / median) * 100).toFixed(0)}% of median)`)
