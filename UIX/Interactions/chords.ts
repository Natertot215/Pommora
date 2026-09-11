// Modifiers are exact — a spec without shift rejects a shifted press — so overlapping bindings can't double-fire.

interface Chord {
  key: string
  cmd: boolean
  ctrl: boolean
  alt: boolean
  shift: boolean
}

// Parsing per press allocated on every keystroke the editor takes.
const chords = new Map<string, Chord | null>()

export function chordOf(spec: string): Chord | null {
  const known = chords.get(spec)
  if (known !== undefined) return known
  const parts = spec
    .toLowerCase()
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean)
  const key = parts.pop()
  const chord: Chord | null = key
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

interface KeyPress {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
}

let cmdIsCtrl = false

export function setCmdModifier(commandIsCtrl: boolean): void {
  cmdIsCtrl = commandIsCtrl
}

export function isCmd(e: { metaKey: boolean; ctrlKey: boolean }): boolean {
  return cmdIsCtrl ? e.ctrlKey : e.metaKey
}

export function isSecondaryClick(e: { ctrlKey: boolean }): boolean {
  return !cmdIsCtrl && e.ctrlKey
}

export function matchesCommand(spec: string | undefined, e: KeyPress): boolean {
  const chord = spec ? chordOf(spec) : null
  if (!chord) return false
  const mods = cmdIsCtrl
    ? e.ctrlKey === (chord.cmd || chord.ctrl) && !e.metaKey
    : e.metaKey === chord.cmd && e.ctrlKey === chord.ctrl
  return (
    mods &&
    e.altKey === chord.alt &&
    e.shiftKey === chord.shift &&
    e.key.toLowerCase() === chord.key
  )
}
