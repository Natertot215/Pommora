#!/usr/bin/env node
// Measures the comment mass of the app's TypeScript, and proves a stripping pass touched nothing
// else. `--snapshot` records per-file comment characters alongside a hash of the file's non-trivia
// token stream; `--verify` re-measures against that snapshot, reporting the reduction and failing
// any file whose token stream moved — the one check that survives Biome reformatting, because
// whitespace is trivia and never enters the hash.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from '../../Pommora/node_modules/typescript/lib/typescript.js'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const appRoot = join(repoRoot, 'Pommora')

const COMMENT = new Set([
  ts.SyntaxKind.SingleLineCommentTrivia,
  ts.SyntaxKind.MultiLineCommentTrivia,
])

// The raw scanner cannot be used here. It has no parser to tell it that the `}` closing a
// template substitution resumes the template, so at `` `a${x}b` `` it takes the trailing backtick
// as the start of a new string and swallows the rest of the file into it — comments included,
// which both hides them from the count and makes any edit before them look like a code change.
// The parser gets templates right, and drops comments as trivia on its own.
const parse = (file, text) =>
  ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

function tokenStream(sf) {
  const stream = createHash('sha1')
  const walk = (node) => {
    // A `/** */` block is parsed into JSDoc nodes and hangs off the declaration as real children,
    // so descending into one puts its prose in the hash and makes rewording it read as a code edit.
    if (node.kind === ts.SyntaxKind.JSDoc) return
    const kids = node.getChildren(sf)
    if (kids.length === 0) {
      if (node.kind !== ts.SyntaxKind.EndOfFileToken) stream.update(`${node.kind} ${node.getText(sf)}`)
      return
    }
    for (const k of kids) walk(k)
  }
  walk(sf)
  return stream.digest('hex')
}

function commentsOf(sf, text) {
  const seen = new Map()
  const take = (ranges) => {
    for (const r of ranges ?? []) if (COMMENT.has(r.kind)) seen.set(r.pos, r.end - r.pos)
  }
  const walk = (node) => {
    const kids = node.getChildren(sf)
    if (kids.length === 0) {
      take(ts.getLeadingCommentRanges(text, node.getFullStart()))
      take(ts.getTrailingCommentRanges(text, node.getEnd()))
      return
    }
    for (const k of kids) walk(k)
  }
  walk(sf)
  return seen
}

// A snapshot of the tree as some commit left it, so a baseline can be rebuilt after the working
// tree has already moved.
const atRev = (rev, file) =>
  execFileSync('git', ['show', `${rev}:./${file}`], { cwd: appRoot, encoding: 'utf8' })

function measure(file, rev) {
  const text = rev ? atRev(rev, file) : readFileSync(join(appRoot, file), 'utf8')
  const sf = parse(file, text)
  const seen = commentsOf(sf, text)
  let chars = 0
  for (const len of seen.values()) chars += len
  return { chars, count: seen.size, tokens: tokenStream(sf) }
}

const sources = () =>
  execFileSync('git', ['ls-files', 'src/**/*.ts', 'src/**/*.tsx'], { cwd: appRoot, encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean)

// Directives a tool reads rather than a reader. Deleting one is a silent behavior change the
// token hash cannot see, because the comment was never a token.
const PRAGMAS = { 'biome-ignore': 79, KNOB: 84, '@vitest-environment': 88 }

function pragmas() {
  const out = {}
  for (const p of Object.keys(PRAGMAS)) {
    const hits = execFileSync(
      'git',
      ['grep', '-o', '-F', p, '--', 'src/*.ts', 'src/*.tsx'],
      { cwd: appRoot, encoding: 'utf8' },
    )
    out[p] = hits.trim() === '' ? 0 : hits.trim().split('\n').length
  }
  return out
}

const scan = (rev) => Object.fromEntries(sources().map((f) => [f, measure(f, rev)]))

const fmt = (n) => n.toLocaleString('en-US')
const pct = (part, whole) => (whole === 0 ? '—' : `${((part / whole) * 100).toFixed(1)}%`)
const total = (files, key) => Object.values(files).reduce((sum, r) => sum + r[key], 0)

// A file's unit is its directory; the top-level areas that hold their whole tree in one folder
// (shared, preload) collapse to that folder.
const unitOf = (f) => f.replace(/^src\//, '').split('/').slice(0, -1).join('/') || '(root)'

function table(files, base) {
  const units = new Map()
  for (const [f, r] of Object.entries(files)) {
    const u = unitOf(f)
    const a = units.get(u) ?? { chars: 0, count: 0, files: 0, was: 0 }
    a.chars += r.chars
    a.count += r.count
    a.files += 1
    a.was += base?.[f]?.chars ?? r.chars
    units.set(u, a)
  }
  const rows = [...units].sort((x, y) => y[1].was - x[1].was)
  const head = base ? ['unit', 'files', 'cmts', 'was', 'now', 'cut'] : ['unit', 'files', 'cmts', 'chars']
  const line = (c) =>
    console.log(
      c[0].padEnd(40),
      ...c.slice(1).map((v) => String(v).padStart(base ? 9 : 8)),
    )
  line(head)
  for (const [u, a] of rows) {
    line(
      base
        ? [u, a.files, a.count, fmt(a.was), fmt(a.chars), pct(a.was - a.chars, a.was)]
        : [u, a.files, a.count, fmt(a.chars)],
    )
  }
  const now = total(files, 'chars')
  const was = base ? Object.values(base).reduce((s, r) => s + r.chars, 0) : now
  line(
    base
      ? ['TOTAL', Object.keys(files).length, total(files, 'count'), fmt(was), fmt(now), pct(was - now, was)]
      : ['TOTAL', Object.keys(files).length, total(files, 'count'), fmt(now)],
  )
  return { was, now }
}

const [mode, arg] = process.argv.slice(2)
const snapshotPath = join(repoRoot, '.claude', 'scripts', 'comment-baseline.json')
const unitsPath = join(repoRoot, '.claude', 'scripts', 'comment-units.json')

// A unit id narrows every mode to that unit's files; without one the modes read the whole tree.
const units = existsSync(unitsPath) ? JSON.parse(readFileSync(unitsPath, 'utf8')) : []
const unit = /^\d+$/.test(arg ?? '') ? units.find((u) => u.id === Number(arg)) : null
const scope = (files) =>
  unit ? Object.fromEntries(Object.entries(files).filter(([f]) => unit.files.includes(f))) : files

if (mode === '--snapshot') {
  const files = scan(arg && !/^\d+$/.test(arg) ? arg : undefined)
  writeFileSync(snapshotPath, `${JSON.stringify(files, null, 0)}\n`)
  table(files)
  console.log(`\nsnapshot → ${snapshotPath}`)
} else if (mode === '--unit') {
  if (!unit) {
    console.error(`no unit ${arg} in ${unitsPath}`)
    process.exit(1)
  }
  const base = JSON.parse(readFileSync(snapshotPath, 'utf8'))
  console.log(`Unit ${unit.id} — ${unit.name}`)
  console.log(`${unit.files.length} files · ${fmt(unit.budgetSource)} comment characters`)
  console.log(
    `target: cut ${fmt(Math.ceil(unit.budgetSource * 0.35))} to reach 35%, ` +
      `${fmt(Math.ceil(unit.budgetSource * 0.5))} to reach 50%\n`,
  )
  for (const f of unit.files) console.log(`${String(base[f].chars).padStart(7)}  ${f}`)
} else if (mode === '--verify') {
  if (!existsSync(snapshotPath)) {
    console.error(`no snapshot at ${snapshotPath} — run --snapshot first`)
    process.exit(1)
  }
  const base = scope(JSON.parse(readFileSync(snapshotPath, 'utf8')))
  const files = scope(scan())
  const { was, now } = table(files, base)

  const moved = []
  const grew = []
  for (const [f, r] of Object.entries(files)) {
    const b = base[f]
    if (!b) continue
    if (b.tokens !== r.tokens) moved.push(f)
    if (r.chars > b.chars) grew.push([f, b.chars, r.chars])
  }
  const gone = Object.keys(base).filter((f) => !files[f])

  console.log(`\ncut ${fmt(was - now)} of ${fmt(was)} comment characters — ${pct(was - now, was)}`)
  if (grew.length) {
    console.log(`\n${grew.length} file(s) gained comment characters:`)
    for (const [f, b, n] of grew) console.log(`  ${f}  ${fmt(b)} → ${fmt(n)}`)
  }
  if (gone.length) console.log(`\n${gone.length} file(s) in the snapshot no longer exist:\n  ${gone.join('\n  ')}`)
  if (moved.length) {
    console.log(`\nCODE CHANGED in ${moved.length} file(s) — a comment pass must not:`)
    for (const f of moved) console.log(`  ${f}`)
    process.exit(1)
  }
  const counts = pragmas()
  const lost = Object.entries(PRAGMAS).filter(([p, want]) => counts[p] !== want)
  if (lost.length) {
    console.log('\nPRAGMA COUNT MOVED — these are directives, not prose:')
    for (const [p, want] of lost) console.log(`  ${p}: expected ${want}, found ${counts[p]}`)
    process.exit(1)
  }
  console.log(
    `\npragmas intact — ${Object.entries(counts)
      .map(([p, n]) => `${p} ${n}`)
      .join(' · ')}`,
  )
  console.log('token streams identical — comments only')
} else {
  table(scope(scan()))
}
