// profile.mjs <mode> [op] — on the baseline build at Medium-0, a property rename, a Context rename, and a page rename, each on its own fresh clone's warm instance.
//   profile: a CPU profile of the main (host) process, fsync time, and root listings (one per walk), into profiles/<op>.cpuprofile and profiles/profile.json
//   stacks:  the call chain behind each machine call (needs `node stack-probe.mjs <work>/baseline` and a rebuild first), what calls each fs stat and fsync, and what starts each walk, into profiles/<op>.stacks.json
//   nofsync: the same requests with fs.fsync answering at once, timed, into profiles/nofsync.json
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, basename } from 'node:path'
import { WORK, copyBack, launch, quit, timed } from './lib.mjs'

const mode = process.argv[2]
const fill = join(WORK, 'fills', 'Medium-0')
const plan = JSON.parse(readFileSync(`${fill}.plan.json`, 'utf8'))
const live = join(WORK, 'live', 'Benchmark-Medium')
const out = join(WORK, 'profiles')
mkdirSync(out, { recursive: true })

// Installed before the app's first line: fs's own calls counted, the flush timed, and in stacks mode each tallied by the module asking; nofsync skips the flush.
const fsPatch = (withStacks, noFsync) => `(() => {
  const fs = require('fs'), fsp = require('fs/promises')
  const t = (globalThis.__fsTally = { on: false, n: {}, ms: {}, who: {}, walks: {}, at: { walks: [], writes: [] } })
  const root = ${JSON.stringify(live)}
  const whoOf = () => {
    const st = new Error().stack
    return st.includes('readdirp') ? 'readdirp' : st.includes('chokidar') ? 'chokidar' : st.includes('write-file-atomic') ? 'write-file-atomic' : /at (LOOP|gotStat|gotTarget|start) \\(node:fs/.test(st) ? 'fs.realpath' : 'app'
  }
  const bump = (k, by = 1) => { t.n[k] = (t.n[k] ?? 0) + by }
  const tally = (k) => { if (!t.on) return; bump(k); if (${withStacks}) { const w = k + ':' + whoOf(); t.who[w] = (t.who[w] ?? 0) + 1 } }
  for (const name of ['stat', 'lstat', 'open', 'close', 'write', 'rename', 'chown', 'chmod', 'unlink', 'realpath', 'readdir', 'readFile', 'utimes']) {
    const f = fs[name]
    fs[name] = function (...a) { tally('cb.' + name); return f.apply(this, a) }
  }
  const fsync = fs.fsync
  fs.fsync = function (fd, cb) {
    tally('cb.fsync')
    if (t.on) t.at.writes.push(Math.round(performance.now()))
    if (${noFsync}) return process.nextTick(cb, null)
    const s = performance.now()
    return fsync.call(this, fd, (e) => { if (t.on) t.ms.fsync = (t.ms.fsync ?? 0) + performance.now() - s; cb(e) })
  }
  for (const name of ['stat', 'lstat', 'readFile', 'writeFile', 'open', 'rename', 'utimes', 'readdir']) {
    const f = fsp[name]
    fsp[name] = function (p, ...a) {
      tally('p.' + name)
      if (name === 'readdir' && t.on && p === root) {
        const chain = ${withStacks} ? new Error().stack.split('\\n').slice(2, 30).map((l) => l.trim().replace(/^at (async )?/, '').split(' ')[0]).join(' < ') : 'walk'
        t.walks[chain] = (t.walks[chain] ?? 0) + 1
        t.at.walks.push(Math.round(performance.now()))
      }
      return f.call(this, p, ...a)
    }
  }
  require('module').syncBuiltinESMExports()
})()`

const ops = {
  renameProperty: { op: 'renameProperty', propertyId: plan.category, label: 'Category Renamed' },
  renameContext: { op: 'renameContext', contextId: plan.context, newName: 'Topics Renamed' },
  renamePage: { op: 'rename', path: plan.hub, kind: 'page', newName: `${basename(plan.hub, '.md')} Renamed` },
}
const report = {}
for (const [name, req] of Object.entries(ops).filter(([n]) => !process.argv[3] || n === process.argv[3])) {
  rmSync(live, { recursive: true, force: true })
  execFileSync('cp', ['-cR', fill, live])
  const ud = join(WORK, 'ud', 'profile')
  rmSync(ud, { recursive: true, force: true })
  const patch = fsPatch(mode === 'stacks', mode === 'nofsync')
  let app = await launch('baseline', live, ud, 9395, patch)
  await quit(app)
  app = await launch('baseline', live, ud, 9395, patch)
  if (mode === 'profile') {
    await app.main.send('Profiler.enable')
    await app.main.send('Profiler.setSamplingInterval', { interval: 250 })
  }
  if (mode === 'stacks') await app.main.evaluate('(globalThis.__benchIo.stacks = {}, 1)', { awaitPromise: false })
  await app.main.evaluate('(globalThis.__fsTally.on = true, 1)', { awaitPromise: false })
  if (mode === 'profile') await app.main.send('Profiler.start')
  const r = await timed(app, 'mutate', req)
  if (mode === 'profile') writeFileSync(join(out, `${name}.cpuprofile`), JSON.stringify((await app.main.send('Profiler.stop')).profile))
  const fsTally = await app.main.evaluate('(() => { const t = globalThis.__fsTally; t.on = false; return JSON.parse(JSON.stringify(t)) })()', { awaitPromise: false })
  const entry = { ok: r.reply?.ok, replyMs: r.replyMs, settleMs: r.settleMs, calls: r.calls, fs: fsTally }
  if (mode === 'stacks') {
    entry.stacks = await app.main.evaluate('(() => { const s = globalThis.__benchIo.stacks; globalThis.__benchIo.stacks = null; return JSON.parse(JSON.stringify(s)) })()', { awaitPromise: false })
    writeFileSync(join(out, `${name}.stacks.json`), JSON.stringify(entry, null, 1))
  }
  report[name] = mode === 'stacks' ? { ok: entry.ok, settleMs: entry.settleMs } : entry
  console.log(mode, name, JSON.stringify({ ok: entry.ok, replyMs: entry.replyMs, settleMs: entry.settleMs, fsyncMs: Math.round(fsTally.ms.fsync ?? 0), walks: fsTally.walks, n: fsTally.n }))
  await quit(app)
  rmSync(ud, { recursive: true, force: true })
}
writeFileSync(join(out, `${mode}.json`), JSON.stringify(report, null, 2))
rmSync(live, { recursive: true, force: true })
copyBack('profiles')
