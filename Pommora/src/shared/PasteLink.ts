// What a pasted URL becomes. Pure, so the same decision serves both editors (page body and table
// cell) and is testable without fabricating clipboard events.

import { isValidLink } from './links'
import { linkDisplayText, serializeLink } from './linkValue'
import type { LinkDisplay } from './properties'

export interface PasteInput {
  clipboard: string
  /** Empty when the caret is bare. */
  selectionText: string
  pasteIntoText: boolean
  /** Inverts whichever axis applies. */
  inverse: boolean
  format: LinkDisplay
  /** A cached page title; absent means Page Title has to fetch one. */
  title?: string
}

export interface LinkPaste {
  kind: 'link'
  text: string
  /** The address a title fetch resolves against. */
  target: string
  /** Whether the label is a placeholder pending a page title. */
  wantsTitle: boolean
}

export type PasteDecision =
  /** Let the editor's own paste run. */
  { kind: 'literal' } | LinkPaste

const LITERAL: PasteDecision = { kind: 'literal' }

/** Deliberately stricter than `isValidLink`, which also accepts things like `App.tsx` or `3.14` that
 *  people copy constantly but aren't addresses; a paste requires an explicit scheme. Paste As uses
 *  the looser test since there the user picked the form by hand. */
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

/** The editor's deferred title rewrite reads this same function once its fetch lands, so a paste and
 *  its swap-in can never disagree about the form. */
export function linkMarkdown(url: string, display: LinkDisplay, title?: string): string {
  return serializeLink({ url, alias: linkDisplayText(url, display, title) })
}

/** Every writer of a formatted link — paste, Paste As, Format rewrite — comes through here, so a
 *  link waiting on a title is announced the same way regardless of how it came to be. */
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
  // only whichever axis is in play.
  const wrappable = input.selectionText !== '' && !/[\r\n]/.test(input.selectionText)
  if (wrappable && (input.inverse ? !input.pasteIntoText : input.pasteIntoText))
    return link(serializeLink({ url: target, alias: input.selectionText }), target)

  // A chord spent choosing the wrap axis does not also flip the format axis.
  if (!wrappable && input.inverse) return LITERAL

  return linkPaste(target, input.format, input.title)
}
