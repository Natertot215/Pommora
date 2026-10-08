import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse, stringify } from 'yaml'
import { ask, attach, FM, must, sleep } from './drive-harness.mjs'

const [port, nexus, collection, gesture, ...rest] = process.argv.slice(2)
if (!port || !nexus || !collection) {
  console.error('usage: node nexus-watch.mjs <port> <nexus> <collection> [ask <channel> <json args> | write <rel> <key> <json value>]')
  process.exit(2)
}
const { cdp } = await attach(Number(port))

const json = (rel) => JSON.parse(readFileSync(join(nexus, rel), 'utf8'))
// Page IDs read as their paths: the loaded values are keyed by ID, which no reader can recognize.
const titles = new Map()
for (const rel of readdirSync(join(nexus, collection), { recursive: true })) {
  if (!rel.endsWith('.md')) continue
  const id = /^ID:\s*(\S+)/m.exec(FM.exec(readFileSync(join(nexus, collection, rel), 'utf8'))?.[1] ?? '')?.[1]
  if (id) titles.set(id, `${collection}/${rel}`)
}
async function snapshot() {
  const { defs } = json('.nexus/properties.json')
  const registry = Object.fromEntries(
    Object.values(defs).map((d) => [d.name, `${d.type}[${(d.select_options ?? []).map((o) => o.value).join(', ')}]`]),
  )
  const assigned = (json(`${collection}/_pagecollection.json`).properties ?? []).map((id) => defs[id]?.name ?? id)
  const holders = {}
  for (const d of Object.values(defs))
    holders[d.name] = (await ask(cdp, 'property:holders', d.id)).value ?? null
  const values = await must('view:loadValues', ask(cdp, 'view:loadValues', collection))
  const pages = Object.fromEntries(
    Object.entries(values).map(([id, v]) => [titles.get(id) ?? id, v.frontmatter ?? {}]),
  )
  return { registry, holders, assigned: assigned.join(', '), pages }
}
const flat = (o, prefix = '', out = {}) => {
  for (const [k, v] of Object.entries(o)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, key, out)
    else out[key] = JSON.stringify(v)
  }
  return out
}
function printDelta(a, b) {
  const before = flat(a), after = flat(b)
  for (const k of new Set([...Object.keys(before), ...Object.keys(after)]))
    if (before[k] !== after[k]) console.log(`± ${k}: ${before[k] ?? '∅'} → ${after[k] ?? '∅'}`)
}

const start = await snapshot()
if (!gesture) {
  console.log(JSON.stringify(start, null, 2))
  cdp.close()
  process.exit(0)
}
if (gesture === 'ask') console.log('reply', JSON.stringify(await ask(cdp, rest[0], ...JSON.parse(rest[1] ?? '[]'))))
if (gesture === 'write') {
  const file = join(nexus, rest[0])
  const text = readFileSync(file, 'utf8')
  const fm = parse(FM.exec(text)?.[1] ?? '') ?? {}
  fm[rest[1]] = JSON.parse(rest[2])
  writeFileSync(file, text.replace(FM, `---\n${stringify(fm)}---\n`))
  console.log('wrote', rest[0])
}
let last = start
for (let quiet = 0, i = 0; quiet < 3 && i < 16; i++) {
  await sleep(500)
  const next = await snapshot()
  if (JSON.stringify(next) === JSON.stringify(last)) quiet++
  else { quiet = 0; console.log(`— ${(i + 1) * 500} ms`); printDelta(last, next); last = next }
}
cdp.close()
