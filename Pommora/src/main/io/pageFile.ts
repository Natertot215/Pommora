// The page (.md) file engine. Owns the `---\n<yaml>---\n<body>` envelope and the
// foreign-preserving write. Foreign frontmatter (plugin/unmodeled keys) AND comments survive
// a save because the ORIGINAL frontmatter parses into a yaml Document and only `set`/`delete`
// touches the modeled keys — the object is never reconstructed.

import { parseDocument, isMap } from 'yaml'
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

/** Parse the file's frontmatter into a plain object — for reading modeled fields (id, cover) before a merge. */
export function readFrontmatterFields(content: string): Record<string, unknown> {
  const obj = parseDocument(splitEnvelope(content).frontmatter).toJSON()
  return obj && typeof obj === 'object' ? (obj as Record<string, unknown>) : {}
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
  // Empty frontmatter ⇒ contents is null; doc.set auto-creates a block map below.
  const doc = parseDocument(frontmatter)
  // Broken frontmatter (parse errors, or a non-map) must never be re-serialized — the yaml
  // doc holds only what the parser recovered, so writing it back destroys the rest. The body
  // still saves with the original frontmatter bytes passed through verbatim (a body-only
  // write governs no key a broken map can lose); a field write refuses instead.
  if (doc.errors.length > 0 || (doc.contents != null && !isMap(doc.contents))) {
    if (modeledKeys.some((k) => k !== 'modified_at')) {
      throw new Error(
        'This page’s frontmatter has a syntax error, so Pommora left it untouched. Fix the frontmatter and try again.',
      )
    }
    return assembleEnvelope(frontmatter, body)
  }

  for (const key of modeledKeys) {
    if (key in modeled && modeled[key] !== undefined) doc.set(key, modeled[key])
    else doc.delete(key)
  }

  const fm = doc.toString({ lineWidth: 0 })
  return assembleEnvelope(fm, body)
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
