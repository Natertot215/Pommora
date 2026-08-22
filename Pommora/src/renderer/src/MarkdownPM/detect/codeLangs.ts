// The languages a fence's info word can name, as plain data. It sits apart from the CodeMirror
// wiring that loads them so the pure decoration layer can ask what a word resolves to without
// pulling an editor into itself — one roster either way, since the wiring reads this list rather
// than restating it.

/** One language: what it is called, and every word a fence may spell it with. */
export interface CodeLang {
  name: string
  alias: readonly string[]
}

/** Ordered as the fence words read rather than by family — this is a list someone scans for the
 *  language they are about to write. */
export const CODE_LANGS: readonly CodeLang[] = [
  { name: 'JavaScript', alias: ['js', 'javascript', 'jsx'] },
  { name: 'TypeScript', alias: ['ts', 'typescript', 'tsx'] },
  { name: 'JSON', alias: ['json'] },
  { name: 'YAML', alias: ['yaml', 'yml'] },
  { name: 'CSS', alias: ['css'] },
  { name: 'HTML', alias: ['html'] },
  { name: 'Swift', alias: ['swift'] },
  { name: 'Python', alias: ['python', 'py'] },
  { name: 'Go', alias: ['go', 'golang'] },
  { name: 'Rust', alias: ['rust', 'rs'] },
  { name: 'Ruby', alias: ['ruby', 'rb'] },
  { name: 'Java', alias: ['java'] },
  { name: 'Kotlin', alias: ['kotlin', 'kt'] },
  { name: 'Scala', alias: ['scala'] },
  { name: 'C', alias: ['c'] },
  { name: 'C++', alias: ['cpp', 'c++'] },
  { name: 'C#', alias: ['csharp', 'cs', 'c#'] },
  { name: 'Shell', alias: ['shell', 'sh', 'bash', 'zsh'] },
  { name: 'PowerShell', alias: ['powershell', 'ps1'] },
  { name: 'SQL', alias: ['sql'] },
  { name: 'XML', alias: ['xml'] },
  { name: 'TOML', alias: ['toml'] },
  { name: 'Dockerfile', alias: ['dockerfile', 'docker'] },
  { name: 'Diff', alias: ['diff', 'patch'] },
  { name: 'Lua', alias: ['lua'] },
  { name: 'Perl', alias: ['perl', 'pl'] },
  { name: 'Haskell', alias: ['haskell', 'hs'] },
  { name: 'Clojure', alias: ['clojure', 'clj'] },
  { name: 'Erlang', alias: ['erlang', 'erl'] },
  { name: 'Julia', alias: ['julia', 'jl'] },
  { name: 'R', alias: ['r'] },
  { name: 'Groovy', alias: ['groovy'] },
  { name: 'Sass', alias: ['sass', 'scss'] },
  { name: 'Nginx', alias: ['nginx'] },
  { name: 'Protobuf', alias: ['protobuf', 'proto'] },
  { name: 'CMake', alias: ['cmake'] },
  { name: 'Properties', alias: ['properties', 'ini'] },
]

/** The proper name a fence's info word earns — `ts` reads as TypeScript, `sh` as Shell. Null where
 *  no language answers to the word: a fence that selected no parse wears no tag. */
export function codeLanguageName(info: string): string | null {
  const word = info.trim().toLowerCase()
  if (!word) return null
  return (
    CODE_LANGS.find((l) => l.name.toLowerCase() === word || l.alias.includes(word))?.name ?? null
  )
}
