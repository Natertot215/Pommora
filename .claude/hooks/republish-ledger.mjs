#!/usr/bin/env node
// PostToolUse(Bash) hook: when the line-ledger page has moved past what was last published, ask
// Claude to republish it.
//
// A shell hook can't reach the Artifact publish API, so the hosted URL only refreshes when the
// session republishes it. The post-commit git hook keeps the local page current on every commit;
// this one compares the page against the hash recorded at the last republish and puts a one-line
// republish instruction in front of Claude, so the artifact stays current through a working
// session. The record lives inside the git dir, where it is untracked by construction and shared
// by every session working in this clone.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
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
  const PAGE = '.claude/scripts/Line-Ledger.html'
  const URL = 'https://claude.ai/code/artifact/7840fc59-41d5-4692-b5b6-c45de4d11401'

  let hash = ''
  let stamp = ''
  try {
    hash = execFileSync('git', ['hash-object', PAGE], { cwd: root, encoding: 'utf8' }).trim()
    const gitDir = execFileSync('git', ['rev-parse', '--absolute-git-dir'], {
      cwd: root,
      encoding: 'utf8',
    }).trim()
    stamp = join(gitDir, 'ledger-published')
  } catch {
    process.exit(0)
  }

  let published = ''
  try {
    published = readFileSync(stamp, 'utf8').trim()
  } catch {
    published = ''
  }
  if (published === hash) process.exit(0)

  try {
    writeFileSync(stamp, `${hash}\n`)
  } catch {
    // An unrecorded republish only costs a repeated instruction on the next commit.
  }

  const additionalContext =
    `The Pommora line ledger page (${PAGE}) has moved past the version published to its artifact, ` +
    `so the hosted page is now stale. Silently republish it via the Artifact tool so the hosted ` +
    `page matches: read ${URL} first, then publish ${PAGE} to that same url. Do this as a ` +
    `background chore — do not announce it, describe it, or paste the artifact link in your ` +
    `reply; say nothing about the ledger unless the republish fails.`
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext },
      suppressOutput: true,
    }),
  )
  process.exit(0)
})
