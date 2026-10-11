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
}

function pageFile({ props = {}, body }) {
  const lines = ['---', ...Object.entries(props).map(([k, v]) => `${k}: ${v}`), `ID: ${pageId()}`, '---', '']
  return lines.join('\n') + body
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
  showColumns(join(SCRATCH.nexus, SET, '_pageset.json'), ['prop_01M4M4059AT100T3YMZX7FV57Q', 'prop_01M32H2GJE1QEW9CFDWJ4MCQ5K'])
  writeFileSync(join(SCRATCH.userData, 'pommora.json'), JSON.stringify({ lastNexusPath: SCRATCH.nexus, recentNexusPaths: [SCRATCH.nexus] }, null, 2))
  return { nexus: SCRATCH.nexus, userData: SCRATCH.userData, pages: Object.keys(PAGES) }
}

export const readPage = (title) => {
  const spec = PAGES[title]
  return readFileSync(join(SCRATCH.nexus, spec.dir, spec.file ?? `${title}.md`), 'utf8')
}

if (process.argv[1] && process.argv[1].endsWith('seed.mjs')) console.log(seedScratch())
