import { z } from 'zod'

const SIGIL = ['<', '>'] as const

export type ContextDef = { id: string; title: string; singular?: string; icon?: string }

/** Array position IS the display order — no ordinal semantics anywhere. */
export type ContextsRegistry = { contexts: ContextDef[] }

export const contextsRegistry: z.ZodType<ContextsRegistry> = z.looseObject({
  contexts: z.array(
    z.looseObject({
      id: z.string().min(1),
      title: z.string().min(1),
      singular: z.string().min(1).optional(),
      icon: z.string().optional(),
    }),
  ),
})

export function contextKey(title: string): string {
  return `${SIGIL[0]}${title}${SIGIL[1]}`
}

/** Positional strip, so a title containing the closing glyph round-trips. */
export function parseContextKey(key: string): string | null {
  const [open, close] = SIGIL
  return key.length > open.length + close.length && key.startsWith(open) && key.endsWith(close)
    ? key.slice(open.length, -close.length)
    : null
}

export function invalidBasename(name: string): boolean {
  const trimmed = name.trim()
  return (
    !trimmed ||
    name.includes('/') ||
    name.includes('\\') ||
    name.includes('\0') || // a NUL byte throws in fs calls — reject as a clean invalid-name
    trimmed === '.' ||
    trimmed === '..'
  )
}

export function seededRegistry(mintId: () => string): ContextsRegistry {
  return {
    contexts: [
      { id: mintId(), title: 'Areas', singular: 'Area' },
      { id: mintId(), title: 'Topics', singular: 'Topic' },
      { id: mintId(), title: 'Projects', singular: 'Project' },
    ],
  }
}

export function createSpaceLabel(def: ContextDef): string {
  return def.singular ? `New ${def.singular}` : 'New Space'
}
