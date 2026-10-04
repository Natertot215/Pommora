## Scripts

`loc.py` counts the app's real code lines per area — TypeScript, TSX and CSS across the `Core`,
`UIX`, `Desktop`, `Sync` and `Mobile` workspaces, with comments, blank lines, tests, type shims,
build configuration and the `Dashboard` excluded. Run it bare for the working tree, or with
`--history` for one sample per day of the branch. Both forms emit every area in stack order
alongside a file census — per-area source files, and the whole tree split into source, tests and
config — and `--history` also carries the swatch colors. Each day's sample holds six arrays per area:
the source lines; three disjoint groups among them — the import and export lines (import statements,
re-exports and export lists, and stylesheet imports), then the remaining lines of stylesheets (`.css`
and `.css.ts`), then the bracket-only lines (`}`, `);`, `/>`, `</div>` and the like); the comment
lines dropped beside them; and the code lines of the area's test files, so the dashboard folds each
group in or out without re-measuring. A file's kind is decided by `classify`: a name carrying
`.test.` or `.spec.`, or a path under a testing or fixtures folder, is a test; build and tooling
files, the Vite and Vitest configuration and setup, and the `.d.ts` shims are config and stay out of
every count; the rest of the TypeScript, TSX and CSS is source. `--history` credits every file to the
area of the path it holds today, following the branch's renames back through each day, so a change to
the area map re-attributes the whole history and the earlier samples stay comparable; each area's
pre-monorepo prefixes only place the files deleted before the monorepo.

`loc.py --update` folds the tree being committed into `Dashboard/Ledger/loc-history.json`, the file
the dashboard page imports at build time. The series holds one sample per day, so a commit touches
exactly one row — measuring the index's own tree answers it in a fraction of a second, where
`--history` re-walks every day of the branch. It reads the index rather than the working tree, so
uncommitted work is never counted against a commit that doesn't contain it, and a commit that moved
no code leaves the file untouched.

`loc.py --rebuild` re-walks the branch and rewrites the JSON from scratch — the run for when the area
map or the counted groups change.

`comment-ledger.mjs` measures the comment mass of `Core`, `UIX` and `Desktop`'s TypeScript and
proves a stripping pass touched nothing else. `--snapshot` writes `comment-baseline.json` — per-file
comment characters, comment count, and a hash of the file's non-trivia token stream. `--verify`
re-measures against it, reports the reduction per directory, and exits non-zero naming any file
whose token stream moved; because whitespace is trivia and never enters the hash, a Biome reformat
cannot mask a real edit. It also pins the count of each tool-read directive (`biome-ignore`, `KNOB`,
`@vitest-environment`), whose deletion the token hash cannot see. `comment-units.json` divides the
tree into work units of roughly equal comment mass; `--unit N` prints one unit's file list and
character floor, and passing the same id to `--verify` scopes the check to it.

`comment-manifest.mjs` run bare is the comment-line census: every source and stylesheet file in the
three workspaces with the number of lines its comments occupy, and the list of any above the
twenty-line cap. Given a base revision it instead lists every substantial comment a stripping pass
deleted outright, so the deletions can be read rather than trusted, and reports the `{}` a deleted
JSX comment leaves behind. A second argument scopes it to a unit, a third raises the character floor
on what counts as substantial.

`check-atlas.mjs` verifies the token ledger: every `**SOURCE:**`-tagged table in `// Features` must
agree with the code files its SOURCE line names — each backticked token in a row's second column and
each literal value in its third must appear in those files. `UIX/Theme`'s `theme-vars.css.ts`,
`colors.ts` and `color.css.ts` are an implicit source for every `--var` handle, since the theme
republishes hashed tokens under stable names. Exit 0 means the tables agree; drift is listed per
table.

`loc.py` and `check-atlas.mjs` run before every commit through the versioned git hook
`../hooks/pre-commit`, which copies the codebase audit into `Dashboard/Audit/audit.md`, runs
`loc.py --update`, stages both files into the commit, and runs `check-atlas.mjs`. Its partner
`../hooks/post-commit` realigns the index with what the commit carried and pushes `active`, which
deploys the Dashboard. Because they are native git hooks rather than tool-side ones, they see every
commit — a terminal, an editor, or any agent — not only the ones made through a particular tool. Git
looks for hooks under `.git/hooks` by default, so one command per clone points it at the versioned
directory instead:

```
git config core.hooksPath .claude/hooks
```
