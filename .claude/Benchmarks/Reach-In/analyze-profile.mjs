// analyze-profile.mjs <op> [fn,fn,…] — self and inclusive time by function from profiles/<op>.cpuprofile, plus, from <op>.stacks.json, the top call chains per machine method, fs calls by caller, and what started each walk.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
const dir = join(import.meta.dirname, 'profiles')
const op = process.argv[2]
const prof = JSON.parse(readFileSync(join(dir, `${op}.cpuprofile`), 'utf8'))
const byId = new Map(prof.nodes.map((n) => [n.id, n]))
const parent = new Map()
for (const n of prof.nodes) for (const c of n.children ?? []) parent.set(c, n.id)
const short = (url) => (url ? url.replace(/^.*node_modules\//, 'nm/').replace(/^.*\/Desktop\/out\/main\//, 'main/').replace(/^file:\/\//, '') : '')
const key = (n) => `${n.callFrame.functionName || '(anonymous)'} ${short(n.callFrame.url)}:${n.callFrame.lineNumber + 1}`
const self = new Map(), total = new Map()
let sum = 0
prof.samples.forEach((id, i) => {
  const dt = (prof.timeDeltas[i] ?? 0) / 1000
  sum += dt
  const n = byId.get(id)
  self.set(key(n), (self.get(key(n)) ?? 0) + dt)
  const seen = new Set()
  for (let at = id; at !== undefined; at = parent.get(at)) { const k = key(byId.get(at)); if (!seen.has(k)) { seen.add(k); total.set(k, (total.get(k) ?? 0) + dt) } }
})
// With a comma list of function names, each one's inclusive time across every file defining it, against the wall and the busy (non-idle) share.
if (process.argv[3]) {
  const byName = new Map()
  prof.samples.forEach((id, i) => {
    const dt = (prof.timeDeltas[i] ?? 0) / 1000
    const seen = new Set()
    for (let at = id; at !== undefined; at = parent.get(at)) {
      const name = byId.get(at).callFrame.functionName
      if (!seen.has(name)) { seen.add(name); byName.set(name, (byName.get(name) ?? 0) + dt) }
    }
  })
  const busy = sum - (self.get('(idle) :0') ?? 0)
  console.log(`== ${op}: ${sum.toFixed(0)} ms sampled, ${busy.toFixed(0)} ms busy (${((busy / sum) * 100).toFixed(1)}%)`)
  for (const name of process.argv[3].split(',')) {
    const v = byName.get(name) ?? 0
    console.log(`${v.toFixed(0).padStart(7)} ms ${((v / sum) * 100).toFixed(1).padStart(5)}% of wall ${((v / busy) * 100).toFixed(1).padStart(5)}% of busy  ${name}`)
  }
  process.exit(0)
}
const top = (m, n) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${v.toFixed(0).padStart(7)} ms ${((v / sum) * 100).toFixed(1).padStart(5)}%  ${k}`).join('\n')
console.log(`== ${op}: ${sum.toFixed(0)} ms sampled\n-- self\n${top(self, 25)}\n-- total\n${top(total, 45)}`)
let entry = null
try { entry = JSON.parse(readFileSync(join(dir, `${op}.stacks.json`), 'utf8')) } catch {}
if (entry) {
  for (const [m, chains] of Object.entries(entry.stacks ?? {})) {
    const all = Object.values(chains).reduce((a, b) => a + b, 0)
    console.log(`-- machine ${m}: ${all} calls`)
    for (const [c, k] of Object.entries(chains).sort((a, b) => b[1] - a[1]).slice(0, 6)) console.log(`${String(k).padStart(7)}  ${c}`)
  }
  console.log('-- fs calls by caller', JSON.stringify(entry.fs.who))
  console.log('-- root listings (walk starts) by chain')
  for (const [c, k] of Object.entries(entry.fs.walks).sort((a, b) => b[1] - a[1])) console.log(`${String(k).padStart(7)}  ${c}`)
  const { walks = [], writes = [] } = entry.fs.at ?? {}
  if (writes.length) {
    const t0 = writes[0]
    console.log(`-- timeline (ms from the first flush): writes ${writes.length} from 0 to ${writes.at(-1) - t0}; root listings at ${walks.map((w) => w - t0).join(', ')}`)
  }
}
