import { readFileSync, statSync } from 'node:fs'
import { dirname, join, posix, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

export interface EngineGraph {
  files: string[]
  externals: string[]
}

export function importSpecifiers(text: string, filename = 'scan.tsx'): string[] {
  const kind = filename.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const source = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, false, kind)
  const found = new Set<string>()
  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      found.add(node.moduleSpecifier.text)
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      found.add(node.arguments[0].text)
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    ) {
      found.add(node.argument.literal.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return [...found]
}

export function packageName(spec: string): string {
  const parts = spec.split('/')
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
}

const isFile = (rel: string): boolean =>
  statSync(join(REPO_ROOT, rel), { throwIfNoEntry: false })?.isFile() ?? false

function toBase(fromFileRel: string, spec: string): string | null {
  if (spec.startsWith('@pommora/core/'))
    return posix.join('Core', spec.slice('@pommora/core/'.length))
  if (spec.startsWith('@pommora/uix/')) return posix.join('UIX', spec.slice('@pommora/uix/'.length))
  if (spec.startsWith('.')) return posix.join(posix.dirname(fromFileRel), spec)
  return null
}

export function engineGraph(roots: string[]): EngineGraph {
  const files = new Set<string>()
  const externals = new Set<string>()
  const queue: string[] = []

  const resolveBase = (base: string): string | null => {
    const candidates = [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      `${base}.css.ts`,
      `${base}/index.ts`,
      `${base}/index.tsx`,
    ]
    for (const c of candidates) if (isFile(c)) return c
    return null
  }

  const enqueue = (rel: string): void => {
    if (!files.has(rel)) {
      files.add(rel)
      queue.push(rel)
    }
  }

  for (const root of roots) {
    const resolved = resolveBase(root)
    if (!resolved) throw new Error(`engine root not found: ${join(REPO_ROOT, root)}`)
    enqueue(resolved)
  }

  while (queue.length) {
    const rel = queue.shift() as string
    for (const spec of importSpecifiers(readFileSync(join(REPO_ROOT, rel), 'utf8'), rel)) {
      const base = toBase(rel, spec)
      if (base === null) {
        externals.add(packageName(spec))
        continue
      }
      const resolved = resolveBase(base)
      if (resolved) enqueue(resolved)
      else externals.add(spec)
    }
  }

  return { files: [...files].sort(), externals: [...externals].sort() }
}
