import { chordOf } from '@pommora/uix/Interactions/chords'

/** The `commands` object in `.nexus/settings.json`; an absent id falls back to its default here. */
export const DEFAULT_COMMANDS = {
  'new-tab': 'cmd+n',
  'new-page': 'cmd+shift+n',
  reload: 'cmd+r',
  'toggle-sidebar': 'cmd+\\',
  'actual-size': 'cmd+0',
  'zoom-in': 'cmd+plus',
  'zoom-in-alias': 'cmd+=',
  'zoom-out': 'cmd+-',
  'toggle-ribbon': 'cmd+t',
  'toggle-nav': 'cmd+o',
  'toggle-iteration': 'cmd+shift+t',
  'next-tab': 'ctrl+tab',
  'previous-tab': 'ctrl+shift+tab',
  'undo-value': 'cmd+z',
  // Does the opposite of what the Pages settings say a plain paste does.
  'paste-inverse': 'cmd+shift+v',
  'format:bold': 'cmd+b',
  'format:italic': 'cmd+i',
  'format:strikethrough': 'cmd+shift+x',
  'format:highlight': 'cmd+l',
  'format:inlineCode': 'cmd+e',
  'format:link': 'cmd+k',
  'format:connection': 'cmd+shift+k',
} satisfies Record<string, string>

export type CommandId = keyof typeof DEFAULT_COMMANDS

export type Commands = Record<CommandId, string>

export const COMMAND_IDS = Object.keys(DEFAULT_COMMANDS) as CommandId[]

function spell(chord: string, mod: string, join: string, key: (k: string) => string): string {
  const c = chordOf(chord)
  if (!c) return chord
  const parts: string[] = []
  if (c.cmd) parts.push(mod)
  if (c.ctrl) parts.push('Ctrl')
  if (c.alt) parts.push('Alt')
  if (c.shift) parts.push('Shift')
  parts.push(key(c.key))
  return parts.join(join)
}

export const toAccelerator = (chord: string): string =>
  spell(chord, 'CmdOrCtrl', '+', (k) => k.charAt(0).toUpperCase() + k.slice(1))

export const toKeyBinding = (chord: string): string => spell(chord, 'Mod', '-', (k) => k)
