// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { resting } from '@pommora/uix/Fields/fields.css'
import { AliasesRow } from './AliasesRow'
import { useSession } from '../Session/store'
import { stubDialer } from '../vitest.setup'
import { makeTree } from '../Testing/testTree'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const PAGE = { id: 'p1', path: 'Notes/Alpha.md', title: 'Alpha' }
const TAKEN = { ok: true, value: {} }
const REFUSED = { ok: false, error: { code: 'io', message: 'refused' } }

let host: HTMLDivElement
let root: Root
let mutate: ReturnType<typeof vi.fn>
let menuAnswer: string | null = null

const treeWith = (aliases: string[]) => makeTree({ pageMetadata: { p1: { aliases } } })

const render = async (
  aliases: string[] = ['the plan', 'Q3 doc'],
  reply: () => unknown = () => TAKEN,
): Promise<void> => {
  mutate = vi.fn(async () => reply())
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    mutate,
    menu: async () => ({ ok: true, value: menuAnswer }),
  })
  useSession.setState({ tree: treeWith(aliases) })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root.render(<AliasesRow page={PAGE} />))
}

afterEach(async () => {
  await act(async () => root.unmount())
  document.body.innerHTML = ''
  menuAnswer = null
})

const byLabel = (label: string): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>(`[aria-label="${label}"]`))
const inputs = (): HTMLInputElement[] =>
  Array.from(document.querySelectorAll<HTMLInputElement>('input[aria-label="Alias"]'))
const reveals = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
const revealHolding = (text: string): HTMLElement | undefined =>
  reveals().find((r) => r.textContent === text)
const nameOf = (text: string): HTMLElement =>
  revealHolding(text)?.querySelector(`.${resting}`) as HTMLElement
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
const doubleClick = async (el: HTMLElement): Promise<void> => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, detail: 2 }))
  })
}
const rightClick = async (el: HTMLElement): Promise<void> => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
  })
}
const deleteOf = (text: string): HTMLElement =>
  revealHolding(text)?.querySelector('[aria-label="Delete alias"]') as HTMLElement
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

  it('Manage opens a pane of menu rows, each with its ×, and focuses nothing', async () => {
    await render()
    const before = document.activeElement
    await manage()
    expect(reveals().map((r) => r.textContent)).toEqual(['the plan', 'Q3 doc'])
    expect(byLabel('Delete alias').length).toBe(2)
    expect(document.activeElement).toBe(before)
  })

  it('+ drafts a focused input, and Enter adds what was typed into the draft’s row', async () => {
    await render(['the plan', 'Q3 doc'], () => {
      useSession.setState({ tree: treeWith(['the plan', 'Q3 doc', 'roadmap']) })
      return TAKEN
    })
    await manage()
    await add()
    const draft = inputs()[0]
    expect(document.activeElement).toBe(draft)
    const held = draft.closest('[data-reveal]')
    type(draft, 'roadmap')
    await press(draft, 'Enter')
    expect(mutate).toHaveBeenCalledWith(sent({ op: 'add', alias: 'roadmap' }))
    expect(revealHolding('roadmap')).toBe(held)
    expect(inputs().length).toBe(0)
  })

  it('a refused add leaves the draft open with what was typed', async () => {
    await render(['the plan', 'Q3 doc'], () => REFUSED)
    await manage()
    await add()
    const draft = inputs()[0]
    type(draft, 'roadmap')
    await press(draft, 'Enter')
    expect(mutate).toHaveBeenCalled()
    expect(inputs().map((i) => i.value)).toEqual(['roadmap'])
  })

  it('Escape on an empty draft closes it and sends nothing', async () => {
    await render()
    await manage()
    await add()
    await press(inputs()[0], 'Escape')
    expect(inputs().length).toBe(0)
    expect(reveals().length).toBe(2)
    expect(mutate).not.toHaveBeenCalled()
  })

  it('× on a draft closes it', async () => {
    await render()
    await manage()
    await add()
    const x = inputs()[0].closest('[data-reveal]')?.querySelector('[aria-label="Delete alias"]')
    await act(async () => (x as HTMLElement).click())
    expect(inputs().length).toBe(0)
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

  it('typing a name a link can’t carry marks the draft invalid', async () => {
    await render()
    await manage()
    await add()
    const draft = inputs()[0]
    type(draft, 'a]b')
    expect(draft.getAttribute('aria-invalid')).toBe('true')
  })

  it('a rename onto the title closes the field and sends nothing, the row reading its name throughout', async () => {
    await render()
    await manage()
    await doubleClick(nameOf('the plan'))
    const row = inputs()[0].closest('[data-reveal]') as HTMLElement
    const seen: string[] = []
    const watch = new MutationObserver(() => {
      if (!row.querySelector('input')) seen.push(row.textContent ?? '')
    })
    watch.observe(row, { subtree: true, childList: true, characterData: true })
    type(inputs()[0], 'ALPHA')
    await press(inputs()[0], 'Enter')
    watch.disconnect()
    expect(mutate).not.toHaveBeenCalled()
    expect(inputs().length).toBe(0)
    expect(seen.every((t) => t === 'the plan')).toBe(true)
    expect(reveals()[0].textContent).toBe('the plan')
  })

  it('a single click opens nothing; a double-click renames in place, holding the new name until it lands', async () => {
    let answer!: (r: unknown) => void
    await render(['the plan', 'Q3 doc'], () => new Promise((r) => (answer = r)))
    await manage()
    await act(async () => nameOf('the plan').click())
    expect(inputs().length).toBe(0)
    expect(mutate).not.toHaveBeenCalled()
    await doubleClick(nameOf('the plan'))
    const input = inputs()[0]
    expect(input.value).toBe('the plan')
    type(input, 'The Plan')
    await press(input, 'Enter')
    expect(mutate).toHaveBeenCalledWith(sent({ op: 'rename', from: 'the plan', to: 'The Plan' }))
    expect(reveals()[0].textContent).toBe('The Plan')
    await act(async () => answer(REFUSED))
    expect(reveals()[0].textContent).toBe('the plan')
  })

  it('opening a second rename commits the first and leaves the second open', async () => {
    await render()
    await manage()
    await doubleClick(nameOf('the plan'))
    type(inputs()[0], 'The Plan')
    await doubleClick(nameOf('Q3 doc'))
    expect(mutate).toHaveBeenCalledWith(sent({ op: 'rename', from: 'the plan', to: 'The Plan' }))
    expect(inputs().map((i) => i.value)).toEqual(['Q3 doc'])
  })

  it('Delete alias forgets it, and on the row being renamed closes its input', async () => {
    await render()
    await manage()
    await act(async () => deleteOf('Q3 doc').click())
    expect(mutate).toHaveBeenCalledWith(sent({ op: 'forget', alias: 'Q3 doc' }))
    await doubleClick(nameOf('the plan'))
    const x = inputs()[0].closest('[data-reveal]')?.querySelector('[aria-label="Delete alias"]')
    await act(async () => (x as HTMLElement).click())
    expect(mutate).toHaveBeenCalledWith(sent({ op: 'forget', alias: 'the plan' }))
    expect(inputs().length).toBe(0)
  })

  it('the row menu’s Rename opens the input, and its Delete forgets', async () => {
    await render()
    await manage()
    menuAnswer = 'rename'
    await rightClick(nameOf('Q3 doc'))
    expect(inputs().map((i) => i.value)).toEqual(['Q3 doc'])
    await press(inputs()[0], 'Escape')
    menuAnswer = 'delete'
    await rightClick(nameOf('Q3 doc'))
    expect(mutate).toHaveBeenCalledWith(sent({ op: 'forget', alias: 'Q3 doc' }))
  })
})
