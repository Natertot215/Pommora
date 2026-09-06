export const cx = (...parts: Array<string | false | undefined>): string =>
  parts.filter(Boolean).join(' ')
