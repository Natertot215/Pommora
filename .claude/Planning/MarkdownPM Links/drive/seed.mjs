// Builds the scratch Nexus and userData the driver launches against: a copy of ~/Test plus the pages the
// Links Cleanup's scenarios read, so every run starts from the same tree and nothing touches the real ~/Test.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { ulid } from 'ulidx'

const ROOT = join(tmpdir(), 'pommora-drive')
export const SCRATCH = {
  root: ROOT,
  nexus: join(ROOT, 'Test'),
  userData: join(ROOT, 'userData'),
  source: join(homedir(), 'Test'),
}

const PAGE_MARK_INDEX = 10
const pageId = () => {
  const id = ulid()
  return `${id.slice(0, PAGE_MARK_INDEX)}P${id.slice(PAGE_MARK_INDEX + 1)}`
}

const SET = join('Collection A', 'Set Alpha')
const SET_B = join('Collection A', 'Set Beta')

// The Link property every scenario reads (`Fixture Link`, no display set), and three the Phase 8 hand-check adds, one per Format.
export const LINK_PROPS = {
  fixture: 'prop_01M32H2GJE1QEW9CFDWJ4MCQ5K',
  full: 'prop_01M4M4059B000000000000FXXF',
  short: 'prop_01M4M4059B00000000000SH0RT',
  title: 'prop_01M4M4059B00000000000T1T1E',
}
const NOTES_PROP = 'prop_01M4M4059AT100T3YMZX7FV57Q'
const LINK_DEFS = {
  [LINK_PROPS.full]: { id: LINK_PROPS.full, name: 'Drive Full', type: 'link', link_display: 'link-full' },
  [LINK_PROPS.short]: { id: LINK_PROPS.short, name: 'Drive Short', type: 'link', link_display: 'link-short' },
  [LINK_PROPS.title]: { id: LINK_PROPS.title, name: 'Drive Title', type: 'link', link_display: 'link-title' },
}

// Titles the scenarios open by name. Every link form the plan touches appears somewhere below.
export const PAGES = {
  Alpha: { dir: SET, body: `# Alpha\n\n## Setup\n\nThe setup section.\n\n### Notes\n\nNotes under setup.\n\n## Usage\n\nSee [[Beta]] and [Beta](Beta).\n` },
  Beta: {
    dir: SET,
    props: { 'Fixture Link': '"[[Alpha#Setup]]"', Notes: '"see §Setup and [[Alpha]] and [[Missing]]"' },
    body: [
      '# Beta',
      '',
      '## Setup',
      '',
      'Resolved: [[Alpha]] and [x](Alpha) and [[Alpha#Setup]] and [x](Alpha#Setup) and [[Alpha|alias]].',
      'Phantom: [[Missing]] and [x](Missing) and [[Alpha#Nope]].',
      'Ambiguous: [[Dup]] and [x](Dup).',
      'Held: [[#Setup]] and [x](#Setup) and [[#Nope]].',
      'Web: [docs](https://example.com) and https://example.com and [x](example.com) and [m](mailto:a@b.co).',
      'Nested: **bold [[Alpha]] link** and *em [x](https://example.com) link*.',
      'Run: see §Setup here.',
      'Mid-line embed: see ![[Alpha]] here.',
      '',
      '![[Alpha]]',
      '',
      '| Col A | Col B |',
      '| --- | --- |',
      '| [[Alpha]] plain | **bold [[Alpha]]** |',
      '| [[Missing]] and [x](Missing) | §Setup and [[#Setup]] |',
      '| [[Alpha\\|alias]] | [x](https://example.com) |',
      '| [[Dup]] | plain text cell |',
      '',
      '```',
      '[[Alpha|b]] in a fence',
      '```',
      '',
      'Inline `[[Alpha]]` code.',
      '',
      'tail',
      '',
    ].join('\n'),
  },
  Gamma: { dir: SET, body: '# Gamma\n\nA page to link to, embed, and rename.\n' },
  Scratch: { dir: SET, body: '# Scratch\n\n' },
  Dup: { dir: SET, body: '# Dup\n\nFirst of two.\n' },
  'Dup (Set Beta)': { dir: SET_B, file: 'Dup.md', body: '# Dup\n\nSecond of two.\n' },
  // Phase 8's Link value rows: every value form the hand-check names, one page per row, plus one row to commit into.
  Links: {
    dir: SET,
    props: { 'Fixture Link': '"[[Alpha|Mine]]"', 'Drive Full': '"https://example.com"', 'Drive Short': '"https://example.com"', 'Drive Title': '"https://example.com"' },
    body: '# Links\n\nThe row with an alias and an address in each Format.\n',
  },
  Phantom: { dir: SET, props: { 'Fixture Link': '"[[Missing]]"' }, body: '# Phantom\n' },
  Ambiguous: { dir: SET, props: { 'Fixture Link': '"[[Dup]]"' }, body: '# Ambiguous\n' },
  Written: { dir: SET, props: { 'Fixture Link': '"[x](Alpha)"' }, body: '# Written\n' },
  Invalid: { dir: SET, props: { 'Fixture Link': 'TBD' }, body: '# Invalid\n' },
  Long: { dir: SET, props: { 'Fixture Link': '"[[Alpha|An alias long enough to overflow the column it sits in and show the ellipsis]]"' }, body: '# Long\n' },
  Commit: { dir: SET, props: { 'Fixture Link': '"[[Alpha]]"' }, body: '# Commit\n\n## Setup\n\nA heading for a held value.\n' },
  'Card Links': { dir: SET_B, props: { 'Fixture Link': '"[[Alpha#Setup]]"', 'Drive Short': '"https://example.com"' }, body: '# Card Links\n' },
  'Card Phantom': { dir: SET_B, props: { 'Fixture Link': '"[[Missing]]"' }, body: '# Card Phantom\n' },
}

function pageFile({ props = {}, body }) {
  const lines = ['---', ...Object.entries(props).map(([k, v]) => `${k}: ${v}`), `ID: ${pageId()}`, '---', '']
  return lines.join('\n') + body
}

function addLinkDefs(registry) {
  const json = JSON.parse(readFileSync(registry, 'utf8'))
  Object.assign(json.defs, LINK_DEFS)
  json.order = [...json.order.filter((id) => !(id in LINK_DEFS)), ...Object.keys(LINK_DEFS)]
  writeFileSync(registry, JSON.stringify(json, null, 2))
}

// A collection validates the properties its pages use, so the added Link properties join Collection A's list.
function assignProperties(sidecar, ids) {
  const json = JSON.parse(readFileSync(sidecar, 'utf8'))
  json.properties = [...(json.properties ?? []).filter((id) => !ids.includes(id)), ...ids]
  writeFileSync(sidecar, JSON.stringify(json, null, 2))
}

// Set Beta opens as a Cards view, so the Card parent is driven without a view switch.
function cardsView(sidecar, ids) {
  const json = JSON.parse(readFileSync(sidecar, 'utf8'))
  const cards = { id: 'view_01M4M4059B0000000000CARDS0', name: 'Cards', type: 'cards', property_order: ['_title', ...ids] }
  json.views = [cards, ...(json.views ?? []).filter((v) => v.id !== cards.id)]
  json.active_view = cards.id
  writeFileSync(sidecar, JSON.stringify(json, null, 2))
}

function showColumns(sidecar, ids) {
  const json = JSON.parse(readFileSync(sidecar, 'utf8'))
  for (const view of json.views ?? []) {
    view.property_order = ['_title', ...ids, ...(view.property_order ?? []).filter((id) => id !== '_title' && !ids.includes(id))]
    view.hidden_properties = (view.hidden_properties ?? []).filter((id) => !ids.includes(id))
  }
  writeFileSync(sidecar, JSON.stringify(json, null, 2))
}

export function seedScratch() {
  if (!existsSync(SCRATCH.source)) throw new Error(`${SCRATCH.source} is missing; the scratch Nexus is copied from it`)
  rmSync(SCRATCH.root, { recursive: true, force: true })
  mkdirSync(SCRATCH.userData, { recursive: true })
  cpSync(SCRATCH.source, SCRATCH.nexus, { recursive: true })
  for (const [title, spec] of Object.entries(PAGES)) {
    const dir = join(SCRATCH.nexus, spec.dir)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, spec.file ?? `${title}.md`), pageFile(spec))
  }
  addLinkDefs(join(SCRATCH.nexus, '.nexus', 'properties.json'))
  assignProperties(join(SCRATCH.nexus, 'Collection A', '_pagecollection.json'), [LINK_PROPS.full, LINK_PROPS.short, LINK_PROPS.title])
  showColumns(join(SCRATCH.nexus, SET, '_pageset.json'), [NOTES_PROP, LINK_PROPS.fixture, LINK_PROPS.full, LINK_PROPS.short, LINK_PROPS.title])
  cardsView(join(SCRATCH.nexus, SET_B, '_pageset.json'), [LINK_PROPS.fixture, LINK_PROPS.short])
  writeFileSync(join(SCRATCH.userData, 'pommora.json'), JSON.stringify({ lastNexusPath: SCRATCH.nexus, recentNexusPaths: [SCRATCH.nexus] }, null, 2))
  return { nexus: SCRATCH.nexus, userData: SCRATCH.userData, pages: Object.keys(PAGES) }
}

export const readPage = (title) => {
  const spec = PAGES[title]
  return readFileSync(join(SCRATCH.nexus, spec.dir, spec.file ?? `${title}.md`), 'utf8')
}

if (process.argv[1] && process.argv[1].endsWith('seed.mjs')) console.log(seedScratch())
