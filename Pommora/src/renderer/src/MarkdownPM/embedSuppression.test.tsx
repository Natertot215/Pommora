// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MarkdownEditor } from '@renderer/MarkdownPM'
import { buildPageIndex, type ConnectionsApi } from '@renderer/MarkdownPM/connections'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// A claimed line mounts a real tile whose PageEmbed fetches through the bridge — stub the one
// channel it reads so the widget can settle in jsdom. Reads only; no write channel exists here.
;(window as unknown as { nexus: unknown }).nexus = {
  openPage: async () => ({ ok: true, value: { id: 'x', title: 'Alpha', path: 'Notes/Alpha.md', frontmatter: {}, body: 'inner body' } }),
}

let container: HTMLDivElement
let root: Root

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

const conn: ConnectionsApi = {
  ...buildPageIndex([{ id: '1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
  open: () => {},
}

async function mount(body: string): Promise<void> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(
      createElement(MarkdownEditor, { initialBody: body, onChange: () => {}, connections: conn }),
    )
  })
}

const embedSpans = (): string[] =>
  [...container.querySelectorAll('.md-embed')].map((el) => el.textContent ?? '')

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
