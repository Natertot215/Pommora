// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { DeviceRecord, SyncState } from '@pommora/core/Sync/Contract/wire'
import { deviceRecord } from '@pommora/core/Testing/fixtures'
import { NexusRows } from './NexusRows'
import { useSession } from '../Session/store'
import { stubDialer } from '../vitest.setup'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

const NEXUS_ID = '01JTESTNEXUSID0000000000AB'

const THIS_DEVICE: DeviceRecord = deviceRecord()
const OTHER: DeviceRecord = deviceRecord({
  id: 'bbbbbbbbbbbbbbbb',
  publicKey: 'pk-b',
  name: 'Studio',
  approved: false,
})

const OFF = { state: 'off' } as const

const unbound: SyncState = { device: THIS_DEVICE, binding: null, status: OFF }
const approved = (devices: DeviceRecord[]): SyncState => ({
  device: THIS_DEVICE,
  binding: { address: 'http://127.0.0.1:7473', state: 'approved', devices },
  status: OFF,
})
const pending: SyncState = {
  device: THIS_DEVICE,
  binding: { address: 'http://127.0.0.1:7473', state: 'pending' },
  status: OFF,
}
const secured: SyncState = {
  device: THIS_DEVICE,
  binding: { address: 'https://hub.example:7473', state: 'pending' },
  status: OFF,
}
const mixed = approved([THIS_DEVICE, OTHER])
const bothApproved = approved([THIS_DEVICE, { ...OTHER, approved: true }])

const reply = (value: SyncState) => vi.fn(async () => ({ ok: true, value }))

const render = async (channels: Record<string, unknown>): Promise<void> => {
  useSession.setState({ tree: { nexus: { id: NEXUS_ID } } as never, syncStatus: null })
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer(channels)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root.render(<NexusRows />))
}

const buttons = (): HTMLButtonElement[] => Array.from(host.querySelectorAll('button'))
const button = (label: string): HTMLButtonElement | undefined =>
  buttons().find((b) => b.textContent === label)

const refuse = (message: string) =>
  vi.fn(async () => ({ ok: false, error: { code: 'operation-failed', message } }))

// A field commits the way it does under the pointer: open it, type into its input, press Enter.
const commit = async (label: string, text: string): Promise<void> => {
  await act(async () => host.querySelector<HTMLElement>(`[aria-label="${label}"]`)?.click())
  const input = host.querySelector('input') as HTMLInputElement
  input.value = text
  await act(async () => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  })
}

const fieldText = (label: string): string =>
  host.querySelector<HTMLElement>(`[aria-label="${label}"]`)?.textContent ?? ''

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

describe('NexusRows', () => {
  it('an unbound state shows this device, the Nexus id, the address field and no list', async () => {
    await render({ 'sync:state': reply(unbound) })
    expect(host.textContent).toContain('This Device')
    expect(host.textContent).toContain('Air')
    expect(host.textContent).not.toContain('aaaaaaaaaaaa')
    expect(host.textContent).toContain(NEXUS_ID)
    expect(host.querySelector('[aria-label="Server address"]')).not.toBeNull()
    expect(button('Connect')).toBeDefined()
    expect(button('Disconnect')).toBeUndefined()
    expect(host.textContent).not.toContain('Studio')
  })

  it('an approved state lists every device, with no control on this device own row', async () => {
    await render({ 'sync:state': reply(mixed) })
    expect(host.textContent).toContain('Approved')
    expect(host.textContent).toContain('Studio')
    expect(host.textContent).toContain('bbbbbbbbbbbb · Pending')
    expect(button('Revoke')).toBeUndefined()
    expect(buttons().filter((b) => b.textContent === 'Approve').length).toBe(1)
  })

  it('an approved device carries Revoke instead', async () => {
    await render({ 'sync:state': reply(bothApproved) })
    expect(button('Revoke')).toBeDefined()
    expect(button('Approve')).toBeUndefined()
  })

  it('Approve asks the channel with that id and re-renders from the reply', async () => {
    const ask = reply(bothApproved)
    await render({ 'sync:state': reply(mixed), 'sync:approve': ask })
    await act(async () => button('Approve')?.click())
    expect(ask).toHaveBeenCalledWith(OTHER.id)
    expect(button('Approve')).toBeUndefined()
    expect(button('Revoke')).toBeDefined()
  })

  it('a pending state shows the caption and no list', async () => {
    await render({ 'sync:state': reply(pending) })
    expect(host.textContent).toContain('Awaiting approval from an approved device')
    expect(host.textContent).not.toContain('Studio')
    expect(button('Connect')).toBeDefined()
    expect(button('Disconnect')).toBeDefined()
  })

  it('Connect asks the channel with the committed address and takes the reply address', async () => {
    const ask = reply(pending)
    await render({ 'sync:state': reply(unbound), 'sync:connect': ask })
    await commit('Server address', 'http://typed:1')
    expect(fieldText('Server address')).toBe('http://typed:1')
    await act(async () => button('Connect')?.click())
    expect(ask).toHaveBeenCalledWith('http://typed:1', undefined, undefined)
    expect(fieldText('Server address')).toBe('http://127.0.0.1:7473')
  })

  it('a refused Connect keeps the draft and reports the message', async () => {
    const show = vi.fn()
    await render({
      'sync:state': reply(unbound),
      'sync:connect': refuse('nope'),
      'error:show': show,
    })
    await commit('Server address', 'http://typed:1')
    await act(async () => button('Connect')?.click())
    expect(show).toHaveBeenCalledWith('nope')
    expect(fieldText('Server address')).toBe('http://typed:1')
  })

  it('Disconnect asks its channel and re-renders from the reply', async () => {
    const ask = reply(unbound)
    await render({ 'sync:state': reply(pending), 'sync:disconnect': ask })
    await act(async () => button('Disconnect')?.click())
    expect(ask).toHaveBeenCalled()
    expect(button('Disconnect')).toBeUndefined()
  })

  it('a committed device name asks the rename channel with the new text', async () => {
    const ask = reply({ ...unbound, device: { ...THIS_DEVICE, name: 'Studio' } })
    await render({ 'sync:state': reply(unbound), 'sync:renameDevice': ask })
    await commit('Device name', 'Studio')
    expect(ask).toHaveBeenCalledWith('Studio')
    expect(host.textContent).toContain('Studio')
  })

  it('a refused state on mount reports nothing and draws nothing', async () => {
    const show = vi.fn()
    await render({ 'sync:state': refuse('no identity'), 'error:show': show })
    expect(show).not.toHaveBeenCalled()
    expect(host.textContent).toBe('')
  })

  it('a nexus switch fetches the state again', async () => {
    const ask = reply(unbound)
    await render({ 'sync:state': ask })
    expect(ask).toHaveBeenCalledTimes(1)
    await act(async () => {
      useSession.setState({ tree: { nexus: { id: 'OTHERNEXUS' } } as never })
    })
    expect(ask).toHaveBeenCalledTimes(2)
    expect(host.textContent).toContain('OTHERNEXUS')
  })

  it('a second action while one is in flight is ignored', async () => {
    const ask = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, value: pending })
      .mockReturnValue(new Promise(() => {}))
    await render({ 'sync:state': ask })
    const refresh = button('Refresh')
    await act(async () => {
      refresh?.click()
      refresh?.click()
    })
    expect(ask).toHaveBeenCalledTimes(2)
  })

  it('shows the password row unbound and hides it once approved', async () => {
    await render({ 'sync:state': reply(unbound), 'sync:connect': reply(bothApproved) })
    expect(host.textContent).toContain('Nexus Password')
    expect(host.textContent).toContain('Not set')
    await act(async () => button('Connect')?.click())
    expect(host.querySelector('[aria-label="Nexus password"]')).toBeNull()
    expect(host.textContent).toContain("Held in this device's keychain")
  })

  it('disables Sync Now while pending', async () => {
    const ask = reply(bothApproved)
    await render({ 'sync:state': reply(pending), 'sync:connect': ask })
    expect(button('Sync Now')?.disabled).toBe(true)
    await act(async () => button('Connect')?.click())
    expect(button('Sync Now')?.disabled).toBe(false)
  })

  it('captions each of the four sync states', async () => {
    await render({ 'sync:state': reply(bothApproved) })
    expect(host.textContent).toContain('Off')
    await act(async () => {
      useSession.setState({ syncStatus: { state: 'idle', lastAt: Date.now() } })
    })
    expect(host.textContent).toMatch(/Last synced \d{1,2}:\d{2}/)
    await act(async () => {
      useSession.setState({ syncStatus: { state: 'syncing' } })
    })
    expect(host.textContent).toContain('Syncing…')
    await act(async () => {
      useSession.setState({ syncStatus: { state: 'error', why: 'hub refused' } })
    })
    expect(host.textContent).toContain('Error: hub refused')
  })

  it('marks a device carrying an agreement key as paired', async () => {
    await render({ 'sync:state': reply(approved([THIS_DEVICE, { ...OTHER, x25519: 'xk' }])) })
    expect(host.textContent).toContain('bbbbbbbbbbbb · Pending · paired')
    expect(host.textContent).toContain('aaaaaaaaaaaa · Approved')
    expect(host.textContent).not.toContain('aaaaaaaaaaaa · Approved · paired')
  })

  it('shows the pin field for an https address', async () => {
    await render({ 'sync:state': reply(secured) })
    expect(host.querySelector('[aria-label="Pin"]')).not.toBeNull()
    await act(async () => root.unmount())
    host.remove()
    await render({ 'sync:state': reply(pending) })
    expect(host.querySelector('[aria-label="Pin"]')).toBeNull()
  })

  it('refreshes the binding once approval arrives by push', async () => {
    const ask = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, value: pending })
      .mockResolvedValue({ ok: true, value: bothApproved })
    await render({ 'sync:state': ask })
    await act(async () => {
      useSession.setState({ syncStatus: { state: 'off', reason: 'pending' } })
    })
    expect(ask).toHaveBeenCalledTimes(1)
    await act(async () => {
      useSession.setState({ syncStatus: { state: 'syncing' } })
    })
    expect(ask).toHaveBeenCalledTimes(2)
    expect(button('Sync Now')?.disabled).toBe(false)
  })

  it('sends the password and the pin with connect and never holds the password', async () => {
    const ask = reply(pending)
    await render({ 'sync:state': reply(secured), 'sync:connect': ask })
    await commit('Nexus password', 'openit')
    await commit('Pin', '4821')
    expect(fieldText('Nexus password')).toBe('••••••••')
    await act(async () => button('Connect')?.click())
    expect(ask).toHaveBeenCalledWith('https://hub.example:7473', 'openit', '4821')
    expect(fieldText('Nexus password')).toBe('Not set')
  })
})
