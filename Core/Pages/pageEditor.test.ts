// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { ok } from '@pommora/core/Contract/result'
import { stubDialer } from '../vitest.setup'
import { renameHeading } from './pageEditor'

describe('renameHeading', () => {
  it('asks the cascade channel and rekeys folds, including a numbered duplicate suffix', async () => {
    const cascade = vi.fn(async () => ok({ touched: [] }))
    const foldsSet = vi.fn(async () => ok(null))
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'connections:headingRenamed': cascade,
      'folds:get': async () => ok({ p1: ['Setup', 'Setup 2', 'Setup Notes', 'Other'] }),
      'folds:set': foldsSet,
    })

    await renameHeading('p1', 'Setup', 'Intro')

    expect(cascade).toHaveBeenCalledWith('p1', 'Setup', 'Intro')
    expect(foldsSet).toHaveBeenCalledWith('p1', ['Intro', 'Intro 2', 'Setup Notes', 'Other'])
  })

  it('does nothing to folds when the page has none', async () => {
    const foldsSet = vi.fn(async () => ok(null))
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'connections:headingRenamed': async () => ok({ touched: [] }),
      'folds:get': async () => ok({}),
      'folds:set': foldsSet,
    })

    await renameHeading('p1', 'Setup', 'Intro')

    expect(foldsSet).not.toHaveBeenCalled()
  })

  it('leaves folds alone when nothing named the old heading', async () => {
    const foldsSet = vi.fn(async () => ok(null))
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'connections:headingRenamed': async () => ok({ touched: [] }),
      'folds:get': async () => ok({ p1: ['Other'] }),
      'folds:set': foldsSet,
    })

    await renameHeading('p1', 'Setup', 'Intro')

    expect(foldsSet).not.toHaveBeenCalled()
  })
})
