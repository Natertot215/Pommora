export type GovernedLayer = 'context' | 'property'

const SIGIL: Record<GovernedLayer, readonly [string, string]> = {
  context: ['(', ')'],
  property: ['<', '>'],
}

const SIGIL_ENTRIES = Object.entries(SIGIL) as [GovernedLayer, readonly [string, string]][]

/** Reserved for system-assigned roles — a user name may not start with it. */
export const RESERVED_NAME_PREFIX = '$'

export const KEY_REFUSAL = {
  empty: 'A name cannot be empty.',
  reservedPrefix: `A name cannot start with ${RESERVED_NAME_PREFIX}.`,
  duplicate: (name: string) => `A property named "${name}" already exists.`,
} as const

export function wrapKey(layer: GovernedLayer, name: string): string {
  const [open, close] = SIGIL[layer]
  return `${open}${name}${close}`
}

/** Pass `layer` to scope it: a layer-blind check lets one layer's rewrite claim the other's
 *  keys, and a Context and a property may legally share a name. */
export function isGovernedKey(key: string, layer?: GovernedLayer): boolean {
  if (layer) return key.startsWith(SIGIL[layer][0])
  return SIGIL_ENTRIES.some(([, [open]]) => key.startsWith(open))
}

/** Positional strip, so a name containing the closing glyph round-trips. The layer comes back
 *  with the name — callers that govern one layer must check it. */
export function parseGovernedKey(key: string): { layer: GovernedLayer; name: string } | null {
  for (const [layer, [open, close]] of SIGIL_ENTRIES) {
    if (key.length > open.length + close.length && key.startsWith(open) && key.endsWith(close)) {
      return { layer, name: key.slice(open.length, -close.length) }
    }
  }
  return null
}

/** Applied once at write, so an untrimmed or denormalized name never reaches disk — which is what
 *  lets key parsing stay a plain positional strip with no normalization of its own. */
export function normalizePropertyName(raw: string): string {
  return raw.trim().normalize('NFC')
}

export function invalidPropertyName(name: string): boolean {
  const n = normalizePropertyName(name)
  return !n || n.startsWith(RESERVED_NAME_PREFIX)
}
