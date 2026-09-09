import { describe, expect, it } from 'vitest'
import { engineGraph } from '../Testing/engineGraph'

const graph = engineGraph(['Core/Contract/serve.ts'])

describe('the engine graph from serve.ts', () => {
  it('reaches no renderer file', () => {
    expect(graph.files.filter((f) => f.endsWith('.tsx') || f.endsWith('.css.ts'))).toEqual([])
  })

  it('depends on nothing outside the engine allowlist', () => {
    expect(graph.externals).toEqual(['ulidx', 'yaml', 'zod'])
  })

  it('reaches exactly the pure UIX leaves', () => {
    expect(graph.files.filter((f) => f.startsWith('UIX/'))).toEqual([
      'UIX/Interactions/chords.ts',
      'UIX/Theme/colors.ts',
      'UIX/Utilities/clamp.ts',
      'UIX/Utilities/moveItem.ts',
    ])
  })
})
