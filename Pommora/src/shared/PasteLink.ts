// What a pasted URL becomes. Pure: a clipboard string, the selection, the two settings and the
// chord in; the text to insert out. Split from the editor's paste handler because the same answer
// has to serve two editors — the page body and a table cell each build their own EditorView — and
// because a decision this branchy is worth exercising without fabricating clipboard events.

import { isValidLink } from './links'
import { linkDisplayText, serializeLink } from './linkValue'
import type { LinkDisplay } from './properties'

export interface PasteInput {
  clipboard: string
  /** Empty when the caret is bare. */
  selectionText: string
  autoFormat: boolean
  pasteIntoText: boolean
  /** The inverse chord was used, so whichever axis applies does the opposite of its setting. */
  inverse: boolean
  format: LinkDisplay
  /** A page title already in the cache. Absent means Page Title has to ask for one. */
  title?: string
}

/** A link a paste should be written as, rather than the text it arrived as. */
export interface LinkPaste {
  kind: 'link'
  text: string
  /** The address the link points at, for a title fetch to resolve against. */
  target: string
  /** Whether the label is standing in until a page title arrives. */
  wantsTitle: boolean
}

export type PasteDecision =
  /** Nothing to do — let the editor's own paste run. */
  | { kind: 'literal' }
  | LinkPaste

const LITERAL: PasteDecision = { kind: 'literal' }

/** The address a paste may format, or null.
 *
 *  Deliberately stricter than `isValidLink`, which asks whether something *would open* and therefore
 *  says yes to `App.tsx`, `readme.md` and `3.14` — all of them things a person copies constantly and
 *  none of them an address. A paste has to ask the different question of whether the user copied an
 *  address at all, and an explicit scheme is what answers it. Paste As uses the looser test, because
 *  there the user picked the form by hand. */
export function pastedUrl(clipboard: string): string | null {
  const s = clipboard.trim()
  // One token, so a pasted document holding an address among prose stays a document.
  if (!s || /\s/.test(s)) return null
  if (!/^https?:\/\//i.test(s)) return null
  return isValidLink(s) ? s : null
}

const link = (text: string, target: string, wantsTitle = false): LinkPaste => ({
  kind: 'link',
  text,
  target,
  wantsTitle,
})

/** The markdown a link takes in a given form. The editor's deferred title rewrite composes the same
 *  two steps against the same link once its fetch lands, and reads them here rather than spelling
 *  the shape out again — a paste and its swap-in can never disagree about the form.
 *
 *  The property codec's serializer does the writing, so a label carrying `]` or `\` is escaped
 *  exactly once and in exactly one place. */
export function linkMarkdown(url: string, display: LinkDisplay, title?: string): string {
  return serializeLink({ url, alias: linkDisplayText(url, display, title) })
}

/** The link an address becomes in a given form: its markdown, and whether the label is only standing
 *  in until a fetched title arrives. Every writer of a formatted link comes through here — the paste,
 *  the Paste As pick, and the Format rewrite — so none of them can answer either question
 *  differently, and a link waiting on a title is announced the same way however it came to be. */
export function linkPaste(url: string, display: LinkDisplay, title?: string): LinkPaste {
  return link(
    linkMarkdown(url, display, title),
    url,
    display === 'link-title' && title === undefined,
  )
}

export function decidePaste(input: PasteInput): PasteDecision {
  const target = pastedUrl(input.clipboard)
  if (!target) return LITERAL

  // A selection chooses the wrap axis; a bare caret chooses the format axis. The chord inverts
  // whichever one is in play, and only that one.
  const wrappable = input.selectionText !== '' && !/[\r\n]/.test(input.selectionText)
  if (wrappable && (input.inverse ? !input.pasteIntoText : input.pasteIntoText))
    return link(serializeLink({ url: target, alias: input.selectionText }), target)

  // Not wrapping means the selection is simply replaced, which is an ordinary paste at a caret —
  // so it falls through here. The chord is already spent in that case and does not flip again.
  const format = wrappable ? input.autoFormat : input.inverse ? !input.autoFormat : input.autoFormat
  if (!format) return LITERAL

  return linkPaste(target, input.format, input.title)
}
