// Builds a deterministic benchmark Nexus: 10,000 pages in 20 Collections of 5 Sets, 3 Context groups holding 500 Spaces, and the .nexus/ files the app expects.
// Run: node .claude/Benchmarks/make-benchmark-nexus.mjs [target]   (default ~/Benchmark; a rebuild requires the marker file this script writes)

import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const MARKER = '.pommora-benchmark-nexus'
const target = resolve(process.argv[2] ?? join(homedir(), 'Benchmark'))

const COLLECTIONS = 20
const SETS_PER_COLLECTION = 5
const PAGES_PER_COLLECTION = 500
const ROOT_PAGES_PER_COLLECTION = 100
const SPACE_COUNTS = [150, 150, 200]
const BASE_TIME = 1780000000000

if (existsSync(target)) {
  const entries = readdirSync(target)
  if (entries.length > 0 && !entries.includes(MARKER)) {
    console.error(`Refusing to touch ${target}: it exists and holds no ${MARKER}.`)
    process.exit(1)
  }
  rmSync(target, { recursive: true, force: true })
}

mkdirSync(target, { recursive: true })
writeFileSync(join(target, MARKER), 'Written by make-benchmark-nexus.mjs; safe to delete and rebuild.\n')

let seed = 0x9e3779b9
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
const CATEGORIES = ['Research', 'Design', 'Planning', 'Writing', 'Admin', 'Learning']
const TAGS = ['Draft', 'Reference', 'Urgent', 'Idea', 'Archive', 'Review', 'Shared']
const DOMAINS = ['example.com', 'notes.example.org', 'docs.example.net']

const sentence = () => `${pick(NOUNS)} ${pick(VERBS)} ${pick(OBJECTS)} ${pick(ENDINGS)}.`
const paragraph = () => Array.from({ length: 2 + int(3) }, sentence).join(' ')

const statusGroups = [
  { id: 'upcoming', label: 'Open', color: 'grey', options: ['Open', 'Queued'] },
  { id: 'in_progress', label: 'Active', color: 'blue', options: ['Active', 'Blocked'] },
  { id: 'done', label: 'Done', color: 'green', options: ['Done', 'Shipped'] },
]
const STATUS_VALUES = statusGroups.flatMap((g) => g.options)
const asOptions = (labels) => labels.map((label) => ({ label, value: label }))

const PROPS = [
  { name: 'Priority', type: 'number', make: () => 1 + int(5) },
  { name: 'Effort', type: 'number', make: () => 1 + int(40) },
  { name: 'Pinned', type: 'checkbox', make: () => true },
  { name: 'Due', type: 'dateTime', make: () => dateOf(int(700)) },
  { name: 'Reviewed', type: 'dateTime', make: () => dateOf(int(700)) },
  { name: 'Category', type: 'select', options: CATEGORIES, make: () => [pick(CATEGORIES)] },
  { name: 'Tags', type: 'multiSelect', options: TAGS, make: () => sample(TAGS, 1 + int(3)) },
  { name: 'Stage', type: 'status', make: () => [pick(STATUS_VALUES)] },
  { name: 'Source', type: 'link', make: () => `https://${pick(DOMAINS)}/${pick(NOUNS).toLowerCase()}/${int(9999)}` },
].map((p) => ({ ...p, id: `prop_${plainId()}` }))

function dateOf(offsetDays) {
  const d = new Date(Date.UTC(2025, 0, 1) + offsetDays * 86400000)
  return d.toISOString().slice(0, 10)
}

write(
  '.nexus/properties.json',
  json({
    defs: Object.fromEntries(
      PROPS.map((p) => [
        p.id,
        {
          id: p.id,
          name: p.name,
          type: p.type,
          ...(p.type === 'select' || p.type === 'multiSelect' ? { select_options: asOptions(p.options) } : {}),
          ...(p.type === 'status'
            ? {
                status_groups: statusGroups.map((g) => ({
                  id: g.id,
                  label: g.label,
                  color: g.color,
                  options: g.options.map((value) => ({ value, label: value, color: g.color, group_id: g.id })),
                })),
              }
            : {}),
        },
      ]),
    ),
    order: PROPS.map((p) => p.id),
  }),
)

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
  for (let i = 0; i < SPACE_COUNTS[gi]; i++) {
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

const titles = new Set()
function pageTitle(n) {
  let title
  do title = `${pick(ADJECTIVES)} ${pick(NOUNS)} ${String(n).padStart(5, '0')}`
  while (titles.has(title))
  titles.add(title)
  return title
}

const collections = []
let pageNumber = 0
for (let c = 0; c < COLLECTIONS; c++) {
  const name = `Collection ${String(c + 1).padStart(2, '0')} ${NOUNS[c % NOUNS.length]}`
  const assigned = sample(PROPS, 5 + int(3))
  const sets = Array.from({ length: SETS_PER_COLLECTION }, (_, s) => ({ name: `Set ${s + 1}`, id: plainId() }))
  const pages = []
  for (let p = 0; p < PAGES_PER_COLLECTION; p++) {
    const home = p < ROOT_PAGES_PER_COLLECTION ? null : sets[(p - ROOT_PAGES_PER_COLLECTION) % SETS_PER_COLLECTION]
    pages.push({ title: pageTitle(++pageNumber), dir: home ? `${name}/${home.name}` : name, assigned })
  }
  collections.push({ name, id: plainId(), assigned, sets, pages })
}
const allPages = collections.flatMap((c) => c.pages)

function frontmatterValue(key, value) {
  if (Array.isArray(value)) return `${key}:\n${value.map((v) => `  - ${JSON.stringify(v)}`).join('\n')}`
  return `${key}: ${typeof value === 'string' ? JSON.stringify(value) : value}`
}

function propertyLines(assigned) {
  const wanted = 3 + int(2)
  const chosen = []
  const seenTypes = new Set()
  for (const p of sample(assigned, assigned.length)) {
    if (seenTypes.has(p.type)) continue
    seenTypes.add(p.type)
    chosen.push(p)
    if (chosen.length === wanted) break
  }
  return chosen.map((p) => frontmatterValue(p.name, p.make()))
}

function spaceLines() {
  const chosen = sample(allSpaces, 1 + int(3))
  const lines = []
  for (const group of contextDefs) {
    const titles = chosen.filter((s) => s.group === group).map((s) => s.title)
    if (titles.length) lines.push(frontmatterValue(`<${group.title}>`, titles))
  }
  return lines
}

function body(selfTitle) {
  const paragraphs = Array.from({ length: 2 + int(3) }, paragraph)
  if (rand() < 0.2) {
    const links = sample(allPages.filter((p) => p.title !== selfTitle), 1 + int(2))
    paragraphs.push(`See also ${links.map((p) => `[[${p.title}]]`).join(' and ')}.`)
  }
  return paragraphs.join('\n\n')
}

for (const collection of collections) {
  write(`${collection.name}/_pagecollection.json`, json({ id: collection.id, properties: collection.assigned.map((p) => p.id) }))
  for (const set of collection.sets) write(`${collection.name}/${set.name}/_pageset.json`, json({ id: set.id }))
  for (const page of collection.pages) {
    const front = [`ID: ${pageId()}`, ...propertyLines(page.assigned), ...spaceLines()].join('\n')
    write(`${page.dir}/${page.title}.md`, `---\n${front}\n---\n${body(page.title)}\n`)
  }
}

console.log(`Built ${allPages.length} pages, ${COLLECTIONS} collections, ${COLLECTIONS * SETS_PER_COLLECTION} sets, ${allSpaces.length} spaces at ${target}`)
