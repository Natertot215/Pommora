// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import type { ConnectionsApi } from '../Links/connectionsApi'
import { buildPageIndex } from '../../Connections/pageIndex'
import {
  cleanupEditor,
  editorContainer,
  mountEditor,
  stubEditorBridge,
} from '../../Testing/editorHarness'

stubEditorBridge()
afterEach(cleanupEditor)

const conn: ConnectionsApi = {
  ...buildPageIndex([{ id: '1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
  open: () => {},
}

const mount = async (initialBody: string): Promise<void> => {
  await mountEditor({ initialBody, connections: conn })
}

const tiles = (): number => editorContainer().querySelectorAll('.mdpm-embed-tile').length
const connections = (status: string): string[] =>
  [...editorContainer().querySelectorAll(`.cm-content .md-connection-${status}`)].map(
    (el) => el.textContent ?? '',
  )

describe('an embed is a connection unless it tiles', () => {
  it('a tile over its line draws no connection, and an unresolved lone embed is a phantom connection', async () => {
    await mount('![[Alpha]]\n\n![[Nowhere]]')
    expect(tiles()).toBe(1)
    expect(connections('resolved')).toEqual([])
    expect(connections('phantom')).toEqual(['Nowhere'])
  })

  it('a duplicate of a tiled title draws as the connection it is', async () => {
    await mount('![[Alpha]]\n\ntext\n\n![[Alpha]]')
    expect(tiles()).toBe(1)
    expect(connections('resolved')).toEqual(['Alpha'])
  })

  it('a mid-line embed and a lone headed one are connections', async () => {
    await mount('see ![[Alpha]] here\n\n![[Alpha#Part]]')
    expect(tiles()).toBe(0)
    expect(connections('resolved')).toEqual(['Alpha', 'Alpha', 'Part'])
  })
})
