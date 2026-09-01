#!/usr/bin/env node
// PostToolUse(Bash) hook: when a commit moved the line-ledger page, ask Claude to republish it.
//
// A shell hook can't reach the Artifact publish API, so the hosted URL only refreshes when the
// session republishes it. The post-commit git hook keeps the local page current on every commit;
// this one notices when that page actually changed and puts a one-line republish instruction in
// front of Claude, so the artifact stays current through a working session.
import { execFileSync } from 'node:child_process'

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

  // `git diff --quiet` exits 0 when the page is identical between the two commits, non-zero when it
  // moved — so a thrown error (a real change, or no parent) is the signal to republish.
  let moved = true
  try {
    execFileSync('git', ['diff', '--quiet', 'HEAD~1', 'HEAD', '--', PAGE], {
      cwd: root,
      stdio: 'ignore',
    })
    moved = false
  } catch {
    moved = true
  }
  if (!moved) process.exit(0)

  const additionalContext =
    `The Pommora line ledger page (${PAGE}) changed in the commit just made, so its published ` +
    `artifact is now stale. Silently republish it via the Artifact tool so the hosted page ` +
    `matches: read ${URL} first, then publish ${PAGE} to that same url. Do this as a background ` +
    `chore — do not announce it, describe it, or paste the artifact link in your reply; say ` +
    `nothing about the ledger unless the republish fails.`
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext },
      suppressOutput: true,
    }),
  )
  process.exit(0)
})
