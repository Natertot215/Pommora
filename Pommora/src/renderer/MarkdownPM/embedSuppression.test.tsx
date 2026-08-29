// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { buildPageIndex, type ConnectionsApi } from '@renderer/MarkdownPM/Connections'
import {
  cleanupEditor,
  editorContainer,
  mountEditor,
  stubEditorBridge,
} from '@renderer/Testing/editorHarness'

stubEditorBridge()
afterEach(cleanupEditor)

const conn: ConnectionsApi = {
  ...buildPageIndex([{ id: '1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
  open: () => {},
}

const mount = async (initialBody: string): Promise<void> => {
  await mountEditor({ initialBody, connections: conn })
}

const embedSpans = (): string[] =>
  [...editorContainer().querySelectorAll('.md-embed')].map((el) => el.textContent ?? '')

// The claim predicate is shared with the tile field: a claimed line's token stands down (the widget
// owns it), while unresolved, duplicate, and non-lone occurrences keep the dim token — that text IS
// their rendering, including the deleted-target degrade.
describe('claim-gated token suppression', () => {
  it('suppresses the claimed lone-line, keeps the unresolved one', async () => {
    await mount('![[Alpha]]\n\n![[Nowhere]]')
    const spans = embedSpans()
    expect(spans.some((s) => s.includes('Nowhere'))).toBe(true)
    expect(spans.some((s) => s.includes('Alpha'))).toBe(false)
  })

  it('keeps the dim token on a duplicate of a claimed title', async () => {
    await mount('![[Alpha]]\n\ntext\n\n![[Alpha]]')
    expect(embedSpans().filter((s) => s.includes('Alpha'))).toHaveLength(1)
  })

  it('keeps the inline token on a non-lone line', async () => {
    await mount('see ![[Alpha]] here')
    expect(embedSpans().some((s) => s.includes('Alpha'))).toBe(true)
  })
})
