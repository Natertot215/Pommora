### Pommora Issues Index

**TOTALS**

| Total | Critical | High | Moderate | Low | Minimal |
|-------|----------|------|----------|-----|---------|
| 76 | 0 | 3 | 13 | 35 | 25 |

#### A1 • Sync & Devices

| ID                                                                                                                                                            | Title                                                                                                                                       | Concern  | Scale            | Origin     | Base        | Date                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------- | ---------- | ----------- | -------------------------------------------------- |
| [I-003](#I-003 • Reconnecting to a rebuilt or restored hub never re-uploads unchanged files.)                                                                 | Reconnecting to a rebuilt or restored hub never re-uploads unchanged files.                                                                 | High     | Medium (=🟢+10=) | Patch-Over | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |
| [I-001](#I-001 • Changes from other devices are written to whatever path the hub names, including outside the Nexus.)                                         | Changes from other devices are written to whatever path the hub names, including outside the Nexus.                                         | High     | Small (=🟢+12=)  | Drift      | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |
| [I-006](#I-006 • Two devices editing different items in one synced list keep only one device's edits, and a lost Context rename hides that Context's Spaces.) | Two devices editing different items in one synced list keep only one device's edits, and a lost Context rename hides that Context's Spaces. | Moderate | Medium (=🟢+40=) | Shortcut   | `0c80012cb` | **Created:** 09-26-2026<br>**Updated:** 10-25-2026 |
| [I-004](#I-004 • Renaming a page while another device's edit is in flight leaves the page at both names.)                                                     | Renaming a page while another device's edit is in flight leaves the page at both names.                                                     | Moderate | Small (=🟢+10=)  | Drift      | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |
| [I-005](#I-005 • Renaming a Set on one device leaves an empty ghost Set on the others.)                                                                       | Renaming a Set on one device leaves an empty ghost Set on the others.                                                                       | Moderate | Small (=🟢+5=)   | Drift      | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |
| [I-009](#I-009 • A non-owner device's Revoke changes the encryption key, then fails, cutting the other device off.)                                           | A non-owner device's Revoke changes the encryption key, then fails, cutting the other device off.                                           | Moderate | Mini (=🟢+4=)    | Drift      | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |
| [I-008](#I-008 • After a revoke, other devices keep encrypting new content with the old key.)                                                                 | After a revoke, other devices keep encrypting new content with the old key.                                                                 | Low      | Medium (=🟢+8=)  | Patch-Over | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |
| [I-011](#I-011 • Renaming a device that was removed from a Nexus quietly asks to join it again.)                                                              | Renaming a device that was removed from a Nexus quietly asks to join it again.                                                              | Low      | Medium (=🟢+12=) | Shortcut   | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |
| [I-012](#I-012 • Changing History Timeframe in Settings never reaches the sync hub.)                                                                          | Changing History Timeframe in Settings never reaches the sync hub.                                                                          | Low      | Medium (=🟢+12=) | Drift      | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |
| [I-002](#I-002 • A misbehaving sync hub can crash the app by sending an enormous reply.)                                                                      | A misbehaving sync hub can crash the app by sending an enormous reply.                                                                      | Low      | Small (=🟢+5=)   | Shortcut   | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |
| [I-007](#I-007 • A revoked device that knows the Nexus password can still unlock the new key.)                                                                | A revoked device that knows the Nexus password can still unlock the new key.                                                                | Low      | Small (±0)       | Shortcut   | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |
| [I-010](#I-010 • A device revoked while the app was closed thinks it's waiting for approval and never drops its keys.)                                        | A device revoked while the app was closed thinks it's waiting for approval and never drops its keys.                                        | Low      | Small (±0)       | Drift      | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |
| [I-034](#I-034 • Resetting Sync's records loads every one and deletes them one at a time, and the index's path renames and removals commit table by table.)   | Resetting Sync's records loads every one and deletes them one at a time, and the index's path renames and removals commit table by table.   | Low      | Small (=🟢+6=)   | Drift      | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-16-2026 |

#### A2 • MarkdownPM

| ID                                                                                                                                                                                                                | Title                                                                                                                                                                                | Concern  | Scale                   | Origin         | Base        | Date                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ----------------------- | -------------- | ----------- | -------------------------------------------------- |
| [I-016](#I-016 • Past about 8,000 lines, the footer's word and character figures re-tokenize the whole page on every typing pause and every selection change, freezing the editor for up to a second.)            | Past about 8,000 lines, the footer's word and character figures re-tokenize the whole page on every typing pause and every selection change, freezing the editor for up to a second. | High     | Small (=🟢+15=)         | Parallel Build | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-026](#I-026 • A raw-HTML opener with no closer makes every keystroke below it re-scan to the end of the document and re-tokenize everything from the opener down.)                                             | A raw-HTML opener with no closer makes every keystroke below it re-scan to the end of the document and re-tokenize everything from the opener down.                                  | Moderate | Medium (=🟢≈ +28=)      | Shortcut       | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-043](#I-043 • Scope is a three-member string read by 21 bare comparisons and 13 %60= 'page'%60 defaults, so a fourth scope silently inherits page behavior in some places and cell behavior in others.)        | Scope is a three-member string read by 21 bare comparisons and 13 `= 'page'` defaults, so a fourth scope silently inherits page behavior in some places and cell behavior in others. | Moderate | Medium (=🟢+37 to +75=) | Shortcut       | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-041](#I-041 • Code-block coloring re-parses the whole fenced block on every keystroke inside it.)                                                                                                              | Code-block coloring re-parses the whole fenced block on every keystroke inside it.                                                                                                   | Moderate | Medium (=🟢+20=)        | Shortcut       | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |
| [I-013](#I-013 • Typing in a table cell re-reads the whole table as Markdown on every keystroke, and big tables lag.)                                                                                             | Typing in a table cell re-reads the whole table as Markdown on every keystroke, and big tables lag.                                                                                  | Moderate | Mini (=🟢+3=)           | Residue        | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-16-2026 |
| [I-018](#I-018 • The footer's word and character figures are a second reading of what the editor draws, and the two already disagree.)                                                                            | The footer's word and character figures are a second reading of what the editor draws, and the two already disagree.                                                                 | Low      | Medium (=🟢≈ +21=)      | Parallel Build | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-021](#I-021 • Each keystroke re-allocates every carried line intent, fence-line record, and table row below the edit just to shift their positions.)                                                           | Each keystroke re-allocates every carried line intent, fence-line record, and table row below the edit just to shift their positions.                                                | Low      | Medium (=🟢≈ +6=)       | Shortcut       | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-044](#I-044 • What kind of surface an editor sits in is spread over five uncoordinated switches, two sentinel ancestor strings, and a CSS list of host classes.)                                               | What kind of surface an editor sits in is spread over five uncoordinated switches, two sentinel ancestor strings, and a CSS list of host classes.                                    | Low      | Medium (=🟢+30=)        | Drift          | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-027](#I-027 • A %60#%60 line or a footnote run inside an HTML block still counts as a heading or as the footnotes section.)                                                                                    | A `#` line or a footnote run inside an HTML block still counts as a heading or as the footnotes section.                                                                             | Low      | Medium (=🟢≈ +72=)      | Drift          | `e3d5c1a10` | **Created:** 09-24-2026<br>**Updated:** 10-16-2026 |
| [I-019](#I-019 • Outliner rails draw guide lines for list ancestors that sit above an unrelated heading or paragraph.)                                                                                            | Outliner rails draw guide lines for list ancestors that sit above an unrelated heading or paragraph.                                                                                 | Low      | Small (=🟢+6=)          | Shortcut       | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-020](#I-020 • A heading written with closing hashes (%60# foo #%60) keeps them in its name, so the outline, fold keys, index, and heading links read %60foo #%60 where other Markdown readers read %60foo%60.) | A heading written with closing hashes (`# foo #`) keeps them in its name, so the outline, fold keys, index, and heading links read `foo #` where other Markdown readers read `foo`.  | Low      | Small (=🟢+5=)          | Shortcut       | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-046](#I-046 • A new block or tile kind falls through to silent defaults in the grip menu and block starts.)                                                                                                    | A new block or tile kind falls through to silent defaults in the grip menu and block starts.                                                                                         | Low      | Small (=🟢+13=)         | Shortcut       | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-023](#I-023 • While the pointer is over the editor, every caret move re-measures every visible code block's language tag.)                                                                                     | While the pointer is over the editor, every caret move re-measures every visible code block's language tag.                                                                          | Low      | Mini (=🟢+2=)           | Shortcut       | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-024](#I-024 • Text that arrives from another copy of a page at the end of a folded section shows up below the fold.)                                                                                           | Text that arrives from another copy of a page at the end of a folded section shows up below the fold.                                                                                | Low      | Mini (=🟢+2=)           | Shortcut       | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-014](#I-014 • Dragging a table row, column, or column edge redraws the whole table on every mouse movement.)                                                                                                   | Dragging a table row, column, or column edge redraws the whole table on every mouse movement.                                                                                        | Low      | Mini (=🟢+4=)           | Parallel Build | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-09-2026 |
| [I-045](#I-045 • The host carries one typed menu member per construct, so a new construct menu needs a new host member in three places.)                                                                          | The host carries one typed menu member per construct, so a new construct menu needs a new host member in three places.                                                               | Minimal  | Small (=🔴≈ −4=)        | Shortcut       | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-047](#I-047 • About thirty names are exported only for tests to import.)                                                                                                                                       | About thirty names are exported only for tests to import.                                                                                                                            | Minimal  | Small (±0)              | Residue        | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-048](#I-048 • In a development build, a page holding an empty %60*%60 item followed by a %60[ ] task%60 line makes the Markdown parser throw.)                                                                 | In a development build, a page holding an empty `*` item followed by a `[ ] task` line makes the Markdown parser throw.                                                              | Minimal  | Small (TBD)             | Shortcut       | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-049](#I-049 • A line holding only a non-breaking space ends a table, where the Markdown parser reads it as one more row.)                                                                                      | A line holding only a non-breaking space ends a table, where the Markdown parser reads it as one more row.                                                                           | Minimal  | Small (TBD)             | Drift          | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-08-2026 |
| [I-067](#I-067 • A heading rename to a heading holding a pipe turns a lone page embed into a link.) | A heading rename to a heading holding a pipe turns a lone page embed into a link. | Minimal | Small (TBD) | Drift | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |
| [I-015](#I-015 • An entered table cell parses its own text twice per keystroke.)                                                                                                                                  | An entered table cell parses its own text twice per keystroke.                                                                                                                       | Minimal  | Mini (=🟢+1=)           | Shortcut       | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-017](#I-017 • Selection figures re-walk every table in the document on each selection change, whatever the selection covers.)                                                                                  | Selection figures re-walk every table in the document on each selection change, whatever the selection covers.                                                                       | Minimal  | Mini (=🟢+2=)           | Shortcut       | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-022](#I-022 • Every caret move rebuilds the ranges that let the caret step over an embedded tile.)                                                                                                             | Every caret move rebuilds the ranges that let the caret step over an embedded tile.                                                                                                  | Minimal  | Mini (=🟢+6=)           | Shortcut       | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-068](#I-068 • A link picked before its page's headings load keeps a heading the page may not hold.) | A link picked before its page's headings load keeps a heading the page may not hold. | Minimal | Mini (=🟢+4=) | Shortcut | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |

#### A3 • Nexus & Data

| ID | Title | Concern | Scale | Origin | Base | Date |
| ------ | ---------------------------------------- | -------- | ------------- | --------- | --------- | --------------- |
| [I-039](#I-039 • An ID lost or damaged outside the app is replaced rather than recovered on every path but a held page's own event, and an ID two files share is answered two ways.) | An ID lost or damaged outside the app is replaced rather than recovered on every path but a held page's own event, and an ID two files share is answered two ways. | Moderate | Large (=🟢+20=) | Shortcut | `1b1ff1205` | **Created:** 10-02-2026<br>**Updated:** 10-16-2026 |
| [I-032](#I-032 • Twenty-three channels write Nexus files beside %60mutate%60, and six files can be written through both.) | Twenty-three channels write Nexus files beside `mutate`, and six files can be written through both. | Moderate | Large (±0) | Parallel Build | `e448ed46f` | **Created:** 09-27-2026<br>**Updated:** 10-25-2026 |
| [I-036](#I-036 • A page missing its ID that a folder's read finds after its own event was spent stays out of the tree until the next full read.) | A page missing its ID that a folder's read finds after its own event was spent stays out of the tree until the next full read. | Low | Medium (=🟢+10=) | Shortcut | `93baa6931` | **Created:** 10-01-2026<br>**Updated:** 10-19-2026 |
| [I-037](#I-037 • A write's reply waits behind a walk an outside change owes.) | A write's reply waits behind a walk an outside change owes. | Low | Medium (=🟢+10=) | Shortcut | `93baa6931` | **Created:** 10-01-2026<br>**Updated:** 10-04-2026 |
| [I-033](#I-033 • Delete All and Restore All walk the whole Trash once for every bundle that hands a Link value to it.) | Delete All and Restore All walk the whole Trash once for every bundle that hands a Link value to it. | Low | Medium (=🟢+15=) | Shortcut | `34227ef5c` | **Created:** 09-28-2026<br>**Updated:** 10-16-2026 |
| [I-060](#I-060 • An app file this session never read and can't read opens as empty, so its section shows defaults and its changes are refused, some without a word.) | An app file this session never read and can't read opens as empty, so its section shows defaults and its changes are refused, some without a word. | Low | Medium (=🟢+15=) | Drift | `0c80012cb` | **Created:** 09-26-2026<br>**Updated:** 10-25-2026 |
| [I-074](#I-074 • A property's stash ages out on the page history timeframe, a setting that governs a different kind of data, so the stash likely needs a timeframe of its own.) | A property's stash ages out on the page history timeframe, a setting that governs a different kind of data, so the stash likely needs a timeframe of its own. | Low | Medium (TBD) | Shortcut | `57da5c1db` | **Created:** 10-22-2026<br>**Updated:** 10-25-2026 |
| [I-076](#I-076 • An action refused for earlier work still owed runs that cleanup unseen, so files it lets go are never named and Try Again leaves the action undone.) | An action refused for earlier work still owed runs that cleanup unseen, so files it lets go are never named and Try Again leaves the action undone. | Low | Medium (TBD) | Shortcut | `0b6857ddb` | **Created:** 10-25-2026<br>**Updated:** 10-25-2026 |
| [I-035](#I-035 • An in-app create or rename of a Space, or rename of a Context, leaves the pages already tagged with its new name unlinked until each is read again.) | An in-app create or rename of a Space, or rename of a Context, leaves the pages already tagged with its new name unlinked until each is read again. | Low | Small (=🟢+10=) | Shortcut | `93baa6931` | **Created:** 10-01-2026<br>**Updated:** 10-25-2026 |
| [I-038](#I-038 • An outside edit to a page inside a folder the app just renamed or moved is lost until the page's next event.) | An outside edit to a page inside a folder the app just renamed or moved is lost until the page's next event. | Low | Small (=🟢+8=) | Shortcut | `93baa6931` | **Created:** 10-01-2026<br>**Updated:** 10-16-2026 |
| [I-062](#I-062 • Un-excluding a folder re-spells the links to every page elsewhere that shares a title with one of its pages, with a console line only on failure.) | Un-excluding a folder re-spells the links to every page elsewhere that shares a title with one of its pages, with a console line only on failure. | Low | Small (=🟢+8=) | Shortcut | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |
| [I-063](#I-063 • A heading rename and a move of the same page in one outside batch aim the heading rename's sweep at the page's old path.) | A heading rename and a move of the same page in one outside batch aim the heading rename's sweep at the page's old path. | Low | Small (=🟢+6=) | Shortcut | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |
| [I-064](#I-064 • A page dragged out of the Trash in Finder is read as an arrival, so its own stale links aren't repaired as a restore repairs them.) | A page dragged out of the Trash in Finder is read as an arrival, so its own stale links aren't repaired as a restore repairs them. | Minimal | Medium (=🟢+25=) | Parallel Build | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |
| [I-065](#I-065 • A Link value naming a title that two pages of one trashed bundle share is parked with neither.) | A Link value naming a title that two pages of one trashed bundle share is parked with neither. | Minimal | Mini (=🟢+2=) | Shortcut | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |
| [I-069](#I-069 • A Trash bundle whose record holds its link targets as bare IDs fails to decode and drops out of the Trash.) | A Trash bundle whose record holds its link targets as bare IDs fails to decode and drops out of the Trash. | Minimal | Mini (±0) | Residue | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |
| [I-070](#I-070 • A restore that lands on a taken name always renames the item coming back, and nothing chooses which side keeps the title.) | A restore that lands on a taken name always renames the item coming back, and nothing chooses which side keeps the title. | Minimal | Medium (=🟢+30=) | Shortcut | `213f95a3b` | **Created:** 10-19-2026<br>**Updated:** 10-21-2026 |
| [I-071](#I-071 • Every write to the exclusion list re-reads the Nexus, restarts the watcher, and has sync re-check, carried entries included.) | Every write to the exclusion list re-reads the Nexus, restarts the watcher, and has sync re-check, carried entries included. | Minimal | Medium (TBD) | Shortcut | `d0e31804c` | **Created:** 10-20-2026<br>**Updated:** 10-21-2026 |
| [I-072](#I-072 • An outside unlink within the watcher's write hold of the app's own write leaves a ghost until the next walk.) | An outside unlink within the watcher's write hold of the app's own write leaves a ghost until the next walk. | Minimal | Mini (=🔴−1=) | Shortcut | `d0e31804c` | **Created:** 10-21-2026<br>**Updated:** 10-21-2026 |

#### A4 • Architecture

| ID | Title | Concern | Scale | Origin | Base | Date |
| ----- | --------------------------------------------------- | -------- | -------- | ------ | --------- | ------------- |
| [I-042](#I-042 • Every call site chooses for itself whether an error is shown, logged, or dropped, and about forty host-side failures reach no one.) | Every call site chooses for itself whether an error is shown, logged, or dropped, and about forty host-side failures reach no one. | Moderate | Large (±0) | Drift | `03dde6468` | **Created:** 09-30-2026<br>**Updated:** 10-08-2026 |
| [I-040](#I-040 • Nothing in a file's location says whether it runs in the host or the window, and several files sit in another domain's folder.) | Nothing in a file's location says whether it runs in the host or the window, and several files sit in another domain's folder. | Moderate | Large (±0) | Drift | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-25-2026 |

#### A5 • Theme & UIX

| ID | Title | Concern | Scale | Origin | Base | Date |
| ----- | ----------------------------------------------- | -------- | -------- | ---------- | --------- | ------------- |
| [I-030](#I-030 • Buttons never show keyboard focus.) | Buttons never show keyboard focus. | Moderate | Mini (=🟢+4=) | Drift | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |
| [I-031](#I-031 • Inside a pop-up pane, pressing a second dropdown while one list is open cuts the list's close short and reopens it at the new dropdown.) | Inside a pop-up pane, pressing a second dropdown while one list is open cuts the list's close short and reopens it at the new dropdown. | Low | Small (=🟢+8=) | Shortcut | `e3d5c1a10` | **Created:** 09-24-2026<br>**Updated:** 10-03-2026 |
| [I-075](#I-075 • Telling a single click from a double-click on one element is done separately on each surface, in five different ways, with the double-click window written as a number in one place only.) | Telling a single click from a double-click on one element is done separately on each surface, in five different ways, with the double-click window written as a number in one place only. | Low | Medium (=🟢≈ +25=) | Parallel Build | `cbacb7ecb` | **Created:** 10-23-2026<br>**Updated:** 10-23-2026 |
| [I-051](#I-051 • Four waits that let a transition finish each state their own slack.) | Four waits that let a transition finish each state their own slack. | Minimal | Small (=🔴−2=) | Drift | `7933c518d` | **Created:** 10-03-2026<br>**Updated:** 10-03-2026 |
| [I-050](#I-050 • Where a pop-up appears is worked out inside a 50-line block tangled with its screen updates.) | Where a pop-up appears is worked out inside a 50-line block tangled with its screen updates. | Minimal | Small (=🟢+2=) | Patch-Over | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-16-2026 |
| [I-061](#I-061 • A row's hint in a pane that sizes to its content stays on one line and widens the pane, so the format rows carry none.) | A row's hint in a pane that sizes to its content stays on one line and widens the pane, so the format rows carry none. | Minimal | Mini (TBD) | Drift | `54e93e491` | **Created:** 10-18-2026<br>**Updated:** 10-25-2026 |
| [I-073](#I-073 • Only the Date & Time editor's settings rows carry icons, and no row says whether it sets a property everywhere or only the current view.) | Only the Date & Time editor's settings rows carry icons, and no row says whether it sets a property everywhere or only the current view. | Minimal | Small (TBD) | Drift | `4f63cba01` | **Created:** 10-21-2026<br>**Updated:** 10-25-2026 |

#### A6 • Tiles & Embeds

| ID | Title | Concern | Scale | Origin | Base | Date |
| ----- | -------------------------------------------------- | ------- | --------- | ------- | --------- | ------------- |
| [I-025](#I-025 • In a free-text markdown tile, the footnotes divider and the footnote reveal do nothing.) | In a free-text markdown tile, the footnotes divider and the footnote reveal do nothing. | Low | Small (=🟢≈ +2=) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |
| [I-057](#I-057 • A board whose saved layout can't be read opens empty, and the first new tile replaces the saved layout.) | A board whose saved layout can't be read opens empty, and the first new tile replaces the saved layout. | Low | Small (=🟢+5=) | Shortcut | `740f442e0` | **Created:** 10-04-2026<br>**Updated:** 10-16-2026 |
| [I-059](#I-059 • Two sites that run without a tree name the tile hosts' folders by hand.) | Two sites that run without a tree name the tile hosts' folders by hand. | Minimal | Small (≈ ±0) | Drift | `668e5398b` | **Created:** 10-05-2026<br>**Updated:** 10-25-2026 |
| [I-058](#I-058 • The tile shell's memo comparator lists its props by hand.) | The tile shell's memo comparator lists its props by hand. | Minimal | Small (=🔴−8=) | Shortcut | `740f442e0` | **Created:** 10-04-2026<br>**Updated:** 10-08-2026 |
| [I-066](#I-066 • A rename cascade says nothing about Space-board tiles when the Contexts registry doesn't parse.) | A rename cascade says nothing about Space-board tiles when the Contexts registry doesn't parse. | Minimal | Mini (=🟢+3=) | Drift | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |

#### A7 • Views

| ID | Title | Concern | Scale | Origin | Base | Date |
| ----- | --------------------------------------------------- | ------- | -------- | ------- | --------- | ------------- |
| [I-054](#I-054 • Dragging a Set to another band shows it at its old rank for the round trip.) | Dragging a Set to another band shows it at its old rank for the round trip. | Low | Small (=🟢+6=) | Drift | `93baa6931` | **Created:** 10-01-2026<br>**Updated:** 10-03-2026 |
| [I-055](#I-055 • A refused page create clears another new row's staged order until that row's own order lands.) | A refused page create clears another new row's staged order until that row's own order lands. | Low | Small (=🟢+6=) | Shortcut | `93baa6931` | **Created:** 10-01-2026<br>**Updated:** 10-03-2026 |
| [I-053](#I-053 • A new item's rename field opens one frame after its row.) | A new item's rename field opens one frame after its row. | Minimal | Small (=🟢+5=) | Drift | `93baa6931` | **Created:** 10-01-2026<br>**Updated:** 10-16-2026 |

#### A8 • Navigation

| ID | Title | Concern | Scale | Origin | Base | Date |
| ----- | ---------------------------------------------------- | ------ | ------- | -------- | --------- | ------------- |
| [I-052](#I-052 • Maximum Tab Width has no effect above a tab strip's preferred width, so most of its steps do nothing.) | Maximum Tab Width has no effect above a tab strip's preferred width, so most of its steps do nothing. | Low | Small (=🟢+1=) | Shortcut | `43d0a6d1e` | **Created:** 09-25-2026<br>**Updated:** 10-03-2026 |

#### A9 • Matrix

| ID | Title | Concern | Scale | Origin | Base | Date |
| ------ | ---------------------------------------------------- | ------- | ------- | ------- | -------- | ------------- |
| [I-056](#I-056 • The Matrix can't be pinch-zoomed on a touchscreen.) | The Matrix can't be pinch-zoomed on a touchscreen. | Low | Small (=🟢+12=) | Premature | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-05-2026 |

#### A10 • Documentation

| ID | Title | Concern | Scale | Origin | Base | Date |
| ----- | ---------------------------------------------------- | ------- | -------- | ------ | --------- | ------------- |
| [I-028](#I-028 • The editor's documentation says eight things the code doesn't do, and two more go false as this cleanup lands.) | The editor's documentation says eight things the code doesn't do, and two more go false as this cleanup lands. | Minimal | Small (±0) | Drift | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

#### A11 • Testing

| ID | Title | Concern | Scale | Origin | Base | Date |
| ------ | -------------------------------------------------- | ------- | -------- | ------- | --------- | ------------- |
| [I-029](#I-029 • Four word-count tests pass whether or not the character figures they name are right.) | Four word-count tests pass whether or not the character figures they name are right. | Minimal | Small (±0) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

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

#### I-034 • Resetting Sync's records loads every one and deletes them one at a time, and the index's path renames and removals commit table by table.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (=🟢+6=) | Drift | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-16-2026 |

**Description**

The page index (`nexus.db`, the local database that answers link, heading, and value lookups) writes a batch of page rows inside one transaction, but its path methods don't: a page or folder rename and a page or folder removal run one statement per index table, each compiled on the call and committed on its own, so the tables can disagree about a path when the app stops between them. Sync's records sit in the same store, and connecting to a new hub or disconnecting reads every record, its stored base included, then deletes each in its own commit, a cost that grows with the Nexus while the user waits on Sync's settings. `upsertPageIndexes` prepares its inserts once and wraps its rows in `inTransaction`, while `removePathIndex`, `renamePathIndex`, `removePathPrefixIndex`, and `renamePathPrefixIndex` loop over `INDEX_TABLES` with a fresh `db.prepare` each, and both `Core/Sync/handlers.ts` sites run `for (const row of readAllBases()) deleteBase(row.path)`.[^34]

**Solution** [Proposed]

Build the path methods' statements once per handle inside `contentIndexStore(db)` and wrap each method's body in `inTransaction` from `Desktop/Store/driver.ts`. Add a `clearBases()` (`DELETE FROM sync_base`) to `syncStore` and use it at both `Core/Sync/handlers.ts` sites.

### A2 • MarkdownPM

#### I-016 • Past about 8,000 lines, the footer's word and character figures re-tokenize the whole page on every typing pause and every selection change, freezing the editor for up to a second.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| High | Small (=🟢+15=) | Parallel Build | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

On a long page, each pause in typing and each change of selection freezes the editor. The figures' token cache in `subfieldStats.ts` is a module `perText(…, 8192)` FIFO, one for page text (`pageHidden`) and one for cells (`cellHidden`): a hit returns without refreshing order, and `capSet` evicts the oldest insert. A document walked top-to-bottom with more chunks than that misses every one, so a one-character edit re-tokenizes everything; `CHUNK_LINES = 40` keys a long run per line, so the unit is lines. The page figures and the selection figures share the one module cache, so each also evicts the other's chunks. `drawnLast` in `docCache.ts` already keeps "exactly what the last pass read" for the editor's own drawing, built separately. Measured after a one-character edit: `pageStats` at 3.0 ms for 4,000 lines, 5.7 ms at 8,000, 376 to 404 ms at 10,000, and 755 to 807 ms at 20,000. The triggers are the page settle (`subfieldItems` and `CitationsToggle` call `pageStats(page.body)`) and the selection listener's synchronous `rangeStats` in `MarkdownEditor`.[^16]

**Solution** [Literal]

`Engine/perText.ts` gains `perPass(derive)`, a memory across one reader's passes that reuses what the last pass derived and keeps only what it read, and `drawnLast` is rebuilt on it so one implementation remains. In `subfieldStats.ts`, a `counter()` holds one page-vocabulary and one cell-vocabulary memory per caller, since chunks and cells tokenize under different vocabularies, and `computeStats` and `rangeStats` each count through their own (`pageCount`, `rangeCount`), so the page figures and a selection never evict each other; `tableProse` takes the cell reader. An LRU refresh alone wouldn't do, since a sequential walk longer than the cap thrashes LRU the same way. Interleaved against HEAD (minimum times), a one-character edit costs 3.1 ms against 3.0 at 4,000 lines and 6.6 against 6.2 at 8,000, and 9.1 ms against 454 at 10,000 and 18.7 against 936 at 20,000. A cheaper form at +8 keeps the tokens per caller (`perPass(tokenize)`) and re-derives the hidden set on every read, at about 30 to 40% slower than HEAD below the cliff on every debounced page count and every synchronous selection change, which is why the hidden-set form is taken. `rangeCount` is one memory for every open editor's selection. Two tests join `subfieldStats.test.ts` with a transparent spy on `tokenize`: "past 8,192 lines, a one-character edit tokenizes the one line it touched" (8,200 calls instead of one without the fix), and "and a selection counted between the two passes leaves the page its memory" (red when `rangeStats` counts through `pageCount`).

#### I-026 • A raw-HTML opener with no closer makes every keystroke below it re-scan to the end of the document and re-tokenize everything from the opener down.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Moderate | Medium (=🟢≈ +28=) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

A page with a stray `<!--`, `<pre>`, `<script>`, or `<?` near the top lags heavily when typing far below it: `tokenizeChunk` measured about 115 ms per keystroke on a 4,500-line page, against 0.74 ms without the opener. `htmlBlocks` runs a raw opener to the last line when no closer arrives, `quietAt` refuses every line inside an HTML span so `rescan` widens to the end, and `chunksOver` opens the viewport chunk at the opener. The fence grammar already refuses an opener nothing closes, a documented divergence from CommonMark, and the raw-HTML pass has no such rule. `<div>`-style blocks end at a blank line and are unaffected. Enter's alias commit (`commitAliasOnEnter`) reads the scan's HTML spans through `liveSlotAt`, whose `inRawHtml` asks `spanAt(docScan(state.doc).html, …)` under **HTML Formatting**, so an unclosed opener that the scan and the parser read differently decides Enter by the scan's reading.[^26]

**Solution** [Proposed]

A raw opener whose closer never arrives ends before the next blank line (`htmlBlocks` sets the block's end through a `lastBeforeBlank` helper, as type-6 and type-7 blocks already end), a fourth intentional CommonMark divergence that joins Editor-Internals' list. The raw openers and their end conditions move beside the fence grammar in `markdownCode.ts`, with `unclosedHtmlEnd(d, span)` naming the end condition a span's opener still waits for, so the scan and the parser read one grammar. The parser is handed the same reading: `parse` rewrites an unclosed opener's line as a `<p` start of the same length, so micromark ends it at the blank line too; masking it to prose the way a lone fence marker is masked would make it a paragraph, and `htmlBlockSpans(ast)` would drop a block the scan keeps. Because a raw block now runs across blank lines only to a closer, the rescan window re-pairs it as it re-pairs a fence: `loneAbove` widens up to an unclosed opener above the window when the window holds its end condition, and `pairsBelow` widens down when the window holds an unclosed opener whose end condition appears below. A stray opener then costs the lines up to the next blank line, and everything below it scans and tokenizes as it would without the opener. `docScan.test.ts`'s "ends an opener nothing closes at the next blank line" asserts `<!--` / `x` / blank / `y` holds one span ending before the blank line, and that a `<pre>` closed across a blank line still closes; it goes red with the run-to-the-last-line loop restored. The property generator already holds unclosed `<pre>` and `<?php` lines, so the `rescan ≡ scanDoc` and chunk-by-chunk properties pin the re-pairing and the mask. The net is an estimate: this rule was typed only together with I-027, at +36 for the rule, the re-pairing, the parser masks, and three window edge guards, and the guards and the parser's lone-tag mask belong to I-027's lone-tag start condition.

#### I-043 • Scope is a three-member string read by 21 bare comparisons and 13 `= 'page'` defaults, so a fourth scope silently inherits page behavior in some places and cell behavior in others.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Moderate | Medium (=🟢+37 to +75=) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

A page, a table cell, and a Text value read different amounts of Markdown, and the code asks "is this the page?" or "is this the cell?" in twenty-one places across ten files instead of asking one question about what the surface reads. Thirteen parameters default to `'page'`, so a reader that forgets to pass its scope answers from the page-shaped scan. The only capability switches are `readsLists` and `blockGestures`. A new surface would be classified one site at a time, non-page at every `=== 'page'` and page at every `=== 'cell'`, silently. Inside a cell today the readers that forgot already diverge: `lineBodyBefore` and `opensLine` strip a `> ` prefix the cell draws as prose, `listDrag`, `listRenumber`, and `renumberRuns` read the quote-prefixed list grammar, and `blockDrag` takes block starts from the page's vocabulary; none of those is reachable from a glyph a cell draws, which is why this waits.[^43]

Inside a fence pair in a cell, the inline transforms and the cell's tokenizer agree in treating the paired lines as code, while `listLineAt` ignores the pair, so Enter continues a list line inside it. A cell and a Text value keep reading fences as they do today, and MarkdownPM.md's "fences stay literal text" is corrected to say the pair is read.

**Solution** [Deferred]

Waits for a fourth scope. One `Core/MarkdownPM/Engine/surfaces.ts` owns the scope tuple, the `MarkdownScope` type, and the capability predicates `readsLists`, `readsBlocks`, `readsTiles`, `gripKinds`, and `hasGutter`; the twenty-two compares read them, the thirteen defaults go so a forgotten scope is a compile error, the zod enum derives from the tuple, and `blockPrefix`'s two helpers, `listDrag`, `listRenumber`, `renumberRuns`, `dropChanges`, and `blockDragExtension` take the scope. Typed as five switches it measured +75; as one table keyed by scope with the five capabilities as columns, about +37 with the same exhaustiveness. `smartDelete`'s page compare, which gates the tile hold and the footnote cascade, reads `readsTiles` and `readsBlocks`. Lands with I-046, whose grip table becomes `gripKinds(scope)`. `format.ts`'s Lists ▸ menu, `tableGuard.ts`'s paste guard, `subBlockAt`, and `checkboxToggleChange` also read the quote-prefixed grammar with no scope, though in a cell each starts from a glyph drawn only on an unprefixed line; they take the scope with the rest.

#### I-041 • Code-block coloring re-parses the whole fenced block on every keystroke inside it.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Moderate | Medium (=🟢+20=) | Shortcut | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |

**Description**

Code colors come from parsing each visible fenced block with its language, and the parse is remembered by the block's exact text. Any keystroke inside a block therefore misses the memory and the whole block is parsed from scratch, even when only a few of its lines are on screen, so typing in a long code block lags in proportion to the block's length. While a language is still downloading, each redraw also attaches another "loaded" callback. Parsing through the same parser cost 2.4 ms per keystroke at 100 lines, 13.1 ms at 1,000, and 38.6 ms at 3,000, since `paint` joins every line of the block and reads the tree through the text-keyed `drawnLast` while `blockParser.parse(text)` runs with no fragments.[^41]

**Solution** [TBD]

Keep the previous tree and its `TreeFragment`s per block, keyed by the opener line mapped through the transaction, and reparse with `TreeFragment.applyChanges` in block-local coordinates so an edit re-parses only around the change; or, simpler, parse only from the block's start through the viewport's last visible line. Attach one load callback per language through a module-level set of pending loads.

#### I-013 • Typing in a table cell re-reads the whole table as Markdown on every keystroke, and big tables lag.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Moderate | Mini (=🟢+3=) | Residue | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-16-2026 |

**Description**

Every character typed into a table cell makes the editor re-check the entire table by running the full Markdown parser over it, and the parse grows faster than the table. Typing unique text mid-table measured `rescan` at 27.8 ms for 200 rows and 256 ms for 1,000, with micromark alone at 12.7 and 134 ms, which is visible lag. The incremental scan re-reads only the lines around an edit, but `quietAt` accepts only the line above a blank, a heading, a break, or a list line, so a table row is never a place to stop: `rescan` widens to the whole table, and `tableRegions` grabs the contiguous non-blank block and confirms it with `isTable`, one parse of all its text, shrinking line by line while that parse fails. `isTable` remembers results by text through `perText`, and its own comment notes that a table being typed in mints one entry per keystroke, so every keystroke misses. `CellEditor`'s listener commits each cell keystroke into the page, which steps the scan.[^13]

**Solution** [Literal]

`regions.ts` keeps the two-line `isTable` parse that confirms header plus delimiter, then extends the body line by line through `endsBody`: a blank line ends it, and a line that passes the lexical prefilter `MAY_OPEN` (a superset of every block opener's first characters) ends it when `opensBlock`, one parse of `| a |\n| - |\n<line>` remembered per line through `perText` at a cap of 4096, yields more than one block. The whole-block confirm and the shrink loop are deleted. This is the prefilter-then-cached-parse pattern `isHeadingLine` and `isThematicBreakLine` already follow; per-line facts the scan holds can't answer it, since `tableRegions` runs before the scan derives headings, quotes, breaks, and references, and the facts it derives later differ from the table extension for an unpaired fence, a `*` item, a bare `-` or `1.`, a `<span>`-led row, a footnote definition, and indented code. Table extents don't change. The `rescan` window still spans the table, so what remains per keystroke is the linear line scan with no micromark parse: 0.3 ms at 200 rows and about 2 ms at 1,000, and a cold open of a 1,000-row table whose every row is digit-led and unique, the worst case, costs about 80 ms once. HEAD's whole-table parse also throws under the development export condition (a `devlop` assertion in `mdast-util-gfm-task-list-item`) on a body holding an empty list item followed by a `[ ] task` line, which crashes `scanDoc` in `npm run dev`; the new path never parses two body lines together. A seeded property in `Engine/Tables/regions.test.ts`, `a table body runs exactly as far as the whole-table parse reads it`, checks over 2,000 seeds that each region's text parses as one table and that the region plus its next non-blank line doesn't; reverting `endsBody` to blank-only, or dropping any opener class from `MAY_OPEN`, turns it red within 69 seeds. The property's seeded `stream` generator is the one `Engine/docScan.test.ts` already holds, shared from a test helper rather than copied.

#### I-018 • The footer's word and character figures are a second reading of what the editor draws, and the two already disagree.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Medium (=🟢≈ +21=) | Parallel Build | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

The footer's figures come from `subfieldStats`, which keeps its own chrome reader (`proseStart`) and hidden-token table (`hiddenOf`), where the editor's hide set comes from the line intents and `tokenIntents`; and `pageStats` runs `scanDoc(body)` from scratch on every settled body string while the editor holds the stepped scan of the same text. The two readings disagree: `- [] hello`, which the editor draws as plain text, counts 5 characters instead of 10, and in a paragraph of 40 or more lines a `*…*` spanning two lines has its markers counted as text, because `CHUNK_LINES` tokenizes such a run line by line where the editor tokenizes the chunk whole.[^18]

**Solution** [Deferred]

Deferred by the owner, who kept the figures a second reading of the draw while I-016's cache replacement lands. The counts come from the editor's own derivations: a `chromeOf` reading each prose line's cached line intents replaces `proseStart`'s heading, list, quote, callout, and rule logic, the scan's `embeds` and `webpages` spans replace its lone-embed half, and `CHUNK_LINES` goes, so every chunk tokenizes whole. `hiddenOf` stays as the counter's token policy, since `tokenIntents` returns early for link, wikilink, and citation tokens, whose hides live in `decorations.ts`, and draws inline code, against the counter's contract that code counts nothing and link markers are hidden. The page figures read the open editor's held scan through a footer seam: `BodyMount` carries its view, `pageDetailCache.heldView(path)` returns the first mounted editor of a path, `heldStats(view, range?)` in `docCache.ts` counts from it through per-view token memories, and the Subfield page becomes `{ target, stats }`, built once per settled body by `subfieldPage(target, body)`, with `computeStats(body)` kept for a page with no editor mounted. The seam reaches the main pane, Page Windows, and the Glance alike, and the 120 ms settle stays, since it also drives the store write. Two red-first tests in `subfieldStats.test.ts` pin the disagreements (`- [] hello` counts 10; the long paragraph's emphasis drops its markers), and `subfieldItems.test.ts` pins that the figures read the mounted editor rather than the settled body. Typed at +15 beyond I-016's cache fix. It lands on I-016's `perPass` core and carries I-017's bound into the rewritten counter.

#### I-021 • Each keystroke re-allocates every carried line intent, fence-line record, and table row below the edit just to shift their positions.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Medium (=🟢≈ +6=) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

On a very long page, typing near the top costs more than typing near the bottom, because every intent below the edit is rebuilt with shifted positions: `stepLineIntents` carries lines below an edit by re-allocating each intent through `moveIntent`, `splice` runs `shiftSpan` per fenced line and `shiftTable` per table, and `railIntents` re-derives whole-document rails per version though rails are read for the viewport. Measured at 1.81 ms against 0.25 ms at 14,500 lines, and 0.72 ms against 0.17 ms at 20,000. The carry stays O(N) whatever the fix, because every per-line array and `lineStarts` are copied and shifted per keystroke by design; what can go is the per-object allocation, a constant-factor cost.[^21]

**Solution** [Deferred]

Deferred until a long-page benchmark is part of the gates. Cached line intents would be held relative to their line start and re-based where they're read (`assembleLineIntents`, `prefixEndAt`, `seatPastMarker`, and `decorations.ts`'s `atomicsOn`), so the carry copies references, and rails would be derived for the window from `railIntents` as I-019 leaves it. Editor-Internals' sentence that an intent carries document positions only in `from` and `to` is rewritten with it, and `docCache.test.ts`'s `stepLineIntents ≡ docLineIntents` property stays the specification. The fence and table half is open: a block's range could be held once in `fenceOpeners` rather than on every line. It was not typed; the net is an estimate.

#### I-044 • What kind of surface an editor sits in is spread over five uncoordinated switches, two sentinel ancestor strings, and a CSS list of host classes.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Medium (=🟢+30=) | Drift | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

To mount the editor somewhere new, a host picks among `readOnly`, `active`, `locked`, `inert`, `pageSurface`, `preview`, a connections mode (`preview | window | inert`; the reader window sets both "inerts"), and fake ancestor strings (`READER_ANCESTOR`, `GLANCE_ANCESTORS`) that switch off nested embeds through `host.ancestors.length <= 1`, then adds itself to the placeholder selector in `markdown-pm.css`. The sentinels carry one latent misfire: `embedExclusions` excludes every ancestor's title, so a page titled "glance" or "page-reader" can't be embedded inside a glance or the reader.[^44]

**Solution** [Deferred]

Waits for the SidePane editor. One `EditorSurface` union on `EditorHostOptions` in `Core/Pages/editorHost.tsx` (`page`, `tile`, `preview`, `snapshot`, `value`), switched once in a `traitsOf(surface)` that derives the connections mode, `pageSurface`, `liveEmbeds`, `placeholder`, `preview`, and `inert`; `EditorHost` gains `liveEmbeds` and `placeholder`, the sentinel ancestors go, and the CSS host list becomes one `.mdpm-quiet .cm-placeholder` rule the shell sets. A tile's and a Text value's connections mode stays the holder's, since the surface can't derive it. Typed at +30, most of it the switch in `editorHost.tsx`.

#### I-027 • A `#` line or a footnote run inside an HTML block still counts as a heading or as the footnotes section.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Medium (=🟢≈ +72=) | Drift | `e3d5c1a10` | **Created:** 09-24-2026<br>**Updated:** 10-16-2026 |

**Description**

The heading scan skips a `#` line inside a fence or a `$$` math block but not one inside an HTML block, so `<div>` / `# x` / `</div>` still lists `x` in the Outline, the heading picker, the fold chevrons, and the index, and the editor draws the line as a heading. The same root leaves footnote definitions inside a `<!-- … -->` block numbered and drawn as the footnotes section, where other Markdown readers treat them as a hidden comment: `assembleCitations` excludes lines through `inSealedLine`, which seals fences, maths, and tables but not `html`. The editor can write such a block itself: with **HTML Shortcuts** on, ⌘/ over several lines wraps them in one `<!-- … -->`. The HTML-block detector can't decide this as written: it opens a block on any line that starts with a tag and runs it to the next blank line, so a line led by an inline tag or a one-line comment (`<b>Note:</b> read this`, `<!-- todo -->`) would swallow every heading beneath it. The owner ruled that whether they count follows the **HTML Formatting** setting: on, the heading scan, the footnote assembly, the line intents, and the block model seal HTML-block lines; off, they count and render. Enter's alias commit already follows the setting through the scan's HTML spans (`commitAliasOnEnter`'s `liveSlotAt`, whose `inRawHtml` asks `spanAt(docScan(state.doc).html, …)`), so an unclosed opener that the scan and the parser read differently decides Enter by the scan's reading.[^27]

**Solution** [Deferred]

Waits at its measured cost, most of which is following the setting on both sides of the app. CommonMark's start and end conditions in `markdownCode.ts` and `htmlBlocks` are +21 on their own. Following the setting is +41: the scan records the reading it was built under (`DocScan.sealsHtml`, `scanDoc(text, sealsHtml)`), `inSealedLine` adds the HTML clause, the editor's cache re-derives every held document when the setting turns, and the index seed, the rename cascade, and the footer's figures read the setting where they run. A tag alone on a line opens a block only below a blank line (a fifth intentional CommonMark divergence, which the parser is masked to agree with), and keeping `rescan ≡ scanDoc` under that rule takes three window edge guards in `quietAt`, `loneAbove`, and `pairsBelow` beside the parser's lone-tag mask, about +10 that I-026's estimate leaves out, since they serve only the lone-tag start. Two consequences come with it: with the setting on, `listRenumber`, `listDrag`, the `/` menu, and the embed seat also stop inside a raw HTML block, and the content index keeps each page's headings and citation relations under the setting as it stood when the page was indexed, so turning the setting would need a re-index. Lands on I-026's blank-line rule, since sealing without it lets a half-typed `<!--` seal everything below it. Its `sealsHtml` parameter lands on I-016's rewritten `computeStats` and `pageStats`.

#### I-019 • Outliner rails draw guide lines for list ancestors that sit above an unrelated heading or paragraph.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (=🟢+6=) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

An indented item placed after a heading or paragraph draws hairline rails as though it were nested under a list that ended above. `railIntents` writes `railKind` only on list lines and never resets it on a non-list line, so the next indented item inherits the old ancestors' kinds, and the kind also sets the rail's position. Probed: `- a`, `\t- b`, a heading, then `\t\t- c` draws two bullet rails at levels 0 and 1 on the last line.[^19]

**Solution** [Proposed]

`railIntents` takes the lines and clears `railKind` on a non-blank line that is neither a list item nor indented, the same blank-or-indented test `blockModel`'s `isListCont` uses; blank lines and indented continuations keep the list open, which loose lists need. `withRails` passes the scan's lines, and `cellStatic.tsx`'s `renderCellBody` passes its own. An unindented line directly under an item now ends the rails there, which follows what the page draws (the line at column 0) where CommonMark would read a lazy continuation; the existing test 'a non-list line between siblings breaks the run (caps on both sides of the gap)' pins the opposite and is rewritten as 'a line outside the list ends it, so a later indented item draws no ancestor rail', which holds the probe above and goes red without the reset. A second test, 'a blank line or an indented continuation keeps the list open', goes red if the reset also fires on blank lines.

#### I-020 • A heading written with closing hashes (`# foo #`) keeps them in its name, so the outline, fold keys, index, and heading links read `foo #` where other Markdown readers read `foo`.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (=🟢+5=) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

A heading like `# foo #` lists as "foo #", and a link written `[[Page#foo]]`, as any CommonMark or Obsidian reader would name it, doesn't resolve. Adding closing hashes to an existing heading also counts as a rename: typing ` ##` after `## Setup` rewrites every `[[#Setup]]` link on the page to `[[#Setup ##]]`. `headingParts` captures the rest of the line as `content`, and every heading-name reader (`scanHeadings`, `headingRenameSettle` in `headingRenameOf` and at settle, and `gripMenu`'s Copy Link) takes `content.trim()`, while the micromark parse that confirms the heading strips the closing sequence. Probed: the outline of `# foo #`, `## bar ##`, `### baz#`, `#### #` reads `foo #`, `bar ##`, `baz#`, `#`.[^20]

**Solution** [Proposed]

`headingParts` gains a `text` field with CommonMark's closing sequence stripped (a `#` run preceded by a space or tab, or a line of only `#`s), and all four name readers take it; `content` and `contentStart` stay raw for the editing callers, so drawing and rewriting keep the hashes. Its unread `space` field goes. Nothing on disk is rewritten, but per-machine fold keys saved through `prefs.save('folds', …)` change once for such headings, so their remembered folds open once; `nexus.db` heading rows regenerate; and a link already written as `[[Page#foo #]]` stops resolving. Two tests pin it: `folding.test.ts`'s 'names a heading without its closing hashes, as CommonMark reads it' expects `foo`, `bar`, `baz#`, and an empty name, and `headingRenameSettle.test.tsx`'s 'closing hashes added to a heading rename nothing' expects no rename and an untouched link; both go red against today's `content.trim()`.

#### I-046 • A new block or tile kind falls through to silent defaults in the grip menu and block starts.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (=🟢+13=) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

Adding a new kind of block (images are planned) would get the plain grip menu and default behavior in four places with nothing flagging the miss: `contextFor`'s `default`, the `GRIP_KINDS` plain `Set`, `blockStarts`' `default`, and a `startsWith` action chain in `gripMenu.ts` that drops an unhandled action.[^46]

**Solution** [Deferred]

Waits for the next block kind. `contextFor` and `blockStarts` switch over every `BlockKind` with the plain kinds listed, and `GRIP_KINDS` becomes a `Record<BlockKind, boolean>`; deleting one case or key at each site was confirmed to fail the typecheck. The action chain can't be made exhaustive, since its actions are template-literal strings the menu rows mint and its handler returns nothing, so a switch over them compiles with a case missing. Typed at +13. Lands with I-043, whose `gripKinds(scope)` is where the Record lives.

#### I-023 • While the pointer is over the editor, every caret move re-measures every visible code block's language tag.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Mini (=🟢+2=) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

While the pointer rests over the editor, every caret move re-measures every visible code block's language tag through `getBoundingClientRect`, including moves along one line that can't change a tag. `TagReveal` invalidates on `selectionSet` and `focusChanged` among its triggers, and `moved()` drops the cached tags and requests a measure while the pointer is inside. A caret move never changes a tag's position, but it does change which tags exist: the tag widget is drawn only when the caret isn't on the fence's opening line, so a caret moving onto or off that line adds or drops a `.codeblock-language` element with no height change, and a blur does the same. Confirmed by reading and by a test that counts measures per caret move.[^23]

**Solution** [Literal]

`TagReveal.update` re-measures on a selection change only when the caret's line changes, and keeps `docChanged`, `viewportChanged`, `geometryChanged`, and `focusChanged`, which is rare; dropping `selectionSet` and `focusChanged` outright would strand a tag that appears when the caret leaves an opening line, so the copy reveal wouldn't show until the pointer left. Moves along one line stop measuring. `blockHandles.test.ts`'s 'measures again on a caret move only when the caret changes lines' asserts no measure after a same-line move and one after a cross-line move, red (two measures where one is expected) when `selectionSet` re-measures unconditionally. Keystrokes still re-measure through `docChanged` while the pointer rests over the editor; that cost stays.

#### I-024 • Text that arrives from another copy of a page at the end of a folded section shows up below the fold.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Mini (=🟢+2=) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

If the same page is open twice (a tab and a window) with a section folded in one, text added at the end of that section from the other copy, or landing from disk, appears below the folded section instead of inside it. `foldField` maps each entry's end backward (`mapPos(e.to, -1)`), so an insertion at exactly `e.to` stays outside, and a landing through `mirrorBody` skips the drop-and-retake Editor-Internals prescribes for a region rewritten under a fold, which `editAcrossCitations` performs. Reproduced in a test that mirrors a body with a line added at a folded section's end: the line draws outside the fold.[^24]

**Solution** [Literal]

After `foldField` filters the surviving entries against the live regions, a transaction carrying the `mirrored` annotation takes each entry's end from its live region, so landed text at a section's end joins the fold; a typed edit keeps its own path. `foldState.test.tsx`'s 'text landing from another mount at a folded section's end joins the fold' asserts the landed line isn't drawn, red without the `mirrored` line, and the existing non-mirrored 'and without the teardown the new row draws outside the fold' still passes. Editor-Internals' fold sentence gains that the fold field re-takes a surviving fold's end from the live region for a mirrored landing.

#### I-014 • Dragging a table row, column, or column edge redraws the whole table on every mouse movement.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Mini (=🟢+4=) | Parallel Build | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-09-2026 |

**Description**

While a row or column is dragged, the whole table component redraws on every pointer move, 60 or more times a second (every row, every cell's classes and transform, every grip), because `MarkdownTable` holds the pointer's exact offset in React state; resizing a column does the same through `setResize` on each move. Large Markdown tables drag less smoothly than they need to as a result. The collection table view solves the same problem by writing the offset to a CSS variable and setting state only when the drop slot changes. Profiling the real `MarkdownTable` recorded one full table commit per pointer move (20 moves inside one slot gave 20 commits), with render time growing with cell count, while `useColumns.ts`'s `startColumnDrag` writes `--col-drag-x` per move and calls `setColDrag` only when `to` changes. `trackHover` also calls `setHover` on each cell crossing, read only for the grips' reveal.[^14]

**Solution** [Literal]

React state keeps the slot and the activation: `Drag` becomes `{ axis, from, to }` and `resize` becomes the boundary index. The pointer's offset and the two resize widths move to CSS variables on the table wrap: `startDrag`'s `resolve` writes `--tbl-drag` and `shift` reads it in the dragged row's or column's transform, and `startResize` writes `--tbl-left` and `--tbl-right` at activation and on each move, which `colWidth` reads for the boundary pair. `setDrag` fires only at activation and when the slot changes, and `setResize` only at activation and at the end. Each variable is written at activation before anything reads it and stays after the drop, so the subject holds its drop offset until the reorder's new model clears the drag, the same frame HEAD's state held it, with no snap-back. Hover stays React state: the grips are absolutely positioned siblings of the `<table>`, laid out from the geometry, so no selector relates the hovered cell's index to its grip without one generated rule per index; the update already fires once per cell crossing, and every `StaticCell` is memoized, so a crossing re-renders only `MarkdownTable`'s shell, while the imperative alternative (about +4) would split `data-reveal-host` between React and a handler. Behavior is unchanged; `dragOrigin.test.tsx` and the `Tables` suite pass unchanged, and a per-move render count would need a commit-counting profiler rather than a test.

#### I-045 • The host carries one typed menu member per construct, so a new construct menu needs a new host member in three places.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Small (=🔴≈ −4=) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

Every kind of menu the editor shows (grip, table, footnote, alias row) has its own entry on `EditorHost.menus`, each of which the host only pops: `api.ts` imports the grip, table, citation, and alias-row menu models to type them, `editorHost.tsx` builds each model only to `popMenu` it, and the test harness mirrors them. Confirmed by reading.[^45]

**Solution** [Deferred]

Waits for the SidePane editor. One `menus.pop<A>(items)` beside `format`, with the editor building its own rows from the pure models; moving the model files alone counts for nothing. Not typed, so the net is an estimate. Lands with I-044, whose `EditorSurface` is where the SidePane adds its kind.

#### I-047 • About thirty names are exported only for tests to import.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Small (±0) | Residue | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

About thirty `export` keywords in MarkdownPM have a test as their only outside reader (`indentLevel`, `computeStats`, `buildWidgetDecorations`, `refreshTableEffect`, `foldedRegions`, `regionsOf`, `EMPTY_PAGE_TEXT`, and the rest). Each function lives in its file and does real work, so removing the keyword removes no line, and `lineIntentsInto` is the cached-assembly property's reference derivation.[^47]

**Solution** [Literal]

None on their own; a keyword goes when its file is next rewritten.

#### I-048 • In a development build, a page holding an empty `*` item followed by a `[ ] task` line makes the Markdown parser throw.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Small (TBD) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

Under `npm run dev`, a body such as `*` on one line and `[ ] task` on the next throws inside `parse` and `tokenize`, so the viewport tokenizer and the footer's figures fail on that page; CodeMirror deactivates a plugin that throws for the rest of the session. The parser's task-list extension (`mdast-util-gfm-task-list-item`) asserts through `devlop`, whose `development` export condition Vite resolves in the dev build and whose default build in production is a no-op, so a shipped build is unaffected. `scanDoc` throws there too until I-013 lands, through the whole-table confirm in `regions.ts`, which is how it surfaced; after it, `parse` and `tokenize` still do. Probed in vitest under the development condition.[^48]

**Solution** [TBD]

Either the parser wrapper masks the empty item the way it masks a lone fence marker, so micromark never sees the shape, or the dev build resolves the extension without the development condition. Pin it with `parse('*\n[ ] task')` under the development condition.

#### I-049 • A line holding only a non-breaking space ends a table, where the Markdown parser reads it as one more row.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Small (TBD) | Drift | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-08-2026 |

**Description**

A table followed by a line containing only U+00A0 draws as a table that stops above that line, while CommonMark readers and the editor's own parser keep the line as a body row. `tableRegions` ends a body at `line.trim() === ''`, and JavaScript's `trim` strips a non-breaking space where micromark's blank-line test doesn't. Probed while building I-013's property, whose alphabet leaves the case out.[^49]

**Solution** [TBD]

End the body on CommonMark's blank line (spaces and tabs only) rather than `trim()`, and add the line to the table property's alphabet. Lands with or after I-013, which rewrites the same loop.

#### I-067 • A heading rename to a heading holding a pipe turns a lone page embed into a link.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Small (TBD) | Drift | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |

**Description**

A lone `![[A#Old]]` is a page embed. Renaming the heading to one holding a pipe, such as `A|B`, can't be spelled in a wikilink, so the rewrite writes the link whole through the one writer, which falls to the markdown form `![A|B](A#A%7CB)`. The embed rule reads a wikilink alone on its line behind a `!` and no markdown link, so the line stops being an embed and draws as a link behind a `!`. `follower` rewrites the hit whole when `spellsAsWiki` is false for the new heading, `expressibleInLink` refuses a `|` in a heading, and `loneEmbedTitle` matches `pageLinkPattern`, which spells wikilinks alone.[^67]

**Solution** [TBD]

**Your call:** a wikilink can't spell a pipe in a heading, so either the editor draws a markdown page embed, which `loneEmbedTitle` and the embed's readers would then accept, or a heading holding a pipe is refused where a lone embed names it.

#### I-015 • An entered table cell parses its own text twice per keystroke.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Mini (=🟢+1=) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

Every keystroke in a cell runs the full Markdown parse of that cell twice: once for drawing, and once more in `cellCitations`, whose plugin re-runs `marks` on every document change, and `marks` runs `tokenize` on the whole cell just to find footnote markers that usually aren't there.[^15]

**Solution** [Literal]

`marks` returns `Decoration.none` when the cell's text holds no `[^`. Behavior is unchanged, and the two `cellStatic.test.tsx` cases that number a marker inside an open cell keep the positive path pinned.

#### I-017 • Selection figures re-walk every table in the document on each selection change, whatever the selection covers.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Mini (=🟢+2=) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

While a selection is dragged on a page with tables, every pointer step walks and renders every table row in the document: `rangeStats` calls `tableProse(scan)`, which loops over all of `scan.tables`, and the selection listener runs it on every change that moves the range, then sets a fresh object through `usePublishSelection` and `chromeSlice.setEditorSelection`. The prose side, `proseRuns`, is already bounded to the range. Below I-016's cliff this is sub-millisecond (0.35 ms with 50 tables).[^17]

**Solution** [Literal]

`tableProse` takes the range's `[first, last]` lines, skips a region whose last line is above `first`, and stops at one whose first line is past `last`, the walk `proseRuns` already does. Coalescing `onSelection` to one per frame is left out: Chromium delivers pointer moves, and so CodeMirror's selection updates during a drag, aligned to animation frames, and a keyboard-extended selection is discrete, so a frame scheduler would change nothing measurable. No test pins it, since the bound changes no output; the counter and selection tests pass unchanged. It lands after I-016, on the `tableProse` signature that gives the cell reader.

#### I-022 • Every caret move rebuilds the ranges that let the caret step over an embedded tile.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Mini (=🟢+6=) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

The ranges that make the caret skip an embedded tile in one move are rebuilt on every caret move, where Editor-Internals holds the atomic set once per version. CodeMirror calls every `atomicRanges` provider on each cursor motion, and `embedAtomic` allocates a fresh `RangeSet` and a fresh `Decoration.mark({})` per tile on each call, though `embedField.ranges` changes only when a tile moves: `mapRanges` returns a new array on every document change and `buildTiles` on every rebuild, while a selection-only transaction keeps it. Confirmed by reading and by a test that sees two equal but distinct sets across one caret move.[^22]

**Solution** [Literal]

One module-level `Decoration.mark({})`, and a `WeakMap` from the field's `ranges` array to the set built from it, so a caret move returns the set the last edit built; since the array's identity follows the document version, the clamp to the document's length stays valid. Nothing visible changes. `embedBoundaryKeys.test.tsx`'s 'a caret move reads the atomic set the last edit built' finds the provider whose set covers the tile line and asserts a caret move returns the same set, red when each call builds a fresh one.

#### I-068 • A link picked before its page's headings load keeps a heading the page may not hold.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Mini (=🟢+4=) | Shortcut | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |

**Description**

A page picked in the connection autocomplete keeps the heading typed after its title unless the page's headings are known to lack it. Before the page's headings load, `headingsOf` answers nothing and `headingMissing` answers false, so a pick made in that window writes `[[Page#Heading]]` for a heading the page may not hold, which draws as missing. `headingMissing` reads missing only when the keys are known and lack the heading, and `commit`'s `keptHeading` keeps the typed heading whenever it doesn't.[^68]

**Solution** [Proposed]

The pick awaits the page's headings before it keeps one, or drops the heading when they're unknown.

### A3 • Nexus & Data

#### I-039 • An ID lost or damaged outside the app is replaced rather than recovered on every path but a held page's own event, and an ID two files share is answered two ways.

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

Two files sharing one ID are held in the tree together until the next open gives the copy a fresh one, and the lookups answer that ID two ways: the window's `pagesByIdOf` and the reconcile index keep the first the walk listed, while the host's `nexusPages` `byId`, which a restore and every refill read, answers null and `livePathOf` none, with the ledger listing the rest and picking the eldest. A Context ID two registry entries share resolves to the last entry through `contextWorldOf`. A copy the open can't re-mint keeps sharing the ID with no notice.

The device already keeps what the last open saw, the record baseline, keyed by ID with each entity's path, but only the remint ledger reads it, the open's adoption pass runs before this Nexus's store is open, and the held page's restamp reads only the stamp entry, which a failed stamp spends. `applyPage` alone pushes `held` onto `owed.stamp`, and `listUnreadable` keeps no `held`, so `oweRetry` and the open's `stampMissing` hand `stampPage` none; `stampPage` mints through `contentIdAt` for a `missing` admission or an overwritten `malformed` one, `stampFolder` through `newId()`, `ensurePageId` through `stampPage`, `ensureIdentity` over an id-less `nexus.json`, and `ensureContextsRegistry` through `seededRegistry`; `contextEntry` requires a non-empty `id`; `idHeld` checks pages alone; `stampAdopted` runs inside `prepareOpenedNexus`, ahead of `openStores`; `readBaseline` is read only by `runOpenLedger`.[^39]

**Solution** [Proposed]

One previous-ID lookup serves every stamp, and the comment in `stampPage` marking this approach goes with it.

- **The Lookup:** the ID the listed entry or the held tree last held at the path, else the one the record baseline places there, written back unless another entity holds it by then.
- **Every Stamp:** `stampPage` and `stampFolder` take it for a `missing` admission and a `malformed` one alike, so Try Again, a restore, and the open recover rather than mint. A listed entry keeps the ID its entity held, so a failed stamp's Try Again still has it.
- **The Open:** the adoption pass runs once this Nexus's store is open, or is handed its baseline.
- **Contexts:** the registry reads past an entry missing its `id`, which takes the same lookup by its folder's path, and a deleted registry is rebuilt from the Contexts folders and the baseline rather than reseeded.
- **The Nexus:** the app's record of opened Nexuses keeps each one's ID by path, which `ensureIdentity` reads before minting.
- **Duplicates:** the walk and an entity's own event leave a second claimant of an ID out of the tree, listed with a Try Again that re-mints it; the original is the path the baseline holds, or the eldest by birth time where it holds none. `recordsOf` then lists each ID once, so one rule remains, and the unanswered ID in `heldPages.ts`'s `writablePathsOf`, the ledger's `duplicates`, and `pickEldest` go.

#### I-032 • Twenty-three channels write Nexus files beside `mutate`, and six files can be written through both.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Moderate | Large (±0) | Parallel Build | `e448ed46f` | **Created:** 09-27-2026<br>**Updated:** 10-25-2026 |

**Description**

Twenty-three channels write Nexus files beside the one dispatcher, `mutate`: six view and container channels, seven tile channels, five configuration channels (personalization, the excluded folders, the asset folder, the Matrix, and navigation), asset adoption, the page-body write and history restore, `exclusions:clear`, and `nexus:rename`. Four have a reason to stay separate: `nexus:rename` re-targets the whole session, `exclusions:clear` sweeps files the live tree deliberately doesn't hold, and `page:updateBody` and `tiles:writeMarkdown` carry a base-hash check and answer a stale write with a conflict. The other six tile channels wait on tiles having records, and the remaining thirteen have no structural reason. Every family first appears after `mutate` (06-16): views 06-27, personalization 07-05, and tiles 07-10 as `blocks:*`; nothing requires a new write to use it. Six files are writable through both `mutate` and a separate channel: a container's sidecar (`setActiveView` and `setDisclosureLock` beside `views:*` and `container:configure`), `settings.json` (`setProfileIcon` and `setProfileImage` beside `personalization:set`, `exclusions:set`, and `assets:setDir`), `state.json` (`reorderTop`, `reorderPanelContexts`, and `reorderSpaces` beside `nav:write`), `matrix.json` and tile boards (a delete's or move's configuration pass beside `matrix:write` and `tiles:*`), and `homepage.json` (`setBanner` beside `assets:setDir`'s migration). Every door settles through the one write gate, `withWriteRoot`, and `nav:write` and `matrix:write` also answer the window through the watcher, whose `pushConfig` re-reads the file on the app's own echo. A new feature that writes a Nexus file therefore picks a door by hand.[^32]

**Solution** [TBD]

Fold the thirteen channels without a structural reason into `mutate`'s operation union, so a new write is one union entry, and keep `nexus:rename`, `exclusions:clear`, and the two base-hash body writes. The other six tile channels fold only once tiles have records, which nothing sizes yet. Every write already settles through the write gate's flush, so a folded channel needs no confirm of its own. `MutateReply` is one optional-field bag whose `created` already answers per operation, a path for a content create and an id for a property's; a folded channel that answers something else carries its answer the same way. CorePM's *§Mutations* and the comment on `mutateRequest` follow the fold.

#### I-036 • A page missing its ID that a folder's read finds after its own event was spent stays out of the tree until the next full read.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Medium (=🟢+10=) | Shortcut | `93baa6931` | **Created:** 10-01-2026<br>**Updated:** 10-19-2026 |

**Description**

A page without an ID is stamped by its own watcher event, which arrives once the file stops changing, or by a listing under a folder newly in reach (a Try Again on the folder, or a folder a change of Excluded Folders admits). A folder's read leaves any other page missing its ID out of the tree, waiting for that event. When the event was already spent or never comes, the page is held nowhere, listed nowhere, and stamped by nothing until the next full read, which lists it under a Try Again notice; a full read only lists such a page, and only its own event, Try Again, or a reopen stamps it. Two routes produce it: a folder sidecar removed outside the app, whose folder the walk lists and the stamp reads again, and a Trash restore or move of a folder holding a page already listed missing; a Set restored with an ID-less page is left unlisted by the held tree while a fresh walk lists it missing its ID, since the relocate's events never put the landed Set in reach for stamping. Apart from these, a settle that lands while a stamp pass is in flight can push a tree that still lists the page being stamped, so the window may post one Try Again notice for a page whose ID lands a moment later. `applyFolder` lists only the missing entries `stampable` returns, unless the tree had listed the folder unreadable for a reason other than a missing ID, and `stampable` takes a page only under a path in `owed.whole`, which `oweRetry` and a change of Excluded Folders fill and `restoreTrashed`'s `relocate` doesn't; `walkWhileOwed` stamps from a walk's listing through the same filter; and `stampListed` splices `owed.stamp` empty before each `stampMissing` call, so `shown` hides nothing while that pass runs.[^36]

**Solution** [TBD]

Either a folder's read, or a full read, stamps a page missing its ID whose file has sat still longer than the watcher's quiet window, which is the evidence a stamp needs that its writer has finished, or the page keeps a listed entry that its next read stamps. A Trash restore of a Set or Collection owes the landed folder as newly in reach, as `oweRetry` does for a Try Again's path, so the next settle's `stampable` admits the page it lists missing. The notice half closes when an entry stays on the owed list until its stamp lands, which needs the two passes that can overlap (a write's gate and a watcher batch) to share the list without one taking the other's entries.

#### I-037 • A write's reply waits behind a walk an outside change owes.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Medium (=🟢+10=) | Shortcut | `93baa6931` | **Created:** 10-01-2026<br>**Updated:** 10-04-2026 |

**Description**

A write the user makes while the app is re-reading the Nexus for an outside change waits for that read before its result shows and its reply returns. Every settle runs one at a time on one chain, and a walk an outside batch owes runs as a turn on it; a write that lands meanwhile queues its own settle behind the walk and, unless it's the editor's body save, restarts it. An icon change that answers in 1 to 3 ms alone took 98 ms during the walk of a 4,000-page Nexus, and the wait grows with the Nexus. It applies only while a walk is in flight, which a Space or Context leaving, a registry definition arriving from outside, or a change of scope owes. `settleNow` runs `settle` through `inTurn`, the chain `payOwedWalk` shares; `settle` begins with `walkWhileOwed`; and `applyOwn` marks the disk moved for every write but the editor's body save, so the walk in flight reads again.[^37]

**Solution** [Proposed]

A write's own change is pushed, and its reply sent, ahead of a walk it didn't owe: the settle pushes what the applied events moved before it pays a walk another batch owed, and the walk's result follows as its own version.

#### I-033 • Delete All and Restore All walk the whole Trash once for every bundle that hands a Link value to it.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Medium (=🟢+15=) | Shortcut | `34227ef5c` | **Created:** 09-28-2026<br>**Updated:** 10-16-2026 |

**Description**

Emptying a bundle hands the Link values its record kept, and any its empty-time strip took, to the page each value named, still in the Trash, through `parkLinks`, whose `originPagesIn` lists every bundle and each Set or Collection bundle's pages once per call. The Trash frame's Delete All sends one request per row, so a batch of link-carrying bundles walks the Trash once per bundle: about 13 ms per empty at 100 bundles and 32 ms at 300, summing to about 0.45 s and 4 s.[^33]

**Solution** [Proposed]

Send the frame's Delete All and Restore All as one request carrying the bundle list; the host lists the Trash's pages once for the batch and strikes each emptied bundle's pages from that list as it goes. Single-row empties and restores keep today's path.

#### I-060 • An app file this session never read and can't read opens as empty, so its section shows defaults and its changes are refused, some without a word.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Medium (=🟢+15=) | Drift | `0c80012cb` | **Created:** 09-26-2026<br>**Updated:** 10-25-2026 |

**Description**

Four of Pommora's own JSON files are read through `readAppFile`: `state.json` (Collection, Context and Space order, pins, and the Nexus banner), `matrix.json` (the Matrix's grouping, filter, force and display settings), `homepage.json` (the Homepage banner and heading icon), and `crops.json` (image framing). `readAppFile` treats a file this session never read the same way whether it's absent or only unreadable, for example an evicted iCloud placeholder offline, which `atomicWrite.ts` itself names as the unreadable case: both read as empty. `readLast` already reports `unreadable`, and `readAppFile` drops it (`?? null`). The walk then opens the Nexus with the sidebar sorted by title, no pins, Matrix settings at their defaults, and Homepage banners and crops missing. Only the board's `_tiles.json` reads through `readAppFileKnown`, and it stays closed with a notice that offers to try again.

Every write to one of these files is then refused by `updateNexusConfig`'s strict read-modify-write, and the user hears about it only sometimes. A reorder, a banner, a crop or a heading-icon change goes through `mutate`, and its refusal is posted. A pin toggle or a Matrix change goes through `persist(…, true)`, which only logs. The pin shows as set, isn't saved, and is replaced by the disk's copy once the file reads again. The asset migration breaks its own rule in the same way. `collectRefs` says an unreadable store holds the sweep, but its `state.json` and `homepage.json` refs read through `readAppFile`, answer with no banner, and add no `skipped` entry. `sweepLegacyRoot` then sends to the trash the legacy banner image the unreadable file still names.

Two of the three hand-authored files, `nexus.json` and `settings.json`, read through `readKept`, which throws on an unreadable file this session never read, so the open fails there first; the third, `properties.json`, opens the Nexus with no property definitions and names the list unreadable. This finding covers the case where only the four app-written files are unreadable, which is the likely iCloud shape, since they're the least recently touched files in `.nexus/`.[^60]

**Solution** [TBD]

Route the four readers (the walk's `readConfig`, `readNavigationFile`, `readMatrixFile`, and the file-event arms for `state.json`, `homepage.json`, and `crops.json`) through `readAppFileKnown`. When a file answers `undefined`, the open posts one notice, as the board does: its section shows defaults, and its changes won't save until it reads. `collectRefs` pushes a `skipped` entry for a store that answers `undefined`, so the sweep holds. Leave `persist`'s quiet flag alone, since the notice at open already tells the user. **Your call:** `state.json` alone. Either it holds the open, because it seeds the order every surface reads, or it opens with defaults and the notice. Matrix, Homepage and crops follow the board.

#### I-076 • An action refused for earlier work still owed runs that cleanup unseen, so files it lets go are never named and Try Again leaves the action undone.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Medium (TBD) | Shortcut | `0b6857ddb` | **Created:** 10-25-2026<br>**Updated:** 10-25-2026 |

**Description**

An action that lands on a name an earlier change still owes work for is refused with the "owed" answer (`OWED`). The shared action runner (`mutate`) then runs the cleanup once (`finishOwed`) and sends the action again. Two gaps follow.

The cleanup's report is discarded. A file the cleanup can't safely rewrite is named once and let go rather than kept owed (B-5 of the Properties Restructure decisions), and that naming lives in the cleanup's reply. When the cleanup runs on an action's behalf, the runner ignores the reply, so those files are never named. They are named only when the person runs the cleanup directly, through the notice's Try Again on an earlier action.

Try Again also does half the job. When the action is still refused after the cleanup, the notice's Try Again runs the cleanup alone. Once it succeeds, the person performs the original action again by hand.

These places refuse with `OWED` and so reach this path: Context and Space create and rename, Context and Space restore from the Trash, the general check on a name a many-file change lands on, property create and rename, and option changes. The batch runner (`many`), the only caller that passes `quiet`, counts an owed refusal as a plain refusal: the batch reports "couldn't be restored" or "couldn't be deleted" for it and offers no Try Again.[^76]

**Solution** [Proposed]

The runner joins the cleanup's report into the action's own reply, so a let-go file is named in the action's notice without Try Again, and a still-owed refusal's Try Again re-runs the whole action, cleanup first and then the action. A batch learns which of its refusals were owed, runs the cleanup once, and offers Try Again for just those items. Whether the runner or each caller owns this is decided in that task; the change is app-wide, so it's tested across every caller above. Found while planning `.claude/Planning/Disclosable Bundles — Implementation Plan.md`, which avoided depending on it.

#### I-035 • An in-app create or rename of a Space, or rename of a Context, leaves the pages already tagged with its new name unlinked until each is read again.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (=🟢+10=) | Shortcut | `93baa6931` | **Created:** 10-01-2026<br>**Updated:** 10-25-2026 |

**Description**

A page tag that names no Space, such as `Projects: [Alpha]` before Alpha exists, stays in the page's file, and every read of the page resolves its tags again, so a Space made outside the app links the pages already tagged with its title at the next walk. Creating a Space, or renaming a Space or a Context, in the app places the node in the held tree from the app's own file event, so a page whose kept tag comes to resolve to it stays unlinked in that tree until something re-reads the page or walks the Nexus: the Space's members, a view's Context column, and the Matrix leave those pages out until the page is saved or edited, or until the next open, Reload, or event the settle can't place. The page's own Property Panel, which resolves its tags against the tree as it renders, already shows the Space. A rename's sweep rewrites the pages holding the old name, and each rewrite relinks its page, so only the pages that already held the new name are missed. `applySpace` places a Space the tree doesn't hold from an own write without a walk; a Context rename commits the registry before its folder moves, so `applyContexts`' `regroup` meets the new title first, and the folder's own move, which `applyMove` places through `moveNodeInTree`, renames the group in place, as a Space rename's `relocate` lands; and only `applyPage` and the walk resolve a page's kept tags, through `contextLinker`.[^35]

**Solution** [Proposed]

The settle's placement of a new or renamed Space, or a renamed Context, resolves the kept tags of the pages holding that Context's key against the new name and patches the pages that resolve to it, in place of owing a walk on every create.

#### I-038 • An outside edit to a page inside a folder the app just renamed or moved is lost until the page's next event.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (=🟢+8=) | Shortcut | `93baa6931` | **Created:** 10-01-2026<br>**Updated:** 10-16-2026 |

**Description**

When the app renames or moves a folder, the held tree carries the folder's pages to the new path at once, as it last read them. An outside edit to one of those pages that the watcher reports under the old path, in a batch that settles after the move, reaches a path that no longer exists: the index drops that path's rows and the tree finds no page there, and the events the move raises at the new path fall inside the move's echo window and are dropped as the app's own. The page shows its earlier state in the tree, the index, and the window until its next edit or the next full read. `applyMove` places the move through `moveNodeInTree`, which carries each node as held; the old path's event reaches `applyPage`, whose `applyFolder` call finds the folder gone and answers `'ok'`, and `indexWrittenPage` removes the path's rows when `stat` finds nothing; `relocate` records both folder paths without bytes, so `isRecentWrite` drops a descendant's event for `PREFIX_WINDOW_MS` (800 ms) whichever side of the move it names.[^38]

**Solution** [Proposed]

The move's echo record carries its destination, and a watched event under the vacated path within the window is re-aimed at the path the move landed on, so the edit reaches the page it belongs to.

#### I-062 • Un-excluding a folder re-spells the links to every page elsewhere that shares a title with one of its pages, with a console line only on failure.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (=🟢+8=) | Shortcut | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |

**Description**

Un-excluding a folder restarts the watcher, and its catch-up seed finds each page under the folder that the index never held, a folder excluded before the Nexus opened or a page added to it while excluded, so each lands as an arrival; a page excluded earlier in the same session pairs with the vanish its exclusion recorded and re-spells nothing. An arrival that shares a title with a sole holder elsewhere path-spells that holder's bare links, so each keeps naming the page it named. One settings toggle can therefore rewrite links across many pages in a single sweep, and the user hears nothing unless the sweep fails, since an outside payment logs a warning to the console in place of posting a notice. `missedEvents` seeds the index through `seedContentIndex`, whose `landed` takes every path the index didn't hold; `settleBatch` owes what the seed saw through `oweSeen`, `payOutsideMoves` reads each landed id the tree holds as an arrival, and `paid` logs only a warning the cascade reports.[^62]

**Solution** [Proposed]

A catch-up seed that follows a change of scope reports its pages as present rather than landed, so the pages a toggle admits re-spell no one's links. Where the arrival rule is wanted for them, the sweep posts a notice the window shows, naming how many pages it rewrote, in place of the console line.

#### I-063 • A heading rename and a move of the same page in one outside batch aim the heading rename's sweep at the page's old path.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (=🟢+6=) | Shortcut | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |

**Description**

A page whose heading is renamed and which is moved in one outside batch, such as a sync landing both, reaches the settle with the heading rename recorded under the page's old path. The settle pays heading renames before moves, and the heading cascade takes the keys that name that path from the held tree, which already holds the page at its new path, so it names no key and sweeps no file: it logs a warning, and the links elsewhere to the renamed heading keep the old one. The move arm then pairs the page by its id and re-spells its links by path alone. `settle` shifts each `owed.renames` entry into `renameCascade` with `seen.path` ahead of `walkWhileOwed`; `renameCascade` takes `namesOf(change.path)` and sweeps `change.path` itself; `payOutsideMoves` pairs the move after, through `livePathOf`.[^63]

**Solution** [Proposed]

The heading arm resolves `seen.path` to the page's live path through `livePathOf` by the page's id, or runs after the move arm so the held tree and the recorded path agree.

#### I-064 • A page dragged out of the Trash in Finder is read as an arrival, so its own stale links aren't repaired as a restore repairs them.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Medium (=🟢+25=) | Parallel Build | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |

**Description**

A page dragged out of `.trash` in Finder reaches the settle as a page arriving, like any file added outside, so the outside lane re-spells only the bare links its title now collides with. The Trash's restore does more: it reads the bundle's record, repairs the returning page's own links against the targets the delete recorded, and hands back the Link values parked with the bundle. A page returned by hand gets none of that, so links inside it that went stale while it sat in the Trash stay as they are. `payOutsideMoves` pairs a vanish with a landing and reads every other landed id as an arrival, and reaches neither the record, `repairLanded`, nor `parkLinks`.[^64]

**Solution** [TBD]

**Your call:** the outside lane recognises a path arriving from `.trash`, reads the bundle's record, and runs the restore's repair for it, or the behavior stands, with the Trash's restore the one way to return a page.

#### I-065 • A Link value naming a title that two pages of one trashed bundle share is parked with neither.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Mini (=🟢+2=) | Shortcut | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |

**Description**

A Link value stripped for naming a page the Trash holds joins that page's bundle, so the restore writes it back. A title that two pages of one deleted Set share, such as two `Notes`, resolves to no page over the Trash's pages, so the value joins no bundle and is dropped. The link was ambiguous before the delete, and the Trash applies the live resolver's rule, but both holders sit in one bundle, so parking there would keep the value for a refill that lands it ambiguous again. `originPagesIn` gives each page the id of its bundle, and `parkLinks` builds `buildPageIndex` over them and parks only a value that resolves to a page.[^65]

**Solution** [TBD]

**Your call:** `parkLinks` parks a value when every holder of its title shares one bundle id, one line, or the value stays dropped, since the refill would land it ambiguous again.

#### I-069 • A Trash bundle whose record holds its link targets as bare IDs fails to decode and drops out of the Trash.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Mini (±0) | Residue | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |

**Description**

A Trash bundle written between `d5462735f` and `6231cb841` records its link targets as `key → id`, where the record decodes `key → { id, path }`. Such a bundle fails to decode: `readRecord` answers null, `listBundles` skips it, so the Trash lists nothing for it, and a restore or empty request for it answers that the deletion record is unreadable. Bundles written before `d5462735f` carry no targets and bundles written after `6231cb841` carry the object form, so only that range is affected.[^69]

**Solution** [Deferred]

Deferred by the owner, whose rule keeps no compatibility decode for a record format that changed within a plan. A bundle found this way is mended by editing its record by hand, or by emptying its folder.

#### I-070 • A restore that lands on a taken name always renames the item coming back, and nothing chooses which side keeps the title.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Medium (=🟢+30=) | Shortcut | `213f95a3b` | **Created:** 10-19-2026<br>**Updated:** 10-21-2026 |

**Description**

A Trash restore names its landing against the titles the tree holds in the destination and steps aside to `Name (2)` through `freeName` when the title is taken, then past anything the disk holds there that the tree doesn't, such as an excluded folder or a file written outside the app, through `createDisambiguated`, so the returning item always yields and the item already there keeps its name. An Archive restore takes the same placement.[^70]

**Solution** [Deferred]

Deferred by the owner: a "Resolve Restoration Conflicts" setting in the Trash & Archive group, Preserve Existing Titles (today's rule, the default) or Preserve Restored Titles, governing the Trash's and the Archive's restores through their one placement owner. Preserve Restored Titles renames the item in the way through the rename path before the restore lands, which leaves two things to settle: the rename's link cascade moves every link resolving to that item, including links that named the returning item while it was away and resolved to its namesake, so those links don't follow the setting; and an excluded folder in the way is content Pommora is told to leave alone.

#### I-071 • Every write to the exclusion list re-reads the Nexus, restarts the watcher, and has sync re-check, carried entries included.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Medium (TBD) | Shortcut | `d0e31804c` | **Created:** 10-20-2026<br>**Updated:** 10-21-2026 |

**Description**

Each write to the exclusion list rescopes the session whole. `applySettings` patches the held scope and answers `'walk'` on any scope change, so the Nexus is read again; the settle then restarts the watcher, whose ignore filter captures the scope at arm time, and Sync reconciles what it admits. A Collection or Set rename or move that carries an excluded folder takes that path twice, since `carrySetAside` writes the landing's entries before the folder moves and drops the sources' after, and archiving a Set or trashing a Collection or Set repeats that carry for each folder it lifts, since `liftSetAside` relocates each excluded folder and the asset directory inside it on its own.[^71]

**Solution** [Proposed]

An incremental rescope reaching every exclusion edit: `applySettings` patching the tree for the entries that changed, the watcher's captured filter taking a new scope without a restart, and Sync's `rescope` checking only the paths those entries name.

#### I-072 • An outside unlink within the watcher's write hold of the app's own write leaves a ghost until the next walk.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Mini (=🔴−1=) | Shortcut | `d0e31804c` | **Created:** 10-21-2026<br>**Updated:** 10-21-2026 |

**Description**

Chokidar's `awaitWriteFinish` holds a path until it has been quiet for about 200 ms and merges the events it sees within that hold, so an outside unlink landing inside the hold of the app's own add, a rename or a write, merges with it. No unlink reaches the app, and the tree and the content index keep the file until the next walk.[^72]

**Solution** [Proposed]

Drop `awaitWriteFinish`, since the event batch already debounces 200 ms, at the cost of one unreadable read of a half-written outside page; or re-stat a held path once its hold ends.

### A4 • Architecture

#### I-042 • Every call site chooses for itself whether an error is shown, logged, or dropped, and about forty host-side failures reach no one.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Moderate | Large (±0) | Drift | `03dde6468` | **Created:** 09-30-2026<br>**Updated:** 10-08-2026 |

**Description**

The window's reporter offers several helpers (`reportRefusal`, `persist`, `notifyReport`, `notifyRetry`), and each caller picks one and, for `persist`, whether it's quiet: settings, footnote visibility, and view options post a notice; folds, embed sizes, the glance size, navigation lists, and the session writer log. About forty `console.error` lines across `Core` and `Desktop` record host-side failures in background passes (the index seed, the repair sweep, re-mint, the finish of owed work), and none reaches the user. Sync's failures travel a fourth way, as a status the Settings pane draws. The user-facing copy for an error is written inline at each site.[^42]

**Solution** [Deferred]

Deferred from the Data Layer work by its Decision Log (M-1), which keeps only the host-to-notice path its own notices need. One table names each kind of error and decides its surface (a notice, a log line, a status, or nothing), the copy, and the action a notice offers; a call site reports a kind and never chooses a surface. *Error Surfaces — Brainstorm Brief* carries the five questions the design settles: the unit of a kind, host-side reach, other surfaces, mobile, and how batches and bursts collapse. Its home is one file readable by both halves, so the reporter's React hook and undo stack move out of `notifications.ts` first.

#### I-040 • Nothing in a file's location says whether it runs in the host or the window, and several files sit in another domain's folder.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Moderate | Large (±0) | Drift | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-25-2026 |

**Description**

Pommora's code runs in two places, the host process that owns the disk and the window that draws the interface, but every Core folder mixes both kinds of file at its root, so a reader can't tell from a path which side a file runs on, and a new file's author learns it only when the host-graph test goes red. Several files also live in a folder they don't belong to: the floating windows' pure tab model and file schema sit in the Interface component folder, so the store and the channel contract import upward into it; the Views root mixes host handlers, window files, and Settings-pane models; and the Settings and Interface channel tables each serve the other's channels. An import-graph closure from Desktop's node-side files reached 205 Core and UIX files spread across nearly every folder (Properties 23 of 70, Views 6 of 58, Interface 4 of 68), while `hostGraph.test.ts` checks only file extensions and an external allowlist.[^40]

**Solution** [TBD]

Two parts. (1) The taxonomy: each domain gets one host-side subfolder holding its `handlers.ts` and the file-backed modules those reach, pure shared modules stay at the root, and `hostGraph.test.ts` asserts every host-closure file sits in one. (2) Moves that stand regardless: `windowTabs`/`windowRecord`/`windowState`/`windowCache`/`windowMorph` into `Core/Navigation/` beside `tabsModel`/`tabsState`/`warmTabs`, which keeps `Core/Session` as the store layer; `filterModel`/`visibilityModel` into `Core/Views/Settings/` and `placeNew` beside the Session creates; `theme:systemAccent`/`host:platform` into `interfaceHandlers` and `devicePrefs:*` into `settingsHandlers`; `chrome.ts` dissolves (`ThumbRect` moves beside its producer in Navigation). **Your call:** whether to ratify part (1)'s taxonomy of one host-side subfolder per domain, enforced by `hostGraph.test.ts`.

### A5 • Theme & UIX

#### I-030 • Buttons never show keyboard focus.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Moderate | Mini (=🟢+4=) | Drift | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |

**Description**

When you move through the interface with Tab, the kit's buttons (toolbar, window, and menu-footer controls) show no sign of having focus. The `button` style sets `outline: none` and puts nothing in its place, while menu rows light a ring on `:focus-visible` through the shared `fieldRing` channel and fields through `focusRing`. One keyboard walk therefore alternates between visible rows and invisible buttons. `button-base.css.ts:80` sets `outline: 'none'`, the file's only `:focus-visible` rule is `revealOnHover`'s opacity, and none of the 9 `focus-visible` rules across Core and UIX stylesheets targets `button`.[^30]

**Solution** [Literal]

Give `button` the row's ring: `'&:focus-visible': { boxShadow: fieldRing(ROW_RING), vars: { '--field-ring': tintAt('var(--accent)', 'secondary') } }`, composed with `outlined`'s inset shadow where both apply. Leave the view strip's suppression (`view-strip.css.ts:45`) as it is, since an Enter-committed rename drops focus onto the segment and a ring would flash after every rename.

#### I-031 • Inside a pop-up pane, pressing a second dropdown while one list is open cuts the list's close short and reopens it at the new dropdown.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (=🟢+8=) | Shortcut | `e3d5c1a10` | **Created:** 09-24-2026<br>**Updated:** 10-03-2026 |

**Description**

When a dropdown's list is open inside a pop-up pane, such as a view tile's settings, pressing a second dropdown in that pane closes the first list and opens the second, but every such list is drawn by one shared pane, so the closing list stops partway through its exit, jumps to the second dropdown, and blooms open there with the new rows. The same press in the toolbar's settings pane only closes the list, because there the list itself draws the full-screen shield that takes the press, and a release after the shield is gone reaches nothing. One settings pane therefore answers the same press two ways depending on where it's opened. `onPointerDown` dismisses every layer above the one holding the press and swallows the release only when the press lands on the closing list's own trigger, and only the lowest shielded layer draws a shield (`shields`), so under `ViewTile`'s settings `PickerMenu` the list draws none, while under the toolbar's unshielded pane it does. `PickerControl` opens on click through `popMenu` and `presentMenu`, which feed the single `PickerMenu` in `MenuPresenter`, and `useExitPresence` clears `closing` as soon as `open` returns to true. A probe in the project's Electron 42 (Chromium 148) confirmed that a press whose target is removed before the release fires no click, which is why the toolbar case swallows the press.[^31]

**Solution** [TBD]

Either every outside-press dismissal calls `suppressReleaseClick()`, so the tile pane behaves as the toolbar pane does, or clicks keep passing through and `MenuPresenter` holds each presented menu in its own `PickerMenu` until `onExited`, so the closing list finishes its exit while the new one blooms at its own trigger, as pickers that own their `PickerMenu` already do. Keeping the shield up through the exit doesn't reach this case, since the list in a shielded pane never draws one. **Your call:** whether a press that closes a list should also act on what it lands on.

#### I-075 • Telling a single click from a double-click on one element is done separately on each surface, in five different ways, with the double-click window written as a number in one place only.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Medium (=🟢≈ +25=) | Parallel Build | `cbacb7ecb` | **Created:** 10-23-2026<br>**Updated:** 10-23-2026 |

**Description**

Where one element answers both a click and a double-click, the code that tells them apart sits on the surface itself, and the codebase holds no shared home for it. Five strategies are in use. A **wait** holds the single click's action until the double-click window passes. A **`detail` guard** lets the click act at once and ignores the press whose `event.detail` counts a second. **First-press-acts** lets the first press do its single-click work, and the second press reads what the first one left. **Act-then-take-over** acts at once and installs a one-shot listener that reverses it when a second press arrives. The last is **none**, where the single and double handlers both run in full.

| Surface | A single click | A double-click | Strategy |
|---------|----------------|----------------|----------|
| Alias picker row | Picks the alias, 300 ms later | Renames it in place | Wait: a local `PICK_DELAY_MS`, cleared by `unpick` |
| Calendar time part | Opens its hour or minute menu | Closes the menu and types the value | `detail` guard, with `onDoubleClick` |
| Embedded page tile | Seats the caret at the nearer edge | Falls to the editor's word selection | `detail` guard |
| Link in the editor | Follows the link, on `click` only at `detail === 1` | Falls to the editor's word selection | `detail` guard, at `mousedown` and again at `click` |
| Table cell | Enters the cell at the point, unless a drag just selected text | Enters the cell, selecting the word | `detail` guard, for the selection case only |
| Tab | Activates the tab | Renames it only if the tab was already active at the first press | First-press-acts, through a ref set at `mousedown` |
| Page title in the detail header | Opens the search at once | Reverses into a rename | Act-then-take-over, through a `mousedown` listener on `window` |
| Group band glyph | Toggles the group, on a band that doesn't open | Toggles it twice, or opens the Set on a band that does | None |
| Tab bar | Nothing | Zooms the window | None |
| Rename labels | Whatever the surrounding row's click does | Begins the rename | None |

The surfaces differ in observable ways. Only the alias picker delays its single click, and its test restates the 300 ms as `PICK_WAIT`, so the window is a number in two files and no other surface reads it. A Set band that doesn't open lets the glyph's click toggle its group on each press of a double-click, so the group folds and unfolds again under the pointer, where the same double-click opens the Set on a band that does. A double-click on an inactive tab activates it and doesn't rename it, so renaming takes a second one, and the detail header's title shows its search for the length of a double-click before the rename replaces it. `RenamableTitle`'s `doubleClick` flag exists so a band can switch the rename door off, which says each surface that disagrees with it has to opt out. The `detail` thresholds also differ: the editor's link and embed guards pass on `detail > 1`, its link click on `detail !== 1`, and the margin press on `detail > 2`.

`Core/Bundles/browser.ts` doesn't read `detail` yet. The ratified Disclosable Bundles plan adds `rowClick(row, detail)` there, where a container discloses and a page checks on `detail === 1` and a page on `detail === 2` makes sure it is checked, and a single click is never delayed. It is the next surface to write the same decision by hand.[^75]

**Solution** [TBD]

One interaction primitive beside `activate.ts` and `gesture.ts` in `UIX/Interactions/` owns the decision. It holds the double-click window as one value and offers the strategies a surface may choose between: acting at once and ignoring the second press, or waiting out the window. The alias picker's timer and constant, the calendar's guard, the editor's guards, the tab's ref, the header's listener, the group band's toggle, and the Bundles browser's `rowClick` move onto it, and `PICK_DELAY_MS` and the test's `PICK_WAIT` leave. A task would touch the primitive and its test, the ten surfaces above, and the plan's Task 4-1. **Your call:** which strategy is the default, with acting at once keeping every click immediate and waiting making a toggle's double-click quiet at the cost of a delay on every single click, and whether a group band's toggle should wait so the double-click stops flickering. Whether the editor's `mousedown` guards, which pass a second press to word selection rather than choose between two actions, belong on the primitive or beside it is the other open point.

#### I-051 • Four waits that let a transition finish each state their own slack.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Small (=🔴−2=) | Drift | `7933c518d` | **Created:** 10-03-2026<br>**Updated:** 10-03-2026 |

**Description**

Four places wait out a transition and then add slack for the frame that paints its end, and each states the slack itself: an exit's unmount waits its beat plus 30 ms (`exitWait`, which a fold's travel also reads), a settle fallback its beat plus 80 ms (`SETTLE_FALLBACK`), a drag-disclose remeasure its beat plus 70 ms, and the native caret's settle deadline the slowest bloom plus 50 ms. One fact, the paint-start delay past a transition, is written four ways, so a fifth wait has no shared value to reach for.[^51]

**Solution** [Deferred]

Deferred by the owner, who ruled that each wait's timing reads right as it stands; one shared slack would move three of them by 10 to 50 ms. The fold, if it comes, is one slack constant in `motion.ts` that `exitWait`, `useSettleFallback`, `dragDisclose`, and `nativeCaret` add to their durations.

#### I-050 • Where a pop-up appears is worked out inside a 50-line block tangled with its screen updates.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Small (=🟢+2=) | Patch-Over | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-16-2026 |

**Description**

Every pop-up picker decides where to sit (flip up or down, center or pin to an edge, clamp to the screen, place its bloom origin) inside one closure in a layout effect, interleaved with latched decisions and state updates. It sits in one of the kit's most-fixed files, and testing any placement decision needs faked DOM measurements. The closure is `measure` in `PickerMenu.tsx`, and nothing in its logic needs React or the DOM. Git history shows 15 commits including 4 fixes in 60 days, while the closure's inputs (trigger rect, pane size, viewport, `bounds`, `direction`, `origin`, `decidedDir`, `decidedCenter`) and outputs (a `Pos`, the effective direction, the latched decisions) are all plain values.[^50]

**Solution** [Proposed]

Extract a pure `placePane({ trigger, pane, viewport, bounds, direction, origin, decided }) → { pos, dir, decided }` beside the component; the effect keeps measuring, latching the returned decisions, and `setPos`/`setEffDir`. `setPos` is already change-guarded (`samePos`), so the extraction is purely structural, and the centering tests become plain function tests.

#### I-061 • A row's hint in a pane that sizes to its content stays on one line and widens the pane, so the format rows carry none.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Mini (TBD) | Drift | `54e93e491` | **Created:** 10-18-2026<br>**Updated:** 10-25-2026 |

**Description**

A property's settings pane sizes to its widest row, with no width ceiling, and a menu row's hint has no measure of its own, so a long hint runs on one line and pushes the pane wide; the Settings window's hints wrap only because that window has a fixed width. The Label Format and Value Format rows were drawn with their hints ("How this property’s name is written into each file’s metadata key." and "How each value is written in the file’s metadata."), which widened every property's settings pane. A cap on those two hints alone was weighed and left out as a one-off rule, and the rows carry no hints.[^61]

**Solution** [Deferred]

One rule for where a hint wraps in a pane that sizes to its content, set once for every such pane: a measure on the row's hint, or a width ceiling on the pane. The format rows then take their hints back.

#### I-073 • Only the Date & Time editor's settings rows carry icons, and no row says whether it sets a property everywhere or only the current view.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Small (TBD) | Drift | `4f63cba01` | **Created:** 10-21-2026<br>**Updated:** 10-25-2026 |

**Description**

The Date & Time editor gives each of its three rows (Date, Day, and Time) an icon, and the Label and Value Format rows and the option editors' Style footing carry one too. The Number editor's seven rows, the Link editor's three, the Checkbox editor's two, and the File editor's one pass none. The same panes also mix settings that change the property across the Nexus with settings that change only the current view, and nothing in a row's wording tells the two apart. The Number editor's Format, Currency, Separators, Decimals, and Fraction write the property, while its Style writes the view; the Checkbox editor's Color writes the property and its Style the view; the Link editor's rows all write the property; and every Date row writes the view. "Format" in the Link and Number editors is the property-wide setting (`link_display`, `number_family`), while the column menu's "Format" submenu for a Link lists the view's own link format.[^73]

**Solution** [Deferred]

Every settings row in the Number, Link, Checkbox, and File editors carries an icon as the Date & Time editor's do. How a row says which layer it sets, and how each type's settings are laid out, wait for a design pass by the owner. Until then, work on Properties moves only a setting that's genuinely misplaced or genuinely confusing, and leaves the rows' wording as it reads.

#### I-074 • A property's stash ages out on the page history timeframe, a setting that governs a different kind of data, so the stash likely needs a timeframe of its own.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Medium (TBD) | Shortcut | `57da5c1db` | **Created:** 10-22-2026<br>**Updated:** 10-25-2026 |

**Description**

Removing a property from a Collection moves its values off the Collection's pages into a stash (`property_stash`) in the Collection's own settings file, where re-adding the property restores them. The stash stays there, and its entries are kept for the History Timeframe (`historyDays`), the setting that sets how long page history snapshots and captures are kept; after that, they're cleaned out. That setting measures the age of saved page text, and a stash entry is a removed property's values waiting to be re-added, so one number sets how long both are recoverable. The Archive already separates these cases: Archive History Timeframe (`archiveHistoryDays`) sets how long archived pages keep their snapshots, follows History Timeframe until it's picked, and never exceeds it. The stash has no such setting, so removed values can't be kept longer than page history, or cleaned out sooner, without changing page history too.[^74]

**Solution** [Deferred]

A stash timeframe set beside the Archive's: a stepped setting over the same day steps, placed after Archive History Timeframe in the History section, that follows History Timeframe until picked and never exceeds it. The cleanup of expired stash entries reads it in place of `historyDays`.

### A6 • Tiles & Embeds

#### I-025 • In a free-text markdown tile, the footnotes divider and the footnote reveal do nothing.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (=🟢≈ +2=) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

In a markdown tile, clicking the footnotes divider or creating a footnote while they're hidden does nothing, because the tile's host has no `pageId` and the host's `citations.set` is a no-op without one; the divider press and the footnote reveal both end in that call.[^25]

**Solution** [Deferred]

Waits until tiles decide whether they hold footnotes. Either visibility is keyed by the tile id, or a host that can't toggle draws no divider; neither form was typed, and the net is an estimate.

#### I-057 • A board whose saved layout can't be read opens empty, and the first new tile replaces the saved layout.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (=🟢+5=) | Shortcut | `740f442e0` | **Created:** 10-04-2026<br>**Updated:** 10-16-2026 |

**Description**

If a board's stored layout is present but isn't in a shape the app can decode, the board opens looking empty. Its tiles are still in the file. Creating a tile then writes a new one-tile layout over the stored one, and the old arrangement is gone. This is reachable by a hand edit, or by a newer layout format arriving through sync from a newer build. A missing layout is the ordinary fresh board and is unaffected; nothing in the app writes an undecodable layout.

Decoding fails only when `layout` is present and not `{bands: array}`. `adopt` then takes `emptyLayout()` and marks the board ready, and a create commits `insertBand` onto the empty layout. Treating an undecodable layout as an unreadable document at `readTileDocAt` regresses three readers: the rename cascade's tile list, `duplicateTile`, and the heading-link cache.[^57]

**Solution** [TBD]

Before a layout write replaces undecodable bytes, the writer copies them under a `.bad-` name, the rule corrupt JSON already follows; the board stays usable and nothing is lost. `setAside` renames the whole file, so this needs a copy primitive beside it in the file layer. It is worth taking when a layout format version exists, which is what makes an undecodable layout something sync can deliver.

#### I-059 • Two sites that run without a tree name the tile hosts' folders by hand.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Small (≈ ±0) | Drift | `668e5398b` | **Created:** 10-05-2026<br>**Updated:** 10-25-2026 |

**Description**

`TILE_HOSTS` resolves a host to its folder and lists every board from the held tree, and the watcher, the channels, and the rename cascade read it. Two sites run before or without a tree and name host folders themselves: `ensureConfigLayout` creates the Homepage folder, and the open-time re-mint checks for a Space by kind before rewriting a copied folder's board. Adding a host means finding these two beside the table.[^59]

**Solution** [TBD]

Each `TILE_HOSTS` arm names the folder a tree-less pass reaches its boards under, and `ensureConfigLayout` reads it. The re-mint's check concerns the copied folder's own kind and may stay.

#### I-058 • The tile shell's memo comparator lists its props by hand.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Small (=🔴−8=) | Shortcut | `740f442e0` | **Created:** 10-04-2026<br>**Updated:** 10-08-2026 |

**Description**

`TileShell`'s comparator names each of its thirteen props. A prop added later and left off the list silently stops triggering a redraw.[^58]

**Solution** [TBD]

A generic comparison over the props doesn't fit as written: the comparator compares `place` field by field, which a shallow comparison can't, and building the objects to compare allocates per shell on every pointer move of a drag. The design has to keep the field-wise `place` comparison and allocate nothing on that path.

#### I-066 • A rename cascade says nothing about Space-board tiles when the Contexts registry doesn't parse.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Mini (=🟢+3=) | Drift | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |

**Description**

A Contexts registry that doesn't parse blanks the Contexts layer, so the tree lists no Space and `tileHostsOf` names no Space board. A rename cascade that moves a key a Space board's markdown tile links then rewrites only the Homepage's tiles and posts no warning for the boards it couldn't reach: `tileHostsOf` counts a registry listed `unreadable` as one skip and an `unparsed` one as none, the rule the configuration pass applies to a file that doesn't parse. `tilesLink` gates the tile rewrite on the links of the hosts it can see, and `rewriteTileConnections` adds `unreadable` to its failures.[^66]

**Solution** [TBD]

**Your call:** the silent read, which matches the configuration pass, or `tileHostsOf` counts an unparsed registry as one skip like an unreadable one, so a cascade warns whenever a visible tile links the key (two lines). A warning for a tile on a Space board in particular needs the Space folders read from the disk, since the tree lists none.

### A7 • Views

#### I-054 • Dragging a Set to another band shows it at its old rank for the round trip.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (=🟢+6=) | Drift | `93baa6931` | **Created:** 10-01-2026<br>**Updated:** 10-03-2026 |

**Description**

In a view that groups by Sets in a custom order, dragging a Set under another parent moves it at once, but its place among the groups follows only after the host answers the move, so for the round trip it sits at its old rank and then jumps. The move is painted ahead, while the rank is a view write the band router sends only once the move's reply lands; a page create stages its order with the ask and takes it back on a refusal. `routeSet` returns an `fs` effect carrying `moveSet` and `after: { group_order }`, and `runBandEffect` awaits `io.mutate(effect.req)` before `io.persistView(effect.after)`, where `createPageIn` calls `stageView` before its `mutate` and `unstageView` on a refusal. This predates the Data Layer plan.[^54]

**Solution** [Proposed]

The `fs` arm stages `after` with the ask, persists it once the move lands, and unstages it on a refusal, the shape `createPageIn` and the manual-order drop in `useViewInteractions.tsx` already use.

#### I-055 • A refused page create clears another new row's staged order until that row's own order lands.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (=🟢+6=) | Shortcut | `93baa6931` | **Created:** 10-01-2026<br>**Updated:** 10-03-2026 |

**Description**

A page created in a custom-ordered view stages its place in the view's hand order as it asks, and a second create made before the first's reply composes its order on the first's. When one of them is refused, it takes back the whole staged order rather than its own row, so the other new row drops to where the view's sort places it until its own reply lands and persists the order, a few milliseconds later. `createPageIn` calls `unstageView(c.source.id, c.view.id, staged)` on a refusal; `unstageView` drops every staged slot the patch wrote, here `manual_order`; and `orderPatch` builds that patch from the live view, which already folds the other create's staged order.[^55]

**Solution** [Proposed]

A refusal restages the order without the refused ID rather than dropping the slot, so a create still in flight keeps its place.

#### I-053 • A new item's rename field opens one frame after its row.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Small (=🟢+5=) | Drift | `93baa6931` | **Created:** 10-01-2026<br>**Updated:** 10-16-2026 |

**Description**

A page created from a view mounts its row from the host's push, keyed by the ID the window minted, and its title field opens when the create's reply returns, because a rename session is claimed by the page's path, which the host decides as it settles the name. The host pushes before it replies, so the field opens at most one frame after its row, no slower than before the Data Layer plan; the session is still a second key beside the ID the row is mounted under. `createPageIn` calls `rename({ id: req.id, path: landed })` once the flight resolves with `created.path`, `useViewInteractions` routes it to `policy.rename(target, true)`, and the Cards view's policy opens `beginRename(target.path, …)`, whose fence is `renamingPath`.[^53]

**Solution** [Proposed]

Rename sessions are claimed by ID across creates: a create opens its rename with the minted ID as it asks, and the field binds to the row the push mounts under that ID, keeping the path for the rename it sends.

### A8 • Navigation

#### I-052 • Maximum Tab Width has no effect above a tab strip's preferred width, so most of its steps do nothing.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (=🟢+1=) | Shortcut | `43d0a6d1e` | **Created:** 09-25-2026<br>**Updated:** 10-03-2026 |

**Description**

Settings offers Maximum Tab Width in steps from 150 to 350px, and `ConfigurationPM.md` calls it the widest a tab grows, but a tab never grows past its strip's preferred width, so the setting can only narrow a tab below it. A tab is `flex: 0 1 var(--tab-pref)`, which shrinks in a crowded strip and never grows, so `max-width: var(--tab-max-user, 250px)` takes effect only below `--tab-pref`: 180px on the main bar (`.tabs-standard`) and 150px in a window's strip (`.tabs-compact`). On the main bar the 150 and 175 steps narrow tabs and the other seven change nothing, and in a window's strip none of the nine changes anything; the trailing tab sizes to its label up to `--tab-max-absolute` and ignores the setting too. Measured over CDP against `~/Test`: main-bar tabs read 150, 175, then 180px at every step from 200 to 350, and window-strip tabs read 150px at every step.[^52]

**Solution** [TBD]

Give `.tab` `flex-grow: 1`, so tabs fill spare strip width up to the setting; the trailing tab keeps its own label-sized rule, and both strips' resting look changes. **Your call:** growing tabs, a ladder that stops at 180px (which still leaves the setting inert in window strips), or dropping the setting; `ConfigurationPM.md` follows the ruling.

### A9 • Matrix

#### I-056 • The Matrix can't be pinch-zoomed on a touchscreen.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Low | Small (=🟢+12=) | Premature | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-05-2026 |

**Description**

On a touchscreen, such as a Windows touch laptop, two fingers on the Matrix pan it instead of zooming. Zoom arrives only as a Ctrl-wheel event, which is how trackpads report a pinch, so trackpads work and only touchscreens break. The canvas turns off the browser's own touch handling, so both fingers go to pointer handlers that follow one pointer and ignore the second. `onWheel` zooms only `if (e.ctrlKey)`, `touchAction: 'none'` routes every touch to the one-pointer `onPointerDown`/`onPointerMove`, and a search of `Core/Matrix` finds no touch or gesture handlers.[^56]

**Solution** [Proposed]

In `MatrixCanvas`, keep a small map of active pointer ids on the host; while two are down, feed the change in their distance ratio to `matrixRuntime.zoom` at their midpoint (the same call the wheel makes, which already takes a focus point and factor) and suppress the one-pointer pan.

### A10 • Documentation

#### I-028 • The editor's documentation says eight things the code doesn't do, and two more go false as this cleanup lands.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Small (±0) | Drift | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

A reader of `MarkdownPM.md` is told things the editor doesn't do. Its folder map places the editor's menu models in `Menus/` when they live in `Core/Actions/`. It says a Text value reads the inline marks alone and that fences stay literal in a table cell, though both a cell and a Text value read a fence pair as code (`tokenizeChunk` suppresses every mark between the fences). It says a nested list run counts from its first number or letter, and that **Type ▸** does the same, where `renumberRuns` and `setListKind` count from 1 or A. It says a citation's number leads back to its first marker, though with no marker bound the press copies `[^label]`; its Plain grip row omits rules and math, which also take that grip; and one sentence reads "on disk;here". `Editor-Internals.md`'s cell-model entry lists fences among what a cell renders as literal text. Each was confirmed against the code.[^28]

The taken fixes turn two more sentences false. I-026 adds a fourth intentional divergence from CommonMark to `Editor-Internals.md`'s fence entry; and I-024 has a landing from another mount re-take each fold's end from the live section, beside the fold entry's account of regions rewritten under a fold. This finding covers the taken work; the sentences that follow deferred work (I-043's scope threading, I-027's HTML sealing) stay with those findings.

**Solution** [Literal]

Each sentence takes the most surgical correction. In `MarkdownPM.md`: `Menus/` reads "the block handles, the editor's side of its menus, and the pane controls its pickers share, over the menu models in `Core/Actions/`"; the scope sentence ends "with a fence pair read as code in all three"; "on disk; there is no intermediate model"; both list clauses count "from 1 or A"; the cell list entry reads "Headings, quotes and rules stay literal text, and a pair of fences shows as typed while the lines between them read as code, their marks and connections left literal"; the citation number "leads back to its first marker, or, where no marker binds it, copies its `[^label]` reference"; and the Plain row reads "(paragraph, quote, callout, code, rule, math)". In `Editor-Internals.md`, the fence entry's list reads "Four divergences … and a raw-HTML block whose closer never arrives ends at the next blank line rather than at the end — the parser is handed both readings, the fence's marker masked and the unclosed opener handed over as a block the blank line ends"; the cell-model entry drops fences from what a cell renders literally ("a fence pair reads as code in a cell as on a page") and from its list of cell-side readers; and the fold entry adds "A body landing from another mount takes each fold's end from the live section instead." One `Editor-Internals.md` sentence still untrue needs no edit, since I-022 brings the code to it: the atomic set held once per version. This lands last, after I-026 and I-024, the code its new sentences describe.

### A11 • Testing

#### I-029 • Four word-count tests pass whether or not the character figures they name are right.

| Concern | Scale | Origin | Base | Date |
|---------|-------|--------|------|------|
| Minimal | Small (±0) | Shortcut | `70fc6063c` | **Created:** 10-08-2026<br>**Updated:** 10-16-2026 |

**Description**

The tests for an inline page embed, a connection and its alias, a markdown link's label, and a link beside a connection each pin a word count and leave the character count the footer shows unchecked, so a regression in how a construct's shown text is counted passes them. The inline embed's figure moved since the first capture: an inline `![[Page]]` reads as a literal `!` beside the connection, so its line counts 14 characters, not 13.[^29]

**Solution** [Literal]

Tighten each to the exact figures below, captured by running `computeStats` at `6df5b11e2`, after I-016, which adds its own tests to `subfieldStats.test.ts` and may move these.

Paths are relative to `Core/MarkdownPM/`, and the test's name settles any drift in its lines.

| File | Lines | Tighten To |
| --- | --- | --- |
| `Engine/subfieldStats.test.ts` | :55-58 | `characters === 4` and `=== 9` |
| `Engine/subfieldStats.test.ts` | :51-53 | `toMatchObject({ words: 3, characters: 14 })` |
| `Engine/subfieldStats.test.ts` | :115-117 | `characters === 9` |
| `Engine/subfieldStats.test.ts` | :269-271 | `toMatchObject({ words: 4, characters: 19 })` |

### Sources

[^1]: **I-001:** `Core/Sync/Client/pull.ts:39-59` (`landChange`), `Core/Sync/Arrival/land.ts:83-144`, `Core/Sync/Client/push.ts:257-309` (`resolveStale`), `Core/Sync/Client/reconcile.ts:99-108`, `Core/Paths/exclusion.ts:44-61` (`manifestAdmits`), `Sync/Routes/items.ts:10-17` (`itemPath`), `Desktop/Platform/hostPath.ts:5` (`nativePath`)
[^2]: **I-002:** `Desktop/Sync/transport.ts:24-38` (`transport`), `Core/Sync/Client/call.ts:89-91`, `Sync/wire.ts:40-55` (`BLOB_CAP`)
[^3]: **I-003:** `Core/Sync/handlers.ts:304-305`, `Core/Sync/handlers.ts:349-353`, `Core/Sync/handlers.ts:325` (`freshKdfParams`), `Core/Sync/Client/reconcile.ts:88-97` (`reconcile`), `Core/Sync/Client/push.ts:174-210` (`collect`), `Core/Sync/Client/session.ts:144-155` (`begin`), `Core/Sync/Client/session.ts:175-188` (`withKeys`), `Sync/Routes/items.ts:87`
[^4]: **I-004:** `Core/Sync/Client/push.ts:233-255` (`pushRename`), `Core/Sync/Client/push.ts:257-309` (`resolveStale`), `Sync/Store/log.ts:153-154`
[^5]: **I-005:** `Core/Sync/Arrival/land.ts:124-144` (`landRename`), `Core/Sync/Arrival/land.ts:106-122` (`landDelete`), `Core/Sync/Client/push.ts:233-242` (`pushRename`), `Core/Nexus/folderKind.ts:53`
[^6]: **I-006:** `Core/Files/jsonMerge.ts:15-46` (`mergeKeys`), `Core/Contract/validators.ts:5-6` (`isPlainObject`), `Core/Sync/Arrival/mergePolicy.ts:19-40` (`isMergedJson`, `mergeDepthFor`), `Core/Sync/Arrival/land.ts:45-64` (`bytesToLand`), `Core/Sync/Arrival/land.ts:95`, `Core/Sync/Client/push.ts:299` (`resolveStale`), `Core/Contexts/contexts.ts:9,20` (`ContextsRegistry`), `Core/Contexts/contextCascade.ts:125-165` (`renameContextOp`), `Core/Nexus/readNexus.ts:247-274` (`readContextGroups`), `Core/Nexus/order.ts:10-27` (`resolveOrder`), `UIX/Utilities/moveItem.ts:55-67` (`resolveRowOrder`), `Core/Tiles/tiles.ts:95,182-184` (`active`, `TileDoc`), `Core/Tiles/TileHost.tsx:283` (`renderTile`), `Core/Views/viewsFile.ts:24` (`views`), `Core/Properties/properties.ts:108,142-143` (`option`, `select_options`, `status_groups`), `Core/Sync/Client/tap.ts:9` (`DEBOUNCE_MS`), `.claude/Features/NexusSyncPM.md:55,63`
[^7]: **I-007:** `Core/Sync/handlers.ts:175-191` (`rotateRing`), `Core/Sync/handlers.ts:322,345`, `Core/Sync/Client/keyring.ts:39-45,73-82`
[^8]: **I-008:** `Core/Sync/handlers.ts:165-208` (`rotateRing`), `Core/Sync/handlers.ts:238-241`, `Core/Sync/Client/push.ts:98` (`sealed`), `Core/Sync/Client/keyring.ts:85-106` (`openRecord`), `Core/Sync/Contract/wire.ts:129-133` (`PullReply`), `Sync/Store/nexus.ts:28`
[^9]: **I-009:** `Core/Sync/handlers.ts:210-250` (`act`), `Sync/wire.ts:44,46`, `Core/Settings/NexusRows.tsx:231-246`, `Core/Sync/Client/keyring.ts:62-72` (`loadRing`)
[^10]: **I-010:** `Core/Sync/Client/session.ts:175-183` (`withKeys`), `Core/Sync/Client/pull.ts:80-83` (`pullWait`), `Core/Sync/handlers.ts:118-126` (`state`)
[^11]: **I-011:** `Core/Sync/handlers.ts:258-286`, `Sync/Routes/roster.ts:15-30` (`connect`), `Sync/Store/roster.ts:28-30`, `Core/Sync/Contract/wire.ts` (`RouteTable`), `Sync/wire.ts` (`PATHS`)
[^12]: **I-012:** `Core/Sync/handlers.ts:339`, `Sync/Store/nexus.ts:53-68` (`createInfo`), `Sync/Store/log.ts:186-191` (`sweep`), `Core/Sync/Client/session.ts:127`
[^13]: **I-013:** `Core/MarkdownPM/Engine/Tables/regions.ts:21-25` (`isTable`), `Core/MarkdownPM/Engine/Tables/regions.ts:53-56` (`tableRegions`), `Core/MarkdownPM/Engine/docScan.ts:67` (`scanLines`), `Core/MarkdownPM/Engine/docScan.ts:107-115` (`quietAt`), `Core/MarkdownPM/Engine/docScan.ts:121` (`rescan`), `Core/MarkdownPM/Engine/detect.ts:640-646` (`isThematicBreakLine`, `isHeadingLine`), `Core/MarkdownPM/Tables/CellEditor.tsx:254-257`; `micromark-extension-gfm-table` 2.1.1 `lib/syntax.js:480-519`
[^14]: **I-014:** `Core/MarkdownPM/Tables/MarkdownTable.tsx:36-42` (`Drag`), `Core/MarkdownPM/Tables/MarkdownTable.tsx:68-82` (`Resize`, `shift`), `Core/MarkdownPM/Tables/MarkdownTable.tsx:144-158`, `Core/MarkdownPM/Tables/MarkdownTable.tsx:262-265` (`trackHover`), `Core/MarkdownPM/Tables/MarkdownTable.tsx:322-370` (`startDrag`, `resolve`), `Core/MarkdownPM/Tables/MarkdownTable.tsx:371-410` (`startResize`), `Core/MarkdownPM/Tables/MarkdownTable.tsx:485-516` (`colWidth`), `Core/MarkdownPM/Tables/MarkdownTable.tsx:568-606` (the grips' reveal), `Core/MarkdownPM/Tables/markdown-tables.css:97-109`, `Core/Views/Table/useColumns.ts:332-373` (`startColumnDrag`)
[^15]: **I-015:** `Core/MarkdownPM/Tables/cellCitations.ts:16-27` (`marks`), `Core/MarkdownPM/Tables/CellEditor.tsx:170`
[^16]: **I-016:** `Core/MarkdownPM/Engine/subfieldStats.ts:54-69` (`pageHidden`, `cellHidden`, `hiddenIn`), `Core/MarkdownPM/Engine/subfieldStats.ts:93` (`CHUNK_LINES`), `Core/MarkdownPM/Engine/subfieldStats.ts:125-134` (`computeStats`, `pageStats`, `rangeStats`), `Core/MarkdownPM/Engine/perText.ts:4-13` (`perText`), `UIX/Utilities/capMap.ts:9-16` (`capSet`), `Core/MarkdownPM/docCache.ts:40-52` (`drawnLast`), `Core/MarkdownPM/MarkdownEditor.tsx:170-188`, `Core/Pages/PageView.tsx:35`, `Core/Interface/Subfield/subfieldItems.tsx:27`, `Core/Interface/Subfield/CitationsToggle.tsx:10`
[^17]: **I-017:** `Core/MarkdownPM/Engine/subfieldStats.ts:96` (`proseRuns`), `Core/MarkdownPM/Engine/subfieldStats.ts:111-122,140` (`tableProse`), `Core/MarkdownPM/MarkdownEditor.tsx:170-188`, `Core/Interface/Subfield/publish.ts:18-21` (`usePublishSelection`), `Core/Session/chromeSlice.ts:83-88` (`setEditorSelection`)
[^18]: **I-018:** `Core/MarkdownPM/Engine/subfieldStats.ts:28-34` (`proseStart`), `Core/MarkdownPM/Engine/subfieldStats.ts:39-52` (`hiddenOf`), `Core/MarkdownPM/Engine/subfieldStats.ts:93,125-131` (`CHUNK_LINES`, `computeStats`, `pageStats`), `Core/MarkdownPM/Engine/intents.ts:137-155` (`tokenIntents`), `Core/MarkdownPM/docCache.ts:40-52` (`drawnLast`), `Core/Interface/Subfield/subfieldPage.ts:6-7,56-61`, `Core/Interface/Subfield/subfieldItems.tsx:8-11,24-27`, `Core/Interface/Subfield/CitationsToggle.tsx:8-13`, `Core/Interface/ContentView.tsx:210-215`, `Core/Pages/bodyMount.ts:33,39-41,51-57`, `Core/Session/pageDetailCache.ts:45-56` (`BodyMount`), `Core/MarkdownPM/MarkdownEditor.tsx:170-188`
[^19]: **I-019:** `Core/MarkdownPM/Engine/intents.ts:357-384` (`railIntents`), `Core/MarkdownPM/Engine/intents.ts:415-417` (`withRails`), `Core/MarkdownPM/Tables/cellStatic.tsx:272-324` (`renderCellBody`), `Core/MarkdownPM/Engine/intents.test.ts` ('outliner rails').
[^20]: **I-020:** `Core/MarkdownPM/Engine/detect.ts:649-662` (`headingParts`), `Core/MarkdownPM/Engine/headingScan.ts:28` (`scanHeadings`), `Core/MarkdownPM/Links/headingRenameSettle.ts:26-27` (`headingRenameOf`), `Core/MarkdownPM/Links/headingRenameSettle.ts:43` (`headingRenameSettle`), `Core/MarkdownPM/Menus/gripMenu.ts:90` (`popHeadingMenu`), `Core/MarkdownPM/folding.ts:65` (`regionsOf`), `Core/Index/indexSeed.ts:45-46`, `Core/Nexus/cascade.ts:188`.
[^21]: **I-021:** `Core/MarkdownPM/Engine/intents.ts:426-427` (`moveIntent`), `Core/MarkdownPM/Engine/intents.ts:429-453` (`stepLineIntents`), `Core/MarkdownPM/Engine/intents.ts:491-560` (`assembleLineIntents`, `prefixEndAt`, `seatPastMarker`), `Core/MarkdownPM/Engine/docScan.ts:201,208` (`splice`), `Core/MarkdownPM/Engine/docScan.ts:231-243` (`shiftRange`, `shiftSpan`, `shiftTable`), `Core/MarkdownPM/docCache.ts:92`, `Core/MarkdownPM/decorations.ts:398` (`atomicsOn`), `Core/MarkdownPM/Engine/detect.ts:101-123` (`scanFencedCode`).
[^22]: **I-022:** `Core/MarkdownPM/Embeds/embedWidget.tsx:559-567` (`embedAtomic`), `:489-494` (`mapRanges`), `.claude/Guidelines/Editor-Internals.md:11`
[^23]: **I-023:** `Core/MarkdownPM/Menus/blockHandles.ts:70-77,107-110` (`TagReveal`), `Core/MarkdownPM/Engine/intents.ts:257-258` (the code tag widget)
[^24]: **I-024:** `Core/MarkdownPM/folding.ts:195-210` (`foldField`), `:133-149` (`collapseEffect`), `:336-342` (`editAcrossCitations`), `Core/MarkdownPM/api.ts:73-81` (`mirrorBody`), `Core/Session/saveScheduler.ts:136` (`followBody`), `Core/Pages/bodyMount.ts:39` (`follow`), `.claude/Guidelines/Editor-Internals.md:30`
[^25]: **I-025:** `Core/Tiles/Surfaces/MarkdownTile.tsx:27` (`useEditorHost`), `Core/Pages/editorHost.tsx:78-83` (`citations`), `Core/MarkdownPM/folding.ts:406-415` (`dividerPress`), `Core/MarkdownPM/Citations/citationActions.ts:31,74` (`travelToCitation`, the marker press's reveal)
[^26]: **I-026:** `Core/MarkdownPM/Engine/detect.ts:196-212` (`htmlBlocks`), `Core/MarkdownPM/Engine/docScan.ts:107-115,140-160,277-281` (`quietAt`, `loneAbove`, `pairsBelow`, `chunksOver`), `Core/MarkdownPM/Engine/parser.ts:17-36` (`parse`), `Core/MarkdownPM/Links/linkEdit.ts:93-94,97-98,109,113` (`liveSlotAt`, `shownEnd`, `commitAliasOnEnter`), `Core/MarkdownPM/api.ts:222-227` (`inRawHtml`), `Core/MarkdownPM/Engine/markdownCode.ts` (the fence grammar), `.claude/Guidelines/Editor-Internals.md:5` (the CommonMark divergences).
[^27]: **I-027:** `Core/MarkdownPM/Engine/headingScan.ts:24-25` (`scanHeadings`), `Core/MarkdownPM/Engine/docScan.ts:43-61,95-101,383-390` (`withCitations`, `scanDoc`, `inSealedLine`), `Core/MarkdownPM/Engine/detect.ts:196-212` (`htmlBlocks`), `Core/MarkdownPM/Engine/blockModel.ts:78` (`kindAt`), `Core/MarkdownPM/Engine/intents.ts:589` (`pushConstruct`), `Core/MarkdownPM/api.ts:218-219` (`drawsRawHtml`), `Core/MarkdownPM/api.ts:222-227` (`inRawHtml`), `Core/MarkdownPM/Links/linkEdit.ts:93-94,97-98,109,113` (`liveSlotAt`, `shownEnd`, `commitAliasOnEnter`), `Core/MarkdownPM/docCache.ts:15-34,64-67` (`perDoc`, `docScan`), `Core/MarkdownPM/Input/htmlShortcuts.ts:3,9`, `Core/Settings/personalization.ts:153` (`htmlFormatting`), `Core/Index/indexSeed.ts:39-46` (`extractPageIndex`), `Core/Nexus/cascade.ts:188`, `.claude/Features/MarkdownPM.md:27`.
[^28]: **I-028:** `.claude/Features/MarkdownPM.md:8,10,12,24,105,126,136`, `.claude/Guidelines/Editor-Internals.md:5,18,30`, `Core/Actions/gripMenu.ts`, `Core/Actions/blockMenu.ts:72-75,82` (`EMBED_ROWS`, `BLOCK_MENU_SECTIONS`), `Core/MarkdownPM/Engine/tokens.ts:260-266` (`tokenizeChunk`), `Core/MarkdownPM/Tables/cellLists.test.tsx:81-83`, `Core/MarkdownPM/Engine/listDragModel.ts:197-200` (`renumberRuns`), `Core/MarkdownPM/Input/listRenumber.test.ts:62`, `Core/MarkdownPM/Input/format.ts:339-351` (`setListKind`), `Core/MarkdownPM/Citations/citationPointer.ts:99-111` (`citationRowPointer`), `Core/MarkdownPM/Citations/citationActions.ts:147-149`, `Core/MarkdownPM/Menus/gripMenu.ts:47-67` (`contextFor`), `Core/MarkdownPM/Menus/blockHandles.ts:15-23` (`GRIP_KINDS`)
[^29]: **I-029:** `Core/MarkdownPM/Engine/subfieldStats.test.ts:51-58,115-117,269-271`, `Core/MarkdownPM/Engine/subfieldStats.ts:125` (`computeStats`), `Core/MarkdownPM/Engine/tokens.test.ts:56-59`
[^30]: **I-030:** `UIX/Buttons/button-base.css.ts:68-93` (`button`), `UIX/Buttons/Button.tsx:54-77`, `UIX/Menus/menu-row.css.ts:24-37` (`rowFocus`, `rowShell`), `UIX/Fields/fieldRing.ts:11,19-33` (`fieldRing`)
[^31]: **I-031:** `UIX/Interactions/dismissalStack.ts:60-75` (`onPointerDown`), `UIX/Interactions/dismissalStack.ts:114` (`shields`), `UIX/Pickers/PickerMenu.tsx:113-121,292,307` (`PickerMenu`), `UIX/Animations/useExitPresence.ts:8-24` (`useExitPresence`), `UIX/Pickers/PickerControl.tsx:91-114,144-148` (`PickerControl`), `Core/Actions/menuActions.ts:20-23` (`popMenu`), `Core/Session/chromeSlice.ts:62-70` (`presentMenu`), `Core/Interface/Menus/MenuPresenter.tsx:84-103` (`MenuPresenter`), `Core/Tiles/Surfaces/ViewTile.tsx:652-660`, `Core/Interface/Toolbar/Toolbar.tsx:29-33`, `Core/Views/Settings/GroupFrame.tsx:235`, `UIX/Interactions/shared.ts:26-34` (`suppressReleaseClick`)
[^32]: **I-032:** `Core/Contract/bridge.ts:57-215` (`Asks`), `Core/Nexus/mutateRequest.ts:73-152` (`mutateRequest`), `Core/Nexus/mutate.ts:161-195` (`setProfileImage`, `setProfileIcon`, `setDisclosureLock`, `setActiveView`), `Core/Nexus/mutate.ts:229` (`reorderTop`), `Core/Nexus/reorder.ts:26-55`, `Core/Views/handlers.ts:26-64`, `Core/Settings/handlers.ts:20-53`, `Core/Assets/handlers.ts:41` (`assets:setDir`), `Core/Assets/handlers.ts:73` (`assets:adopt`), `Core/Assets/assetMigrate.ts:113`, `Core/Pages/setBanner.ts:49`, `Core/Nexus/configReach.ts:338,340`, `Core/Nexus/cascade.ts:267` (`rewriteTileConnections`), `Core/Navigation/handlers.ts:18` (`nav:write`), `Core/Matrix/handlers.ts:14` (`matrix:write`), `Core/Pages/handlers.ts:26` (`page:updateBody`), `Core/Pages/handlers.ts:45-47` (`history:restore`), `Core/Pages/fileHistory.ts:170-181` (`restoreSnapshot`), `Core/Nexus/handlers.ts:156` (`nexus:rename`), `Core/Nexus/liveTree.ts:80` (`mutableTarget`), `Core/Tiles/handlers.ts:60-113`, `Core/Contract/handlers.ts:99-112` (`withWriteRoot`), `Desktop/FileWatch/watcher.ts:69-92,114-117` (`pushConfig`)
[^33]: **I-033:** `Core/Bundles/bundle.ts:254` (`originPagesIn`), `Core/Trash/trashedCopies.ts:36` (`parkLinks`), `Core/Trash/spend.ts:59-113` (`emptyBundle`), `Core/Trash/spend.ts:130,170` (a restore's parking), `Core/Bundles/browser.ts:288-329` (`many`, one request per row)
[^34]: **I-034:** `Desktop/Store/stores.ts:45-47` (`clearPath`), `Desktop/Store/stores.ts:50-77` (`upsertPageIndexes`), `Desktop/Store/stores.ts:78-98` (`removePathIndex`, `renamePathIndex`, `removePathPrefixIndex`, `renamePathPrefixIndex`), `Desktop/Store/driver.ts:16-26` (`inTransaction`), `Desktop/Store/stores.ts:217-259` (`syncStore`), `Core/Sync/handlers.ts:352,365`, `Core/Sync/Client/base.ts:16,21` (`readAllBases`, `deleteBase`)
[^35]: **I-035:** `Core/Nexus/fileEvents.ts:438-461` (`applySpace`), `Core/Nexus/fileEvents.ts:570-590` (`applyMove`), `Core/Nexus/treePatch.ts:278-304` (`moveNodeInTree`), `Core/Nexus/fileEvents.ts:464-485` (`regroup`, `applyContexts`), `Core/Contexts/contextCascade.ts:125,150-156` (`renameContextOp`), `Core/Contexts/contextCascade.ts:167,198` (`renameSpaceOp`), `Core/Files/atomicWrite.ts:62-75` (`relocate`), `Core/Nexus/readNexus.ts:74-82` (`contextLinker`), `Core/Nexus/fileEvents.ts:361-403` (`applyPage`), `Core/Views/pageRow.ts:11-27` (`pageRowOf`), `Core/Contexts/contextResolve.ts:38` (`resolveContextKeys`)
[^36]: **I-036:** `Core/Nexus/fileEvents.ts:146-159` (`oweRetry`, `stampable`), `Core/Nexus/fileEvents.ts:333-359` (`applyFolder`), `Core/Nexus/fileEvents.ts:361-403` (`applyPage`), `Core/Nexus/fileEvents.ts:502-518` (`applySettings`, `oweRescope`), `Core/Nexus/mutate.ts:248-253` (`retryUnreadable`), `Core/Nexus/settle.ts:~106-130` (`walkWhileOwed`), `Core/Nexus/settle.ts:~206-216` (`stampListed`), `Core/Nexus/settle.ts:~73-81` (`shown`), `Core/Nexus/settle.ts:~132-181` (`settle`), `Core/Trash/spend.ts:~96-265` (`restoreTrashed`, `relocate` at `:168`)
[^37]: **I-037:** `Core/Nexus/settle.ts:55` (`inTurn`), `Core/Platform/inTurns.ts:2-9` (`inTurns`), `Core/Nexus/settle.ts:203` (`payOwedWalk`), `Core/Nexus/settle.ts:206-214` (`settleNow`), `Core/Nexus/settle.ts:119-154` (`settle`), `Core/Nexus/settle.ts:96-117` (`walkWhileOwed`), `Core/Nexus/settle.ts:34-46` (`applyOwn`)
[^38]: **I-038:** `Core/Nexus/fileEvents.ts:564-584` (`applyMove`), `Core/Nexus/treePatch.ts:238-264` (`moveNodeInTree`), `Core/Nexus/fileEvents.ts:348-374` (`applyFolder`), `Core/Nexus/fileEvents.ts:376-418` (`applyPage`), `Core/Index/indexSeed.ts:101-120` (`indexWrittenPage`), `Core/Files/atomicWrite.ts:62-75` (`relocate`), `Core/Files/writeEcho.ts:10,74-88` (`PREFIX_WINDOW_MS`, `isRecentWrite`)
[^39]: **I-039:** `Core/Nexus/adopt.ts:62-82` (`stampPage`), `Core/Nexus/adopt.ts:89-98` (`ensurePageId`), `Core/Nexus/adopt.ts:102-115` (`stampFolder`), `Core/Nexus/adopt.ts:126-143` (`Stamp`, `stampMissing`), `Core/Nexus/adopt.ts:145-191` (`stampTree`, `stampAdopted`), `Core/Nexus/fileEvents.ts:139-143` (`oweRetry`), `Core/Nexus/fileEvents.ts:146-152` (`stampable`), `Core/Nexus/fileEvents.ts:403-404` (`applyPage`), `Core/Nexus/fileEvents.ts:454-463` (`applySpace`), `Core/Nexus/readNexus.ts:105-109,312-317`, `Core/Nexus/mutate.ts:209-213` (`retryUnreadable`), `Core/Nexus/handlers.ts:34-51,79-96` (`prepareOpenedNexus`, `openStores`), `Core/Nexus/heldPages.ts:32` (`idHeld`), `Core/Nexus/identity.ts:17-50` (`ensureIdentity`), `Core/Nexus/remintLedger.ts:88-104` (`runOpenLedger`, `readBaseline`), `Core/Nexus/remintLedger.ts:20-33,65-86` (`projectBaseline`, `pickEldest`), `Core/Nexus/record.ts:18` (`recordsOf`), `Core/Nexus/heldPages.ts:28,43-46` (`writablePathsOf`, `livePathOf`), `Core/Nexus/heldPages.ts:70-82` (`nexusPages`), `Core/Nexus/record.ts:55-56` (`pagesByIdOf`), `Core/Contexts/contextResolve.ts:29-42` (`contextWorldOf`), `Core/Contexts/contexts.ts:12-17,35-43` (`contextEntry`, `seededRegistry`), `Core/Contexts/contextsRegistry.ts:20-25` (`ensureContextsRegistry`), `Core/Trash/restoreScrub.ts:68` (`ensurePageId`)
[^40]: **I-040:** `Desktop/hostGraph.test.ts:31-46`, `Core/Interface/handlers.ts:39-84` (`interfaceHandlers`), `Core/Settings/handlers.ts:50`, `Core/Interface/chrome.ts:1-8`, `Core/Interface/Windows/windowTabs.ts`, `Core/Interface/Windows/windowRecord.ts`, `Core/Interface/Windows/windowState.ts`, `Core/Interface/Windows/windowCache.ts`, `Core/Interface/Windows/windowMorph.ts`, `Core/Views/filterModel.ts`, `Core/Views/visibilityModel.ts`, `Core/Views/creationOrder.ts`
[^41]: **I-041:** `Core/MarkdownPM/codeHighlight.ts:151` (`blockTrees`), `Core/MarkdownPM/codeHighlight.ts:155-183` (`paint`), `Core/MarkdownPM/codeHighlight.ts:185-218` (`colors`), `Core/MarkdownPM/docCache.ts:40-52` (`drawnLast`)
[^42]: **I-042:** `Core/Interface/Notifications/notifications.ts` (`reportRefusal`, `persist`, `notifyReport`), `Core/Contract/result.ts` (`ErrorCode`), `Core/Sync/Contract/wire.ts` (`SyncStatus`), `.claude/Planning/Error Surfaces — Brainstorm Brief.md`
[^43]: **I-043:** compares at `Core/MarkdownPM/Engine/intents.ts:342,447,537,589,665`, `Input/edits.ts:62,72,200,230`, `Menus/blockHandles.ts:44,49,174,189`, `api.ts:219`, `decorations.ts:694`, `Engine/subfieldStats.ts:40`, `Gestures/listDrag.ts:47`, `Input/listRenumber.ts:41`, `Input/markdownInput.ts:189,234`, `Menus/menu.ts:37`; defaults at `Input/edits.ts:61,85,168,180,222,275`, `Engine/intents.ts:419,496,533`, `decorations.ts:811`, `Menus/blockHandles.ts:43,148`, `Core/Testing/markdownEngine.ts:43`; switches at `Engine/detect.ts:510-518` (`readsLists`), `surface.ts:25-40`, `docCache.ts:84`; the enum at `Core/Actions/editorMenu.ts:25`; unscoped readers at `Input/edits.ts:702-710` (`lineBodyBefore`, `opensLine`), `Gestures/listDrag.ts:44`, `Input/listRenumber.ts:30`, `Engine/listDragModel.ts` (`renumberRuns`, `dropChanges`), `Gestures/blockDrag.ts:32`; `.claude/Features/MarkdownPM.md:105`.
[^44]: **I-044:** `Core/Pages/editorHost.tsx:29-36,48-51,85-113,160-176` (`EditorHostOptions`, `buildEditorHost`, `useEditorHost`), `Core/Session/pageConnections.ts:9`, `Core/Interface/Windows/PageReaderWindow.tsx:41-42,89-90,118` (`READER_ANCESTOR`), `Core/Interface/Glance/GlancePane.tsx:42-43,288-299` (`GLANCE_ANCESTORS`), `Core/MarkdownPM/Embeds/embedWidget.tsx:390`, `Core/MarkdownPM/api.ts:206-207` (`pageSurface`), `Core/MarkdownPM/markdown-pm.css:72-74`.
[^45]: **I-045:** `Core/MarkdownPM/api.ts:24-29,185-191` (the menu-model imports, `EditorHost.menus`), `Core/Pages/editorHost.tsx:101-112`, `Core/Testing/editorHarness.ts:122-128`.
[^46]: **I-046:** `Core/MarkdownPM/Menus/gripMenu.ts:47-67,130-164` (`contextFor`, the action chain), `Core/MarkdownPM/Menus/blockHandles.ts:15-26,44` (`GRIP_KINDS`, `blockHandles`), `Core/MarkdownPM/Engine/blockModel.ts:198-199` (`blockStarts`), `Core/Actions/gripMenu.ts:16-24` (`GripMenuAction`).
[^47]: **I-047:** `Core/MarkdownPM/Engine/detect.ts:522` (`indentLevel`), `Core/MarkdownPM/Engine/subfieldStats.ts:125` (`computeStats`), `Core/MarkdownPM/Tables/widget.tsx:395,447` (`buildWidgetDecorations`, `refreshTableEffect`), `Core/MarkdownPM/folding.ts:65,281` (`regionsOf`, `foldedRegions`), `Core/MarkdownPM/MarkdownEditor.tsx:38` (`EMPTY_PAGE_TEXT`), `Core/MarkdownPM/Engine/intents.ts:330` (`lineIntentsInto`).
[^48]: **I-048:** `Core/MarkdownPM/Engine/parser.ts:17-36` (`parse`), `Core/MarkdownPM/Engine/tokens.ts:260-310` (`tokenizeChunk`, `tokenize`), `node_modules/mdast-util-gfm-task-list-item/lib/index.js:11` (`devlop`'s `ok`), `node_modules/devlop/package.json` (the `development` condition)
[^49]: **I-049:** `Core/MarkdownPM/Engine/Tables/regions.ts:55` (`tableRegions`)
[^50]: **I-050:** `UIX/Pickers/PickerMenu.tsx:179-272` (`measure`), `UIX/Pickers/PickerMenu.test.tsx:447-515`
[^51]: **I-051:** `UIX/Animations/motion.ts:19` (`exitWait`), `UIX/Interactions/shared.ts:43` (`SETTLE_FALLBACK`), `UIX/Animations/useExitPresence.ts:29` (`useSettleFallback`), `UIX/Interactions/dragDisclose.ts:5` (`SETTLE_MS`), `UIX/Theme/nativeCaret.ts:335` (`SETTLE_DEADLINE_MS`), `Core/MarkdownPM/folding.ts:20` (`FOLD_SETTLE_MS`)
[^52]: **I-052:** `Core/Navigation/tab-base.css:8-10` (`.tab`), `Core/Navigation/tab-base.css:29-32` (`.tab:last-child`), `Core/Navigation/tab-base.css:143-155` (`.tabs-standard`, `.tabs-compact`), `Core/Settings/personalization.ts:45-48` (`TAB_MAX_WIDTH`), `Core/Settings/applyPersonalization.ts:50`, `.claude/Features/ConfigurationPM.md:66`
[^53]: **I-053:** `Core/Views/Host/useViewCreation.ts:151-177` (`createPageIn`), `Core/Views/Host/useViewInteractions.tsx:46,135` (`rename`), `Core/Views/Cards/CardsView.tsx:196` (`beginRename`), `Core/Views/Table/TableView.tsx:120-128`, `Core/Session/editSlice.ts:16,31,108` (`beginRename`, `renamingPath`), `Core/Session/nexusSlice.ts:235-256` (`mutate`), `Core/Nexus/mutateRequest.ts:125-128` (`minted`)
[^54]: **I-054:** `Core/Views/Bands/bandRouter.ts:74-109` (`routeSet`), `Core/Views/Bands/bandRouter.ts:134-146` (`runBandEffect`), `Core/Views/Host/pendingView.ts:172-186` (`mutateAhead`), `Core/Views/Host/pendingView.ts:109-121` (`stageView`, `unstageView`), `Core/Views/Host/useViewCreation.ts:151-177` (`createPageIn`), `Core/Views/Host/useViewInteractions.tsx:196-203`
[^55]: **I-055:** `Core/Views/Host/useViewCreation.ts:125-139` (`orderPatch`), `Core/Views/Host/useViewCreation.ts:151-177` (`createPageIn`), `Core/Views/Host/pendingView.ts:116-121` (`unstageView`), `Core/Views/views.ts:337-345` (`slotsOf`)
[^56]: **I-056:** `Core/Matrix/MatrixCanvas.tsx:129-145`, `Core/Matrix/MatrixCanvas.tsx:176-197`, `Core/Matrix/matrix.css.ts:39-46`
[^57]: **I-057:** `Core/Tiles/Layout/codec.ts:26-31`, `Core/Tiles/tileDocStore.ts:148-158` (`adopt`), `Core/Tiles/TileHost.tsx:283-295` (`renderTile`, `onInsert`), `Core/Tiles/tilesFile.ts:136-145,192,235-242,253,277`, `Core/Tiles/tileDoc.ts:20-23` (`readTileDocAt`), `Core/Files/atomicWrite.ts:215` (`setAside`)
[^58]: **I-058:** `Core/Tiles/TileGrid.tsx:207-226` (`TileShell`'s comparator)
[^59]: **I-059:** `Core/Tiles/tileHosts.ts:16-37` (`TILE_HOSTS`), `Core/Nexus/identity.ts:57-61` (`ensureConfigLayout`), `Core/Nexus/remint.ts:110`
[^60]: **I-060:** `Core/Files/atomicWrite.ts:208-209` (`readAppFile`), `Core/Files/atomicWrite.ts:183-198` (`readLast`), `Core/Files/atomicWrite.ts:212-217` (`readAppFileKnown`), `Core/Files/atomicWrite.ts:149-166` (`rmwLocked`), `Core/Files/atomicWrite.ts:237-251` (`updateNexusFile`), `Core/Files/atomicWrite.ts:280-286` (`updateNexusConfig`), `Core/Nexus/readNexus.ts:65` (`readOrder`), `Core/Nexus/readNexus.ts:109` (`readConfig`), `Core/Nexus/readNexus.ts:282` (`readNexusConfig`), `Core/Properties/propertiesRegistry.ts:65` (`readKeptRegistry`), `Core/Navigation/navigationFile.ts:33-41` (`readNavigationFile`), `Core/Matrix/matrixFile.ts:11` (`readMatrixFile`), `Core/Nexus/fileEvents.ts:549-568,641-642` (`applyOrder`), `Core/Session/navigationSlice.ts:277-278` (`writeNav`), `Core/Session/matrixSlice.ts:172-175` (`patchMatrix`), `Core/Interface/Notifications/notifications.ts` (`persist`, `reportRefusal`), `Core/Assets/assetMigrate.ts:85-114,166,175` (`collectRefs`, `migrateAssets`), `Core/Tiles/tileDoc.ts:20` (`readTileDocAt`)
[^61]: **I-061:** `UIX/Menus/MenuRows.tsx:153` (`MenuItem`'s hint), `UIX/Menus/menu-row.css.ts:205` (`subLabel`), `UIX/Menus/FrameSlide.tsx:83` (`slotBox`), `Core/Properties/Schema/PropertyFrame.tsx:399-405` (the editor's `FrameSlide`), `Core/Properties/Schema/formatRows.ts:12-39` (`formatRows`), `Core/Settings/SettingsWindow.tsx:47-52` (`settingsRow`)
[^62]: **I-062:** `Core/Nexus/settle.ts:~187-197` (`missedEvents`), `Core/Nexus/settle.ts:~212-230` (`settleBatch`), `Core/Nexus/settle.ts:~263-267` (`paid`), `Core/Nexus/settle.ts:~269-304` (`payOutsideMoves`), `Core/Index/indexSeed.ts:~202-259` (`seedContentIndex`, `landed` at `:221`), `Core/Contract/handlers.ts:73` (the restart's catch-up)
[^63]: **I-063:** `Core/Nexus/settle.ts:~132-142` (the renames loop before `walkWhileOwed`), `Core/Nexus/settle.ts:~269-304` (`payOutsideMoves`), `Core/Nexus/cascade.ts:~207-225` (`renameCascade`), `Core/Connections/pageIndex.ts:111` (`namesOf`), `Core/Nexus/heldPages.ts:~25-28` (`livePathOf`), `Core/Index/indexSeed.ts:~95-99,146` (`HeadingRenameSeen`, `reindex`)
[^64]: **I-064:** `Core/Nexus/settle.ts:~314-349` (`payOutsideMoves`), `Core/Trash/spend.ts:~96-265` (`restoreTrashed`, `parkLinks` at `:147`), `Core/Nexus/settle.ts:~281-305` (`returningCascade`, `repairLanded` at `:302`)
[^65]: **I-065:** `Core/Bundles/bundle.ts:254` (`originPagesIn`), `Core/Trash/trashedCopies.ts:36` (`parkLinks`)
[^66]: **I-066:** `Core/Tiles/tileHosts.ts:~22-36` (the Space arm's `boards`), `Core/Tiles/tileHosts.ts:~44-54` (`tileHostsOf`), `Core/Nexus/tree.ts:111`, `Core/Nexus/readNexus.ts:~314-325` (the registry's `unreadable` entry), `Core/Nexus/configReach.ts:~330-332` (`reachConfig`), `Core/Tiles/tilesFile.ts:~285-322` (`tilesLink`, `rewriteTileConnections`), `Core/Nexus/cascade.ts:~246-257`
[^67]: **I-067:** `Core/Connections/rewrite.ts:~76-110` (`follower`), `Core/Connections/connections.ts:~19-22` (`pageLinkPattern`), `Core/Connections/connections.ts:~132-143` (`expressibleInLink`, `spellsAsWiki`), `Core/MarkdownPM/Engine/detect.ts:~406-411` (`loneEmbedRe`, `loneEmbedTitle`)
[^68]: **I-068:** `Core/MarkdownPM/Links/connectionsApi.ts:~24-33` (`headingMissing`), `Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts:~138-151` (`commit`, `keptHeading`)
[^69]: **I-069:** `Core/Bundles/record.ts:~32-33` (`linkTargets`), `Core/Bundles/record.ts:~108-113` (`readRecord`), `Core/Bundles/bundle.ts:~162-185` (`listBundles`), `Core/Bundles/bundle.ts:~195-201` (`openBundle`)
[^70]: **I-070:** `Core/Bundles/placement.ts:~41-116` (`resolveRecord`), `Core/Bundles/placement.ts:~159-183` (`freeOnDisk`), `Core/Paths/names.ts:~56-79` (`freeName`, `createDisambiguated`)
[^71]: **I-071:** `Core/Nexus/fileEvents.ts:502-518` (`applySettings`, `oweRescope`), `Core/Nexus/settle.ts:184-189` (`reseed`), `Core/Settings/settings.ts:107-139` (`carrySetAside`), `Core/Nexus/folderEntity.ts:53-71` (`liftSetAside`), `.claude/Features/DesktopPM.md:22`
[^72]: **I-072:** `Desktop/FileWatch/watcher.ts:38` (`SETTLE_MS`), `Desktop/FileWatch/watcher.ts:106` (`awaitWriteFinish`)
[^73]: **I-073:** `Core/Properties/Schema/typeRows.tsx:256` (`rowsFor`), `Core/Properties/Schema/typeRows.tsx:68,159-178` (`DATE_ROW`, `dateRows`, the icon-led rows), `Core/Properties/Schema/typeRows.tsx:87-155` (`numberRows`, the icon-less rows), `Core/Properties/Schema/typeRows.tsx:180-196` (`linkRows`), `Core/Properties/Schema/typeRows.tsx:198-213` (`checkboxRows`), `Core/Properties/Schema/typeRows.tsx:216-237` (`fileRows`), `Core/Properties/Schema/formatRows.ts:12-39` and `Core/Properties/Schema/PropertyFrame.tsx:298-312` (the icon-led rows elsewhere), `Core/Properties/Schema/PropertyFrame.tsx:209-211,275-287` (`configure` writes the property and `saveColumnStyle` the view), `Core/Properties/typeDisplay.ts:12,30` (`styleLabel`, the column menu's "Format")
[^74]: **I-074:** `Core/Properties/unassignProperty.ts:66-90` (`stashAndStrip`, the stash written on Remove), `Core/Properties/propertyStash.ts:19-45,78-86` (`stashedBlock`, `patchStashBlock`, `sweepStashes`), `Core/Properties/assignment.ts:26-83` (`refillStash`, the stash read and spent on re-adding), `Core/Settings/personalization.ts:42,189-190,261-263` (`HISTORY_DAYS`, `historyDays`, `archiveHistoryDays`, `SETTING_BOUNDS`), `Core/Settings/settings.ts:82-92` (`readFileHistoryConfig`), `Core/Pages/fileHistory.ts:195-206` (`sweepFileHistory`), `Core/Settings/frames.ts:649-663` (the History section's rows)
[^75]: **I-075:** `Core/MarkdownPM/Autocomplete/AliasList.tsx:~25-26,~60-65,~84,~145-155` (`PICK_DELAY_MS`, `pick`, `unpick`, the row's `onClick`), `Core/MarkdownPM/Autocomplete/aliasPicker.test.tsx:~29-30` (`PICK_WAIT`), `UIX/Pickers/CalendarPicker.tsx:~488-501`, `Core/MarkdownPM/Embeds/embedWidget.tsx:~652-654` (`embedClickSeat`), `Core/MarkdownPM/Gestures/pointerPath.ts:~50,~82-85`, `Core/MarkdownPM/decorations.ts:~717-721` (`pressMargin`), `Core/MarkdownPM/Tables/cellStatic.tsx:~558-565`, `Core/Navigation/TabItem.tsx:~63,~89-91,~110` (`pressedActive`), `Core/Interface/Header/DetailTitleHeader.tsx:~94-106,~132-136` (`openSearch`), `Core/Views/Bands/GroupBand.tsx:~141-142,~178-199,~249` (`outsideRename`, the glyph's handlers), `Core/Interface/RenamableTitle.tsx:~17,~26-27,~55` (`doubleClick`), `UIX/Fields/RenamableLabel.tsx:~52-58`, `Core/Navigation/TabBar.tsx:~137-149` (`onBarDoubleClick`), `.claude/Planning/Disclosable Bundles — Implementation Plan.md:~116` (§Constraints › Rulings › Double-Click) and `:~876-879` (Task 4-1's `rowClick`).
[^76]: **I-076:** `Core/Session/nexusSlice.ts:248-265` (`mutate`, the cleanup's discarded reply at `:256` and the notice's Try Again at `:261`), `Core/Session/nexusSlice.ts:290` (`finishOwed`), `Core/Nexus/owed.ts:63` (`OWED`), `Core/Nexus/owed.ts:255` (`runNoted`'s landing check), `Core/Nexus/finishOwed.ts:62-70` (`add`, the let-go files), `Core/Nexus/finishOwed.ts:72-93` (`finishOwed`), `Core/Contexts/contextWrite.ts:153,174` (`createContextGroup`, `createSpace`), `Core/Trash/spend.ts:184` (the Context and Space restore), `Core/Properties/registryProperty.ts:122`, `Core/Properties/optionOps.ts:99`, `Core/Bundles/browser.ts:288-330` (`many`, its `quiet: true` call at `:314`), `.claude/Planning/Disclosable Bundles — Implementation Plan.md`
