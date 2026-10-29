// fill.mjs <Size> <pct...> — from <work>/nexus/Benchmark-<Size> (augmented base), builds <work>/fills/<Size>-<pct>: Doomed clones deleted through the baseline build's own mutate channel.
import { execFileSync } from 'node:child_process'
import { copyFileSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { WORK, copyBack, launch, quit, timed } from './lib.mjs'

const [size, ...pcts] = process.argv.slice(2)
const name = `Benchmark-${size}`
const live = join(WORK, 'live', name)
for (const pct of pcts) {
  rmSync(live, { recursive: true, force: true })
  execFileSync('mkdir', ['-p', join(WORK, 'live')])
  execFileSync('cp', ['-cR', join(WORK, 'nexus', name), live])
  copyFileSync(join(WORK, 'nexus', `${name}.plan.json`), `${live}.plan.json`)
  let doomed = { pages: [], sets: [] }
  if (Number(pct) > 0) {
    execFileSync('node', [join(import.meta.dirname, 'augment.mjs'), live, 'doomed', pct], { stdio: 'inherit' })
    doomed = JSON.parse(readFileSync(`${live}.doomed.json`, 'utf8'))
  }
  const ud = join(WORK, 'ud', `fill-${size}-${pct}`)
  rmSync(ud, { recursive: true, force: true })
  const app = await launch('baseline', live, ud, 9391)
  console.log(`opened ${size}-${pct} in ${app.open.wallMs} ms`)
  let ms = 0
  for (const path of doomed.pages) {
    const r = await timed(app, 'mutate', { op: 'delete', path, kind: 'page' })
    if (!r.reply?.ok) throw new Error(`delete ${path}: ${JSON.stringify(r.reply)}`)
    ms += r.settleMs
  }
  for (const path of doomed.sets) {
    const r = await timed(app, 'mutate', { op: 'delete', path, kind: 'set' })
    if (!r.reply?.ok) throw new Error(`delete ${path}: ${JSON.stringify(r.reply)}`)
    ms += r.settleMs
  }
  const listed = await timed(app, 'bundles:list', { kind: 'trash' })
  console.log(`${size}-${pct}: ${doomed.pages.length} pages + ${doomed.sets.length} Sets deleted in ${ms} ms; Trash lists ${listed.reply.value.length} rows`)
  await quit(app)
  rmSync(ud, { recursive: true, force: true })
  const out = join(WORK, 'fills', `${size}-${pct}`)
  rmSync(out, { recursive: true, force: true })
  execFileSync('mkdir', ['-p', join(WORK, 'fills')])
  execFileSync('mv', [live, out])
  for (const f of ['plan', 'doomed']) if (existsSync(`${live}.${f}.json`)) execFileSync('mv', [`${live}.${f}.json`, `${out}.${f}.json`])
}
