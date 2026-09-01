// The page (.md) file engine. Owns the `---\n<yaml>---\n<body>` envelope and the
// foreign-preserving write. Foreign frontmatter (plugin/unmodeled keys) AND comments survive
// a save because the ORIGINAL frontmatter parses into a yaml Document and only `set`/`delete`
// touches the modeled keys — the object is never reconstructed.

import {
  type Document,
  type Pair,
  type ParsedNode,
  parseDocument,
  isMap,
  isScalar,
  isSeq,
} from 'yaml'
import { readFile } from 'node:fs/promises'
import { atomicWriteFile } from './atomicWrite'

export interface PageEnvelope {
  /** Raw frontmatter YAML (between the fences, no trailing fence). */
  frontmatter: string
  /** Markdown body (the single separator blank line is stripped). */
  body: string
}

/** Split raw file content into its frontmatter YAML + body. Lenient: no opening
 *  fence ⇒ all body; an unterminated fence ⇒ all body (mirrors the read engine). */
export function splitEnvelope(content: string): PageEnvelope {
  if (!content.startsWith('---')) return { frontmatter: '', body: content }
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/)
  if (!m) return { frontmatter: '', body: content }
  const body = content.slice(m[0].length).replace(/^\r?\n/, '') // strip one separator line
  return { frontmatter: m[1], body }
}

/** Parse the file's frontmatter into a plain object — for reading modeled fields (id, cover) before
 *  a merge. Unrecoverable YAML reads as empty, the same answer the walk's reader gives: a file
 *  nobody can parse holds no fields, and one such page must never fail the pass around it. */
export function readFrontmatterFields(content: string): Record<string, unknown> {
  try {
    const obj = parseDocument(splitEnvelope(content).frontmatter).toJSON()
    return obj && typeof obj === 'object' ? (obj as Record<string, unknown>) : {}
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

/** Whether a field write can round-trip this file's frontmatter. A sweep asks before it rewrites
 *  a page, so one unparseable file is skipped rather than failing the fan-out around it. */
export function frontmatterWritable(content: string): boolean {
  const doc = parseDocument(splitEnvelope(content).frontmatter)
  return mergeable(doc) && serialized(doc) !== null
}

/** Assemble canonical envelope bytes: `---\n<fm>---\n<body>` (fm must end in \n).
 *  No separator blank line — a note must never open with an empty line under
 *  Obsidian's properties panel. splitEnvelope still strips one legacy separator,
 *  so a body can't round-trip a leading blank line; that's the intended shape. */
export function assembleEnvelope(frontmatterYaml: string, body: string): string {
  const fm = frontmatterYaml.endsWith('\n') ? frontmatterYaml : `${frontmatterYaml}\n`
  return `---\n${fm}---\n${body}`
}

/**
 * Merge modeled fields into the existing file's frontmatter, preserving every
 * foreign key + comment, and reassemble the envelope. For each key in `modeledKeys`:
 * present (and not undefined) in `modeled` ⇒ set; otherwise ⇒ delete. Keys outside
 * `modeledKeys` are never touched. Pure (string → string).
 */
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
  // Empty frontmatter ⇒ contents is null; doc.set auto-creates a block map below.
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

/** What a rename does with a page already holding BOTH keys. The two governed renames commit their
 *  registry at opposite ends of their sweep, and that ordering — not taste — decides which side can
 *  possibly be the fresher, so the policy belongs to the caller and is named at its call site by
 *  the ordering that causes it. */
export type KeyCollision =
  /** The key already wearing the new name wins; the old one drops. */
  | 'prefer-new'
  /** Both value lists survive as one, deduped. */
  | 'merge'

/** One frontmatter key and its value, as the parser produced them. */
type FrontmatterPair = Pair<ParsedNode, ParsedNode | null>

/** Fold the rival key's values in front of the renamed key's own and drop the duplicates. Scalars
 *  compare by value and nothing else counts as a duplicate of anything; two values that aren't both
 *  lists have nothing to fold, so the renamed key's own value stands. */
function foldValues(pair: FrontmatterPair, rival: FrontmatterPair): void {
  const into = pair.value
  const from = rival.value
  if (!isSeq(into) || !isSeq(from)) return
  const held = new Set<unknown>()
  for (const item of from.items) if (isScalar(item)) held.add(item.value)
  into.items = [...from.items, ...into.items.filter((i) => !(isScalar(i) && held.has(i.value)))]
}

/**
 * Rename one frontmatter key where it sits, so the key keeps its position and any comment attached
 * to it — a delete-and-re-add moves the pair to the bottom and destroys the comment.
 *
 * `null` means the file is left alone, and both reasons matter: a page not holding `oldKey` is
 * never rewritten and so never re-dated (a key-only rename is not a content edit), and frontmatter
 * that cannot round-trip is skipped rather than allowed to fail the fan-out around it. Pure.
 */
export function renameFrontmatterKey(
  content: string,
  oldKey: string,
  newKey: string,
  collision: KeyCollision,
): string | null {
  const { frontmatter, body } = splitEnvelope(content)
  // Parsing directly (the only way to reach a key's position and comments) forfeits the lenient
  // reader's recovery, so anything it can't take answers null instead of throwing.
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

/** Read the existing page (if any), merge modeled fields preserving foreign data,
 *  and write back atomically. A missing file starts from empty frontmatter. */
export async function writePageFile(
  absPath: string,
  modeled: Record<string, unknown>,
  modeledKeys: readonly string[],
  body: string,
): Promise<void> {
  let existing = ''
  try {
    existing = await readFile(absPath, 'utf8')
  } catch {
    /* new file — start from empty frontmatter */
  }
  await atomicWriteFile(absPath, mergeFrontmatter(existing, modeled, modeledKeys, body))
}
