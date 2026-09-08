import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { importSpecifiers, packageName, REPO_ROOT } from './Testing/engineGraph'

const CORE = join(REPO_ROOT, 'Core')

const manifest = JSON.parse(readFileSync(join(CORE, 'package.json'), 'utf8')) as {
  name: string
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
}

const deps = new Set([
  ...Object.keys(manifest.dependencies),
  ...Object.keys(manifest.devDependencies),
])

function scanned(): string[] {
  const configPath = join(CORE, 'tsconfig.src.json')
  const parsed = ts.parseJsonConfigFileContent(
    ts.readConfigFile(configPath, ts.sys.readFile).config,
    ts.sys,
    dirname(configPath),
  )
  const imported = new Set<string>()
  for (const abs of parsed.fileNames) {
    if (!abs.endsWith('.ts') && !abs.endsWith('.tsx')) continue
    for (const spec of importSpecifiers(readFileSync(abs, 'utf8'), abs)) {
      if (spec.startsWith('.')) continue
      const pkg = packageName(spec)
      if (pkg !== manifest.name) imported.add(pkg)
    }
  }
  return [...imported]
}

const imported = scanned()

const declares = (pkg: string): boolean => deps.has(pkg) || deps.has(`@types/${pkg}`)

const undeclared = imported.filter((pkg) => !declares(pkg)).sort()
const unused = [...deps]
  .filter((pkg) => !pkg.startsWith('@types/') && !pkg.startsWith('@pommora/'))
  .filter((pkg) => !imported.includes(pkg))
  .sort()

describe('Core manifest', () => {
  it('declares what it imports and nothing else', () => {
    expect(undeclared).toEqual([])
    expect(unused).toEqual([])
  })
})
