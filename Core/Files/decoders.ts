import { z } from 'zod'
import { clamp, type NumberRange } from '@pommora/uix/Utilities/clamp'

// A list or map decodes element by element: one bad entry drops alone, and the rest survive.
export const eachOf = <T extends z.ZodType>(item: T) =>
  z.array(z.unknown()).transform((list) =>
    list.flatMap((x) => {
      const read = item.safeParse(x)
      return read.success ? [read.data] : []
    }),
  )

// Only a stored number takes the range; anything else fails the decode.
export const numberCheck = ({ min, max }: NumberRange, round = false) =>
  z.number().transform((n) => clamp(round ? Math.round(n) : n, min, max))

export const entriesOf = <T extends z.ZodType>(item: T) =>
  z.record(z.string(), z.unknown()).transform((map) => {
    const out: Record<string, z.output<T>> = {}
    for (const [key, value] of Object.entries(map)) {
      const read = item.safeParse(value)
      if (read.success) out[key] = read.data
    }
    return out
  })

// Decodes loose, so a key this build doesn't know rides through a rewrite, while the type is the declared shape alone, so a mistyped field fails to compile.
export const looseDecoder = <S extends z.ZodRawShape>(
  object: z.ZodObject<S>,
): z.ZodType<z.output<z.ZodObject<S>>> => object.loose()
