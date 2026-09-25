import { describe, expect, it } from 'vitest'
import type { Handlers } from './handlers'
import { ok } from './result'

describe('Handlers — the window sends unknowns', () => {
  it('types every argument unknown, so a handler that trusts the declared type fails to compile', () => {
    // @ts-expect-error text arrives unknown, never as the string the ask declares
    const _trusting: Handlers['clipboard:write'] = (_ctx, text: string) => ok(text ? null : null)
    const narrowing: Handlers['clipboard:write'] = (_ctx, text) =>
      ok(typeof text === 'string' ? null : null)
    expect(narrowing).toBeTypeOf('function')
  })
})
