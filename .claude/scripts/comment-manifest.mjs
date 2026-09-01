#!/usr/bin/env node
// Lists every substantial comment a stripping pass deleted outright, so the deletions can be read
// rather than trusted. Character counts prove how much went; only this proves what. A long comment
// removed whole is the shape that carries an invariant, so those are the ones worth a human's eye —
// compression is invisible here by design, and a pass that only shortened produces an empty report.
//
// Also reports `{}` left behind in JSX: removing the comment inside `{/* … */}` without its braces
// satisfies the token-stream check and leaves litter no gate sees.
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from '../../Pommora/node_modules/typescript/lib/typescript.js'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const appRoot = join(repoRoot, 'Pommora')
const unitsPath = join(repoRoot, '.claude', 'scripts', 'comment-units.json')

const [base = '53b5d903', unitArg, sizeArg] = process.argv.slice(2)
const FLOOR = Number(sizeArg ?? 150)

const units = existsSync(unitsPath) ? JSON.parse(readFileSync(unitsPath, 'utf8')) : []
const unit = /^\d+$/.test(unitArg ?? '') ? units.find((u) => u.id === Number(unitArg)) : null

const COMMENT = new Set([
  ts.SyntaxKind.SingleLineCommentTrivia,
  ts.SyntaxKind.MultiLineCommentTrivia,
])

// Comment bodies compare on their words alone: a reflowed or re-indented comment is the same
// comment, and only an actual removal should surface here.
const norm = (s) =>
  s
    .replace(/^\/\/+|^\/\*+|\*+\/$/g, '')
    .replace(/^\s*\*/gm, '')
    .replace(/\s+/g, ' ')
    .trim()

function comments(text) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.JSX, text)
  const out = []
  let tok
  while ((tok = scanner.scan()) !== ts.SyntaxKind.EndOfFileToken) {
    if (COMMENT.has(tok)) {
      const raw = scanner.getTokenText()
      out.push({ raw, body: norm(raw), line: scanner.getTokenStart() })
    }
  }
  return out
}

const show = (rev, file) => {
  try {
    return execFileSync('git', ['show', `${rev}:./${file}`], { cwd: appRoot, encoding: 'utf8' })
  } catch {
    return null
  }
}

const files = execFileSync('git', ['ls-files', 'src/**/*.ts', 'src/**/*.tsx'], {
  cwd: appRoot,
  encoding: 'utf8',
})
  .trim()
  .split('\n')
  .filter(Boolean)
  .filter((f) => (unit ? unit.files.includes(f) : true))

let deletedCount = 0
let deletedChars = 0
let filesTouched = 0
const litter = []
const report = []
const shortened = []

const words = (s) => new Set(s.toLowerCase().match(/[a-z0-9']{4,}/g) ?? [])

// How much of the original's vocabulary the candidate still carries. Containment rather than
// Jaccard, because a faithful shortening is a subset of what it replaced.
function overlap(a, b) {
  const wa = words(a)
  if (wa.size === 0) return 0
  const wb = words(b)
  let hit = 0
  for (const w of wa) if (wb.has(w)) hit += 1
  return hit / wa.size
}

for (const file of files) {
  const before = show(base, file)
  if (before === null) continue
  const after = readFileSync(join(appRoot, file), 'utf8')
  if (before === after) continue
  filesTouched += 1

  const survivors = comments(after).filter((c) => c.body !== '')
  const kept = new Set(survivors.map((c) => c.body))
  const missing = comments(before).filter((c) => c.body !== '' && !kept.has(c.body))

  // A shortened comment and a deleted one both leave their original body missing. The survivor
  // that still carries most of its words is the shortened version of it; with no such survivor,
  // the truth left the file entirely, and that is the only case worth a human's attention.
  const gone = []
  for (const c of missing) {
    const best = survivors.reduce(
      (top, s) => {
        const score = overlap(c.body, s.body)
        return score > top.score ? { score, s } : top
      },
      { score: 0, s: null },
    )
    if (best.score >= 0.34) shortened.push({ file, from: c, to: best.s })
    else gone.push(c)
  }
  const big = gone.filter((c) => c.raw.length >= FLOOR)
  deletedCount += gone.length
  deletedChars += gone.reduce((s, c) => s + c.raw.length, 0)

  // `{}` with nothing between the braces is what a deleted JSX comment leaves behind.
  for (const [i, line] of after.split('\n').entries()) {
    if (/^\s*\{\s*\}\s*$/.test(line)) litter.push(`${file}:${i + 1}`)
  }

  if (big.length) report.push({ file, big })
}

for (const { file, big } of report.sort((a, b) => b.big.length - a.big.length)) {
  console.log(`\n━━ ${file} — ${big.length} deleted at ${FLOOR}+ chars`)
  for (const c of big) {
    const body = c.body.length > 400 ? `${c.body.slice(0, 400)}…` : c.body
    console.log(`  [${String(c.raw.length).padStart(5)}] ${body}`)
  }
}

console.log(`\n${'─'.repeat(76)}`)
const saved = shortened.reduce((s, x) => s + (x.from.raw.length - x.to.raw.length), 0)
console.log(`${filesTouched} files changed`)
console.log(`${shortened.length} comments shortened, keeping the truth — ${saved.toLocaleString()} characters saved`)
console.log(`${deletedCount} comments deleted outright — ${deletedChars.toLocaleString()} characters`)
console.log(`${report.reduce((s, r) => s + r.big.length, 0)} of those deletions were ${FLOOR}+ characters — listed above, and the only ones worth reading`)
if (litter.length) {
  console.log(`\n${litter.length} empty JSX expression container(s) left behind:`)
  for (const l of litter) console.log(`  ${l}`)
  process.exit(1)
}
