import '../UIX/vitest.setup'
import { installMachine } from './Platform/machine'
import { fail } from './Contract/result'
import type { Dialer } from './Platform/dialer'
import { diskMachine } from './Testing/machines'

installMachine(diskMachine())

/** The dialer a suite installs on the window: its own channel table, dispatched the way the preload dispatches the real one. An unstubbed `ask` answers a failure `Result` the way a refusing handler would, so a reader of `r.ok` takes its failure path. */
export function stubDialer(channels: Record<string, unknown>): Dialer {
  const call = (k: string, ...args: unknown[]): unknown =>
    (channels[k] as ((...a: unknown[]) => unknown) | undefined)?.(...args)
  return {
    ask: (k: string, ...args: unknown[]) =>
      Promise.resolve(k in channels ? call(k, ...args) : fail('not-found', `${k} is not stubbed.`)),
    tell: call,
    on: (k: string, cb: unknown) => (call(k, cb) as (() => void) | undefined) ?? (() => {}),
  } as unknown as Dialer
}
