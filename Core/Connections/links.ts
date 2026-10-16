import { HAS_SCHEME } from '../Paths/urlPath'
import { isMarkdownFile, stripMarkdownExt } from '../Paths/posix'

// The label's cap is load-bearing (an alternation under a quantifier backtracks quadratically on a long unclosed `[` run), it may be empty, and it may not open with a raw `^`, which GFM reads as a footnote reference; the writer escapes one. The destination needs a character and admits parentheses nested two deep, what cmark renders.
const LINK_LABEL = '((?!\\^)(?:[^\\]\\\\\\r\\n]|\\\\.){0,255})'
const LINK_DEST = '((?:[^()\\r\\n]|\\((?:[^()\\r\\n]|\\([^()\\r\\n]*\\))*\\)){1,2048})'

export const markdownLinkRegex = (): RegExp =>
  new RegExp(`\\[${LINK_LABEL}\\]\\(${LINK_DEST}\\)`, 'dg')

/** The grammar's one cap for every slot, the markdown label included: 255 characters and no line break; the writer escapes whatever else the label grammar would refuse. */
export const fitsSlot = (s: string): boolean => s.length <= 255 && !/[\r\n]/.test(s)

/** `]` and `\` anywhere, and a `^` opening the label, which GFM would otherwise read as a footnote reference. */
export function escapeLabel(label: string): string {
  return label.replace(/[\\\]]/g, '\\$&').replace(/^\^/, '\\^')
}

export function unescapeLabel(label: string): string {
  return label.replace(/\\(.)/g, '$1')
}

/** Where each escaping `\` sits in a label, by offset: what `unescapeLabel` strips, so a draw hides the same. */
export function labelEscapes(label: string): number[] {
  const at: number[] = []
  for (let i = 0; i < label.length - 1; i++) if (label[i] === '\\') at.push(i++)
  return at
}

/** The one markdown template every writer spells a link through. */
export const markdownLink = (dest: string, label: string): string =>
  `[${escapeLabel(label)}](${dest})`

/** What a markdown link shows when its label is empty, and what a picked link's label defaults to. */
export const defaultLabel = (title: string, heading?: string): string => heading || title

// Only the half before the first opener decides: a scheme or a path separator there addresses something outside the Nexus, while a fragment is a heading's own text.
export const namesPage = (pageHalf: string): boolean =>
  !pageHalf.includes('/') && !HAS_SCHEME.test(pageHalf.trim())

// `encodeURI` leaves parens, colons, and `#` alone; a raw colon declares a target a URL, a lone `(` leaves the link untokenizable, and a raw `#` is where the reader splits the heading off, so all three are escaped on top. A lone surrogate makes encodeURI throw, and the rename cascade calls this unwrapped.
export function encodeLinkTarget(target: string): string {
  try {
    return encodeURI(target)
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/:/g, '%3A')
      .replace(/#/g, '%23')
  } catch {
    return target
  }
}

// `decodeURIComponent` throws on a lone `%`, and CodeMirror deactivates a throwing ViewPlugin.
export function decodeLinkTarget(target: string): string {
  try {
    return decodeURIComponent(target)
  } catch {
    return target
  }
}

// The halves arrive already split by the occurrence, so an encoded `%23` decodes inside the title. An address names no page; a title that decodes to nothing is the page itself when a heading follows, and no page at all otherwise.
export const targetTitle = (titleHalf: string, hasHeading: boolean): string | null => {
  if (!namesPage(titleHalf)) return null
  const decoded = decodeLinkTarget(titleHalf).trim()
  if (!decoded) return hasHeading ? '' : null
  return stripMarkdownExt(decoded)
}

export const targetNamesFile = (titleHalf: string): boolean =>
  namesPage(titleHalf) && isMarkdownFile(decodeLinkTarget(titleHalf))

export const targetFragment = (headingHalf: string): string => decodeLinkTarget(headingHalf).trim()
