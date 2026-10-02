// expect.mjs <before> <after> — the Incremental Scan plan's verdict: every page renders as before except where a lone fence now reads as prose, every behavior lands where the plan says, and typing is no slower. Exits 1 on any failure.
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const [a, b] = process.argv.slice(2)
const load = (l) => JSON.parse(fs.readFileSync(new URL(`./results/${l}.json`, import.meta.url), 'utf8'))
const A = load(a)
const B = load(b)
execFileSync('node', [fileURLToPath(new URL('./compare.mjs', import.meta.url)), a, b])
const report = fs.readFileSync(new URL(`./results/${a}-vs-${b}.md`, import.meta.url), 'utf8')

const results = []
const check = (name, ok, detail = '') => results.push(`- ${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ` · ${detail}` : ''}`)
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y)
// Glyphs split across different spans land a sub-pixel apart; a screenshot within this many pixels of its twin is the same picture.
const PIXELS = 200

for (const page of Object.keys(A.pages)) {
  if (page === 'Alpha 1') continue
  const lines = Object.keys({ ...A.pages[page].lines, ...B.pages[page].lines })
  const diff = lines.filter((k) => !same(A.pages[page].lines[k], B.pages[page].lines[k]))
  check(`${page} renders line for line as before`, diff.length === 0, diff.length ? `${diff.length} lines differ at ${diff.slice(0, 5).join(', ')}` : '')
  for (const m of report.matchAll(new RegExp(`screenshot \`(${page.replace(/\W+/g, '-')}-\\d+\\.png)\`: (\\S+) differing`, 'g')))
    check(`${m[1]} matches its twin`, Number(m[2]) >= 0 && Number(m[2]) <= PIXELS, `${m[2]} pixels`)
}

const lone = Object.values(B.pages['Alpha 1'].lines)
const text = (l) => l.runs.map((r) => r.t ?? '').join('')
const bold = lone.find((l) => text(l).includes('bold after a lone fence'))
check('a lone fence leaves the line below it prose', !!bold && !bold.cls.includes('codeblock') && bold.runs.some((r) => r.s?.split('|')[1] === '700'))
// A keyword paints as the same keyword does in the render fixture's own JavaScript block.
const keyword = (l) => l?.runs.find((r) => r.t?.startsWith('const'))?.s
const code = lone.find((l) => text(l).includes('const colored'))
const js = Object.values(B.pages['Page A'].lines).find((l) => text(l).includes('const answer'))
check('a closed block below a lone fence keeps its code colors', !!code && code.cls.includes('codeblock') && keyword(code) !== undefined && keyword(code) === keyword(js))

const want = {
  'fence: three backticks, Enter, undo': { typed: '```', entered: '```\n\n```', caret: 4, undone: '```' },
  'math: two dollars, Enter, undo': { entered: '$$\n\n$$', caret: 3, undone: '$$' },
  'checkboxes toggle above and below an edit, and keep their DOM': { kept: [0, 1], above: '- [x] check above', below: '- [x] check below' },
}
for (const name of Object.keys(A.behaviors)) {
  const expected = want[name] ?? A.behaviors[name]
  check(`behavior: ${name}`, same(B.behaviors[name], expected), same(B.behaviors[name], expected) ? '' : `got ${JSON.stringify(B.behaviors[name])}, want ${JSON.stringify(expected)}`)
}
const fold = B.behaviors['heading folds and unfolds with its animation']
check('folding animates both ways', !!fold?.foldAnimates && !!fold?.unfoldAnimates)

// Two runs of one build land within a few percent of each other, so "no slower" allows that much.
for (const page of Object.keys(A.latency))
  check(`typing on ${page} is no slower`, B.latency[page].median <= A.latency[page].median * 1.05, `${A.latency[page].median} → ${B.latency[page].median} ms median`)

const failed = results.filter((r) => r.includes('FAIL')).length
const out = [`### Verdict: ${a} → ${b}`, '', ...results, '', `**${failed === 0 ? 'ALL PASS' : `${failed} FAILED`}**`].join('\n')
fs.writeFileSync(new URL(`./results/verdict-${a}-${b}.md`, import.meta.url), out)
console.log(out)
process.exit(failed === 0 ? 0 : 1)
