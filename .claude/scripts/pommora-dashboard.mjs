#!/usr/bin/env node
// Writes the Dashboard's data: the codebase audit's copy, and the line ledger's day-by-day series.
//   pommora-dashboard.mjs            -> fold the tree being committed into today's ledger row
//   pommora-dashboard.mjs --rebuild  -> rewrite the ledger from every day of the branch
import { copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const AUDIT = join(ROOT, '.claude', 'Planning', 'Pommora Codebase Audit.md')
const AUDIT_COPY = join(ROOT, 'Dashboard', 'Audit', 'audit.md')
const LEDGER = join(ROOT, 'Dashboard', 'Ledger', 'loc-history.json')

const WORKSPACES = ['Core', 'UIX', 'Desktop', 'Sync', 'Mobile']
const LEGACY_ROOT = 'Pommora/src'
const SKIP_PREFIX = ['Dashboard', 'Showcase', 'renderer/Showcase']

// The first matching prefix wins; legacy prefixes only place files deleted before the monorepo.
const AREAS = [
  ['Editor — MarkdownPM', ['Core/MarkdownPM'], ['renderer/MarkdownPM']],
  ['Interactions', ['UIX/Interactions'], ['renderer/Interactions', 'renderer/DesignSystem/Interactions']],
  ['Pommora UIX', ['UIX'], ['renderer/DesignSystem', 'renderer/Animation', 'renderer/Cards']],
  [
    'Surfaces & Embeds',
    ['Core/Tiles', 'Core/Web'],
    ['renderer/Tiles', 'renderer/SurfacePM', 'renderer/Blocks', 'renderer/Embeds', 'renderer/PagePreview'],
  ],
  [
    'Views',
    ['Core/Views'],
    ['renderer/Views', 'renderer/Tables', 'renderer/Frames', 'renderer/Components', 'renderer/Detail'],
  ],
  ['Properties', ['Core/Properties'], ['renderer/Properties']],
  [
    'State & Contract',
    ['Core/Contract', 'Core/Platform', 'Core/Session', 'Desktop/Bridge'],
    ['shared', 'preload', 'renderer/Store'],
  ],
  ['Sync', ['Sync', 'Core/Sync', 'Desktop/Sync'], []],
  ['Actions', ['Core/Actions'], ['renderer/Actions']],
  [
    'Nexus & Data',
    [
      'Core/Assets',
      'Core/Connections',
      'Core/Contexts',
      'Core/Files',
      'Core/Index',
      'Core/Nexus',
      'Core/Pages',
      'Core/Paths',
      'Core/Trash',
    ],
    ['main'],
  ],
  ['Matrix', ['Core/Matrix'], []],
  ['App Chrome', ['Core'], ['renderer']],
  ['Desktop Shell', ['Desktop'], []],
  ['Mobile', ['Mobile'], []],
]

// Stack order and swatch, bottom of the chart first.
const ORDER = [
  ['Mobile', '#4B5A6B'],
  ['Sync', '#0F6E5C'],
  ['Desktop Shell', '#0E7C86'],
  ['Properties', '#6B8E23'],
  ['Views', '#1C7629'],
  ['Nexus & Data', '#075CB2'],
  ['Editor — MarkdownPM', '#8C7606'],
  ['Interactions', '#9C2F72'],
  ['Pommora UIX', '#DC519F'],
  ['Actions', '#C25A1C'],
  ['App Chrome', '#B26F07'],
  ['Matrix', '#A24CCE'],
  ['Surfaces & Embeds', '#2F8F6B'],
  ['State & Contract', '#D93B31'],
]
const NAMES = ORDER.map(([name]) => name)

const SKIP_DIR = new Set(['node_modules', 'dist', 'out', '.git'])
const TEST_DIRS = new Set(['Testing', 'fixtures', '__tests__'])
const CONFIG_NAMES = new Set(['package.json', 'biome.json', 'vercel.json'])
const GENERATED = new Set(['UIX/Symbols/iconNames.ts', 'UIX/Symbols/iconTags.ts'])
const EXT = ['.ts', '.tsx', '.css']
const STYLE_EXT = ['.css', '.css.ts']

const under = (rel, prefixes) => prefixes.some((p) => rel === p || rel.startsWith(`${p}/`))

function areaOf(rel) {
  if (rel.startsWith(`${LEGACY_ROOT}/`)) {
    let legacy = rel.slice(LEGACY_ROOT.length + 1)
    if (legacy.startsWith('renderer/src/')) legacy = `renderer/${legacy.slice('renderer/src/'.length)}`
    if (under(legacy, SKIP_PREFIX)) return null
    return AREAS.find(([, , old]) => under(legacy, old))?.[0] ?? null
  }
  if (under(rel, SKIP_PREFIX)) return null
  return AREAS.find(([, now]) => under(rel, now))?.[0] ?? null
}

function classify(rel) {
  const parts = rel.split('/')
  const base = basename(rel)
  if (parts.some((p) => SKIP_DIR.has(p)) || GENERATED.has(rel)) return null
  if (
    parts.some((p) => TEST_DIRS.has(p)) ||
    base.includes('.test.') ||
    base.includes('.spec.') ||
    base.endsWith('Harness.ts')
  )
    return 'tests'
  if (
    ['.d.ts', '.config.ts', '.setup.ts', '.yml', '.yaml'].some((e) => base.endsWith(e)) ||
    CONFIG_NAMES.has(base) ||
    (base.startsWith('tsconfig') && base.endsWith('.json'))
  )
    return 'config'
  return EXT.some((e) => rel.endsWith(e)) ? 'source' : null
}

// An import statement, a re-export or export list, or a stylesheet import; `export const` is code.
const IO_START = /^(import\s(?!\()|import\{|export\s+(type\s+)?\{|export\s+(type\s+)?\*|@import\b)/
const BRACKETS = /^(?:[{}()[\];,>]|\/>|<>|<\/[\w.]*>)+$/
const after = (line) => line.slice(line.indexOf('*/') + 2).trim()

// Code lines, with three disjoint groups among them — import/export, a stylesheet's remaining lines,
// bracket-only lines — and the comment lines counted beside.
function countLines(text, style) {
  const n = { code: 0, io: 0, br: 0, css: 0, c: 0 }
  let inBlock = false
  let inIo = false
  for (const raw of text.split('\n')) {
    let line = raw.trim()
    if (inBlock) {
      if (!line.includes('*/')) {
        n.c++
        continue
      }
      inBlock = false
      line = after(line)
      if (!line) {
        n.c++
        continue
      }
    }
    if (!line) continue
    if (line.startsWith('//')) {
      n.c++
      continue
    }
    if (line.startsWith('/*')) {
      if (!line.includes('*/')) {
        inBlock = true
        n.c++
        continue
      }
      line = after(line)
      if (!line) {
        n.c++
        continue
      }
    }
    n.code++
    if (inIo || IO_START.test(line)) {
      n.io++
      inIo = !(/['";]$/.test(line) || (line.includes('}') && !line.includes('from')))
    } else if (style) n.css++
    else if (BRACKETS.test(line)) n.br++
  }
  return n
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIR.has(entry.name)) yield* walk(join(dir, entry.name))
    } else yield join(dir, entry.name)
  }
}

// base holds a checkout; moved maps a path it holds to the one its file holds today.
function measureTree(base, moved) {
  const zero = () => Object.fromEntries(NAMES.map((a) => [a, 0]))
  const sums = { v: zero(), io: zero(), br: zero(), css: zero(), c: zero(), t: zero(), files: zero() }
  const kinds = { source: 0, tests: 0, config: 0 }
  for (const top of [...WORKSPACES, LEGACY_ROOT].map((r) => join(base, r)).filter(existsSync)) {
    for (const full of walk(top)) {
      const rel = relative(base, full)
      const kind = classify(rel)
      const area = areaOf(moved.get(rel) ?? rel)
      if (!kind || !area) continue
      kinds[kind]++
      if (kind === 'config' || !EXT.some((e) => rel.endsWith(e))) continue
      const n = countLines(readFileSync(full, 'utf8'), STYLE_EXT.some((e) => rel.endsWith(e)))
      if (kind === 'tests') {
        sums.t[area] += n.code
        continue
      }
      sums.files[area]++
      sums.v[area] += n.code
      for (const key of ['io', 'br', 'css', 'c']) sums[key][area] += n[key]
    }
  }
  return { sums, kinds }
}

const git = (...args) =>
  execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', maxBuffer: Infinity })

// A commit's or tree's own files, never the working tree's uncommitted work.
function measureRev(rev, moved) {
  const top = new Set(git('ls-tree', '--name-only', rev).split('\n'))
  const paths = WORKSPACES.filter((w) => top.has(w))
  if (top.has(LEGACY_ROOT.split('/')[0])) paths.push(LEGACY_ROOT)
  const tmp = mkdtempSync(join(tmpdir(), 'pommora-dashboard-'))
  try {
    const tar = execFileSync('git', ['-C', ROOT, 'archive', rev, ...paths], {
      maxBuffer: Infinity,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    execFileSync('tar', ['-x', '-C', tmp], { input: tar, maxBuffer: Infinity })
    return measureTree(tmp, moved)
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

const SERIES_KEYS = ['v', 'io', 'br', 'css', 'c', 't']
const sample = (d, { sums }) => ({
  d,
  ...Object.fromEntries(SERIES_KEYS.map((key) => [key, NAMES.map((a) => sums[key][a])])),
})
const total = ({ sums }) => NAMES.reduce((n, a) => n + sums.v[a], 0)
const header = (census) => ({
  areas: NAMES,
  colors: ORDER.map(([, color]) => color),
  files: NAMES.map((a) => census.sums.files[a]),
  kinds: census.kinds,
})

// One sample per day, newest first, so a commit's renames reach only the days before it.
function history() {
  const log = git(
    '-c', 'diff.renameLimit=0', 'log', '--first-parent', '-M', '--name-status',
    '--format=%x00%H %ad', '--date=short', 'HEAD',
  )
  const moved = new Map()
  const sampled = new Set()
  const out = []
  for (const entry of log.split('\0').slice(1)) {
    const [head, ...changes] = entry.replace(/^\n+|\n+$/g, '').split('\n')
    const [sha, date] = head.split(' ')
    if (!sampled.has(date)) {
      sampled.add(date)
      let census = null
      try {
        census = measureRev(sha, moved)
      } catch {}
      if (census && total(census)) {
        out.push(sample(date, census))
        console.error(`  ${date}  ${String(total(census)).padStart(7)}`)
      }
    }
    for (const change of changes) {
      const [status, old, now] = change.split('\t')
      if (status.startsWith('R')) {
        moved.set(old, moved.get(now) ?? now)
        moved.delete(now)
      }
    }
  }
  return out.reverse()
}

const write = (payload) => writeFileSync(LEDGER, `${JSON.stringify(payload)}\n`)

function rebuild() {
  write({ ...header(measureRev('HEAD', new Map())), series: history() })
  return 'rebuilt from the branch history'
}

// Runs from the pre-commit hook: the index's tree replaces today's row. A changed area map
// re-attributes every day, so it rebuilds instead.
function update() {
  const stored = JSON.parse(readFileSync(LEDGER, 'utf8'))
  if (JSON.stringify(stored.areas) !== JSON.stringify(NAMES)) return rebuild()
  const now = new Date()
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const census = measureRev(git('write-tree').trim(), new Map())
  const series = [...stored.series.filter((s) => s.d !== date), sample(date, census)]
  series.sort((a, b) => a.d.localeCompare(b.d))
  const payload = { ...header(census), series }
  if (JSON.stringify(payload) === JSON.stringify(stored)) return `${date}  unchanged`
  write(payload)
  return `${date}  ${total(census)} lines`
}

if (process.argv.includes('--rebuild')) console.log(`line ledger: ${rebuild()}`)
else {
  if (existsSync(AUDIT)) copyFileSync(AUDIT, AUDIT_COPY)
  console.log(`line ledger: ${update()}`)
}
