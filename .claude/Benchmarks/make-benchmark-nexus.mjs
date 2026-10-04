// Builds a deterministic benchmark Nexus at one of four sizes into ~/Benchmark-<Size>, after sweeping every earlier benchmark
// Nexus (each size, and the legacy ~/Benchmark) along with the index database Pommora keeps for it under userData/Nexuses.
// Run: node .claude/Benchmarks/make-benchmark-nexus.mjs [small|medium|large|xlarge]   (default medium)

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const PRESETS = {
  small: { folder: 'Benchmark-Small', pages: 1000, collections: 5, sets: 4, spaces: [20, 20, 20], optionProps: 1, options: 10, plainProps: 1 },
  medium: { folder: 'Benchmark-Medium', pages: 10000, collections: 20, sets: 5, spaces: [150, 150, 200], optionProps: 3, options: 10, plainProps: 2 },
  large: { folder: 'Benchmark-Large', pages: 25000, collections: 25, sets: 5, spaces: [250, 250, 300], optionProps: 5, options: 25, plainProps: 5 },
  xlarge: { folder: 'Benchmark-XLarge', pages: 50000, collections: 50, sets: 5, spaces: [400, 400, 500], optionProps: 10, options: 50, plainProps: 10 },
}
const presetName = (process.argv[2] ?? 'medium').toLowerCase()
const preset = PRESETS[presetName]
if (!preset) {
  console.error(`Unknown size "${process.argv[2]}"; pick one of ${Object.keys(PRESETS).join(', ')}.`)
  process.exit(1)
}

const MARKER = '.pommora-benchmark-nexus'
const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/
const BASE_TIME = 1780000000000
const ROOT_PAGE_SHARE = 0.2
const target = join(homedir(), preset.folder)

const userData =
  process.env.POMMORA_USERDATA ??
  (process.platform === 'darwin'
    ? join(homedir(), 'Library/Application Support/Pommora')
    : process.platform === 'win32'
      ? join(process.env.APPDATA ?? join(homedir(), 'AppData/Roaming'), 'Pommora')
      : join(homedir(), '.config/Pommora'))

function sweep(dir) {
  if (!existsSync(dir)) return
  const entries = readdirSync(dir)
  if (entries.length > 0 && !entries.includes(MARKER)) {
    if (dir === target) {
      console.error(`Refusing to touch ${dir}: it exists and holds no ${MARKER}.`)
      process.exit(1)
    }
    return
  }
  try {
    const { id } = JSON.parse(readFileSync(join(dir, '.nexus/nexus.json'), 'utf8'))
    if (ULID.test(id)) rmSync(join(userData, 'Nexuses', id), { recursive: true, force: true })
  } catch {}
  rmSync(dir, { recursive: true, force: true })
  console.log(`Swept ${dir}`)
}
for (const dir of [join(homedir(), 'Benchmark'), ...Object.values(PRESETS).map((p) => join(homedir(), p.folder))]) sweep(dir)

mkdirSync(target, { recursive: true })
writeFileSync(join(target, MARKER), 'Written by make-benchmark-nexus.mjs; the next build sweeps it.\n')

let seed = 0x9e3779b9 ^ Object.keys(PRESETS).indexOf(presetName)
function rand() {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const int = (n) => Math.floor(rand() * n)
const pick = (list) => list[int(list.length)]
const sample = (list, n) => {
  const pool = [...list]
  const out = []
  while (out.length < n && pool.length) out.push(pool.splice(int(pool.length), 1)[0])
  return out
}

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
let idCounter = 0
function mintId(kindMark) {
  let time = BASE_TIME + idCounter++ * 1000
  let head = ''
  for (let i = 0; i < 10; i++) {
    head = CROCKFORD[time % 32] + head
    time = Math.floor(time / 32)
  }
  let tail = ''
  for (let i = 0; i < 16; i++) tail += CROCKFORD[int(32)]
  const id = head + tail
  return kindMark ? id.slice(0, 10) + kindMark + id.slice(11) : id
}
const pageId = () => mintId('P')
const plainId = () => mintId('')

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, sortKeys(value[k])]))
  }
  return value
}
const json = (value) => `${JSON.stringify(sortKeys(value), null, 2)}\n`

function write(rel, content) {
  const abs = join(target, rel)
  mkdirSync(join(abs, '..'), { recursive: true })
  writeFileSync(abs, content)
}

const ADJECTIVES = ['Amber', 'Brisk', 'Calm', 'Dusky', 'Eager', 'Faded', 'Gentle', 'Hollow', 'Ivory', 'Jade', 'Keen', 'Lucid', 'Mellow', 'Noble', 'Opal', 'Plain', 'Quiet', 'Rustic', 'Silent', 'Tidy', 'Umber', 'Vivid', 'Warm', 'Young', 'Zesty']
const NOUNS = ['Ledger', 'Compass', 'Harbor', 'Meadow', 'Lantern', 'Orchard', 'Summit', 'Thread', 'Anchor', 'Beacon', 'Canvas', 'Delta', 'Ember', 'Forge', 'Garden', 'Island', 'Journal', 'Kettle', 'Lattice', 'Marker', 'Notebook', 'Outpost', 'Prism', 'Quarry', 'Ribbon']
const VERBS = ['gathers', 'carries', 'tracks', 'frames', 'settles', 'weighs', 'shapes', 'reviews', 'sketches', 'compares']
const OBJECTS = ['the open questions', 'a handful of notes', 'the working draft', 'every loose thread', 'the earlier plan', 'a short list of options', 'the latest numbers', 'two competing ideas']
const ENDINGS = ['before the next review', 'while the details are fresh', 'ahead of the deadline', 'for later reference', 'without losing the thread', 'in plain terms']
const OPTION_WORDS = [...ADJECTIVES, ...NOUNS]
const DOMAINS = ['example.com', 'notes.example.org', 'docs.example.net']

const sentence = () => `${pick(NOUNS)} ${pick(VERBS)} ${pick(OBJECTS)} ${pick(ENDINGS)}.`
const paragraph = () => Array.from({ length: 2 + int(3) }, sentence).join(' ')

function dateOf(offsetDays) {
  const d = new Date(Date.UTC(2025, 0, 1) + offsetDays * 86400000)
  return d.toISOString().slice(0, 10)
}

const STATUS_GROUPS = [
  { id: 'upcoming', label: 'Open', color: 'grey' },
  { id: 'in_progress', label: 'Active', color: 'blue' },
  { id: 'done', label: 'Done', color: 'green' },
]

const TYPES = [
  { type: 'select', name: 'Category', count: preset.optionProps, make: (o) => [pick(o)] },
  { type: 'multiSelect', name: 'Tags', count: preset.optionProps, make: (o) => sample(o, 1 + int(3)) },
  { type: 'status', name: 'Stage', count: preset.optionProps, make: (o) => [pick(o)] },
  { type: 'number', name: 'Priority', count: preset.plainProps, make: () => 1 + int(100) },
  { type: 'checkbox', name: 'Pinned', count: preset.plainProps, make: () => rand() < 0.5 },
  { type: 'dateTime', name: 'Due', count: preset.plainProps, make: () => dateOf(int(700)) },
  { type: 'link', name: 'Source', count: preset.plainProps, make: () => `https://${pick(DOMAINS)}/${pick(NOUNS).toLowerCase()}/${int(9999)}` },
]

const PROPS = TYPES.flatMap(({ type, name, count, make }) =>
  Array.from({ length: count }, (_, k) => {
    const options = type === 'select' || type === 'multiSelect' || type === 'status' ? sample(OPTION_WORDS, preset.options) : null
    return { id: `prop_${plainId()}`, name: k === 0 ? name : `${name} ${k + 1}`, type, primary: k === 0, options, make: () => make(options) }
  }),
)

function definition(p) {
  const def = { id: p.id, name: p.name, type: p.type }
  if (p.type === 'select' || p.type === 'multiSelect') def.select_options = p.options.map((value) => ({ value }))
  if (p.type === 'status') {
    def.status_groups = STATUS_GROUPS.map((g, gi) => ({
      ...g,
      options: p.options
        .filter((_, i) => Math.floor((i * STATUS_GROUPS.length) / p.options.length) === gi)
        .map((value) => ({ value, color: g.color, group_id: g.id })),
    }))
  }
  return def
}
write('.nexus/properties.json', json({ defs: Object.fromEntries(PROPS.map((p) => [p.id, definition(p)])), order: PROPS.map((p) => p.id) }))

const contextDefs = [
  { id: plainId(), singular: 'Area', title: 'Areas' },
  { id: plainId(), singular: 'Topic', title: 'Topics' },
  { id: plainId(), singular: 'Project', title: 'Projects' },
]
write('.nexus/contexts/contexts.json', json({ contexts: contextDefs }))

const spacesByGroup = contextDefs.map(() => [])
const allSpaces = []
contextDefs.forEach((group, gi) => {
  const used = new Set()
  for (let i = 0; i < preset.spaces[gi]; i++) {
    let title
    do title = `${pick(ADJECTIVES)} ${group.singular} ${pick(NOUNS)}`
    while (used.has(title))
    used.add(title)
    const space = { id: plainId(), title, group }
    spacesByGroup[gi].push(space)
    allSpaces.push(space)
  }
})
for (const space of allSpaces) {
  const links = {}
  if (rand() < 0.3) {
    const other = contextDefs.filter((g) => g !== space.group)
    for (const g of sample(other, 1 + int(2))) {
      const pool = spacesByGroup[contextDefs.indexOf(g)]
      links[`<${g.title}>`] = sample(pool, 1 + int(2)).map((s) => s.title)
    }
  }
  write(`.nexus/contexts/${space.group.title}/${space.title}/_space.json`, json({ ...links, id: space.id }))
}

const agendaIds = { events: plainId(), tasks: plainId() }
write('.nexus/nexus.json', json({ agenda_folders: agendaIds, createdAt: '2026-06-25T03:05:42Z', id: plainId() }))
write('.nexus/state.json', json({}))
write('.nexus/settings.json', json({ personalization: { accent: 'cyan' } }))
write('.nexus/homepage/homepage.json', json({}))
mkdirSync(join(target, '.nexus/assets'), { recursive: true })
write('Tasks/_taskconfig.json', json({ id: agendaIds.tasks }))
write('Events/_eventconfig.json', json({ id: agendaIds.events }))

const pagesPerCollection = preset.pages / preset.collections
const rootPages = Math.round(pagesPerCollection * ROOT_PAGE_SHARE)
const collections = []
const allPages = []
for (let c = 0; c < preset.collections; c++) {
  const name = `Collection ${String(c + 1).padStart(2, '0')} ${NOUNS[c % NOUNS.length]}`
  const assigned = PROPS.filter((p) => p.primary || rand() < 0.5)
  const sets = Array.from({ length: preset.sets }, (_, s) => ({ name: `Set ${s + 1}`, id: plainId() }))
  const pages = []
  for (let p = 0; p < pagesPerCollection; p++) {
    const home = p < rootPages ? null : sets[(p - rootPages) % preset.sets]
    const n = allPages.length + pages.length + 1
    pages.push({ title: `${pick(ADJECTIVES)} ${pick(NOUNS)} ${String(n).padStart(5, '0')}`, dir: home ? `${name}/${home.name}` : name, assigned })
  }
  collections.push({ name, id: plainId(), assigned, sets, pages })
  allPages.push(...pages)
}

function frontmatterValue(key, value) {
  if (Array.isArray(value)) return `${key}:\n${value.map((v) => `  - ${JSON.stringify(v)}`).join('\n')}`
  return `${key}: ${typeof value === 'string' ? JSON.stringify(value) : value}`
}

const propertyLines = (assigned) => assigned.filter(() => rand() < 0.7).map((p) => frontmatterValue(p.name, p.make()))

function spaceLines() {
  const chosen = sample(allSpaces, 1 + int(3))
  const lines = []
  for (const group of contextDefs) {
    const titles = chosen.filter((s) => s.group === group).map((s) => s.title)
    if (titles.length) lines.push(frontmatterValue(`<${group.title}>`, titles))
  }
  return lines
}

function otherPage(self) {
  let page
  do page = pick(allPages)
  while (page === self)
  return page
}

function body(self) {
  const paragraphs = Array.from({ length: 2 + int(3) }, paragraph)
  if (rand() < 0.2) {
    const links = Array.from({ length: 1 + int(2) }, () => otherPage(self))
    paragraphs.push(`See also ${links.map((p) => `[[${p.title}]]`).join(' and ')}.`)
  }
  return paragraphs.join('\n\n')
}

for (const collection of collections) {
  write(`${collection.name}/_pagecollection.json`, json({ id: collection.id, properties: collection.assigned.map((p) => p.id) }))
  for (const set of collection.sets) write(`${collection.name}/${set.name}/_pageset.json`, json({ id: set.id }))
  for (const page of collection.pages) {
    const front = [`ID: ${pageId()}`, ...propertyLines(page.assigned), ...spaceLines()].join('\n')
    write(`${page.dir}/${page.title}.md`, `---\n${front}\n---\n${body(page)}\n`)
  }
}

console.log(
  `Built ${presetName}: ${allPages.length} pages, ${preset.collections} collections, ${preset.collections * preset.sets} sets, ${PROPS.length} properties, ${allSpaces.length} spaces at ${target}`,
)
