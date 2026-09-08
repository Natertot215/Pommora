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

  it('reaches exactly the three pure UIX utilities', () => {
    expect(graph.files.filter((f) => f.startsWith('UIX/'))).toEqual([
      'UIX/Theme/colors.ts',
      'UIX/Utilities/clamp.ts',
      'UIX/Utilities/moveItem.ts',
    ])
  })
})
