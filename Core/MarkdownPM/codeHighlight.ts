// Colors live in markdown-pm.css, scoped under .codeblock so a stray tag outside a fence styles nothing. A bare fence selects no language and stays the plain mono block.
import {
  HighlightStyle,
  LanguageDescription,
  LanguageSupport,
  StreamLanguage,
  syntaxHighlighting,
  syntaxTree,
} from '@codemirror/language'
import type { Range } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view'
import { styleTags, tags as t } from '@lezer/highlight'
import { CODE_LANGS } from './Engine/codeLangs'

/** A legacy stream mode dressed as the language support a description hands back. */
const stream = (mode: Promise<unknown>): Promise<LanguageSupport> =>
  mode.then((m) => new LanguageSupport(StreamLanguage.define(m as never)))

const loadMarkdown = (): Promise<LanguageSupport> =>
  Promise.all([import('@codemirror/lang-markdown'), import('@codemirror/lang-yaml')]).then(
    ([md, yml]) =>
      // The GFM base carries task lists and tables; the frontmatter wrapper hands a leading `---` block to YAML, so its keys land on the same seat a yaml fence uses.
      yml.yamlFrontmatter({
        content: md.markdown({
          base: md.markdownLanguage,
          extensions: [
            {
              // The six markdown marks share one `processingInstruction` tag, which collapses a heading's `#`, a bullet, and a backtick into one color. Re-tagging the three that need their own seat is the only way to separate them: a HighlightStyle matches tags, and the tag is a parser fact.
              props: [
                styleTags({
                  CodeMark: t.monospace,
                  ListMark: t.special(t.list),
                  TaskMarker: t.special(t.atom),
                  // YAML's plain scalars carry `content` too, and those do take the string color; a paragraph gets its own tag so it can stay body text.
                  Paragraph: t.special(t.content),
                }),
              ],
              // A same-named block parser takes the built-in's slot. GFM ends a task marker on a space or tab alone, which leaves `- [ ]:` reading as plain text; a colon closes it here too. The body is the built-in's, which is not exported.
              parseBlock: [
                {
                  name: 'TaskList',
                  leaf: (cx, leaf) =>
                    /^\[[ xX]\][ \t:]/.test(leaf.content) && cx.parentType().name === 'ListItem'
                      ? {
                          nextLine: () => false,
                          finish(cx, leaf) {
                            cx.addLeafElement(
                              leaf,
                              cx.elt('Task', leaf.start, leaf.start + leaf.content.length, [
                                cx.elt('TaskMarker', leaf.start, leaf.start + 3),
                                ...cx.parser.parseInline(leaf.content.slice(3), leaf.start + 3),
                              ]),
                            )
                            return true
                          },
                        }
                      : null,
                },
              ],
            },
          ],
        }),
      }),
  )

/** The specifier is written out per entry rather than built from the name: only a literal one is a chunk the bundler can split — from a template, all thirty-odd modes would land in the main bundle. */
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
  Markdown: loadMarkdown,
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

/** A name the loaders don't know would be a language the fence recognizes and then fails to parse, so the pairing is tested rather than trusted. */
export const codeLanguages = CODE_LANGS.map(({ name, alias }) =>
  LanguageDescription.of({ name, alias: [...alias], load: LOADERS[name] }),
)

export const CODE_LOADER_NAMES = Object.keys(LOADERS)

const CHECK_INK = Decoration.mark({ class: 'syntax-md-check' })

/** `[x]` arrives from the parser as one token, so the check character can only be separated from its brackets after the parse. */
const checkMarks = (view: EditorView): DecorationSet => {
  const marks: Range<Decoration>[] = []
  for (const { from, to } of view.visibleRanges)
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (n) => {
        if (n.name === 'TaskMarker') marks.push(CHECK_INK.range(n.from + 1, n.to - 1))
      },
    })
  return Decoration.set(marks)
}

const taskMarkerInk = ViewPlugin.fromClass(
  class {
    deco: DecorationSet
    constructor(view: EditorView) {
      this.deco = checkMarks(view)
    }
    update(u: ViewUpdate): void {
      // Every fence language is a dynamic import, so the nested parse that first produces these nodes lands in a transaction that changed neither the document nor the viewport.
      if (u.docChanged || u.viewportChanged || syntaxTree(u.startState) !== syntaxTree(u.state))
        this.deco = checkMarks(u.view)
    }
  },
  { decorations: (v) => v.deco },
)

const syntaxTokens = HighlightStyle.define([
  { tag: t.keyword, class: 'syntax-keyword' },
  { tag: [t.string, t.content, t.url], class: 'syntax-string' },
  { tag: [t.number, t.bool, t.null], class: 'syntax-number' },
  { tag: t.comment, class: 'syntax-comment' },
  { tag: t.meta, class: 'syntax-meta' },
  { tag: [t.propertyName, t.attributeName], class: 'syntax-property' },
  { tag: t.definition(t.propertyName), class: 'syntax-key' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], class: 'syntax-function' },
  { tag: [t.typeName, t.className, t.tagName], class: 'syntax-type' },
  // `list`, `strong` and the rest descend from `content`, and a tag with no rule of its own falls back to its base — so body text needs a seat naming it rather than no rule at all. The seat paints nothing: it exists to stop the fall to the string color that YAML's plain scalars want.
  {
    tag: [t.special(t.content), t.list, t.strong, t.emphasis, t.strikethrough],
    class: 'syntax-text',
  },
  {
    tag: [t.heading1, t.heading2, t.heading3, t.heading4, t.heading5, t.heading6],
    class: 'syntax-md-heading',
  },
  { tag: t.monospace, class: 'syntax-md-raw' },
  { tag: t.special(t.list), class: 'syntax-md-list' },
  { tag: t.quote, class: 'syntax-md-quote' },
  { tag: t.special(t.atom), class: 'syntax-md-task' },
  { tag: t.contentSeparator, class: 'syntax-md-rule' },
  { tag: t.processingInstruction, class: 'syntax-md-mark' },
  { tag: t.labelName, class: 'syntax-md-info' },
])

export const codeHighlight = [syntaxHighlighting(syntaxTokens), taskMarkerInk]
