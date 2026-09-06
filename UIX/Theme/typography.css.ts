import { createGlobalTheme, style } from '@vanilla-extract/css'

/**
 * Typography primitives — the raw type scale and the single source of truth.
 * Edit a value here and it propagates to every composed text style and every
 * component that uses one.*/
export const font = createGlobalTheme(':root', {
  family:
    "'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  /** Code and anything else that has to hold a column — the editor's fences, its inline code, and
   *  the showcase's specimens all read this one stack. */
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',

  weight: {
    standard: '400',
    emphasized: '500',
    semibold: '600',
    bold: '700',
  },

  scale: {
    // Container-title family — the heading a Collection, Set, or page wears at the top of its own
    // surface. Large over an editor banner, Medium on the bare page header, Small over a Banner cover.
    titleLarge: { size: '28px', line: '32px' },
    titleMedium: { size: '24px', line: '28px' },
    titleSmall: { size: '20px', line: '24px' },
    headline: { size: '15px', line: '20px' },
    body: { size: '13px', line: '16px' },
    callout: { size: '12px', line: '15px' },
    control: { size: '12px', line: '15px' },
    caption: { size: '11px', line: '14px' },
    footnote: { size: '10px', line: '13px' },
    subline: { size: '10px', line: '12px' },
  },
})

type ScaleKey = keyof typeof font.scale
type WeightKey = keyof typeof font.weight

// Each text style exposes all four weights by name. The variant IS its weight, uniformly across every
// style: standard / emphasized / semibold / bold map straight to the font.weight ladder above.
const ramp = (key: ScaleKey): Record<WeightKey, string> => {
  const base = {
    fontFamily: font.family,
    fontSize: font.scale[key].size,
    lineHeight: font.scale[key].line,
    letterSpacing: 0,
  }
  return {
    standard: style({ ...base, fontWeight: font.weight.standard }),
    emphasized: style({ ...base, fontWeight: font.weight.emphasized }),
    semibold: style({ ...base, fontWeight: font.weight.semibold }),
    bold: style({ ...base, fontWeight: font.weight.bold }),
  }
}

export const text = {
  titleLarge: ramp('titleLarge'),
  titleMedium: ramp('titleMedium'),
  titleSmall: ramp('titleSmall'),
  headline: ramp('headline'),
  body: ramp('body'),
  callout: ramp('callout'),
  control: ramp('control'),
  caption: ramp('caption'),
  footnote: ramp('footnote'),
  subline: ramp('subline'),
}
