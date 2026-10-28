<label-format>

A property shows its **label** in the app and writes its **key** into each page's metadata. Label Format decides how the key is spelled from the label, so *what you read* and ==what a file stores== can differ while ~~two names~~ one property stays one property.

- **Match Title** writes the label as it reads.
- The *conventions* rewrite it:
  - `lowercase` drops every capital.
  - `kebab-case` joins words with hyphens.
- A key another app wrote keeps its spelling until the property adopts it.

1. Open a property's settings.
2. Pick a format under Label Format.
3. Confirm the rename the change counts.

- [x] The label stays as you typed it.
- [ ] The key follows the format you pick.

> Changing it renames the key in every page that holds the property.

> [!note] Before You Change It
> Another tool reading your pages reads the key, not the label.

| Label | `kebab-case` |
| ----- | ------------ |
| Due Date | `due-date` |
| Owner | `owner` |

```yaml
due-date: 2026-10-28  # the key a page stores for the Due Date property, spelled by its Label Format
```

Key spellings follow common conventions such as those [Wikipedia](https://en.wikipedia.org/wiki/Letter_case) describes.

---

A page keeps one key per property, so a format change rewrites it everywhere at once rather than page by page. The label stays the app's own, free to read however you like, while the key stays steady for every file and tool that reads it. Choosing a format early keeps later renames rare, and a property with no pages renames nothing at all.

</label-format>

<value-format>

Value Format spells each **option's** key from its *label*, as Label Format does for the property itself, so ==an option reads one way== and stores another without ~~losing~~ changing what it means. Its keys read like `in-progress`.

- Each option keeps:
  - its label, shown wherever the app draws it;
  - its key, stored wherever a page holds it.
- Pages another app wrote keep their own spelling until the property adopts them.

1. Pick a convention.
2. Every page holding an option is rewritten to its new key.
3. Views, filters, and tiles keep working.

- [x] Labels stay as you typed them.
- [ ] Keys follow the format you pick.

> A change counts the pages it rewrites before it runs.

> [!note] Views Read Labels
> A view that names an option by its label reads it unchanged before and after a format change.

| Label | `kebab-case` |
| ----- | ------------ |
| In Progress | `in-progress` |
| Done | `done` |
| Learn More | [CommonMark](https://commonmark.org/help/) |

```text
Status: in-progress
Status: in-progress  # the key a page stores for the In Progress option, whatever its label reads
```

Formatting follows [CommonMark](https://commonmark.org/help/).

---

The rest of this entry runs long enough to scroll: an option keeps its label wherever the app shows it, its key wherever a page stores it, and a format change moves only the key, so a view that names the option by its label reads it unchanged before and after the change. A page another app wrote keeps its own spelling until the property's adoption reads it.

</value-format>

<date-format>

Date Format sets how a **date** reads wherever a column hasn't chosen its *own* form. It changes ==only how dates read==, never ~~the date a page stores~~ what a file holds, which stays `2026-10-28` whatever you pick.

- Numeric forms:
  - **MM/DD/YYYY** puts the month first.
  - **DD/MM/YYYY** puts the day first.
- Written forms spell the month out, in a short or full date.
- **Relative** reads a date from today, such as yesterday or in three days.

1. Open Settings › General.
2. Pick a form under Date Format.
3. Every date without a form of its own redraws.

- [x] Columns that chose their own form keep it.
- [ ] Columns that didn't follow this setting.

> A column's own form always wins over this setting.

> [!note] Where It Applies
> Tables, page headers, and tiles read the same setting, so a date reads alike across them.

| Form | Reads As |
| ---- | -------- |
| MM/DD/YYYY | `10/28/2026` |
| DD/MM/YYYY | `28/10/2026` |

```yaml
Due: 2026-10-28  # a page always stores the ISO date, however Date Format draws it in the app
```

The stored form is [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601), so every app reading the file agrees on the date.

---

A date drawn in one form here and another in a column is still one date. Setting a form for a single column overrides this setting there and nowhere else, so a table can show a relative due date beside a full created date while the rest of the app keeps the form you pick here.

</date-format>

<aliases>

A page's **Aliases** are the other names it answers to, so a *connection* written with any of them ==reaches the same page==. An alias is ~~a second page~~ another name for this one, such as `PM` for `Pommora`.

- An alias counts:
  - once, whatever its case;
  - only when it differs from the page's own title.
- Their order is yours, and a new alias joins the end.

1. Open a page's Aliases.
2. Add a name the page should answer to.
3. Write a connection with that name anywhere.

- [x] The connection reaches this page.
- [ ] A second page is created.

> Renaming an alias keeps its place in the list.

> [!note] One Name Each
> Two spellings that differ only in case are one alias, and the newest spelling stands.

| Written | Reaches |
| ------- | ------- |
| `Pommora` | This page |
| `PM` | This page |

```text
A connection written with any alias reaches the page that holds it, exactly as one written with the page's own title would
```

An alias is a [nickname](https://en.wikipedia.org/wiki/Alias) for the page, nothing more.

---

A page with no aliases answers to its title alone. Adding an alias changes no connection already written, and removing one leaves the connections written with it unresolved until you rename them or add the alias back, so a list kept short and deliberate keeps every connection pointing where you meant.

</aliases>
