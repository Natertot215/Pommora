import infoIndex from './InfoIndex.md?raw'

const ENTRY = /^<([a-z0-9]+(?:-[a-z0-9]+)*)>[ \t]*\r?\n([\s\S]*?)\r?\n<\/\1>[ \t]*$/gm

/** An InfoIndex's entries by ID: each a tag line naming the ID, its Markdown, and the closing tag line; headings and anything between entries are the file's own. */
export const parseInfoIndex = (text: string): Map<string, string> =>
  new Map([...text.matchAll(ENTRY)].map(([, id, body]) => [id, body.trim()]))

/** The InfoIndex's entries, read once when the module loads. */
export const ENTRIES = parseInfoIndex(infoIndex)
