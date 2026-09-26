// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ModalScrim } from './ModalScrim'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

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

const Modal = ({ open }: { open: boolean }): React.JSX.Element => (
  <>
    <button type="button" id="behind" />
    <ModalScrim open={open} dismiss={() => undefined}>
      <button type="button" id="cancel" />
      <button type="button" id="action" />
    </ModalScrim>
  </>
)

const byId = (id: string): HTMLElement => document.getElementById(id) as HTMLElement

describe('the modal scrim keeps the keyboard until it closes', () => {
  it('takes focus on its frame, not its first button, and returns it on close', () => {
    act(() => root.render(<Modal open={false} />))
    byId('behind').focus()
    act(() => root.render(<Modal open />))
    expect(document.activeElement).toBe(byId('cancel').parentElement)
    act(() => root.render(<Modal open={false} />))
    expect(document.activeElement).toBe(byId('behind'))
  })

  it('wraps Tab from the last button to the first', () => {
    act(() => root.render(<Modal open />))
    byId('action').focus()
    act(() => {
      byId('action').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
      )
    })
    expect(document.activeElement).toBe(byId('cancel'))
  })
})
