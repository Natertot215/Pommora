// augment.mjs <nexus> base            — hub backlinks and Link values on live pages, permanent delete on; writes <nexus>.plan.json
// augment.mjs <nexus> doomed <pct>    — clones live Sets' pages into Doomed Sets (and 20 loose pages) totalling pct% of the live count, for the fill driver to delete
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, relative, basename, dirname } from 'node:path'

const [nexus, mode, pctArg] = process.argv.slice(2)
let seed = 0x51ed ^ (mode === 'base' ? 1 : Number(pctArg))
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const CROCK = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
let tick = 0
const ulid = (mark) => {
  let time = 1790000000000 + tick++ * 7
  let head = ''
  for (let i = 0; i < 10; i++) { head = CROCK[time % 32] + head; time = Math.floor(time / 32) }
  let tail = ''
  for (let i = 0; i < 16; i++) tail += CROCK[Math.floor(rand() * 32)]
  const id = head + tail
  return mark ? id.slice(0, 10) + mark + id.slice(11) : id
}
const collections = readdirSync(nexus).filter((n) => n.startsWith('Collection ')).sort()
const pagesIn = (dir) => readdirSync(join(nexus, dir)).filter((n) => n.endsWith('.md')).sort().map((n) => `${dir}/${n}`)
const setsOf = (c) => readdirSync(join(nexus, c), { withFileTypes: true }).filter((e) => e.isDirectory() && e.name.startsWith('Set ')).map((e) => e.name).sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)))
const split = (text) => { const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text); return { fm: m[1], body: m[2] } }
const join2 = ({ fm, body }) => `---\n${fm}\n---\n${body}`
const title = (rel) => basename(rel, '.md')
const planPath = `${nexus}.plan.json`

if (mode === 'base') {
  const live = collections.flatMap((c) => [...pagesIn(c), ...setsOf(c).flatMap((s) => pagesIn(`${c}/${s}`))])
  const roots = pagesIn(collections[0])
  const hub = roots[0]
  const target = roots.find((r) => { const { fm } = split(readFileSync(join(nexus, r), 'utf8')); return r !== hub && /^Category:/m.test(fm) && /^Tags:/m.test(fm) && /^<Topics>:/m.test(fm) })
  let backlinks = 0, holders = 0
  for (const rel of live) {
    if (rel === hub || rel === target) continue
    const page = split(readFileSync(join(nexus, rel), 'utf8'))
    let changed = false
    if (rand() < 0.05) { page.body = `${page.body.trimEnd()}\n\nSee [[${title(hub)}]].\n`; backlinks++; changed = true }
    if (rand() < 0.05) {
      const line = `Source: "[[${title(target)}]]"`
      page.fm = /^Source:.*$/m.test(page.fm) ? page.fm.replace(/^Source:.*$/m, line) : `${page.fm}\n${line}`
      holders++; changed = true
    }
    if (changed) writeFileSync(join(nexus, rel), join2(page))
  }
  const settingsPath = join(nexus, '.nexus/settings.json')
  const settings = JSON.parse(readFileSync(settingsPath, 'utf8'))
  settings.personalization = { ...settings.personalization, permanentDelete: true }
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`)
  const props = JSON.parse(readFileSync(join(nexus, '.nexus/properties.json'), 'utf8')).defs
  const byKey = (k) => Object.values(props).find((d) => d.key === k)
  const tfm = split(readFileSync(join(nexus, target), 'utf8')).fm
  const tag = /^Tags:\n\s+- "([^"]+)"/m.exec(tfm)[1]
  const topic = /^<Topics>:\n\s+- "([^"]+)"/m.exec(tfm)[1]
  const contexts = JSON.parse(readFileSync(join(nexus, '.nexus/contexts/contexts.json'), 'utf8')).contexts
  const spaceId = JSON.parse(readFileSync(join(nexus, '.nexus/contexts/Topics', topic, '_space.json'), 'utf8')).id
  const tags = byKey('Tags')
  const plan = {
    live: live.length, hub, target, backlinks, holders,
    deleteSet: `${collections[1]}/${setsOf(collections[1])[0]}`,
    category: byKey('Category').id, tags: tags.id, tagOption: tags.select_options.find((o) => o.label === tag).id, tag,
    deleteProperty: byKey('Pinned').id,
    space: spaceId, topic, context: contexts.find((c) => c.title === 'Topics').id,
  }
  writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`)
  console.log(plan)
} else {
  const plan = JSON.parse(readFileSync(planPath, 'utf8'))
  const want = Math.round((plan.live * Number(pctArg)) / 100)
  const sets = [], pages = []
  let made = 0, k = 0
  const clone = (src, destDir, suffix) => {
    const page = split(readFileSync(join(nexus, src), 'utf8'))
    page.fm = page.fm.replace(/^ID: .*$/m, `ID: ${ulid('P')}`)
    const rel = `${destDir}/${title(src)} ${suffix}.md`
    writeFileSync(join(nexus, rel), join2(page))
    return rel
  }
  // Loose pages first, into a Set that stays live, so the Trash holds page bundles beside Set bundles.
  const looseSrc = pagesIn(`${collections[0]}/${setsOf(collections[0])[1]}`)
  for (let i = 0; i < 20 && made < want; i++, made++) pages.push(clone(looseSrc[i % looseSrc.length], `${collections[0]}/${setsOf(collections[0])[1]}`, `DP${i}`))
  while (made < want) {
    const c = collections[k % collections.length]
    const src = setsOf(c)[Math.floor(k / collections.length) % setsOf(c).length]
    const dir = `${c}/Doomed ${k}`
    mkdirSync(join(nexus, dir), { recursive: true })
    writeFileSync(join(nexus, dir, '_pageset.json'), `${JSON.stringify({ id: ulid('') }, null, 2)}\n`)
    for (const p of pagesIn(`${c}/${src}`)) { if (made >= want) break; clone(p, dir, `D${k}`); made++ }
    sets.push(dir)
    k++
  }
  writeFileSync(`${nexus}.doomed.json`, `${JSON.stringify({ pct: Number(pctArg), pages, sets, made }, null, 2)}\n`)
  console.log({ pct: Number(pctArg), made, sets: sets.length, pages: pages.length })
}
