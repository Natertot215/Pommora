// Plain data, apart from the CodeMirror wiring that loads them, so the pure decoration layer can ask what a word resolves to without pulling an editor into itself.

interface CodeLang {
  name: string
  alias: readonly string[]
}

/** Ordered as the fence words read rather than by family — this is a list someone scans for the language they are about to write. */
export const CODE_LANGS = [
  { name: 'JavaScript', alias: ['js', 'javascript', 'jsx', 'mjs', 'cjs'] },
  { name: 'TypeScript', alias: ['ts', 'typescript', 'tsx', 'mts', 'cts'] },
  { name: 'JSON', alias: ['json', 'jsonc'] },
  { name: 'YAML', alias: ['yaml', 'yml'] },
  { name: 'CSS', alias: ['css'] },
  { name: 'HTML', alias: ['html', 'htm'] },
  { name: 'Markdown', alias: ['markdown', 'md'] },
  { name: 'Swift', alias: ['swift'] },
  { name: 'Python', alias: ['python', 'py'] },
  { name: 'Go', alias: ['go', 'golang'] },
  { name: 'Rust', alias: ['rust', 'rs'] },
  { name: 'Ruby', alias: ['ruby', 'rb'] },
  { name: 'Java', alias: ['java'] },
  { name: 'Kotlin', alias: ['kotlin', 'kt', 'kts'] },
  { name: 'Scala', alias: ['scala'] },
  { name: 'C', alias: ['c', 'h'] },
  { name: 'C++', alias: ['cpp', 'c++', 'cc', 'cxx', 'hpp', 'hh'] },
  { name: 'C#', alias: ['csharp', 'cs', 'c#'] },
  { name: 'Shell', alias: ['shell', 'sh', 'bash', 'zsh'] },
  { name: 'PowerShell', alias: ['powershell', 'ps1'] },
  { name: 'SQL', alias: ['sql'] },
  { name: 'XML', alias: ['xml', 'svg'] },
  { name: 'TOML', alias: ['toml'] },
  { name: 'Dockerfile', alias: ['dockerfile', 'docker'] },
  { name: 'Lua', alias: ['lua'] },
  { name: 'Perl', alias: ['perl', 'pl', 'pm'] },
  { name: 'Haskell', alias: ['haskell', 'hs'] },
  { name: 'Clojure', alias: ['clojure', 'clj', 'cljs', 'cljc', 'edn'] },
  { name: 'Erlang', alias: ['erlang', 'erl'] },
  { name: 'Julia', alias: ['julia', 'jl'] },
  { name: 'R', alias: ['r'] },
  { name: 'Groovy', alias: ['groovy', 'gradle'] },
  { name: 'Sass', alias: ['sass', 'scss'] },
  { name: 'Nginx', alias: ['nginx'] },
  { name: 'Protobuf', alias: ['protobuf', 'proto'] },
  { name: 'CMake', alias: ['cmake'] },
  { name: 'Properties', alias: ['properties', 'ini'] },
] as const satisfies readonly CodeLang[]

export type CodeLangName = (typeof CODE_LANGS)[number]['name']

const DIFF_WORD =
  /^(?:(?:diff|patch)(?:(?:[-/|\\]|\s+)(\S+))?|(\S+?)(?:[-/|\\]|\s+)(?:diff|patch))(?:\s|$)/

/** A path's file names its language by its extension, or by its whole name when it has none, as `Dockerfile` does. */
function fileTerm(word: string): string {
  const file = word.slice(Math.max(word.lastIndexOf('/'), word.lastIndexOf('\\')) + 1)
  return file.slice(file.lastIndexOf('.') + 1)
}

/** The one reading of a fence's info string: the language its code colors as, and whether it draws as a diff — `diff` or `patch` alone, or joined to a language by `-`, `/`, `\`, `|`, or a space on either side. Past that, only the first word counts, and a path or filename there names its language by its extension, a `.diff` or `.patch` file drawing as a diff. A null name selects no parse, and the fence wears no language tag. */
export function codeFence(info: string): { name: CodeLangName | null; diff: boolean } {
  const text = info.trim().toLowerCase()
  const m = DIFF_WORD.exec(text)
  const lang = fileTerm(m?.[1] ?? m?.[2] ?? text.split(/\s/, 1)[0])
  const named = CODE_LANGS.find(
    (l) => l.name.toLowerCase() === lang || l.alias.some((a) => a === lang),
  )
  return { name: named?.name ?? null, diff: m !== null || lang === 'diff' || lang === 'patch' }
}
