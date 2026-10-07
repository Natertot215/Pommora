// Plain data, apart from the CodeMirror wiring that loads them, so the pure decoration layer can ask what a word resolves to without pulling an editor into itself.

interface CodeLang {
  name: string
  alias: readonly string[]
}

/** Ordered as the fence words read rather than by family — this is a list someone scans for the language they are about to write. */
export const CODE_LANGS = [
  { name: 'JavaScript', alias: ['js', 'javascript', 'jsx'] },
  { name: 'TypeScript', alias: ['ts', 'typescript', 'tsx'] },
  { name: 'JSON', alias: ['json'] },
  { name: 'YAML', alias: ['yaml', 'yml'] },
  { name: 'CSS', alias: ['css'] },
  { name: 'HTML', alias: ['html'] },
  { name: 'Markdown', alias: ['markdown', 'md'] },
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
] as const satisfies readonly CodeLang[]

export type CodeLangName = (typeof CODE_LANGS)[number]['name']

const DIFF_WORD = /^(?:(?:diff|patch)(?:[-/|](.+))?|(.+)[-/|](?:diff|patch))$/

/** The one reading of a fence word: the language its code colors as, and whether it draws as a diff — `diff` or `patch` alone, or joined to a language by `-`, `/`, or `|` on either side. A null name selects no parse, and the fence wears no language tag. */
export function codeFence(info: string): { name: CodeLangName | null; diff: boolean } {
  const word = info.trim().toLowerCase()
  const m = DIFF_WORD.exec(word)
  const lang = m ? (m[1] ?? m[2]) : word
  const named = CODE_LANGS.find(
    (l) => l.name.toLowerCase() === lang || l.alias.some((a) => a === lang),
  )
  return { name: named?.name ?? null, diff: m !== null }
}
