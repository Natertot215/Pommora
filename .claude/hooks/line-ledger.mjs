#!/usr/bin/env node
// PostToolUse(Bash) hook: refresh the line ledger after a commit lands.
//
// Reads the tool payload on stdin, runs only when the command was a `git commit`, and folds the
// new HEAD into loc-history.json + the ledger page (loc.py --update), then re-checks the token
// atlas. Quiet during a rebase or merge replay — those cycle many commits and only the last one's
// numbers survive. Republishing the page to its artifact URL stays a separate, manual step.
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

let raw = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (c) => {
  raw += c
})
process.stdin.on('end', () => {
  let command = ''
  try {
    command = JSON.parse(raw)?.tool_input?.command ?? ''
  } catch {
    process.exit(0)
  }
  if (!/\bgit\s+(?:-[^\s]+\s+)*commit\b/.test(command)) process.exit(0)

  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd()
  const run = (cmd, args) => {
    try {
      return execFileSync(cmd, args, { cwd: root, encoding: 'utf8' }).trim()
    } catch {
      return ''
    }
  }

  const gitDir = run('git', ['rev-parse', '--git-dir'])
  if (
    gitDir &&
    (existsSync(join(gitDir, 'rebase-merge')) ||
      existsSync(join(gitDir, 'rebase-apply')) ||
      existsSync(join(gitDir, 'MERGE_HEAD')))
  ) {
    process.exit(0)
  }

  try {
    execFileSync('python3', [join(root, '.claude/scripts/loc.py'), '--update'], {
      cwd: root,
      stdio: 'inherit',
    })
  } catch {
    console.error('line ledger: skipped (loc.py --update failed)')
  }
  try {
    execFileSync('node', [join(root, '.claude/scripts/check-atlas.mjs')], {
      cwd: root,
      stdio: 'inherit',
    })
  } catch {
    console.error('token ledger: drift above — the Features SOURCE tables disagree with the code')
  }
  process.exit(0)
})
