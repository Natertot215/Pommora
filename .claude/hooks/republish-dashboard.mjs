#!/usr/bin/env node
// PostToolUse(Bash) hook: when a built dashboard page or the data it reads has moved past what was
// last published, ask Claude to republish the page or rewrite the data.
//
// A shell hook can't reach the Artifact API, so an artifact only refreshes through the session. The
// post-commit git hook rebuilds both pages and refreshes the ledger's data on every commit; this one
// compares each build and each data file against the hash recorded at its last publish and puts a
// one-line instruction in front of Claude. The ledger page reads its data from the artifact's
// database, so a commit that only moves the numbers costs one small document write rather than a
// republish of the whole page. The records live inside the git dir, where they are untracked by construction
// and shared by every session working in this clone.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const PAGES = [
  {
    name: 'dashboard',
    page: 'Dashboard/dist/dashboard.html',
    url: 'https://claude.ai/code/artifact/7840fc59-41d5-4692-b5b6-c45de4d11401',
    data: { file: 'Dashboard/Ledger/loc-history.json', collection: 'ledger', doc: 'history' },
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

  const moved = (file, stampName) => {
    let hash = ''
    try {
      hash = execFileSync('git', ['hash-object', file], { cwd: root, encoding: 'utf8' }).trim()
    } catch {
      return false
    }
    const stamp = join(gitDir, stampName)
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
      // An unrecorded publish only costs a repeated instruction on the next commit.
    }
    return true
  }

  const steps = PAGES.flatMap(({ name, page, url, data }) => [
    ...(moved(page, `${name}-published`)
      ? [`read ${url} first, then publish ${page} to that same url`]
      : []),
    ...(data && moved(data.file, `${name}-data-published`)
      ? [
          `write_db to ${url} with db_op "set", collection "${data.collection}", doc_id "${data.doc}", and file_path ${data.file}`,
        ]
      : []),
  ])
  if (steps.length === 0) process.exit(0)

  const additionalContext =
    `A Pommora dashboard artifact has fallen behind the local build, so the hosted page is now ` +
    `stale. Silently bring it current via the Artifact tool: ${steps.join('; ')}. Do this as a ` +
    `background chore — do not announce it, describe it, or paste an artifact link in your reply; ` +
    `say nothing about it unless it fails.`
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext },
      suppressOutput: true,
    }),
  )
  process.exit(0)
})
