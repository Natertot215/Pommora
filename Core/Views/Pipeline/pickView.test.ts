import { describe, expect, it } from 'vitest'
import type { SetNode } from '../../Nexus/tree'
import { DEFAULT_VIEW_ID } from '../views'
import { pickView } from './pickView'

const set = { kind: 'set', id: 's1', sets: [] } as unknown as SetNode

describe('pickView', () => {
  it('answers the same default view for every container with no saved view', () => {
    const other = { kind: 'set', id: 's2', sets: [] } as unknown as SetNode
    expect(pickView(set)).toBe(pickView(other))
    expect(pickView(set).id).toBe(DEFAULT_VIEW_ID)
  })
})
