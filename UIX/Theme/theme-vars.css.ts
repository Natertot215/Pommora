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

/** The button geometry scale. The names are the public knob (a caller picks `size="button-large"`);
 *  the numbers behind each live with the button, in button-base.css.ts. */
export type ButtonSize = 'button-inline' | 'button-small' | 'button-medium' | 'button-large'

export const DISCLOSURE_INDENT = 14

export const DROP_LINE_INSET = 2

/** Grid tiles and MarkdownPM's embedded page tiles agree on this one minimum, so a
 *  resizable tile bottoms out the same wherever it can be grabbed. */
export const TILE_MIN_PX = 64

/** KNOB — the height a resizable tile reports and occupies before a persisted one exists.*/
export const TILE_DEFAULT_PX = 320

/** KNOB — the gap a resizable tile floats in, above and below. A margin sits outside the box a tile
 *  widget measures, so the value the widget answers CM6 with has to add it back or the height model
 *  runs short by the gap for every tile on the page.*/
export const TILE_GAP_PX = 4

const CHECKBOX_BASE = 'var(--checkbox-base, var(--accent))'

globalStyle(':root', {
  vars: {
    '--system-grey': colorVars.color.system.grey,
    '--system-white': colorVars.color.system.white,
    '--system-black': colorVars.color.system.black,
    ...Object.fromEntries(
      Object.entries(TINT_STEPS).map(([step, pct]) => [`--tint-${step}`, `${pct}%`]),
    ),
    '--label-primary': colorVars.color.label.primary,
    '--label-secondary': colorVars.color.label.secondary,
    '--label-tertiary': colorVars.color.label.tertiary,
    '--label-control': colorVars.color.label.control,

    '--bg-window': colorVars.color.background.window,
    '--surface-primary': colorVars.color.surface.primary,
    '--surface-secondary': colorVars.color.surface.secondary,
    '--surface-tertiary': colorVars.color.surface.tertiary,

    '--fill-primary': colorVars.color.fill.primary,
    '--fill-secondary': colorVars.color.fill.secondary,
    '--fill-tertiary': colorVars.color.fill.tertiary,
    '--fill-quaternary': colorVars.color.fill.quaternary,
    '--fill-quinary': colorVars.color.fill.quinary,

    '--border-base': colorVars.color.border.base,
    '--border-light': colorVars.color.border.light,
    '--border-faint': colorVars.color.border.faint,

    '--width-100': '1px',
    '--width-125': '1.25px',
    '--width-150': '1.5px',
    '--width-175': '1.75px',
    '--width-200': '2px',
    '--radius-full': '999px',
    '--state-hover': colorVars.color.state.hover,
    '--state-selected': colorVars.color.state.selected,
    '--state-muted': colorVars.color.state.muted,
    '--state-ghost': STATE_OPACITY.ghost,
    '--state-inactive': STATE_OPACITY.inactive,
    '--drag-line': 'var(--accent)',
    '--drop-slot-fill': tintAt('var(--accent)', 'tertiary'),
    '--drop-line-thickness': '2px',
    '--drop-dot-size': '7px',
    '--drop-line-inset': `${DROP_LINE_INSET}px`,
    '--tile-default-height': `${TILE_DEFAULT_PX}px`,
    '--tile-gap': `${TILE_GAP_PX}px`,
    '--list-outline-width': '2px',
    '--list-outline-color': 'var(--border-light)',
    '--list-outline-radius': 'var(--radius-full)',
    '--list-outline-gap': '3px',
    '--fade-light': '12px',
    '--fade-base': '16px',
    '--fade-strong': '20px',
    '--fade-heavy': '24px',
    '--accent': colorVars.color.solid[DEFAULT_ACCENT],
    '--accent-fill': 'color-mix(in srgb, var(--accent) var(--tint-quaternary), transparent)',
    '--accent-stroke': 'color-mix(in srgb, var(--accent) var(--tint-secondary), transparent)',
    '--accent-stroke-hot': 'color-mix(in srgb, var(--accent) var(--tint-primary), transparent)',
    '--checkbox-fill': tintAt(CHECKBOX_BASE, 'primary'),
    '--checkbox-border': tintAt(CHECKBOX_BASE, 'tertiary'),
    '--checkbox-mark': mixAt(CHECKBOX_BASE, 'quaternary', colorVars.color.label.primary),
    '--system-accent': colorVars.color.solid[DEFAULT_ACCENT],
    '--link': 'var(--system-accent)',
    '--connection': 'var(--accent)',
    '--code': `color-mix(in srgb, ${colorVars.color.solid.red} 85%, transparent)`,
    '--error': colorVars.color.solid.red,
    '--font-family': font.family,
    '--font-mono': font.mono,
    '--weight-standard': font.weight.standard,
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
    '--text-footnote-size': font.scale.footnote.size,
    '--text-subline-size': font.scale.subline.size,
    '--park-clearance': '14px',
    '--disclosure-indent': `${DISCLOSURE_INDENT}px`,
    '--rail-inset-base': '20px',
    '--rail-inset': 'var(--rail-inset-base)',
    // A CSS mask, not an <Icon> — the fold chevron paints on a line ::before, which can't host a component.
    '--grip-glyph': GRIP_GLYPH,
    '--fold-chevron-mask': FOLD_CHEVRON_MASK,
    '--conn-link-mask': CONN_LINK_MASK,
    '--solid-red': colorVars.color.solid.red,
    '--solid-orange': colorVars.color.solid.orange,
    '--solid-yellow': colorVars.color.solid.yellow,
    '--solid-green': colorVars.color.solid.green,
    '--solid-light-blue': colorVars.color.solid.lightBlue,
    '--solid-cyan': colorVars.color.solid.cyan,
    '--solid-blue': colorVars.color.solid.blue,
    '--solid-purple': colorVars.color.solid.purple,
    '--solid-lavender': colorVars.color.solid.lavender,
    '--solid-grey': colorVars.color.solid.grey,
    '--icon-body': size.icon.body,
    '--duration-fast': duration.fast,
    '--duration-menu': duration.menu,
    '--duration-base': duration.base,
    '--duration-slow': duration.slow,
    '--ease-base': easing.baseEase,
    '--ease-snap': easing.baseSnap,
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
