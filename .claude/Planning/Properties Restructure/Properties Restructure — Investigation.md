### Properties Restructure — Investigation

**DATE:** 10-22-2026
**HEAD:** verified at `9ac729ddc`.

The brainstorm's inventory of the Properties system, taken at `d0595b22d`, now lives in the documents that act on it: *Properties Restructure — Implementation Plan* owns every finding the work changes, *Properties Restructure — Decisions & Intention* owns what Nathan decided, and *Properties Restructure — Planning Findings* owns the readings taken in his place. What remains here is the set of edge rules earlier agents chose that stay as they are, which *Decisions & Intention*'s P-3 cites.

#### Edge Rules

**Explanation (For Nathan):** These are rules earlier agents chose that work as designed but that you never asked for, and they stay as they are.

- A Select or Status holding several words (only an outside edit, such as Obsidian's, writes that) ignores words no option names and shows the valid one written latest in the list. Any value edit to its page or Space, and Repair Properties On Open, writes it as that one option; one naming no option stays as written.
- Two properties, or two options, whose names differ only by capitalization or accents read as the first; the second disappears from view, and an option duplicate leaves the file on the next option edit.
- Re-adding a removed property doesn't bring back a value whose option was renamed or deleted in the meantime.
- Picking a Select value drops any unrecognized word that was there, while picking a Multi-Select value keeps unrecognized words after the picked ones; picking a Context tag drops unknown Space names.
- Any value edit to one property also tidies the other properties on the same page (a single-word Select becomes a list, duplicates collapse).
- Select and Status values are saved as a one-item list, so Obsidian treats that key as a list.
- Checkbox properties can't group a view; Context columns can't sort a view.
- Picking the same option across several selected rows clears it when every row already holds it, and sets it otherwise.
- The one-line text field edits only a value's first line; later lines ride along untouched.
- A custom option sort always reads in your custom order and ignores Default and Reversed.
- A restored Space loses an option deleted while it sat in the Trash.

**Evidence:**
- **Several Words:** `decodeValue`'s select arm in `Core/Properties/propertyValue.ts` keeps the words that name an option, in file order, and takes the last ("the newest registered element wins"); the tidy on other edits and on open is the plan's Task 4B-1.
- **Folded Names:** the registry read admits the first definition per folded name and the first option (`9c2850b3b`; `Core/Properties/propertiesRegistry.ts`).
- **Refill:** option words decode exactly, so a stashed word whose option was renamed or deleted refills nothing (`9aeb29271`).
- **Picks:** `encodeValue` writes a Select pick as one key (`propertyValue.ts`); `keepingForeignWords` keeps a Multi-Select's foreign words (`eea82f191`; `Core/Properties/governedWrite.ts`); a Context tag drops unresolved titles (`Core/Contexts/contextWrite.ts`).
- **Mass Pick:** `Core/Properties/Pickers/massAssign.ts`, where a unanimous selection clears.
- **Grouping and Sorting:** the type record decides what groups and sorts (`ee86c919b`); a Custom sort always reads ascending (`Core/Views/Pipeline/sort.ts`).
- **First Line:** `b80a7b12a`.
