### Editor Parity

A deterministic before-and-after check of MarkdownPM in the real app. It launches a built instance of Pommora on its own userData, its own debug port (`9444`), and a fresh copy of `~/Test` with fixture pages written into it, so the live app, its port (`9333`), and every real Nexus stay untouched. It drives the instance over CDP through the real input chain and records three things per run:

- **Render:** every rendered line of four fixture pages, as runs of text with the style that actually paints them (color, weight, style, size, family, the decoration and background showing through from ancestors), widgets as boxes, and line heights. The page is scrolled end to end, and a screenshot is taken at each step with the caret hidden and the pointer parked.
- **Behavior:** typing a fence or `$$` and pressing Enter and undo, undo and redo, checkbox toggles and whether their DOM survives a keystroke, a list drag by the glyph, a heading fold and unfold with the animation sampled, a table cell edit, citation renumbering and the caret stepping over a marker, and an embed tile surviving a keystroke.
- **Latency:** the editor's own update per keystroke, typed mid-page, on a 2,500-line page with blank lines and one without.

#### Use

```
./worktree.sh <commit> <dir>       # a detached, built worktree of <commit>
./twice.sh before before2 <dir>    # two runs of one build: must match exactly (0 lines, 0 behaviors differ)
./launch.sh <label> <dir> 9444 && node run.mjs <label> 9444; ./stop.sh 9444
node compare.mjs <a> <b>           # results/<a>-vs-<b>.md: every differing line, screenshot, behavior, latency
node expect.mjs <before> <after>   # the Incremental Scan verdict; exits 1 on any failure
```

A screenshot within 200 pixels of its twin counts as the same picture: glyphs split across different spans land a sub-pixel apart, and two runs of one build match exactly. Results and launch state land in `results/` and `run/`, both ignored. Remove a worktree with `git worktree remove --force <dir>` from the main checkout.
