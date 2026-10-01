import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import { openPage } from './pageFile'
import { ID_KEY, markId } from '../Nexus/identityMark'

const PAGE_A = '01KVGMT8BFP350FZZXAMG1QDRC'
const TASK = markId(PAGE_A, 'task')
const DIR = 'Vault A/Collection A'
const REFUSAL = 'That page has no ID Pommora can file.'

let root: string

beforeAll(() => {
  root = tempRoot('pom-page-')
  mkdirSync(join(root, DIR), { recursive: true })
  const w = (name: string, c: string): void => writeFileSync(join(root, DIR, name), c)
  w(
    'Page A.md',
    `---\n${ID_KEY}: ${PAGE_A}\nicon: star\ntags:\n  - x\n  - y\n---\n# Heading\n\nbody text\n`,
  )
  w('Foreign.md', `---\n${ID_KEY}: 42\n---\nbody\n`)
  w('Task.md', `---\n${ID_KEY}: ${TASK}\n---\nbody\n`)
  w('Plain.md', '# just markdown\n\nno frontmatter')
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

const refusalOf = async (name: string): Promise<string | null> => {
  const r = await openPage(root, `${DIR}/${name}`)
  return r.ok ? null : r.error.message
}

describe('openPage', () => {
  it('opens a member, deriving title + path from the rel path', async () => {
    const r = await openPage(root, `${DIR}/Page A.md`)
    if (!r.ok) throw new Error(r.error.message)
    expect(r.value.id).toBe(PAGE_A)
    expect(r.value.title).toBe('Page A')
    expect(r.value.path).toBe(`${DIR}/Page A.md`)
    expect(r.value.frontmatter).toEqual({ [ID_KEY]: PAGE_A, icon: 'star', tags: ['x', 'y'] })
    expect(r.value.body).toBe('# Heading\n\nbody text\n')
  })

  it('refuses a foreign ID', async () => {
    expect(await refusalOf('Foreign.md')).toBe(REFUSAL)
  })

  it("refuses a Task's ID", async () => {
    expect(await refusalOf('Task.md')).toBe(REFUSAL)
  })

  it('refuses a page with no ID', async () => {
    expect(await refusalOf('Plain.md')).toBe(REFUSAL)
  })

  it('answers not-found when the file does not exist', async () => {
    const r = await openPage(root, `${DIR}/Nope.md`)
    expect(r.ok ? null : r.error.code).toBe('not-found')
  })
})
