import { readFileSync } from 'node:fs'
import { dirname, join, posix, relative } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { engineGraph, importSpecifiers, REPO_ROOT } from '../Core/Testing/engineGraph'

function hostCoreImports(): string[] {
  const configPath = join(REPO_ROOT, 'Desktop/tsconfig.node.json')
  const parsed = ts.parseJsonConfigFileContent(
    ts.readConfigFile(configPath, ts.sys.readFile).config,
    ts.sys,
    dirname(configPath),
  )
  const roots = new Set<string>()
  for (const abs of parsed.fileNames) {
    const rel = relative(REPO_ROOT, abs)
    if (
      rel.endsWith('.test.ts') ||
      rel.endsWith('vitest.setup.ts') ||
      rel.endsWith('vitest.config.ts')
    )
      continue
    for (const spec of importSpecifiers(readFileSync(abs, 'utf8'), abs)) {
      if (spec.startsWith('@pommora/core/'))
        roots.add(posix.join('Core', spec.slice('@pommora/core/'.length)))
    }
  }
  return [...roots]
}

const graph = engineGraph(hostCoreImports())

describe('the host graph from the Desktop Core imports', () => {
  it('the host embeds only engine code', () => {
    expect(graph.files.filter((f) => f.endsWith('.tsx') || f.endsWith('.css.ts'))).toEqual([])
    expect(graph.externals).toEqual(['ulidx', 'yaml', 'zod'])
  })
})
