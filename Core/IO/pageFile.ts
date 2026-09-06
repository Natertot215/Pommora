import {
  type Document,
  type Pair,
  type ParsedNode,
  parseDocument,
  isMap,
  isScalar,
  isSeq,
} from 'yaml'
import { basename, join } from '../Locations/posix'
import { contentId } from '../Nexus/identityMark'
import { basenameNoMd } from '../Locations/coerce'
import { adoptedId } from '../Locations/ids'
import type { PageDetail } from '../Pages/pageDetail'
import { atomicWriteFile } from './atomicWrite'
import { machine } from '../Platform/machine'

interface PageEnvelope {
  frontmatter: string
  body: string
}

export function splitEnvelope(content: string): PageEnvelope {
  if (!content.startsWith('---')) return { frontmatter: '', body: content }
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/)
  if (!m) return { frontmatter: '', body: content }
  const body = content.slice(m[0].length).replace(/^\r?\n/, '') // strip one separator line
  return { frontmatter: m[1], body }
}

/** The one frontmatter parse. Anything that isn't a YAML map — an array, a scalar, unrecoverable
 *  YAML — reads as an empty map, and the file is still a valid page. */
export function splitFrontmatter(content: string): Record<string, unknown> {
  try {
    const parsed: unknown = parseDocument(splitEnvelope(content).frontmatter).toJSON()
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

/** Broken frontmatter must never be re-serialized — the yaml doc holds only what the parser
 *  recovered, so writing it back destroys the rest. Broken is anything that can't round-trip:
 *  parse errors, a non-map, or a doc that parses clean yet refuses to serialize (an alias token
 *  like `*word` is exactly that). */
const mergeable = (doc: Document): boolean =>
  doc.errors.length === 0 && (doc.contents == null || isMap(doc.contents))

const serialized = (doc: Document): string | null => {
  try {
    return doc.toString({ lineWidth: 0 })
  } catch {
    return null
  }
}

export function frontmatterWritable(content: string): boolean {
  const doc = parseDocument(splitEnvelope(content).frontmatter)
  return mergeable(doc) && serialized(doc) !== null
}

/** Assemble canonical envelope bytes: `---\n<fm>---\n<body>` (fm must end in \n).
 *  No separator blank line — a note must never open with an empty line under
 *  Obsidian's properties panel. splitEnvelope still strips one legacy separator,
 *  so a body can't round-trip a leading blank line; that's the intended shape. */
export function assembleEnvelope(frontmatterYaml: string, body: string): string {
  const lf = (s: string): string => s.replaceAll('\r\n', '\n')
  const fm = frontmatterYaml.endsWith('\n') ? frontmatterYaml : `${frontmatterYaml}\n`
  return `---\n${lf(fm)}---\n${lf(body)}`
}

export function mergeFrontmatter(
  existingContent: string,
  modeled: Record<string, unknown>,
  modeledKeys: readonly string[],
  body: string,
): string {
  const { frontmatter } = splitEnvelope(existingContent)
  // A body-only write never parses the frontmatter: an un-adopted note keeps exactly its own
  // bytes, and a broken map is passed through rather than re-serialized from what it recovered.
  if (modeledKeys.length === 0)
    return frontmatter === '' ? body : assembleEnvelope(frontmatter, body)
  const doc = parseDocument(frontmatter)
  if (mergeable(doc)) {
    for (const key of modeledKeys) {
      if (key in modeled && modeled[key] !== undefined) doc.set(key, modeled[key])
      else doc.delete(key)
    }
    const out = serialized(doc)
    if (out !== null) return assembleEnvelope(out, body)
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
): Promise<PageWrite> {
  const previous = await machine().readText(absPath)
  const written = mergeFrontmatter(previous ?? '', modeled, modeledKeys, body)
  await atomicWriteFile(absPath, written)
  return { previous, written }
}

export async function readPageDetail(rootPath: string, relPath: string): Promise<PageDetail> {
  const absFile = join(rootPath, relPath)
  const content = await machine().readText(absFile)
  if (content === null) throw new Error(`Page not found: ${relPath}`)
  const frontmatter = splitFrontmatter(content)
  return {
    id: contentId(frontmatter) ?? adoptedId(relPath),
    title: basenameNoMd(basename(relPath)),
    path: relPath,
    frontmatter,
    body: splitEnvelope(content).body,
  }
}
