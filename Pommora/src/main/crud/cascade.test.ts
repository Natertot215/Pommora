import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { renameCascade } from './cascade'
import { createPage } from './page'
import { splitFrontmatter } from '../readNexus'
import { splitEnvelope } from '../io/pageFile'

let root: string
let dir: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-cascade-'))
  dir = join(root, 'Notes')
  await mkdir(dir, { recursive: true })
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const bodyOf = async (p: string) => splitEnvelope(await readFile(p, 'utf8')).body
const fmOf = async (p: string) => splitFrontmatter(await readFile(p, 'utf8'))

describe('renameCascade', () => {
  it('rewrites inbound links nexus-wide (incl. nested), leaves frontmatter untouched', async () => {
    const a = await createPage(dir, 'A', { body: 'go to [[Target]] now' })
    const b = await createPage(dir, 'B', { body: '[[target]] and [[Other]]' })
    const c = await createPage(dir, 'C', { body: 'no links' })
    const sub = join(dir, 'Collection')
    await mkdir(sub, { recursive: true })
    const nested = await createPage(sub, 'Nested', { body: 'deep [[Target]]' })
    if (!a.ok || !b.ok || !c.ok || !nested.ok) throw new Error('setup failed')

    const before = await fmOf(a.value.path)
    const r = await renameCascade(root, 'Target', 'New Target')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.touched.sort()).toEqual([a.value.path, b.value.path, nested.value.path].sort())

    expect(await bodyOf(a.value.path)).toBe('go to [[New Target]] now')
    expect(await bodyOf(b.value.path)).toBe('[[New Target]] and [[Other]]')
    expect(await bodyOf(nested.value.path)).toBe('deep [[New Target]]')
    expect(await bodyOf(c.value.path)).toBe('no links')

    const after = await fmOf(a.value.path)
    expect(after.id).toBe(a.value.id)
    expect(after.modified_at).toBe(before.modified_at) // derived edit ⇒ no modified bump
  })

  it('touches nothing when no page links the old title', async () => {
    await createPage(dir, 'Solo', { body: 'nothing here' })
    const r = await renameCascade(root, 'Ghost', 'Phantom')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.touched).toEqual([])
  })
})
