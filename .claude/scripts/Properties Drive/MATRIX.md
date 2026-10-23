## Properties Drive — Matrix

The drive's cases, derived from *Properties Restructure — Decisions & Intention* and written to the end-state contract of the Properties Restructure plan's AFTER blocks. Each group lands with the plan phase that adds it and drives the channels and surfaces the interface uses. Every check prints as `[g<group> <decisions>] <name>`, so a run reads against the tables below line for line. Each group seeds what it needs in `~/Test` and puts it back; the harness restores `~/Test` when the run ends.

#### Group 1 — What Counts as a Property

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| The header | the `Drive Filedata` table view showing `_title`, `_created_at`, `_modified_at`, its column icons on | open Collection A | `.table-head` reads Title, Creation Time, and Last Modified with `text-align-justify`, `clock-plus`, and `repeat` | F-2, F-3 |
| The sort targets | as above | view settings › Sort › Sort By | the picker offers the three with the same labels and glyphs | F-2, F-3 |
| The filter targets | as above | view settings › Filter › Filter property | the picker offers the three with the same labels and glyphs | F-2, F-3 |
| A hand-written Context definition | `prop_drive_witness` (Text) and `prop_drive_context` (`type: 'context'`) written into `.nexus/properties.json` from outside | the registry's file event | the witness reaches `tree.config.registry`; the Context definition doesn't | F-1 |
| The Properties pane | as above | view settings › Properties › All Properties | the pane holds `Drive Witness` and never `Drive Context` | F-1 |

#### Group 2 — Type Records and Looks

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| A Number column's look | `Looks Number` (Number, Percent format) in Collection A's `Looks Table` view | right-click its header | the native menu holds Style and no Format | I-4 |
| A Link column's look | `Looks Link` (Link) in the same view | right-click its header | the native menu holds Format and no Style | I-4 |
| A compact Select chip | `Looks Select` (Select, option Alpha) shown compact, and the page `Looks One` holding Alpha | open Collection A | the row's chip draws `svg.lucide-tag` | M-1 |


#### Group 3 — The Value Write's One Home

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| A several-word Select | `Status` (Select: Option 1, Option 2) and `Notes` (Text) added to Collection A; `Tidy` written by hand with `Status: [Option 1, Option 2]` | set Tidy's Notes to `edited` | the file's `Status` reads `[Option 2]` | P-1 |
| Spaces-only Text | `Spaces` written with `Notes: "   "`, `Filled` with `Notes: x` | the `Drive Values` view filters Notes Is Empty | `Spaces` draws and `Filled` doesn't | J-1 |
| A re-pick on a Space | Area One | set its Notes to `held` twice, a second apart | `_space.json`'s text and modified time are unchanged | J-9 |
