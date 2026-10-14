## Scripts

`pommora-dashboard.mjs` writes the data the Dashboard imports at build time. Run bare, it copies the
codebase audit into `Dashboard/Audit/audit.md` and folds the tree being committed into
`Dashboard/Ledger/loc-history.json` — the line ledger, one sample per day, so a commit touches
exactly one row. It reads the index rather than the working tree, so uncommitted work is never
counted against a commit that doesn't contain it. `--rebuild` re-walks every day of the branch and
rewrites the ledger from scratch, and a bare run does the same on its own when the area map has
changed.

The ledger counts the app's real code lines per area — TypeScript, TSX and CSS across the `Core`,
`UIX`, `Desktop`, `Sync` and `Mobile` workspaces, with comments, blank lines, tests, type shims,
build configuration and the `Dashboard` excluded — alongside a file census of per-area source files
and the whole tree split into source, tests and config. Each day's sample holds six arrays per area:
the source lines; three disjoint groups among them — the import and export lines, then the remaining
lines of stylesheets (`.css` and `.css.ts`), then the bracket-only lines (`}`, `);`, `/>`, `</div>`
and the like); the comment lines dropped beside them; and the code lines of the area's test files, so
the dashboard folds each group in or out without re-measuring. A name carrying `.test.` or `.spec.`,
or a path under a testing or fixtures folder, is a test; build and tooling files, the Vite and Vitest
configuration and setup, and the `.d.ts` shims are config. The history credits every file to the area
of the path it holds today, following the branch's renames back through each day, so the earlier
samples stay comparable; each area's pre-monorepo prefixes only place the files deleted before the
monorepo.

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

`Metadata Spelling Drive/live-drive.mjs` drives how every value type reads and writes the spellings
other applications leave, one page per case: each checkbox word pair in three casings and three quote
styles, each number shape (quoted, grouped, percent, every currency symbol before or after, signed,
decimal, and the shapes the grammar refuses), and Select, Status, Multi-Select, Text, Link, File, and
Space values held bare, single-quoted, double-quoted, in another casing, or as flow and block lists.
It reads each value as the table draws it, asserts that registering the properties leaves every page
byte-identical, writes each case and asserts the exact bytes it leaves, unticks every checkbox, and
runs the page, option, Space, and property renames over held spellings. It seeds `Collection A/Set
Alpha` with its properties, a table view, and `Mx …` pages on debug port 9363, and exits non-zero on
any failed check.

The drives share `drive-harness.mjs`, which builds the app, backs up `~/Test`, launches the build
with its own userData and the drive's debug port, writes a screenshot of each state to
`$POMMORA_DRIVE_SHOTS` (a per-drive folder in the system temp directory otherwise), and restores
`~/Test` when the run ends or is interrupted; it chooses native menus with System Events
keystrokes, so the terminal needs Accessibility permission, and it refuses to send a key unless the
app is frontmost. Its `attach` connects to an instance already running on a debug port instead, with
nothing to build, back up, or restore.

`nexus-watch.mjs` attaches to an app already running with a debug port and reads a Nexus as data:
the registry's definitions with their options, how many files each definition resolves, a
Collection's assigned properties, and the values its pages hold through `view:loadValues`. Given a
gesture — one channel call, or an outside edit of a page's frontmatter key as another editor would
make — it runs it and prints every value that moved, polling until the Nexus is still.

`make-benchmark-nexus.mjs` builds a deterministic benchmark Nexus at one of four sizes (`small`, `medium`, `large`, `xlarge`, default `medium`) into `~/Benchmark-<Size>`. Before building, it sweeps every earlier benchmark Nexus (each size and the legacy `~/Benchmark`) along with its index database under the Pommora userData folder, and it refuses to touch an existing folder that it didn't write. It uses only Node's built-in modules.

`pommora-dashboard.mjs` and `check-atlas.mjs` run before every commit through the versioned git hook
`../hooks/pre-commit`, which runs `pommora-dashboard.mjs`, stages the ledger and the audit into the
commit, and runs `check-atlas.mjs`. Its partner
`../hooks/post-commit` realigns the index with what the commit carried and pushes `active`, which
deploys the Dashboard. Because they are native git hooks rather than tool-side ones, they see every
commit — a terminal, an editor, or any agent — not only the ones made through a particular tool. Git
looks for hooks under `.git/hooks` by default, so one command per clone points it at the versioned
directory instead:

```
git config core.hooksPath .claude/hooks
```
