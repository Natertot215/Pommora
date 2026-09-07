// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import { PropertyPicker, type PickEntry, type PickTarget } from './PropertyPicker'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

const selectDef: PropertyDefinition = {
  id: 'prop_sel',
  name: 'Stage',
  type: 'select',
  select_options: [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
  ],
}
const dateDef: PropertyDefinition = { id: 'prop_d', name: 'Due', type: 'datetime' }
const fileDef: PropertyDefinition = { id: 'prop_f', name: 'Doc', type: 'file' }

const optionsTarget = (): PickTarget => ({ kind: 'options', def: selectDef, current: null })
const datetimeTarget = (): PickTarget => ({ kind: 'datetime', def: dateDef, current: null })
const fileTarget = (): PickTarget => ({ kind: 'file', def: fileDef, current: null })

function Host(props: {
  target?: PickTarget | null
  chooser?: PickEntry[]
  chooserInitial?: string
  anchorX?: number
  onCommit?: (value: unknown, entry?: PickEntry) => void
  onReveal?: (entry: PickEntry) => void
  onDismiss?: () => void
  resolveTarget?: (entry: PickEntry) => PickTarget | null
}): React.JSX.Element {
  const ref = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button ref={ref} type="button" data-id="trigger">
        Trigger
      </button>
      <PropertyPicker
        open
        triggerRef={ref}
        target={props.target ?? null}
        chooser={props.chooser}
        chooserInitial={props.chooserInitial}
        anchorX={props.anchorX}
        onCommit={props.onCommit ?? (() => {})}
        onReveal={props.onReveal}
        onDismiss={props.onDismiss ?? (() => {})}
        resolveTarget={props.resolveTarget}
      />
    </>
  )
}

const rowButton = (name: string): HTMLElement | undefined =>
  [
    ...document.querySelectorAll<HTMLElement>('[data-picker-portal] [role="button"]'),
    ...buttons(),
  ].find((e) => e.textContent?.includes(name))

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const render = async (props: Parameters<typeof Host>[0]): Promise<void> => {
  await act(async () => {
    root.render(<Host {...props} />)
  })
  await act(async () => {})
}

const portal = (): HTMLElement | null => document.querySelector('[data-picker-portal]')
const portalText = (): string =>
  [...document.querySelectorAll('[data-picker-portal]')].map((e) => e.textContent ?? '').join('')
const buttons = (): HTMLButtonElement[] => [
  ...document.querySelectorAll<HTMLButtonElement>('[data-picker-portal] button'),
]
const isCentred = (): boolean =>
  [...document.querySelectorAll<HTMLElement>('[data-picker-portal]')].some((e) =>
    (e.style.transform ?? '').includes('translateX(-50%)'),
  )

describe('PropertyPicker panes', () => {
  it('an options target renders its option chips', async () => {
    await render({ target: optionsTarget() })
    expect(portalText()).toContain('Alpha')
    expect(portalText()).toContain('Beta')
  })

  it('a datetime target renders the calendar, not option chips', async () => {
    await render({ target: datetimeTarget() })
    expect(portal()).toBeTruthy()
    expect(portalText()).not.toContain('Alpha')
    expect(portalText()).toContain('Sun')
    expect(portalText()).toContain('Mon')
  })

  it('a file target renders the file field', async () => {
    await render({ target: fileTarget() })
    expect(portalText()).toContain('Choose a file')
  })

  it('an options target anchored to a click centres its pane (B28)', async () => {
    await render({ target: optionsTarget(), anchorX: 200 })
    expect(isCentred()).toBe(true)
  })

  it('an options target with no click does not centre (B28)', async () => {
    await render({ target: optionsTarget() })
    expect(isCentred()).toBe(false)
  })

  it('a revealOnly chooser entry calls onReveal and never onCommit', async () => {
    const onReveal = vi.fn()
    const onCommit = vi.fn()
    const chooser: PickEntry[] = [
      { id: 'prop_r', name: 'Rank', icon: 'square-dashed', revealOnly: true, drillable: false },
    ]
    await render({ chooser, onReveal, onCommit })
    const row = buttons().find((b) => b.textContent?.includes('Rank'))
    const el =
      row ??
      [...document.querySelectorAll<HTMLElement>('[data-picker-portal] [role="button"]')].find(
        (e) => e.textContent?.includes('Rank'),
      )
    await act(async () => {
      el?.click()
    })
    expect(onReveal).toHaveBeenCalledTimes(1)
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('a revealOnly entry dismisses here; a dependent entry hands back without dismissing (its caller reopens on this mount)', async () => {
    const chooser: PickEntry[] = [
      { id: 'prop_r', name: 'Rank', icon: 'square-dashed', revealOnly: true, drillable: false },
      { id: 'prop_d', name: 'Due', icon: 'square-dashed', revealOnly: false, drillable: false },
    ]
    const revealOnlyDismiss = vi.fn()
    await render({ chooser, onReveal: vi.fn(), onDismiss: revealOnlyDismiss })
    await act(async () => {
      rowButton('Rank')?.click()
    })
    expect(revealOnlyDismiss).toHaveBeenCalledTimes(1)

    const dependentDismiss = vi.fn()
    await act(() => root.unmount())
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await render({ chooser, onReveal: vi.fn(), onDismiss: dependentDismiss })
    await act(async () => {
      rowButton('Due')?.click()
    })
    expect(dependentDismiss).not.toHaveBeenCalled()
  })

  it('a targeted chooser entry slides to its value pane, chooserInitial pre-drills, and onCommit carries the entry', async () => {
    const onCommit = vi.fn()
    const chooser: PickEntry[] = [
      {
        id: 'prop_sel',
        name: 'Stage',
        icon: 'square-dashed',
        revealOnly: false,
        drillable: true,
      },
    ]
    await render({
      chooser,
      chooserInitial: 'prop_sel',
      onCommit,
      resolveTarget: () => optionsTarget(),
    })
    expect(portalText()).toContain('Alpha')
    const alpha = [
      ...document.querySelectorAll<HTMLElement>('[data-picker-portal] [role="button"]'),
    ]
      .concat(buttons())
      .find((b) => b.textContent?.includes('Alpha'))
    await act(async () => {
      alpha?.click()
    })
    expect(onCommit).toHaveBeenCalled()
    expect(onCommit.mock.calls[0]?.[1]).toMatchObject({ id: 'prop_sel' })
  })
})
