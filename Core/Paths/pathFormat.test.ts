import { describe, expect, it } from 'vitest'
import { formatPath, type PathFormat } from './pathFormat'

const form = (format: PathFormat, extensions = false) => ({
  format,
  extensions,
  root: '/Users/ada/NexusOS',
  home: '/Users/ada',
  platform: 'posix' as const,
})

describe('formatPath', () => {
  it('writes a relative path from the Nexus root, dropping the extension unless asked', () => {
    expect(formatPath('Notes/Set/Page.md', form('relative'))).toBe('Notes/Set/Page')
    expect(formatPath('Notes/Set/Page.md', form('relative', true))).toBe('Notes/Set/Page.md')
    expect(formatPath('Notes/Read.MD', form('relative'))).toBe('Notes/Read')
    expect(formatPath('Notes/Set', form('relative'))).toBe('Notes/Set')
    expect(formatPath('Notes/Set', form('relative', true))).toBe('Notes/Set')
  })

  it('writes an absolute path from the filesystem root', () => {
    expect(formatPath('Notes/Page.md', form('absolute'))).toBe('/Users/ada/NexusOS/Notes/Page')
  })

  it('anchors a path to the home folder, and writes it whole when the Nexus sits outside it', () => {
    expect(formatPath('Notes/Page.md', form('home'))).toBe('~/NexusOS/Notes/Page')
    expect(formatPath('Notes/Page.md', { ...form('home'), root: '/Volumes/Drive/NexusOS' })).toBe(
      '/Volumes/Drive/NexusOS/Notes/Page',
    )
    expect(formatPath('Notes/Page.md', { ...form('home'), home: '/Users/ad' })).toBe(
      '/Users/ada/NexusOS/Notes/Page',
    )
  })

  it('writes backslashes on Windows', () => {
    expect(
      formatPath('Notes/Page.md', {
        ...form('home'),
        root: 'C:/Users/ada/NexusOS',
        home: 'C:/Users/ada',
        platform: 'windows',
      }),
    ).toBe('~\\NexusOS\\Notes\\Page')
    expect(formatPath('Notes/Page.md', { ...form('relative'), platform: 'windows' })).toBe(
      'Notes\\Page',
    )
  })
})
