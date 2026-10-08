import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { stringify } from 'yaml'
import { ask, attach, FM, must, sleep } from './drive-harness.mjs'

const [port, nexus, collection, gesture, ...rest] = process.argv.slice(2)
const args = gesture === 'ask' ? JSON.parse(rest[1] ?? '[]') : null
if (!port || !nexus || !collection || (gesture && !['ask', 'write'].includes(gesture)) || (args && !Array.isArray(args))) {
  console.error('usage: node nexus-watch.mjs <port> <nexus> <collection> [ask <channel> <json array of args> | write <rel> <key> <json value>]')
  process.exit(2)
}
const { cdp } = await attach(Number(port))
const open = await must('nexus:state', ask(cdp, 'nexus:state'))
if (open.status !== 'open' || open.tree.nexus.rootPath !== nexus)
  throw new Error(`the app has ${open.status === 'open' ? open.tree.nexus.rootPath : 'no Nexus'} open, not ${nexus}`)

const json = (rel) => JSON.parse(readFileSync(join(nexus, rel), 'utf8'))
// The loaded values are keyed by ID; they print as paths.
const titles = new Map()
for (const rel of readdirSync(join(nexus, collection), { recursive: true })) {
  if (!rel.endsWith('.md')) continue
  const id = /^ID:[ \t]*"?([^\s"]+)/m.exec(FM.exec(readFileSync(join(nexus, collection, rel), 'utf8'))?.[1] ?? '')?.[1]
  if (id) titles.set(id, `${collection}/${rel}`)
}
async function snapshot() {
  const { defs } = json('.nexus/properties.json')
  const names = Object.values(defs).map((d) => d.name)
  // A name two definitions share labels each by its id as well, so neither hides the other.
  const label = (d) => (names.indexOf(d.name) === names.lastIndexOf(d.name) ? d.name : `${d.name} ${d.id}`)
  const registry = Object.fromEntries(
    Object.values(defs).map((d) => [label(d), `${d.type}[${(d.select_options ?? []).map((o) => o.value).join(', ')}]`]),
  )
  const assigned = (json(`${collection}/_pagecollection.json`).properties ?? []).map((id) => (defs[id] ? label(defs[id]) : id))
  const holders = Object.fromEntries(
    await Promise.all(Object.values(defs).map(async (d) => [label(d), (await ask(cdp, 'property:holders', d.id)).value ?? null])),
  )
  const values = await must('view:loadValues', ask(cdp, 'view:loadValues', collection))
  const pages = Object.fromEntries(
    Object.entries(values).map(([id, v]) => [titles.get(id) ?? id, v.frontmatter ?? {}]),
  )
  return { registry, holders, assigned: assigned.join(', '), pages }
}
const plain = (v) => v && typeof v === 'object' && !Array.isArray(v)
function printDelta(a, b, path = '') {
  for (const k of new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])) {
    const key = path ? `${path}.${k}` : k
    const [before, after] = [a?.[k], b?.[k]]
    if (plain(before) && plain(after)) printDelta(before, after, key)
    else if (JSON.stringify(before) !== JSON.stringify(after))
      console.log(`± ${key}: ${before === undefined ? '∅' : JSON.stringify(before)} → ${after === undefined ? '∅' : JSON.stringify(after)}`)
  }
}

const start = await snapshot()
if (!gesture) {
  console.log(JSON.stringify(start, null, 2))
  cdp.close()
  process.exit(0)
}
if (gesture === 'ask') console.log('reply', JSON.stringify(await ask(cdp, rest[0], ...args)))
if (gesture === 'write') {
  // One key's lines are replaced, or appended, and every other byte of the page stays as it was.
  const [rel, key, value] = rest
  const file = join(nexus, rel)
  const text = readFileSync(file, 'utf8')
  const front = FM.exec(text)
  if (!front) throw new Error(`${rel} has no frontmatter to write`)
  const line = stringify({ [key]: JSON.parse(value) }, { lineWidth: 0 })
  const block = new RegExp(`^${key}:.*(?:\\n[ \\t-].*)*\\n?`, 'm')
  const body = block.test(front[1]) ? front[1].replace(block, () => line) : `${front[1]}\n${line}`
  writeFileSync(file, text.replace(FM, () => `---\n${body.replace(/\n$/, '')}\n---\n`))
  console.log('wrote', rel)
}
let last = start
const t0 = Date.now()
let quiet = 0
for (let i = 0; quiet < 3 && i < 16; i++) {
  await sleep(500)
  const next = await snapshot()
  if (JSON.stringify(next) === JSON.stringify(last)) quiet++
  else { quiet = 0; console.log(`— ${Date.now() - t0} ms`); printDelta(last, next); last = next }
}
if (quiet < 3) console.log('— still moving when the poll ended')
cdp.close()
