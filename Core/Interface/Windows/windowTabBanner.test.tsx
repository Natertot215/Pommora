// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { runWindowBanner, useWindowBannerSeat, windowBannerShown } from './windowTabBanner'
import { useSession } from '../../Session/store'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const Seat = ({ run }: { run: (a: 'edit') => Promise<void> }): null => {
  useWindowBannerSeat(true, run as never)
  return null
}

// The store is the hook's external source, so it is set outside render — a setState during render loops the subscription.
const activate = (tabId: string): void => {
  useSession.setState({ pageWindow: { kind: 'page', tabs: [], activeTabId: tabId } as never })
}

beforeEach(() => {
  useSession.setState({ activateWindowTab: vi.fn() as never })
})

describe('the window tab banner seat', () => {
  it('reads each kind’s own toggle', () => {
    expect(windowBannerShown({ windowPageBanners: true }, 'page')).toBe(true)
    expect(windowBannerShown({ windowPageBanners: true }, 'space')).toBe(false)
    expect(windowBannerShown({}, 'page')).toBe(false)
  })

  it('runs a row on the mounted tab and holds one aimed elsewhere until that tab’s header registers', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const run = vi.fn(() => Promise.resolve())
    activate('t1')
    await act(async () => root.render(<Seat run={run} />))
    runWindowBanner('t1', 'edit')
    expect(run).toHaveBeenCalledWith('edit')

    run.mockClear()
    runWindowBanner('t2', 'edit')
    expect(run).not.toHaveBeenCalled()
    expect(useSession.getState().activateWindowTab).toHaveBeenCalledWith('t2')
    const second = vi.fn(() => Promise.resolve())
    await act(async () => {
      activate('t2')
      root.render(<Seat run={second} />)
    })
    expect(second).toHaveBeenCalledWith('edit')
    await act(async () => root.unmount())
    host.remove()
  })
})
