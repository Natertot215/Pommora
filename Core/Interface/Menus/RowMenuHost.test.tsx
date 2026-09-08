// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useSession } from '../../Session/store'
import { RowMenuHost } from './RowMenuHost'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(<RowMenuHost />))
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const AT = { left: 10, top: 10, height: 20 }
const rows = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-picker-portal] [role="button"]'))

describe('the in-app row menu', () => {
  it('draws the rows it was asked for and resolves the picked action', async () => {
    let promise!: Promise<string | null>
    await act(async () => {
      promise = useSession.getState().presentRowMenu(
        [
          { label: 'Rename', action: 'rename' },
          { label: 'Delete', action: 'delete', separatorBefore: true },
        ],
        AT,
      )
    })
    expect(rows().map((r) => r.textContent)).toEqual(['Rename', 'Delete'])
    await act(async () => {
      rows()[1].click()
    })
    await expect(promise).resolves.toBe('delete')
    expect(useSession.getState().pendingRowMenu).toBeNull()
  })

  it('resolves null once dismissed', async () => {
    let promise!: Promise<string | null>
    await act(async () => {
      promise = useSession.getState().presentRowMenu([{ label: 'Rename', action: 'rename' }], AT)
    })
    await act(async () => {
      useSession.getState().pendingRowMenu?.settle(null)
    })
    await expect(promise).resolves.toBeNull()
    expect(useSession.getState().pendingRowMenu).toBeNull()
  })

  it('drills into a branch and resolves its leaf', async () => {
    let promise!: Promise<string | null>
    await act(async () => {
      promise = useSession.getState().presentRowMenu(
        [
          {
            label: 'Style',
            action: 'style:a',
            submenu: [{ label: 'Bordered', action: 'style:a' }],
          },
        ],
        AT,
      )
    })
    await act(async () => {
      rows()[0].click()
    })
    const leaf = rows().find((r) => r.textContent === 'Bordered')
    expect(leaf).toBeDefined()
    await act(async () => {
      leaf?.click()
    })
    await expect(promise).resolves.toBe('style:a')
  })
})
