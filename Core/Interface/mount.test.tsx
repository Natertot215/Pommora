// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { initNativeCaret } from '@pommora/uix/Theme/nativeCaret'
import { setMenuDoor } from '@pommora/uix/Pickers/PickerControl'
import { popMenu } from '../Actions/menuActions'
import { mountApp } from './mount'

vi.mock('./App', () => ({ App: () => <div data-testid="app" /> }))
vi.mock('@pommora/uix/Theme/nativeCaret', () => ({ initNativeCaret: vi.fn() }))
vi.mock('@pommora/uix/Pickers/PickerControl', () => ({ setMenuDoor: vi.fn() }))

describe('mountApp', () => {
  it('wires the menu door and the drawn caret, then renders the app', async () => {
    const root = document.createElement('div')
    mountApp(root)
    expect(setMenuDoor).toHaveBeenCalledWith(popMenu)
    expect(initNativeCaret).toHaveBeenCalledOnce()
    await vi.waitFor(() => expect(root.querySelector('[data-testid="app"]')).not.toBeNull())
  })
})
