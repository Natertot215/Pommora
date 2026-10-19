export const KEY_FORMATS = [
  'Match Title',
  'lowercase',
  'UPPERCASE',
  'kebab-case',
  'PascalCase',
  'camelCase',
  'snake_case',
  'Train-Case',
  'UPPER_SNAKE_CASE',
  'UPPER-KEBAB-CASE',
] as const
export type KeyFormat = (typeof KEY_FORMATS)[number]

export type FormatChange = { key_format: KeyFormat } | { value_format: KeyFormat }

export const DEFAULT_KEY_FORMAT: KeyFormat = KEY_FORMATS[0]

export const isKeyFormat = (v: unknown): v is KeyFormat =>
  (KEY_FORMATS as readonly unknown[]).includes(v)

const LOWER = /\p{Ll}/u
const UPPER = /\p{Lu}/u

/** A label's words: split at spaces, hyphens, and underscores, before an uppercase letter that follows a lowercase one, and before one that follows an uppercase letter and precedes a lowercase one (`XMLHttp` is `XML` and `Http`); every other mark stays inside its word. */
function splitWords(label: string): string[] {
  const words: string[] = []
  for (const chunk of label.split(/[\s_-]+/)) {
    const chars = Array.from(chunk)
    let word = ''
    for (const [i, c] of chars.entries()) {
      const prev = chars[i - 1] ?? ''
      const hump = LOWER.test(prev) || (UPPER.test(prev) && LOWER.test(chars[i + 1] ?? ''))
      if (UPPER.test(c) && hump) {
        words.push(word)
        word = ''
      }
      word += c
    }
    if (word) words.push(word)
  }
  return words
}

const lower = (w: string): string => w.toLowerCase()
const upper = (w: string): string => w.toUpperCase()

const capital = (w: string): string => {
  const [first = '', ...rest] = Array.from(w.toLowerCase())
  // A letter that uppercases to two, as `ﬁ` to `FI`, keeps only the first capital.
  const [head = '', ...tail] = Array.from(first.toUpperCase())
  return head + tail.join('').toLowerCase() + rest.join('')
}

const joined =
  (separator: string, word: (w: string, i: number) => string) =>
  (label: string): string =>
    splitWords(label).map(word).join(separator)

const FORMAT: Record<KeyFormat, (label: string) => string> = {
  'Match Title': (label) => label,
  lowercase: lower,
  UPPERCASE: upper,
  'kebab-case': joined('-', lower),
  PascalCase: joined('', capital),
  camelCase: joined('', (w, i) => (i ? capital(w) : lower(w))),
  snake_case: joined('_', lower),
  'Train-Case': joined('-', capital),
  UPPER_SNAKE_CASE: joined('_', upper),
  'UPPER-KEBAB-CASE': joined('-', upper),
}

export const formatKey = (label: string, format: KeyFormat = DEFAULT_KEY_FORMAT): string =>
  FORMAT[format](label.normalize('NFC')).normalize('NFC')

export const spellingsOf = (label: string): string[] => KEY_FORMATS.map((f) => formatKey(label, f))
