import { type Document, type Pair, type ParsedNode, parseDocument, isMap } from 'yaml'
import { join, titleFromPath } from '../Paths/posix'
import { type Admission, admitContentFile, ID_KEY } from '../Nexus/identityMark'
import type { ContentKind } from '../Nexus/entities'
import { isPlainObject } from '../Contract/validators'
import { asString } from '../Nexus/coerce'
import { fail, fault, ok, type Result } from '../Contract/result'
import type { PageDetail } from '../Pages/pageDetail'
import { machine } from '../Platform/machine'
import { spellings } from '../Paths/caseFold'
import { heldValue, joinValues } from '../Properties/pageValue'

interface PageEnvelope {
  frontmatter: string
  fenced: boolean
  body: string
}

// An empty block closes at its own fence, so a `---` rule below it stays in the body.
export function splitEnvelope(content: string): PageEnvelope {
  const m = content.match(/^---\r?\n(?:([\s\S]*?)\r?\n)??---[ \t]*\r?\n?/)
  if (!m) return { frontmatter: '', fenced: false, body: content }
  const body = content.slice(m[0].length).replace(/^\r?\n/, '')
  return { frontmatter: m[1] ?? '', fenced: true, body }
}

export const bodyHash = (content: string): string =>
  machine().sha256Hex(splitEnvelope(content).body)

/** Anything that isn't a YAML map — an array, a scalar, unrecoverable YAML — reads as an empty map, and the file is still a valid page. */
function valuesOf(doc: Document): Record<string, unknown> {
  try {
    const parsed: unknown = doc.toJSON()
    return isPlainObject(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export const splitFrontmatter = (content: string): Record<string, unknown> =>
  valuesOf(parseDocument(splitEnvelope(content).frontmatter))

export function parsePage(
  content: string,
  kind: ContentKind = 'page',
): { frontmatter: Record<string, unknown>; admission: Admission } {
  const frontmatter = splitFrontmatter(content)
  return { frontmatter, admission: admitContentFile(frontmatter, kind) }
}

export const stampedId = (text: string): string | null =>
  asString(splitFrontmatter(text)[ID_KEY]) ?? null

/** Broken frontmatter must never be re-serialized — the yaml doc holds only what the parser recovered, so writing it back destroys the rest. Broken is anything that can't round-trip, an alias token like `*word` included. */
const mergeable = (doc: Document): boolean =>
  doc.errors.length === 0 && (doc.contents == null || isMap(doc.contents))

const serialized = (doc: Document): string | null => {
  try {
    const out = doc.toString({ lineWidth: 0 })
    // An empty block's only non-comment line is yaml's `{}` or `null` placeholder, so its comments are all that stays.
    return doc.contents === null || (isMap(doc.contents) && doc.contents.items.length === 0)
      ? out
          .split('\n')
          .filter((l) => l.trimStart().startsWith('#'))
          .map((l) => `${l}\n`)
          .join('')
      : out
  } catch {
    return null
  }
}

const writable = (doc: Document): boolean => mergeable(doc) && serialized(doc) !== null

export const frontmatterWritable = (content: string): boolean =>
  writable(parseDocument(splitEnvelope(content).frontmatter))

/** `---\n<fm>---\n<body>`. No separator blank line — a note must never open with an empty line under Obsidian's properties panel; splitEnvelope still strips one legacy separator. */
export function assembleEnvelope(frontmatterYaml: string, body: string): string {
  const lf = (s: string): string => s.replaceAll('\r\n', '\n')
  const fm =
    frontmatterYaml === '' || frontmatterYaml.endsWith('\n')
      ? frontmatterYaml
      : `${frontmatterYaml}\n`
  return `---\n${lf(fm)}---\n${lf(body)}`
}

const envelope = (fenced: boolean, fm: string, body: string): string =>
  fenced || fm !== '' ? assembleEnvelope(fm, body) : body

function mergeInto(
  doc: Document,
  modeled: Record<string, unknown>,
  modeledKeys: readonly string[],
): string {
  if (mergeable(doc)) {
    const written = (key: string): boolean => key in modeled && modeled[key] !== undefined
    const items = isMap(doc.contents) ? doc.contents.items : []
    const dropped = modeledKeys.filter((k) => !written(k) && doc.has(k))
    // A key written beside a dropped spelling of itself takes that spelling's place.
    for (const key of modeledKeys.filter((k) => written(k) && !doc.has(k))) {
      const was = spellings(dropped, key)[0]
      const pair = items.find((i) => String(i.key) === was)
      if (pair) (pair.key as { value: string }).value = key
    }
    const held: Record<string, unknown> = doc.toJS() ?? {}
    for (const key of modeledKeys) {
      if (!written(key)) {
        if (doc.has(key)) doc.delete(key)
      } else if (JSON.stringify(held[key]) !== JSON.stringify(modeled[key]))
        doc.set(key, modeled[key])
    }
    const out = serialized(doc)
    if (out !== null) return out
  }
  throw new Error(
    'This page’s frontmatter has a syntax error, so Pommora left it untouched. Fix the frontmatter and try again.',
  )
}

export function mergeFrontmatter(
  existingContent: string,
  modeled: Record<string, unknown>,
  modeledKeys: readonly string[],
  body: string,
): string {
  const { frontmatter, fenced } = splitEnvelope(existingContent)
  // A body-only write never parses the frontmatter: an un-adopted note keeps exactly its own bytes, and a broken map is passed through rather than re-serialized from what it recovered.
  if (modeledKeys.length === 0) return envelope(fenced, frontmatter, body)
  return envelope(fenced, mergeInto(parseDocument(frontmatter), modeled, modeledKeys), body)
}

export type KeyCollision = 'prefer-new' | 'merge'

type FrontmatterPair = Pair<ParsedNode, ParsedNode | null>

/** Renames every spelling of `oldName` the frontmatter holds to `newName`, at the first one's place. A held spelling of `newName` is the rival: under `'prefer-new'` it keeps its value and the old spellings go; otherwise the rival, the first old spelling, and with `join` the other old spellings combine through `joinValues`. */
export function renameFrontmatterKey(
  content: string,
  oldName: string,
  newName: string,
  collision: KeyCollision,
  join: boolean,
): string | null {
  const { frontmatter, body } = splitEnvelope(content)
  const doc = parseDocument(frontmatter)
  if (doc.errors.length > 0 || !isMap(doc.contents)) return null
  const items = doc.contents.items
  const keys = items.map((i) => String(i.key))
  const values = valuesOf(doc)
  const held = (name: string): FrontmatterPair[] =>
    spellings(keys, name).map((k) => items[keys.indexOf(k)])
  const [pair, ...variants] = held(oldName)
  if (!pair) return null
  const [rival] = held(newName)
  const drop = (p: FrontmatterPair): void => {
    items.splice(items.indexOf(p), 1)
  }
  if (rival && collision === 'prefer-new') {
    for (const p of [pair, ...variants]) drop(p)
  } else {
    const moved = heldValue(values, oldName, join)
    const value = rival ? joinValues(values[String(rival.key)], moved) : moved
    if (value !== values[String(pair.key)]) doc.set(String(pair.key), value)
    for (const p of [...variants, ...(rival ? [rival] : [])]) drop(p)
    ;(pair.key as { value: string }).value = newName
  }
  const out = serialized(doc)
  return out === null ? null : assembleEnvelope(out, body)
}

export const NO_FILEABLE_ID = fault('That page has no ID Pommora can file.')

export async function readPage(rootPath: string, relPath: string): Promise<Result<PageDetail>> {
  const content = await machine().readText(join(rootPath, relPath))
  if (content === null) return fail('not-found', `Page not found: ${relPath}`)
  const { frontmatter, admission } = parsePage(content)
  if (admission.state !== 'member') return NO_FILEABLE_ID
  return ok({
    id: admission.id,
    title: titleFromPath(relPath),
    path: relPath,
    frontmatter,
    body: splitEnvelope(content).body,
    bodyHash: bodyHash(content),
  })
}

export interface SweptPage {
  raw: Record<string, unknown>
  merge: (modeled: Record<string, unknown>, modeledKeys: readonly string[]) => string
}

// One parse serves a sweep's admission, its read of the values, and its merge. Any identity short of unknown admits it, so an identity-less page is still swept: the sweeps exist to change or clear values, and gating on membership alone would leave a page holding the very value a Remove ran to clear. Its frontmatter must round-trip, so one file nobody can parse is skipped rather than failing the fan-out around it.
export function sweepParse(content: string): SweptPage | null {
  const { frontmatter, fenced, body } = splitEnvelope(content)
  const doc = parseDocument(frontmatter)
  const raw = valuesOf(doc)
  if (admitContentFile(raw, 'page').state === 'unknown' || !writable(doc)) return null
  return { raw, merge: (modeled, keys) => envelope(fenced, mergeInto(doc, modeled, keys), body) }
}
