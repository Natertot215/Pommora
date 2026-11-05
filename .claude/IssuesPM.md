### Pommora Issues Index

**TOTALS**

| Total | Critical | High | Moderate | Low | Minimal |
|-------|----------|------|----------|-----|---------|
| 71 | 0 | 3 | 12 | 36 | 20 |

#### A1 • Sync & Devices

| ID                                                                                                                                                                                                              | Title                                                                                                                                                                                         | Concern  | Scale            | Origin     | Base        | Date                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------- | ---------- | ----------- | -------------------------------------------------- |
| [I-003](#I-003 • Reconnecting to a rebuilt or restored hub never re-uploads unchanged files.)                                                                                                                   | Reconnecting to a rebuilt or restored hub never re-uploads unchanged files.                                                                                                                   | High     | Medium (=🟢+10=) | Patch-Over | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |
| [I-001](#I-001 • Changes from other devices are written to whatever path the hub names, including outside the Nexus.)                                                                                           | Changes from other devices are written to whatever path the hub names, including outside the Nexus.                                                                                           | High     | Small (=🟢+12=)  | Drift      | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |
| [I-006](#I-006 • Two devices editing different items in one synced list keep only one device's edits, and a lost Context rename hides that Context's Spaces.)                                                   | Two devices editing different items in one synced list keep only one device's edits, and a lost Context rename hides that Context's Spaces.                                                   | Moderate | Medium (=🟢+40=) | Shortcut   | `0c80012cb` | **Created:** 09-26-2026<br>**Updated:** 10-25-2026 |
| [I-004](#I-004 • Renaming a page while another device's edit is in flight leaves the page at both names.)                                                                                                       | Renaming a page while another device's edit is in flight leaves the page at both names.                                                                                                       | Moderate | Small (=🟢+10=)  | Drift      | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |
| [I-005](#I-005 • Renaming a Set on one device leaves an empty ghost Set on the others.)                                                                                                                         | Renaming a Set on one device leaves an empty ghost Set on the others.                                                                                                                         | Moderate | Small (=🟢+5=)   | Drift      | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |
| [I-009](#I-009 • A non-owner device's Revoke changes the encryption key, then fails, cutting the other device off.)                                                                                             | A non-owner device's Revoke changes the encryption key, then fails, cutting the other device off.                                                                                             | Moderate | Mini (=🟢+4=)    | Drift      | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |
| [I-008](#I-008 • After a revoke, other devices keep encrypting new content with the old key.)                                                                                                                   | After a revoke, other devices keep encrypting new content with the old key.                                                                                                                   | Low      | Medium (=🟢+8=)  | Patch-Over | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |
| [I-011](#I-011 • Renaming a device that was removed from a Nexus quietly asks to join it again.)                                                                                                                | Renaming a device that was removed from a Nexus quietly asks to join it again.                                                                                                                | Low      | Medium (=🟢+12=) | Shortcut   | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |
| [I-012](#I-012 • Changing History Timeframe in Settings never reaches the sync hub.)                                                                                                                            | Changing History Timeframe in Settings never reaches the sync hub.                                                                                                                            | Low      | Medium (=🟢+12=) | Drift      | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |
| [I-002](#I-002 • A misbehaving sync hub can crash the app by sending an enormous reply.)                                                                                                                        | A misbehaving sync hub can crash the app by sending an enormous reply.                                                                                                                        | Low      | Small (=🟢+5=)   | Shortcut   | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |
| [I-007](#I-007 • A revoked device that knows the Nexus password can still unlock the new key.)                                                                                                                  | A revoked device that knows the Nexus password can still unlock the new key.                                                                                                                  | Low      | Small (±0)       | Shortcut   | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |
| [I-010](#I-010 • A device revoked while the app was closed thinks it's waiting for approval and never drops its keys.)                                                                                          | A device revoked while the app was closed thinks it's waiting for approval and never drops its keys.                                                                                          | Low      | Small (±0)       | Drift      | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |
| [I-027](#I-027 • Resetting Sync's records loads every one and deletes them one at a time, and the index's path renames and removals commit table by table.)                                                     | Resetting Sync's records loads every one and deletes them one at a time, and the index's path renames and removals commit table by table.                                                     | Low      | Small (=🟢+6=)   | Drift      | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-16-2026 |
| [I-066](#I-066 • A restore synced to another device runs again there as a hand restore, and a property cascade that device runs before a synced delete's record arrives passes the trashed page over for good.) | A restore synced to another device runs again there as a hand restore, and a property cascade that device runs before a synced delete's record arrives passes the trashed page over for good. | Low      | Small (TBD)      | Shortcut   | `88a13422e` | **Created:** 10-31-2026<br>**Updated:** 10-31-2026 |

#### A2 • MarkdownPM

| ID                                                                                                                                                                                                                | Title                                                                                                                                                                                | Concern  | Scale                   | Origin         | Base        | Date                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ----------------------- | -------------- | ----------- | -------------------------------------------------- |
| [I-014](#I-014 • Past about 8,000 lines, the footer's word and character figures re-tokenize the whole page on every typing pause and every selection change, freezing the editor for up to a second.)            | Past about 8,000 lines, the footer's word and character figures re-tokenize the whole page on every typing pause and every selection change, freezing the editor for up to a second. | High     | Small (=🟢+15=)         | Parallel Build | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-023](#I-023 • A raw-HTML opener with no closer makes every keystroke below it re-scan to the end of the document and re-tokenize everything from the opener down.)                                             | A raw-HTML opener with no closer makes every keystroke below it re-scan to the end of the document and re-tokenize everything from the opener down.                                  | Moderate | Medium (=🟢≈ +28=)      | Shortcut       | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-036](#I-036 • Scope is a three-member string read by 22 bare comparisons and 15 %60= 'page'%60 defaults, so a fourth scope silently inherits page behavior in some places and cell behavior in others.)        | Scope is a three-member string read by 22 bare comparisons and 15 `= 'page'` defaults, so a fourth scope silently inherits page behavior in some places and cell behavior in others. | Moderate | Medium (=🟢+37 to +75=) | Shortcut       | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 11-04-2026 |
| [I-034](#I-034 • Code-block coloring re-parses the whole fenced block on every keystroke inside it.)                                                                                                              | Code-block coloring re-parses the whole fenced block on every keystroke inside it.                                                                                                   | Moderate | Medium (=🟢+20=)        | Shortcut       | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |
| [I-016](#I-016 • The footer's word and character figures are a second reading of what the editor draws, and the two already disagree.)                                                                            | The footer's word and character figures are a second reading of what the editor draws, and the two already disagree.                                                                 | Low      | Medium (=🟢≈ +21=)      | Parallel Build | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-018](#I-018 • Each keystroke re-allocates every carried line intent, fence-line record, and table row below the edit just to shift their positions.)                                                           | Each keystroke re-allocates every carried line intent, fence-line record, and table row below the edit just to shift their positions.                                                | Low      | Medium (=🟢≈ +6=)       | Shortcut       | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-037](#I-037 • What kind of surface an editor sits in is spread over five uncoordinated switches, two sentinel ancestor strings, and a CSS list of host classes.)                                               | What kind of surface an editor sits in is spread over five uncoordinated switches, two sentinel ancestor strings, and a CSS list of host classes.                                    | Low      | Medium (=🟢+30=)        | Drift          | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-024](#I-024 • A %60#%60 line or a footnote run inside an HTML block still counts as a heading or as the footnotes section.)                                                                                    | A `#` line or a footnote run inside an HTML block still counts as a heading or as the footnotes section.                                                                             | Low      | Medium (=🟢≈ +72=)      | Drift          | `e3d5c1a10` | **Created:** 09-24-2026<br>**Updated:** 10-16-2026 |
| [I-017](#I-017 • A heading written with closing hashes (%60# foo #%60) keeps them in its name, so the outline, fold keys, index, and heading links read %60foo #%60 where other Markdown readers read %60foo%60.) | A heading written with closing hashes (`# foo #`) keeps them in its name, so the outline, fold keys, index, and heading links read `foo #` where other Markdown readers read `foo`.  | Low      | Small (=🟢+5=)          | Shortcut       | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-039](#I-039 • A new block or tile kind falls through to silent defaults in the grip menu and block starts.)                                                                                                    | A new block or tile kind falls through to silent defaults in the grip menu and block starts.                                                                                         | Low      | Small (=🟢+13=)         | Shortcut       | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-020](#I-020 • While the pointer is over the editor, every caret move re-measures every visible code block's language tag.)                                                                                     | While the pointer is over the editor, every caret move re-measures every visible code block's language tag.                                                                          | Low      | Mini (=🟢+2=)           | Shortcut       | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-021](#I-021 • Text that arrives from another copy of a page at the end of a folded section shows up below the fold.)                                                                                           | Text that arrives from another copy of a page at the end of a folded section shows up below the fold.                                                                                | Low      | Mini (=🟢+2=)           | Shortcut       | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-013](#I-013 • Dragging a table row, column, or column edge redraws the whole table on every mouse movement.)                                                                                                   | Dragging a table row, column, or column edge redraws the whole table on every mouse movement.                                                                                        | Low      | Mini (=🟢+4=)           | Parallel Build | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-09-2026 |
| [I-071](#I-071 • MarkdownPM's live coverage is split across five drives, so one editor change is driven five times over five launches.) | MarkdownPM's live coverage is split across five drives, so one editor change is driven five times over five launches. | Minimal | Medium (TBD) | Parallel Build | `e989eb865` | **Created:** 11-04-2026<br>**Updated:** 11-04-2026 |
| [I-038](#I-038 • The host carries one typed menu member per construct, so a new construct menu needs a new host member in three places.)                                                                          | The host carries one typed menu member per construct, so a new construct menu needs a new host member in three places.                                                               | Minimal  | Small (=🔴≈ −4=)        | Shortcut       | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-050](#I-050 • A heading rename to a heading holding a pipe turns a lone page embed into a link.) | A heading rename to a heading holding a pipe turns a lone page embed into a link. | Minimal | Small (TBD) | Drift | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |
| [I-015](#I-015 • Selection figures re-walk every table in the document on each selection change, whatever the selection covers.)                                                                                  | Selection figures re-walk every table in the document on each selection change, whatever the selection covers.                                                                       | Minimal  | Mini (=🟢+2=)           | Shortcut       | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-019](#I-019 • Every caret move rebuilds the ranges that let the caret step over an embedded tile.)                                                                                                             | Every caret move rebuilds the ranges that let the caret step over an embedded tile.                                                                                                  | Minimal  | Mini (=🟢+6=)           | Shortcut       | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-051](#I-051 • A link picked before its page's headings load keeps a heading the page may not hold.) | A link picked before its page's headings load keeps a heading the page may not hold. | Minimal | Mini (=🟢+4=) | Shortcut | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |
| [I-068](#I-068 • A table inside a list item, or followed by a fence nothing closes, is drawn over different lines than the parser reads it.) | A table inside a list item, or followed by a fence nothing closes, is drawn over different lines than the parser reads it. | Low | Small (TBD) | Drift | `f6bce02a4` | **Created:** 11-01-2026<br>**Updated:** 11-01-2026 |

#### A3 • Nexus & Data

| ID | Title | Concern | Scale | Origin | Base | Date |
| ------ | ---------------------------------------- | -------- | ------------- | --------- | --------- | --------------- |
| [I-032](#I-032 • An ID lost or damaged outside the app is replaced rather than recovered on every path but a held page's own event, and an ID two files share is answered two ways.) | An ID lost or damaged outside the app is replaced rather than recovered on every path but a held page's own event, and an ID two files share is answered two ways. | Moderate | Large (=🟢+20=) | Shortcut | `1b1ff1205` | **Created:** 10-02-2026<br>**Updated:** 10-16-2026 |
| [I-026](#I-026 • Twenty-three channels write Nexus files beside %60mutate%60, and six files can be written through both.) | Twenty-three channels write Nexus files beside `mutate`, and six files can be written through both. | Moderate | Large (±0) | Parallel Build | `e448ed46f` | **Created:** 09-27-2026<br>**Updated:** 10-25-2026 |
| [I-029](#I-029 • A page missing its ID that a folder's read finds after its own event was spent stays out of the tree until the next full read.) | A page missing its ID that a folder's read finds after its own event was spent stays out of the tree until the next full read. | Low | Medium (=🟢+10=) | Shortcut | `93baa6931` | **Created:** 10-01-2026<br>**Updated:** 10-19-2026 |
| [I-030](#I-030 • A write's reply waits behind a walk an outside change owes.) | A write's reply waits behind a walk an outside change owes. | Low | Medium (=🟢+10=) | Shortcut | `93baa6931` | **Created:** 10-01-2026<br>**Updated:** 10-29-2026 |
| [I-045](#I-045 • An app file this session never read and can't read opens as empty, so its section shows defaults and its changes are refused, some without a word.) | An app file this session never read and can't read opens as empty, so its section shows defaults and its changes are refused, some without a word. | Low | Medium (=🟢+15=) | Drift | `0c80012cb` | **Created:** 09-26-2026<br>**Updated:** 10-25-2026 |
| [I-056](#I-056 • A property's stash ages out on the page history timeframe, a setting that governs a different kind of data, so the stash likely needs a timeframe of its own.) | A property's stash ages out on the page history timeframe, a setting that governs a different kind of data, so the stash likely needs a timeframe of its own. | Low | Medium (TBD) | Shortcut | `57da5c1db` | **Created:** 10-22-2026<br>**Updated:** 10-25-2026 |
| [I-058](#I-058 • An action refused for earlier work still owed runs that cleanup unseen, so files it lets go are never named and Try Again leaves the action undone.) | An action refused for earlier work still owed runs that cleanup unseen, so files it lets go are never named and Try Again leaves the action undone. | Low | Medium (TBD) | Shortcut | `0b6857ddb` | **Created:** 10-25-2026<br>**Updated:** 10-25-2026 |
| [I-061](#I-061 • Each file a cascade writes makes the watcher re-list its whole folder, about a fifth of a property rename's main-thread time.) | Each file a cascade writes makes the watcher re-list its whole folder, about a fifth of a property rename's main-thread time. | Low | Medium (TBD) | Shortcut | `9b9c0d630` | **Created:** 10-29-2026<br>**Updated:** 10-29-2026 |
| [I-062](#I-062 • An empty Set or Collection moved out of a store by hand, or a page moved out across an index rebuild, arrives as a plain item and leaves its record-only bundle in the store for good.) | An empty Set or Collection moved out of a store by hand, or a page moved out across an index rebuild, arrives as a plain item and leaves its record-only bundle in the store for good. | Low | Medium (=🟢+23=) | Shortcut | `16067661d` | **Created:** 10-31-2026<br>**Updated:** 10-31-2026 |
| [I-028](#I-028 • An in-app create or rename of a Space, or rename of a Context, leaves the pages already tagged with its new name unlinked until each is read again.) | An in-app create or rename of a Space, or rename of a Context, leaves the pages already tagged with its new name unlinked until each is read again. | Low | Small (=🟢+10=) | Shortcut | `93baa6931` | **Created:** 10-01-2026<br>**Updated:** 10-25-2026 |
| [I-031](#I-031 • An outside edit to a page inside a folder the app just renamed or moved is lost until the page's next event.) | An outside edit to a page inside a folder the app just renamed or moved is lost until the page's next event. | Low | Small (=🟢+8=) | Shortcut | `93baa6931` | **Created:** 10-01-2026<br>**Updated:** 10-29-2026 |
| [I-047](#I-047 • Un-excluding a folder re-spells the links to every page elsewhere that shares a title with one of its pages, with a console line only on failure.) | Un-excluding a folder re-spells the links to every page elsewhere that shares a title with one of its pages, with a console line only on failure. | Low | Small (=🟢+8=) | Shortcut | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |
| [I-048](#I-048 • A heading rename and a move of the same page in one outside batch aim the heading rename's sweep at the page's old path.) | A heading rename and a move of the same page in one outside batch aim the heading rename's sweep at the page's old path. | Low | Small (=🟢+6=) | Shortcut | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |
| [I-063](#I-063 • The file identity that tells the app's own writes from outside ones and the Windows landing's write-through are unprobed off APFS, and a sync client's attribute writes move the identity.) | The file identity that tells the app's own writes from outside ones and the Windows landing's write-through are unprobed off APFS, and a sync client's attribute writes move the identity. | Low | Small (TBD) | Shortcut | `88a13422e` | **Created:** 10-31-2026<br>**Updated:** 10-31-2026 |
| [I-065](#I-065 • A Trash or Archive folder the app prunes as empty is removed whole, so a Sync arrival landing in it at that moment goes with it.) | A Trash or Archive folder the app prunes as empty is removed whole, so a Sync arrival landing in it at that moment goes with it. | Low | Small (=🟢+6=) | Shortcut | `88a13422e` | **Created:** 10-31-2026<br>**Updated:** 10-31-2026 |
| [I-052](#I-052 • A restore that lands on a taken name always renames the item coming back, and nothing chooses which side keeps the title.) | A restore that lands on a taken name always renames the item coming back, and nothing chooses which side keeps the title. | Minimal | Medium (=🟢+30=) | Shortcut | `213f95a3b` | **Created:** 10-19-2026<br>**Updated:** 10-21-2026 |
| [I-053](#I-053 • Every write to the exclusion list re-reads the Nexus, restarts the watcher, and has sync re-check, carried entries included.) | Every write to the exclusion list re-reads the Nexus, restarts the watcher, and has sync re-check, carried entries included. | Minimal | Medium (TBD) | Shortcut | `d0e31804c` | **Created:** 10-20-2026<br>**Updated:** 10-21-2026 |
| [I-064](#I-064 • A bundle folder dragged whole out of the Trash or an Archive lands as a Set named for its stamp, its item inside arriving as a plain item and its record riding along unread.) | A bundle folder dragged whole out of the Trash or an Archive lands as a Set named for its stamp, its item inside arriving as a plain item and its record riding along unread. | Minimal | Medium (=🟢+50=) | Shortcut | `88a13422e` | **Created:** 10-31-2026<br>**Updated:** 10-31-2026 |
| [I-054](#I-054 • An outside unlink within the watcher's write hold of the app's own write leaves a ghost until the next walk.) | An outside unlink within the watcher's write hold of the app's own write leaves a ghost until the next walk. | Minimal | Mini (=🔴−1=) | Shortcut | `d0e31804c` | **Created:** 10-21-2026<br>**Updated:** 10-21-2026 |
| [I-067](#I-067 • A container that leaves or comes back outside the app leaves an open Trash or Archive browser's crumbs and restore homes as they were.) | A container that leaves or comes back outside the app leaves an open Trash or Archive browser's crumbs and restore homes as they were. | Minimal | Small (TBD) | Shortcut | `72a0509ca` | **Created:** 10-31-2026<br>**Updated:** 10-31-2026 |

#### A4 • Architecture

| ID | Title | Concern | Scale | Origin | Base | Date |
| ----- | --------------------------------------------------- | -------- | -------- | ------ | --------- | ------------- |
| [I-035](#I-035 • Every call site chooses for itself whether an error is shown, logged, or dropped, and about forty host-side failures reach no one.) | Every call site chooses for itself whether an error is shown, logged, or dropped, and about forty host-side failures reach no one. | Moderate | Large (±0) | Drift | `03dde6468` | **Created:** 09-30-2026<br>**Updated:** 10-08-2026 |
| [I-033](#I-033 • Nothing in a file's location says whether it runs in the host or the window, and several files sit in another domain's folder.) | Nothing in a file's location says whether it runs in the host or the window, and several files sit in another domain's folder. | Moderate | Large (±0) | Drift | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-25-2026 |

#### A5 • Theme & UIX

| ID | Title | Concern | Scale | Origin | Base | Date |
| ----- | ----------------------------------------------- | -------- | -------- | ---------- | --------- | ------------- |
| [I-025](#I-025 • Buttons never show keyboard focus.) | Buttons never show keyboard focus. | Moderate | Mini (=🟢+4=) | Drift | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |
| [I-057](#I-057 • Telling a single click from a double-click on one element is done separately on each surface, in five different ways, with the double-click window written as a number in one place only.) | Telling a single click from a double-click on one element is done separately on each surface, in five different ways, with the double-click window written as a number in one place only. | Low | Medium (=🟢≈ +25=) | Parallel Build | `cbacb7ecb` | **Created:** 10-23-2026<br>**Updated:** 10-26-2026 |
| [I-060](#I-060 • A bundle row's menu opens only by pointer, so the Trash's Restore and Delete have no keyboard path.) | A bundle row's menu opens only by pointer, so the Trash's Restore and Delete have no keyboard path. | Low | Small (TBD) | Shortcut | `1028ed405` | **Created:** 10-26-2026<br>**Updated:** 10-26-2026 |
| [I-046](#I-046 • A row's caption in a pane that sizes to its content stays on one line and widens the pane, so the format rows carry none.) | A row's caption in a pane that sizes to its content stays on one line and widens the pane, so the format rows carry none. | Minimal | Mini (TBD) | Drift | `54e93e491` | **Created:** 10-18-2026<br>**Updated:** 10-25-2026 |
| [I-055](#I-055 • No row in a property's settings says whether it sets the property everywhere or only the current view.) | No row in a property's settings says whether it sets the property everywhere or only the current view. | Minimal | Small (TBD) | Drift | `4f63cba01` | **Created:** 10-21-2026<br>**Updated:** 10-31-2026 |
| [I-059](#I-059 • Every line row points screen readers at the drag instructions, including rows in a list that can't be dragged, where Space acts on the row instead.) | Every line row points screen readers at the drag instructions, including rows in a list that can't be dragged, where Space acts on the row instead. | Minimal | Small (TBD) | Drift | `312d63751` | **Created:** 10-26-2026<br>**Updated:** 10-31-2026 |
| [I-069](#I-069 • The pop-up that action menus, managed lists, and value pickers mount in is named and filed as a picker, though it picks nothing.) | The pop-up that action menus, managed lists, and value pickers mount in is named and filed as a picker, though it picks nothing. | Minimal | Small (TBD) | Drift | `69db9942e` | **Created:** 11-01-2026<br>**Updated:** 11-03-2026 |

#### A6 • Tiles & Embeds

| ID | Title | Concern | Scale | Origin | Base | Date |
| ----- | -------------------------------------------------- | ------- | --------- | ------- | --------- | ------------- |
| [I-022](#I-022 • In a free-text markdown tile, the footnotes divider and the footnote reveal do nothing.) | In a free-text markdown tile, the footnotes divider and the footnote reveal do nothing. | Low | Small (=🟢≈ +2=) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-042](#I-042 • A board whose saved layout can't be read opens empty, and the first new tile replaces the saved layout.) | A board whose saved layout can't be read opens empty, and the first new tile replaces the saved layout. | Low | Small (=🟢+5=) | Shortcut | `740f442e0` | **Created:** 10-04-2026<br>**Updated:** 10-16-2026 |
| [I-044](#I-044 • Two sites that run without a tree name the tile hosts' folders by hand.) | Two sites that run without a tree name the tile hosts' folders by hand. | Minimal | Small (≈ ±0) | Drift | `668e5398b` | **Created:** 10-05-2026<br>**Updated:** 10-25-2026 |
| [I-043](#I-043 • The tile shell's memo comparator lists its props by hand.) | The tile shell's memo comparator lists its props by hand. | Minimal | Small (=🔴−8=) | Shortcut | `740f442e0` | **Created:** 10-04-2026<br>**Updated:** 10-08-2026 |
| [I-049](#I-049 • A rename cascade says nothing about Space-board tiles when the Contexts registry doesn't parse.) | A rename cascade says nothing about Space-board tiles when the Contexts registry doesn't parse. | Minimal | Mini (=🟢+3=) | Drift | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |

#### A7 • Views

| ID | Title | Concern | Scale | Origin | Base | Date |
| ----- | --------------------------------------------------- | ------- | -------- | ------- | --------- | ------------- |
| [I-040](#I-040 • A new item's rename field opens one frame after its row.) | A new item's rename field opens one frame after its row. | Minimal | Small (=🟢+5=) | Drift | `93baa6931` | **Created:** 10-01-2026<br>**Updated:** 11-02-2026 |
| [I-070](#I-070 • A refused cross-band drop can keep its dropped rank, saved by another order write made while it was in flight.) | A refused cross-band drop can keep its dropped rank, saved by another order write made while it was in flight. | Minimal | Small (=🟢+8=) | Shortcut | `7852b378a` | **Created:** 11-02-2026<br>**Updated:** 11-02-2026 |

#### A8 • Matrix

| ID | Title | Concern | Scale | Origin | Base | Date |
| ------ | ---------------------------------------------------- | ------- | ------- | ------- | -------- | ------------- |
| [I-041](#I-041 • The Matrix can't be pinch-zoomed on a touchscreen.) | The Matrix can't be pinch-zoomed on a touchscreen. | Low | Small (=🟢+12=) | Premature | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-05-2026 |

---

### A1 • Sync & Devices

#### I-003 • Reconnecting to a rebuilt or restored hub never re-uploads unchanged files.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| High | Medium (=🟢+10=) | Patch-Over | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |

**Description**

Each device keeps a record of what it believes the hub already holds, and when the hub loses its history (its data folder wiped and re-created at the same address, or restored from an older backup), the device keeps trusting that record and never re-uploads unchanged files. Reconcile sees files the hub has never heard of and hands them to the ordinary push, which skips every one whose bytes still match the stale record, so only files edited afterward reach the new hub and a device joining later gets a partial Nexus with nobody told. This breaks the documented recovery path, "the hub copy is rebuilt from one device" (Decision Log B′-4), whenever the rebuilt hub keeps its address. A second device rejoining after the rebuilt hub's change counter has passed its old cursor gets no `resync` answer at all, so it never reconciles, never re-uploads its unchanged files, and misses the rebuilt hub's changes numbered at or below its old cursor. Against the fake hub that mirrors `Sync/Store/log.ts`, two files were reconciled, the hub state wiped, and `reconcile` run again, which sent zero `/store` requests and left zero hub items.[^3]

**Solution** [TBD]

Two moves, closing different gaps. In `reconcile`, drop a base row whose path has no head in the heads read before the push (`if (head === undefined) deleteBase(rel)` ahead of `toPush.push(rel)`), so the push sends it as a new write; this fixes the first device back after a wipe or a restore. Then tie the binding to the hub's history rather than its address: the key record's KDF salt is minted only when the hub's record is created (`freshKdfParams`), so `SyncScope` stores `salt` at bind, `sync:connect` treats the binding as kept only when address and salt both match, and `withKeys` compares `info.kdf.salt` with the binding before `begin` and, on a mismatch, drops every base row and resets the cursor to 0 so `begin` runs the first-bind reconcile; this fixes every later device after a wipe. A hub restored from backup keeps its salt, so a device whose old cursor it has already re-passed stays undetected until the hub issues a history epoch, and a future password change under fresh KDF parameters would trigger one harmless full reconcile.

#### I-001 • Changes from other devices are written to whatever path the hub names, including outside the Nexus.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| High | Small (=🟢+12=) | Drift | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |

**Description**

When another device's change arrives, the app writes, deletes, or moves the file at the path the hub's log names, with no check that the path stays inside the Nexus or inside the set of files sync may touch. A path like `../x` lands outside the Nexus folder, and a change into `.git/`, `.obsidian/`, or an excluded folder lands even though sync rules keep those at home; the hub rejects `..` but not `\`, so on Windows a peer's `a\..\..\x` becomes traversal. A compromised hub, or any editor device through the hub, can place any blob it holds at any path, and by naming an outside file in a delete it can make the app upload that file first, encrypted with the Nexus key every device holds. The documented promise that binding each blob to its path keeps the hub from moving ciphertext between paths holds only for decryption, since the landing path is never compared with it, and with NexusOS also an Obsidian vault, a planted `.obsidian/` plugin or `.git/config` is code that later runs on the receiving machine. Pull tests with hand-built changes landed a write for `../escaped.md` outside the Nexus root, a real page's write replayed as `../planted.md` (which still decrypts), and a write into `.git/hooks/post-commit`, because only reconcile gates arrivals through `manifestAdmits` while the live pull and `resolveStale` don't.[^1]

**Solution** [Proposed]

Add one arrival gate in `Core/Sync/Arrival`: a change lands only if `manifestAdmits(session.scope)` accepts `change.path` (and `change.from` for a rename), the path carries no `\`, and a `write` change's `path` equals its `record.path`; otherwise it's skipped, the cursor advances, and status names it. Call it at the top of `landChange` and `resolveStale`; `manifestAdmits` already rejects a leading `..` or `/`, every dot segment but a top-level `.nexus`, every `_`-prefixed folder, and every excluded folder, so it's the survivor. Add `\` to the hub's `itemPath` refusal.

#### I-006 • Two devices editing different items in one synced list keep only one device's edits, and a lost Context rename hides that Context's Spaces.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Moderate | Medium (=🟢+40=) | Shortcut | `0c80012cb` | **Created:** 09-26-2026<br>**Updated:** 10-25-2026 |

**Description**

When a synced Pommora JSON file has changed on both devices, arrival merges it key by key against the last synced copy. A key that only one side changed takes that side's value. A key that both sides changed goes whole to the newer side, and the merge descends only into objects that `mergeDepthFor` names. A list never descends, because the gate admits only plain objects and `isPlainObject` rejects arrays. So a list of items with ids merges as one value, and the losing side's items are dropped. The Sync feature doc records this as design ("a merged JSON file keeps its losing keys nowhere"), which leaves item-level merging as the only protection.

The worst case is the Contexts registry, `.nexus/contexts/contexts.json`, which merges at depth `{}` with its `contexts` list whole. Suppose one device renames a Context while the other adds, reorders, or re-icons one. If the second device's registry wins, the renamed title reverts. The folder rename still reaches every device as ordinary file renames, and the walk reads Spaces by registry title. The result is a Context whose folder no longer exists, so it shows no Spaces, next to an unregistered folder that holds all of them. Pages tagged with the new title stop resolving. None of this is captured or reported, and the renaming device cleared its note of the rename once its sweep finished, so nothing repairs it.

Smaller losses follow the same path:

- **`_tiles.json` (`tiles`):** adding a tile on one device while restyling another on the other keeps the new box in `layout` (only one side changed it). `tiles` goes to whichever side is newer, so either the restyle is lost or the new box has no entry and its file is orphaned. The box is deletable.
- **A Collection's or Set's sidecar (`views`):** editing one saved view on each device keeps only one edit.
- **The same sidecar (`properties`):** this is the schema's list of property ids. Assigning a different property on each device drops one assignment.
- **`properties.json` (`defs.<id>.select_options`, `defs.<id>.status_groups`):** `defs` merges per definition and per field, but each option list is one field, so adding an option to the same property on each device drops one.
- **`state.json` (`navigation.pinned`):** a pin made on each device drops one.

Some lists are out of scope:

- **Order lists** (`state.json` `order.*`, a sidecar's `set_order`, `properties.json` `order`) repair themselves through `resolveOrder` and `resolveRowOrder`, which append anything the kept order is missing.
- **A Space sidecar's `<Context>` and multi-value arrays, and a metadata shard's `aliases`,** already merge more finely than a page's frontmatter, which lands as a whole file.
- **`matrix.json` `filter.rules`** is a tree without ids.

Sync runs between desktops today. Two online devices converge within seconds through the long poll and a 2.5 s debounce, so the ordinary window is a device that edits while offline. A Mobile companion widens that window. In a probe of the real modules, a registry rename against an add kept `Projects` and `People` and lost `Work`. A tile add against a restyle kept `bands:[1,2]` with only `t1` in `tiles`. A sidecar's views and properties kept only the remote side, and select options kept `c` and lost `b`.[^6]

**Solution** [Proposed]

Teach `mergeKeys` one structural case. At a level above 0, when base, local and remote are all arrays whose every element is a plain object with a unique string `id`, merge item by item at `level − 1`:

- an item changed on one side takes that side
- an item changed on both sides goes to the newer side
- an addition on either side is kept
- a removal on one side stays removed unless the other side changed that item, which goes to the newer side
- order comes from the newer side, with the other side's additions appended (registry position is display order)

Any other array stays whole. Set a sidecar's `properties` to merge as a set. `mergeDepthFor` then only adds depths: `contexts: 1` for the registry, `tiles: 1` for `_tiles.json`, `views: 1` and the `properties` set for sidecars, and `navigation: 2` for `state.json`.

`tiles` stays at 1, so a tile entry merges whole: a view tile's `active` is a position in its nested `views`, and merging those views by item could point `active` at the wrong view. `layout` stays whole, which can still leave an entry with no box (invisible) or a box with no entry (deletable).

Options key on their permanent `id`, so they can merge per item too. Add one sentence to `NexusSyncPM.md`'s merge paragraph. Per-item merging refines the Concurrency decision's per-section updates the same way the per-definition and per-field merges already do. **Your call:** approval under that Locked Decision.

#### I-004 • Renaming a page while another device's edit is in flight leaves the page at both names.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Moderate | Small (=🟢+10=) | Drift | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |

**Description**

Renaming a page while another device's edit to it hasn't reached this device yet leaves the same page ID at two paths, which the duplicate-ID judge then splits into two pages. The hub refuses the rename and answers with the other device's edit at the old name, but the app moves its record to the new name anyway and settles the conflict as if that edit belonged there, so the rename is never re-sent. If this device's copy wins, the hub holds the page at both names; if the other device's copy wins, it lands at the old name and the renamed file stays behind unsynced. A local-wins stale rename left the hub with live items `['Notes/One.md', 'Notes/Renamed.md']`, because `pushRename` calls `renameBase` for every outcome (`push.ts:239`) and passes the destination to `resolveStale` with the head read at the source (`push.ts:241`).[^4]

**Solution** [Proposed]

On a stale rename, keep the base row at `from`: fetch the head's bytes, pick the winner against the bytes now at `to` with `newerSide` (capturing the loser as `resolveStale` does), land the winner at `to`, record the base at `from` under `head.seq`, and re-send the rename with that base. `renameBase` moves only on an accepted outcome.

#### I-005 • Renaming a Set on one device leaves an empty ghost Set on the others.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Moderate | Small (=🟢+5=) | Drift | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |

**Description**

Renaming a Set on one device leaves an empty folder under the old name on every other device, which Pommora reads as an empty Set. Folders don't travel through sync, only files: a Set rename sends one rename per file inside it, so each receiving device moves the files and leaves the old folder behind. Deleting nested Sets leaves the outer folder behind the same way, because a delete prunes only its immediate parent, and that prune uses a recursive remove that would take any file created there between the check and the remove. Landing `Notes/Ideas/One.md` and `_pageset.json` renamed to `Notes/Plans/` left `Notes` holding both an empty `Ideas` and `Plans`, since `landRename` has no parent cleanup and `resolveFolderKind` returns `'set'` for any nested folder.[^5]

**Solution** [Proposed]

Add one `pruneEmptyParents(root, rel)` in `land.ts` that walks up from the vacated path's parent to the first non-empty folder or the root, re-reading each folder immediately before removing it, used by both `landDelete` and `landRename`.

#### I-009 • A non-owner device's Revoke changes the encryption key, then fails, cutting the other device off.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Moderate | Mini (=🟢+4=) | Drift | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |

**Description**

Pressing Revoke on a device that isn't the Nexus owner changes the encryption key and then fails, leaving the target device approved but unable to read anything written afterward. Every approved device that holds the Nexus password sees a Revoke button on every other device; on a non-owner it first mints a new key and adds it to the hub's key ring for everyone except the target (any editor may), then asks the hub to revoke, which only the owner may do. The target never gets the new key, so once anything is written under it, every pull fails and the target stops receiving changes with no path to recover. `act` never checks this device's role before `rotateRing` appends under the editor-level `ring` route (`handlers.ts:230-237`), the owner-only `revoke` then fails with 404, and on the target `loadRing` returns only its device-wrapped entries, which lack the new key, so `decryptItem` throws `unknown-key` on every poll.[^9]

**Solution** [Literal]

In `act('revoke')`, refuse before rotating unless this device's row in `devices` has `role === 'owner'`, and hide Revoke in `NexusRows` for non-owners from the same listing.

#### I-008 • After a revoke, other devices keep encrypting new content with the old key.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Medium (=🟢+8=) | Patch-Over | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |

**Description**

Revoking a device mints a fresh content key so the revoked device can't read anything stored afterward, but only the revoking device's running session switches to it. Every other running device keeps encrypting with the old key, which the revoked device holds, until it restarts or happens to decrypt something sealed under the new key. If the revoking device then goes idle, the others can keep writing under the compromised key indefinitely, so "every store after that uses the new key" (Decision Log D-4) doesn't hold. The hub still refuses the revoked device on every route, so the gap matters only when the hub leaks blobs. `act` sets `running.ring = rotated` for the local session only (`handlers.ts:240-243`), while other devices seal with `newest(session.ring)` (`push.ts:88`), which changes only in `openRecord`'s `unknown-key` catch and at session start.[^8]

**Solution** [TBD]

The hub's `pull` reply carries the key record's `version` (it already bumps on every ring append); the session keeps the version its ring came from, and a pull answering a higher one reloads the ring (`reloaded`) before the next seal, so every running device switches within one 25-second poll. **Your call:** this is worth doing only if revocation stays cryptographic under the call in I-007.

#### I-011 • Renaming a device that was removed from a Nexus quietly asks to join it again.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Medium (=🟢+12=) | Shortcut | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |

**Description**

Renaming a device that was revoked from a Nexus puts it back in the owner's device list as a new request waiting for approval. Renaming tells the hub the new name by re-sending the full `connect` request, which also asks to join the bound Nexus, and a revoked device keeps its binding. The Cross-Device Mutation Checklist records "rename re-sends connect" as intended, but the re-join side effect isn't mentioned anywhere. `sync:renameDevice` calls `connect` with the bound `nexusId` (`handlers.ts:271`), and since a revoke deletes the membership row, the hub's `addMembership` with `ON CONFLICT DO NOTHING` inserts a new pending row.[^11]

**Solution** [Proposed]

Add a `rename` route to the one route table (`wire.ts` `RouteTable`, `canonical.ts` `ROUTES`, `Sync/wire.ts` `PATHS`/`META` with `requires: 'none'`) that only calls `upsertDevice`, and have `sync:renameDevice` use it instead of `connect`.

#### I-012 • Changing History Timeframe in Settings never reaches the sync hub.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Medium (=🟢+12=) | Drift | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |

**Description**

The hub learns the Nexus's History Timeframe only once, when the first device binds, so changing it later in Settings never reaches the hub. If the user lengthens it, the hub still deletes old versions on the original schedule, contrary to Decision E-3's rule that hub retention "follows the Nexus's History Timeframe". A search for `history_days` in `Sync/Store` finds the table definition, `insertNexus`, the row read, and the retention read but no update statement, and the route table has no route that could carry one.[^12]

**Solution** [TBD]

Carry `historyDays` on the `ring` route body, or as an owner-gated field on `info`, and write it with an `UPDATE nexus SET history_days`. The client sends it when a `settings.json` change moves `historyDays` (the `SETTINGS_REL` branch in `session.ts:137` already reacts to that file).

#### I-002 • A misbehaving sync hub can crash the app by sending an enormous reply.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (=🟢+5=) | Shortcut | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |

**Description**

A sync hub, hostile or broken, can crash the whole app by sending back a reply that never ends. The hub limits the size of every request it accepts, but the app buffers whatever the hub sends back into memory before looking at it, and the transport runs in the Electron main process. An unbounded reply takes the app down, and the session restarts on every launch. `transport.ts:26` collects chunks with `res.on('data', (chunk) => chunks.push(chunk))` and keeps no running total, and `call.ts:90` casts `JSON.parse(reply.body)` to the route's reply type with no shape check.[^2]

**Solution** [Proposed]

Add `TransportRequest.maxBytes`, set by `call` (a fixed JSON reply cap, such as 4 MiB) and by `getBlob` (`BLOB_CAP` plus `SEAL_OVERHEAD`); the transport keeps a running total and destroys the request past it. Checking the paths a reply names belongs to I-001.

#### I-007 • A revoked device that knows the Nexus password can still unlock the new key.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (±0) | Shortcut | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |

**Description**

A revoke mints a new content key and wraps it for each remaining device and for the Nexus password, but the password doesn't change, so a revoked device that holds it can unwrap the new key from the hub's key record. Every device that created or joined the Nexus by typing the password keeps it in its keychain. What actually keeps a revoked device out of content stored afterward is the hub refusing its requests, not cryptography, so the documented promise that "a revoked device can read nothing stored after its revocation" (Decision Log D-4, NexusSyncPM §The Keys) is false for any revoked device that holds the password. `rotateRing` derives its key-encryption key from the stored password and appends `wrapForPassword([raw], kek)` (`handlers.ts:177,193`), and `openWithPassword` unwraps every `holder === 'password'` entry (`keyring.ts:40-44`).[^7]

**Solution** [TBD]

Two moves are possible: restate the guarantee as hub-enforced for password holders (a doc edit in NexusSyncPM §The Keys and Decision Log D-4), or make a revoke also change the password, with `rotateRing` taking a new password and re-wrapping the whole ring under fresh KDF parameters (the re-wrap B′-1 already describes, though changing a password is deferred today because no channel carries the re-wrap); I-008 is only worth fixing under the second. **Your call:** restate the guarantee as hub-enforced for password holders (a doc edit), or make a revoke also change the password by re-wrapping the ring under fresh KDF parameters.

#### I-010 • A device revoked while the app was closed thinks it's waiting for approval and never drops its keys.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (±0) | Drift | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |

**Description**

A device revoked while the app was closed shows "Waiting for approval from another device", keeps its password and key ring in the keychain, and polls the hub every minute forever. Whether this device has been revoked is worked out in three places, three ways: a running session concludes "revoked", stops, and forgets its keys; the settings panel concludes "revoked" but only in its reply; and session start reads the same answer as "waiting for approval" and retries. A revoke deletes the membership row so every gated route answers 404 `not-found`, which `withKeys` treats as pending and retries (`session.ts:183-189`) while `pullWait` and `state` each test it with their own condition (`pull.ts:74-76`, `handlers.ts:124`).[^10]

**Solution** [Proposed]

Add one `isRevoked(host, nexusId, outcome)` in `keyring.ts` (404 `not-found` with a cached device ring), used by `pullWait`, `state`, and `withKeys`, where it runs `forgetKeys` and sets the `off/revoked` status instead of retrying. A wiped hub answers 401 for an unknown signer, so the shared check doesn't misfire on I-003's scenario.

#### I-027 • Resetting Sync's records loads every one and deletes them one at a time, and the index's path renames and removals commit table by table.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (=🟢+6=) | Drift | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-16-2026 |

**Description**

The page index (`nexus.db`, the local database that answers link, heading, and value lookups) writes a batch of page rows inside one transaction, but its path methods don't: a page or folder rename and a page or folder removal run one statement per index table, each compiled on the call and committed on its own, so the tables can disagree about a path when the app stops between them. Sync's records sit in the same store, and connecting to a new hub or disconnecting reads every record, its stored base included, then deletes each in its own commit, a cost that grows with the Nexus while the user waits on Sync's settings. `upsertPageIndexes` prepares its inserts once and wraps its rows in `inTransaction`, while `removePathIndex`, `renamePathIndex`, `removePathPrefixIndex`, and `renamePathPrefixIndex` loop over `INDEX_TABLES` with a fresh `db.prepare` each, and both `Core/Sync/handlers.ts` sites run `for (const row of readAllBases()) deleteBase(row.path)`.[^27]

**Solution** [Proposed]

Build the path methods' statements once per handle inside `contentIndexStore(db)` and wrap each method's body in `inTransaction` from `Desktop/Store/driver.ts`. Add a `clearBases()` (`DELETE FROM sync_base`) to `syncStore` and use it at both `Core/Sync/handlers.ts` sites.

#### I-066 • A restore synced to another device runs again there as a hand restore, and a property cascade that device runs before a synced delete's record arrives passes the trashed page over for good.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (TBD) | Shortcut | `88a13422e` | **Created:** 10-31-2026<br>**Updated:** 10-31-2026 |

**Description**

Sync's write tap pushes a rename at once and every other write and removal after a 2.5-second debounce. A restore moves its artifact out of the bundle and then removes the bundle, so a receiving device lands the rename first, through a plain rename its watcher hears as an outside move, while the bundle and its record still stand there; the page lane finishes it as a hand restore of its own, and the sender's own writes then land over identical bytes, leaving doubled linker writes and an extra Sync round. A delete runs the other way, writing its bundle's record before moving the artifact in, so a receiving device holds the artifact in a bundle with no record for the debounce: `storedNodes` reads no owning Collection for it, and a cascade reaching governed pages, such as a property rename or an option edit, passes the trashed page over, which keeps the old key or option once its record arrives. A sweep push orders deletes, then writes, then renames, the reverse of the live tap, so there a record lands ahead of its artifact's rename, the ordering behind I-062's Sync hazard.[^66]

**Solution** [Deferred]

Deferred by the owner until Sync's rework (Decision B-1 of the Trash & Archive Restructure's Decisions & Intention). The design: a rename either of whose ends lies in a bundle carries that bundle's pending writes and removals out of the debounce into the same push, a delete's record ahead of its rename and a restore's removal beside it, so a receiving device lands each as one change, in a live push and a sweep alike; it's the fix I-062 waits on.

### A2 • MarkdownPM

#### I-014 • Past about 8,000 lines, the footer's word and character figures re-tokenize the whole page on every typing pause and every selection change, freezing the editor for up to a second.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| High | Small (=🟢+15=) | Parallel Build | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

On a long page, each pause in typing and each change of selection freezes the editor. The figures' token cache in `subfieldStats.ts` is a module `perText(…, 8192)` FIFO, one for page text (`pageHidden`) and one for cells (`cellHidden`): a hit returns without refreshing order, and `capSet` evicts the oldest insert. A document walked top-to-bottom with more chunks than that misses every one, so a one-character edit re-tokenizes everything; `CHUNK_LINES = 40` keys a long run per line, so the unit is lines. The page figures and the selection figures share the one module cache, so each also evicts the other's chunks. `drawnLast` in `docCache.ts` already keeps "exactly what the last pass read" for the editor's own drawing, built separately. Measured after a one-character edit: `pageStats` at 3.0 ms for 4,000 lines, 5.7 ms at 8,000, 376 to 404 ms at 10,000, and 755 to 807 ms at 20,000. The triggers are the page settle (`subfieldItems` and `CitationsToggle` call `pageStats(page.body)`) and the selection listener's synchronous `rangeStats` in `MarkdownEditor`.[^14]

**Solution** [Literal]

`Engine/perText.ts` gains `perPass(derive)`, a memory across one reader's passes that reuses what the last pass derived and keeps only what it read, and `drawnLast` is rebuilt on it so one implementation remains. In `subfieldStats.ts`, a `counter()` holds one page-vocabulary and one cell-vocabulary memory per caller, since chunks and cells tokenize under different vocabularies, and `computeStats` and `rangeStats` each count through their own (`pageCount`, `rangeCount`), so the page figures and a selection never evict each other; `tableProse` takes the cell reader. An LRU refresh alone wouldn't do, since a sequential walk longer than the cap thrashes LRU the same way. Interleaved against HEAD (minimum times), a one-character edit costs 3.1 ms against 3.0 at 4,000 lines and 6.6 against 6.2 at 8,000, and 9.1 ms against 454 at 10,000 and 18.7 against 936 at 20,000. A cheaper form at +8 keeps the tokens per caller (`perPass(tokenize)`) and re-derives the hidden set on every read, at about 30 to 40% slower than HEAD below the cliff on every debounced page count and every synchronous selection change, which is why the hidden-set form is taken. `rangeCount` is one memory for every open editor's selection. Two tests join `subfieldStats.test.ts` with a transparent spy on `tokenize`: "past 8,192 lines, a one-character edit tokenizes the one line it touched" (8,200 calls instead of one without the fix), and "and a selection counted between the two passes leaves the page its memory" (red when `rangeStats` counts through `pageCount`).

#### I-023 • A raw-HTML opener with no closer makes every keystroke below it re-scan to the end of the document and re-tokenize everything from the opener down.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Moderate | Medium (=🟢≈ +28=) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

A page with a stray `<!--`, `<pre>`, `<script>`, or `<?` near the top lags heavily when typing far below it: `tokenizeChunk` measured about 115 ms per keystroke on a 4,500-line page, against 0.74 ms without the opener. `htmlBlocks` runs a raw opener to the last line when no closer arrives, `quietAt` refuses every line inside an HTML span so `rescan` widens to the end, and `chunksOver` opens the viewport chunk at the opener. The fence grammar already refuses an opener nothing closes, a documented divergence from CommonMark, and the raw-HTML pass has no such rule. `<div>`-style blocks end at a blank line and are unaffected. Enter's alias commit (`commitAliasOnEnter`) reads the scan's HTML spans through `liveSlotAt`, whose `inRawHtml` asks `spanAt(docScan(state.doc).html, …)` under **HTML Formatting**, so an unclosed opener that the scan and the parser read differently decides Enter by the scan's reading.[^23]

**Solution** [Proposed]

A raw opener whose closer never arrives ends before the next blank line (`htmlBlocks` sets the block's end through a `lastBeforeBlank` helper, as type-6 and type-7 blocks already end), a fourth intentional CommonMark divergence that joins Editor-Internals' list. The raw openers and their end conditions move beside the fence grammar in `markdownCode.ts`, with `unclosedHtmlEnd(d, span)` naming the end condition a span's opener still waits for, so the scan and the parser read one grammar. The parser is handed the same reading: `parse` rewrites an unclosed opener's line as a `<p` start of the same length, so micromark ends it at the blank line too; masking it to prose the way a lone fence marker is masked would make it a paragraph, and `htmlBlockSpans(ast)` would drop a block the scan keeps. Because a raw block now runs across blank lines only to a closer, the rescan window re-pairs it as it re-pairs a fence: `loneAbove` widens up to an unclosed opener above the window when the window holds its end condition, and `pairsBelow` widens down when the window holds an unclosed opener whose end condition appears below. A stray opener then costs the lines up to the next blank line, and everything below it scans and tokenizes as it would without the opener. `docScan.test.ts`'s "ends an opener nothing closes at the next blank line" asserts `<!--` / `x` / blank / `y` holds one span ending before the blank line, and that a `<pre>` closed across a blank line still closes; it goes red with the run-to-the-last-line loop restored. The property generator already holds unclosed `<pre>` and `<?php` lines, so the `rescan ≡ scanDoc` and chunk-by-chunk properties pin the re-pairing and the mask. The net is an estimate: this rule was typed only together with I-024, at +36 for the rule, the re-pairing, the parser masks, and three window edge guards, and the guards and the parser's lone-tag mask belong to I-024's lone-tag start condition.

#### I-036 • Scope is a three-member string read by 22 bare comparisons and 15 `= 'page'` defaults, so a fourth scope silently inherits page behavior in some places and cell behavior in others.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Moderate | Medium (=🟢+37 to +75=) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 11-04-2026 |

**Description**

A page, a table cell, and a Text value read different amounts of Markdown, and the code asks "is this the page?" or "is this the cell?" in twenty-two places across eleven files instead of asking one question about what the surface reads. Fifteen parameters default to `'page'`, so a reader that forgets to pass its scope answers from the page-shaped scan. The only capability switches are `readsLists` and `blockGestures`. A new surface would be classified one site at a time, non-page at every `=== 'page'` and page at every `=== 'cell'`, silently. Inside a cell today the readers that forgot already diverge: `lineBodyBefore` and `opensLine` strip a `> ` prefix the cell draws as prose, and `blockDrag` takes block starts from the page's vocabulary; neither is reachable from a glyph a cell draws, which is why this waits.[^36]

Inside a fence pair in a cell, the inline transforms and the cell's tokenizer agree in treating the paired lines as code, while `listLineAt` ignores the pair, so Enter continues a list line inside it. A cell and a Text value keep reading fences as they do today, and MarkdownPM.md's "fences stay literal text" is corrected to say the pair is read.

**Solution** [Deferred]

Waits for a fourth scope. One `Core/MarkdownPM/Engine/surfaces.ts` owns the scope tuple, the `MarkdownScope` type, and the capability predicates `readsLists`, `readsBlocks`, `readsTiles`, `gripKinds`, and `hasGutter`; the twenty-two compares read them, the fifteen defaults go so a forgotten scope is a compile error, the zod enum derives from the tuple, and `blockPrefix`'s two helpers and `blockDragExtension` take the scope. Typed as five switches it measured +75; as one table keyed by scope with the five capabilities as columns, about +37 with the same exhaustiveness. `smartDelete`'s page compare, which gates the tile hold and the footnote cascade, reads `readsTiles` and `readsBlocks`. Lands with I-039, whose grip table becomes `gripKinds(scope)`. `tableGuard.ts`'s paste guard and `checkboxToggleChange` also read the quote-prefixed grammar with no scope, though in a cell each starts from a glyph drawn only on an unprefixed line; they take the scope with the rest.

#### I-034 • Code-block coloring re-parses the whole fenced block on every keystroke inside it.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Moderate | Medium (=🟢+20=) | Shortcut | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |

**Description**

Code colors come from parsing each visible fenced block with its language, and the parse is remembered by the block's exact text. Any keystroke inside a block therefore misses the memory and the whole block is parsed from scratch, even when only a few of its lines are on screen, so typing in a long code block lags in proportion to the block's length. While a language is still downloading, each redraw also attaches another "loaded" callback. Parsing through the same parser cost 2.4 ms per keystroke at 100 lines, 13.1 ms at 1,000, and 38.6 ms at 3,000, since `paint` joins every line of the block and reads the tree through the text-keyed `drawnLast` while `blockParser.parse(text)` runs with no fragments.[^34]

**Solution** [TBD]

Keep the previous tree and its `TreeFragment`s per block, keyed by the opener line mapped through the transaction, and reparse with `TreeFragment.applyChanges` in block-local coordinates so an edit re-parses only around the change; or, simpler, parse only from the block's start through the viewport's last visible line. Attach one load callback per language through a module-level set of pending loads.

#### I-016 • The footer's word and character figures are a second reading of what the editor draws, and the two already disagree.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Medium (=🟢≈ +21=) | Parallel Build | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

The footer's figures come from `subfieldStats`, which keeps its own chrome reader (`proseStart`) and hidden-token table (`hiddenOf`), where the editor's hide set comes from the line intents and `tokenIntents`; and `pageStats` runs `scanDoc(body)` from scratch on every settled body string while the editor holds the stepped scan of the same text. The two readings disagree: `- [] hello`, which the editor draws as plain text, counts 5 characters instead of 10, and in a paragraph of 40 or more lines a `*…*` spanning two lines has its markers counted as text, because `CHUNK_LINES` tokenizes such a run line by line where the editor tokenizes the chunk whole.[^16]

**Solution** [Deferred]

Deferred by the owner, who kept the figures a second reading of the draw while I-014's cache replacement lands. The counts come from the editor's own derivations: a `chromeOf` reading each prose line's cached line intents replaces `proseStart`'s heading, list, quote, callout, and rule logic, the scan's `embeds` and `webpages` spans replace its lone-embed half, and `CHUNK_LINES` goes, so every chunk tokenizes whole. `hiddenOf` stays as the counter's token policy, since `tokenIntents` returns early for link, wikilink, and citation tokens, whose hides live in `decorations.ts`, and draws inline code, against the counter's contract that code counts nothing and link markers are hidden. The page figures read the open editor's held scan through a footer seam: `BodyMount` carries its view, `pageDetailCache.heldView(path)` returns the first mounted editor of a path, `heldStats(view, range?)` in `docCache.ts` counts from it through per-view token memories, and the Subfield page becomes `{ target, stats }`, built once per settled body by `subfieldPage(target, body)`, with `computeStats(body)` kept for a page with no editor mounted. The seam reaches the main pane, Page Windows, and the Glance alike, and the 120 ms settle stays, since it also drives the store write. Two red-first tests in `subfieldStats.test.ts` pin the disagreements (`- [] hello` counts 10; the long paragraph's emphasis drops its markers), and `subfieldItems.test.ts` pins that the figures read the mounted editor rather than the settled body. Typed at +15 beyond I-014's cache fix. It lands on I-014's `perPass` core and carries I-015's bound into the rewritten counter.

#### I-018 • Each keystroke re-allocates every carried line intent, fence-line record, and table row below the edit just to shift their positions.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Medium (=🟢≈ +6=) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

On a very long page, typing near the top costs more than typing near the bottom, because every intent below the edit is rebuilt with shifted positions: `stepLineIntents` carries lines below an edit by re-allocating each intent through `moveIntent`, `splice` runs `shiftSpan` per fenced line and `shiftTable` per table, and `railIntents` re-derives whole-document rails per version though rails are read for the viewport. Measured at 1.81 ms against 0.25 ms at 14,500 lines, and 0.72 ms against 0.17 ms at 20,000. The carry stays O(N) whatever the fix, because every per-line array and `lineStarts` are copied and shifted per keystroke by design; what can go is the per-object allocation, a constant-factor cost.[^18]

**Solution** [Deferred]

Deferred until a long-page benchmark is part of the gates. Cached line intents would be held relative to their line start and re-based where they're read (`assembleLineIntents`, `prefixEndAt`, `seatPastMarker`, and `decorations.ts`'s `atomicsOn`), so the carry copies references, and rails would be derived for the window from `railIntents`. Editor-Internals' sentence that an intent carries document positions only in `from` and `to` is rewritten with it, and `docCache.test.ts`'s `stepLineIntents ≡ docLineIntents` property stays the specification. The fence and table half is open: a block's range could be held once in `fenceOpeners` rather than on every line. It was not typed; the net is an estimate.

#### I-037 • What kind of surface an editor sits in is spread over five uncoordinated switches, two sentinel ancestor strings, and a CSS list of host classes.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Medium (=🟢+30=) | Drift | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

To mount the editor somewhere new, a host picks among `readOnly`, `active`, `locked`, `inert`, `pageSurface`, `preview`, a connections mode (`preview | window | inert`; the reader window sets both "inerts"), and fake ancestor strings (`READER_ANCESTOR`, `GLANCE_ANCESTORS`) that switch off nested embeds through `host.ancestors.length <= 1`, then adds itself to the placeholder selector in `markdown-pm.css`. The sentinels carry one latent misfire: `embedExclusions` excludes every ancestor's title, so a page titled "glance" or "page-reader" can't be embedded inside a glance or the reader.[^37]

**Solution** [Deferred]

Waits for the SidePane editor. One `EditorSurface` union on `EditorHostOptions` in `Core/Pages/editorHost.tsx` (`page`, `tile`, `preview`, `snapshot`, `value`), switched once in a `traitsOf(surface)` that derives the connections mode, `pageSurface`, `liveEmbeds`, `placeholder`, `preview`, and `inert`; `EditorHost` gains `liveEmbeds` and `placeholder`, the sentinel ancestors go, and the CSS host list becomes one `.mdpm-quiet .cm-placeholder` rule the shell sets. A tile's and a Text value's connections mode stays the holder's, since the surface can't derive it. Typed at +30, most of it the switch in `editorHost.tsx`.

#### I-024 • A `#` line or a footnote run inside an HTML block still counts as a heading or as the footnotes section.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Medium (=🟢≈ +72=) | Drift | `e3d5c1a10` | **Created:** 09-24-2026<br>**Updated:** 10-16-2026 |

**Description**

The heading scan skips a `#` line inside a fence or a `$$` math block but not one inside an HTML block, so `<div>` / `# x` / `</div>` still lists `x` in the Outline, the heading picker, the fold chevrons, and the index, and the editor draws the line as a heading. The same root leaves footnote definitions inside a `<!-- … -->` block numbered and drawn as the footnotes section, where other Markdown readers treat them as a hidden comment: `assembleCitations` excludes lines through `inSealedLine`, which seals fences, maths, and tables but not `html`. The editor can write such a block itself: with **HTML Shortcuts** on, ⌘/ over several lines wraps them in one `<!-- … -->`. The HTML-block detector can't decide this as written: it opens a block on any line that starts with a tag and runs it to the next blank line, so a line led by an inline tag or a one-line comment (`<b>Note:</b> read this`, `<!-- todo -->`) would swallow every heading beneath it. The owner ruled that whether they count follows the **HTML Formatting** setting: on, the heading scan, the footnote assembly, the line intents, and the block model seal HTML-block lines; off, they count and render. Enter's alias commit already follows the setting through the scan's HTML spans (`commitAliasOnEnter`'s `liveSlotAt`, whose `inRawHtml` asks `spanAt(docScan(state.doc).html, …)`), so an unclosed opener that the scan and the parser read differently decides Enter by the scan's reading.[^24]

**Solution** [Deferred]

Waits at its measured cost, most of which is following the setting on both sides of the app. CommonMark's start and end conditions in `markdownCode.ts` and `htmlBlocks` are +21 on their own. Following the setting is +41: the scan records the reading it was built under (`DocScan.sealsHtml`, `scanDoc(text, sealsHtml)`), `inSealedLine` adds the HTML clause, the editor's cache re-derives every held document when the setting turns, and the index seed, the rename cascade, and the footer's figures read the setting where they run. A tag alone on a line opens a block only below a blank line (a fifth intentional CommonMark divergence, which the parser is masked to agree with), and keeping `rescan ≡ scanDoc` under that rule takes three window edge guards in `quietAt`, `loneAbove`, and `pairsBelow` beside the parser's lone-tag mask, about +10 that I-023's estimate leaves out, since they serve only the lone-tag start. Two consequences come with it: with the setting on, `listRenumber`, `listDrag`, the `/` menu, and the embed seat also stop inside a raw HTML block, and the content index keeps each page's headings and citation relations under the setting as it stood when the page was indexed, so turning the setting would need a re-index. Lands on I-023's blank-line rule, since sealing without it lets a half-typed `<!--` seal everything below it. Its `sealsHtml` parameter lands on I-014's rewritten `computeStats` and `pageStats`.

#### I-017 • A heading written with closing hashes (`# foo #`) keeps them in its name, so the outline, fold keys, index, and heading links read `foo #` where other Markdown readers read `foo`.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (=🟢+5=) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

A heading like `# foo #` lists as "foo #", and a link written `[[Page#foo]]`, as any CommonMark or Obsidian reader would name it, doesn't resolve. Adding closing hashes to an existing heading also counts as a rename: typing ` ##` after `## Setup` rewrites every `[[#Setup]]` link on the page to `[[#Setup ##]]`. `headingParts` captures the rest of the line as `content`, and every heading-name reader (`scanHeadings`, `headingRenameSettle` in `headingRenameOf` and at settle, and `gripMenu`'s Copy Link) takes `content.trim()`, while the micromark parse that confirms the heading strips the closing sequence. Probed: the outline of `# foo #`, `## bar ##`, `### baz#`, `#### #` reads `foo #`, `bar ##`, `baz#`, `#`.[^17]

**Solution** [Proposed]

`headingParts` gains a `text` field with CommonMark's closing sequence stripped (a `#` run preceded by a space or tab, or a line of only `#`s), and all four name readers take it; `content` and `contentStart` stay raw for the editing callers, so drawing and rewriting keep the hashes. Its unread `space` field goes. Nothing on disk is rewritten, but per-machine fold keys saved through `prefs.save('folds', …)` change once for such headings, so their remembered folds open once; `nexus.db` heading rows regenerate; and a link already written as `[[Page#foo #]]` stops resolving. Two tests pin it: `folding.test.ts`'s 'names a heading without its closing hashes, as CommonMark reads it' expects `foo`, `bar`, `baz#`, and an empty name, and `headingRenameSettle.test.tsx`'s 'closing hashes added to a heading rename nothing' expects no rename and an untouched link; both go red against today's `content.trim()`.

#### I-039 • A new block or tile kind falls through to silent defaults in the grip menu and block starts.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (=🟢+13=) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

Adding a new kind of block (images are planned) would get the plain grip menu and default behavior in four places with nothing flagging the miss: `contextFor`'s `default`, the `GRIP_KINDS` plain `Set`, `blockStarts`' `default`, and a `startsWith` action chain in `gripMenu.ts` that drops an unhandled action.[^39]

**Solution** [Deferred]

Waits for the next block kind. `contextFor` and `blockStarts` switch over every `BlockKind` with the plain kinds listed, and `GRIP_KINDS` becomes a `Record<BlockKind, boolean>`; deleting one case or key at each site was confirmed to fail the typecheck. The action chain can't be made exhaustive, since its actions are template-literal strings the menu rows mint and its handler returns nothing, so a switch over them compiles with a case missing. Typed at +13. Lands with I-036, whose `gripKinds(scope)` is where the Record lives.

#### I-020 • While the pointer is over the editor, every caret move re-measures every visible code block's language tag.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Mini (=🟢+2=) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

While the pointer rests over the editor, every caret move re-measures every visible code block's language tag through `getBoundingClientRect`, including moves along one line that can't change a tag. `TagReveal` invalidates on `selectionSet` and `focusChanged` among its triggers, and `moved()` drops the cached tags and requests a measure while the pointer is inside. A caret move never changes a tag's position, but it does change which tags exist: the tag widget is drawn only when the caret isn't on the fence's opening line, so a caret moving onto or off that line adds or drops a `.codeblock-language` element with no height change, and a blur does the same. Confirmed by reading and by a test that counts measures per caret move.[^20]

**Solution** [Literal]

`TagReveal.update` re-measures on a selection change only when the caret's line changes, and keeps `docChanged`, `viewportChanged`, `geometryChanged`, and `focusChanged`, which is rare; dropping `selectionSet` and `focusChanged` outright would strand a tag that appears when the caret leaves an opening line, so the copy reveal wouldn't show until the pointer left. Moves along one line stop measuring. `blockHandles.test.ts`'s 'measures again on a caret move only when the caret changes lines' asserts no measure after a same-line move and one after a cross-line move, red (two measures where one is expected) when `selectionSet` re-measures unconditionally. Keystrokes still re-measure through `docChanged` while the pointer rests over the editor; that cost stays.

#### I-021 • Text that arrives from another copy of a page at the end of a folded section shows up below the fold.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Mini (=🟢+2=) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

If the same page is open twice (a tab and a window) with a section folded in one, text added at the end of that section from the other copy, or landing from disk, appears below the folded section instead of inside it. `foldField` maps each entry's end backward (`mapPos(e.to, -1)`), so an insertion at exactly `e.to` stays outside, and a landing through `mirrorBody` skips the drop-and-retake Editor-Internals prescribes for a region rewritten under a fold, which `editAcrossCitations` performs. Reproduced in a test that mirrors a body with a line added at a folded section's end: the line draws outside the fold.[^21]

**Solution** [Literal]

After `foldField` filters the surviving entries against the live regions, a transaction carrying the `mirrored` annotation takes each entry's end from its live region, so landed text at a section's end joins the fold; a typed edit keeps its own path. `foldState.test.tsx`'s 'text landing from another mount at a folded section's end joins the fold' asserts the landed line isn't drawn, red without the `mirrored` line, and the existing non-mirrored 'and without the teardown the new row draws outside the fold' still passes. Editor-Internals' fold sentence gains that the fold field re-takes a surviving fold's end from the live region for a mirrored landing.

#### I-013 • Dragging a table row, column, or column edge redraws the whole table on every mouse movement.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Mini (=🟢+4=) | Parallel Build | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-09-2026 |

**Description**

While a row or column is dragged, the whole table component redraws on every pointer move, 60 or more times a second (every row, every cell's classes and transform, every grip), because `MarkdownTable` holds the pointer's exact offset in React state; resizing a column does the same through `setResize` on each move. Large Markdown tables drag less smoothly than they need to as a result. The collection table view solves the same problem by writing the offset to a CSS variable and setting state only when the drop slot changes. Profiling the real `MarkdownTable` recorded one full table commit per pointer move (20 moves inside one slot gave 20 commits), with render time growing with cell count, while `useColumns.ts`'s `startColumnDrag` writes `--col-drag-x` per move and calls `setColDrag` only when `to` changes. `trackHover` also calls `setHover` on each cell crossing, read only for the grips' reveal.[^13]

**Solution** [Literal]

React state keeps the slot and the activation: `Drag` becomes `{ axis, from, to }` and `resize` becomes the boundary index. The pointer's offset and the two resize widths move to CSS variables on the table wrap: `startDrag`'s `resolve` writes `--tbl-drag` and `shift` reads it in the dragged row's or column's transform, and `startResize` writes `--tbl-left` and `--tbl-right` at activation and on each move, which `colWidth` reads for the boundary pair. `setDrag` fires only at activation and when the slot changes, and `setResize` only at activation and at the end. Each variable is written at activation before anything reads it and stays after the drop, so the subject holds its drop offset until the reorder's new model clears the drag, the same frame HEAD's state held it, with no snap-back. Hover stays React state: the grips are absolutely positioned siblings of the `<table>`, laid out from the geometry, so no selector relates the hovered cell's index to its grip without one generated rule per index; the update already fires once per cell crossing, and every `StaticCell` is memoized, so a crossing re-renders only `MarkdownTable`'s shell, while the imperative alternative (about +4) would split `data-reveal-host` between React and a handler. Behavior is unchanged; `dragOrigin.test.tsx` and the `Tables` suite pass unchanged, and a per-move render count would need a commit-counting profiler rather than a test.

#### I-071 • MarkdownPM's live coverage is split across five drives, so one editor change is driven five times over five launches.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Medium (TBD) | Parallel Build | `e989eb865` | **Created:** 11-04-2026<br>**Updated:** 11-04-2026 |

**Description**

The editor's behavior is driven live by the List Types Drive, the Text Property Drive's TextPane group, the Path Links Drive's marks group, the Alias Drive's body picker group, and Editor Parity. Each launches its own instance on its own debug port over its own copy or backup of `~/Test` and seeds its own pages, so the five run one at a time, about ten minutes for one change, and an editor case lands in whichever drive its feature built rather than in one place a reader would look for it. Editor Parity also keeps its own launcher, CDP client, and fixtures beside `drive-harness.mjs`.[^71]

**Solution** [TBD]

One MarkdownPM drive on `drive-harness.mjs`, its groups holding the editor cases the five run today and Editor Parity's record-and-compare as one of its modes, so an editor change runs one launch; which cases move and which stay with their feature's drive is decided when it's built.

#### I-038 • The host carries one typed menu member per construct, so a new construct menu needs a new host member in three places.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Small (=🔴≈ −4=) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

Every kind of menu the editor shows (grip, table, footnote, alias row) has its own entry on `EditorHost.menus`, each of which the host only pops: `api.ts` imports the grip, table, citation, and alias-row menu models to type them, `editorHost.tsx` builds each model only to `popMenu` it, and the test harness mirrors them. Confirmed by reading.[^38]

**Solution** [Deferred]

Waits for the SidePane editor. One `menus.pop<A>(items)` beside `format`, with the editor building its own rows from the pure models; moving the model files alone counts for nothing. Not typed, so the net is an estimate. Lands with I-037, whose `EditorSurface` is where the SidePane adds its kind.

#### I-050 • A heading rename to a heading holding a pipe turns a lone page embed into a link.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Small (TBD) | Drift | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |

**Description**

A lone `![[A#Old]]` is a page embed. Renaming the heading to one holding a pipe, such as `A|B`, can't be spelled in a wikilink, so the rewrite writes the link whole through the one writer, which falls to the markdown form `![A|B](A#A%7CB)`. The embed rule reads a wikilink alone on its line behind a `!` and no markdown link, so the line stops being an embed and draws as a link behind a `!`. `follower` rewrites the hit whole when `spellsAsWiki` is false for the new heading, `expressibleInLink` refuses a `|` in a heading, and `loneEmbedTitle` matches `pageLinkPattern`, which spells wikilinks alone.[^50]

**Solution** [TBD]

**Your call:** a wikilink can't spell a pipe in a heading, so either the editor draws a markdown page embed, which `loneEmbedTitle` and the embed's readers would then accept, or a heading holding a pipe is refused where a lone embed names it.

#### I-015 • Selection figures re-walk every table in the document on each selection change, whatever the selection covers.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Mini (=🟢+2=) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

While a selection is dragged on a page with tables, every pointer step walks and renders every table row in the document: `rangeStats` calls `tableProse(scan)`, which loops over all of `scan.tables`, and the selection listener runs it on every change that moves the range, then sets a fresh object through `usePublishSelection` and `chromeSlice.setEditorSelection`. The prose side, `proseRuns`, is already bounded to the range. Below I-014's cliff this is sub-millisecond (0.35 ms with 50 tables).[^15]

**Solution** [Literal]

`tableProse` takes the range's `[first, last]` lines, skips a region whose last line is above `first`, and stops at one whose first line is past `last`, the walk `proseRuns` already does. Coalescing `onSelection` to one per frame is left out: Chromium delivers pointer moves, and so CodeMirror's selection updates during a drag, aligned to animation frames, and a keyboard-extended selection is discrete, so a frame scheduler would change nothing measurable. No test pins it, since the bound changes no output; the counter and selection tests pass unchanged. It lands after I-014, on the `tableProse` signature that gives the cell reader.

#### I-019 • Every caret move rebuilds the ranges that let the caret step over an embedded tile.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Mini (=🟢+6=) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

The ranges that make the caret skip an embedded tile in one move are rebuilt on every caret move, where Editor-Internals holds the atomic set once per version. CodeMirror calls every `atomicRanges` provider on each cursor motion, and `embedAtomic` allocates a fresh `RangeSet` and a fresh `Decoration.mark({})` per tile on each call, though `embedField.ranges` changes only when a tile moves: `mapRanges` returns a new array on every document change and `buildTiles` on every rebuild, while a selection-only transaction keeps it. Confirmed by reading and by a test that sees two equal but distinct sets across one caret move.[^19]

**Solution** [Literal]

One module-level `Decoration.mark({})`, and a `WeakMap` from the field's `ranges` array to the set built from it, so a caret move returns the set the last edit built; since the array's identity follows the document version, the clamp to the document's length stays valid. Nothing visible changes. `embedBoundaryKeys.test.tsx`'s 'a caret move reads the atomic set the last edit built' finds the provider whose set covers the tile line and asserts a caret move returns the same set, red when each call builds a fresh one.

#### I-051 • A link picked before its page's headings load keeps a heading the page may not hold.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Mini (=🟢+4=) | Shortcut | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |

**Description**

A page picked in the connection autocomplete keeps the heading typed after its title unless the page's headings are known to lack it. Before the page's headings load, `headingsOf` answers nothing and `headingMissing` answers false, so a pick made in that window writes `[[Page#Heading]]` for a heading the page may not hold, which draws as missing. `headingMissing` reads missing only when the keys are known and lack the heading, and `commit`'s `keptHeading` keeps the typed heading whenever it doesn't.[^51]

**Solution** [Proposed]

The pick awaits the page's headings before it keeps one, or drops the heading when they're unknown.

#### I-068 • A table inside a list item, or followed by a fence nothing closes, is drawn over different lines than the parser reads it.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (TBD) | Drift | `f6bce02a4` | **Created:** 11-01-2026<br>**Updated:** 11-01-2026 |

**Description**

`tableRegions` decides a body's lines by parsing each against a column-0 table, with no container and no fence masking, while the page's parse reads the table inside its list item and masks a fence nothing closes. A table indented under `- item` takes an unindented `lazy` line below it as a row where the parser ends the table above it, and a table followed by an unclosed ```` ``` ```` ends at the fence where the parser keeps the fence and every line after it as rows. A table inside a quote isn't found at all, which the header's `>` test does on purpose. Probed with `scanDoc` against `parse(doc, scan)`; the whole-table confirm this replaced read the same column-0 way.[^68]

**Solution** [TBD]

`endsBody` reads a line against the header's own indent and treats a fence the scan leaves unpaired as a row, the way `parse` masks it; whether a quoted table should draw is a separate call.

### A3 • Nexus & Data

#### I-032 • An ID lost or damaged outside the app is replaced rather than recovered on every path but a held page's own event, and an ID two files share is answered two ways.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Moderate | Large (=🟢+20=) | Shortcut | `1b1ff1205` | **Created:** 10-02-2026<br>**Updated:** 10-16-2026 |

**Description**

Everything that carries an ID is known by it elsewhere: a page by its tabs, pins, recents, and metadata entry; a Set or Collection by its saved-view ids and pins; a Space by its order, pins, and block document; a Context by its Spaces' order; and the Nexus itself by its device store, thumbnails, and sync session, which hold the tabs, recents, folds, and record baseline. An ID replaced by a fresh one cuts the entity off from all of them. One path recovers the ID it lost: a page the tree holds that its own event reads as missing its ID carries the held ID onto its stamp entry, and the stamp writes it back unless another page holds it by then, minting otherwise. Every other path mints or blanks:

- **A page whose `ID:` isn't an ID** is listed `malformed`, and its Try Again writes a fresh ID over it.
- **A held page whose restamp fails,** such as a file locked when the stamp lands, stays listed `missing` with no record of the ID it held, so its Try Again mints.
- **A page stripped while the app is closed** is stamped by the open with no tree to consult, and a restored page with no ID is stamped by the restore.
- **A Collection, Set, or Space whose sidecar loses its `id`,** or holds one that isn't a string, is stamped with a fresh one: by the open's adoption pass, from `applySpace`'s owed stamp, or from a walk's listing.
- **A Context entry that loses its `id`** fails the registry's parse, which blanks the whole Contexts layer for the session and refuses every registry write, and a registry file deleted outside is reseeded with fresh Areas, Topics, and Projects.
- **A `nexus.json` that loses its `id`** takes a fresh one, which opens a new device store and leaves everything in the old one behind.

Two files sharing one ID are held in the tree together until the next open gives the copy a fresh one, and the lookups answer that ID two ways: the window's `pagesByIdOf` and the reconcile index keep the first the walk listed, while the host's `nexusPages` `byId`, which a restore and every refill read, answers null, a trashed copy yielding to a live or archived holder and the first listed of two trashed copies answering, and `livePathOf` none, with the ledger listing the rest and picking the eldest. A Context ID two registry entries share resolves to the last entry through `contextWorldOf`. A copy the open can't re-mint keeps sharing the ID with no notice.

The device already keeps what the last open saw, the record baseline, keyed by ID with each entity's path, but only the remint ledger reads it, the open's adoption pass runs before this Nexus's store is open, and the held page's restamp reads only the stamp entry, which a failed stamp spends. `applyPage` alone pushes `held` onto `owed.stamp`, and `listUnreadable` keeps no `held`, so `oweRetry` and the open's `stampMissing` hand `stampPage` none; `stampPage` mints through `contentIdAt` for a `missing` admission or an overwritten `malformed` one, `stampFolder` through `newId()`, `ensureIdentity` over an id-less `nexus.json`, and `ensureContextsRegistry` through `seededRegistry`; `contextEntry` requires a non-empty `id`; `idHeld` checks pages alone; `stampAdopted` runs inside `prepareOpenedNexus`, ahead of `openStores`; `readBaseline` is read only by `runOpenLedger`.[^32]

**Solution** [Proposed]

One previous-ID lookup serves every stamp, and the comment in `stampPage` marking this approach goes with it.

- **The Lookup:** the ID the listed entry or the held tree last held at the path, else the one the record baseline places there, written back unless another entity holds it by then.
- **Every Stamp:** `stampPage` and `stampFolder` take it for a `missing` admission and a `malformed` one alike, so Try Again, a restore, and the open recover rather than mint. A listed entry keeps the ID its entity held, so a failed stamp's Try Again still has it.
- **The Open:** the adoption pass runs once this Nexus's store is open, or is handed its baseline.
- **Contexts:** the registry reads past an entry missing its `id`, which takes the same lookup by its folder's path, and a deleted registry is rebuilt from the Contexts folders and the baseline rather than reseeded.
- **The Nexus:** the app's record of opened Nexuses keeps each one's ID by path, which `ensureIdentity` reads before minting.
- **Duplicates:** the walk and an entity's own event leave a second claimant of an ID out of the tree, listed with a Try Again that re-mints it; the original is the path the baseline holds, or the eldest by birth time where it holds none. `recordsOf` then lists each ID once, so one rule remains, and the unanswered ID in `heldPages.ts`'s `writablePathsOf`, the ledger's `duplicates`, and `pickEldest` go.

#### I-026 • Twenty-three channels write Nexus files beside `mutate`, and six files can be written through both.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Moderate | Large (±0) | Parallel Build | `e448ed46f` | **Created:** 09-27-2026<br>**Updated:** 10-25-2026 |

**Description**

Twenty-three channels write Nexus files beside the one dispatcher, `mutate`: six view and container channels, seven tile channels, five configuration channels (personalization, the excluded folders, the asset folder, the Matrix, and navigation), asset adoption, the page-body write and history restore, `exclusions:clear`, and `nexus:rename`. Four have a reason to stay separate: `nexus:rename` re-targets the whole session, `exclusions:clear` sweeps files the live tree deliberately doesn't hold, and `page:updateBody` and `tiles:writeMarkdown` carry a base-hash check and answer a stale write with a conflict. The other six tile channels wait on tiles having records, and the remaining thirteen have no structural reason. Every family first appears after `mutate` (06-16): views 06-27, personalization 07-05, and tiles 07-10 as `blocks:*`; nothing requires a new write to use it. Six files are writable through both `mutate` and a separate channel: a container's sidecar (`setActiveView` and `setDisclosureLock` beside `views:*` and `container:configure`), `settings.json` (`setProfileIcon` and `setProfileImage` beside `personalization:set`, `exclusions:set`, and `assets:setDir`), `state.json` (`reorderTop`, `reorderPanelContexts`, and `reorderSpaces` beside `nav:write`), `matrix.json` and tile boards (a delete's or move's configuration pass beside `matrix:write` and `tiles:*`), and `homepage.json` (`setBanner` beside `assets:setDir`'s migration). Every door settles through the one write gate, `withWriteRoot`, and `nav:write` and `matrix:write` also answer the window through the watcher, whose `pushConfig` re-reads the file on the app's own echo. A new feature that writes a Nexus file therefore picks a door by hand.[^26]

**Solution** [TBD]

Fold the thirteen channels without a structural reason into `mutate`'s operation union, so a new write is one union entry, and keep `nexus:rename`, `exclusions:clear`, and the two base-hash body writes. The other six tile channels fold only once tiles have records, which nothing sizes yet. Every write already settles through the write gate's flush, so a folded channel needs no confirm of its own. `MutateReply` is one optional-field bag whose `created` already answers per operation, a path for a content create and an id for a property's; a folded channel that answers something else carries its answer the same way. CorePM's *§Mutations* and the comment on `mutateRequest` follow the fold.

#### I-029 • A page missing its ID that a folder's read finds after its own event was spent stays out of the tree until the next full read.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Medium (=🟢+10=) | Shortcut | `93baa6931` | **Created:** 10-01-2026<br>**Updated:** 10-19-2026 |

**Description**

A page without an ID is stamped by its own watcher event, which arrives once the file stops changing, or by a listing under a folder newly in reach (a Try Again on the folder, or a folder a change of Excluded Folders admits). A folder's read leaves any other page missing its ID out of the tree, waiting for that event. When the event was already spent or never comes, the page is held nowhere, listed nowhere, and stamped by nothing until the next full read, which lists it under a Try Again notice; a full read only lists such a page, and only its own event, Try Again, or a reopen stamps it. Two routes produce it: a folder sidecar removed outside the app, whose folder the walk lists and the stamp reads again, and a Trash restore or move of a folder holding a page already listed missing; a Set restored with an ID-less page is left unlisted by the held tree while a fresh walk lists it missing its ID, since the relocate's events never put the landed Set in reach for stamping. Apart from these, a settle that lands while a stamp pass is in flight can push a tree that still lists the page being stamped, so the window may post one Try Again notice for a page whose ID lands a moment later. `applyFolder` lists only the missing entries `stampable` returns, unless the tree had listed the folder unreadable for a reason other than a missing ID, and `stampable` takes a page only under a path in `owed.whole`, which `oweRetry` and a change of Excluded Folders fill and `restoreBundle`'s `relocate` doesn't; `walkWhileOwed` stamps from a walk's listing through the same filter; and `stampListed` splices `owed.stamp` empty before each `stampMissing` call, so `shown` hides nothing while that pass runs.[^29]

**Solution** [TBD]

Either a folder's read, or a full read, stamps a page missing its ID whose file has sat still longer than the watcher's quiet window, which is the evidence a stamp needs that its writer has finished, or the page keeps a listed entry that its next read stamps. A Trash restore of a Set or Collection owes the landed folder as newly in reach, as `oweRetry` does for a Try Again's path, so the next settle's `stampable` admits the page it lists missing. The notice half closes when an entry stays on the owed list until its stamp lands, which needs the two passes that can overlap (a write's gate and a watcher batch) to share the list without one taking the other's entries.

#### I-030 • A write's reply waits behind a walk an outside change owes.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Medium (=🟢+10=) | Shortcut | `93baa6931` | **Created:** 10-01-2026<br>**Updated:** 10-29-2026 |

**Description**

A write the user makes while the app is re-reading the Nexus for an outside change waits for that read before its result shows and its reply returns. Every settle runs one at a time on one chain, and a walk an outside batch owes runs as a turn on it; a write that lands meanwhile queues its own settle behind the walk and, unless it's the editor's body save, restarts it. An icon change that answers in 1 to 3 ms alone took 98 ms during the walk of a 4,000-page Nexus, and the wait grows with the Nexus. It applies only while a walk is in flight, which a Space or Context leaving, a registry definition arriving from outside, or a change of scope owes. `settleNow` runs `settle` through `inTurn`, the chain `payOwedWalk` shares; `settle` pays the walk through `walkWhileOwed`; and `applyOwn` marks the disk moved once per landing, for every landing but the editor's body save, so the walk in flight reads again.[^30]

**Solution** [Proposed]

A write's own change is pushed, and its reply sent, ahead of a walk it didn't owe: the settle pushes what the applied events moved before it pays a walk another batch owed, and the walk's result follows as its own version.

#### I-045 • An app file this session never read and can't read opens as empty, so its section shows defaults and its changes are refused, some without a word.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Medium (=🟢+15=) | Drift | `0c80012cb` | **Created:** 09-26-2026<br>**Updated:** 10-25-2026 |

**Description**

Four of Pommora's own JSON files are read through `readAppFile`: `state.json` (Collection, Context and Space order, pins, and the Nexus banner), `matrix.json` (the Matrix's grouping, filter, force and display settings), `homepage.json` (the Homepage banner and heading icon), and `crops.json` (image framing). `readAppFile` treats a file this session never read the same way whether it's absent or only unreadable, for example an evicted iCloud placeholder offline, which `atomicWrite.ts` itself names as the unreadable case: both read as empty. `readLast` already reports `unreadable`, and `readAppFile` drops it (`?? null`). The walk then opens the Nexus with the sidebar sorted by title, no pins, Matrix settings at their defaults, and Homepage banners and crops missing. Only the board's `_tiles.json` reads through `readAppFileKnown`, and it stays closed with a notice that offers to try again.

Every write to one of these files is then refused by `updateNexusConfig`'s strict read-modify-write, and the user hears about it only sometimes. A reorder, a banner, a crop or a heading-icon change goes through `mutate`, and its refusal is posted. A pin toggle or a Matrix change goes through `persist(…, true)`, which only logs. The pin shows as set, isn't saved, and is replaced by the disk's copy once the file reads again. The asset migration breaks its own rule in the same way. `collectRefs` says an unreadable store holds the sweep, but its `state.json` and `homepage.json` refs read through `readAppFile`, answer with no banner, and add no `skipped` entry. `sweepLegacyRoot` then sends to the trash the legacy banner image the unreadable file still names.

Two of the three hand-authored files, `nexus.json` and `settings.json`, read through `readKept`, which throws on an unreadable file this session never read, so the open fails there first; the third, `properties.json`, opens the Nexus with no property definitions and names the list unreadable. This finding covers the case where only the four app-written files are unreadable, which is the likely iCloud shape, since they're the least recently touched files in `.nexus/`.[^45]

**Solution** [TBD]

Route the four readers (the walk's `readConfig`, `readNavigationFile`, `readMatrixFile`, and the file-event arms for `state.json`, `homepage.json`, and `crops.json`) through `readAppFileKnown`. When a file answers `undefined`, the open posts one notice, as the board does: its section shows defaults, and its changes won't save until it reads. `collectRefs` pushes a `skipped` entry for a store that answers `undefined`, so the sweep holds. Leave `persist`'s quiet flag alone, since the notice at open already tells the user. **Your call:** `state.json` alone. Either it holds the open, because it seeds the order every surface reads, or it opens with defaults and the notice. Matrix, Homepage and crops follow the board.

#### I-056 • A property's stash ages out on the page history timeframe, a setting that governs a different kind of data, so the stash likely needs a timeframe of its own.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Medium (TBD) | Shortcut | `57da5c1db` | **Created:** 10-22-2026<br>**Updated:** 10-25-2026 |

**Description**

Removing a property from a Collection moves its values off the Collection's pages into a stash (`property_stash`) in the Collection's own settings file, where re-adding the property restores them. The stash stays there, and its entries are kept for the History Timeframe (`historyDays`), the setting that sets how long page history snapshots and captures are kept; after that, they're cleaned out. That setting measures the age of saved page text, and a stash entry is a removed property's values waiting to be re-added, so one number sets how long both are recoverable. The Archive already separates these cases: Archive History Timeframe (`archiveHistoryDays`) sets how long archived pages keep their snapshots, follows History Timeframe until it's picked, and never exceeds it. The stash has no such setting, so removed values can't be kept longer than page history, or cleaned out sooner, without changing page history too.[^56]

**Solution** [Deferred]

A stash timeframe set beside the Archive's: a stepped setting over the same day steps, placed after Archive History Timeframe in the History section, that follows History Timeframe until picked and never exceeds it. The cleanup of expired stash entries reads it in place of `historyDays`.

#### I-058 • An action refused for earlier work still owed runs that cleanup unseen, so files it lets go are never named and Try Again leaves the action undone.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Medium (TBD) | Shortcut | `0b6857ddb` | **Created:** 10-25-2026<br>**Updated:** 10-25-2026 |

**Description**

An action that lands on a name an earlier change still owes work for is refused with the "owed" answer (`OWED`). The shared action runner (`mutate`) then runs the cleanup once (`finishOwed`) and sends the action again. Two gaps follow.

The cleanup's report is discarded. A file the cleanup can't safely rewrite is named once and let go rather than kept owed (B-5 of the Properties Restructure decisions), and that naming lives in the cleanup's reply. When the cleanup runs on an action's behalf, the runner ignores the reply, so those files are never named. They are named only when the person runs the cleanup directly, through the notice's Try Again on an earlier action.

Try Again also does half the job. When the action is still refused after the cleanup, the notice's Try Again runs the cleanup alone. Once it succeeds, the person performs the original action again by hand.

These places refuse with `OWED` and so reach this path: Context and Space create and rename, Context and Space restore from the Trash, the general check on a name a many-file change lands on, property create and rename, and option changes. The batch runner (`runBundled`), the only caller that passes `quiet`, counts an owed refusal as a plain refusal: the batch reports "couldn't be restored" or "couldn't be deleted" for it and offers no Try Again.[^58]

**Solution** [Proposed]

The runner joins the cleanup's report into the action's own reply, so a let-go file is named in the action's notice without Try Again, and a still-owed refusal's Try Again re-runs the whole action, cleanup first and then the action. A batch learns which of its refusals were owed, runs the cleanup once, and offers Try Again for just those items. Whether the runner or each caller owns this is decided in that task; the change is app-wide, so it's tested across every caller above. Found while planning `.claude/Planning/Disclosable Bundles/Disclosable Bundles — Plan.md`, which avoided depending on it.

#### I-061 • Each file a cascade writes makes the watcher re-list its whole folder, about a fifth of a property rename's main-thread time.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Medium (TBD) | Shortcut | `9b9c0d630` | **Created:** 10-29-2026<br>**Updated:** 10-29-2026 |

**Description**

Every write the app lands creates a temp beside its file and renames it over the file, and the watcher library, chokidar, answers any event its watch on that folder reports by listing the whole folder again through `readdirp`, taking an `lstat` of every entry and running the watcher's ignore test on each. No second listing of a folder starts while one is in flight, for up to a second, and one more pass follows straight after when reports arrived meanwhile, so a cascade across a large folder lists it back to back while it writes. On the Medium-0 benchmark Nexus at `9b9c0d630`, a property rename across 7,027 pages spent 968 ms of main-thread time in these listings, 21.6% of its busy time, at about 14.7 `lstat`s per written file from the listings (15.7 with the landing's own), against 2.53 s, 23%, and 24.9 at `15fe7422a`. The rename itself fell from 48.4 s to 14.7 s over the same range, so the listings shrank with it and still weigh about as much of what remains. `watcher.ts` arms chokidar's per-folder watch; its `fs.watch` wrapper hands every event to the folder's listener, which `_handleDir` sends to `_handleRead`, held per folder while its listing runs for at most 1,000 ms with a trailing pass; `_handleRead` lists through `_readdirp`, which asks for `alwaysStat` and `lstat`, and filters each entry through `filterPath`; and `readdirp`'s `_read` stats each entry before the filter reaches it.[^61]

**Solution** [Proposed]

The watcher takes the changed paths from one recursive native watch (`fs.watch` with `recursive`, FSEvents on macOS and ReadDirectoryChangesW on Windows) in place of chokidar's per-folder listings and per-file watches, so a write costs one reported path and one stat rather than a listing of its folder. What chokidar supplies moves into `Desktop/FileWatch/watcher.ts`: the ignore test, the add, change, and unlink split, the wait for a file to stop changing (`awaitWriteFinish`, which polls each changed file's size every 50 ms and is a second main-thread cost the swap could cut), and the events chokidar raises for a folder's contents, an `add` for each file an arrived folder holds and an unlink for each file a departed one held, which `Core/Nexus/fileEvents.ts` takes, so the watcher keeps its own set of known paths. The events the watcher emits to Core and to Sync's watch tap keep their shape, though the echo window `PREFIX_WINDOW_MS` in `Core/Files/writeEcho.ts` is tuned to chokidar's timing and is measured again. The watcher is its own owner, so the swap is weighed there against what chokidar's listings also give it: a re-listing on a folder's next event that catches an add or removal the native watch dropped.

#### I-062 • An empty Set or Collection moved out of a store by hand, or a page moved out across an index rebuild, arrives as a plain item and leaves its record-only bundle in the store for good.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Medium (=🟢+23=) | Shortcut | `16067661d` | **Created:** 10-31-2026<br>**Updated:** 10-31-2026 |

**Description**

A store's restore by hand is recognized two ways. The page lane pairs an indexed page whose row left a bundle with where the tree now holds it, and finishes that bundle; the Space lane lists the Trash's record-only Space bundles and finishes any whose id a Space arriving in its Context holds, at a settle and at each open. A Set or Collection with no indexed page leaves no departure, so neither lane fires: it arrives as a plain item, its record-only bundle stays in the store unlisted and never removed, and while the app is open its archived records wait for the next open's re-file. A page moved out while the app was closed, whose next open rebuilds the index, returns the same way without the Link values its delete stripped (Decision E-2 of the Trash & Archive Restructure's Decisions & Intention). The Space lane's open pass carries a Sync hazard of its own: a device that quits between landing a remote delete's record and its artifact's rename holds a record-only bundle beside the live Space with no note, since the notes file never syncs, so its next open finishes it as a hand return, and the record's removal syncs back, leaving the artifact in the Trash with no record, neither listed nor restorable.[^62]

**Solution** [Deferred]

Deferred by the owner until Sync's rework lands a delete's record and artifact together. The design: one record lane in `arrival.ts` replaces `arrivedSpaces`, `recognizeSpaces`, and `recognizeSpacesAtOpen`, finishing through `arrive` every record-only bundle in both stores whose record's id the tree holds, a Space only in the Context it left; the page lane hands a fully emptied bundle's departures to it, whose strays re-spell by id, and keeps partial returns; in-session, a watched unlink of a bundle's artifact names the bundle, which waits for its id as a vanish does, so no listing runs per settle; and at open, one pass over both stores runs after the first settle, so the index lane's pairs finish first. It reverses Decision E-2 and walks the Trash at each open, about 150 ms per 2,000 bundles.

#### I-028 • An in-app create or rename of a Space, or rename of a Context, leaves the pages already tagged with its new name unlinked until each is read again.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (=🟢+10=) | Shortcut | `93baa6931` | **Created:** 10-01-2026<br>**Updated:** 10-25-2026 |

**Description**

A page tag that names no Space, such as `Projects: [Alpha]` before Alpha exists, stays in the page's file, and every read of the page resolves its tags again, so a Space made outside the app links the pages already tagged with its title at the next walk. Creating a Space, or renaming a Space or a Context, in the app places the node in the held tree from the app's own file event, so a page whose kept tag comes to resolve to it stays unlinked in that tree until something re-reads the page or walks the Nexus: the Space's members, a view's Context column, and the Matrix leave those pages out until the page is saved or edited, or until the next open, Reload, or event the settle can't place. The page's own Property Panel, which resolves its tags against the tree as it renders, already shows the Space. A rename's sweep rewrites the pages holding the old name, and each rewrite relinks its page, so only the pages that already held the new name are missed. `applySpace` places a Space the tree doesn't hold from an own write without a walk; a Context rename commits the registry before its folder moves, so `applyContexts`' `regroup` meets the new title first, and the folder's own move, which `applyMove` places through `moveNodeInTree`, renames the group in place, as a Space rename's `relocate` lands; and only `applyPage` and the walk resolve a page's kept tags, through `contextLinker`.[^28]

**Solution** [Proposed]

The settle's placement of a new or renamed Space, or a renamed Context, resolves the kept tags of the pages holding that Context's key against the new name and patches the pages that resolve to it, in place of owing a walk on every create.

#### I-031 • An outside edit to a page inside a folder the app just renamed or moved is lost until the page's next event.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (=🟢+8=) | Shortcut | `93baa6931` | **Created:** 10-01-2026<br>**Updated:** 10-29-2026 |

**Description**

When the app renames or moves a folder, the held tree carries the folder's pages to the new path at once, as it last read them. An outside edit to one of those pages that the watcher reports under the old path, in a batch that settles after the move, reaches a path that no longer exists: the index drops that path's rows and the tree finds no page there, and the events the move raises at the new path fall inside the move's echo window and are dropped as the app's own. The page shows its earlier state in the tree, the index, and the window until its next edit or the next full read. `applyMove` places the move through `moveNodeInTree`, which carries each node as held; the old path's event reaches `applyPage`, whose `applyFolder` call finds the folder gone and answers `'ok'`, and `indexWrittenPages` removes the path's rows when `stat` finds nothing; `relocate` records both folder paths as moves, so `isRecentWrite` drops a descendant's event for `PREFIX_WINDOW_MS` (800 ms) whichever side of the move it names.[^31]

**Solution** [Proposed]

The move's echo record carries its destination, and a watched event under the vacated path within the window is re-aimed at the path the move landed on, so the edit reaches the page it belongs to.

#### I-047 • Un-excluding a folder re-spells the links to every page elsewhere that shares a title with one of its pages, with a console line only on failure.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (=🟢+8=) | Shortcut | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |

**Description**

Un-excluding a folder restarts the watcher, and its catch-up seed finds each page under the folder that the index never held, a folder excluded before the Nexus opened or a page added to it while excluded, so each lands as an arrival; a page excluded earlier in the same session pairs with the vanish its exclusion recorded and re-spells nothing. An arrival that shares a title with a sole holder elsewhere path-spells that holder's bare links, so each keeps naming the page it named. One settings toggle can therefore rewrite links across many pages in a single sweep, and the user hears nothing unless the sweep fails, since an outside payment logs a warning to the console in place of posting a notice. `missedEvents` seeds the index through `seedContentIndex`, whose `landed` takes every path the index didn't hold; `settleBatch` owes what the seed saw through `oweSeen`, `payOutsideMoves` reads each landed id the tree holds as an arrival, and `paid` logs only a warning the cascade reports.[^47]

**Solution** [Proposed]

A catch-up seed that follows a change of scope reports its pages as present rather than landed, so the pages a toggle admits re-spell no one's links. Where the arrival rule is wanted for them, the sweep posts a notice the window shows, naming how many pages it rewrote, in place of the console line.

#### I-048 • A heading rename and a move of the same page in one outside batch aim the heading rename's sweep at the page's old path.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (=🟢+6=) | Shortcut | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |

**Description**

A page whose heading is renamed and which is moved in one outside batch, such as a sync landing both, reaches the settle with the heading rename recorded under the page's old path. The settle pays heading renames before moves, and the heading cascade takes the keys that name that path from the held tree, which already holds the page at its new path, so it names no key and sweeps no file: it logs a warning, and the links elsewhere to the renamed heading keep the old one. The move arm then pairs the page by its id and re-spells its links by path alone. `settle` shifts each `owed.renames` entry into `renameCascade` with `seen.path` ahead of `walkWhileOwed`; `renameCascade` takes `namesOf(change.path)` and sweeps `change.path` itself; `payOutsideMoves` pairs the move after, through `livePathOf`.[^48]

**Solution** [Proposed]

The heading arm resolves `seen.path` to the page's live path through `livePathOf` by the page's id, or runs after the move arm so the held tree and the recorded path agree.

#### I-063 • The file identity that tells the app's own writes from outside ones and the Windows landing's write-through are unprobed off APFS, and a sync client's attribute writes move the identity.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (TBD) | Shortcut | `88a13422e` | **Created:** 10-31-2026<br>**Updated:** 10-31-2026 |

**Description**

`sameFile` tells one file from another by its modification time, size, and change time, and that identity drops the app's own echoes, lets the index seed and a cascade pass over a page the index vouches for, and is what a landing's `expect` checks before its rename. The change time is probed on APFS alone: the machine contract's assertion that a rename moves it is skipped on Windows, so an NTFS rename-over is unverified, and exFAT's change time is unverified and may not be a real one. Where it isn't, an outside write that keeps a file's time and size reads as the app's own echo and is passed over by the seed and by cascades; the walk cache's own guards, the forgotten parse and its racy window, don't rest on it. The Windows landing passes libuv's write-through value raw (Decision G-4 of the Trash & Archive Restructure's Decisions & Intention), and if a drive ignores it, a group's one flush leaves its other files unflushed when their renames land. A sync client that writes extended attributes, as iCloud Drive and Dropbox do, moves a file's change time after the app lands it, so while the file's access time hasn't passed its modification time, chokidar's test for a change, the app hears its own save as an outside one and re-reads it, and each tagged file's index row stops vouching until its next indexed read; that errs toward re-reading and is unprobed.[^63]

**Solution** [Proposed]

Probe each case where it lives: the machine contract on the Windows PC with the change-time assertion unskipped, the same contract against an exFAT disk image on the Mac (`hdiutil create -fs ExFAT`), and an attribute write (`xattr -w`) on a landed file inside an iCloud Drive folder. A volume whose change time proves real drops the contract's skip; one without has `dropOwnEchoes` and `unlessVouched` take the walk cache's racy-window rule where the volume answers no change time, and the probe confirms or corrects `sameFile`'s note that exFAT has none. The write-through flag is confirmed by watching the temp's `CreateFile` carry `FILE_FLAG_WRITE_THROUGH` in Process Monitor; if it doesn't, the Windows landing flushes each file rather than one per group.

#### I-065 • A Trash or Archive folder the app prunes as empty is removed whole, so a Sync arrival landing in it at that moment goes with it.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (=🟢+6=) | Shortcut | `88a13422e` | **Created:** 10-31-2026<br>**Updated:** 10-31-2026 |

**Description**

`removeBundle` removes a bundle and then each chain folder above it that `holdsOnlyHidden` reads as empty, up to its store's own folder, and each removal is the machine's recursive, forced remove, so whatever lands in a folder between its read and its removal goes with it. Every in-app writer of a chain folder but the open's `settleArchives` runs in the settle's turn, the Contexts lock nesting that turn rather than replacing it, and a property's bundle mints at the Trash's root, which the prune never reaches; `settleArchives` also prunes an orphaned Archive folder with the same read and recursive remove. Sync's arrival into a store is the one other writer: `landWrite` creates the file's folder and lands under the file's own lock, which the prune doesn't take, and `landDelete` prunes a parent it reads empty with the same window. The removal then pushes as a delete of every synced file under the folder, the arrival included, so the loss reaches every device.[^65]

**Solution** [Proposed]

The prune removes a folder's hidden entries one by one and then the folder itself without recursion, through a `removeEmpty` on the machine seam, so a folder something landed in refuses its removal and stays; one helper in `walk.ts` replaces `holdsOnlyHidden` and `removeOwn` at both prune sites. `landDelete`'s parent prune takes the same call with Sync's rework.

#### I-052 • A restore that lands on a taken name always renames the item coming back, and nothing chooses which side keeps the title.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Medium (=🟢+30=) | Shortcut | `213f95a3b` | **Created:** 10-19-2026<br>**Updated:** 10-21-2026 |

**Description**

A Trash restore names its landing against the titles the tree holds in the destination and steps aside to `Name (2)` through `freeName` when the title is taken, then past anything the disk holds there that the tree doesn't, such as an excluded folder or a file written outside the app, through `createDisambiguated`, so the returning item always yields and the item already there keeps its name. An Archive restore takes the same placement.[^52]

**Solution** [Deferred]

Deferred by the owner: a "Resolve Restoration Conflicts" setting in the Trash & Archive group, Preserve Existing Titles (today's rule, the default) or Preserve Restored Titles, governing the Trash's and the Archive's restores through their one placement owner. Preserve Restored Titles renames the item in the way through the rename path before the restore lands, which leaves two things to settle: the rename's link cascade moves every link resolving to that item, including links that named the returning item while it was away and resolved to its namesake, so those links don't follow the setting; and an excluded folder in the way is content Pommora is told to leave alone.

#### I-053 • Every write to the exclusion list re-reads the Nexus, restarts the watcher, and has sync re-check, carried entries included.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Medium (TBD) | Shortcut | `d0e31804c` | **Created:** 10-20-2026<br>**Updated:** 10-21-2026 |

**Description**

Each write to the exclusion list rescopes the session whole. `applySettings` patches the held scope and answers `'walk'` on any scope change, so the Nexus is read again; the settle then restarts the watcher, whose ignore filter captures the scope at arm time, and Sync reconciles what it admits. A Collection or Set rename or move that carries an excluded folder takes that path twice, since `carrySetAside` writes the landing's entries before the folder moves and drops the sources' after, and archiving a Set or trashing a Collection or Set repeats that carry for each folder it lifts, since `liftSetAside` relocates each excluded folder and the asset directory inside it on its own.[^53]

**Solution** [Proposed]

An incremental rescope reaching every exclusion edit: `applySettings` patching the tree for the entries that changed, the watcher's captured filter taking a new scope without a restart, and Sync's `rescope` checking only the paths those entries name.

#### I-064 • A bundle folder dragged whole out of the Trash or an Archive lands as a Set named for its stamp, its item inside arriving as a plain item and its record riding along unread.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Medium (=🟢+50=) | Shortcut | `88a13422e` | **Created:** 10-31-2026<br>**Updated:** 10-31-2026 |

**Description**

Both stores sit under dotted folders, so a bundle folder, named `<stamp>__<name>.deleted` or `.archived`, can be dragged out in Finder only with hidden folders shown. Dropped into a Collection, it's read as a plain folder and lands as a Set under that name, holding the artifact and its hidden `_record.json`. The page lane hears each of the artifact's pages leave the bundle and hands them to `recognize`, whose bundle no longer stands: `bundleHold` reads the missing folder as emptied, `openBundle` finds no record, and each page arrives outright with only its collisions re-spelled, so the record's place, trail, and stripped Link values go unread, and the Trash's chain folders above the bundle stay. The same held before the Trash & Archive Restructure.[^64]

**Solution** [Deferred]

Deferred by the owner on 10-31-2026, since a restore here doesn't ride the one recognition lane cleanly. The design extends I-062's record lane to a record found outside a store: a shell rule the walk and adoption share recognizes a dropped folder that wears a bundle's stamped leaf and holds a record, matched to the departed rows by that leaf name; a copy's unwrap lifts the artifact out of the shell; and the import settles into a restore through `arrive`. A scout's draft of it as a lane of its own measured about +50 production lines.

#### I-054 • An outside unlink within the watcher's write hold of the app's own write leaves a ghost until the next walk.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Mini (=🔴−1=) | Shortcut | `d0e31804c` | **Created:** 10-21-2026<br>**Updated:** 10-21-2026 |

**Description**

Chokidar's `awaitWriteFinish` holds a path until it has been quiet for about 200 ms and merges the events it sees within that hold, so an outside unlink landing inside the hold of the app's own add, a rename or a write, merges with it. No unlink reaches the app, and the tree and the content index keep the file until the next walk.[^54]

**Solution** [Proposed]

Drop `awaitWriteFinish`, since the event batch already debounces 200 ms, at the cost of one unreadable read of a half-written outside page; or re-stat a held path once its hold ends.

#### I-067 • A container that leaves or comes back outside the app leaves an open Trash or Archive browser's crumbs and restore homes as they were.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Small (TBD) | Shortcut | `72a0509ca` | **Created:** 10-31-2026<br>**Updated:** 10-31-2026 |

**Description**

A store's rows read their live crumbs and their restore home from the tree by the recorded parent's id, so a container that leaves the tree or comes back changes every row naming it: its crumbs fall back to the frozen chain or return to the live one, and Restore asks where or finds its home again. The settle's `stores:changed` answers only a container that stands at another path and a Context retitled (`respellsRows`), since a container the window's own bundle act removes or restores is already re-listed by that act's `storesChanged` and the settle can't tell the two apart; one that leaves or comes back in Finder or by a Sync arrival reaches an open browser only once it's shown again.[^67]

**Solution** [Proposed]

`respellsRows` also answers a container `prev` held that `next` doesn't, and the reverse, once a bundle act's re-list and the settle's push are one: the reply says whether its settle pushed, and the window raises `storesChanged` after a bundle act only when it didn't.

### A4 • Architecture

#### I-035 • Every call site chooses for itself whether an error is shown, logged, or dropped, and about forty host-side failures reach no one.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Moderate | Large (±0) | Drift | `03dde6468` | **Created:** 09-30-2026<br>**Updated:** 10-31-2026 |

**Description**

The window's reporter offers several helpers (`reportRefusal`, `persist`, `notifyError`), and each caller picks one and, for `persist`, whether it's quiet: settings, footnote visibility, and view options post a notice; folds, embed sizes, the glance size, navigation lists, and the session writer log. About forty `console.error` lines across `Core` and `Desktop` record host-side failures in background passes (the index seed, the repair sweep, re-mint, the finish of owed work), and none reaches the user. Sync's failures travel a fourth way, as a status the Settings pane draws. The user-facing copy for an error is written inline at each site.[^35]

**Solution** [Deferred]

Deferred from the Data Layer work by its Decision Log (M-1), which keeps only the host-to-notice path its own notices need. One table names each kind of error and decides its surface (a notice, a log line, a status, or nothing), the copy, and the action a notice offers; a call site reports a kind and never chooses a surface. *Error Surfaces — Brainstorm Brief* carries the five questions the design settles: the unit of a kind, host-side reach, other surfaces, mobile, and how batches and bursts collapse. Its home is one file readable by both halves, so the reporter's React hook and undo stack move out of `notifications.ts` first.

#### I-033 • Nothing in a file's location says whether it runs in the host or the window, and several files sit in another domain's folder.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Moderate | Large (±0) | Drift | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-25-2026 |

**Description**

Pommora's code runs in two places, the host process that owns the disk and the window that draws the interface, but every Core folder mixes both kinds of file at its root, so a reader can't tell from a path which side a file runs on, and a new file's author learns it only when the host-graph test goes red. Several files also live in a folder they don't belong to: the floating windows' pure tab model and file schema sit in the Interface component folder, so the store and the channel contract import upward into it; the Views root mixes host handlers, window files, and Settings-pane models; and the Settings and Interface channel tables each serve the other's channels. An import-graph closure from Desktop's node-side files reached 205 Core and UIX files spread across nearly every folder (Properties 23 of 70, Views 6 of 58, Interface 4 of 68), while `hostGraph.test.ts` checks only file extensions and an external allowlist.[^33]

**Solution** [TBD]

Two parts. (1) The taxonomy: each domain gets one host-side subfolder holding its `handlers.ts` and the file-backed modules those reach, pure shared modules stay at the root, and `hostGraph.test.ts` asserts every host-closure file sits in one. (2) Moves that stand regardless: `windowTabs`/`windowRecord`/`windowState`/`windowCache`/`windowMorph` into `Core/Navigation/` beside `tabsModel`/`tabsState`/`warmTabs`, which keeps `Core/Session` as the store layer; `filterModel`/`visibilityModel` into `Core/Views/Settings/` and `placeNew` beside the Session creates; `theme:systemAccent`/`host:platform` into `interfaceHandlers` and `devicePrefs:*` into `settingsHandlers`; `chrome.ts` dissolves (`ThumbRect` moves beside its producer in Navigation). **Your call:** whether to ratify part (1)'s taxonomy of one host-side subfolder per domain, enforced by `hostGraph.test.ts`.

### A5 • Theme & UIX

#### I-025 • Buttons never show keyboard focus.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Moderate | Mini (=🟢+4=) | Drift | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |

**Description**

When you move through the interface with Tab, the kit's buttons (toolbar, window, and menu-footer controls) show no sign of having focus. The `button` style sets `outline: none` and puts nothing in its place, while menu rows light a ring on `:focus-visible` through the shared `fieldRing` channel and fields through `focusRing`. One keyboard walk therefore alternates between visible rows and invisible buttons. `button-base.css.ts:80` sets `outline: 'none'`, the file's only `:focus-visible` rule is `revealOnHover`'s opacity, and none of the 9 `focus-visible` rules across Core and UIX stylesheets targets `button`.[^25]

**Solution** [Literal]

Give `button` the row's ring: `'&:focus-visible': { boxShadow: fieldRing(ROW_RING), vars: { '--field-ring': tintAt('var(--accent)', 'secondary') } }`, composed with `outlined`'s inset shadow where both apply. Leave the view strip's suppression (`view-strip.css.ts:45`) as it is, since an Enter-committed rename drops focus onto the segment and a ring would flash after every rename.

#### I-057 • Telling a single click from a double-click on one element is done separately on each surface, in five different ways, with the double-click window written as a number in one place only.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Medium (=🟢≈ +25=) | Parallel Build | `cbacb7ecb` | **Created:** 10-23-2026<br>**Updated:** 10-26-2026 |

**Description**

Where one element answers both a click and a double-click, the code that tells them apart sits on the surface itself, and the codebase holds no shared home for it. Five strategies are in use. A **wait** holds the single click's action until the double-click window passes. A **`detail` guard** lets the click act at once and ignores the press whose `event.detail` counts a second. **First-press-acts** lets the first press do its single-click work, and the second press reads what the first one left. **Act-then-take-over** acts at once and installs a one-shot listener that reverses it when a second press arrives. The last is **none**, where the single and double handlers both run in full.

| Surface | A single click | A double-click | Strategy |
|---------|----------------|----------------|----------|
| Alias picker row | Picks the alias, 300 ms later | Renames it in place | Wait: a local `PICK_DELAY_MS`, cleared by `unpick` |
| Calendar time part | Opens its hour or minute menu | Closes the menu and types the value | `detail` guard, with `onDoubleClick` |
| Embedded page tile | Seats the caret at the nearer edge | Falls to the editor's word selection | `detail` guard |
| Link in the editor | Follows the link, on `click` only at `detail === 1` | Falls to the editor's word selection | `detail` guard, at `mousedown` and again at `click` |
| Table cell | Enters the cell at the point, unless a drag just selected text | Enters the cell, selecting the word | `detail` guard, for the selection case only |
| Trash or Archive row | Discloses a Set or Collection, or checks a page | Leaves a page checked and opens it, in the Archive | `detail` guard |
| Tab | Activates the tab | Renames it only if the tab was already active at the first press | First-press-acts, through a ref set at `mousedown` |
| Page title in the detail header | Opens the search at once | Reverses into a rename | Act-then-take-over, through a `mousedown` listener on `window` |
| Group band glyph | Toggles the group, on a band that doesn't open | Toggles it twice, or opens the Set on a band that does | None |
| Tab bar | Nothing | Zooms the window | None |
| Rename labels | Whatever the surrounding row's click does | Begins the rename | None |

The surfaces differ in observable ways. Only the alias picker delays its single click, and its test restates the 300 ms as `PICK_WAIT`, so the window is a number in two files and no other surface reads it. A Set band that doesn't open lets the glyph's click toggle its group on each press of a double-click, so the group folds and unfolds again under the pointer, where the same double-click opens the Set on a band that does. A double-click on an inactive tab activates it and doesn't rename it, so renaming takes a second one, and the detail header's title shows its search for the length of a double-click before the rename replaces it. `RenamableTitle`'s `doubleClick` flag exists so a band can switch the rename door off, which says each surface that disagrees with it has to opt out. The `detail` thresholds also differ: the editor's link and embed guards pass on `detail > 1`, its link click on `detail !== 1`, and the margin press on `detail > 2`, while a Trash or Archive row acts on `detail < 2` and opens on `detail === 2`.[^57]

**Solution** [TBD]

One interaction primitive beside `activate.ts` and `gesture.ts` in `UIX/Interactions/` owns the decision. It holds the double-click window as one value and offers the strategies a surface may choose between: acting at once and ignoring the second press, or waiting out the window. The alias picker's timer and constant, the calendar's guard, the editor's guards, the tab's ref, the header's listener, the group band's toggle, and the Bundles browser's `rowClick` move onto it, and `PICK_DELAY_MS` and the test's `PICK_WAIT` leave. A task would touch the primitive and its test and the eleven surfaces above. **Your call:** which strategy is the default, with acting at once keeping every click immediate and waiting making a toggle's double-click quiet at the cost of a delay on every single click, and whether a group band's toggle should wait so the double-click stops flickering. Whether the editor's `mousedown` guards, which pass a second press to word selection rather than choose between two actions, belong on the primitive or beside it is the other open point.

#### I-060 • A bundle row's menu opens only by pointer, so the Trash's Restore and Delete have no keyboard path.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (TBD) | Shortcut | `1028ed405` | **Created:** 10-26-2026<br>**Updated:** 10-26-2026 |

**Description**

The Trash's and the Archive's table rows take the line list's keyboard, Tab, the arrows, Enter, and Space, and reach Restore and Delete only through a row's context menu or the bar over its checked rows. No key raises a row's menu: a line row answers no menu key.[^60]

**Solution** [Proposed]

A line row answers the platform's menu key by raising its own context menu at the row, in the kit, so every line list gains it at once.

#### I-046 • A row's caption in a pane that sizes to its content stays on one line and widens the pane, so the format rows carry none.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Mini (TBD) | Drift | `54e93e491` | **Created:** 10-18-2026<br>**Updated:** 10-25-2026 |

**Description**

A property's settings pane sizes to its widest row, with no width ceiling, and a menu row's caption has no measure of its own, so a long caption runs on one line and pushes the pane wide; the Settings window's captions wrap only because that window has a fixed width. The Label Format and Value Format rows were drawn with their captions ("How this property’s name is written into each file’s metadata key." and "How each value is written in the file’s metadata."), which widened every property's settings pane. A cap on those two captions alone was weighed and left out as a one-off rule, and the rows carry no captions.[^46]

**Solution** [Deferred]

One rule for where a caption wraps in a pane that sizes to its content, set once for every such pane: a measure on the row's caption, or a width ceiling on the pane. The format rows then take their captions back.

#### I-055 • No row in a property's settings says whether it sets the property everywhere or only the current view.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Small (TBD) | Drift | `4f63cba01` | **Created:** 10-21-2026<br>**Updated:** 10-31-2026 |

**Description**

A property's settings pane mixes settings that change the property across the Nexus with settings that change only the current view, and nothing in a row's wording tells the two apart. The Number editor's Format, Currency, Separators, Decimals, and Fraction write the property, while its Style writes the view; the Checkbox editor's Color writes the property and its Style the view; the Link editor's rows all write the property; and the Date & Time editor's Date Format, Day Format, and Time Format write the view. "Format" in the Link and Number editors is the property-wide setting (`link_display`, `number_family`), while the column menu's "Format" submenu for a Link lists the view's own link format.[^55]

**Solution** [Deferred]

How a row says which layer it sets, and how each type's settings are laid out, wait for a design pass by the owner. Until then, work on Properties moves only a setting that's genuinely misplaced or genuinely confusing, and leaves the rows' wording as it reads.

#### I-059 • Every line row points screen readers at the drag instructions, including rows in a list that can't be dragged, where Space acts on the row instead.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Small (TBD) | Drift | `312d63751` | **Created:** 10-26-2026<br>**Updated:** 10-31-2026 |

**Description**

Every row of a line list points screen readers at the drag instructions through `aria-describedby`, whose text says to "press space to pick it up". In a list that can't be dragged, such as the Trash and Archive table, where Space checks the row, and a navigation list with nothing to reorder, where Space opens it, the description names a gesture the row doesn't have. `useLineRow` sets the description on every row, and `useDragItem` does the same for a displace item, including one in a disabled zone that still opens. The two locks don't reach the hooks the same way. A displace zone's `disabled` sits on the zone value both hooks read, but a line list's lock is `lineList`'s `locked`, which only makes its `snap` answer nothing, so the keyboard's lift is refused and nothing the row hook reads says why. Turning `locked` into the zone's `disabled` would also take the list out of the Tab order, which the Trash and Archive table needs. Whether a row lifts is decided per row, so a lock the zone carries whole can't say it either: a view's grouped table locks its page rows while a sort of two or more keys holds and leaves its band heads movable, `groupedLine` reads each kind's own `disabled` as that kind's lock, and a band head whose node can't move never lifts.[^59]

**Solution** [Deferred]

Deferred by the owner. Each row says whether it stays put, as it already says what Enter and Space do, and that one flag both refuses the row's keyboard lift in the engine and drops its description; `lineList`'s `locked`, `groupedLine`'s per-kind `disabled`, and the band spec's `draggable` check in its `snap` fold into it, and a displace item in a disabled zone drops the description too.

#### I-069 • The pop-up that action menus, managed lists, and value pickers mount in is named and filed as a picker, though it picks nothing.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Small (TBD) | Drift | `69db9942e` | **Created:** 11-01-2026<br>**Updated:** 11-03-2026 |

**Description**

`PickerMenu` is the blank pane that plain action menus mount in through `MenuPresenter`, a managed list through `ManageRow`, and every value picker, while the toolbar's dropdowns draw `MenuSurface` instead. It chooses nothing itself, but its name reads as one more picker, and it sits in `UIX/Pickers/` beside the Calendar, Color, Field, and Icon pickers, in a folder whose description names Color, Calendar, Icon, and Text and leaves the shell out. A reader looking for the shell of a menu finds `MenuSurface` in `UIX/Menus/` and has to know to look among the pickers for the other one, and one reading `PickerMenu` beside `PropertyPicker` has no way to tell the shell from a picker.[^69]

**Solution** [TBD]

Assess `PickerMenu` as a whole in its own pass, its name and its folder together rather than as a side effect of other work. A new name touches the code files that mention it and the Feature, Guideline, and Resource documents, and a new folder keeps imports running one way, from Pickers to Menus.

### A6 • Tiles & Embeds

#### I-022 • In a free-text markdown tile, the footnotes divider and the footnote reveal do nothing.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (=🟢≈ +2=) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

In a markdown tile, clicking the footnotes divider or creating a footnote while they're hidden does nothing, because the tile's host has no `pageId` and the host's `citations.set` is a no-op without one; the divider press and the footnote reveal both end in that call.[^22]

**Solution** [Deferred]

Waits until tiles decide whether they hold footnotes. Either visibility is keyed by the tile id, or a host that can't toggle draws no divider; neither form was typed, and the net is an estimate.

#### I-042 • A board whose saved layout can't be read opens empty, and the first new tile replaces the saved layout.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (=🟢+5=) | Shortcut | `740f442e0` | **Created:** 10-04-2026<br>**Updated:** 10-16-2026 |

**Description**

If a board's stored layout is present but isn't in a shape the app can decode, the board opens looking empty. Its tiles are still in the file. Creating a tile then writes a new one-tile layout over the stored one, and the old arrangement is gone. This is reachable by a hand edit, or by a newer layout format arriving through sync from a newer build. A missing layout is the ordinary fresh board and is unaffected; nothing in the app writes an undecodable layout.

Decoding fails only when `layout` is present and not `{bands: array}`. `adopt` then takes `emptyLayout()` and marks the board ready, and a create commits `insertBand` onto the empty layout. Treating an undecodable layout as an unreadable document at `readTileDocAt` regresses three readers: the rename cascade's tile list, `duplicateTile`, and the heading-link cache.[^42]

**Solution** [TBD]

Before a layout write replaces undecodable bytes, the writer copies them under a `.bad-` name, the rule corrupt JSON already follows; the board stays usable and nothing is lost. `setAside` renames the whole file, so this needs a copy primitive beside it in the file layer. It is worth taking when a layout format version exists, which is what makes an undecodable layout something sync can deliver.

#### I-044 • Two sites that run without a tree name the tile hosts' folders by hand.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Small (≈ ±0) | Drift | `668e5398b` | **Created:** 10-05-2026<br>**Updated:** 10-25-2026 |

**Description**

`TILE_HOSTS` resolves a host to its folder and lists every board from the held tree, and the watcher, the channels, and the rename cascade read it. Two sites run before or without a tree and name host folders themselves: `ensureConfigLayout` creates the Homepage folder, and the open-time re-mint checks for a Space by kind before rewriting a copied folder's board. Adding a host means finding these two beside the table.[^44]

**Solution** [TBD]

Each `TILE_HOSTS` arm names the folder a tree-less pass reaches its boards under, and `ensureConfigLayout` reads it. The re-mint's check concerns the copied folder's own kind and may stay.

#### I-043 • The tile shell's memo comparator lists its props by hand.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Small (=🔴−8=) | Shortcut | `740f442e0` | **Created:** 10-04-2026<br>**Updated:** 10-08-2026 |

**Description**

`TileShell`'s comparator names each of its thirteen props. A prop added later and left off the list silently stops triggering a redraw.[^43]

**Solution** [TBD]

A generic comparison over the props doesn't fit as written: the comparator compares `place` field by field, which a shallow comparison can't, and building the objects to compare allocates per shell on every pointer move of a drag. The design has to keep the field-wise `place` comparison and allocate nothing on that path.

#### I-049 • A rename cascade says nothing about Space-board tiles when the Contexts registry doesn't parse.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Mini (=🟢+3=) | Drift | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |

**Description**

A Contexts registry that doesn't parse blanks the Contexts layer, so the tree lists no Space and `tileHostsOf` names no Space board. A rename cascade that moves a key a Space board's markdown tile links then rewrites only the Homepage's tiles and posts no warning for the boards it couldn't reach: `tileHostsOf` counts a registry listed `unreadable` as one skip and an `unparsed` one as none, the rule the configuration pass applies to a file that doesn't parse. `tilesLink` gates the tile rewrite on the links of the hosts it can see, and `rewriteTileConnections` adds `unreadable` to its failures.[^49]

**Solution** [TBD]

**Your call:** the silent read, which matches the configuration pass, or `tileHostsOf` counts an unparsed registry as one skip like an unreadable one, so a cascade warns whenever a visible tile links the key (two lines). A warning for a tile on a Space board in particular needs the Space folders read from the disk, since the tree lists none.

### A7 • Views

#### I-040 • A new item's rename field opens one frame after its row.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Small (=🟢+5=) | Drift | `93baa6931` | **Created:** 10-01-2026<br>**Updated:** 11-02-2026 |

**Description**

A page created from a view mounts its row from the host's push, keyed by the ID the window minted, and its title field opens when the create's reply returns, because a rename session is claimed by the page's path, which the host decides as it settles the name. The host pushes before it replies, so the field opens at most one frame after its row, no slower than before the Data Layer plan; the session is still a second key beside the ID the row is mounted under. `createPageIn` calls `rename({ id: req.id, path: landed })` once the flight resolves with `created.path`, `useViewInteractions` routes it to `policy.rename(target, true)`, and the Cards view's policy opens `beginRename(target.path, …)`, whose fence is `renamingPath`.[^40]

**Solution** [Proposed]

Rename sessions are claimed by ID across creates: a create opens its rename with the minted ID as it asks, and the field binds to the row the push mounts under that ID, keeping the path for the rename it sends.

#### I-070 • A refused cross-band drop can keep its dropped rank, saved by another order write made while it was in flight.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Small (=🟢+8=) | Shortcut | `7852b378a` | **Created:** 11-02-2026<br>**Updated:** 11-02-2026 |

**Description**

Under Custom order, a drop that moves a row to another band, or a Set under another parent, paints the new slot in the view's `manual_order` or `group_order` at once and saves it once the move lands. An order write made while the move is in flight, such as a same-band reorder, a New Page, or another drop, builds on the view as painted, which carries that slot, and saves it at its own gesture. When the move is then refused, its own stage is taken back and the row returns to its old band, but the slot it was dropped at is already saved through the later write, so it can rank differently among its old band-mates than before the drop. `persistAfter` stages the drop's patch and `unstageView` takes back that stage alone, while `placeInView`, `orderPatch`, and `routeSet` each compose on the live view. It takes a second order gesture inside one round trip, which a reply held behind owed work (I-030) widens.[^70]

**Solution** [Proposed]

A refused drop that a later write composed over re-places its row at its prior slot in the order as painted and saves that, the way a reorder does.

### A8 • Matrix

#### I-041 • The Matrix can't be pinch-zoomed on a touchscreen.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (=🟢+12=) | Premature | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-05-2026 |

**Description**

On a touchscreen, such as a Windows touch laptop, two fingers on the Matrix pan it instead of zooming. Zoom arrives only as a Ctrl-wheel event, which is how trackpads report a pinch, so trackpads work and only touchscreens break. The canvas turns off the browser's own touch handling, so both fingers go to pointer handlers that follow one pointer and ignore the second. `onWheel` zooms only `if (e.ctrlKey)`, `touchAction: 'none'` routes every touch to the one-pointer `onPointerDown`/`onPointerMove`, and a search of `Core/Matrix` finds no touch or gesture handlers.[^41]

**Solution** [Proposed]

In `MatrixCanvas`, keep a small map of active pointer ids on the host; while two are down, feed the change in their distance ratio to `matrixRuntime.zoom` at their midpoint (the same call the wheel makes, which already takes a focus point and factor) and suppress the one-pointer pan.

### Sources

[^1]: **I-001:** `Core/Sync/Client/pull.ts:39-59` (`landChange`), `Core/Sync/Arrival/land.ts:83-144`, `Core/Sync/Client/push.ts:257-309` (`resolveStale`), `Core/Sync/Client/reconcile.ts:99-108`, `Core/Paths/exclusion.ts:~35-47` (`manifestAdmits`), `Sync/Routes/items.ts:10-17` (`itemPath`), `Desktop/Platform/hostPath.ts:5` (`nativePath`)
[^2]: **I-002:** `Desktop/Sync/transport.ts:24-38` (`transport`), `Core/Sync/Client/call.ts:89-91`, `Sync/wire.ts:40-55` (`BLOB_CAP`)
[^3]: **I-003:** `Core/Sync/handlers.ts:304-305`, `Core/Sync/handlers.ts:349-353`, `Core/Sync/handlers.ts:325` (`freshKdfParams`), `Core/Sync/Client/reconcile.ts:88-97` (`reconcile`), `Core/Sync/Client/push.ts:174-210` (`collect`), `Core/Sync/Client/session.ts:144-155` (`begin`), `Core/Sync/Client/session.ts:175-188` (`withKeys`), `Sync/Routes/items.ts:87`
[^4]: **I-004:** `Core/Sync/Client/push.ts:233-255` (`pushRename`), `Core/Sync/Client/push.ts:257-309` (`resolveStale`), `Sync/Store/log.ts:153-154`
[^5]: **I-005:** `Core/Sync/Arrival/land.ts:124-144` (`landRename`), `Core/Sync/Arrival/land.ts:106-122` (`landDelete`), `Core/Sync/Client/push.ts:233-242` (`pushRename`), `Core/Nexus/folderKind.ts:53`
[^6]: **I-006:** `Core/Files/jsonMerge.ts:15-46` (`mergeKeys`), `Core/Contract/validators.ts:5-6` (`isPlainObject`), `Core/Sync/Arrival/mergePolicy.ts:19-40` (`isMergedJson`, `mergeDepthFor`), `Core/Sync/Arrival/land.ts:45-64` (`bytesToLand`), `Core/Sync/Arrival/land.ts:95`, `Core/Sync/Client/push.ts:299` (`resolveStale`), `Core/Contexts/contexts.ts:9,20` (`ContextsRegistry`), `Core/Contexts/contextCascade.ts:~118-159` (`renameContextOp`), `Core/Nexus/readNexus.ts:~246-273` (`readContextGroups`), `Core/Nexus/order.ts:10-27` (`resolveOrder`), `UIX/Utilities/moveItem.ts:55-67` (`resolveRowOrder`), `Core/Tiles/tiles.ts:95,182-184` (`active`, `TileDoc`), `Core/Tiles/TileHost.tsx:283` (`renderTile`), `Core/Views/viewsFile.ts:24` (`views`), `Core/Properties/properties.ts:108,142-143` (`option`, `select_options`, `status_groups`), `Core/Sync/Client/tap.ts:9` (`DEBOUNCE_MS`), `.claude/Features/NexusSyncPM.md:55,63`
[^7]: **I-007:** `Core/Sync/handlers.ts:175-191` (`rotateRing`), `Core/Sync/handlers.ts:322,345`, `Core/Sync/Client/keyring.ts:39-45,73-82`
[^8]: **I-008:** `Core/Sync/handlers.ts:165-208` (`rotateRing`), `Core/Sync/handlers.ts:238-241`, `Core/Sync/Client/push.ts:98` (`sealed`), `Core/Sync/Client/keyring.ts:85-106` (`openRecord`), `Core/Sync/Contract/wire.ts:129-133` (`PullReply`), `Sync/Store/nexus.ts:28`
[^9]: **I-009:** `Core/Sync/handlers.ts:210-250` (`act`), `Sync/wire.ts:44,46`, `Core/Settings/NexusRows.tsx:277-292`, `Core/Sync/Client/keyring.ts:62-72` (`loadRing`)
[^10]: **I-010:** `Core/Sync/Client/session.ts:175-183` (`withKeys`), `Core/Sync/Client/pull.ts:80-83` (`pullWait`), `Core/Sync/handlers.ts:118-126` (`state`)
[^11]: **I-011:** `Core/Sync/handlers.ts:258-286`, `Sync/Routes/roster.ts:15-30` (`connect`), `Sync/Store/roster.ts:28-30`, `Core/Sync/Contract/wire.ts` (`RouteTable`), `Sync/wire.ts` (`PATHS`)
[^12]: **I-012:** `Core/Sync/handlers.ts:339`, `Sync/Store/nexus.ts:53-68` (`createInfo`), `Sync/Store/log.ts:186-191` (`sweep`), `Core/Sync/Client/session.ts:127`
[^13]: **I-013:** `Core/MarkdownPM/Tables/MarkdownTable.tsx:~38-43` (`Drag`), `Core/MarkdownPM/Tables/MarkdownTable.tsx:~69-83` (`Resize`, `shift`), `Core/MarkdownPM/Tables/MarkdownTable.tsx:~145-157`, `Core/MarkdownPM/Tables/MarkdownTable.tsx:~259-262` (`trackHover`), `Core/MarkdownPM/Tables/MarkdownTable.tsx:~322-369` (`startDrag`, `resolve`), `Core/MarkdownPM/Tables/MarkdownTable.tsx:~371-404` (`startResize`), `Core/MarkdownPM/Tables/MarkdownTable.tsx:~472-479` (`colWidth`), `Core/MarkdownPM/Tables/MarkdownTable.tsx:~555-594` (the grips' reveal), `Core/MarkdownPM/Tables/markdown-tables.css:97-109`, `Core/Views/Table/useColumns.ts:332-373` (`startColumnDrag`)
[^14]: **I-014:** `Core/MarkdownPM/Engine/subfieldStats.ts:54-69` (`pageHidden`, `cellHidden`, `hiddenIn`), `Core/MarkdownPM/Engine/subfieldStats.ts:93` (`CHUNK_LINES`), `Core/MarkdownPM/Engine/subfieldStats.ts:125-134` (`computeStats`, `pageStats`, `rangeStats`), `Core/MarkdownPM/Engine/perText.ts:4-13` (`perText`), `UIX/Utilities/capMap.ts:9-16` (`capSet`), `Core/MarkdownPM/docCache.ts:40-52` (`drawnLast`), `Core/MarkdownPM/MarkdownEditor.tsx:174-192`, `Core/Pages/PageView.tsx:35`, `Core/Interface/Subfield/subfieldItems.tsx:27`, `Core/Interface/Subfield/CitationsToggle.tsx:10`
[^15]: **I-015:** `Core/MarkdownPM/Engine/subfieldStats.ts:96` (`proseRuns`), `Core/MarkdownPM/Engine/subfieldStats.ts:111-122,140` (`tableProse`), `Core/MarkdownPM/MarkdownEditor.tsx:174-192`, `Core/Interface/Subfield/publish.ts:18-21` (`usePublishSelection`), `Core/Session/chromeSlice.ts:~92-97` (`setEditorSelection`)
[^16]: **I-016:** `Core/MarkdownPM/Engine/subfieldStats.ts:28-34` (`proseStart`), `Core/MarkdownPM/Engine/subfieldStats.ts:39-52` (`hiddenOf`), `Core/MarkdownPM/Engine/subfieldStats.ts:93,125-131` (`CHUNK_LINES`, `computeStats`, `pageStats`), `Core/MarkdownPM/Engine/intents.ts:137-155` (`tokenIntents`), `Core/MarkdownPM/docCache.ts:40-52` (`drawnLast`), `Core/Interface/Subfield/subfieldPage.ts:6-7,56-61`, `Core/Interface/Subfield/subfieldItems.tsx:8-11,24-27`, `Core/Interface/Subfield/CitationsToggle.tsx:8-13`, `Core/Interface/ContentView.tsx:210-215`, `Core/Pages/bodyMount.ts:33,39-41,51-57`, `Core/Session/pageDetailCache.ts:45-56` (`BodyMount`), `Core/MarkdownPM/MarkdownEditor.tsx:174-192`
[^17]: **I-017:** `Core/MarkdownPM/Engine/detect.ts:~655-668` (`headingParts`), `Core/MarkdownPM/Engine/headingScan.ts:28` (`scanHeadings`), `Core/MarkdownPM/Links/headingRenameSettle.ts:26-27` (`headingRenameOf`), `Core/MarkdownPM/Links/headingRenameSettle.ts:43` (`headingRenameSettle`), `Core/MarkdownPM/Menus/gripMenu.ts:~84-86` (`popHeadingMenu`), `Core/MarkdownPM/folding.ts:65` (`regionsOf`), `Core/Index/indexSeed.ts:~46-47`, `Core/Nexus/cascade.ts:188`.
[^18]: **I-018:** `Core/MarkdownPM/Engine/intents.ts:~513-514` (`moveIntent`), `Core/MarkdownPM/Engine/intents.ts:~516-541` (`stepLineIntents`), `Core/MarkdownPM/Engine/intents.ts:~579-648` (`assembleLineIntents`, `prefixEndAt`, `seatPastMarker`), `Core/MarkdownPM/Engine/docScan.ts:201,208` (`splice`), `Core/MarkdownPM/Engine/docScan.ts:231-243` (`shiftRange`, `shiftSpan`, `shiftTable`), `Core/MarkdownPM/docCache.ts:92`, `Core/MarkdownPM/decorations.ts:398` (`atomicsOn`), `Core/MarkdownPM/Engine/detect.ts:101-123` (`scanFencedCode`).
[^19]: **I-019:** `Core/MarkdownPM/Embeds/embedWidget.tsx:559-567` (`embedAtomic`), `:489-494` (`mapRanges`), `.claude/Guidelines/Editor-Internals.md:11`
[^20]: **I-020:** `Core/MarkdownPM/Menus/blockHandles.ts:70-77,107-110` (`TagReveal`), `Core/MarkdownPM/Engine/intents.ts:257-258` (the code tag widget)
[^21]: **I-021:** `Core/MarkdownPM/folding.ts:195-210` (`foldField`), `:133-149` (`collapseEffect`), `:336-342` (`editAcrossCitations`), `Core/MarkdownPM/api.ts:73-81` (`mirrorBody`), `Core/Session/saveScheduler.ts:136` (`followBody`), `Core/Pages/bodyMount.ts:39` (`follow`), `.claude/Guidelines/Editor-Internals.md:30`
[^22]: **I-022:** `Core/Tiles/Surfaces/MarkdownTile.tsx:27` (`useEditorHost`), `Core/Pages/editorHost.tsx:78-83` (`citations`), `Core/MarkdownPM/folding.ts:406-415` (`dividerPress`), `Core/MarkdownPM/Citations/citationActions.ts:31,74` (`travelToCitation`, the marker press's reveal)
[^23]: **I-023:** `Core/MarkdownPM/Engine/detect.ts:196-212` (`htmlBlocks`), `Core/MarkdownPM/Engine/docScan.ts:107-115,140-160,277-281` (`quietAt`, `loneAbove`, `pairsBelow`, `chunksOver`), `Core/MarkdownPM/Engine/parser.ts:17-36` (`parse`), `Core/MarkdownPM/Links/linkEdit.ts:93-94,97-98,109,113` (`liveSlotAt`, `shownEnd`, `commitAliasOnEnter`), `Core/MarkdownPM/api.ts:222-227` (`inRawHtml`), `Core/MarkdownPM/Engine/markdownCode.ts` (the fence grammar), `.claude/Guidelines/Editor-Internals.md:5` (the CommonMark divergences).
[^24]: **I-024:** `Core/MarkdownPM/Engine/headingScan.ts:24-25` (`scanHeadings`), `Core/MarkdownPM/Engine/docScan.ts:43-61,95-101,383-390` (`withCitations`, `scanDoc`, `inSealedLine`), `Core/MarkdownPM/Engine/detect.ts:196-212` (`htmlBlocks`), `Core/MarkdownPM/Engine/blockModel.ts:78` (`kindAt`), `Core/MarkdownPM/Engine/intents.ts:589` (`pushConstruct`), `Core/MarkdownPM/api.ts:218-219` (`drawsRawHtml`), `Core/MarkdownPM/api.ts:222-227` (`inRawHtml`), `Core/MarkdownPM/Links/linkEdit.ts:93-94,97-98,109,113` (`liveSlotAt`, `shownEnd`, `commitAliasOnEnter`), `Core/MarkdownPM/docCache.ts:15-34,64-67` (`perDoc`, `docScan`), `Core/MarkdownPM/Input/htmlShortcuts.ts:3,9`, `Core/Settings/personalization.ts:153` (`htmlFormatting`), `Core/Index/indexSeed.ts:~39-47` (`extractPageIndex`), `Core/Nexus/cascade.ts:188`, `.claude/Features/MarkdownPM.md:27`.
[^25]: **I-025:** `UIX/Buttons/button-base.css.ts:68-93` (`button`), `UIX/Buttons/Button.tsx:54-77`, `UIX/Menus/menu-row.css.ts:24-37` (`rowFocus`, `rowShell`), `UIX/Fields/fieldRing.ts:11,19-33` (`fieldRing`)
[^26]: **I-026:** `Core/Contract/bridge.ts:57-215` (`Asks`), `Core/Nexus/mutateRequest.ts:73-152` (`mutateRequest`), `Core/Nexus/mutate.ts:~166-201` (`setProfileImage`, `setProfileIcon`, `setDisclosureLock`, `setActiveView`), `Core/Nexus/mutate.ts:~237` (`reorderTop`), `Core/Nexus/reorder.ts:26-55`, `Core/Views/handlers.ts:26-64`, `Core/Settings/handlers.ts:20-53`, `Core/Assets/handlers.ts:41` (`assets:setDir`), `Core/Assets/handlers.ts:73` (`assets:adopt`), `Core/Assets/assetMigrate.ts:113`, `Core/Pages/setBanner.ts:49`, `Core/Nexus/configReach.ts:338,340`, `Core/Nexus/cascade.ts:267` (`rewriteTileConnections`), `Core/Navigation/handlers.ts:18` (`nav:write`), `Core/Matrix/handlers.ts:14` (`matrix:write`), `Core/Pages/handlers.ts:26` (`page:updateBody`), `Core/Pages/handlers.ts:45-47` (`history:restore`), `Core/Pages/fileHistory.ts:170-181` (`restoreSnapshot`), `Core/Nexus/handlers.ts:~154` (`nexus:rename`), `Core/Nexus/liveTree.ts:80` (`mutableTarget`), `Core/Tiles/handlers.ts:60-113`, `Core/Contract/handlers.ts:99-112` (`withWriteRoot`), `Desktop/FileWatch/watcher.ts:69-92,114-117` (`pushConfig`)
[^27]: **I-027:** `Desktop/Store/stores.ts:45-47` (`clearPath`), `Desktop/Store/stores.ts:50-77` (`upsertPageIndexes`), `Desktop/Store/stores.ts:78-98` (`removePathIndex`, `renamePathIndex`, `removePathPrefixIndex`, `renamePathPrefixIndex`), `Desktop/Store/driver.ts:16-26` (`inTransaction`), `Desktop/Store/stores.ts:217-259` (`syncStore`), `Core/Sync/handlers.ts:352,365`, `Core/Sync/Client/base.ts:16,21` (`readAllBases`, `deleteBase`)
[^28]: **I-028:** `Core/Nexus/fileEvents.ts:~462-485` (`applySpace`), `Core/Nexus/fileEvents.ts:~594-614` (`applyMove`), `Core/Nexus/treePatch.ts:278-304` (`moveNodeInTree`), `Core/Nexus/fileEvents.ts:~488-509` (`regroup`, `applyContexts`), `Core/Contexts/contextCascade.ts:~118,~143-149` (`renameContextOp`), `Core/Contexts/contextCascade.ts:~161,~191` (`renameSpaceOp`), `Core/Files/atomicWrite.ts:~138-151` (`relocate`), `Core/Nexus/readNexus.ts:74-82` (`contextLinker`), `Core/Nexus/fileEvents.ts:~376-427` (`applyPage`), `Core/Views/pageRow.ts:11-27` (`pageRowOf`), `Core/Contexts/contextResolve.ts:38` (`resolveContextKeys`)
[^29]: **I-029:** `Core/Nexus/fileEvents.ts:~150-163` (`oweRetry`, `stampable`), `Core/Nexus/fileEvents.ts:~348-374` (`applyFolder`), `Core/Nexus/fileEvents.ts:~376-427` (`applyPage`), `Core/Nexus/fileEvents.ts:~524-540` (`applySettings`, `oweRescope`), `Core/Nexus/mutate.ts:~277-282` (`retryUnreadable`), `Core/Nexus/settle.ts:~116-140` (`walkWhileOwed`), `Core/Nexus/settle.ts:~216-226` (`stampListed`), `Core/Nexus/settle.ts:~83-91` (`shown`), `Core/Nexus/settle.ts:~142-194` (`settle`), `Core/Bundles/restore.ts:~24-143` (`restoreBundle`, `relocate` at `:~92`)
[^30]: **I-030:** `Core/Nexus/settle.ts:~75` (`inTurn`), `Core/Platform/inTurns.ts:~2-9` (`inTurns`), `Core/Nexus/settle.ts:~248` (`payOwedWalk`), `Core/Nexus/settle.ts:~427-434` (`settleNow`), `Core/Nexus/settle.ts:~142-194` (`settle`), `Core/Nexus/settle.ts:~116-140` (`walkWhileOwed`), `Core/Nexus/settle.ts:~53-66` (`applyOwn`)
[^31]: **I-031:** `Core/Nexus/fileEvents.ts:~594-614` (`applyMove`), `Core/Nexus/treePatch.ts:~278-304` (`moveNodeInTree`), `Core/Nexus/fileEvents.ts:~348-374` (`applyFolder`), `Core/Nexus/fileEvents.ts:~376-427` (`applyPage`), `Core/Index/indexSeed.ts:~139-189` (`indexWrittenPages`), `Core/Files/atomicWrite.ts:~138-151` (`relocate`), `Core/Files/writeEcho.ts:~10,~84-97` (`PREFIX_WINDOW_MS`, `isRecentWrite`)
[^32]: **I-032:** `Core/Nexus/adopt.ts:~62-88` (`stampPage`), `Core/Nexus/adopt.ts:~108-123` (`stampFolder`), `Core/Nexus/adopt.ts:~133-161` (`Stamp`, `stampMissing`), `Core/Nexus/adopt.ts:~163-209` (`stampTree`, `stampAdopted`), `Core/Nexus/fileEvents.ts:~150-154` (`oweRetry`), `Core/Nexus/fileEvents.ts:~157-163` (`stampable`), `Core/Nexus/fileEvents.ts:~427-428` (`applyPage`), `Core/Nexus/fileEvents.ts:~478-487` (`applySpace`), `Core/Nexus/readNexus.ts:~105-109,~317-322`, `Core/Nexus/mutate.ts:~277-282` (`retryUnreadable`), `Core/Nexus/handlers.ts:34-51,79-96` (`prepareOpenedNexus`, `openStores`), `Core/Nexus/heldPages.ts:~49` (`idHeld`), `Core/Nexus/identity.ts:~17-51` (`ensureIdentity`), `Core/Nexus/remintLedger.ts:~86-102` (`runOpenLedger`, `readBaseline`), `Core/Nexus/remintLedger.ts:~20-33,~65-84` (`projectBaseline`, `pickEldest`), `Core/Nexus/record.ts:18` (`recordsOf`), `Core/Nexus/heldPages.ts:28,43-46` (`writablePathsOf`, `livePathOf`), `Core/Nexus/heldPages.ts:70-82` (`nexusPages`), `Core/Nexus/record.ts:55-56` (`pagesByIdOf`), `Core/Contexts/contextResolve.ts:29-42` (`contextWorldOf`), `Core/Contexts/contexts.ts:12-17,35-43` (`contextEntry`, `seededRegistry`), `Core/Contexts/contextsRegistry.ts:20-25` (`ensureContextsRegistry`)
[^33]: **I-033:** `Desktop/hostGraph.test.ts:31-46`, `Core/Interface/handlers.ts:39-84` (`interfaceHandlers`), `Core/Settings/handlers.ts:50`, `Core/Interface/chrome.ts:1-8`, `Core/Interface/Windows/windowTabs.ts`, `Core/Interface/Windows/windowRecord.ts`, `Core/Interface/Windows/windowState.ts`, `Core/Interface/Windows/windowCache.ts`, `Core/Interface/Windows/windowMorph.ts`, `Core/Views/filterModel.ts`, `Core/Views/visibilityModel.ts`, `Core/Views/creationOrder.ts`
[^34]: **I-034:** `Core/MarkdownPM/codeHighlight.ts:151` (`blockTrees`), `Core/MarkdownPM/codeHighlight.ts:155-183` (`paint`), `Core/MarkdownPM/codeHighlight.ts:185-218` (`colors`), `Core/MarkdownPM/docCache.ts:40-52` (`drawnLast`)
[^35]: **I-035:** `Core/Interface/Notifications/notifications.ts` (`reportRefusal`, `persist`, `notifyError`), `Core/Contract/result.ts` (`ErrorCode`), `Core/Sync/Contract/wire.ts` (`SyncStatus`), `.claude/Planning/Error Surfaces — Brainstorm Brief.md`
[^36]: **I-036:** compares at `Core/MarkdownPM/Autocomplete/autocomplete.ts:~105`, `Engine/intents.ts:~372,~535,~625,~677,~753`, `Engine/listModel.ts:~44,~56` (`readsFrom`, `itemAt`), `Engine/subfieldStats.ts:40`, `Input/edits.ts:~58,~232,~259`, `Input/format.ts:~341` (`listReach`), `Input/markdownInput.ts:189,234`, `Menus/blockHandles.ts:44,49,174,189`, `Menus/menu.ts:~52`, `api.ts:220`, `decorations.ts:~701`; defaults at `Autocomplete/autocomplete.ts:~56`, `Input/edits.ts:~57,~81,~163,~175,~224,~270`, `Engine/intents.ts:~506,~584,~621`, `decorations.ts:~818`, `Menus/blockHandles.ts:43,148`, `Menus/menu.ts:~20` (`applyEditorAction`), `Core/Testing/markdownEngine.ts:~55`; switches at `Engine/detect.ts:~512-520` (`readsLists`), `surface.ts:25-40`, `docCache.ts:84`; the enum at `Core/Actions/editorMenu.ts:~24`; unscoped readers at `Input/edits.ts:~695-703` (`lineBodyBefore`, `opensLine`), `Gestures/blockDrag.ts:~30-35` (`blockShape`), `Engine/listModel.ts:~30-35` (`checkboxToggleChange`), `Guards/tableGuard.ts:~39` (`tablePasteGuard`); `.claude/Features/MarkdownPM.md:105`.
[^37]: **I-037:** `Core/Pages/editorHost.tsx:29-36,48-51,85-113,160-176` (`EditorHostOptions`, `buildEditorHost`, `useEditorHost`), `Core/Session/pageConnections.ts:9`, `Core/Interface/Windows/PageReaderWindow.tsx:41-42,89-90,118` (`READER_ANCESTOR`), `Core/Interface/Glance/GlancePane.tsx:42-43,288-299` (`GLANCE_ANCESTORS`), `Core/MarkdownPM/Embeds/embedWidget.tsx:390`, `Core/MarkdownPM/api.ts:206-207` (`pageSurface`), `Core/MarkdownPM/markdown-pm.css:72-74`.
[^38]: **I-038:** `Core/MarkdownPM/api.ts:24-29,185-191` (the menu-model imports, `EditorHost.menus`), `Core/Pages/editorHost.tsx:101-112`, `Core/Testing/editorHarness.ts:122-128`.
[^39]: **I-039:** `Core/MarkdownPM/Menus/gripMenu.ts:~58-82,~151-191` (`contextFor`, the action chain), `Core/MarkdownPM/Menus/blockHandles.ts:15-26,44` (`GRIP_KINDS`, `blockHandles`), `Core/MarkdownPM/Engine/blockModel.ts:198-199` (`blockStarts`), `Core/Actions/gripMenu.ts:16-24` (`GripMenuAction`).
[^40]: **I-040:** `Core/Views/Host/useViewCreation.ts:141-162` (`createPageIn`), `Core/Views/Host/useViewInteractions.tsx:~45,~129` (`rename`), `Core/Views/Cards/CardsView.tsx:~163` (`beginRename`), `Core/Views/Table/TableView.tsx:~122-131`, `Core/Session/editSlice.ts:21,31,~92` (`beginRename`, `renamingPath`), `Core/Session/nexusSlice.ts:251-294` (`mutate`), `Core/Nexus/mutateRequest.ts:174-177` (`minted`)
[^41]: **I-041:** `Core/Matrix/MatrixCanvas.tsx:129-145`, `Core/Matrix/MatrixCanvas.tsx:176-197`, `Core/Matrix/matrix.css.ts:39-46`
[^42]: **I-042:** `Core/Tiles/Layout/codec.ts:26-31`, `Core/Tiles/tileDocStore.ts:148-158` (`adopt`), `Core/Tiles/TileHost.tsx:283-295` (`renderTile`, `onInsert`), `Core/Tiles/tilesFile.ts:~137-146,~193,~236-243,~255,~279`, `Core/Tiles/tileDoc.ts:20-23` (`readTileDocAt`), `Core/Files/atomicWrite.ts:~308` (`setAside`)
[^43]: **I-043:** `Core/Tiles/TileGrid.tsx:207-226` (`TileShell`'s comparator)
[^44]: **I-044:** `Core/Tiles/tileHosts.ts:16-37` (`TILE_HOSTS`), `Core/Nexus/identity.ts:~59-63` (`ensureConfigLayout`), `Core/Nexus/remint.ts:110`
[^45]: **I-045:** `Core/Files/atomicWrite.ts:~290-291` (`readAppFile`), `Core/Files/atomicWrite.ts:~265-280` (`readLast`), `Core/Files/atomicWrite.ts:~294-299` (`readAppFileKnown`), `Core/Files/atomicWrite.ts:~229-248` (`rmwLocked`), `Core/Files/atomicWrite.ts:~319-333` (`updateNexusFile`), `Core/Files/atomicWrite.ts:~363-369` (`updateNexusConfig`), `Core/Nexus/readNexus.ts:65` (`readOrder`), `Core/Nexus/readNexus.ts:109` (`readConfig`), `Core/Nexus/readNexus.ts:~286` (`readNexusConfig`), `Core/Properties/propertiesRegistry.ts:65` (`readKeptRegistry`), `Core/Navigation/navigationFile.ts:33-41` (`readNavigationFile`), `Core/Matrix/matrixFile.ts:11` (`readMatrixFile`), `Core/Nexus/fileEvents.ts:~573-592,~670-671` (`applyOrder`), `Core/Session/navigationSlice.ts:277-278` (`writeNav`), `Core/Session/matrixSlice.ts:172-175` (`patchMatrix`), `Core/Interface/Notifications/notifications.ts` (`persist`, `reportRefusal`), `Core/Assets/assetMigrate.ts:85-114,166,175` (`collectRefs`, `migrateAssets`), `Core/Tiles/tileDoc.ts:20` (`readTileDocAt`)
[^46]: **I-046:** `UIX/Menus/MenuRows.tsx:~161` (`MenuItem`'s caption), `UIX/Menus/menu-row.css.ts:214` (`caption`), `UIX/Menus/FrameSlide.tsx:~98` (`slotBox`), `Core/Properties/Schema/PropertyFrame.tsx:~401-406` (the editor's `FrameSlide`), `Core/Properties/Schema/formatRows.ts:12-39` (`formatRows`), `Core/Settings/frames.ts:83-89` (`settingsRow`)
[^47]: **I-047:** `Core/Nexus/settle.ts:~204-213` (`missedEvents`), `Core/Nexus/settle.ts:~229-246` (`settleBatch`), `Core/Nexus/settle.ts:~383-387` (`paid`), `Core/Nexus/settle.ts:~390-424` (`payOutsideMoves`), `Core/Index/indexSeed.ts:~259-310` (`seedContentIndex`, `landed` at `:~268`), `Core/Contract/handlers.ts:73` (the restart's catch-up)
[^48]: **I-048:** `Core/Nexus/settle.ts:~145-154` (the renames loop before `walkWhileOwed`), `Core/Nexus/settle.ts:~390-424` (`payOutsideMoves`), `Core/Nexus/cascade.ts:~227-285` (`renameCascade`), `Core/Connections/pageIndex.ts:111` (`namesOf`), `Core/Nexus/heldPages.ts:~44-47` (`livePathOf`), `Core/Index/indexSeed.ts:~84-88,~192-213` (`HeadingRenameSeen`, `reindex`)
[^49]: **I-049:** `Core/Tiles/tileHosts.ts:~22-36` (the Space arm's `boards`), `Core/Tiles/tileHosts.ts:~44-54` (`tileHostsOf`), `Core/Nexus/tree.ts:111`, `Core/Nexus/readNexus.ts:~314-322` (the registry's `unreadable` entry), `Core/Nexus/configReach.ts:~306` (`reachConfig`), `Core/Tiles/tilesFile.ts:~286-327` (`tilesLink`, `rewriteTileConnections`), `Core/Nexus/cascade.ts:~246-257`
[^50]: **I-050:** `Core/Connections/rewrite.ts:~76-110` (`follower`), `Core/Connections/connections.ts:~19-22` (`pageLinkPattern`), `Core/Connections/connections.ts:~132-143` (`expressibleInLink`, `spellsAsWiki`), `Core/MarkdownPM/Engine/detect.ts:~406-411` (`loneEmbedRe`, `loneEmbedTitle`)
[^51]: **I-051:** `Core/MarkdownPM/Links/connectionsApi.ts:~24-33` (`headingMissing`), `Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts:~138-151` (`commit`, `keptHeading`)
[^52]: **I-052:** `Core/Bundles/placement.ts:~41-116` (`resolveRecord`), `Core/Bundles/placement.ts:~159-183` (`freeOnDisk`), `Core/Paths/names.ts:~56-79` (`freeName`, `createDisambiguated`)
[^53]: **I-053:** `Core/Nexus/fileEvents.ts:~524-540` (`applySettings`, `oweRescope`), `Core/Nexus/settle.ts:~197-201` (`reseed`), `Core/Settings/settings.ts:107-139` (`carrySetAside`), `Core/Nexus/folderEntity.ts:53-71` (`liftSetAside`), `.claude/Features/DesktopPM.md:22`
[^54]: **I-054:** `Desktop/FileWatch/watcher.ts:38` (`SETTLE_MS`), `Desktop/FileWatch/watcher.ts:106` (`awaitWriteFinish`)
[^55]: **I-055:** `Core/Properties/Schema/typeRows.tsx:~267` (`rowsFor`), `Core/Properties/Schema/typeRows.tsx:~92-161` (`numberRows`), `Core/Properties/Schema/typeRows.tsx:~163-189` (`dateRows`), `Core/Properties/Schema/typeRows.tsx:~191-207` (`linkRows`), `Core/Properties/Schema/typeRows.tsx:~209-225` (`checkboxRows`), `Core/Properties/Schema/PropertyFrame.tsx:~208-218` (`configure` writes the property and `saveColumnStyle` the view), `Core/Properties/typeDisplay.ts:~12,~30` (`styleLabel`, the column menu's "Format")
[^56]: **I-056:** `Core/Properties/unassignProperty.ts:66-90` (`stashAndStrip`, the stash written on Remove), `Core/Properties/propertyStash.ts:19-45,78-86` (`stashedBlock`, `patchStashBlock`, `sweepStashes`), `Core/Properties/assignment.ts:26-83` (`refillStash`, the stash read and spent on re-adding), `Core/Settings/personalization.ts:42,189-190,261-263` (`HISTORY_DAYS`, `historyDays`, `archiveHistoryDays`, `SETTING_BOUNDS`), `Core/Settings/settings.ts:82-92` (`readFileHistoryConfig`), `Core/Pages/fileHistory.ts:195-206` (`sweepFileHistory`), `Core/Settings/frames.ts:676-690` (the History section's rows)
[^57]: **I-057:** `Core/MarkdownPM/Autocomplete/AliasList.tsx:~25-26,~60-65,~84,~145-155` (`PICK_DELAY_MS`, `pick`, `unpick`, the row's `onClick`), `Core/MarkdownPM/Autocomplete/aliasPicker.test.tsx:~29-30` (`PICK_WAIT`), `UIX/Pickers/CalendarPicker.tsx:~488-501`, `Core/MarkdownPM/Embeds/embedWidget.tsx:~652-654` (`embedClickSeat`), `Core/MarkdownPM/Gestures/pointerPath.ts:~50,~82-85`, `Core/MarkdownPM/decorations.ts:~717-721` (`pressMargin`), `Core/MarkdownPM/Tables/cellStatic.tsx:~576-584`, `Core/Navigation/TabItem.tsx:~63,~89-91,~110` (`pressedActive`), `Core/Interface/Header/DetailTitleHeader.tsx:~94-106,~132-136` (`openSearch`), `Core/Views/Bands/GroupBand.tsx:~141-142,~178-199,~249` (`outsideRename`, the glyph's handlers), `Core/Interface/RenamableTitle.tsx:~17,~26-27,~55` (`doubleClick`), `UIX/Fields/RenamableLabel.tsx:~52-58`, `Core/Navigation/TabBar.tsx:~137-149` (`onBarDoubleClick`), `Core/Bundles/browser.ts:~351-361` (`rowClick`).
[^58]: **I-058:** `Core/Session/nexusSlice.ts:248-265` (`mutate`, the cleanup's discarded reply at `:256` and the notice's Try Again at `:261`), `Core/Session/nexusSlice.ts:290` (`finishOwed`), `Core/Nexus/owed.ts:63` (`OWED`), `Core/Nexus/owed.ts:255` (`runNoted`'s landing check), `Core/Nexus/finishOwed.ts:62-70` (`add`, the let-go files), `Core/Nexus/finishOwed.ts:72-93` (`finishOwed`), `Core/Contexts/contextWrite.ts:153,174` (`createContextGroup`, `createSpace`), `Core/Bundles/restore.ts:67` (the Context and Space restore), `Core/Properties/registryProperty.ts:122`, `Core/Properties/optionOps.ts:99`, `Core/Interface/Confirm/confirmations.ts:88-124` (`runBundled`, its `quiet: true` call at `:108`), `.claude/Planning/Disclosable Bundles/Disclosable Bundles — Plan.md`
[^59]: **I-059:** `UIX/Interactions/engine.tsx:~1290-1319` (`useDragItem`), `UIX/Interactions/engine.tsx:~1340-1373` (`useLineRow`), `UIX/Interactions/engine.tsx:~1123,~1177-1183,~1237` (`ZoneValue`, `useZoneSeat`, the zone's Tab stop), `UIX/Interactions/engine.tsx:~686-690` (the line lift refused on a null `snap`), `UIX/Interactions/a11y.ts:~1,~54-60` (`INSTRUCTIONS_ID`), `UIX/Interactions/lineList.ts:~20-35` (`locked`), `UIX/Interactions/groupedLine.ts:~11-18` (each kind's `disabled`), `Core/Views/Bands/GroupBand.tsx:~60-65` (`draggable` in the band spec's `snap`), `Core/Views/Host/useViewInteractions.tsx:~332` and `Core/Views/Host/useViewHost.ts:~75` (`dragDisabled`), `Core/Bundles/BundleTable.tsx:~183`, `Core/Navigation/NavList.tsx:~161`
[^60]: **I-060:** `Core/Bundles/BundleTable.tsx:~273` (`onContextMenu`), `UIX/Interactions/engine.tsx:~1358-1372` (`useLineRow`'s keys)
[^61]: **I-061:** `Desktop/FileWatch/watcher.ts:~102-107` (`chokidar.watch`), `node_modules/chokidar/handler.js:~115-124` (`createFsWatchInstance`), `node_modules/chokidar/handler.js:~531-557` (`_handleDir`), `node_modules/chokidar/handler.js:~449-519` (`_handleRead`), `node_modules/chokidar/index.js:~569-596` (`_throttle`), `node_modules/chokidar/index.js:~790-806` (`_readdirp`), `node_modules/chokidar/index.js:~204-211` (`filterPath`), `node_modules/chokidar/index.js:~608-638` (`_awaitWriteFinish`), `node_modules/readdirp/index.js:~105-159,~170-182` (`_read`, `_formatEntry`), `Core/Nexus/fileEvents.ts:~270,~295-301` (the folder and unlink arms), `Core/Files/writeEcho.ts:~9-10` (`PREFIX_WINDOW_MS`), `profiles/profile.json` and `profile-15fe7422a.json` of the Reach-In harness at `e4256d93d` (the `lstat` counts)
[^62]: **I-062:** `Core/Nexus/settle.ts:~312-366` (`payOutsideMoves`), `Core/Nexus/arrival.ts:~194-239` (`recognize`), `Core/Nexus/arrival.ts:~241-285` (`arrivedSpaces`, `recognizeSpaces`, `recognizeSpacesAtOpen`), `Core/Nexus/handlers.ts:~108` (the open pass), `Core/Bundles/bundle.ts:~177-205` (`listBundles`' `recordOnly`), `Core/Sync/Client/push.ts:~219-230` (deletes, then writes, then renames), `Core/Sync/Client/pull.ts:~88-95` (`applyPull`), `Core/Nexus/owed.ts:~67` (the notes file never syncs)
[^63]: **I-063:** `Core/Platform/machine.ts:~23-32` (`Identity`, `sameFile`), `Core/Testing/machineContract.ts:~87-97` (the change time's `skipIf(windows)`), `Desktop/Platform/nodeMachine.ts:~49-55` (`UV_FS_O_DSYNC`, `TEMP_FLAGS`), `Desktop/Platform/nodeMachine.ts:~84-96` (`flush`, `commit`'s `expect` and post-rename stat), `Desktop/Platform/nodeMachine.ts:~107-118` (`land`'s one flush per drive), `Core/Files/writeEcho.ts:~104-115` (`dropOwnEchoes`), `Core/Index/indexSeed.ts:~132-144` (`unlessVouched`), `Core/Index/indexSeed.ts:~295-301` (the seed's pass), `Desktop/Store/stores.ts:~46-51,~71-83` (`ctime_ms`), `Core/Files/atomicWrite.ts:~25` (the kept-time `forgetParse`), `Core/Nexus/fileEvents.ts:~395-396` (the watched `forgetParse`), `Core/Files/walkCache.ts:~3-4,~43` (`RACY_WINDOW_MS`), `.claude/Planning/Completed/Trash & Archive Restructure/Trash & Archive Restructure — Decisions & Intention.md:~87` (Decision G-4), `node_modules/chokidar/handler.js:~352-363` (`_handleFile`'s change test)
[^64]: **I-064:** `Core/Paths/nexusPaths.ts:~5-18` (`TRASH_DIR`, `hiddenName`, `hiddenFolder`), `Core/Paths/bundleLayout.ts:~15-36` (`layoutOf`'s suffixes, `stampedLeaf`), `Core/Bundles/bundle.ts:~63-75` (`mintBundle`'s leaf), `Core/Nexus/settle.ts:~312-366` (`payOutsideMoves`, the bundle's departures at `~326-330`), `Core/Nexus/arrival.ts:~195-239` (`recognize`), `Core/Bundles/bundle.ts:~98-104` (`bundleHold`), `Core/Bundles/bundle.ts:~340-345` (`openBundle`), `Core/Files/walk.ts:~15-21` (`listEntries` answers a missing folder empty), `Core/Bundles/record.ts:~13` (`RECORD_FILENAME`), `Core/Nexus/readNexus.ts:~158-170` (`readChildSets`), `Core/Nexus/folderKind.ts:~33-56` (`resolveFolderKind`, a nested plain folder is a Set)
[^65]: **I-065:** `Core/Bundles/bundle.ts:~86-94` (`removeBundle`), `Core/Files/walk.ts:~23-28` (`holdsOnlyHidden`), `Core/Files/atomicWrite.ts:~151-154` (`removeOwn`), `Desktop/Platform/nodeMachine.ts:~132` (`remove`, recursive and forced), `Core/Nexus/mutate.ts:~120-150` (each store op's turn), `Core/Nexus/settle.ts:~274-276` (`inContextsTurn`), `Core/Properties/deleteProperty.ts:~63` (a property's bundle at the Trash's root), `Core/Sync/Arrival/land.ts:~83-104` (`landWrite`), `Core/Sync/Arrival/land.ts:~106-122` (`landDelete`'s parent prune), `Core/Archive/refile.ts:~113-124` (`settleArchives`' prune), `Core/Nexus/handlers.ts:~98` (`settleArchives` at open), `Core/Files/writeEcho.ts:~24-31` (`record`'s tap), `Core/Sync/Client/push.ts:~191-198` (a removed folder's deletes)
[^66]: **I-066:** `Core/Sync/Client/tap.ts:~9,~29-39` (`DEBOUNCE_MS`, `schedule`), `Core/Sync/Client/tap.ts:~54-75` (`wrote`, `feedRename`), `Core/Sync/Client/session.ts:~124-140` (`onDirty`, `onRename`), `Core/Sync/Client/push.ts:~160-168,~191-198` (a removed folder's deletes), `Core/Files/atomicWrite.ts:~136-149` (`relocate`), `Core/Bundles/restore.ts:~96-99` (the restore's move), `Core/Nexus/arrival.ts:~138` (`spendBundle`), `Core/Trash/delete.ts:~161-172` (record, then move), `Core/Nexus/finishOwed.ts:~253-260` (`leave`'s `relocate`), `Core/Sync/Arrival/land.ts:~124-144` (`landRename`), `Core/Nexus/settle.ts:~312-366` (`payOutsideMoves`), `Core/Nexus/heldPages.ts:~125-140` (`storedNodes`' `reach`), `Core/Nexus/treePatch.ts:~127-134` (`trashReach`), `Core/Index/keyHolders.ts:~53-72` (`pagesInReach`), `Core/Sync/Client/push.ts:~224-229` (a sweep's order), `Core/Sync/Client/pull.ts:~88-95` (`applyPull`), `.claude/Planning/Completed/Trash & Archive Restructure/Trash & Archive Restructure — Decisions & Intention.md:~43` (Decision B-1)
[^67]: **I-067:** `Core/Bundles/rows.ts:~71-84` (`respellsRows`), `Core/Bundles/rows.ts:~56-69,~160` (`liveCrumbs`, `homeResolves`), `Core/Nexus/settle.ts:~198-201` (the push), `Core/Session/nexusSlice.ts:~286` and `Core/Interface/Confirm/confirmations.ts:~139` (the window's own re-lists)
[^68]: **I-068:** `Core/MarkdownPM/Engine/Tables/regions.ts:28-31,51` (`MAY_OPEN`, `opensBlock`, `endsBody`, `tableRegions`), `Core/MarkdownPM/Engine/parser.ts:19-37` (`parse`'s fence mask)
[^69]: **I-069:** `UIX/Pickers/PickerMenu.tsx:~66` (`PickerMenu`), `Core/Interface/Menus/MenuPresenter.tsx:~103` (the action menus' shell), `UIX/Pickers/ManageRow.tsx:~3,~53-63` (the import and the pane), `UIX/Menus/MenuDropdown.tsx:~91` and `Core/Interface/Toolbar/SettingsMenu.tsx:~40` (the toolbar's `MenuSurface`), `.claude/Resources/PommoraUIX.md:~380` ("The pane action menus, managed lists, and pickers mount"), `.claude/CLAUDE.md:~109` (the folder's description)
[^70]: **I-070:** `Core/Views/Host/pendingView.ts:~201-235` (`dropIO`, `persistAfter`), `Core/Views/Host/pendingView.ts:~117-133` (`unstageView`), `Core/Views/Host/useViewInteractions.tsx:~182-196` (`placeInView`), `Core/Views/Host/useViewCreation.ts:~116-130` (`orderPatch`), `Core/Views/Bands/bandRouter.ts:~72-107` (`routeSet`)
[^71]: **I-071:** `.claude/scripts/List Types Drive/live-drive.mjs`, `.claude/scripts/Text Property Drive/live-drive.mjs` (group 4), `.claude/scripts/Path Links Drive/live-drive.mjs` (group 9), `.claude/scripts/Alias Drive/live-drive.mjs` (group 3), `.claude/scripts/editor-parity/` (`launch.sh`, `cdp.mjs`, `fixtures.mjs`, `run.mjs`, `compare.mjs`), `.claude/scripts/drive-harness.mjs` (`launch`, `restore`), `.claude/scripts/README.md`.
