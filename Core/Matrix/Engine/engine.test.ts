import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { engineGraph, REPO_ROOT } from '../../Testing/engineGraph'

const DIR = 'Core/Matrix/Engine'
// Read from disk, never a fixed list: a new engine file is gated the moment it lands.
const roots = readdirSync(join(REPO_ROOT, DIR))
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
  .map((f) => `${DIR}/${f}`)
const graph = engineGraph(roots)

describe('the Matrix engine', () => {
  it('reaches nothing outside itself but the one UIX leaf', () => {
    expect(graph.files.filter((f) => !f.startsWith(`${DIR}/`))).toEqual(['UIX/Utilities/clamp.ts'])
  })

  it('depends on nothing external', () => {
    expect(graph.externals).toEqual([])
  })

  it('never reaches the DOM', () => {
    for (const f of graph.files.filter((f) => f.startsWith('Core/Matrix/Engine/'))) {
      expect(readFileSync(join(REPO_ROOT, f), 'utf8')).not.toMatch(
        /\b(window|document|globalThis|self|navigator|localStorage|matchMedia|performance|requestAnimationFrame)\b/,
      )
    }
  })
})
