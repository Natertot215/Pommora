import {
  type Document,
  type Pair,
  type ParsedNode,
  parseDocument,
  isMap,
  isScalar,
  isSeq,
} from 'yaml'
import { join, titleFromPath } from '../Paths/posix'
import { type Admission, admitContentFile, ID_KEY } from '../Nexus/identityMark'
import type { ContentKind } from '../Nexus/entities'
import { isPlainObject } from '../Contract/validators'
import { asString } from '../Nexus/coerce'
import { fail, fault, ok, type Result } from '../Contract/result'
import type { PageDetail } from '../Pages/pageDetail'
import { atomicWriteFile } from './atomicWrite'
import { machine } from '../Platform/machine'

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
export function splitFrontmatter(content: string): Record<string, unknown> {
  try {
    const parsed: unknown = parseDocument(splitEnvelope(content).frontmatter).toJSON()
    return isPlainObject(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

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

export function frontmatterWritable(content: string): boolean {
  const doc = parseDocument(splitEnvelope(content).frontmatter)
  return mergeable(doc) && serialized(doc) !== null
}

/** `---\n<fm>---\n<body>`. No separator blank line — a note must never open with an empty line under Obsidian's properties panel; splitEnvelope still strips one legacy separator. */
export function assembleEnvelope(frontmatterYaml: string, body: string): string {
  const lf = (s: string): string => s.replaceAll('\r\n', '\n')
  const fm =
    frontmatterYaml === '' || frontmatterYaml.endsWith('\n')
      ? frontmatterYaml
      : `${frontmatterYaml}\n`
  return `---\n${lf(fm)}---\n${lf(body)}`
}

export function mergeFrontmatter(
  existingContent: string,
  modeled: Record<string, unknown>,
  modeledKeys: readonly string[],
  body: string,
): string {
  const { frontmatter, fenced } = splitEnvelope(existingContent)
  const envelope = (fm: string): string => (fenced || fm !== '' ? assembleEnvelope(fm, body) : body)
  // A body-only write never parses the frontmatter: an un-adopted note keeps exactly its own bytes, and a broken map is passed through rather than re-serialized from what it recovered.
  if (modeledKeys.length === 0) return envelope(frontmatter)
  const doc = parseDocument(frontmatter)
  if (mergeable(doc)) {
    for (const key of modeledKeys) {
      if (key in modeled && modeled[key] !== undefined) doc.set(key, modeled[key])
      else if (doc.has(key)) doc.delete(key)
    }
    const out = serialized(doc)
    if (out !== null) return envelope(out)
  }
  throw new Error(
    'This page’s frontmatter has a syntax error, so Pommora left it untouched. Fix the frontmatter and try again.',
  )
}

export type KeyCollision = 'prefer-new' | 'merge'

type FrontmatterPair = Pair<ParsedNode, ParsedNode | null>

function foldValues(pair: FrontmatterPair, rival: FrontmatterPair): void {
  const into = pair.value
  const from = rival.value
  if (!isSeq(into) || !isSeq(from)) return
  const held = new Set<unknown>()
  for (const item of from.items) if (isScalar(item)) held.add(item.value)
  into.items = [...from.items, ...into.items.filter((i) => !(isScalar(i) && held.has(i.value)))]
}

export function renameFrontmatterKey(
  content: string,
  oldKey: string,
  newKey: string,
  collision: KeyCollision,
): string | null {
  const { frontmatter, body } = splitEnvelope(content)
  const doc = parseDocument(frontmatter)
  if (doc.errors.length > 0 || !isMap(doc.contents)) return null
  const items = doc.contents.items
  const pair = items.find((i) => String(i.key) === oldKey)
  if (!pair) return null
  const drop = (p: FrontmatterPair): void => {
    items.splice(items.indexOf(p), 1)
  }

  const rival = items.find((i) => String(i.key) === newKey)
  if (rival && collision === 'prefer-new') {
    drop(pair)
  } else {
    if (rival) {
      foldValues(pair, rival)
      drop(rival)
    }
    ;(pair.key as { value: string }).value = newKey
  }
  const out = serialized(doc)
  return out === null ? null : assembleEnvelope(out, body)
}

export interface PageWrite {
  previous: string | null
  written: string
}

export async function writePageFile(
  absPath: string,
  modeled: Record<string, unknown>,
  modeledKeys: readonly string[],
  body: string,
  held = false,
): Promise<PageWrite> {
  const previous = await machine().readText(absPath)
  const written = mergeFrontmatter(previous ?? '', modeled, modeledKeys, body)
  await atomicWriteFile(absPath, written, held)
  return { previous, written }
}

export async function openPage(rootPath: string, relPath: string): Promise<Result<PageDetail>> {
  const content = await machine().readText(join(rootPath, relPath))
  if (content === null) return fail('not-found', `Page not found: ${relPath}`)
  const { frontmatter, admission } = parsePage(content)
  if (admission.state !== 'member') return fault('That page has no ID Pommora can file.')
  return ok({
    id: admission.id,
    title: titleFromPath(relPath),
    path: relPath,
    frontmatter,
    body: splitEnvelope(content).body,
    bodyHash: bodyHash(content),
  })
}

// Any identity short of unknown admits it, so an identity-less page is still swept: the sweeps exist to change or clear values, and gating on membership alone would leave a page holding the very value a Remove ran to clear. Its frontmatter must round-trip, so one file nobody can parse is skipped rather than failing the fan-out around it.
export function sweepAdmits(content: string): boolean {
  return parsePage(content).admission.state !== 'unknown' && frontmatterWritable(content)
}
