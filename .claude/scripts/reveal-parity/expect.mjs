// expect.mjs <before> <after> — the Hover Reveal plan's verdict: every difference must be one of the plan's intended changes or its accepted consequence; exits 1 on any left.
import fs from 'node:fs'
import { differences } from './compare.mjs'

const [a, b] = process.argv.slice(2)
const sibling = (d, field) => d.B[d.path.replace(/[^.]+$/, field)]

// Each delta: the plan's item, the sample paths it covers, and the change it allows there.
const DELTAS = [
  {
    item: 1,
    what: 'a hidden control no longer takes clicks',
    test: (d) => d.path.endsWith('.pe') && d.a === 'auto' && d.b === 'none' && sibling(d, 'vis') === 0,
  },
  {
    item: 2,
    what: 'a keyboard-focused control reveals',
    test: (d) => /\.key\.(vis|pe)$/.test(d.path) && (d.path.endsWith('.vis') ? d.b === 1 : d.b === 'auto'),
  },
  {
    item: 3,
    what: 'the glance body no longer reveals a nested host’s controls',
    test: (d) => /^glanceLeak\.onBody\.(vis|pe)$/.test(d.path),
  },
  {
    item: 4,
    what: 'a block grip stays lit through a transaction elsewhere',
    test: (d) => /^blockGrips\.\w+\.afterTransaction\.vis$/.test(d.path) && d.a === 0 && d.b === 1,
  },
  {
    item: 6,
    what: 'reach: toggles from themselves (280 × 140), the editing handle 300, the code copy 260',
    test: (d) =>
      /^(bottomToggles|windowTabs\.toggles)\.(trail|lead)Reach\./.test(d.path) ||
      /^tileHandle\.editingReach\./.test(d.path) ||
      /^codeTag\.\w+\.(reach\.|inArc\.)/.test(d.path),
  },
  {
    item: 7,
    what: 'prose under the old code-copy arc takes the pointer',
    test: (d) => /^codeTag\.\w+\.inArcHitsText$/.test(d.path) && d.a === false && d.b === true,
  },
  {
    item: 8,
    what: 'the View Tile lock holds when the pointer re-enters the band mid-linger',
    test: (d) => /^viewTile\.lingerReentered\.vis$/.test(d.path) && d.a === 0 && d.b === 1,
  },
  {
    item: 9,
    what: 'with the title hidden, View settings reveals from the band row, not the whole tile',
    test: (d) => /^untitledViewTile\.fromBody\.(vis|pe)$/.test(d.path),
  },
]

const diffs = differences(a, b)
const seen = new Map()
const left = diffs.filter((d) => {
  const hit = DELTAS.find((x) => x.test(d))
  if (!hit) return true
  seen.set(hit.item, [...(seen.get(hit.item) ?? []), d.path])
  return false
})

const out = [`### Verdict: ${a} → ${b}`, '', '#### Declared deltas observed']
for (const x of DELTAS) out.push(`- (${x.item}) ${x.what}: ${seen.has(x.item) ? `${seen.get(x.item).length} samples` : 'not observed'}`)
out.push('', `#### Undeclared differences: ${left.length}`)
for (const d of left) out.push(`- \`${d.path}\`: ${JSON.stringify(d.a)} → ${JSON.stringify(d.b)}`)
out.push('', `**${left.length === 0 ? 'PASS' : 'FAIL'}**`)
fs.writeFileSync(new URL(`./results/verdict-${a}-${b}.md`, import.meta.url), `${out.join('\n')}\n`)
console.log(out.join('\n'))
process.exit(left.length === 0 ? 0 : 1)
