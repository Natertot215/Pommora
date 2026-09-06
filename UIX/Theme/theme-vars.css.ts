// Republishes every token as a stable `--kebab-name` CSS variable for plain-CSS consumers.
import { createGlobalTheme, globalStyle } from '@vanilla-extract/css'
import { CONN_LINK_MASK, FOLD_CHEVRON_MASK, GRIP_GLYPH } from '../Symbols/masks'
import { duration, easing } from '../Animations/motion'
import { STATE_OPACITY, vars as colorVars } from './color.css'
import { DEFAULT_ACCENT, TINT_STEPS, mixAt, tintAt } from './colors'
import { stack } from './stack'
import { font } from './typography.css'

export const ICON_PX = {
  titleLarge: 26,
  titleMedium: 22,
  titleSmall: 17,
  headline: 15,
  body: 13,
  control: 12,
  caption: 11,
  footnote: 10,
} as const

const iconScale = createGlobalTheme(':root', {
  icon: Object.fromEntries(Object.entries(ICON_PX).map(([k, v]) => [k, `${v}px`])) as {
    [K in keyof typeof ICON_PX]: string
  },
})

export const size = {
  icon: iconScale.icon,
}

export type IconSize = keyof typeof size.icon

/** The names are the public knob; the numbers behind each live in button-base.css.ts. */
export type ButtonSize = 'button-inline' | 'button-small' | 'button-medium' | 'button-large'

export const DISCLOSURE_INDENT = 14

export const DROP_LINE_INSET = 2

/** Grid tiles and the editor's embedded page tiles bottom out at this one minimum. */
export const TILE_MIN_PX = 64

/** KNOB — a resizable tile's height before a persisted one exists. */
export const TILE_DEFAULT_PX = 320

/** KNOB — a resizable tile's float gap above and below; a tile widget adds it back to the height it reports to CM6. */
export const TILE_GAP_PX = 4

const CHECKBOX_BASE = 'var(--checkbox-base, var(--accent))'

const c = colorVars.color

globalStyle(':root', {
  vars: {
    '--system-black': c.system.black,
    '--bg-window': c.background.window,
    '--surface-primary': c.surface.primary,
    '--surface-secondary': c.surface.secondary,
    '--surface-tertiary': c.surface.tertiary,
    '--label-primary': c.label.primary,
    '--label-secondary': c.label.secondary,
    '--label-tertiary': c.label.tertiary,
    '--label-control': c.label.control,
    '--fill-secondary': c.fill.secondary,
    '--fill-tertiary': c.fill.tertiary,
    '--fill-quaternary': c.fill.quaternary,
    '--fill-quinary': c.fill.quinary,
    '--border-base': c.border.base,
    '--border-light': c.border.light,
    '--border-faint': c.border.faint,
    '--solid-orange': c.solid.orange,
    '--solid-yellow': c.solid.yellow,
    '--solid-green': c.solid.green,
    '--solid-light-blue': c.solid.lightBlue,
    '--solid-cyan': c.solid.cyan,
    '--solid-purple': c.solid.purple,
    '--error': c.solid.red,
    '--code': `color-mix(in srgb, ${c.solid.red} 85%, transparent)`,

    ...Object.fromEntries(
      Object.entries(TINT_STEPS).map(([step, pct]) => [`--tint-${step}`, `${pct}%`]),
    ),

    '--state-hover': c.state.hover,
    '--state-selected': c.state.selected,
    '--state-muted': c.state.muted,
    '--state-ghost': STATE_OPACITY.ghost,
    '--state-inactive': STATE_OPACITY.inactive,

    '--accent': c.solid[DEFAULT_ACCENT],
    '--accent-fill': 'color-mix(in srgb, var(--accent) var(--tint-quaternary), transparent)',
    '--accent-stroke': 'color-mix(in srgb, var(--accent) var(--tint-secondary), transparent)',
    '--accent-stroke-hot': 'color-mix(in srgb, var(--accent) var(--tint-primary), transparent)',
    '--system-accent': c.solid[DEFAULT_ACCENT],
    '--link': 'var(--system-accent)',
    '--connection': 'var(--accent)',
    '--checkbox-fill': tintAt(CHECKBOX_BASE, 'primary'),
    '--checkbox-border': tintAt(CHECKBOX_BASE, 'tertiary'),
    '--checkbox-mark': mixAt(CHECKBOX_BASE, 'quaternary', c.label.primary),

    '--width-100': '1px',
    '--width-125': '1.25px',
    '--width-150': '1.5px',
    '--width-175': '1.75px',
    '--width-200': '2px',
    '--radius-full': '999px',

    '--icon-body': size.icon.body,
    '--disclosure-indent': `${DISCLOSURE_INDENT}px`,
    '--rail-inset-base': '20px',
    '--rail-inset': 'var(--rail-inset-base)',
    '--park-clearance': '14px',
    '--tile-default-height': `${TILE_DEFAULT_PX}px`,
    '--tile-gap': `${TILE_GAP_PX}px`,

    '--drag-line': 'var(--accent)',
    '--drop-slot-fill': tintAt('var(--accent)', 'tertiary'),
    '--drop-line-thickness': '2px',
    '--drop-dot-size': '7px',
    '--drop-line-inset': `${DROP_LINE_INSET}px`,

    '--list-outline-width': '2px',
    '--list-outline-color': 'var(--border-light)',
    '--list-outline-radius': 'var(--radius-full)',
    '--list-outline-gap': '3px',

    '--fade-light': '12px',
    '--fade-base': '16px',
    '--fade-strong': '20px',
    '--fade-heavy': '24px',

    '--font-family': font.family,
    '--font-mono': font.mono,
    '--weight-emphasized': font.weight.emphasized,
    '--weight-semibold': font.weight.semibold,
    '--weight-bold': font.weight.bold,
    '--text-title-large-size': font.scale.titleLarge.size,
    '--text-title-medium-size': font.scale.titleMedium.size,
    '--text-title-small-size': font.scale.titleSmall.size,
    '--text-headline-size': font.scale.headline.size,
    '--text-body-size': font.scale.body.size,
    '--text-callout-size': font.scale.callout.size,
    '--text-callout-line': font.scale.callout.line,
    '--text-control-size': font.scale.control.size,
    '--text-caption-size': font.scale.caption.size,

    // Glyph masks, for the pseudo-elements that cannot host an <Icon>
    '--grip-glyph': GRIP_GLYPH,
    '--fold-chevron-mask': FOLD_CHEVRON_MASK,
    '--conn-link-mask': CONN_LINK_MASK,

    '--duration-fast': duration.fast,
    '--duration-menu': duration.menu,
    '--duration-base': duration.base,
    '--duration-slow': duration.slow,
    '--ease-base': easing.baseEase,

    '--z-content': `${stack.shell.content}`,
    '--z-sidebar': `${stack.shell.sidebar}`,
    '--z-titlebar': `${stack.shell.titlebar}`,
    '--z-sidebar-toggle': `${stack.shell.sidebarToggle}`,
    '--z-sidebar-resize': `${stack.shell.sidebarResize}`,
    '--z-inspector': `${stack.shell.inspector}`,
    '--z-inspector-resize': `${stack.shell.inspectorResize}`,
    '--z-toolbar': `${stack.shell.toolbar}`,
    '--z-lifted': `${stack.local.lifted}`,
    '--z-overlay': `${stack.local.overlay}`,
    '--z-floating': `${stack.top.floating}`,
    '--z-caret': `${stack.top.caret}`,
  },
})
