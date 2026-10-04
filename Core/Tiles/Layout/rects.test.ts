import { describe, expect, it } from 'vitest'
import { insertBand } from './ops'
import { splitTile } from '../../Testing/tileLayouts'
import { placeTiles } from './rects'

describe('placeTiles', () => {
  it('places a row as shares of the width with the gutters fixed', () => {
    const row = splitTile(insertBand({ bands: [] }, 0, 'a', 200), 'a', 'e', 'b')
    const b = placeTiles(row, 8).tiles.get('b')
    expect(b?.x).toEqual({ share: 0.5, px: 4 })
    expect(b?.w).toEqual({ share: 0.5, px: -4 })
  })
})
