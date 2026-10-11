// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '../Contract/result'
import { useSession } from '../Session/store'
import { makeTree } from '../Testing/testTree'
import { stubDialer } from '../vitest.setup'
import { openWebLink } from './openWebLink'

const linkOpen = vi.fn(async () => ok(null))

beforeEach(() => {
  linkOpen.mockClear()
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({ 'link:open': linkOpen })
  useSession.setState({
    tree: makeTree({ personalization: { openLinksInApp: true } }),
    browserSummon: null,
  })
})

describe('with Open Links In Pommora on', () => {
  it('sends a mailto: address to the system', () => {
    openWebLink('mailto:a@b.co')
    expect(linkOpen).toHaveBeenCalledExactlyOnceWith('mailto:a@b.co')
    expect(useSession.getState().browserSummon).toBeNull()
  })

  it('summons the browser on a bare address, written out as https', () => {
    openWebLink('example.com')
    expect(useSession.getState().browserSummon?.url).toBe('https://example.com')
    expect(linkOpen).not.toHaveBeenCalled()
  })
})
