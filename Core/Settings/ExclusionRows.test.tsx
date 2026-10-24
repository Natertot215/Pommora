// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ExcludedDirectoriesRow } from './ExcludedDirectoriesRow'
import { shield } from '@pommora/uix/Pickers/picker-base.css'
import { useSession } from '../Session/store'
import { stubDialer } from '../vitest.setup'
import { FRAMES } from './frames'
import { fault, ok } from '../Contract/result'
import { clearNotification, currentNotification } from '../Interface/Notifications/notifications'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
let exclusionsSet: ReturnType<typeof vi.fn>

const render = async (excluded: string[]): Promise<void> => {
  exclusionsSet = vi.fn(async () => ({ ok: true, value: excluded }))
  useSession.setState({ tree: { config: { excluded } } as never })
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'exclusions:set': exclusionsSet,
    'exclusions:choose': vi.fn(async () => ({ ok: true, value: 'Picked' })),
  })
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
const addButton = (): HTMLElement | undefined => byLabel('Add exclusion')[0]
const fieldButtons = (): HTMLElement[] => byLabel('Excluded folder')

describe('ExcludedDirectoriesRow', () => {
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

  it('the add button appends a blank field row', async () => {
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
    await act(async () => {
      useSession.setState({ tree: { config: { excluded: ['Archive', 'Renamed'] } } as never })
    })
    expect(fieldButtons().length).toBe(3)
  })

  it('the remove control writes the list without that entry', async () => {
    await render(['Archive', 'Vault A'])
    await act(async () => manageButton().click())
    const removes = byLabel('Remove exclusion')
    expect(removes.length).toBe(2)
    await act(async () => removes[0].click())
    expect(exclusionsSet).toHaveBeenCalledWith(['Vault A'])
  })

  it("a × press keeps the field's focus", async () => {
    await render(['Archive'])
    await act(async () => manageButton().click())
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    byLabel('Remove exclusion')[0].dispatchEvent(press)
    expect(press.defaultPrevented).toBe(true)
  })

  it("renaming a folder keeps its row's node", async () => {
    await render(['Archive', 'Vault A'])
    await act(async () => manageButton().click())
    const revealHolding = (text: string): HTMLElement | undefined =>
      Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]')).find((r) =>
        r.textContent?.includes(text),
      )
    const before = revealHolding('Archive')
    expect(before).toBeDefined()
    await act(async () => fieldButtons()[0].click())
    const input = document.querySelector('input') as HTMLInputElement
    input.value = 'Renamed'
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    await act(async () => {
      useSession.setState({ tree: { config: { excluded: ['Renamed', 'Vault A'] } } as never })
    })
    expect(revealHolding('Renamed')).toBe(before)
  })

  it('a refused draft naming a held folder keeps its row and leaves the held row alone', async () => {
    await render(['Archive'])
    exclusionsSet.mockResolvedValue({ ok: false, error: { kind: 'invalid', message: 'refused' } })
    await act(async () => manageButton().click())
    const revealHolding = (text: string): HTMLElement | undefined =>
      Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]')).find((r) =>
        r.textContent?.includes(text),
      )
    const held = revealHolding('Archive')
    await act(async () => addButton()?.click())
    await act(async () => fieldButtons()[1].click())
    const input = document.querySelector('input') as HTMLInputElement
    input.value = 'Archive'
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(exclusionsSet).toHaveBeenCalledWith(['Archive', 'Archive'])
    expect(revealHolding('Archive')).toBe(held)
    expect(fieldButtons().length).toBe(2)
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
    expect(exclusionsSet).toHaveBeenCalledWith(['Renamed', 'Vault A'])
  })
})

describe('Clear Exclusion Cache', () => {
  const clearRow = (): (() => Promise<boolean>) => {
    for (const frame of FRAMES)
      for (const section of frame.sections ?? [])
        for (const row of section.rows)
          if (row.kind === 'clear' && row.label === 'Clear Exclusion Cache') return row.clear
    throw new Error('no Clear Exclusion Cache row')
  }

  it('a clear that skipped a page offers Try Again, which clears again without asking', async () => {
    const cleared = vi
      .fn()
      .mockResolvedValueOnce(fault('Couldn’t update 1 Item.'))
      .mockResolvedValueOnce(ok({ pages: 1, sidecars: 0 }))
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({ 'exclusions:clear': cleared })
    useSession.setState({ tree: { config: { excluded: ['Archive'] } } as never })
    const running = clearRow()()
    await act(async () => {
      await Promise.resolve()
    })
    act(() => useSession.getState().pendingConfirm?.settle(true))
    expect(await running).toBe(false)
    const notice = currentNotification()
    expect([notice?.message, notice?.action?.label]).toEqual([
      'Couldn’t update 1 Item.',
      'Try Again',
    ])
    await act(async () => {
      await notice?.action?.run()
    })
    expect(cleared).toHaveBeenCalledTimes(2)
    expect(useSession.getState().pendingConfirm).toBeNull()
    clearNotification()
  })
})
