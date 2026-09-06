// Modifiers are exact — a spec without shift rejects a shifted press — so overlapping bindings
// can't double-fire.

interface Chord {
  key: string
  cmd: boolean
  ctrl: boolean
  alt: boolean
  shift: boolean
}

// A spec is a string from the commands map, and every press asks the same handful of them the same
// question. Parsing per press meant a split, two array passes and a Set allocated on every keystroke
// the editor takes — the one thing a keydown path must not do.
const chords = new Map<string, Chord | null>()

function chordOf(spec: string): Chord | null {
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

export function matchesCommand(spec: string | undefined, e: KeyboardEvent): boolean {
  const chord = spec ? chordOf(spec) : null
  if (!chord) return false
  return (
    e.metaKey === chord.cmd &&
    e.ctrlKey === chord.ctrl &&
    e.altKey === chord.alt &&
    e.shiftKey === chord.shift &&
    e.key.toLowerCase() === chord.key
  )
}
