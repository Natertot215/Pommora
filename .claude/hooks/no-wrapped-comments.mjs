#!/usr/bin/env node
// Comments are written as full lines and never wrapped: in TS/TSX a comment is `//`, and the one
// place a block comment is unavoidable — a `{/* */}` inside JSX — it stays on a single line.
// Runs as a PostToolUse hook on the file just written, and as `--scan` over the tracked tree.

import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const CODE = /\.(ts|tsx|js|jsx|mjs|cjs)$/

const offendersIn = (path) => {
  let lines
  try {
    lines = readFileSync(path, 'utf8').split('\n')
  } catch {
    return []
  }
  const found = []
  for (let i = 0; i < lines.length; i++) {
    const opener = lines[i].match(/^\s*(\{\s*)?\/\*/)
    if (!opener || lines[i].slice(opener[0].length).includes('*/')) continue
    found.push({ path, line: i + 1, jsx: Boolean(opener[1]), text: lines[i].trim() })
  }
  return found
}

const describe = (o) =>
  `  ${o.path}:${o.line} — ${o.jsx ? 'JSX comment spans lines; put it on one line: {/* … */}' : 'block comment spans lines; rewrite as // full lines, no wrapping'}\n      ${o.text}`

const RULE =
  'Comments are `//` in TS/TSX, one full line each, with no line-width limit — a long comment is a long line. Block comments are only for `{/* */}` inside JSX, and those stay on one line too.'

if (process.argv[2] === '--scan') {
  const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter((f) => CODE.test(f))
  const offenders = files.flatMap(offendersIn)
  if (offenders.length === 0) process.exit(0)
  console.error(`Wrapped block comment(s):\n${offenders.map(describe).join('\n')}\n\n${RULE}`)
  process.exit(1)
}

const path = JSON.parse(readFileSync(0, 'utf8'))?.tool_input?.file_path
if (!path || !CODE.test(path)) process.exit(0)
const offenders = offendersIn(path)
if (offenders.length === 0) process.exit(0)
console.error(
  `Wrapped block comment(s) written:\n${offenders.map(describe).join('\n')}\n\n${RULE} Fix these before continuing.`,
)
process.exit(2)
