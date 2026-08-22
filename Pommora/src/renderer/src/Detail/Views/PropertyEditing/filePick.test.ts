// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PropertyDefinition } from '@shared/properties'
import { useSession } from '@renderer/store'
import { fileChipIndex, fileLabelText, fileValueWithout, runFilePick } from './filePick'

const def = (over: Partial<PropertyDefinition> = {}): PropertyDefinition =>
  ({ id: 'p', name: 'Attachments', type: 'file', ...over }) as PropertyDefinition

const held = (value: string[]) => ({ kind: 'file', value }) as const

let pickFile: ReturnType<typeof vi.fn>
let adoptFile: ReturnType<typeof vi.fn>

beforeEach(() => {
  pickFile = vi.fn(async () => '/outside/New.pdf')
  adoptFile = vi.fn(async () => ({ ok: true, value: '[[New.pdf]]' }))
  ;(globalThis as { window?: unknown }).window = { nexus: { pickFile, adoptFile } }
  useSession.setState({
    assetMap: { files: { 'old.pdf': ['file-assets/Specs/Old.pdf'] }, version: 1 },
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

describe('fileLabelText', () => {
  it('reads the wikilink’s title, and leaves anything else as written', () => {
    expect(fileLabelText('[[Report.pdf]]')).toBe('Report.pdf')
    expect(fileLabelText('Report.pdf')).toBe('Report.pdf')
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
})

describe('runFilePick', () => {
  it('the value’s area ADDS, opening at the property’s own Directory', async () => {
    const next = await runFilePick(
      def({ file_directory: 'Attachments' }),
      held(['[[Old.pdf]]']),
      null,
    )
    expect(pickFile).toHaveBeenCalledWith({ any: true, dir: 'Attachments' })
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
    expect(pickFile).toHaveBeenCalledWith({ any: true, dir: 'Attachments' })
  })

  it('a property with no Directory opens wherever the dialog would', async () => {
    await runFilePick(def(), held([]), null)
    expect(pickFile).toHaveBeenCalledWith({ any: true })
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
