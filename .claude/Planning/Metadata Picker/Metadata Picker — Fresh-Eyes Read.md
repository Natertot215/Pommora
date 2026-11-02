### Metadata Picker — Fresh-Eyes Read

**DATE:** 11-01-2026
**BASE:** `69db9942e`

A zero-context agent's questions, given only *Metadata Picker — Decisions & Intention* and the codebase. It read the version of the log before these questions were answered.

Nothing was edited. I read the document, then the code, `IssuesPM.md`, and the cited Feature docs. I opened nothing else under `.claude/Planning/`, so Scout Findings, the Live Check, and the Scouts reports are unseen. Numbers below are for answering by number. D = Decision, OI = Open Item.

#### My Reading

Today one component (the seat) handles every value click, but the "Add" list is bolted onto the value picker as a mode, and three places separately decide what an item can list. The work splits Add into its own `MetadataPicker`, gives it one list builder, makes the card and panel behave alike, unifies the page right-click menu, and sweeps up nearby picker and menu debt. It should end up with less code and no new features.

The stated goal, "one place to start", is narrower in practice. It only covers Add on cards and in the panel. Clicking a value still opens its pane directly, right-click stays a system menu, and the Table has no Add at all.

**1. Table:** Is the Table having no Add intended? D2 says "every in-app surface", then names only cards and the panel.

#### Where The Code Contradicts The Document

2. **D30, Group Bands:** They never reach `MenuSeat`. `GroupBand.tsx:167` passes no trigger and no id, and `entityMenuActions.ts:53` builds the Spaces and Properties branches only with both. A Set's menu has no such rows anyway. After D30 the only users are sidebar page and Space rows plus Matrix nodes.
3. **D12, "Can Change Option Looks":** This looks unreachable. An option-type property is always a submenu in the system menu, never a leaf (`propertyMenuActions.ts:44`), so no option pane ever opens from right-click. D3 keeps it that way. Date formats already pass through (`styleOf`). The real gap is reveal, so what did you mean by this clause?
4. **D12, Reveal:** The gap is wider than leaves. A submenu option pick also skips the reveal, because `runTitleAction` uses plain `commitValue` rather than `commitOnCard` (`CardsView.tsx:194`, `useViewInteractions.tsx:405`). Does D12 cover those picks too? D30's "through their own seat" implies it, but a submenu pick opens no pane.
5. **D12, "Shows It On The Card":** `revealProperty` writes the saved view (`useViewHost.ts:161-166`), so one card's right-click un-hides that property on every card in the view, permanently, even if you hid it on purpose. I found no undo on that path in `viewWrite.ts`, but I didn't trace it further. Is this intended? Should the Table reveal the same way? Its seat doesn't today.
6. **D12, "Exactly As A Click":** A click on a shown Text value edits inline on the card. A menu pick always opens the small window (`ValueSeat.tsx:346`). D29's "opening away" rule suggests the window, while D12 suggests inline. A click also centers on the pointer, and a menu has no pointer position. Which wins?
7. **D2 Vs D11:** D2 says a "non-option entry" opens `PropertyPicker`, but that picker only draws options or a calendar (`PropertyPicker.tsx:97-124`). Dates slide under D25, and Text, Number, Link, and File use other panes. So `MetadataPicker` never opens `PropertyPicker`, and the only shared piece is the pane body. Right-click only reaches it for dates. D2's wording needs fixing.
8. **D28, Three Outcomes:** "Shows, slides, or opens away" has no slot for Checkbox. A Checkbox entry commits instantly, opening nothing, and shows a "›" today. Should picking it check the box or just show it unchecked?
9. **D13, "The Panel's Order":** That's two orders: `config.order.contexts` for a page and `spaceNode.rowOrder` for a Space (`PropertyPanel.tsx:174-178`). "The Collection's order" means nothing for a Space, which reads the whole registry. Which order does a Space's right-click menu take?
10. **D24:** It describes what `addEntriesFor` already does (`cardColumns.ts:40-55`). Is a change hiding in there, or is it just a guardrail?

**Confirmed True:**
- The four hosts and three writers (view host, panel, `oneShotWriter`).
- The `popMenu` routing.
- The two Menus-to-Pickers imports, and `PickerControl` needs nothing else from Pickers.
- D23's row differences.
- D16's cause: `'right'` versus `'auto'`, `PropertyPicker.tsx:95` versus `MassPropertyPicker.tsx:23`.

#### Risks The Document Doesn't Name

11. **D11 + D29, Vanishing Anchor:** In the panel, the `+` only exists while something is addable (`PropertyPanel.tsx:346`). If a picked entry was the group's last hidden one, its first pick removes the `+` that anchors the window. Once the seat owns Add, its anchor check (`ValueSeat.tsx:88-90`) closes the pane. That kills a Multi-Select meant to stay open. Today's chooser skips this because the panel never slides.
12. **D29, Half The State Stays:** The panel still needs which group is open, whether it came from a row, and the held Add row (`:67`, `:252`). Is a split owner acceptable?
13. **Seat Bloat:** D29, D31, and D32 all pile into a 353-line file, which sits badly with Clearer Boundaries. D32 folds `valueClick.ts`, a pure 58-line rule table with its own tests, into a React file. I-042 argues the exact opposite for placement. I'd keep the file. Why fold it?
14. **D32, `'dateTime'` Merge:** Merging passes the click's x to the calendar (`ValueSeat.tsx:128-131`), so a card's calendar moves to center on the pointer. Is that intended?
15. **Second Date:** `CalendarPicker` reads its value only at mount (`:71-85`). Slid in with no key (`PropertyPicker.tsx:117`), the second date would show the first date's value unless keyed. D34's test pins today's route, not the slide.

#### Pushback

16. **D20:** Moving `ManageRow` into Pickers exists only because `PickerMenu` can't move, which is the shape I-075 may change, and I-075 says that pass should settle the import direction. That's designing around a shape we expect to replace. `PickerControl` in `UIX/Menus/` also recreates I-075's naming complaint, and it touches about 24 files. Why not settle both together?
17. **Naming:** I-075 faults `PickerMenu` because it "picks nothing". `MetadataPicker` lists rather than picks, and `PropertyPicker` picks Spaces too. "Metadata" appears nowhere in the UI, whose buttons read "Add Context" and "Add Property".
18. **D3, Mobile:** System menus assume Electron (`bridge.ts:214`, `Desktop/main.ts:285`), and a trigger-less `popMenu` always goes to the host. A Capacitor WebView has no such menu, so right-click metadata has no mobile path. `MenuPresenter` could render it. Does D3 or D9 block that, given the Scalability rule?
19. **D18:** The likely fix makes a press that closes any layer stop acting on what it lands on, app-wide (`dismissalStack.ts`). `focus="keep"` is documented to do the opposite. Is this dropdowns in panes only, or everywhere?
20. **D14:** It removes a working way to show Created and Modified, under "corrections only". What's the reason? The filter must live in the card's list, since `hiddenListIds` also feeds `VisibilityFrame.tsx:101`.
21. **D5, Shape:** I-027, I-042, the UIX untangle, the settings fixes, and page menus are independent of Add. One plan or several? What order?

#### Questions On Scope

22. **D23, One Runner:** The runners differ in behavior, not just code. Views rename and set icons in place and create through ghost flows, while the sidebar and Matrix use `beginRename`, `beginIcon`, and `newPageAdjacent`. My read is one switch with the host supplying those three actions. Correct?
23. **D23, Other Page Menus:** Are `PAGE_ACTION_ROWS` / `popPageActions` (`PageMenu.tsx:53`, `WindowTabBody.tsx:235`), `tabMenu`, and `navRowMenu` in scope? The Overview says "one page menu"; D23 names four surfaces.
24. **D8:** Does `Core/Properties/Pickers/` disappear entirely? `FilterFrame.tsx:32-38` and `Cell.tsx:10` import from it, so filters and "drawing only" Cells would import from `MetadataPicker/`. Where do `filePick`, `pickModel`, and `ValueEditor` go?
25. **D27:** Where does the builder live, given it needs view state for cards and session state for the panel? The panel also defines "held" differently: the key exists (`:166-172`) rather than a non-blank value. Which definition wins?
26. **D31:** Mass picks commit many rows under grouped undo, and the state lives in `TableView`. Does the seat go plural, or is this a prop-switched mode, the pattern you just rejected?
27. **D11, Details:**
    - Does Back or Escape leave a slid pane?
    - Should a Select pick close everything, as it does today, or return to the list?
    - Should cancelled Text or File rows stay empty in the panel?
    - What about a Status or Context with no options, a dead-end slide?
28. **D4 After D11:** A panel Context slides in under a back bar reading "Spaces", beneath "Add Context". Intended?
29. **D15:** Menus cap height including the back bar (`MenuPresenter.tsx:60-66`), while option panes cap below it. Is the limit 240 total? Width isn't listed, and menus cap at 180.
30. **D19:** `onClose` appears in 34 files and `onDismiss` in 27. Which name, and is it picker shells only?
31. **D21:** This has no target shape. `IconChoice` has about 14 sites, and four pair it with `ColorPicker`. What's envisioned?
32. **D32, `PickOption`:** Should it move to `id`? `SelectOption` comes from the schema, so renaming that side likely changes the file format. Should `TextPane` take on `FieldPicker`'s chrome visibly? `FieldPicker` accepts no class.
33. **D33:** `FilterFrame`'s `FieldPicker` is a different component that shares a name, so that fix is a rename.
34. **D35:** Also needs PropertiesPM's Panel and Menu paragraphs ("registry order"), the PommoraUIX Menus rows, and the project CLAUDE.md folder lines.
35. **Empty Option Lists:** A Select with no options builds an empty system submenu, since `options: []` isn't a leaf. I didn't check how it renders. Is this in scope under Picker Cleanup?

#### What An Outsider Wouldn't Know

36. What does [INFERRED] mean: approved, or awaiting you? D12 (confirmed) relies on D30 (inferred). Which stage is this document at?
37. These go undefined:
    - The "Not feature-level" quote in D1.
    - "Two-wave and neutral review."
    - Who runs The Measure, and against what baseline.
    - "Option looks."
    - "Residue."
    - "The back bars' four input shapes." `MenuTopRow` takes label, current, trailing, and className. Is that it?
38. My guesses, for correction:
    - "Two pane-floor constants" means `PANE_MIN_*` versus `PANE_SQUARE` (`ViewFrame.tsx:41`).
    - "Space chip's choice" means the `contextOptions ? NeutralChip : OptionChip` split, in `PropertyPicker.tsx:224` and `FilterFrame.tsx:159`.
    - "Hand-built `ViewItemMenu`" means hand-written rows rather than `popMenu`.
    - "Panel's two commit functions" means `PropertyPanel.tsx:82` and `:159`.
39. "Spaces" names a group whose rows are Contexts (Areas, Topics), with actual Spaces one level down. D13 reads as ordering Contexts, not the Spaces inside them. Correct?
40. "Item" and "entity" are used interchangeably. Pages and Spaces are clearly covered. Do Tasks and Events count when Agenda arrives?
41. D17's "stay as they are": as opposed to what? They're nested `PickerMenu`s (`CalendarPicker.tsx:415`, `:535`).
42. D34's "misfiled tests": everything in these two folders sits beside a module. Which ones? I didn't read `PropertyPicker.pane.test.tsx`.
43. Constraints say briefs carry *Approach* and *Principles*. Does *Planning* go too?

#### Open Items, Partly Answered

- **OI-2:** Likely yes. `useValueContext` is the only production builder and always sets `connections` (`valueContext.ts:45`). `valueContext.test.ts` is one of two test files carrying `headingLinkStyle` with no `connections`, unchecked.
- **OI-3:** `PommoraUIX.md:373` is false: `growToContent` sets width, not "measured height". Line 380's "every menu, dropdown panel" conflicts with I-075's `MenuSurface` note. The FrameSlide claim at `InteractionPM.md:48` mostly holds, though the detail slot's content unmounts after exit. The rest of lines 357-380 is unverified.
- **OI-4:** `PickerMenu` clamps horizontally but not vertically, and it latches direction (`:201-218`). I'd rise: height already eases during the slide, while a flip lands mid-animation. A general clamp would touch every growing pane. Also, I-042's proposal names `setEffDir`, which no longer exists.
- **OI-1:** Inline mode renders in the row and the rAF only waits for that row to exist, so it may be removable. That's a read, not a verdict.

#### Couldn't Verify

The M-numbers, Options 1 and 2, the live check's 60px figure, OI-5's counts, the NexusOS drafts, and the completed plans were all out of bounds or not read. I didn't run the app; everything here comes from reading the code.
