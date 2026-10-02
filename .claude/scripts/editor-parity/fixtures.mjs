// Writes the parity fixtures into a scratch copy of ~/Test: each page keeps its own frontmatter and takes a fixed body.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const body = (name) => fs.readFileSync(new URL(`./bodies/${name}.md`, import.meta.url), 'utf8').replace(/\n$/, '')
const para = (i) => 'Paragraph ' + i + ' with **bold** and a [[Page B]] link and `code`.'
const LONG = Array.from({ length: 1250 }, (_, i) => (i % 25 === 0 ? '## Section ' + i : para(i))).join('\n\n')
const UNBROKEN = Array.from({ length: 2500 }, (_, i) => 'Line ' + i + ' of prose with **bold** and a [[Page B]] link.').join('\n')

export const PAGES = {
  'Collection A/Set Alpha/Page A.md': body('render'),
  'Collection A/Set Alpha/Page B.md': body('embed'),
  'Collection A/Set Alpha/Page C.md': body('behavior'),
  'Collection A/Set Beta/Sub-Set A/Alpha 1.md': body('lone'),
  'Collection A/Set Beta/Sub-Set A/Alpha 2.md': LONG,
  'Collection A/Set Beta/Sub-Set A/Alpha 3.md': UNBROKEN,
  'Collection A/Set Beta/Sub-Set B/Beta 1.md': '',
}

export function writeFixtures(nexus) {
  for (const [rel, text] of Object.entries(PAGES)) {
    const file = path.join(nexus, rel)
    const src = fs.readFileSync(file, 'utf8')
    const end = src.indexOf('\n---', 4)
    fs.writeFileSync(file, src.slice(0, end + 4) + '\n' + text)
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) writeFixtures(process.argv[2])
