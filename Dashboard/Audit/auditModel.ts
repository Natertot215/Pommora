export const LENSES = [
  'Defect',
  'Integrity',
  'Duplication',
  'Divergence',
  'Complexity',
  'Dead Weight',
  'Hot Path',
  'Placement & Naming',
  'Growth Constraint',
  'Coverage Gap',
]
export const WEIGHTS = ['High', 'Medium', 'Low']
export const SIZES = ['S', 'M', 'L']
export const ORIGINS = ['Parallel Build', 'Patch-Over', 'Residue', 'Drift', 'Premature', 'Shortcut']
export const FIX_KINDS = ['Literal', 'Proposed', 'TBD']

export type Finding = {
  id: string
  title: string
  area: string
  lens: string
  weight: string
  size: string
  origin: string
  netText: string
  net: number | undefined
  finding: string
  fixKind: string
  fix: string
}

export type Group = {
  id: string
  label: string
  body: string
  findings: Finding[]
}

export type Section = { title: string; body: string }

export type Audit = {
  pin: string
  intro: string
  verdict: Section[]
  workstreams: Group[]
  rideAlongs: Group[]
  findings: Finding[]
}

type Outline = { level: number; title: string; lines: string[]; children: Outline[] }

function outline(md: string): Outline {
  const root: Outline = { level: 0, title: '', lines: [], children: [] }
  const stack = [root]
  for (const line of md.split(/\r?\n/)) {
    const h = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line)
    if (!h) {
      stack[stack.length - 1].lines.push(line)
      continue
    }
    const node: Outline = { level: h[1].length, title: h[2], lines: [], children: [] }
    while (stack[stack.length - 1].level >= node.level) stack.pop()
    stack[stack.length - 1].children.push(node)
    stack.push(node)
  }
  return root
}

const keyOf = (title: string): string => title.toLowerCase().replace(/[^a-z]/g, '')

const child = (node: Outline | undefined, key: string): Outline | undefined =>
  node?.children.find((c) => keyOf(c.title).startsWith(key))

const text = (node: Outline | undefined): string => node?.lines.join('\n').trim() ?? ''

// "W1 · Name" and "F-014 · Title" both lead with a code before the separator.
function splitCode(title: string): { code: string; name: string } {
  const m = /^(\S+)\s+[·\-–—]\s+(.+)$/.exec(title)
  return m ? { code: m[1], name: m[2] } : { code: '', name: title }
}

const LABELS = ['Area', 'Lens', 'Weight', 'Size', 'Net', 'Origin'] as const
type FieldLabel = (typeof LABELS)[number]
const LABEL_RE = new RegExp(`\\*\\*(${LABELS.join('|')}):\\*\\*`, 'g')

const flatten = (value: string): string => value.replace(/\s+/g, ' ').trim()

function fields(meta: string): Partial<Record<FieldLabel, string>> {
  const marks = [...meta.matchAll(LABEL_RE)]
  const out: Partial<Record<FieldLabel, string>> = {}
  marks.forEach((m, i) => {
    const end = marks[i + 1]?.index ?? meta.length
    out[m[1] as FieldLabel] = flatten(meta.slice(m.index + m[0].length, end)).replace(/\s*·$/, '')
  })
  return out
}

// The meta line, then **Finding**, then **Fix | Kind**.
const BODY = /^([\s\S]*?)^\*\*Finding\*\*[ \t]*$([\s\S]*?)^\*\*Fix \| (.+?)\*\*[ \t]*$([\s\S]*)/m
// The page carries no citations: every [^N] reference and the definitions gathered at the file's end are dropped.
const FOOTNOTES = /^\[\^[^\]]+\]:.*$|\[\^[^\]]+\]/gm

export function parseNet(value: string): number | undefined {
  const m = /[+-]?\s*\d[\d,]*/.exec(value.replace(/[−–]/g, '-'))
  return m ? Number(m[0].replace(/[\s,]/g, '')) : undefined
}

export function formatNet(n: number): string {
  const digits = Math.abs(n).toLocaleString('en-US')
  return n < 0 ? `−${digits}` : n > 0 ? `+${digits}` : '0'
}

function finding(node: Outline, fallbackArea: string): Finding {
  const { code, name } = splitCode(node.title)
  const body = node.lines.join('\n')
  const [, meta = body, found = '', fixKind = '', fix = ''] = BODY.exec(body) ?? []
  const f = fields(meta)
  const netText = f.Net ?? ''
  return {
    id: code,
    title: name,
    area: f.Area || fallbackArea,
    lens: f.Lens ?? '',
    weight: f.Weight ?? '',
    size: f.Size ?? '',
    origin: f.Origin ?? '',
    netText,
    net: parseNet(netText),
    finding: flatten(found),
    fixKind: fixKind.trim(),
    fix: flatten(fix),
  }
}

function groups(section: Outline | undefined, prefix: string, areaFallback: boolean): Group[] {
  return (section?.children ?? []).map((node, i) => ({
    id: `${prefix}-${i + 1}`,
    label: node.title,
    body: text(node),
    findings: node.children.map((c) => finding(c, areaFallback ? node.title : '')),
  }))
}

export function parseAudit(md: string): Audit {
  const root = outline(md.replace(FOOTNOTES, ''))
  const doc = root.children.find((c) => c.level === 2) ?? root
  const verdict = child(doc, 'verdict')
  const workstreams = groups(child(doc, 'workstreams'), 'ws', false)
  const rideAlongs = groups(child(doc, 'ridealongs'), 'ra', true)
  if (!verdict && workstreams.length === 0 && rideAlongs.length === 0) {
    throw new Error('audit.md holds no Verdict, Workstreams or Ride-Alongs section.')
  }
  const [pin = '', ...intro] = text(doc).split(/\n\s*\n/)
  return {
    pin,
    intro: intro.join('\n\n'),
    verdict: (verdict?.children ?? []).map((c) => ({ title: c.title, body: text(c) })),
    workstreams,
    rideAlongs,
    findings: [...workstreams, ...rideAlongs].flatMap((g) => g.findings),
  }
}

// Canonical values first in their canonical order, then any others in document order.
export function ordered(values: readonly string[], canon: readonly string[] = []): string[] {
  const seen = [...new Set(values.filter(Boolean))]
  const rank = (v: string): number => {
    const i = canon.indexOf(v)
    return i === -1 ? canon.length + seen.indexOf(v) : i
  }
  return seen.sort((a, b) => rank(a) - rank(b))
}

export const countBy = (findings: readonly Finding[], key: keyof Finding): Map<string, number> => {
  const out = new Map<string, number>()
  for (const f of findings) {
    const v = f[key]
    if (typeof v === 'string' && v) out.set(v, (out.get(v) ?? 0) + 1)
  }
  return out
}

export const netSum = (findings: readonly Finding[]): number =>
  findings.reduce((sum, f) => sum + (f.net ?? 0), 0)

export const weightCounts = (findings: readonly Finding[]): Array<[string, number]> => {
  const counts = countBy(findings, 'weight')
  return ordered([...WEIGHTS, ...counts.keys()], WEIGHTS).map((w) => [w, counts.get(w) ?? 0])
}

const CALL = "**Nathan's call:**"
const COUNT = /^(?:Two|Three|Four|Five) \w+\.\s+/
const STEP = /(?<=[.;:])\s+(?=(?:Second|Third|Fourth|Then|Finally),\s|\(\d\)\s)/
const ORDINAL = /^(?:(?:First|Second|Third|Fourth|Then|Finally),|\(\d\))\s+/

// A fix splits into steps only where its text enumerates them: "First, … Second, …" or a
// leading "Two changes." before "(1) … (2) …". A trailing Nathan's call always stands apart.
export function change(fix: string): { steps: string[]; call: string } {
  const at = fix.indexOf(CALL)
  const body = (at < 0 ? fix : fix.slice(0, at)).trim()
  const call = at < 0 ? '' : fix.slice(at + CALL.length).trim()
  const parts = body.replace(COUNT, '').split(STEP)
  if (parts.length < 2) return { steps: [body], call }
  const steps = parts.map((p) => p.replace(ORDINAL, '')).map((p) => p[0].toUpperCase() + p.slice(1))
  return { steps, call }
}

export type Facet = 'area' | 'lens' | 'weight' | 'size' | 'origin' | 'fixKind'
export const FACETS: ReadonlyArray<{ key: Facet; label: string; canon: readonly string[] }> = [
  { key: 'area', label: 'Area', canon: [] },
  { key: 'lens', label: 'Lens', canon: LENSES },
  { key: 'weight', label: 'Weight', canon: WEIGHTS },
  { key: 'size', label: 'Size', canon: SIZES },
  { key: 'origin', label: 'Origin', canon: ORIGINS },
  { key: 'fixKind', label: 'Fix', canon: FIX_KINDS },
]

export type Filters = Record<Facet, string> & { query: string }
export const NO_FILTERS: Filters = {
  area: '',
  lens: '',
  weight: '',
  size: '',
  origin: '',
  fixKind: '',
  query: '',
}

export function matches(f: Finding, filters: Filters): boolean {
  if (FACETS.some(({ key }) => filters[key] && f[key] !== filters[key])) return false
  const q = filters.query.trim().toLowerCase()
  return !q || `${f.id} ${f.title} ${f.finding}`.toLowerCase().includes(q)
}
