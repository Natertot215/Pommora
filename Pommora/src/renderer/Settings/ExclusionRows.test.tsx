// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ExcludedDirectoriesRow } from './ExcludedDirectoriesRow'
import { shield } from '@renderer/DesignSystem/Pickers/picker-base.css'
import { useSession } from '../store'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
let setExclusions: ReturnType<typeof vi.fn>

const render = async (excluded: string[]): Promise<void> => {
  setExclusions = vi.fn(async () => ({ ok: true, value: excluded }))
  useSession.setState({
    tree: { excluded } as never,
    setExclusions: setExclusions as never,
  })
  ;(window as unknown as { nexus: unknown }).nexus = {
    chooseExclusion: vi.fn(async () => ({ ok: true, value: 'Picked' })),
  }
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () =>
    root.render(<ExcludedDirectoriesRow label="Excluded Directories" hint="h" />),
  )
}

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

const byLabel = (label: string): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>(`[aria-label="${label}"]`))
const manageButton = (): HTMLButtonElement =>
  Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent === 'Manage',
  ) as HTMLButtonElement
const addButton = (): HTMLButtonElement | undefined =>
  Array.from(document.querySelectorAll('button')).find((b) =>
    b.textContent?.includes('Add Exclusion'),
  )
const fieldButtons = (): HTMLElement[] => byLabel('Excluded folder')

describe('ExcludedDirectoriesRow', () => {
  beforeEach(() => {})

  it('shows the count of excluded folders', async () => {
    await render(['Archive', 'Vault A'])
    expect(host.textContent).toContain('2')
  })

  it('Manage toggles the pane, and a second press closes it', async () => {
    await render(['Archive'])
    expect(addButton()).toBeUndefined()
    await act(async () => manageButton().click())
    expect(addButton()).toBeDefined()
    await act(async () => manageButton().click())
    // The pane rides a Bloom-out exit before it unmounts, so read the trigger's open state.
    expect(manageButton().getAttribute('aria-pressed')).toBe('false')
  })

  it('dismisses on an outside press against the shield', async () => {
    await render(['Archive'])
    await act(async () => manageButton().click())
    const back = document.querySelector<HTMLElement>(`.${shield}`)
    expect(back).not.toBeNull()
    await act(async () =>
      back?.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true })),
    )
    expect(manageButton().getAttribute('aria-pressed')).toBe('false')
  })

  it('closes on Escape', async () => {
    await render(['Archive'])
    await act(async () => manageButton().click())
    expect(addButton()).toBeDefined()
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(manageButton().getAttribute('aria-pressed')).toBe('false')
  })

  it('Add Exclusion appends a blank field row', async () => {
    await render(['Archive'])
    await act(async () => manageButton().click())
    expect(fieldButtons().length).toBe(1)
    await act(async () => addButton()?.click())
    expect(fieldButtons().length).toBe(2)
  })

  it('a blank draft row survives a sibling commit re-rendering from the tree', async () => {
    await render(['Archive'])
    await act(async () => manageButton().click())
    await act(async () => addButton()?.click())
    expect(fieldButtons().length).toBe(2)
    // A sibling commit lands as a fresh tree push; the draft is local state, not tree-derived.
    await act(async () => {
      useSession.setState({ tree: { excluded: ['Archive', 'Renamed'] } as never })
    })
    expect(fieldButtons().length).toBe(3)
  })

  it('the remove control writes the list without that entry', async () => {
    await render(['Archive', 'Vault A'])
    await act(async () => manageButton().click())
    const removes = byLabel('Remove exclusion')
    expect(removes.length).toBe(2)
    await act(async () => removes[0].click())
    // Removal collapses first; the write fires when the fold's transition ends.
    const reveal = document.querySelector<HTMLElement>('[data-reveal]')
    await act(async () => {
      reveal?.dispatchEvent(
        Object.assign(new Event('transitionend', { bubbles: true }), {
          propertyName: 'grid-template-rows',
        }),
      )
    })
    expect(setExclusions).toHaveBeenCalledWith(['Vault A'])
  })

  it('committing a field writes the whole list with that entry replaced', async () => {
    await render(['Archive', 'Vault A'])
    await act(async () => manageButton().click())
    await act(async () => fieldButtons()[0].click())
    const input = document.querySelector('input') as HTMLInputElement
    input.value = 'Renamed'
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(setExclusions).toHaveBeenCalledWith(['Renamed', 'Vault A'])
  })
})
