import { createGlobalTheme, style } from '@vanilla-extract/css'

export const font = createGlobalTheme(':root', {
  family:
    "'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',

  weight: {
    standard: '400',
    emphasized: '500',
    semibold: '600',
    bold: '700',
  },

  // The three title sizes are the container-title family: Large over an editor banner, Medium on the bare page header, Small over a Banner cover.
  scale: {
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

// The title sizes publish as raw `--text-title-*-size` tokens and take no weight class.
export const text = {
  headline: ramp('headline'),
  body: ramp('body'),
  callout: ramp('callout'),
  control: ramp('control'),
  caption: ramp('caption'),
  footnote: ramp('footnote'),
  subline: ramp('subline'),
}
