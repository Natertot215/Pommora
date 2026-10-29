import {
  Document,
  type Node,
  type Scalar,
  parseDocument,
  isCollection,
  isMap,
  isScalar,
  isSeq,
  stringify,
  YAMLMap,
} from 'yaml'
import { join, titleFromPath } from '../Paths/posix'
import { type Admission, admitContentFile, ID_KEY } from '../Nexus/identityMark'
import type { ContentKind } from '../Nexus/entities'
import { isPlainObject } from '../Contract/validators'
import { asString } from '../Nexus/coerce'
import { fail, fault, ok, type Result } from '../Contract/result'
import type { PageDetail } from '../Pages/pageDetail'
import { machine } from '../Platform/machine'
import { readTextOrNull } from './atomicWrite'
import { isBlankRaw, joinValues, type KeyCollision } from './rootValues'

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

/** The title of a whole unquoted `[[x]]`, a list of one list of one scalar; null for any other node. */
function wholeLinkTitle(n: unknown): Scalar | null {
  const only = isSeq(n) && n.items.length === 1 ? n.items[0] : null
  const title = isSeq(only) && only.items.length === 1 ? only.items[0] : null
  return isScalar(title) ? title : null
}

/** A whole unquoted `[[x]]` whose title yaml read as a number or boolean that prints otherwise (`[[007]]`, `[[1.10]]`, `[[True]]`), as its title was written; undefined for any other node. */
function linkAsWritten(n: unknown): unknown[][] | undefined {
  const title = wholeLinkTitle(n)
  if (!title || typeof title.value === 'string' || title.source === undefined) return undefined
  return title.source === String(title.value) ? undefined : [[title.source]]
}

/** Anything that isn't a YAML map — an array, a scalar, unrecoverable YAML — reads as an empty map, and the file is still a valid page. A whole unquoted `[[x]]`, the value or a list's member, keeps its title as written, so a connection names the page its author typed. */
function valuesOf(doc: Document): Record<string, unknown> {
  try {
    const parsed: unknown = doc.toJSON()
    if (!isPlainObject(parsed)) return {}
    for (const { key, value } of isMap(doc.contents) ? doc.contents.items : []) {
      const written = linkAsWritten(value)
      if (written) parsed[String(key)] = written
      else if (isSeq(value))
        value.items.forEach((member, i) => {
          const link = linkAsWritten(member)
          if (link) (parsed[String(key)] as unknown[])[i] = link
        })
    }
    return parsed
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

export const stampedIdOf = async (absFile: string): Promise<string | null> => {
  const text = await readTextOrNull(absFile)
  return text === null ? null : stampedId(text)
}

/** How a block is spelled on its way out: no wrapping, and a flow collection as its author wrote it, `[a, b]`. */
const YAML_OUT = { lineWidth: 0, flowCollectionPadding: false } as const

/** A parsed yaml value as one line of yaml — `[milk, eggs, bread]`, `{x: 1}`, `[[Page]]`, `42` — spelled as the writer spells it; a member holding a line break is double-quoted so the line stays one. */
export function yamlInline(raw: unknown): string {
  const flow = { ...YAML_OUT, collectionStyle: 'flow' } as const
  const out = stringify(raw, flow).trimEnd()
  return out.includes('\n')
    ? stringify(raw, { ...flow, defaultStringType: 'QUOTE_DOUBLE' }).trimEnd()
    : out
}

/** Broken frontmatter must never be re-serialized — the yaml doc holds only what the parser recovered, so writing it back destroys the rest. Broken is anything that can't round-trip, an alias token like `*word` included. */
const mergeable = (doc: Document): boolean =>
  doc.errors.length === 0 && (doc.contents == null || isMap(doc.contents))

const serialized = (doc: Document): string | null => {
  try {
    const out = doc.toString(YAML_OUT)
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

/** `---\n<fm>---\n<body>`. No separator blank line — a note must never open with an empty line under Obsidian's properties panel; splitEnvelope still strips the one other tools and hand edits write. */
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

/** Whether yaml quotes `value` unasked, as it does a numeral's `"2024"`, a `'"Q3"'`, or a `[[Page]]`. */
const quotesUnasked = (value: unknown): boolean => /^["']/.test(yamlInline(value))

/** `value` as a node spelled as the `held` nodes are, the first the one it lands on: a list keeps that one's flow or block style unless it's a whole unquoted `[[x]]`, whose brackets spell a link rather than a style, and a list nested in it, or a whole `[[x]]`, is written flow; each single-line string, the value itself or a list's member, keeps the quotes of the held string equal to it, else takes those of the first held string quoted where yaml wouldn't, and a string yaml quotes unasked, where the file chose none, those of the first quoted held string; anything else is spelled as yaml spells it. */
function nodeSpelledAs(doc: Document, value: unknown, held: unknown[]): Node {
  const node = doc.createNode(value)
  const [lands] = held
  const heldScalars = held.flatMap((h) => (isSeq(h) ? h.items : [h])).filter(isScalar)
  const quoted = heldScalars.filter((n) => n.type === 'QUOTE_DOUBLE' || n.type === 'QUOTE_SINGLE')
  const chosen = quoted.find((n) => !quotesUnasked(n.value))
  const flowHeld = isSeq(lands) && lands.flow && !wholeLinkTitle(lands)
  if (isSeq(node) && (flowHeld || wholeLinkTitle(node))) node.flow = true
  for (const member of isSeq(node) ? node.items : [node]) {
    if (isSeq(member)) member.flow = true
    else if (isScalar(member) && typeof member.value === 'string' && !member.value.includes('\n'))
      member.type = (
        heldScalars.find((n) => n.value === member.value) ??
        chosen ??
        (quotesUnasked(member.value) ? quoted[0] : undefined)
      )?.type
  }
  return node
}

export const UNPARSED_FRONTMATTER =
  'This page’s frontmatter has a syntax error, so Pommora left it untouched. Fix the frontmatter and try again.'

/** `key` holding `node`: in its place when the block holds it; otherwise above the key `above` names when the block holds that key, and last when it doesn't. A node holding a blank value drops `key`, as `landValue` drops one. */
function setAbove(doc: Document, key: string, node: unknown, above?: string): void {
  if (isBlankRaw(isScalar(node) ? node.value : isCollection(node) ? node.items : node))
    return void doc.delete(key)
  const items = isMap(doc.contents) && !doc.has(key) ? doc.contents.items : null
  doc.set(key, node)
  const at = items?.findIndex((p) => String(p.key) === above) ?? -1
  if (items && at >= 0) items.splice(at, 0, ...items.splice(-1))
}

/** The key a key the block doesn't hold lands above; undefined lands it last. */
export type Place = (key: string) => string | undefined

/** Lands each of `modeledKeys` as `modeled` holds it through `setAbove`, which drops one it holds blank or nothing for; a key the block doesn't hold lands where `above` places it, and last without one. */
function mergeInto(
  doc: Document,
  modeled: Record<string, unknown>,
  modeledKeys: readonly string[],
  above?: Place,
): string {
  if (mergeable(doc)) {
    const held = valuesOf(doc)
    for (const key of modeledKeys) {
      if (JSON.stringify(held[key]) === JSON.stringify(modeled[key])) continue
      const node = nodeSpelledAs(doc, modeled[key] ?? null, [doc.get(key, true)])
      setAbove(doc, key, node, above?.(key))
    }
  }
  return mergedBlock(doc)
}

function mergedBlock(doc: Document): string {
  const out = mergeable(doc) ? serialized(doc) : null
  if (out !== null) return out
  throw new Error(UNPARSED_FRONTMATTER)
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

/** `content` with `from` renamed to `to` as `rekeyed` renames it. */
export function renameFrontmatterKey(
  content: string,
  from: string,
  to: string,
  collision: KeyCollision,
): string | null {
  const { frontmatter, body } = splitEnvelope(content)
  const doc = parseDocument(frontmatter)
  return doc.errors.length > 0 ? null : rekeyed(doc, body, from, to, collision)
}

/** The page of `doc` and `body` with `from` renamed to `to` in its place; null when nothing moves. A held `to` is the rival: under `'prefer-new'` it keeps its value and `from` goes; under `'merge'` the two combine through `joinValues` in `from`'s place. The value lands through `setAbove`, so a blank one leaves. */
function rekeyed(
  doc: Document,
  body: string,
  from: string,
  to: string,
  collision: KeyCollision,
): string | null {
  if (from === to || !isMap(doc.contents)) return null
  const items = doc.contents.items
  const held = (key: string) => items.find((i) => String(i.key) === key)
  const pair = held(from)
  if (!pair) return null
  const rival = held(to)
  if (rival && collision === 'prefer-new') {
    items.splice(items.indexOf(pair), 1)
    setAbove(doc, to, rival.value)
  } else {
    const values = valuesOf(doc)
    const node = rival
      ? nodeSpelledAs(doc, joinValues(values[to], values[from]), [pair.value, rival.value])
      : pair.value
    if (rival) items.splice(items.indexOf(rival), 1)
    setAbove(doc, from, node)
    ;(pair.key as { value: string }).value = to
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
  /** `rekeyed` over this parse. */
  rekey: (from: string, to: string, collision: KeyCollision) => string | null
  merge: (modeled: Record<string, unknown>, modeledKeys: readonly string[], above?: Place) => string
  /** `key`'s pair as the block was parsed, its quoting, style, comment, and alias kept; undefined when the block holds no `key`. */
  pair: (key: string) => string | undefined
  /** The key after `key` in the block's own order, which its line stands above; undefined when the block holds no `key` or it's last. */
  above: (key: string) => string | undefined
  /** The page with `key` holding the node `landing` spells, verbatim under E-1 and whatever key `landing` names, landed by `setAbove`, or without `key` when `landing` is undefined or spells a blank value; null when that leaves `key` as it is, or when `landing` isn't one key's pair. */
  withPair: (key: string, landing: string | undefined, above?: string) => string | null
}

// One parse serves a sweep's admission, its read of the values, and its merge. Any identity short of unknown admits it, so an identity-less page is still swept: the sweeps exist to change or clear values, and gating on membership alone would leave a page holding the very value a Remove ran to clear. Its frontmatter must round-trip, so one file nobody can parse is skipped rather than failing the fan-out around it.
export function sweepParse(content: string): SweptPage | null {
  const { frontmatter, fenced, body } = splitEnvelope(content)
  const doc = parseDocument(frontmatter)
  const raw = valuesOf(doc)
  if (admitContentFile(raw, 'page').state === 'unknown' || !writable(doc)) return null
  const pair = (key: string): string | undefined => {
    const held = isMap(doc.contents) && doc.contents.items.find((p) => String(p.key) === key)
    if (!held) return undefined
    const one = new YAMLMap()
    one.items.push(held.clone())
    return new Document(one).toString({ ...YAML_OUT, verifyAliasOrder: false })
  }
  return {
    raw,
    rekey: (from, to, collision) => rekeyed(doc, body, from, to, collision),
    merge: (modeled, keys, above) => envelope(fenced, mergeInto(doc, modeled, keys, above), body),
    pair,
    above: (key) => {
      const order = isMap(doc.contents) ? doc.contents.items.map((p) => String(p.key)) : []
      const at = order.indexOf(key)
      return at < 0 ? undefined : order[at + 1]
    },
    withPair: (key, landing, above) => {
      const one = landing === undefined ? null : parseDocument(landing).contents
      if (landing !== undefined && !(isMap(one) && one.items.length === 1)) return null
      const held = pair(key)
      setAbove(doc, key, isMap(one) ? one.items[0].value : null, above)
      return pair(key) === held ? null : envelope(fenced, mergedBlock(doc), body)
    },
  }
}
