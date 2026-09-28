import { describe, expect, it } from 'vitest'
import { resolveRibbonOrder, withHidden } from './ribbonOrder'

describe('resolveRibbonOrder', () => {
  it('carries Agenda only while the gate is open', () => {
    expect(resolveRibbonOrder(undefined, true)).toEqual([
      'matrix',
      'agenda',
      'contexts',
      'collections',
      'settings',
    ])
    expect(resolveRibbonOrder(undefined, false)).toEqual([
      'matrix',
      'contexts',
      'collections',
      'settings',
    ])
  })

  it('drops Agenda from a saved order once the gate closes', () => {
    const saved = ['agenda', 'settings', 'contexts', 'matrix', 'collections']
    expect(resolveRibbonOrder(saved, false)).toEqual([
      'settings',
      'contexts',
      'matrix',
      'collections',
    ])
  })

  it('drops a key the ribbon no longer carries', () => {
    expect(resolveRibbonOrder(['navigation', 'settings', 'matrix'], false)).toEqual([
      'settings',
      'contexts',
      'collections',
      'matrix',
    ])
  })
})

describe('withHidden', () => {
  it('keeps a gated key in the seat it was saved in', () => {
    const saved = ['matrix', 'agenda', 'settings', 'contexts', 'collections']
    const visible = ['settings', 'matrix', 'contexts', 'collections'] as const
    expect(withHidden(saved, [...visible])).toEqual([
      'settings',
      'agenda',
      'matrix',
      'contexts',
      'collections',
    ])
  })

  it('leaves a visible order untouched and still drops an unknown key', () => {
    const visible = ['matrix', 'contexts', 'collections', 'settings'] as const
    expect(withHidden(['navigation', 'matrix'], [...visible])).toEqual([...visible])
    expect(withHidden(undefined, [...visible])).toEqual([...visible])
  })
})
