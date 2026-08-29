// Language-typed codeblocks: a fence's info word (```yaml) selects a nested parse, and the
// highlighter maps its tokens to classes — colors live in Styles.css, scoped under .md-cb so a
// stray tag outside a fence styles nothing. A bare fence selects no language and stays the plain
// mono block.
import {
  HighlightStyle,
  LanguageDescription,
  LanguageSupport,
  StreamLanguage,
  syntaxHighlighting,
} from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import { CODE_LANGS } from '../Detect/codeLangs'

/** A legacy stream mode dressed as the language support a description hands back. */
const stream = (mode: Promise<unknown>): Promise<LanguageSupport> =>
  mode.then((m) => new LanguageSupport(StreamLanguage.define(m as never)))

/** How each language's parser arrives, keyed by the name the roster gives it. The specifier is
 *  written out per entry rather than built from the name: only a literal one is a chunk the bundler
 *  can split — from a template, all thirty-odd modes land in the main bundle whether or not a page
 *  ever fences one. The legacy modes ship in `@codemirror/legacy-modes`, already a dependency, so a
 *  language there costs a row here and a row in the roster. */
const LOADERS: Record<string, () => Promise<LanguageSupport>> = {
  JavaScript: () => import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: true })),
  TypeScript: () =>
    import('@codemirror/lang-javascript').then((m) =>
      m.javascript({ jsx: true, typescript: true }),
    ),
  JSON: () => import('@codemirror/lang-json').then((m) => m.json()),
  YAML: () => import('@codemirror/lang-yaml').then((m) => m.yaml()),
  CSS: () => import('@codemirror/lang-css').then((m) => m.css()),
  HTML: () => import('@codemirror/lang-html').then((m) => m.html()),
  Markdown: () => import('@codemirror/lang-markdown').then((m) => m.markdown()),
  Swift: () => stream(import('@codemirror/legacy-modes/mode/swift').then((m) => m.swift)),
  Python: () => stream(import('@codemirror/legacy-modes/mode/python').then((m) => m.python)),
  Go: () => stream(import('@codemirror/legacy-modes/mode/go').then((m) => m.go)),
  Rust: () => stream(import('@codemirror/legacy-modes/mode/rust').then((m) => m.rust)),
  Ruby: () => stream(import('@codemirror/legacy-modes/mode/ruby').then((m) => m.ruby)),
  Java: () => stream(import('@codemirror/legacy-modes/mode/clike').then((m) => m.java)),
  Kotlin: () => stream(import('@codemirror/legacy-modes/mode/clike').then((m) => m.kotlin)),
  Scala: () => stream(import('@codemirror/legacy-modes/mode/clike').then((m) => m.scala)),
  C: () => stream(import('@codemirror/legacy-modes/mode/clike').then((m) => m.c)),
  'C++': () => stream(import('@codemirror/legacy-modes/mode/clike').then((m) => m.cpp)),
  'C#': () => stream(import('@codemirror/legacy-modes/mode/clike').then((m) => m.csharp)),
  Shell: () => stream(import('@codemirror/legacy-modes/mode/shell').then((m) => m.shell)),
  PowerShell: () =>
    stream(import('@codemirror/legacy-modes/mode/powershell').then((m) => m.powerShell)),
  SQL: () => stream(import('@codemirror/legacy-modes/mode/sql').then((m) => m.standardSQL)),
  XML: () => stream(import('@codemirror/legacy-modes/mode/xml').then((m) => m.xml)),
  TOML: () => stream(import('@codemirror/legacy-modes/mode/toml').then((m) => m.toml)),
  Dockerfile: () =>
    stream(import('@codemirror/legacy-modes/mode/dockerfile').then((m) => m.dockerFile)),
  Diff: () => stream(import('@codemirror/legacy-modes/mode/diff').then((m) => m.diff)),
  Lua: () => stream(import('@codemirror/legacy-modes/mode/lua').then((m) => m.lua)),
  Perl: () => stream(import('@codemirror/legacy-modes/mode/perl').then((m) => m.perl)),
  Haskell: () => stream(import('@codemirror/legacy-modes/mode/haskell').then((m) => m.haskell)),
  Clojure: () => stream(import('@codemirror/legacy-modes/mode/clojure').then((m) => m.clojure)),
  Erlang: () => stream(import('@codemirror/legacy-modes/mode/erlang').then((m) => m.erlang)),
  Julia: () => stream(import('@codemirror/legacy-modes/mode/julia').then((m) => m.julia)),
  R: () => stream(import('@codemirror/legacy-modes/mode/r').then((m) => m.r)),
  Groovy: () => stream(import('@codemirror/legacy-modes/mode/groovy').then((m) => m.groovy)),
  Sass: () => stream(import('@codemirror/legacy-modes/mode/sass').then((m) => m.sass)),
  Nginx: () => stream(import('@codemirror/legacy-modes/mode/nginx').then((m) => m.nginx)),
  Protobuf: () => stream(import('@codemirror/legacy-modes/mode/protobuf').then((m) => m.protobuf)),
  CMake: () => stream(import('@codemirror/legacy-modes/mode/cmake').then((m) => m.cmake)),
  Properties: () =>
    stream(import('@codemirror/legacy-modes/mode/properties').then((m) => m.properties)),
}

/** The roster, each name paired with the loader that answers for it. A name the loaders don't know
 *  would be a language the fence recognizes and then fails to parse, so the pairing is tested
 *  rather than trusted. */
export const codeLanguages = CODE_LANGS.map(({ name, alias }) =>
  LanguageDescription.of({ name, alias: [...alias], load: LOADERS[name] }),
)

export const CODE_LOADER_NAMES = Object.keys(LOADERS)

const codeTokens = HighlightStyle.define([
  { tag: t.keyword, class: 'tok-kw' },
  { tag: [t.string, t.special(t.string)], class: 'tok-str' },
  { tag: [t.number, t.bool, t.null], class: 'tok-num' },
  { tag: [t.comment, t.meta], class: 'tok-com' },
  { tag: [t.propertyName, t.attributeName], class: 'tok-prop' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], class: 'tok-fn' },
  { tag: [t.typeName, t.className, t.tagName], class: 'tok-type' },
])

export const codeHighlight = syntaxHighlighting(codeTokens)
