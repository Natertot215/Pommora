// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PropertyDefinition } from '@shared/properties'
import { useSession } from '@renderer/store'
import {
  fileChipIndex,
  fileValueMenu,
  fileValueWithout,
  pickFileInto,
  runFilePick,
} from './filePick'

const def = (over: Partial<PropertyDefinition> = {}): PropertyDefinition =>
  ({ id: 'p', name: 'Attachments', type: 'file', ...over }) as PropertyDefinition

const held = (value: string[]) => ({ kind: 'file', value }) as const

let pickFile: ReturnType<typeof vi.fn>
let adoptFile: ReturnType<typeof vi.fn>
let cellMenu: ReturnType<typeof vi.fn>

beforeEach(() => {
  pickFile = vi.fn(async () => '/outside/New.pdf')
  adoptFile = vi.fn(async () => ({ ok: true, value: '[[New.pdf]]' }))
  cellMenu = vi.fn(async () => null)
  ;(globalThis as { window?: unknown }).window = { nexus: { pickFile, adoptFile, cellMenu } }
  useSession.setState({
    assetMap: { files: { 'old.pdf': ['file-assets/Specs/Old.pdf'] }, version: 1 },
    // A Directory is stored under the asset root, so the root has to be present for the join to
    // be the thing under test rather than a no-op.
    tree: { assetDirectory: 'file-assets' } as never,
  })
})

describe('fileValueWithout', () => {
  it('drops the entry at that position', () => {
    expect(fileValueWithout(held(['[[a]]', '[[b]]']), 0)).toEqual(held(['[[b]]']))
  })

  it('clears the key once nothing is left — never an empty list', () => {
    expect(fileValueWithout(held(['[[a]]']), 0)).toBeNull()
  })

  it('drops the RIGHT one when two entries are identical', () => {
    expect(fileValueWithout(held(['[[a]]', '[[a]]']), 1)).toEqual(held(['[[a]]']))
  })
})

describe('fileChipIndex', () => {
  const at = (html: string, selector: string): Element | null => {
    const host = document.createElement('div')
    host.innerHTML = html
    return host.querySelector(selector)
  }

  it('reads the position off the entry a click landed inside', () => {
    expect(
      fileChipIndex(at('<span data-segment-index="2"><b class="x">Report.pdf</b></span>', '.x')),
    ).toBe(2)
  })

  it('answers null off the value’s own area — which is what makes a click ADD', () => {
    expect(fileChipIndex(null)).toBeNull()
    expect(fileChipIndex(at('<span class="cell"><i class="x"/></span>', '.x'))).toBeNull()
  })

  it('reads DOWN from nothing — a row wrapping its labels is the value’s area, not a label', () => {
    // `closest` walks up, so the row a handler's `currentTarget` names can only ever answer null.
    // This is why the clicked node travels separately from the element an editor anchors to.
    const row = '<div class="row"><span data-segment-index="0"><b class="a">A.pdf</b></span></div>'
    expect(fileChipIndex(at(row, '.row'))).toBeNull()
    expect(fileChipIndex(at(row, '.a'))).toBe(0)
  })
})

describe('runFilePick', () => {
  it('the value’s area ADDS, opening at the property’s own Directory', async () => {
    const next = await runFilePick(
      def({ file_directory: 'Attachments' }),
      held(['[[Old.pdf]]']),
      null,
    )
    // The dialog opens under the ASSET root, never at a same-named folder off the nexus root.
    expect(pickFile).toHaveBeenCalledWith({ any: true, dir: 'file-assets/Attachments' })
    expect(adoptFile).toHaveBeenCalledWith('/outside/New.pdf', 'Attachments')
    expect(next).toEqual(held(['[[Old.pdf]]', '[[New.pdf]]']))
  })

  it('a label REPLACES the file it names, opening at that file’s own folder', async () => {
    const next = await runFilePick(def({ file_directory: 'Attachments' }), held(['[[Old.pdf]]']), 0)
    expect(pickFile).toHaveBeenCalledWith({ any: true, dir: 'file-assets/Specs' })
    expect(next).toEqual(held(['[[New.pdf]]']))
  })

  it('an unresolved label falls back to the property’s Directory, never the dialog’s own memory', async () => {
    await runFilePick(def({ file_directory: 'Attachments' }), held(['[[Gone.pdf]]']), 0)
    // The dialog opens under the ASSET root, never at a same-named folder off the nexus root.
    expect(pickFile).toHaveBeenCalledWith({ any: true, dir: 'file-assets/Attachments' })
  })

  it('a cancelled dialog writes nothing, and never adopts', async () => {
    pickFile.mockResolvedValueOnce(null)
    expect(await runFilePick(def(), held(['[[Old.pdf]]']), null)).toBeUndefined()
    expect(adoptFile).not.toHaveBeenCalled()
  })

  it('a refused adoption leaves the value alone — the reference follows the bytes', async () => {
    adoptFile.mockResolvedValueOnce({ ok: false, error: { code: 'invalid-path', message: 'no' } })
    expect(await runFilePick(def(), held(['[[Old.pdf]]']), 0)).toBeUndefined()
  })
})

describe('runFilePick — where the dialog opens', () => {
  it('a property naming no Directory opens at the asset root, not the nexus root', async () => {
    await runFilePick(def(), held([]), null)
    expect(pickFile).toHaveBeenCalledWith({ any: true, dir: 'file-assets' })
  })

  it('a resolved label opens at that file’s own folder, which is already nexus-relative', async () => {
    await runFilePick(def({ file_directory: 'Attachments' }), held(['[[Old.pdf]]']), 0)
    expect(pickFile).toHaveBeenCalledWith({ any: true, dir: 'file-assets/Specs' })
  })

  it('an UNRESOLVED label has no folder of its own, so it falls to the property’s', async () => {
    await runFilePick(def({ file_directory: 'Attachments' }), held(['[[Ghost.pdf]]']), 0)
    expect(pickFile).toHaveBeenCalledWith({ any: true, dir: 'file-assets/Attachments' })
  })
})

describe('pickFileInto', () => {
  it('writes a picked value, and writes NOTHING where the pick answered undefined', async () => {
    const commit = vi.fn()
    pickFileInto(def(), held([]), null, commit)
    await vi.waitFor(() => expect(commit).toHaveBeenCalledWith(held(['[[New.pdf]]'])))

    commit.mockClear()
    pickFile.mockResolvedValueOnce(null)
    pickFileInto(def(), held(['[[Old.pdf]]']), null, commit)
    await new Promise((r) => setTimeout(r, 0))
    expect(commit).not.toHaveBeenCalled()
  })
})

describe('fileValueMenu — the value menu the inspector panes pop', () => {
  const chipAt = (i: number): Element => {
    const host = document.createElement('div')
    host.innerHTML = `<span data-segment-index="${i}"><b class="x">f</b></span>`
    return host.querySelector('.x') as Element
  }

  it('the value’s own area offers the off-chip menu — there is no file to act on', async () => {
    await fileValueMenu(def(), held(['[[Old.pdf]]']), null, vi.fn())
    expect(cellMenu).toHaveBeenCalledWith({ kind: 'file', onChip: false })
  })

  it('a chip offers the on-chip menu, and Remove drops that chip alone', async () => {
    const commit = vi.fn()
    cellMenu.mockResolvedValueOnce('file:remove')
    await fileValueMenu(def(), held(['[[A.pdf]]', '[[B.pdf]]']), chipAt(1), commit)
    expect(cellMenu).toHaveBeenCalledWith({ kind: 'file', onChip: true })
    expect(commit).toHaveBeenCalledWith(held(['[[A.pdf]]']))
  })

  it('Replace picks into the chip it was opened on', async () => {
    const commit = vi.fn()
    cellMenu.mockResolvedValueOnce('file:replace')
    await fileValueMenu(def(), held(['[[A.pdf]]', '[[B.pdf]]']), chipAt(0), commit)
    await vi.waitFor(() => expect(commit).toHaveBeenCalledWith(held(['[[New.pdf]]', '[[B.pdf]]'])))
  })

  it('a dismissed menu writes nothing', async () => {
    const commit = vi.fn()
    await fileValueMenu(def(), held(['[[A.pdf]]']), chipAt(0), commit)
    expect(commit).not.toHaveBeenCalled()
  })
})
