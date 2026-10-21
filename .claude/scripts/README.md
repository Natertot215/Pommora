## Scripts

`check-atlas.mjs` verifies the token ledger: every `**SOURCE:**`-tagged table in `// Features` must
agree with the code files its SOURCE line names — each backticked token in a row's second column and
each literal value in its third must appear in those files. `UIX/Theme`'s `theme-vars.css.ts`,
`colors.ts` and `color.css.ts` are an implicit source for every `--var` handle, since the theme
republishes hashed tokens under stable names. Exit 0 means the tables agree; drift is listed per
table.

`Option Picker Drive/live-drive.mjs` drives the option mutations the value picker offers, and the
Property Frame's option editor's share of them — creation from the footer, blank and duplicate
refusals, drag reorder, the right-click menu's Style and Edit Option, the editor's Clear and Remove
with the Items each names, the popup's rename, color, appearance and icon, and the host's own blank
refusal — against the real app, on the Table, Cards, mass-assign, and Properties-panel surfaces
alike, and asserts each one in `.nexus/properties.json`, the page files and the view's sidecar. It
seeds `Collection A/Set Alpha` with its properties, view, and pages on debug port 9343.

`Text Property Drive/live-drive.mjs` drives the Text property end to end against the real app, in
four groups that follow the phases that built it: the catalog and the inline field (decoding a
foreign number or list, the spellings each commit writes, sort, filter, and the cell menu's Clear);
the value surfaces (live connections, the pen, the glance, and Link's own-page heading) on the
Table, both Card formats, and the Properties panel; the index and the rename cascade reaching the
links inside a value; and TextPane (keys, autocomplete, formatting, the native menu, every
way it saves, and style parity with the page body). It takes the groups to run as arguments —
`node live-drive.mjs 1 2` — and asserts each step in the page files, the view sidecar, the DOM, or
a channel's reply. It seeds `Collection A/Set Alpha` with its properties, views, and `Drive …` pages
on debug port 9353.

`Metadata Drive/live-drive.mjs` drives MetadataV3's exact metadata identity against the real app as a matrix of
every behavior the decisions guarantee, in nine groups: groups 1 to 8 follow the plan phase of their number through
the host channels the interface calls (Space order by id, exact keys and their renames, exact words and filters,
counts, the label and key registry, the journal and its cascades, the Key and Value Formats with adoption, and the
restore re-spell), asserting page bytes, Space sidecars, `properties.json`, the views, View Tiles, Matrix filter, and
Collection caches, the journal slot, and what the table draws and filters; group 9 drives each surface by real
gesture (the Metadata leaf, the value picker, the format rows and their counted confirmation, the Trash browser, and
a Space's Properties panel). `MATRIX.md` beside it holds the dimensions it crosses, what it prunes and why, and the
decision each case pins. It takes the groups to run as arguments — `node live-drive.mjs 1 2` — seeds each group's
own properties, pages, Contexts, and Spaces in `Collection A/Set Alpha`, `Collection B/Set Alpha`, and `~/Test`'s
Contexts on debug port 9363, and exits non-zero on any failed check.

`Alias Drive/live-drive.mjs` drives alias management end to end, in six groups: the host's alias
edits over the `mutate` channel (add, rename, move, and forget, case folding, the title refused,
two edits fired together, and a Link value remembering the alias it newly shows); the page's Aliases
row and its pane in the page dropdown and the PageWindow's side pane (the draft, renames by
double-click and the row menu, × and the row menu's Delete, and reorder by drag and keyboard); the
body picker's alias stage in the page body, a TextPane, and a table cell (the single click held for
the double-click window, keyboard picks, drag reorder, edits that return the caret to the slot, and
leaving an authored slot); Excluded Directories
and Open In Preview; the option editor's draft and Filter's ×; and the hot paths timed twenty times
each beside the page stage of `[[` as a control. Every gesture is measured as well as asserted: how
many contents each file it touches passes through, gesture to DOM and to disk, layout, style, script,
and long-task cost, all written to `metrics.json` beside the screenshots and printed as a table.
It takes the groups to run as arguments — `node live-drive.mjs 1 3` — and `--against <metrics.json>`
prints each gesture's change from an earlier run; with `POMMORA_DRIVE_REPO` pointing at a worktree
from `editor-parity/worktree.sh`, group 6 times that build instead, skipping the Aliases row a build
before it lacks. It seeds `Collection A/Set Alpha` with its properties, a table view, and `Drive …`
pages on debug port 9373.

`Path Links Drive/live-drive.mjs` drives Path Links end to end, in eight groups that follow the
plan's phases: the read path (every path, tail, `.md`, heading, relative, and case spelling in both
syntaxes, drawn in a page body, a markdown table's resting and editing cells, a Text value at rest and
in TextPane, a Link value at rest and in its field, and the Properties panel, plus the Link field's
commit, sort, filter, the link menu, and File values left as files); the index's link keys and
generation; the writers and the picker; one search; the click rule; the in-app re-spell across
renames, moves, folder renames, collisions, Space values, and markdown tiles; the outside-move lane,
made with direct writes to `~/Test` and a closed-app rename across a relaunch; and the Trash's strip,
record, restore, and repair. A ninth group runs each mark, by its chord and by the editor menu's
Format row, over a wikilink, an aliased wikilink, a path-and-heading wikilink, and a markdown
link's label and destination, with selections inside, across, and into each link and a caret
inside it, asserting the mark wraps the whole link and comes back off from inside it. Each item
names the decision it proves and the phase that owns it, and an item owned by a phase later than
`POMMORA_PL_LANDED` (default 1) prints `AWAIT` and leaves the exit code alone, so the drive runs whole at every phase. It takes the groups to run as arguments —
`node live-drive.mjs 1 6` — and `scale` opens `~/Benchmark-Medium` (from `make-benchmark-nexus.mjs`),
seeds a Twin in every Set, a page of fifty path links, and a path Link value on every page of its first
Collection, and times the Link column's open, the decoration build on caret moves and edits, and a
native caret move. It seeds `Collection A/Set Alpha` and its neighbors with real duplicates and
`PL …` pages on debug port 9383, and exits non-zero on any failed check a landed phase owns.

`Archive Drive/live-drive.mjs` drives the Archive end to end against the real app, in seven groups
that follow the plan's phases, 1 to 6B: the lift and the carry of excluded folders and the asset
directory; the bundle format both stores share, the exact place a restore returns to, and its
step-aside past the disk; the Archive's reach into the content index and every cascade while the
tree, search, and the Matrix leave it out; the archive, restore, and delete ops, the open pass, and a
Set's carry across Collections; the chrome the Trash and the Archive share; archiving from the menus
and its settings; and ArchiveView, the reader window, and the action label's bar. `MATRIX.md` beside
it holds each group's cases and the decision each proves. It takes the groups to run as arguments —
`node live-drive.mjs 1 6B` — seeds each group's own Sets, pages, and settings in `~/Test`'s
`Collection A` and puts the settings back, on debug port 9393, and exits non-zero on any failed check.

The drives share `drive-harness.mjs`, which builds the app, backs up `~/Test`, launches the build
with its own userData and the drive's debug port, writes a screenshot of each state to
`$POMMORA_DRIVE_SHOTS` (a per-drive folder in the system temp directory otherwise), and restores
`~/Test` when the run ends or is interrupted. A run never takes focus or sends input through the
system: the app's main process starts paused on its inspector (the drive's port plus one), where the
harness patches its windows to show without activating the app or taking clicks, and records each
native menu rather than drawing it, so a drive reads the menu's rows and chooses one by its labels,
running the row's own click. Chromium's backgrounding switches and DevTools focus emulation keep the
window behaving as the frontmost one, and every press and click goes through DevTools.
`POMMORA_DRIVE_REPO` builds and launches another checkout in place of this one. Its `COPY` table holds
the refusals and the confirmation the drives assert by their worded text.
Its `measure` runs one gesture under a watch: a worker thread polls the named files every 5 ms and
counts their distinct contents, an in-page probe times the gesture's first input to the DOM change
that shows it and the frame after, and the DevTools performance counters and long tasks give its
render cost. Its `attach` connects to an instance already running on a debug port instead, with
nothing to build, back up, or restore.

`nexus-watch.mjs` attaches to an app already running with a debug port and reads a Nexus as data:
the registry's definitions with their options, how many files each definition resolves, a
Collection's assigned properties, and the values its pages hold through `view:loadValues`. Given a
gesture — one channel call, or an outside edit of a page's frontmatter key as another editor would
make — it runs it and prints every value that moved, polling until the Nexus is still.

`make-benchmark-nexus.mjs` builds a deterministic benchmark Nexus at one of four sizes (`small`, `medium`, `large`, `xlarge`, default `medium`) into `~/Benchmark-<Size>`. Before building, it sweeps every earlier benchmark Nexus (each size and the legacy `~/Benchmark`) along with its index database under the Pommora userData folder, and it refuses to touch an existing folder that it didn't write. It uses only Node's built-in modules.

`check-atlas.mjs` runs before every commit through the versioned git hook `../hooks/pre-commit`. Its
partner `../hooks/post-commit` runs the Studio dashboard's `sync.mjs`, which folds the commit into
Pommora's line ledger on the Studio dashboard and pushes `active`. Because they are native git hooks
rather than tool-side ones, they see every commit — a terminal, an editor, or any agent — not only
the ones made through a particular tool. Git looks for hooks under `.git/hooks` by default, so one
command per clone points it at the versioned directory instead:

```
git config core.hooksPath .claude/hooks
```
