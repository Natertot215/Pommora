import { globalStyle } from '@vanilla-extract/css'
import { DEFAULT_ACCENT } from '@shared/types'
import { vars as colorVars } from './color.css'
import { font } from './typography.css'
import { DISCLOSURE_INDENT, DROP_LINE_INSET, FOLD_GUTTER, size } from './size.css'
import { TINT_STEPS } from './tint'
import { duration, easing } from './motion'
import { stack } from './stack'

// Bridge: expose the (hashed) vanilla-extract tokens as stable-named CSS custom
// properties, so plain CSS (the showcase chrome) can reference them via var(--…)
// instead of hardcoding the values — one source of truth across .ts and .css.
globalStyle(':root', {
  vars: {
    // Primitives — the base palette every grey/white tone derives from.
    '--system-grey': colorVars.color.system.grey,
    '--system-white': colorVars.color.system.white,
    '--system-black': colorVars.color.system.black,
    // Tint scale — opacity steps applied to a base color (color-mix). Step values only.
    '--tint-primary': `${TINT_STEPS.primary}%`,
    '--tint-secondary': `${TINT_STEPS.secondary}%`,
    '--tint-tertiary': `${TINT_STEPS.tertiary}%`,
    '--tint-quaternary': `${TINT_STEPS.quaternary}%`,
    '--tint-solid': `${TINT_STEPS.solid}%`,
    '--label-primary': colorVars.color.label.primary,
    '--label-secondary': colorVars.color.label.secondary,
    '--label-tertiary': colorVars.color.label.tertiary,
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
    // heading↔rows, banner↔body, editor heading↔content). One global source so the seam is uniform
    // app-wide; consume as a full border shorthand: `border-bottom: var(--border-heading)`.
    '--border-heading': '1.75px solid var(--separator-border)',
    // Box seam — the border an outlined box/card draws around itself (gallery + page cards, the icon
    // picker's favorites strip). One global source so the outline weight is uniform app-wide; consume
    // as a full border shorthand: `border: var(--border-cell)`.
    '--border-cell': '1.5px solid var(--separator-border)',
    // The pill radius — larger than any box that wears it, so both ends resolve to semicircles
    // whatever the height. One name for every capsule: tabs, carets, progress bars, segmented
    // controls, the outliner rail.
    '--radius-full': '999px',
    // Over-image legibility scrim for a title/search/icon sitting on a banner cover — one source for the
    // banner title, the NavView search, and the editor's banner overlay (text-shadow / drop-shadow).
    '--banner-shadow': '#0000008c',
    // Interaction states — a system-grey wash, hover lighter than selected.
    '--state-hover': colorVars.color.state.hover,
    '--state-selected': colorVars.color.state.selected,
    '--state-muted': colorVars.color.state.muted, // black de-emphasis veil (dimming)
    // Ghost — the de-emphasis applied to a thing being reordered (table rows, editor blocks/list items):
    // a fade to the same tint MarkdownPM's drag-source uses. 
    '--state-ghost': 'var(--tint-primary)',
    // A structurally-present but inert control's dim. An opacity, like --state-ghost.
    '--state-disabled': '0.5',
    // The dim a card wears while its own lifted clone floats alongside it — deliberately gentler
    // than --state-ghost, which fades a source that has no clone to stand in for it.
    '--state-drag': '0.85',
    // Drag insertion line — the drop-target marker (accent line + leading dot) shared by every drop-line
    // DnD surface: table rows/bands AND the settings-pane property reorder. 
    '--drag-line': 'var(--accent)',
    '--drop-line-thickness': '2px',
    '--drop-dot-size': '7px',
    '--drop-line-inset': `${DROP_LINE_INSET}px`,
    // List outline (the nested-run rail) — THE shared rail primitive: MarkdownPM's outliner guides
    // and the Grouping pane's hierarchy rail consume these knobs; each surface owns only its
    // positioning math.
    '--list-outline-width': '2px',
    '--list-outline-color': 'var(--separator-segment)',
    '--list-outline-radius': 'var(--radius-full)',
    '--list-outline-gap': '3px',
    // Accent: a pointer, never a baked color. The static seed is the default
    // spectrum solid (DEFAULT_ACCENT); applyAccent overrides --accent at runtime
    // from settings — any spectrum color, or the OS accent. -fill is a tint
    // of whatever --accent currently is; tinted accent text IS --accent itself.
    '--accent': colorVars.color.solid[DEFAULT_ACCENT],
    '--accent-fill': 'color-mix(in srgb, var(--accent) 15%, transparent)',
    // Active stroke — the accent-tint border COLOR every "this is the live one" outline wears
    // (hovered page embeds, the active table cell, the open gallery card, the handle menu's title
    // field). Color only, one global source; each surface keeps its own border width.
    '--accent-stroke': 'color-mix(in srgb, var(--accent) var(--tint-secondary), transparent)',
    // The same stroke a notch stronger — worn while a surface is being actively manipulated, so a
    // resize reads hotter than the hover that revealed it (SurfacePM's blocks, MarkdownPM's page
    // tiles). Color only; each surface keeps its own border width.
    '--accent-stroke-hot': 'color-mix(in srgb, var(--accent) var(--tint-primary), transparent)',
    '--accent-text': 'var(--accent)',
    // The OS/system accent, always reflected (applySystemAccent overrides it at
    // runtime from the OS, independent of the Pommora --accent setting). Seeded
    // with the default solid so SSR/cold paint has a value.
    '--system-accent': colorVars.color.solid[DEFAULT_ACCENT],
    // Semantic link colors (labels side, not tints): external links wear the OS
    // accent, internal connections wear the Pommora accent; code is systemRed.
    '--link': 'var(--system-accent)',
    '--connection': 'var(--accent)',
    '--code': `color-mix(in srgb, ${colorVars.color.solid.red} 85%, transparent)`,
    // Refusal / failure text, wherever a surface reports one.
    '--error': colorVars.color.solid.red,
    '--font-family': font.family,
    // Weight ladder — so plain CSS single-sources the same numbers as the text styles.
    '--weight-standard': font.weight.standard,
    '--weight-emphasized': font.weight.emphasized,
    '--weight-semibold': font.weight.semibold,
    '--weight-bold': font.weight.bold,
    // Type sizes plain CSS needs (single-sourced from the scale); add more as consumers appear.
    '--text-title3-size': font.scale.title3.size,
    '--text-caption-size': font.scale.caption.size,
    '--text-subline-size': font.scale.subline.size,
    // The per-level disclosure inset every hierarchy steps by (sidebar, table nesting, panes).
    '--disclosure-indent': `${DISCLOSURE_INDENT}px`,
    // The fold/grip lane the editor, table views, block tiles, and embeds all carve from the content
    // inset. `-base` is the unscaled width so a scaling host (embeds) can rebuild --fold-gutter from
    // it without restating the number.
    '--fold-gutter-base': `${FOLD_GUTTER}px`,
    '--fold-gutter': 'var(--fold-gutter-base)',
    // Masked-glyph assets shared across module boundaries: the 6-dot drag grip (lucide grip-vertical,
    // read by MarkdownPM's rail grips AND SurfacePM's block handle) and the fold chevron
    // (lucide chevron-right, a CSS mask because it paints on a line ::before — an <Icon> can't).
    '--grip-glyph': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='9' cy='12' r='1'/%3E%3Ccircle cx='9' cy='5' r='1'/%3E%3Ccircle cx='9' cy='19' r='1'/%3E%3Ccircle cx='15' cy='12' r='1'/%3E%3Ccircle cx='15' cy='5' r='1'/%3E%3Ccircle cx='15' cy='19' r='1'/%3E%3C/svg%3E")`,
    '--fold-chevron-mask': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m9 18 6-6-6-6'/%3E%3C/svg%3E")`,
    // The same chevron a stroke step lighter — the codeblock language chrome's bracket.
    '--code-chevron-mask': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m9 18 6-6-6-6'/%3E%3C/svg%3E")`,
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
    '--icon-xs': size.icon.xs,
    '--icon-sm': size.icon.sm,
    '--icon-md': size.icon.md,
    '--icon-lg': size.icon.lg,
    '--icon-xl': size.icon.xl,
    // Motion — shared durations + easing so every transition reads as one system.
    '--duration-fast': duration.fast,
    '--duration-dropdown': duration.dropdown,
    '--duration-base': duration.base,
    '--duration-slow': duration.slow,
    '--disclosure': duration.disclosure,
    '--ease-standard': easing.standard,
    '--ease-in-out': easing.inOut,
    '--ease-out': easing.out,
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
