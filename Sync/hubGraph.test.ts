import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const CORE_TYPES = '@pommora/core/Sync/Contract/'

const root = fileURLToPath(new URL('.', import.meta.url))

const sources = readdirSync(root, { recursive: true, encoding: 'utf8' }).filter(
  (entry) =>
    entry.endsWith('.ts') &&
    !entry.endsWith('.test.ts') &&
    !entry.split('/').some((part) => part === 'node_modules' || part === 'Testing') &&
    entry !== 'vitest.config.ts',
)

type Edge = { file: string; spec: string; typeOnly: boolean }

const edges: Edge[] = sources.flatMap((file) => {
  const source = ts.createSourceFile(
    file,
    readFileSync(join(root, file), 'utf8'),
    ts.ScriptTarget.ESNext,
    true,
  )
  return source.statements.flatMap((node): Edge[] => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      return [
        {
          file,
          spec: node.moduleSpecifier.text,
          typeOnly: node.importClause?.isTypeOnly === true,
        },
      ]
    }
    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      return [{ file, spec: node.moduleSpecifier.text, typeOnly: node.isTypeOnly }]
    }
    return []
  })
})

const allowed = (edge: Edge): boolean =>
  edge.spec.startsWith('node:') ||
  (edge.spec.startsWith('.') && edge.spec.endsWith('.ts')) ||
  (edge.spec.startsWith(CORE_TYPES) && edge.typeOnly)

describe('the hub graph', () => {
  it('reaches nothing beyond Node, its own files, and Core types', () => {
    expect(sources.length).toBeGreaterThan(0)
    expect(edges.filter((edge) => !allowed(edge))).toEqual([])
  })
})
