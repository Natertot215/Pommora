// How a typed codeblock's tag reads. The tag is a CodeMirror widget building raw DOM, so it mounts
// an <svg> rather than a React icon — the path data is inlined for the handful of languages that
// carry a mark, because the icon sets are thousands of glyphs and this is a dozen.
//
// A language absent here draws its name alone, which is the intended look rather than a gap: the
// brand sets have no mark for a Ruby or a Haskell, and an invented one would say less than the word
// beside it already does.

/** One language's tag. The glyph is the body of a 24×24 viewBox; `label` overrides the name shown,
 *  and `null` shows none at all — for a mark that already draws the wordmark itself. */
export interface CodeTag {
  glyph: string
  label?: string | null
}

/** Keyed by the name a language's roster entry carries. */
export const CODE_TAGS: Readonly<Record<string, CodeTag>> = {
  JavaScript: {
    glyph:
      '<path d="M20 4l-2 14.5l-6 2l-6 -2l-2 -14.5l16 0"/><path d="M7.5 8h3v8l-2 -1"/><path d="M16.5 8h-2.5a.5 .5 0 0 0 -.5 .5v3a.5 .5 0 0 0 .5 .5h1.423a.5 .5 0 0 1 .495 .57l-.418 2.93l-2 .5"/>',
  },
  TypeScript: {
    glyph:
      '<path d="M15 17.5c.32 .32 .754 .5 1.207 .5h.543c.69 0 1.25 -.56 1.25 -1.25v-.25a1.5 1.5 0 0 0 -1.5 -1.5a1.5 1.5 0 0 1 -1.5 -1.5v-.25c0 -.69 .56 -1.25 1.25 -1.25h.543c.453 0 .887 .18 1.207 .5"/><path d="M9 12h4"/><path d="M11 12v6"/><path d="M21 19v-14a2 2 0 0 0 -2 -2h-14a2 2 0 0 0 -2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2 -2"/>',
  },
  JSON: {
    glyph:
      '<path d="M20 16v-8l3 8v-8"/><path d="M15 8a2 2 0 0 1 2 2v4a2 2 0 1 1 -4 0v-4a2 2 0 0 1 2 -2"/><path d="M1 8h3v6.5a1.5 1.5 0 0 1 -3 0v-.5"/><path d="M7 15a1 1 0 0 0 1 1h1a1 1 0 0 0 1 -1v-2a1 1 0 0 0 -1 -1h-1a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1h1a1 1 0 0 1 1 1"/>',
  },
  CSS: {
    glyph:
      '<path d="M20 4l-2 14.5l-6 2l-6 -2l-2 -14.5l16 0"/><path d="M8.5 8h7l-4.5 4h4l-.5 3.5l-2.5 .75l-2.5 -.75l-.1 -.5"/>',
  },
  HTML: {
    glyph:
      '<path d="M20 4l-2 14.5l-6 2l-6 -2l-2 -14.5l16 0"/><path d="M15.5 8h-7l.5 4h6l-.5 3.5l-2.5 .75l-2.5 -.75l-.1 -.5"/>',
  },
  Swift: {
    glyph:
      '<path d="M20.547 15.828c1.33 -4.126 -1.384 -9.521 -6.047 -12.828c-.135 -.096 2.39 6.704 1.308 9.124c-2.153 -1.454 -4.756 -3.494 -7.808 -6.124l-.5 2l-3.5 -1c4.36 4.748 7.213 7.695 8.56 8.841c-4.658 2.089 -10.65 -.978 -10.56 -.841c1.016 1.545 6 6 11 6c2 0 3.788 -.502 4.742 -1.389c.005 -.005 .432 -.446 1.378 -.17c.504 .148 1.463 .667 2.88 1.559v-1.507c0 -1.377 -.515 -2.67 -1.453 -3.665"/>',
  },
  Markdown: {
    glyph:
      '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  },
  Python: {
    glyph:
      '<path d="M12 9h-7a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h3"/><path d="M12 15h7a2 2 0 0 0 2 -2v-4a2 2 0 0 0 -2 -2h-3"/><path d="M8 9v-4a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v5a2 2 0 0 1 -2 2h-4a2 2 0 0 0 -2 2v5a2 2 0 0 0 2 2h4a2 2 0 0 0 2 -2v-4"/><path d="M11 6l0 .01"/><path d="M13 18l0 .01"/>',
  },
  Go: {
    glyph:
      '<path d="M15.695 14.305c1.061 1.06 2.953 .888 4.226 -.384c1.272 -1.273 1.444 -3.165 .384 -4.226c-1.061 -1.06 -2.953 -.888 -4.226 .384c-1.272 1.273 -1.444 3.165 -.384 4.226"/><path d="M12.68 9.233c-1.084 -.497 -2.545 -.191 -3.591 .846c-1.284 1.273 -1.457 3.165 -.388 4.226c1.07 1.06 2.978 .888 4.261 -.384a3.669 3.669 0 0 0 1.038 -1.921h-2.427"/><path d="M5.5 15h-1.5"/><path d="M6 9h-2"/><path d="M5 12h-3"/>',
  },
  Rust: {
    glyph:
      '<path d="M10.139 3.463c.473 -1.95 3.249 -1.95 3.722 0a1.916 1.916 0 0 0 2.859 1.185c1.714 -1.045 3.678 .918 2.633 2.633a1.916 1.916 0 0 0 1.184 2.858c1.95 .473 1.95 3.249 0 3.722a1.916 1.916 0 0 0 -1.185 2.859c1.045 1.714 -.918 3.678 -2.633 2.633a1.916 1.916 0 0 0 -2.858 1.184c-.473 1.95 -3.249 1.95 -3.722 0a1.916 1.916 0 0 0 -2.859 -1.185c-1.714 1.045 -3.678 -.918 -2.633 -2.633a1.916 1.916 0 0 0 -1.184 -2.858c-1.95 -.473 -1.95 -3.249 0 -3.722a1.916 1.916 0 0 0 1.185 -2.859c-1.045 -1.714 .918 -3.678 2.633 -2.633a1.914 1.914 0 0 0 2.858 -1.184"/><path d="M8 12h6a2 2 0 1 0 0 -4h-6v8v-4"/><path d="M19 16h-2a2 2 0 0 1 -2 -2a2 2 0 0 0 -2 -2h-1"/><path d="M9 8h-4"/><path d="M5 16h4"/>',
  },
  'C#': {
    glyph:
      '<path d="M10 9a3 3 0 0 0 -3 -3h-.5a3.5 3.5 0 0 0 -3.5 3.5v5a3.5 3.5 0 0 0 3.5 3.5h.5a3 3 0 0 0 3 -3"/><path d="M16 7l-1 10"/><path d="M20 7l-1 10"/><path d="M14 10h7.5"/><path d="M21 14h-7.5"/>',
    label: null,
  },
  Shell: {
    glyph: '<path d="M5 7l5 5l-5 5"/><path d="M12 19l7 0"/>',
    label: 'Command',
  },
  SQL: {
    glyph:
      '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M5 20.25c0 .414 .336 .75 .75 .75h1.25a1 1 0 0 0 1 -1v-1a1 1 0 0 0 -1 -1h-1a1 1 0 0 1 -1 -1v-1a1 1 0 0 1 1 -1h1.25a.75 .75 0 0 1 .75 .75"/><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"/><path d="M18 15v6h2"/><path d="M13 15a2 2 0 0 1 2 2v2a2 2 0 1 1 -4 0v-2a2 2 0 0 1 2 -2"/><path d="M14 20l1.5 1.5"/>',
    label: null,
  },
  TOML: {
    glyph:
      '<path d="M1.499 8h3"/><path d="M2.999 8v8"/><path d="M8.5 8a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1 -3 0v-5a1.5 1.5 0 0 1 1.5 -1.5"/><path d="M13 16v-8l2 5l2 -5v8"/><path d="M20 8v8h2.5"/>',
    label: null,
  },
  Dockerfile: {
    glyph:
      '<path d="M22 12.54c-1.804 -.345 -2.701 -1.08 -3.523 -2.94c-.487 .696 -1.102 1.568 -.92 2.4c.028 .238 -.32 1 -.557 1h-14c0 5.208 3.164 7 6.196 7c4.124 .022 7.828 -1.376 9.854 -5c1.146 -.101 2.296 -1.505 2.95 -2.46"/><path d="M5 10h3v3h-3l0 -3"/><path d="M8 10h3v3h-3l0 -3"/><path d="M11 10h3v3h-3l0 -3"/><path d="M8 7h3v3h-3l0 -3"/><path d="M11 7h3v3h-3l0 -3"/><path d="M11 4h3v3h-3l0 -3"/><path d="M4.571 18c1.5 0 2.047 -.074 2.958 -.78"/><path d="M10 16l0 .01"/>',
  },
}
