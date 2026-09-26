// Pure, so the same decision serves both editors (page body and table cell) and is testable without fabricating clipboard events.

import { isValidLink, WEB_ADDRESS } from '../../Paths/urlPath'
import { linkPaste, serializeLink, type LinkPaste } from '../../Connections/linkValue'
import type { LinkDisplay } from '../../Properties/properties'

export interface PasteInput {
  clipboard: string
  selectionText: string
  pasteIntoText: boolean
  inverse: boolean
  format: LinkDisplay
  /** A cached page title; absent means Page Title has to fetch one. */
  title?: string
}

type PasteDecision = { kind: 'literal' } | LinkPaste

const LITERAL: PasteDecision = { kind: 'literal' }

/** Deliberately stricter than `isValidLink`, which also accepts things like `App.tsx` or `3.14`; a paste requires an explicit scheme. Paste As uses the looser test since there the user picked the form by hand. */
export function pastedUrl(clipboard: string): string | null {
  const s = clipboard.trim()
  // One token, so a pasted document holding an address among prose stays a document.
  if (!s || /\s/.test(s)) return null
  if (!WEB_ADDRESS.test(s)) return null
  return isValidLink(s) ? s : null
}

export function decidePaste(input: PasteInput): PasteDecision {
  const target = pastedUrl(input.clipboard)
  if (!target) return LITERAL

  // A selection chooses the wrap axis; a bare caret chooses the format axis. The chord inverts only whichever axis is in play.
  const wrappable = input.selectionText !== '' && !/[\r\n]/.test(input.selectionText)
  if (wrappable && (input.inverse ? !input.pasteIntoText : input.pasteIntoText))
    return {
      kind: 'link',
      text: serializeLink({ url: target, alias: input.selectionText }),
      target,
      wantsTitle: false,
    }

  // A chord spent choosing the wrap axis does not also flip the format axis.
  if (!wrappable && input.inverse) return LITERAL

  return linkPaste(target, input.format, input.title)
}
