import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { renameCascade } from './cascade'
import { encodeLinkTarget } from '@shared/links'

// The arc's acceptance criterion, at the layer that owns the file: a body carrying every form a
// connection can take survives a real rename against real files on disk. Per-task suites prove each
// piece; this proves they still agree once a rename runs through all of them at once.

let root: string
let host: string

const body = (): string =>
  [
    `A connection: [[Q3 Plan]].`,
    `Wearing its own words: [[Q3 Plan|the roadmap]].`,
    `An embed: ![[Q3 Plan]].`,
    `A markdown link: [the roadmap](${encodeLinkTarget('Q3 Plan')}).`,
    `A website that merely ends the same way: [site](https://example.com/Q3%20Plan).`,
    '',
    '| Where | Link |',
    '| --- | --- |',
    // A GFM cell escapes `|`, and `|` is the alias delimiter — so a connection given its own words
    // inside a table reaches the cascade with a backslash sitting where the title ends.
    `| In a cell | [[Q3 Plan\\|the roadmap]] |`,
    `| Unaliased | [[Q3 Plan]] |`,
    '',
    'A sample, not a link:',
    '```',
    '[[Q3 Plan]] and [x](Q3%20Plan)',
    '```',
    '',
  ].join('\n')

const read = async (): Promise<string> => readFile(host, 'utf8')

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'alias-acceptance-'))
  const col = join(root, 'Notes')
  await mkdir(col, { recursive: true })
  await writeFile(join(col, '_pagecollection.json'), JSON.stringify({ id: 'c1', properties: [] }))
  await writeFile(join(col, 'Q3 Plan.md'), '---\nid: p1\n---\ntarget\n')
  host = join(col, 'Host.md')
  await writeFile(host, `---\nid: p2\n---\n${body()}`)
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('a rename reaches every form a connection takes', () => {
  it('moves all three syntaxes and leaves the author’s words alone', async () => {
    const r = await renameCascade(root, 'Q3 Plan', 'Q4 Plan')
    expect(r.ok).toBe(true)
    const after = await read()

    expect(after).toContain('[[Q4 Plan]]')
    expect(after).toContain('![[Q4 Plan]]')
    // The alias and the markdown label are the author's, and a rename changes which page a link
    // points at, never what it says.
    expect(after).toContain('[[Q4 Plan|the roadmap]]')
    expect(after).toContain(`[the roadmap](${encodeLinkTarget('Q4 Plan')})`)
    // Scoped to the live lines: the fenced sample below still holds the old title, on purpose.
    expect(after).not.toContain('A connection: [[Q3 Plan]]')
    expect(after).not.toContain('An embed: ![[Q3 Plan]]')
  })

  it('reaches a connection authored inside a table cell, escape and all', async () => {
    await renameCascade(root, 'Q3 Plan', 'Q4 Plan')
    const after = await read()
    // The escape is re-emitted exactly as it arrived: writing a bare pipe here would split the row
    // into an extra column.
    expect(after).toContain('[[Q4 Plan\\|the roadmap]]')
    expect(after).not.toContain('Q3 Plan\\|')
  })

  it('reads on disk as ordinary percent-encoded Markdown', async () => {
    await renameCascade(root, 'Q3 Plan', 'Q4 Plan')
    expect(await read()).toContain('[the roadmap](Q4%20Plan)')
  })

  it('leaves a website alone even where its last segment collides', async () => {
    await renameCascade(root, 'Q3 Plan', 'Q4 Plan')
    expect(await read()).toContain('[site](https://example.com/Q3%20Plan)')
  })

  it('leaves a fenced sample a sample, in both syntaxes', async () => {
    await renameCascade(root, 'Q3 Plan', 'Q4 Plan')
    const after = await read()
    expect(after).toContain('[[Q3 Plan]] and [x](Q3%20Plan)')
  })

  // A re-encoded target has to remain something the prefilter still recognises, or the SECOND
  // rename of a page silently skips every markdown link that the first one rewrote.
  it('survives a second rename, and a title needing more encoding than the first', async () => {
    await renameCascade(root, 'Q3 Plan', 'Atomic Habits (Book)')
    expect(await read()).toContain(`[the roadmap](${encodeLinkTarget('Atomic Habits (Book)')})`)
    await renameCascade(root, 'Atomic Habits (Book)', 'Plain')
    const after = await read()
    expect(after).toContain('[the roadmap](Plain)')
    expect(after).toContain('[[Plain]]')
    expect(after).toContain('[[Plain|the roadmap]]')
  })

  // rewritePageSerialized calls the rewriter unwrapped, and mutate.ts turns a throw into a REVERTED
  // rename — so one such body would make every rename in the nexus fail with a message naming nothing.
  it('a %-bearing target does not throw the whole rename into a revert', async () => {
    await writeFile(host, `---\nid: p2\n---\nsee [x](Revenue 50% plan) and [[Q3 Plan]] end\n`)
    const r = await renameCascade(root, 'Q3 Plan', 'Q4 Plan')
    expect(r.ok).toBe(true)
    const after = await read()
    expect(after).toContain('[[Q4 Plan]]')
    expect(after).toContain('[x](Revenue 50% plan)')
  })

  it('never rewrites a page that names nothing', async () => {
    const other = join(root, 'Notes', 'Untouched.md')
    await writeFile(other, '---\nid: p3\n---\nnothing here\n')
    const r = await renameCascade(root, 'Q3 Plan', 'Q4 Plan')
    expect(r.ok && r.value.touched.some((p) => p.endsWith('Untouched.md'))).toBe(false)
  })
})
