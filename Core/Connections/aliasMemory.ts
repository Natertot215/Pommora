export function rememberAlias(worn: string[], alias: string): string[] | null {
  const words = alias.trim()
  if (!words || worn[0] === words) return null
  return [words, ...worn.filter((a) => a !== words)]
}

export function forgetAlias(worn: string[], alias: string): string[] | null {
  return worn.includes(alias) ? worn.filter((a) => a !== alias) : null
}
