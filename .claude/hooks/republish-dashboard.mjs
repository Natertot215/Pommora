#!/usr/bin/env node
// PostToolUse(Bash) hook: when a built dashboard page has moved past what was last published, ask
// Claude to republish it.
//
// A shell hook can't reach the Artifact publish API, so an artifact only refreshes when the
// session republishes it. The post-commit git hook rebuilds both pages on every commit; this one
// compares each build against the hash recorded at its last republish and puts a one-line
// republish instruction in front of Claude, so the artifacts track the local build through a
// working session. The records live inside the git dir, where they are untracked by construction
// and shared by every session working in this clone.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const PAGES = [
  {
    name: 'dashboard',
    page: 'Dashboard/dist/dashboard.html',
    url: 'https://claude.ai/code/artifact/7840fc59-41d5-4692-b5b6-c45de4d11401',
  },
  {
    name: 'showcase',
    page: 'Dashboard/dist/showcase.html',
    url: 'https://claude.ai/code/artifact/684b7af1-55b2-49cf-b2fa-1b3a6b15dd9c',
  },
]

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
  let gitDir = ''
  try {
    gitDir = execFileSync('git', ['rev-parse', '--absolute-git-dir'], {
      cwd: root,
      encoding: 'utf8',
    }).trim()
  } catch {
    process.exit(0)
  }

  const stale = PAGES.filter(({ name, page }) => {
    let hash = ''
    try {
      hash = execFileSync('git', ['hash-object', page], { cwd: root, encoding: 'utf8' }).trim()
    } catch {
      return false
    }
    const stamp = join(gitDir, `${name}-published`)
    let published = ''
    try {
      published = readFileSync(stamp, 'utf8').trim()
    } catch {
      published = ''
    }
    if (published === hash) return false
    try {
      writeFileSync(stamp, `${hash}\n`)
    } catch {
      // An unrecorded republish only costs a repeated instruction on the next commit.
    }
    return true
  })
  if (stale.length === 0) process.exit(0)

  const steps = stale
    .map(({ page, url }) => `read ${url} first, then publish ${page} to that same url`)
    .join('; ')
  const additionalContext =
    `The Pommora ${stale.map((p) => p.name).join(' and ')} build has moved past the version ` +
    `published to its artifact, so the hosted page is now stale. Silently republish via the ` +
    `Artifact tool so the hosted page matches: ${steps}. Do this as a background chore — do not ` +
    `announce it, describe it, or paste an artifact link in your reply; say nothing about it ` +
    `unless a republish fails.`
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext },
      suppressOutput: true,
    }),
  )
  process.exit(0)
})
