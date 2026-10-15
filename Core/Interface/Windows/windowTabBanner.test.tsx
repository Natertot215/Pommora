// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import {
  renameWindowTitle,
  runWindowBanner,
  useWindowBannerSeat,
  WindowTabContext,
  windowBannerShown,
} from './windowTabBanner'
import { useSession } from '../../Session/store'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

interface SeatProps {
  run: (a: 'edit') => Promise<void>
  rename?: () => void
}
const Header = ({ run, rename }: SeatProps): null => {
  useWindowBannerSeat(true, run as never, rename)
  return null
}
const Seat = ({
  tabId = 't1',
  shown = true,
  ...props
}: SeatProps & { tabId?: string; shown?: boolean }): React.JSX.Element => (
  <WindowTabContext.Provider value={{ tabId, shown }}>
    <Header {...props} />
  </WindowTabContext.Provider>
)

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
    await act(async () => root.render(<Seat run={run} />))
    runWindowBanner('t1', 'edit')
    expect(run).toHaveBeenCalledWith('edit')

    run.mockClear()
    runWindowBanner('t2', 'edit')
    expect(run).not.toHaveBeenCalled()
    expect(useSession.getState().activateWindowTab).toHaveBeenCalledWith('t2')
    const second = vi.fn(() => Promise.resolve())
    await act(async () => root.render(<Seat tabId="t2" run={second} />))
    expect(second).toHaveBeenCalledWith('edit')
    await act(async () => root.unmount())
    host.remove()
  })

  it('takes the active tab’s rename only while its banner draws the title', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const run = vi.fn(() => Promise.resolve())
    const rename = vi.fn()
    await act(async () => root.render(<Seat run={run} />))
    expect(renameWindowTitle('t1')).toBe(false)
    await act(async () => root.render(<Seat run={run} rename={rename} />))
    expect(renameWindowTitle('t2')).toBe(false)
    expect(renameWindowTitle('t1')).toBe(true)
    expect(rename).toHaveBeenCalledOnce()
    await act(async () => root.unmount())
    host.remove()
  })

  it('leaves the seat to the shown tab while a parked one stays mounted', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const run = vi.fn(() => Promise.resolve())
    const shownRename = vi.fn()
    await act(async () =>
      root.render(
        <>
          <Seat tabId="t1" run={run} rename={shownRename} />
          <Seat tabId="t2" shown={false} run={run} />
        </>,
      ),
    )
    expect(renameWindowTitle('t2')).toBe(false)
    expect(renameWindowTitle('t1')).toBe(true)
    expect(shownRename).toHaveBeenCalledOnce()
    await act(async () => root.unmount())
    host.remove()
  })
})
