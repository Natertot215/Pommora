#!/usr/bin/env node
// Verifies the token atlas: every SOURCE-tagged table in .claude/Features must agree with the
// code file(s) its SOURCE line names. A table row's checkable claims are its backticked token
// identifiers (column 2) and its literal values (hex / px / ms / bare numbers in column 3);
// each must appear in the table's source text. Derivation prose ("system-white @ 65%") is not
// checkable and is skipped. Exit 0 = atlas agrees with code; exit 1 = drift, listed per table.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const featuresDir = join(repoRoot, '.claude', 'Features')

const IDENT = /^[A-Za-z0-9_.@'[\]-]+$/
const SKIP_IDENTS = new Set(['token', 'value', '—'])

// The bridge is an implicit source for every `--var` handle — theme-vars republishes the hashed
// tokens under stable names, and color.css.ts holds the few vars authored beside their tokens.
const bridgeText = ['Tokens/theme-vars.css.ts', 'Tokens/color.css.ts']
  .map((f) => readFileSync(join(repoRoot, 'Pommora/src/renderer/DesignSystem', f), 'utf8'))
  .join('\n')

let failures = 0
let tables = 0

for (const doc of readdirSync(featuresDir).filter((f) => f.endsWith('.md'))) {
  const lines = readFileSync(join(featuresDir, doc), 'utf8').split('\n')
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\*\*SOURCE:\*\*\s*(.+)$/)
    if (!m) continue
    tables++
    const sources = [...m[1].matchAll(/`([^`]+)`/g)].map((s) => s[1])
    const missingFiles = sources.filter((s) => !existsSync(join(repoRoot, s)))
    // A SOURCE entry may abbreviate a sibling as `tokens/x.ts` — resolve against the first full path's dir.
    const base = sources.find((s) => existsSync(join(repoRoot, s)))
    const text = sources
      .map((s) => {
        if (existsSync(join(repoRoot, s))) return readFileSync(join(repoRoot, s), 'utf8')
        if (base) {
          const guess = join(repoRoot, base.split('/src/')[0], 'src', 'renderer', 'DesignSystem', s)
          if (existsSync(guess)) {
            missingFiles.splice(missingFiles.indexOf(s), 1)
            return readFileSync(guess, 'utf8')
          }
        }
        return ''
      })
      .join('\n')

    const problems = missingFiles.map((f) => `source file missing: ${f}`)

    // Walk the table that follows (skipping its lead-in prose until the first | row).
    let j = i + 1
    while (j < lines.length && !lines[j].startsWith('|')) {
      if (lines[j].match(/^#|^\*\*SOURCE:/)) break
      j++
    }
    for (; j < lines.length && lines[j].startsWith('|'); j++) {
      const cells = lines[j].split('|').map((c) => c.trim())
      if (cells.length < 4 || cells[2].startsWith('---') || cells[1] === 'Title') continue
      const tokenCell = cells[2]
      const valueCell = cells.slice(3).join(' ')
      for (const [, ident] of tokenCell.matchAll(/`([^`]+)`/g)) {
        for (const piece of ident.split(/\s*[·/]\s*/)) {
          const name = piece
            .replace(/^@property\s+/, '')
            .replace(/[…*]+$/, '')
            .trim()
          if (!name || SKIP_IDENTS.has(name) || !IDENT.test(name)) continue
          const quoted = name.match(/\['([^']+)'\]/)
          const probe = quoted ? quoted[1] : name.includes('.') ? name.split('.').pop() : name
          const haystack = name.startsWith('--') ? text + bridgeText : text
          const generated =
            probe.startsWith('--') &&
            haystack.includes(probe.replace(/-([a-z]+)$/, '-${')) &&
            haystack.includes(probe.slice(probe.lastIndexOf('-') + 1))
          if (probe.length > 2 && !haystack.includes(probe) && !generated)
            problems.push(`token not in source: ${name}`)
        }
      }
      for (const [lit] of valueCell.matchAll(
        /#[0-9A-Fa-f]{6,8}\b|\b\d+(?:\.\d+)?(?:px|ms|s|ch|em)?(?=[\s`·/|]|$)/g,
      )) {
        if (/^\d+(?:\.\d+)?$/.test(lit) && Number(lit) < 8) continue
        const hay = (text + bridgeText).toLowerCase()
        if (!hay.includes(lit.toLowerCase())) {
          const bare = lit.replace(/(px|ms|s|ch|em)$/, '')
          if (!hay.includes(`'${lit.toLowerCase()}'`) && !hay.includes(bare))
            problems.push(`value not in source: ${lit}`)
        }
      }
    }
    if (problems.length) {
      failures++
      console.error(`FAIL ${doc} — table at line ${i + 1} (${sources.join(', ')})`)
      for (const p of [...new Set(problems)]) console.error(`   ${p}`)
    }
  }
}

console.log(
  `${tables} atlas tables checked — ${failures ? `${failures} FAILED` : 'all agree with source'}`,
)
process.exit(failures ? 1 : 0)
