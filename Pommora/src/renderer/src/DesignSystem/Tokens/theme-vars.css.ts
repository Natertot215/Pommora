import { globalStyle } from '@vanilla-extract/css'
import { DEFAULT_ACCENT } from '@shared/types'
import { BANNER_SHADOW, STATE_OPACITY, vars as colorVars } from './color.css'
import { font } from './typography.css'
import {
  CLOSE_CLEARANCE,
  CONTAINER_TITLE_SIZE,
  DISCLOSURE_INDENT,
  DROP_DOT_SIZE,
  DROP_LINE_INSET,
  DROP_LINE_THICKNESS,
  FOLD_GUTTER,
  LIST_OUTLINE_GAP,
  LIST_OUTLINE_WIDTH,
  PARK_CLEARANCE,
  RADIUS_FULL,
  TILE_DEFAULT_PX,
  TILE_GAP_PX,
  size,
} from './size.css'
import { CODE_CHEVRON_MASK, CONN_LINK_MASK, FOLD_CHEVRON_MASK, GRIP_GLYPH } from '../Symbols/masks'
import { mixAt, tintAt, TINT_STEPS } from './tint'
import { duration, easing } from '../Animation/motion'
import { stack } from './stack'

const CHECKBOX_BASE = 'var(--checkbox-base, var(--accent))'

// Bridge: expose the (hashed) vanilla-extract tokens as stable-named CSS custom
// properties.
globalStyle(':root', {
  vars: {
    // Primitives — the base palette every grey/white tone derives from.
    '--system-grey': colorVars.color.system.grey,
    '--system-white': colorVars.color.system.white,
    '--system-black': colorVars.color.system.black,
    // Tint scale — generated from the ladder, so retuning a step lands in one place.
    ...Object.fromEntries(
      Object.entries(TINT_STEPS).map(([step, pct]) => [`--tint-${step}`, `${pct}%`]),
    ),
    '--label-primary': colorVars.color.label.primary,
    '--label-secondary': colorVars.color.label.secondary,
    '--label-tertiary': colorVars.color.label.tertiary,
    '--label-quaternary': colorVars.color.label.quaternary,
    '--label-control': colorVars.color.label.control,
    '--bg-window': colorVars.color.background.window,
    '--surface-primary': colorVars.color.surface.primary,
    '--surface-secondary': colorVars.color.surface.secondary,
    '--surface-tertiary': colorVars.color.surface.tertiary,
    // Overlay fills (system-grey ramp) — used for cards/chips over a surface.
    '--fill-primary': colorVars.color.fill.primary,
    '--fill-secondary': colorVars.color.fill.secondary,
    '--fill-tertiary': colorVars.color.fill.tertiary,
    '--fill-quaternary': colorVars.color.fill.quaternary,
    '--fill-quinary': colorVars.color.fill.quinary,
    '--separator-border': colorVars.color.separator.border,
    '--separator-segment': colorVars.color.separator.segment,
    // Heading seam — the heavier hairline that separates a heading band from the body below it (table
    // heading↔rows, banner↔body, editor heading↔content).
    '--border-heading': '1.75px solid var(--separator-border)',
    // Box seam — the border an outlined box/card draws around itself (gallery + page cards, the icon
    // picker's favorites strip).
    '--border-cell': '1.5px solid var(--separator-border)',
    // Section seam — the plain hairline that divides one section from the next (a header's lower edge,
    // a settings category's top edge).
    '--border-segment': '1px solid var(--separator-segment)',
    // The pill radius — larger than any box that wears it, so both ends resolve to semicircles
    // whatever the height.
    '--radius-full': RADIUS_FULL,
    // Over-image legibility scrim for a title/search/icon sitting on a banner cover — one source for the
    // banner title, the NavView search, and the editor's banner overlay.
    '--banner-shadow': BANNER_SHADOW,
    '--banner-cast': '0 1px 4px var(--banner-shadow)',
    // The container title's type size — the heading a Collection, Set, or page wears at the top of its
    // own surface, over a banner cover or on the bare header that replaces one.
    '--container-title-size': CONTAINER_TITLE_SIZE,
    // Interaction states — a system-grey wash, hover lighter than selected.
    '--state-hover': colorVars.color.state.hover,
    '--state-selected': colorVars.color.state.selected,
    '--state-muted': colorVars.color.state.muted,
    '--state-drag': STATE_OPACITY.drag,
    // Ghost — a thing being reordered with nothing standing in for it (table rows, sidebar rows,
    // editor blocks and list items, the pane property reorder).
    '--state-ghost': STATE_OPACITY.ghost,
    // Inactive — the one still-here-but-not-active dim: empty-state copy, disabled controls,
    // the ghost "New Page" row. Worn as `opacity:` over the element's standard chrome.
    '--state-inactive': STATE_OPACITY.inactive,
    // Drag insertion line — the drop-target marker (accent line + leading dot) shared by every drop-line
    // DnD surface: table rows/bands AND the settings-pane property reorder.
    '--drag-line': 'var(--accent)',
    '--drop-line-thickness': `${DROP_LINE_THICKNESS}px`,
    '--drop-dot-size': `${DROP_DOT_SIZE}px`,
    '--drop-line-inset': `${DROP_LINE_INSET}px`,
    '--tile-default-height': `${TILE_DEFAULT_PX}px`,
    '--tile-gap': `${TILE_GAP_PX}px`,
    // List outline (the nested-run rail) — THE shared rail primitive: MarkdownPM's outliner guides
    // and the Grouping pane's hierarchy rail consume these knobs.
    '--list-outline-width': `${LIST_OUTLINE_WIDTH}px`,
    '--list-outline-color': 'var(--separator-segment)',
    '--list-outline-radius': 'var(--radius-full)',
    '--list-outline-gap': `${LIST_OUTLINE_GAP}px`,
    // Accent: a pointer, never a baked color. The static seed is the default
    // spectrum solid (DEFAULT_ACCENT); applyAccent overrides --accent at runtime
    // from settings — any spectrum color, or the OS accent.
    '--accent': colorVars.color.solid[DEFAULT_ACCENT],
    '--accent-fill': 'color-mix(in srgb, var(--accent) 15%, transparent)',
    // Active stroke — the accent-tint border COLOR every "this is the live one" outline uses.
    '--accent-stroke': 'color-mix(in srgb, var(--accent) var(--tint-secondary), transparent)',
    // The same stroke a notch stronger — used while a surface is being actively manipulated, so a
    // resize reads hotter than the hover that revealed it.
    '--accent-stroke-hot': 'color-mix(in srgb, var(--accent) var(--tint-primary), transparent)',
    '--accent-text': 'var(--accent)',
    // The checkbox's three parts off one base — the accent until a chosen cell overrides it per
    // element (personalization). Its border sits a step softer: a glyph-sized box wants that.
    '--checkbox-fill': tintAt(CHECKBOX_BASE, 'primary'),
    '--checkbox-border': tintAt(CHECKBOX_BASE, 'tertiary'),
    '--checkbox-mark': mixAt(CHECKBOX_BASE, 'quaternary', colorVars.color.label.primary),
    // The OS/system accent, always reflected (applySystemAccent overrides it at
    // runtime from the OS, independent of the Pommora --accent setting).
    '--system-accent': colorVars.color.solid[DEFAULT_ACCENT],
    // Semantic link colors (labels side, not tints): external links wear the OS
    // accent, internal connections wear the app's accent; code is systemRed.
    '--link': 'var(--system-accent)',
    '--connection': 'var(--accent)',
    '--code': `color-mix(in srgb, ${colorVars.color.solid.red} 85%, transparent)`,
    // Refusal / failure text, wherever a surface reports one.
    '--error': colorVars.color.solid.red,
    '--font-family': font.family,
    '--font-mono': font.mono,
    // Weight ladder — so plain CSS single-sources the same numbers as the text styles.
    '--weight-standard': font.weight.standard,
    '--weight-emphasized': font.weight.emphasized,
    '--weight-semibold': font.weight.semibold,
    '--weight-bold': font.weight.bold,
    // Type sizes — the full ramp, so plain CSS names a step rather than restating a pixel value.
    '--text-large-title-size': font.scale.largeTitle.size,
    '--text-title1-size': font.scale.title1.size,
    '--text-title2-size': font.scale.title2.size,
    '--text-title3-size': font.scale.title3.size,
    '--text-headline-size': font.scale.headline.size,
    '--text-body-size': font.scale.body.size,
    '--text-callout-size': font.scale.callout.size,
    '--text-control-size': font.scale.control.size,
    '--text-caption-size': font.scale.caption.size,
    '--text-footnote-size': font.scale.footnote.size,
    '--text-subline-size': font.scale.subline.size,
    // The control-size heights — plain CSS sizes a row to a button by naming that button's alias
    // rather than restating the height its .ts sibling already holds.
    '--button-small-height': size.control['button-small'].height,
    '--button-medium-height': size.control['button-medium'].height,
    '--button-large-height': size.control['button-large'].height,
    // How far past its own edge a floating pane travels to park fully off-screen — enough that its
    // shadow clears the window too, not just its box.
    '--park-clearance': `${PARK_CLEARANCE}px`,
    // The top inset a floating window's content keeps so it clears the × floating over its corner.
    '--close-clearance': `${CLOSE_CLEARANCE}px`,
    '--disclosure-indent': `${DISCLOSURE_INDENT}px`,
    // The fold/grip lane the editor, table views, block tiles, and embeds all carve from the content
    // inset.
    '--fold-gutter-base': `${FOLD_GUTTER}px`,
    '--fold-gutter': 'var(--fold-gutter-base)',
    // Masked-glyph assets shared across module boundaries: the 6-dot drag grip (lucide grip-vertical,
    // read by MarkdownPM's rail grips AND SurfacePM's block handle) and the fold chevron
    // (lucide chevron-right, a CSS mask because it paints on a line ::before — an <Icon> can't).
    '--grip-glyph': GRIP_GLYPH,
    '--fold-chevron-mask': FOLD_CHEVRON_MASK,
    // Lucide's `link-2`, traced from the package's own geometry rather than redrawn.
    '--conn-link-mask': CONN_LINK_MASK,
    // The same chevron a stroke step lighter — the codeblock language chrome's bracket.
    '--code-chevron-mask': CODE_CHEVRON_MASK,
    // Spectrum solids as literal vars, so plain CSS routes to the same palette (the code tokens
    // mix these toward system-white at a tint-scale share for their pastels).
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
    // Icon-size ladder — so plain-CSS glyphs (e.g. the fold chevron) route to the same steps.
    '--icon-large-title': size.icon.largeTitle,
    '--icon-title1': size.icon.title1,
    '--icon-title2': size.icon.title2,
    '--icon-title3': size.icon.title3,
    '--icon-headline': size.icon.headline,
    '--icon-body': size.icon.body,
    '--icon-callout': size.icon.callout,
    '--icon-control': size.icon.control,
    '--icon-caption': size.icon.caption,
    '--icon-footnote': size.icon.footnote,
    '--icon-subline': size.icon.subline,
    // Motion — shared durations + easing so every transition reads as one system.
    '--duration-fast': duration.fast,
    '--duration-dropdown': duration.dropdown,
    '--duration-base': duration.base,
    '--duration-slow': duration.slow,
    '--ease-base': easing.baseEase,
    '--ease-snap': easing.baseSnap,
    // Stacking — the steps plain CSS consumes, single-sourced from stack.ts; add more as consumers appear.
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
