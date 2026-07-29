// The one owner of Pommora's reserved frontmatter syntax: which glyphs wrap which layer, how a key
// is built and read, what a name may not be, and what a refusal says. Every consumer reads from
// here, so changing a glyph is a one-line edit.
//
// Neither glyph is a YAML flow indicator, so a wrapped key writes plain and unquoted and what
// Pommora emits is byte-identical to what a person would type by hand. Swapping SIGIL to a pair
// that IS an indicator (`[`/`{`) still works — the serializer quotes those on its own — so the
// pair is a genuine one-line decision. Nothing outside this file may hardcode a glyph; every
// consumer builds and reads keys through wrapKey/parseGovernedKey, and the tests derive their
// fixtures from wrapKey so they follow a swap automatically.
// No fs, no React: both processes import it.

export type GovernedLayer = 'context' | 'property'

const SIGIL: Record<GovernedLayer, readonly [string, string]> = {
  context: ['(', ')'],
  property: ['<', '>'],
}

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

/** Any wrapped key, malformed ones included — governance is by shape, so a root rewrite still
 *  sweeps a key it cannot parse. Pass `layer` to scope it: a layer-blind check lets one layer's
 *  rewrite claim the other's keys, and a Context and a property may legally share a name. */
export function isGovernedKey(key: string, layer?: GovernedLayer): boolean {
  const pairs = layer ? [SIGIL[layer]] : Object.values(SIGIL)
  return pairs.some(([open]) => key.startsWith(open))
}

/** Positional strip, so a name containing the closing glyph round-trips. The layer comes back
 *  with the name — callers that govern one layer must check it. */
export function parseGovernedKey(key: string): { layer: GovernedLayer; name: string } | null {
  for (const [layer, [open, close]] of Object.entries(SIGIL) as [
    GovernedLayer,
    readonly [string, string],
  ][]) {
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
