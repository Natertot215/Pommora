import { describe, expect, it } from 'vitest'
import { createMenuItems, createdRequest } from './createMenu'

const creators = [
  { label: 'New Page', req: { op: 'createPage' as const, parentPath: 'Notes', name: 'Untitled' } },
  {
    label: 'New Set',
    req: {
      op: 'createContainer' as const,
      parentPath: 'Notes',
      kind: 'set' as const,
      name: 'Untitled',
    },
  },
]

describe('the create menu', () => {
  it('names each creator by index, and resolves the index back to its request', () => {
    expect(createMenuItems(creators)).toEqual([
      { label: 'New Page', action: 'create:0' },
      { label: 'New Set', action: 'create:1' },
    ])
    expect(createdRequest(creators, 'create:1')).toBe(creators[1].req)
  })

  it('answers nothing for a pick that is not a create', () => {
    expect(createdRequest(creators, 'rename')).toBeUndefined()
    expect(createdRequest(creators, 'create:7')).toBeUndefined()
  })
})
