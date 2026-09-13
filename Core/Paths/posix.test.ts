import { describe, expect, it } from 'vitest'
import { dirname, isAbsolute, join, relative } from './posix'

describe('posix roots', () => {
  it('keeps a POSIX root through join and dirname', () => {
    expect(join('/', 'a', '..', '..', 'b')).toBe('/b')
    expect(dirname('/a')).toBe('/')
    expect(join()).toBe('.')
  })

  it('keeps a drive root through join, dirname, and relative', () => {
    expect(join('C:/Users/n', 'Nexus', '..', '..', '..', 'x')).toBe('C:/x')
    expect(dirname('C:/Nexus')).toBe('C:/')
    expect(relative('C:/Users/n/Nexus', 'C:/Users/n/Nexus/Notes/a.md')).toBe('Notes/a.md')
    expect(relative('C:/Nexus', 'D:/Nexus').startsWith('../')).toBe(true)
  })

  it('keeps a UNC root through join and dirname', () => {
    expect(join('//server/share/Nexus', 'Notes')).toBe('//server/share/Nexus/Notes')
    expect(dirname('//server/share/Nexus')).toBe('//server/share/')
    expect(dirname('//server/share')).toBe('//server/share')
  })

  it('reads every host absolute form as absolute', () => {
    for (const p of ['/etc', 'C:/x', 'C:\\x', '\\\\server\\share', '//server/share'])
      expect(isAbsolute(p)).toBe(true)
    for (const p of ['Notes/a.md', 'C:foo', '.']) expect(isAbsolute(p)).toBe(false)
  })
})
