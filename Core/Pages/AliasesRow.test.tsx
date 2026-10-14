// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { AliasesRow } from './AliasesRow'
import { useSession } from '../Session/store'
import { stubDialer } from '../vitest.setup'
import { makeTree } from '../Testing/testTree'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const PAGE = { id: 'p1', path: 'Notes/Alpha.md', title: 'Alpha' }

let host: HTMLDivElement
let root: Root
let mutate: ReturnType<typeof vi.fn>

const treeWith = (aliases: string[]) => makeTree({ pageMetadata: { p1: { aliases } } })

const render = async (
  aliases: string[] = ['the plan', 'Q3 doc'],
  reply: () => unknown = () => ({ ok: true, value: {} }),
): Promise<void> => {
  mutate = vi.fn(async () => reply())
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({ mutate })
  useSession.setState({ tree: treeWith(aliases) })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root.render(<AliasesRow page={PAGE} />))
}

afterEach(async () => {
  await act(async () => root.unmount())
  document.body.innerHTML = ''
})

const byLabel = (label: string): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>(`[aria-label="${label}"]`))
const inputs = (): HTMLInputElement[] =>
  Array.from(document.querySelectorAll<HTMLInputElement>('input[aria-label="Alias"]'))
const manage = async (): Promise<void> => {
  const button = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent === 'Manage',
  ) as HTMLButtonElement
  await act(async () => button.click())
}
const add = async (): Promise<void> => {
  await act(async () => byLabel('Add alias')[0].click())
}
const press = async (input: HTMLInputElement, key: string): Promise<void> => {
  await act(async () => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  })
}
const type = (input: HTMLInputElement, text: string): void => {
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
}
const revealHolding = (text: string): HTMLElement | undefined =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]')).find((r) =>
    r.textContent?.includes(text),
  )
const sent = (edit: unknown): unknown => ({ op: 'editAliases', path: PAGE.path, edit })

describe('AliasesRow', () => {
  it('reads Aliases with the count of held aliases', async () => {
    await render()
    expect(host.textContent).toContain('Aliases')
    expect(host.textContent).toContain('2')
  })

  it('counts one spelling per name and never the title', async () => {
    await render(['the plan', 'The Plan', 'alpha'])
    expect(host.textContent).toContain('1')
    expect(host.textContent).not.toContain('2')
  })

  it('Manage opens a pane with one field per alias', async () => {
    await render()
    await manage()
    expect(byLabel('Alias').length).toBe(2)
  })

  it('+ drafts a focused field, and Enter adds what was typed', async () => {
    await render()
    await manage()
    await add()
    const draft = inputs()[0]
    expect(draft).toBeDefined()
    expect(document.activeElement).toBe(draft)
    type(draft, 'roadmap')
    await press(draft, 'Enter')
    expect(mutate).toHaveBeenCalledWith(sent({ op: 'add', alias: 'roadmap' }))
  })

  it('a written alias keeps the draft’s row', async () => {
    await render(['the plan', 'Q3 doc'], () => {
      useSession.setState({ tree: treeWith(['the plan', 'Q3 doc', 'roadmap']) })
      return { ok: true, value: {} }
    })
    await manage()
    await add()
    const held = document.activeElement?.closest('[data-reveal]')
    expect(held).not.toBeNull()
    const draft = inputs()[0]
    type(draft, 'roadmap')
    await press(draft, 'Enter')
    expect(revealHolding('roadmap')).toBe(held)
    expect(inputs().length).toBe(0)
    expect(byLabel('Alias').length).toBe(3)
  })

  it('a refused add leaves the draft row open', async () => {
    await render(['the plan', 'Q3 doc'], () => ({
      ok: false,
      error: { code: 'io', message: 'refused' },
    }))
    await manage()
    await add()
    const draft = inputs()[0]
    type(draft, 'roadmap')
    await press(draft, 'Enter')
    expect(mutate).toHaveBeenCalled()
    expect(document.querySelectorAll('[data-reveal]').length).toBe(3)
  })

  it('Escape on an empty draft closes it and sends nothing', async () => {
    await render()
    await manage()
    await add()
    await press(inputs()[0], 'Escape')
    expect(document.querySelectorAll('[data-reveal]').length).toBe(2)
    expect(mutate).not.toHaveBeenCalled()
  })

  it('typing the title marks the draft invalid', async () => {
    await render()
    await manage()
    await add()
    const draft = inputs()[0]
    type(draft, 'alpha')
    expect(draft.getAttribute('aria-invalid')).toBe('true')
  })

  it('renaming an alias in place sends a rename', async () => {
    await render()
    await manage()
    await act(async () => byLabel('Alias')[0].click())
    const input = inputs()[0]
    type(input, 'The Plan')
    await press(input, 'Enter')
    expect(mutate).toHaveBeenCalledWith(sent({ op: 'rename', from: 'the plan', to: 'The Plan' }))
  })

  it('Remove alias forgets it', async () => {
    await render()
    await manage()
    await act(async () => byLabel('Remove alias')[1].click())
    expect(mutate).toHaveBeenCalledWith(sent({ op: 'forget', alias: 'Q3 doc' }))
  })
})
