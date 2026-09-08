import '../UIX/vitest.setup'
import { installMachine } from './Platform/machine'
import type { Dialer } from './Platform/dialer'
import { diskMachine } from './Testing/machines'

installMachine(diskMachine())

/** The dialer a suite installs on the window: its own channel table, dispatched the way the preload dispatches the real one. An unstubbed channel answers undefined rather than throwing. */
export function stubDialer(channels: Record<string, unknown>): Dialer {
  const call = (k: string, ...args: unknown[]): unknown =>
    (channels[k] as ((...a: unknown[]) => unknown) | undefined)?.(...args)
  return {
    ask: (k: string, ...args: unknown[]) => Promise.resolve(call(k, ...args)),
    tell: call,
    on: (k: string, cb: unknown) => (call(k, cb) as (() => void) | undefined) ?? (() => {}),
  } as unknown as Dialer
}
