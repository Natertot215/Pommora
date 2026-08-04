// Language-typed codeblocks: a fence's info word (```yaml) selects a nested parse, and the
// highlighter maps its tokens to classes — colors live in Styles.css, scoped under .md-cb so a
// stray tag outside a fence styles nothing. A bare fence selects no language and stays the plain
// mono block. The set is curated; adding a language is one description (plus its package).
import {
  HighlightStyle,
  LanguageDescription,
  LanguageSupport,
  StreamLanguage,
  syntaxHighlighting,
} from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

export const codeLanguages = [
  LanguageDescription.of({
    name: 'JavaScript',
    alias: ['js', 'javascript', 'jsx'],
    load: () => import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: true })),
  }),
  LanguageDescription.of({
    name: 'TypeScript',
    alias: ['ts', 'typescript', 'tsx'],
    load: () =>
      import('@codemirror/lang-javascript').then((m) =>
        m.javascript({ jsx: true, typescript: true }),
      ),
  }),
  LanguageDescription.of({
    name: 'JSON',
    alias: ['json'],
    load: () => import('@codemirror/lang-json').then((m) => m.json()),
  }),
  LanguageDescription.of({
    name: 'YAML',
    alias: ['yaml', 'yml'],
    load: () => import('@codemirror/lang-yaml').then((m) => m.yaml()),
  }),
  LanguageDescription.of({
    name: 'CSS',
    alias: ['css'],
    load: () => import('@codemirror/lang-css').then((m) => m.css()),
  }),
  LanguageDescription.of({
    name: 'HTML',
    alias: ['html'],
    load: () => import('@codemirror/lang-html').then((m) => m.html()),
  }),
  LanguageDescription.of({
    name: 'Swift',
    alias: ['swift'],
    load: () =>
      import('@codemirror/legacy-modes/mode/swift').then(
        (m) => new LanguageSupport(StreamLanguage.define(m.swift)),
      ),
  }),
]

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
