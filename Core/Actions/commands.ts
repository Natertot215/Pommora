import { commandIsCtrl } from '@pommora/uix/Interactions/chords'

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
  'toggle-matrix': 'cmd+shift+m',
  'toggle-iteration': 'cmd+shift+t',
  search: 'cmd+f',
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

/** Carried by the app menu, whose accelerators take the keystroke before the window sees it. */
export const MENU_COMMANDS = [
  'new-tab',
  'new-page',
  'toggle-sidebar',
] as const satisfies readonly CommandId[]

export type MenuCommand = (typeof MENU_COMMANDS)[number]

export const KEYED_COMMANDS = [
  'toggle-ribbon',
  'toggle-nav',
  'toggle-matrix',
  'toggle-iteration',
  'search',
  'next-tab',
  'previous-tab',
  'undo-value',
] as const satisfies readonly CommandId[]

export type KeyedCommand = (typeof KEYED_COMMANDS)[number]

export const COMMAND_IDS = Object.keys(DEFAULT_COMMANDS) as CommandId[]

const NAMED_KEYS: Record<string, readonly [accelerator: string, keyBinding: string]> = {
  plus: ['Plus', '+'],
  space: ['Space', 'Space'],
  arrowup: ['Up', 'ArrowUp'],
  arrowdown: ['Down', 'ArrowDown'],
  arrowleft: ['Left', 'ArrowLeft'],
  arrowright: ['Right', 'ArrowRight'],
  escape: ['Esc', 'Escape'],
  enter: ['Enter', 'Enter'],
  tab: ['Tab', 'Tab'],
  backspace: ['Backspace', 'Backspace'],
  delete: ['Delete', 'Delete'],
  home: ['Home', 'Home'],
  end: ['End', 'End'],
  pageup: ['PageUp', 'PageUp'],
  pagedown: ['PageDown', 'PageDown'],
  ...Object.fromEntries(
    Array.from({ length: 12 }, (_, i) => [`f${i + 1}`, [`F${i + 1}`, `F${i + 1}`]]),
  ),
}

const isKeyName = (k: string): boolean => k.length === 1 || Object.hasOwn(NAMED_KEYS, k)

interface Chord {
  key: string
  cmd: boolean
  ctrl: boolean
  alt: boolean
  shift: boolean
}

const chords = new Map<string, Chord | null>()

export function chordOf(spec: string): Chord | null {
  const known = chords.get(spec)
  if (known !== undefined) return known
  const parts = spec
    .toLowerCase()
    .replace(/\+\+$/, '+plus')
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean)
  const key = parts.pop()
  const chord: Chord | null =
    key && isKeyName(key)
      ? {
          key,
          cmd: parts.includes('cmd'),
          ctrl: parts.includes('ctrl'),
          alt: parts.includes('alt'),
          shift: parts.includes('shift'),
        }
      : null
  chords.set(spec, chord)
  return chord
}

export interface KeyPress {
  key: string
  code: string
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
}

const keyNameOf = (key: string): string =>
  key === ' ' ? 'space' : key === '+' ? 'plus' : key.toLowerCase()

const physicalKeyOf = (code: string): string | undefined =>
  /^(?:Key|Digit)(.)$/.exec(code)?.[1].toLowerCase()

export function matchesCommand(spec: string | undefined, e: KeyPress): boolean {
  const chord = spec ? chordOf(spec) : null
  if (!chord) return false
  const mods = commandIsCtrl()
    ? e.ctrlKey === (chord.cmd || chord.ctrl) && !e.metaKey
    : e.metaKey === chord.cmd && e.ctrlKey === chord.ctrl
  const typed = keyNameOf(e.key) === chord.key
  const symbol = e.key.length === 1 && e.key.toLowerCase() === e.key.toUpperCase()
  const shift = e.shiftKey === chord.shift || (typed && symbol && e.shiftKey)
  const key = typed || (e.altKey && !/^[ -~]$/.test(e.key) && physicalKeyOf(e.code) === chord.key)
  return mods && e.altKey === chord.alt && shift && key
}

function spell(
  chord: string,
  mod: string,
  join: string,
  form: 0 | 1,
  char: (k: string) => string,
): string {
  const c = chordOf(chord)
  if (!c) return chord
  const parts: string[] = []
  if (c.cmd) parts.push(mod)
  if (c.ctrl) parts.push('Ctrl')
  if (c.alt) parts.push('Alt')
  if (c.shift) parts.push('Shift')
  parts.push(Object.hasOwn(NAMED_KEYS, c.key) ? NAMED_KEYS[c.key][form] : char(c.key))
  return parts.join(join)
}

export const toAccelerator = (chord: string): string =>
  spell(chord, 'CmdOrCtrl', '+', 0, (k) => k.toUpperCase())

export const toKeyBinding = (chord: string): string => spell(chord, 'Mod', '-', 1, (k) => k)
