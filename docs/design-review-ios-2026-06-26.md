# Dorkroom iOS — Visual & UX Design Review

**Date:** 2026-06-26
**Build:** dev build `art.dorkroom.mobile` (mobile v2026.06.26)
**Device:** iPhone 17 Pro Simulator (iOS 26)
**Screenshots:** `apps/mobile/screenshots-review/2026-06-26-sim/` (19 screens)
**Method:** Live walkthrough of the dev build in the iOS Simulator (Metro dev client); screens captured via deep links + `idb` taps, then critiqued.

> Environment notes baked into this review:
> - `01-meter` shows "No camera device available." — an iOS Simulator limitation (no camera hardware). On a real device the Meter tool shows a live viewfinder. **Not** a design defect.
> - Mat Cut / Lenses / Camera Exposure are intentional **"Coming soon to mobile"** placeholders, not broken screens (their placeholder UX is still critiqued below).
> - Simulator status-bar chrome is ignored.

---

## 1. Overall impression

Dorkroom reads as a confident, modern, dark-first utility app that already feels native to iOS 26 — the Liquid-Glass tab bar, large-title navigation, rounded "grouped" cards, and bottom-sheet pattern are all idiomatic and well-executed. The strongest screens (Border calculator, Reciprocity result, the More directory) show a clear point of view: live visual previews, monospace formula readouts, and a restrained dark palette that genuinely suits darkroom use. The app serves a knowledgeable film photographer well — the vocabulary (EI, push/pull, E-6, reciprocity factor) is correct and unapologetically domain-specific.

Where it wobbles is consistency and polish *between* screens: there are at least three different visual treatments for the same conceptual control (segmented toggle vs. pill-chip vs. dropdown), the crimson accent is overloaded with conflicting meanings, two destructive-looking red buttons turn out to be benign toggles, and the older calculator screens (Exposure, Resize) visibly predate the newer design language. None of this is broken — it's the gap between "a polished v1" and "a coherent design system."

## 2. Design system & consistency audit

**Typography.** Hierarchy is mostly good. Large titles (`Resize`, `Exposure`, `Cameras & lenses`, `Film Log`) are bold and clear; result values use an effective oversized treatment (the `3m 8.3s` in amber, `20s` in blue, `22.5s` in teal). Section labels in the More list and forms use the correct uppercase-gray small caps (`PRINTING`, `CAMERAS`, `UNITS`). Two issues: (a) the home/tab screens (Border, Meter, Film Log) correctly drop the in-page title, but Resize/Exposure still carry a big `Back` + large title — these are the screens that predate the no-title convention, and the inconsistency is visible side by side. (b) Field labels are inconsistent in casing: `Orig. width (in)` and `New length (in)` (abbreviated + parenthetical units) vs. the cleaner `Roll name (optional)` / `Metered time`. The abbreviations on Resize feel cramped where there's plenty of width.

**Color / accent usage — the biggest system issue.** The crimson (#E91E4F-ish) is doing too many unrelated jobs:
- A **primary CTA** (`+ New roll`, `Add camera`)
- A **selected-state** fill in segmented controls (`Print size`, `Inches`, `B&W`, `Active`, `3:2`, `8x10`)
- A **momentary/utility action** (`Hide blades`, `Hide readings` — two big red buttons that read as destructive/primary but only toggle overlay visibility)
- A **destructive-feeling text button** (`Reset to defaults` in red text)
- A **chosen quick-chip** (`+1` stop on Exposure, highlighted red while the others are gray)
- **Inline links** (`+ Add a film that isn't listed`, the `Done` confirm in sheets)
- The **active-row highlight** in the film picker (`Kodak Tri-X 400` in red with a red check)

Meanwhile the **tab bar active state and result-value accents use blue and teal/amber** — so the app actually has *two* accent systems that don't talk to each other. A user can't learn "red = X." Worst offender: the Border screen's two side-by-side **solid red** `Hide blades` / `Hide readings` buttons (`00`, `16`) look like the primary action or even destructive, but they're view toggles. Affordance-wise they pull the eye to the least important control on the screen.

**Contrast on dark bg.** Mostly fine for white-on-near-black body text. Watch these:
- Placeholder/secondary gray (`Coming soon to mobile.`, `No lenses saved yet.`, the `e.g. Trip to Portland` placeholders, `Dorkroom v1.0.0`) sits low — several are around the WCAG 4.5:1 borderline or below on the `#0b0b0c` background. Acceptable for true placeholders, risky for the "coming soon" body copy which is the only content on the screen.
- The disabled "More tools" rows in **Edit Tabs** (`10`) are very dim gray — intentional (they're addable), but combined with the dim `+` they're hard to read.
- **Segmented controls' unselected labels** (`Enlarger height`, `Centimeters`, `Color`, `Slide (E-6)`, `Finished`, `Developed`) are mid-gray on dark and read as disabled even though they're tappable.

**Spacing & layout rhythm.** Generally calm and consistent: 16pt gutters, generous card padding, `rounded-2xl` cards. The grouped-card pattern in Settings and More is clean. One rhythm break: on **Resize** (`03`) the preview rectangle floats in a large empty band with no card around it, while every other element is in a field — it looks unmoored, and the result card is clipped at the bottom fold. On **Border**, the spacing between the preview card, the options card, the two red buttons, and `Reset to defaults` is uneven (the red buttons are crammed under the options card while Reset floats far below).

**Component consistency.** This is where the most evidence lives:
- **Selection controls have 3+ visual forms for the same job:** full-width segmented control (Resize `Print size/Enlarger height`, Roll `B&W/Color/Slide`), rounded pill-chips in a scroll row (Reciprocity `COMMON TIMES`, Exposure stop chips, Border aspect-ratio/paper chips), and a dropdown-styled field with a ▾ caret (Film picker, Camera, Format). Some of these could be unified.
- **Dropdown caret styling differs:** the Reciprocity `Kodak Tri-X 400` field and the Roll `Camera`/`Film` fields both use a faint ▾, but the More list and Settings rows use a `>` chevron for navigation — acceptable (different semantics) but the ▾ is very low-contrast and easy to miss as an affordance.
- **Stepper vs. chips vs. free input on Exposure (`04`):** the screen offers three simultaneous ways to set the same value — quick chips (`-1…+1`), a `Custom stops` number field, and a `– +1.00 stops +` stepper. Powerful, but visually busy and redundant; three controls editing one value with no clear primary.
- **Sheets are consistent** (title left, red `Done` right, drag handle) — good. But the `Done` is red text while a real iOS convention would lean blue/tinted; here red `Done` competes with red destructive meaning elsewhere.
- **Toggles** are standard iOS switches with red "on" tint (Settings, Landscape, Flip ratio, Enable offsets) — consistent and good.

**Iconography.** The More list (`09`) and Edit Tabs (`10`) icons are a clean, consistent thin-line set (crop, ruler, gauge, frame, stopwatch, aperture, focus-reticle, gear). Good. Minor: **Film Log's icon is a plain circle** in the More list (`09`) but a **film-strip** glyph in the tab bar — two different marks for the same destination. Unify. The Lenses "focus reticle" and Camera Exposure "aperture" are nice domain-appropriate choices.

**Dark theme.** Strong and appropriate for the use case. The subtle reddish radial glow behind the tab bar (visible on most screens) is a nice touch that ties to the brand and evokes a safelight — on-theme for a darkroom app. The Liquid-Glass tab bar refraction is tasteful.

## 3. UX & interaction critique

**Information hierarchy & scannability.** Result presentation is a highlight: Reciprocity (`02`) and Exposure (`04`) lead with the big colored answer, then a monospace formula (`30s ^ 1.54 = 3m 8.3s`), then a labeled breakdown table (Added exposure / Factor / Metered time). That's exemplary for a calculator — the user gets the answer, the proof, and the components in priority order. Border's live diagram with on-blade measurements (`00`) is genuinely excellent — it shows the result *in situ* rather than as a number.

**Affordances.** Mixed. The grouped rows with `>` chevrons (Settings, More) clearly read as tappable. But the **summary rows on Border** (`Paper & image size / 3:2 on 10×8`, `Border size / 0.5"`, `Position & offsets / Centered`) use a faint `>` and a flat fill that's only slightly lighter than the card — they're the primary way to open the sheets, so they should look more obviously actionable. The **dropdown ▾** fields are the weakest affordance: the caret is barely visible and the field looks like a read-only display. The `Reset to defaults` row on Border is an outlined ghost button that's easy to miss.

**Input ergonomics.** The bottom-sheet pattern for Border (`14`/`15`/`16`) is smart — it keeps the live preview visible above the sheet so users see changes in real time. Chips for common times/ratios reduce typing. Concerns: (a) the **slider in Border size (`15`)** has no min/max labels or tick values and no numeric input — you can see "0.5"" but not the range or step. (b) **Exposure's three overlapping input methods** (above) will confuse first-timers. (c) Resize uses raw number fields with no stepper and tiny `(in)` labels.

**Empty states.** Reasonable but plain. Film Log (`11`) — `No rolls yet. Start one to log your shots.` — is friendly and paired with a clear `+ New roll`. Cameras/lenses (`12`) — `No lenses saved yet.` with `+ Add lens` — good. The **"Coming soon to mobile" placeholders** (`05`/`06`/`07`) are the weakest: they're a centered title + one gray line in a vast black void, with no illustration, no "use it on the web" link, no notify-me, and no indication of *when* or *why*. They set a slightly disappointing expectation given the user navigated there intentionally. At minimum, add a line like "Available now at dorkroom.app — coming to iOS soon" and an icon.

**Feedback / results.** Strong on calculators. `Share result` (`02`) is a nice touch. Reciprocity even teases a `Reciprocity curve … Tap to explore` chart below the fold — good progressive disclosure. One gap: no visible loading/empty/error design language beyond the simulator camera message.

**Navigation model.** The Meter / Border / Reciprocity / Film Log / More structure is coherent and the **Edit Tabs** customization (`10`) is a genuinely nice power-user feature with a clear `IN TAB BAR (3/3)` cap and drag handles. Two friction points: (a) **Discoverability of Edit Tabs is duplicated and slightly confusing** — it appears both in Settings (`08`) and at the top of the More list (`09`) and as its own screen; fine, but the relationship between "More," "Settings," and "Edit Tabs" isn't obvious (Settings is itself buried under More → SYSTEM). (b) The `3/3` pinned cap means to add a tool to the bar you must first remove one — the UI shows `+`/`–` but doesn't explain the swap requirement; a user hitting the cap may be confused why `+` does nothing.

**Accessibility.**
- **Color-only signaling:** the film picker (`17`) marks the active item with red text *and* a check (good — redundant). But segmented controls signal selection by red fill alone; for color-blind users the selected vs. unselected pills differ mainly in hue + brightness — usually OK but verify contrast of the unselected label.
- **Touch targets:** chips and rows look ≥44pt. The Border summary `>` chevrons and the dropdown ▾ are small but the whole row is presumably tappable — confirm the hit area spans the row.
- **The two red Border buttons** and `Reset to defaults` rely on the user reading them to know they're non-destructive — semantics fight color.
- **Dynamic Type:** abbreviated labels like `Orig. width (in)` and the dense Exposure control cluster will be the first to break at large text sizes.

## 4. Per-screen notes

**00 Border** — Best screen in the app. Live easel diagram with on-blade measurements is excellent. Issues: two solid-red toggle buttons (`Hide blades`/`Hide readings`) misuse the primary/destructive color; `Reset to defaults` ghost button floats far below and is easy to miss; summary rows could look more tappable.

**01 Meter** — Simulator camera limitation, not critiquing the blank. Generic note: a full-bleed black screen with one centered sentence is the right *idea* for a viewfinder error, but on a real device consider a friendly fallback with a manual-entry option if the camera is unavailable/denied.

**02 Reciprocity** — Excellent result hierarchy (big amber answer → monospace formula → breakdown → Share). The teased `Reciprocity curve` chart is a great touch. Film field's ▾ caret is too subtle as an affordance. Amber result color is distinct from the app's red/blue accents — intentional per-tool color-coding, but document it so it's deliberate, not accidental.

**03 Resize** — Functional but the oldest-feeling screen: redundant `Back`+large title, abbreviated `(in)` labels, the teal preview rectangle floats with no containing card, and the result (`22.5s`) is clipped at the bottom fold so you can't see it without scrolling. The teal result color is yet another accent hue.

**04 Exposure** — Powerful but over-controlled: quick chips + custom-stops field + stepper all edit the same value. Pick a primary. Result card (`20s` in blue, formula, breakdown) is great. Same legacy `Back`+title as Resize.

**05 / 06 / 07 Coming-soon (Mat Cut, Lenses, Camera Exposure)** — Intentional placeholders, fair to critique the UX: they're under-designed — a centered title + one dim gray line in a huge empty black screen. No icon, no timeline, no "use on web," no notify-me. They make a deliberate navigation feel like a dead end. Add an icon, a sentence of value ("Plan your matting cuts precisely"), and a web link or notify affordance. Also, the large title still says e.g. `Mat Cut` *and* the centered text repeats `Mat Cut` — redundant.

**08 Settings** — Clean grouped layout. `Dorkroom v1.0.0` is good. Minor: the three groups (one toggle / Edit Tabs / GitHub+Newsletter) are visually identical cards with no section headers, so the grouping logic isn't obvious. `Also save meter photos to Photos` is clear. Consider a header or footnote explaining each group.

**09 More list** — Strong directory: search field, Edit Tabs shortcut, and sensible categories (PRINTING / FILM / CAMERA / SYSTEM). Good icons. Note the Film Log icon mismatch (circle here vs. film-strip in tab bar). This screen is arguably the best navigation surface — consider whether Settings needs to be this buried.

**10 Edit Tabs** — Nice power feature: `IN TAB BAR (3/3)` cap, drag handles, `–` to remove / `+` to add. Improvement: explain the swap-at-cap behavior; the "More tools" rows are very dim. Title row uses `Done` (left) + `Edit Tabs` (center) — slightly unusual placement but acceptable for a modal.

**11 Film Log** — Good empty state and clear primary `+ New roll`. `Cameras & lenses` and `Export JSON` as secondary buttons are reasonable, though `Export JSON` is developer-flavored language for a consumer app — consider "Export data" or "Backup."

**12 Cameras & lenses** — Clean. Camera row (`Nikon F3 / 35mm`) with `>` is clearly tappable; `+ Add camera`/`+ Add lens` are clear. Empty `No lenses saved yet.` is fine.

**13 New Roll form** — Solid form. Good domain vocabulary (`ISO / EI (push/pull)`, `Box speed, or rate it differently`, Process B&W/Color/Slide, Status). `+ Add a film that isn't listed` is a thoughtful escape hatch. The `Film` field shows `Select a film stock` as required-feeling but the form's required vs. optional fields aren't visually distinguished beyond the "(optional)" suffixes. The screen scrolls under the tab bar with a strong red glow — the bottom field (`Notes`) is partly obscured by the tab bar's glass.

**14 Paper & image size sheet** — Good pattern (live preview stays visible). Aspect-ratio and paper-size pill rows scroll horizontally with selected = red fill. `Landscape`/`Flip ratio` toggles are clear. Minor: two horizontally-scrolling chip rows stacked can hide options off-screen with no scroll affordance/affinity hint (the cut-off `1…` at the right edge is the only cue).

**15 Border size sheet** — The slider lacks min/max/step labels and a numeric entry; only the current `0.5"` shows. Add range endpoints and/or a typed input for precision (darkroom users care about exact borders).

**16 Position & offsets sheet** — Minimal (`Enable offsets` toggle only). Fine as progressive disclosure, but with offsets off the sheet is nearly empty — consider showing the offset controls disabled/greyed so users see what enabling unlocks.

**17 Film picker sheet** — Clean list, active item in red + check (good redundant signaling). Long list — consider a search field at the top (the More screen has one; parity would help) and section grouping by brand (Kodak / Ilford…).

**19 Add camera sheet** — Good form: Name with a real example placeholder, Format dropdown, optional Holders/backs with an inline `Add`, Notes, and a clear red `Add camera` CTA. Note the **double-confirm ambiguity**: there's both a red `Done` (top-right) and a red `Add camera` (bottom) — which one commits the camera? Clarify (Done = dismiss, Add = save) or remove one.

## 5. Top strengths

- **Excellent calculator result design** — big colored answer + monospace formula proof + labeled breakdown (Reciprocity, Exposure). Best-in-class for a utility app.
- **Border's live easel diagram** with on-blade measurements — shows the result in context, not as an abstract number.
- **Native, modern iOS 26 feel** — Liquid-Glass tab bar, large titles, grouped cards, bottom sheets that keep the preview visible.
- **Thoughtful power features** — customizable tab bar (Edit Tabs), Share result, "Add a film that isn't listed," reciprocity curve teaser.
- **Correct, confident domain language** — EI/push-pull, E-6, box speed, reciprocity factor. It respects its expert audience.
- **On-theme dark palette** with the subtle safelight-red glow behind the tab bar.

## 6. Prioritized issues

| Pri | Problem | Where | Recommended fix |
|---|---|---|---|
| **P0** | Crimson accent overloaded: same red = primary CTA, selected-state, view-toggle, destructive, link, and active-row. Users can't learn what red means. | Everywhere; worst on Border (`00`/`16`) | Define a token system: one reserved primary/brand color, a distinct *selected* tint, a distinct *destructive* red, and a neutral for toggles/links. Demote `Hide blades`/`Hide readings` to neutral/secondary; make `Reset to defaults` the only red-text destructive. |
| **P0** | `Hide blades` / `Hide readings` are solid-red and read as primary or destructive but are benign view toggles. | Border (`00`, `16`) | Convert to neutral secondary buttons, segmented toggle, or icon toggles. Reserve solid red for the actual primary action. |
| **P1** | "Coming soon" placeholders are near-empty dead ends with no value, timeline, or alternative. | Mat Cut, Lenses, Camera Exposure (`05`/`06`/`07`) | Add an icon, one-line value prop, "available on web at dorkroom.app," and optionally notify-me. Remove the redundant centered title (large title already says it). |
| **P1** | Dropdown ▾ fields and Border summary rows have weak tappable affordance. | Border (`00`), Reciprocity (`02`), Roll/Camera (`13`/`19`) | Strengthen caret contrast, add a subtle pressed state, and/or a clearer field chrome so they read as interactive, not read-only. |
| **P1** | Two red confirm actions on one sheet (`Done` + `Add camera`) create commit ambiguity. | Add camera (`19`) | Make `Done`/dismiss neutral; keep one red commit button. Same review for all sheets with both. |
| **P1** | Legacy screens (Resize, Exposure) carry redundant `Back`+large title and abbreviated labels, breaking the no-title convention used by Border/Meter/Film Log. | `03`, `04` | Align to the newer pattern; expand `(in)` labels; reflow so the result isn't clipped at the fold (`03`). |
| **P2** | Exposure offers three simultaneous controls for one value. | Exposure (`04`) | Choose a primary (chips + stepper), demote or remove the redundant custom field. |
| **P2** | Slider lacks range/step labels and numeric entry. | Border size (`15`) | Add min/max endpoints, current value already shown, and an optional typed input for precision. |
| **P2** | Film Log icon differs between tab bar (film strip) and More list (circle). | `09` vs tab bar | Unify the glyph. |
| **P2** | Unselected segmented-control labels read as disabled (mid-gray). | Resize, Roll form, Paper sheet | Lighten unselected label contrast; verify ≥4.5:1. |
| **P2** | "Export JSON" is developer language in a consumer app. | Film Log (`11`) | Rename "Export data" / "Back up rolls." |
| **P2** | Long film picker has no search/grouping. | `17` | Add search + brand sections (parity with the More screen's search). |

## 7. Quick wins vs. bigger bets

**Quick wins (hours, low risk):**
- Recolor `Hide blades`/`Hide readings` to neutral secondary buttons (P0, single highest-impact visual fix).
- Flesh out the three "coming soon" screens with an icon + value line + web link.
- Unify the Film Log icon.
- Rename "Export JSON."
- Strengthen the dropdown ▾ caret contrast and the segmented-control unselected-label contrast.
- Add min/max labels to the border-size slider.
- Resolve the `Done` vs. `Add camera` double-confirm wording on sheets.

**Bigger bets (design-system work):**
- **Define and document a color token system** that separates brand/primary, selected-state, destructive, and link/utility — then audit every red usage against it. This is the root cause behind several P0/P1 items.
- **Establish one canonical selection control** (or a documented rule for when to use segmented vs. chips vs. dropdown) and migrate screens to it.
- **Modernize the legacy calculators** (Resize, Exposure) to the Border/Meter layout language — drop redundant titles, fix clipping, simplify Exposure's redundant inputs.
- **Per-tool result accent color** (amber for reciprocity, blue for exposure, teal for resize) is currently ambiguous — decide whether it's an intentional system (then make it consistent and documented) or collapse to one result color.

---

*This is a strong, characterful v1 that already feels native; the highest-leverage work is disciplining the crimson accent into a real token system and lifting the older calculators and placeholder screens up to the quality bar that Border and Reciprocity already set.*
