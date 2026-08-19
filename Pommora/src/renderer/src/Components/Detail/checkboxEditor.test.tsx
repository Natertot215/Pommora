// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { CheckboxEditor, type CheckboxLook } from './CheckboxEditor'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

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

const mount = async (
  props: {
    color?: string
    look?: CheckboxLook
    accent?: string
    onSetColor?: (c: string | undefined) => void
    onSetStyle?: (l: CheckboxLook) => void
  } = {},
): Promise<void> => {
  await act(async () => {
    root.render(
      <CheckboxEditor
        color={props.color}
        look={props.look ?? 'checkbox'}
        accent={props.accent}
        onSetColor={props.onSetColor ?? (() => {})}
        onSetStyle={props.onSetStyle ?? (() => {})}
      />,
    )
  })
}

/** A trigger/option/swatch button whose accessible name or text reads exactly `name`, from anywhere
 *  (the PickerMenu portals to document.body). */
const buttonFor = (name: string): HTMLButtonElement => {
  const el = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (b) => b.getAttribute('aria-label') === name || b.textContent === name,
  )
  if (!el) throw new Error(`no button "${name}"`)
  return el
}

/** The color control's swatch — nameless, so it is found by the control's own accessible name. */
const swatchFill = (): string => {
  const el = buttonFor('Color').querySelector('span')
  return (el as HTMLElement).style.getPropertyValue('--sw')
}

describe('CheckboxEditor', () => {
  it('shows Color and Style rows', async () => {
    await mount({ accent: 'cyan' })
    expect(host.textContent).toContain('Color')
    expect(host.textContent).toContain('Style')
  })

  // The control carries no color NAME — the ramp's cells have none. An unset checkbox simply shows
  // what the live accent paints, which is the same thing picking that color would show.
  it('shows the accent in the swatch when unset', async () => {
    await mount({ accent: 'cyan' })
    expect(host.textContent).not.toContain('Accent')
    expect(swatchFill()).toContain('--system-accent')
  })

  it('shows the chosen color in the swatch, unnamed', async () => {
    await mount({ color: 'blue-1', accent: 'cyan' })
    expect(host.textContent).not.toContain('Blue')
    expect(swatchFill()).toBeTruthy()
  })

  it('reflects the current look in the Style trigger', async () => {
    await mount({ look: 'switch' })
    expect(buttonFor('Checkbox style').textContent).toContain('Switch')
  })

  it('toggles the look from the Style row (dual-option control)', async () => {
    const onSetStyle = vi.fn()
    await mount({ look: 'checkbox', onSetStyle })
    // Checkbox/Switch is two options → a toggle: one click flips 'checkbox' to 'switch'.
    await act(async () => buttonFor('Checkbox style').click())
    expect(onSetStyle).toHaveBeenCalledWith('switch')
  })

  it('emits a color key when a new swatch is picked', async () => {
    const onSetColor = vi.fn()
    await mount({ accent: 'cyan', onSetColor })
    await act(async () => buttonFor('Color').click())
    await act(async () => buttonFor('blue-1').click())
    expect(onSetColor).toHaveBeenCalledWith('blue-1')
  })
})
