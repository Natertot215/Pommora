// bench.mjs <Size> <runs> <pct...> — per fill, alternates baseline and reach-in run by run on a fresh clone of the fill: a cold open (no index),
// a warm open, then the operation sequence, each timed to its reply and to its last IO; the first run also takes the spot checks. Appends to <work>/results/<Size>-<pct>.jsonl and copies results/ back beside the harness.
// START_RUN=<n> starts at run n, so an interrupted cell resumes.
import { execFileSync } from 'node:child_process'
import { appendFileSync, copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'
import { WORK, copyBack, launch, quit, timed } from './lib.mjs'

const [size, runsArg, ...pcts] = process.argv.slice(2)
const runs = Number(runsArg)
const name = `Benchmark-${size}`
const live = join(WORK, 'live', name)
mkdirSync(join(WORK, 'results'), { recursive: true })

const mdUnder = (dir) => {
  const out = []
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.md')) out.push(p) } }
  try { walk(dir) } catch {}
  return out
}
const count = (files, re) => files.filter((f) => re.test(readFileSync(f, 'utf8'))).length
const liveMd = () => readdirSync(live).filter((n) => n.startsWith('Collection ')).flatMap((c) => mdUnder(join(live, c)))
const trashMd = () => mdUnder(join(live, '.trash'))
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

async function one(build, pct, run) {
  const fill = join(WORK, 'fills', `${size}-${pct}`)
  const plan = JSON.parse(readFileSync(`${fill}.plan.json`, 'utf8'))
  rmSync(live, { recursive: true, force: true })
  execFileSync('cp', ['-cR', fill, live])
  const ud = join(WORK, 'ud', `run-${size}`)
  rmSync(ud, { recursive: true, force: true })
  const rec = { size, pct: Number(pct), build, run, ops: {}, spot: {} }
  let app = await launch(build, live, ud, 9393)
  rec.cold = app.open
  await quit(app)
  app = await launch(build, live, ud, 9393)
  rec.warm = app.open
  const hub = basename(plan.hub, '.md'), target = basename(plan.target, '.md')
  const spot = run === 0
  const op = async (key, channel, ...args) => {
    const r = await timed(app, channel, ...args)
    rec.ops[key] = { ok: !!r.reply?.ok, ...(r.reply?.ok ? {} : { error: r.reply }), replyMs: r.replyMs, settleMs: r.settleMs, calls: r.calls, trash: r.trash }
    if (!r.reply?.ok) console.error(`  ${build} ${key} refused: ${JSON.stringify(r.reply).slice(0, 300)}`)
    return r.reply?.value
  }
  const listed = await op('listTrash', 'bundles:list', { kind: 'trash' })
  rec.trashRows = listed?.length ?? 0
  const fillSet = listed?.find((r) => r.kind === 'set')?.bundlePath
  if (spot) rec.spot.trashedHolders = count(trashMd(), new RegExp(`^Source: "\\[\\[${esc(target)}\\]\\]"`, 'm'))
  const deletedPage = await op('deletePage', 'mutate', { op: 'delete', path: plan.target, kind: 'page' })
  if (spot) {
    rec.spot.afterDelete = {
      liveHolders: count(liveMd(), new RegExp(`^Source: "\\[\\[${esc(target)}\\]\\]"`, 'm')),
      trashedHolders: count(trashMd(), new RegExp(`^Source: "\\[\\[${esc(target)}\\]\\]"`, 'm')),
    }
  }
  const deletedSet = await op('deleteSet', 'mutate', { op: 'delete', path: plan.deleteSet, kind: 'set' })
  if (spot) rec.spot.beforeRename = { trashCategory: count(trashMd(), /^Category:/m), trashRenamed: count(trashMd(), /^Category Renamed:/m) }
  await op('renameProperty', 'mutate', { op: 'renameProperty', propertyId: plan.category, label: 'Category Renamed' })
  if (spot) rec.spot.afterRename = { trashCategory: count(trashMd(), /^Category:/m), trashRenamed: count(trashMd(), /^Category Renamed:/m), liveCategory: count(liveMd(), /^Category:/m) }
  await op('renameOption', 'mutate', { op: 'renameOption', propertyId: plan.tags, optionId: plan.tagOption, label: `${plan.tag} Renamed` })
  await op('deleteProperty', 'mutate', { op: 'deleteProperty', propertyId: plan.deleteProperty })
  if (spot) rec.spot.afterPropertyDelete = { trashPinned: count(trashMd(), /^Pinned:/m), livePinned: count(liveMd(), /^Pinned:/m) }
  await op('renamePage', 'mutate', { op: 'rename', path: plan.hub, kind: 'page', newName: `${hub} Renamed` })
  if (spot) rec.spot.afterPageRename = { trashOld: count(trashMd(), new RegExp(`\\[\\[${esc(hub)}\\]\\]`)), trashNew: count(trashMd(), new RegExp(`\\[\\[${esc(hub)} Renamed\\]\\]`)), liveOld: count(liveMd(), new RegExp(`\\[\\[${esc(hub)}\\]\\]`)) }
  await op('renameSpace', 'mutate', { op: 'renameSpace', spaceId: plan.space, newName: `${plan.topic} Renamed` })
  await op('renameContext', 'mutate', { op: 'renameContext', contextId: plan.context, newName: 'Topics Renamed' })
  if (spot) rec.spot.afterContextRename = { trashOld: count(trashMd(), /^<Topics>:/m), trashNew: count(trashMd(), /^<Topics Renamed>:/m) }
  if (deletedPage?.bundled) await op('restorePage', 'mutate', { op: 'restore', bundlePath: deletedPage.bundled.bundlePath })
  if (spot) {
    let text = null
    try { text = readFileSync(join(live, plan.target), 'utf8') } catch {}
    rec.spot.restored = {
      at: !!text,
      fm: text?.split('\n---')[0],
      categoryRenamed: /^Category Renamed:/m.test(text ?? ''),
      oldCategory: /^Category:/m.test(text ?? ''),
      pinned: /^Pinned:/m.test(text ?? ''),
      topicsRenamed: /^<Topics Renamed>:/m.test(text ?? ''),
      oldTopics: /^<Topics>:/m.test(text ?? ''),
      spaceRenamed: (text ?? '').includes(`"${plan.topic} Renamed"`),
      tagRenamed: (text ?? '').includes(`"${plan.tag} Renamed"`),
      liveHolders: count(liveMd(), new RegExp(`^Source: "\\[\\[${esc(target)}\\]\\]"`, 'm')),
      trashedHolders: count(trashMd(), new RegExp(`^Source: "\\[\\[${esc(target)}\\]\\]"`, 'm')),
    }
  }
  if (deletedSet?.bundled) await op('restoreSet', 'mutate', { op: 'restore', bundlePath: deletedSet.bundled.bundlePath })
  if (fillSet) await op('emptyBundle', 'mutate', { op: 'emptyBundle', bundlePath: fillSet })
  await op('listTrashAfter', 'bundles:list', { kind: 'trash' })
  await quit(app)
  rmSync(ud, { recursive: true, force: true })
  appendFileSync(join(WORK, 'results', `${size}-${pct}.jsonl`), `${JSON.stringify(rec)}\n`)
  const ops = Object.entries(rec.ops).map(([k, v]) => `${k}=${v.settleMs}${v.ok ? '' : '!'}`).join(' ')
  console.log(`${size}-${pct} run ${run} ${build}: cold ${Math.round(rec.cold.indexAt - rec.cold.openStartedAt)} warm ${Math.round(rec.warm.indexAt - rec.warm.openStartedAt)} ${ops}`)
}

for (const pct of pcts)
  for (let run = Number(process.env.START_RUN ?? 0); run < runs; run++)
    for (const build of run % 2 === 0 ? ['baseline', 'reach-in'] : ['reach-in', 'baseline']) await one(build, pct, run)
rmSync(live, { recursive: true, force: true })
copyBack('results')
console.log('done')
