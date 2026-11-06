# Changelog

All notable changes to the Dorkroom.art **web app** are documented here.
The iOS app has its own changelog: [`apps/mobile/CHANGELOG.md`](apps/mobile/CHANGELOG.md).

This project uses [CalVer](https://calver.org/) date-based versioning: `YYYY.MM.DD`.

## [Unreleased]

### Added

- **API client filters.** `fetchFilms`, `fetchDevelopers` and `fetchCombinations` in `@dorkroom/api` accept typed, optional query params (slug, brand, colour type, film, developer, page and so on) matching the API reference. Calls without params behave as before, and failures already throw `DorkroomApiError`. (fixes #254)
- **Film photos credit their source.** A film's page now shows who took the packaging photo and its licence, linked to where it came from.
- **A sortable films table.** /films lists films in a full-width table. Click the Film, ISO or Recipes heading to sort; the sort is kept in the link. Opening a film narrows the table to a list beside the film's page, and on phones each film is a row that opens as its own page. The Darkroom theme shows no film photos, since they were too bright for its red-only screen. (#669)
- **Recipes on the film page.** A black and white film's page now shows its development recipes, grouped by ISO and opening on the box speed. Each row links to that recipe on /development. Films with no recipes skip the section, color and slide films never mention recipes, and Kindle and other e-ink devices keep the plain link to /development. The page also ends with up to four other films at the same ISO. (#669)
- **Filters sit in a toolbar on /films.** Search, film type, ISO, brand and status run along the top in a slim bar instead of a sidebar. On phones the toolbar also has a Sort menu. /films now uses more of a wide screen, with taller results. (#669)
- **Back works on the films page.** Opening a film adds a step to your browser history, so Back closes it, or returns to the previous film, with your search and filters as you left them. (#669)

### Changed

- **Rebranded films share recipes with their whole family.** A film's recipes now include those of its base film and of every other film rebranded from that base, so Arista and Holga films show the recipes published under Lomography's Lady Grey and Earl Grey. This applies to the recipe counts and sort on /films and the recipes on a film's page. (#679)
- **Recipes match the films list.** On /development, the recipe table and cards now sit on a solid background instead of showing the page's gradient. Sort headings use the same arrows as /films and tell screen readers the sort direction, and an empty result now has a Clear filters button.
- **A tidier film page.** Film details now open with ISO, type, reciprocity and grain together at the top, then About and any manufacturer notes. Grain is capitalized the same way for every film. The film page no longer shows the date a film was added to the database. (#669)
- **The negative inverter prints like a darkroom print.** Converted negatives now go through a virtual paper curve, with a soft roll-off into paper white and a deep black, instead of a straight line. Contrast works like a paper grade, a dark frame is brightened a little (a bright one is never darkened), and warmth and tint act like enlarger filtration, so whites and blacks stay clean when you colour-correct. Default contrast and brightness stay close to before. (#527)
- **Colour negatives keep the colour of their light.** White is set from the most neutral of the brightest areas, so a lamp-lit wall or a sunset stays warm instead of being bleached towards white. Black is taken from the film base, so a dark coloured floor or foliage no longer tints the whole frame, and unexposed film prints as a deep black. A large bright area such as a sky is no longer forced to white. Thanks to NegPy, whose published approach this follows. (#527)
- **Phone photos that crush the blue channel convert cleanly.** When a negative is photographed against a bright light table, the phone often records the blue layer of the brightest parts of the scene as pure black, which made walls and skies come out blue or blown out. Those areas are now measured through the film's green layer, so they keep their colour. Exposing the photo for the film, not the light table, still gives the best result. (#527)
- **The negative inverter finds the film base on its own.** After you load a photo the positive appears straight away, using a film base found in the rebate (marked "Auto base"), and it is found again when you change the crop or film type. Picking the base yourself replaces it. When the photo leaves room for doubt (no clear rebate to compare against), the preview still appears but the page asks you to tap the film base and points at the tool. If no base can be found at all, pick it as before. (#527)
- **The automatic film base is steadier.** It now takes the middle of the clear rebate rather than its brightest corner, so uneven light-table illumination and sprocket-hole edges move it less. (#527)

### Fixed

- **The custom recipe form checks what you enter.** A blank name, time or ISO, or a missing film or developer, now shows a message in the form instead of saving a recipe that was missing details or keeping an old number. Pulls down to 5 stops can be saved, as published recipes use them, and editing a recipe saved from a share link keeps its dilution and push/pull (#679).
- **Home search agrees with /films on rebranded films.** Search now shares recipes across a rebrand family, so `holga xtol` and `arista edu ultra 400 xtol` give XTOL's published time, under the name you typed, instead of "No recipe", and film counts match /films. `arista 400 xtol` now reads as the Arista 400 that has recipes and says so with a "Read as" chip, while naming a film in full (`arista premium 400 xtol`) still answers for that film. (#679)
- **Kindle loads only what it uses.** Browsers that get the compatibility build (Kindle's Chromium 80 and other browsers from before early 2022) no longer download, parse and then discard the modern scripts and stylesheet on every visit. A small inline script now picks the right set before anything is requested, so the home page makes 11 fewer requests and transfers about 170 KB less there. Modern browsers load the same files as before. (fixes #644)
- **Translucent colours use the right theme on Kindle and other older browsers.** On browsers that get the compatibility stylesheet (Kindle's and other browsers from before early 2022), several themed tints fell back to the dark theme's colour in Light, Darkroom and High Contrast. That covered the background tint behind the formula boxes on /stops, /lens and /camera-exposure (grey on Kindle instead of a faint white), the muted info panels, the custom recipe colours on /development and the text selection colour. They now match modern browsers, which are unchanged. (fixes #652)
- **Dialogs dim the page and close on an outside tap on Kindle.** Kindle's browser does not stretch an absolutely positioned button between its edges, so the backdrop behind the search dialog and the phone film sheet had no width: no dimming, and tapping outside did nothing. Those backdrops (and the negative inverter's pick surface) now have an explicit full width and height. Other browsers look and behave the same. (fixes #651)
- **Kindle's menu drawer is solid, and ring outlines and number alignment work again.** Kindle's browser drops any Tailwind utility written with an empty `var()` fallback, which switched off `ring-*` outlines, `tabular-nums` and the filter utilities (grayscale, invert and so on), and the menu drawer's 95% opaque background let page text show through. Keyboard focus rings still don't show there, because they use `:focus-visible`, which Kindle's browser doesn't support. The compatibility stylesheet now rewrites those declarations so they apply, drops backdrop blur (it only smears an e-ink screen), and makes the menu drawer, header, nav pill and dropdown solid. Other browsers are unchanged. (fixes #642)
- **The phone Filters badge on Films counts the search.** Searching for a film on a phone now reads "1 active" on the Filters button, matching the desktop panel, instead of "0 active". (fixes #649)
- **Clearing a filter field keeps your place.** Clicking a filter field's X (Brand, ISO, Film, Developer and the like), or pressing Enter on it, no longer drops keyboard focus to the page. Focus returns to the field with its list closed, so the next Tab carries on from there and the next keypress or Down arrow opens the list as usual. On a phone, tapping the X still clears the value without bringing up the keyboard. (fixes #639)
- **Settings options are announced as single choices.** The theme options and the Default Units options in Settings now work as radio groups for screen readers: each group is named, the chosen option is reported as checked, Tab enters a group once, and the arrow keys (plus Home and End) move between options and select them. Clicks and taps work as before, and the look is unchanged. (fixes #643)
- **Kindle's browser shows no animations or transitions.** On browsers that get the compatibility stylesheet (Kindle's Chromium 80 and other browsers from before early 2022), fades, slides, spinners and smooth scrolling are off, so changes appear instantly instead of ghosting. The Animations switch in Settings is hidden there, since motion is always off. Other browsers are unchanged. (fixes #637)
- **E-ink screens always use high contrast.** On a Kindle Scribe or any monochrome screen the theme is fixed to High Contrast, whatever was chosen before, and the theme menu and the theme options in Settings give way to a short note. The earlier choice is kept for your other devices. Colour e-ink such as the Kindle Colorsoft is locked too. Fire tablets and other LCD or OLED screens are unchanged. (refs #637)
- **Tabbing out of a filter field closes its list.** Pressing Tab or Shift+Tab to leave a filter dropdown (Brand, ISO, Film, Developer and the like) now closes its list at once, so lists no longer pile up over each other and over the results. Picking an option with the mouse or a tap works as before. (fixes #635)
- **The site does less work on a Kindle.** On e-ink Kindles, the film database loads no film thumbnails: cards show the film icon, and the photo shows when you open a film. On older browsers, the Kindle's included, links no longer start loading a page's code when touched or scrolled over, and Speed Insights is not loaded. Modern browsers are unchanged. (refs #636)
- **Tapping outside an open filter list only closes it.** On a phone, tapping a film or recipe card while a filter dropdown (Brand, ISO, Film, Developer and the like) was open also opened that card. The first tap now just closes the list, and the next tap opens the card. Mouse clicks on desktop are unchanged. (fixes #633)
- **Phone filter lists are no longer covered.** The floating search and menu buttons step aside while a filter dropdown (Brand, ISO and the like) is open, so every row can be seen and tapped across its full width. (fixes #629)
- **A flood of requests can no longer use up the data service's monthly allowance.** Website requests that filter the film, developer or recipe data (any address with a query string), plus the rare requests the CDN can't serve from its cache, now share a site-wide budget per minute and per day, on top of each visitor's own limit. Once that budget runs out, filtered requests are refused until it frees up, which can take hours. The site's own pages never filter this way, so they keep loading, and the CDN can now serve the last good copy for up to a day if the data service fails. Apps using an API key are not affected. (fixes #598)
- **Mat measurements read the way you write them.** On /mat, `3-1/2`, `3 1/2"`, `3 1/2 in`, `3½` and `3 ½` are now 3.5 instead of being cut down to 3, a comma decimal with an inch mark (`20,5 in`) keeps its decimals, and metric fields accept a trailing `cm`. A border or reveal with anything else left over, such as `3abc`, now shows the "Check inputs" message instead of quietly using the leading number or no reveal. (fixes #340)
- **Dialogs keep keyboard and screen reader users inside them.** Every dialog that tells screen readers it is modal (the centred dialogs, search, the recipe form, import and preview sheets on phones, the film and recipe detail sheet on phones, its full-screen view, and the phone menu) now is: focus moves into it when it opens, Tab and Shift+Tab cycle inside it instead of walking out into the page behind, the page behind can't be clicked, focused or read until it closes, and focus goes back to the button that opened it. Toasts such as "Link copied" still show and are still announced while a dialog is open. (fixes #286)
- **The closed phone menu no longer hides focusable links.** While the menu slid shut, its links were hidden from screen readers but could still be reached with Tab. The whole menu is now switched off the moment it closes. (fixes #603)
- **Escape closes one thing at a time over the phone menu.** With the menu open, opening search and pressing Escape used to close both and drop keyboard focus onto the page. Now Escape closes search and focus stays in the menu, and a second Escape closes the menu and returns focus to the "Open navigation" button. (fixes #613)
- **Escape closes the theme and navigation dropdowns without closing what is under them.** With the phone menu open, opening the theme dropdown and pressing Escape used to close both and move focus to "Open navigation". Now Escape closes the dropdown and keeps focus on its button inside the menu, and a second Escape closes the menu. (fixes #617)
- **Screen readers announce toasts such as "Link copied".** The message is now spoken from a hidden region that stays on the page, instead of one that appears together with its text (which many screen readers skip). Errors are announced more urgently, and copying the same link twice is announced both times. (fixes #602)
- **The search button brings up the keyboard on phones.** Tapping the search button on a phone opened the search dialog without the on-screen keyboard, so you had to tap the box again before you could type. The keyboard now comes up with the dialog, and the cursor is in the box. (fixes #619)
- **A third of a stop is exact on the Stops page.** The page worked a third of a stop out as 0.33, so 12s +1/3 gave 15.08s while the home search said 15.12s. Thirds and two-thirds are now exact, from the +1/3 buttons, a typed 0.33, or a link, including older shared links, and three +1/3 presses add exactly one stop. The multiplier reads ×1.260. (fixes #551)
- **Film, developer and recipe data keeps loading when the rate limiter is down.** If the service that counts each visitor's requests couldn't be reached, any request the CDN hadn't already cached failed with a server error, and if it stopped answering, requests hung until they timed out. The check now gives up after a second and a half without retrying, and the request goes through without it, as it already did when the limiter isn't set up. A limiter that is set up wrongly still refuses requests, and apps using an API key still need the key verified. (fixes #609)
- **Cached API responses no longer show someone else's rate-limit count.** Anonymous `dorkroom.art/api` responses are shared through the CDN, so they carried the `X-RateLimit-*` headers of whoever filled the cache, which could mislead a client that backs off on them. Those headers are now sent only where they describe the caller: on every API-key response and on any `429`. (fixes #607)
- **The fallback bundle for old browsers is genuinely ES5.** It still contained newer JavaScript (arrow functions and template strings), and the build now fails if that ever comes back. Older browsers (Safari before 14) also no longer stop with an error when the theme follows the system. When the theme follows the system on a black-and-white screen or in a Kindle browser, the site now uses the high-contrast theme. On its own this did not make the site work on Kindles: Kindles on current firmware (5.16.4+) run a Chromium 80 browser that also needs CSS fallbacks (see the next entry), and Kindles on firmware before 5.16.4 have an ES5-only browser that lacks features the app depends on. (refs #49)
- **The site should now render on Kindles with current firmware.** Kindles on firmware 5.16.4 and later browse with a Chromium 80 browser, which skipped most of the site's styles and showed a plain, unstyled page. The build now also makes a fallback stylesheet for browsers that old, with the theme colours worked out in advance, and a small check in the page loads it only in browsers that need it. This was tested in Chromium 80, the engine those Kindles use, but not yet on a device. Modern browsers never download the fallback and look exactly as before. Calculator cards, film tags and other tinted boxes in the high-contrast theme also no longer turn solid black there. Kindles on firmware before 5.16.4 are still not supported. (refs #49)
- **Film and developer pickers show which row is active and selected in every theme, and screen readers announce it.** The row you are arrowing through gets an inset outline and the chosen row gets a check mark, so Darkroom no longer shows identical rows. The search box is now a proper combobox, so the active option is read out as you move. (fixes #522)
- **Filter dropdowns on /films open on top of the results on phones.** An open picker in the mobile filters, such as ISO speed or Brand, used to slide under the film cards below it, so its lower rows were hidden and a tap there opened a film instead. The whole list now shows and every row can be tapped. (fixes #596)
- **Warnings are announced to screen readers.** Calculator warnings and errors (blade readings, minimum border, offsets, aspect ratio mismatch, a failed shared recipe link) used to appear together with their own alert role, which many screen readers do not announce. They now appear inside an alert area that is already on the page. Nothing changes visually. (fixes #585)
- **The dev server port can be pinned again.** `MFE_APP_PORT=4200 bun run dev` was ignored (turbo filtered the variable out), so the dev server always started on port 4503, which broke the Docker setup that publishes port 4200. The variable now reaches the dev server. (fixes #592)
- **Development time is visible on tablets.** On the development recipes table, the filters sidebar now starts collapsed below 1280px wide, such as on tablets (an iPad in portrait) and narrow windows, so the Time column fits without scrolling sideways. Expand the sidebar any time with its toggle. (#586)
- **Searches with commas work, and names match themselves.** A `query` containing a comma used to fail on `/developers` with a 502. In film, developer and recipe searches, accents now count and any run of punctuation or symbols (apostrophes, `+`, `/`, commas) matches any characters, so `Photographers' Formulary`, `Spürsinn`, `ADX A+B` and `Rodinal/Adonal` find themselves instead of having those characters stripped, and `HP5+` still finds `HP5 Plus`. A search with no letter or digit returns a 400 on all three. (fixes #333)
- **The API docs no longer promise fuzzy search.** `query` is a case-insensitive partial match, not an exact one, and `fuzzy` never did anything. It is now marked deprecated and ignored (still accepted, so existing clients keep working). (fixes #333)
- **Pages start faster.** Every page used to download the form library and the full validation library before it appeared, about 39 KB (compressed) that only the calculators and the recipe page use. They now load with those pages, cutting the JavaScript the home page needs before it shows by about 22%. (fixes #352)
- **The film and recipe sidebars keep your place in the list.** On a wide screen, opening a film from the keyboard on /films used to drop focus to the top of the page, and closing the film or recipe sidebar did the same on /films and /development. Focus now stays on the card that opened the sidebar, comes back to that card or table row when you close it with Escape or its close button, and moves to the results list if the item is no longer there. After you confirm deleting a custom recipe, focus lands on the results list instead of the top of the page. (fixes #604)

- **The filters sidebar keeps keyboard focus.** On /development and /films, collapsing or expanding the filters now moves focus to the other toggle instead of dropping it, and both toggles tell screen readers whether the filters are open. (fixes #591)
- **Screen readers hear art and reveal changes on /mat.** Changing the art size or reveal now announces whether the window still matches the reveal, with the overlap or gap on each side, and announces again when it matches. Borders that leave no window are announced too. (fixes #431)
- **Newly added films and developers show up.** Films and developers added without a description were silently left out of every list and picker, which hid 61 films and 81 developers. They now appear.
- **filmdev.org imports pick the right film and developer.** Importing a recipe used to match only films and developers that already had a recipe on Dorkroom, so Fomapan 100 came in as Kentmere Pan 100 and several Adox developers came in as ADOTECH IV. Imports now search the whole catalogue and need a real name match, and anything Dorkroom doesn't list comes in as a custom film or developer instead of the nearest lookalike.
- **The custom recipe form lists every film and developer**, including ones that don't have a recipe yet.
- **filmdev.org recipes shot at box speed import at box speed.** Recipes that don't say what speed the film was shot at came in as ISO 400, so a recipe for a 100-speed film showed as "pushed 2 stops". They now use the film's own speed.
- **Pages no longer scroll sideways on tablets and narrow windows.** Between 640 and about 1090 px wide the top bar was wider than the window, cutting off its right end. Windows narrower than 1024 px now get the menu and search buttons at the bottom right, as on phones, and the full top bar fits from 1024 px up. (fixes #548)
- **Link previews keep their film and developer details during a burst of shares.** Preview cards for film, developer and recipe links read the catalogue directly instead of going through the site's public API, whose per-visitor rate limit every card render shared. When a link spread quickly (posted to a forum and unfurled by several apps), later cards could lose their details and show only a name made from the link. (fixes #443)
- **Links start loading their page on hover.** Hovering, focusing or touching a link to a page now starts loading the page itself. When you open /development or /films, their films, developers and recipes are fetched at the same time as the page instead of after it arrives. (fixes #354)
- **Film thumbnails on /films are a fraction of the download.** Each card used to download the full-size packaging photo (up to 400 KB, about 9 MB for the whole list) to show it at 60 px. Thumbnails are now resized to the size they are shown at, served as WebP, and cached, and the larger photo in the detail panel gets its own sharper size. (part of #353)

## [2026.10.30]

### Added

- **Custom recipes can be shared.** The Share and Copy link buttons on your own recipes on /development were built but hidden in production. They now appear on the recipe detail at every screen size, and the link opens an import preview for whoever receives it. Share codes pasted into "Import recipe" are accepted too; codes containing `-` or `_` used to leave the button disabled. (#512, fixes #500)
- **Built-in recipes have a Share button in the detail panel** on desktop as well as on phones. (#511)

### Changed

- **Recipe details on phones use the same panel as desktop.** The mobile detail opens as a bottom drawer with the recipe title, a row of actions (favorite, share, copy link, edit, delete), the non-standard temperature alert, and drag-to-dismiss. Editing a custom recipe steps the drawer aside while the form is open and brings it back with your changes. (#511, fixes #380)
- **Hover effects come from the theme instead of scripts.** Buttons, cards and table rows on /development, /films and the /border mobile drawers use theme hover colors in every theme. Hover no longer sticks after a tap on touch screens, and disabled buttons no longer brighten on hover. (#507, fixes #453)
- **API responses are more consistent.** Every `api.dorkroom.art` and `/api` endpoint answers `OPTIONS` with 204 and an `Allow` header, rejects unsupported methods with a JSON 405, and sends `nosniff`. Rate limits, API key handling and response bodies are unchanged. (#502, fixes #451)
- **Calculator persistence was reorganized** so each calculator's saved fields, bounds and defaults come from one definition. Saved inputs from earlier versions load as before. (#503, #504; fixes #284 and #285)

### Fixed

- **Favourited recipes stay at the top on descending sorts.** On /development they sank to the bottom whenever a column was sorted descending; they now lead in both directions and re-sort as soon as you toggle a favourite. (#517, fixes #498)
- **The phone menu's round close button works.** With the menu open, the floating button at the bottom right was covered by the menu's Settings link, so tapping it opened Settings. It now closes the menu, and Settings sits clear of it. (#518, fixes #516)
- **Form errors are readable, and "Import recipe" accepts share links.** Validation messages showed as `[object Object]`; they now show the actual message. The import box also accepts a full Dorkroom share link or `recipe=<code>`, keeps the button disabled until the entry is valid, and explains when a pasted link points at a built-in recipe. (#519, fixes #514)
- **A custom film or developer survives editing a recipe twice.** Switching a recipe from a catalogue film to your own film kept the catalogue id, so the next edit silently put the catalogue film back. Recipes affected before this fix load correctly and are repaired the next time you save them. (#520, fixes #510)
- **Recipe names and notes keep what you typed.** Accented and non-Latin names were stripped to plain ASCII (`Café` became `Caf`), notes lost words such as "object", "script" and "embedded", and text between a `<` and a `>` (like "temp < 20C and time > 5 min") disappeared. Names and notes are now saved as typed, including emoji. Text already saved can't be restored. (#521, fixes #513)
- **Dropdown options are readable in High Contrast, and icons on red buttons are visible in Darkroom.** Highlighted options in the film and developer pickers were black on black, and the "Expand filters" and active-filter icons were red on red. (#523, fixes #506)
- **The Cancel button in confirmation dialogs is readable in the High Contrast theme.** Its label disappeared on hover. (#507)
- **A recipe link opens even when its search doesn't match the recipe.** A bookmarked `/development?q=…&recipe=…` link whose search excluded the recipe opened nothing and dropped the recipe from the address bar. The search box also no longer races a second writer for the `q=` parameter. (#509, fixes #288 and #508)
- **Page scrolling no longer stays locked after closing stacked drawers.** Opening one drawer over another (for example editing a recipe from its detail on a phone) could leave the page unable to scroll until a reload. (#511)

## [2026.10.29]

### Added

- **Every calculator that remembers your inputs now has a "Reset to defaults" button.** /stops, /resize, /reciprocity, /lenses, /mat and /exposure saved their inputs indefinitely with no way back short of clearing site data; only /border had a reset. The new button sits at the right of each page header (icon-only on phones). It restores the defaults and drops the saved values, so a reload right after a reset doesn't bring them back. /border's existing reset now clears its saved values the same way. (#426, fixes #249)
- **Screen readers announce calculator results.** Changing an input recalculated silently, so a screen-reader user had to go and find the result card after every edit. Each calculator now has one hidden live region that reads the main result once you stop typing, with units spelled out ("New exposure time 40 seconds, plus 2 stops"). It stays quiet on page load and while input is invalid. On /border the announced blade names match the Blade Readings card in portrait too. (#432, fixes #347)

### Changed

- **Number fields clamp out-of-range values when you leave them.** The resize fields no longer accept negative sizes or times: a negative value is held back while you type and snaps to 0 on blur (including `-0`). The shared number inputs gain optional `min`/`max`, so other calculators can do the same. (#425, fixes #248)
- **The Open Graph image endpoint is rate limited and does less work per request.** Fonts are downloaded once per server instance instead of per image, and malformed film, developer, recipe or preset values are ignored before any lookup runs. Link previews beyond a per-IP budget are redirected to the page's standard card instead of being rendered again. (#436, fixes #253)
- **`@dorkroom/api` throws its documented `DorkroomApiError`.** Every client failure used to be a plain `Error` with the status folded into the message, so callers couldn't tell a 404 from a 500. Errors now carry `statusCode` and `endpoint` (and `cause` for network and parse failures), aborted requests pass through unwrapped, and a new optional `onInvalidRows` callback reports rows dropped by validation. Existing messages are unchanged. (#446, part of #289 and #254)
- **The site honors your system's "reduce motion" setting by default.** Animations used to be on for everyone until switched off in Settings. With nothing chosen, they now follow the OS setting, and the OS setting stops CSS motion even if the in-app toggle is on. A choice you made in Settings still applies. (#414, fixes #351)
- **The home page preview pauses when you can't see it.** The animated border preview on the home page stops cycling while it is scrolled offscreen or the tab is hidden. (#415, fixes #355)
- **Stricter security headers and patched dependencies.** dorkroom.art can no longer be embedded in frames on other sites, and dependencies with known vulnerabilities were upgraded. (#405, #388, #406)

### Fixed

- **A manual "Flip Paper" on custom paper survives reloads and share links.** The flip was undone on reload, and a shared link could open in the other orientation with different blade readings. Old share links decode exactly as before. (#429, fixes #339)
- **Shared border presets get their own link preview again.** Every share link made since the current link format shipped showed the generic Border Calculator card and description. Previews now show the preset name, paper and print size; old links keep working, and custom paper sizes no longer read "0×0". (#434, fixes #430)
- **Mat "Best fit borders" no longer trips its own mismatch warning.** Rounding each border on its own could make the window miss the reveal (16×20 board, 8 1/16" art, 1/4" reveal gave a 7 1/2" window and a warning). Best fit now splits each pair of borders so the window is exact, on a 1/16" grid in imperial and 1 mm in metric, and the cut cards agree with the borders. (#442, fixes #341)
- **Metric values stay as you typed them.** Typing 25 cm showed 25.001 after leaving the field; values entered in inches no longer drift when viewed and saved in metric; doubling 11×16 to 22×32 cm no longer warns that the aspect ratios differ; and the custom-paper warning and min-border toast print in your unit instead of raw inches. (#445, fixes #343)
- **Custom paper on /border keeps its orientation.** Picking Custom paper took its orientation from the aspect-ratio fields instead of the paper size, so it could flip on reload. On narrow screens, Flip Paper is now kept when you edit the custom size afterwards. (#418, fixes #338 and #372)
- **Typed paper sizes and focal lengths no longer reset on reload.** Values that wouldn't be saved (a custom paper over 1000 in, a focal length over 2000 mm) worked until the next visit and then quietly reverted. Out-of-range paper sizes are now refused as you type, and focal lengths up to 10,000 mm are accepted and saved. (#419, fixes #374)
- **/films shows a Retry button when the catalog fails to load.** It used to show the raw error text above a misleading "No films found" message. (#420, fixes #328)
- **A `?film=` link opens that film even when the catalog loads slowly.** If the catalog took more than half a second to load, the film was dropped from the link and you landed on the full list. This includes the "View in Film Database" link on recipes. (#396, fixes #324)
- **The desktop film detail panel names the real base film** on the "Repackaged …" line, as the mobile layout already did. (#363, fixes #329)
- **Recipe filters on /development behave as expected.** "Clear filters" now also turns off "Favorites only" (#364, fixes #327). Picking a developer clears the hidden developer-type filter, which could leave 0 results with no way to undo it (#365, fixes #325). An invalid value in the URL no longer stops filters from syncing to the address bar, and search now covers your custom recipes too (#389, fixes #371 and #326).
- **Reciprocity accepts a decimal comma.** `1,5` was flagged as invalid and lost on reload. (#389, fixes #373)
- **Clearer reciprocity tip.** The tip on /reciprocity claimed Pan F+ stays linear longer than Delta 3200, which the calculator's own table contradicts. It now uses T-Max 100 vs. Tri-X as the example. (#413, fixes #344)
- **Hover states work on recipe details.** The pills, Edit/Delete buttons and links in a recipe's details had no hover effect. (#389, fixes #297)
- **/development has a proper page heading** for screen readers, and the "How this calculator works" cards no longer skip heading levels. (#389, fixes #350)
- **Mat gap values show up.** When the window is larger than the art, the "Actual overlap" warning and "Actual reveal" row were blank. They now show negative values. (#366, fixes #342)
- **Bigger stepper buttons on /mat.** The up/down buttons next to each mat measurement are larger and easier to tap. (#398, fixes #349)
- **The phone navigation menu has its own close button.** The button that opened it was hidden under the open menu, so tapping where it had been opened Settings instead. (#367, fixes #346)
- **The home page no longer scrolls sideways on 320px-wide screens.** The heading, footer links and the /border Readings button now fit. (#392, fixes #348)
- **Unknown pages tell search engines they don't exist.** They return 404 and are marked not to be indexed. (#395, fixes #334)
- **Dorkroom can be installed as an app on desktop Chrome and Edge.** The installed app also always opens on the home page, not the page you installed it from. (#412, fixes #335)
- **Unknown `api.dorkroom.art` paths return a JSON 404** instead of the website's HTML. (#391, fixes #331)
- **The public API returns 400 for bad requests instead of 502.** An invalid query now gets a 400 with the reason, so clients stop retrying requests that will never succeed. (#394, fixes #332)
- **API recipe pages no longer repeat or skip recipes.** Recipes created at the same moment could show up on two pages of `/combinations` results, or on none. (#390, fixes #336)

## [2026.09.22]

### Fixed

- **A dilution picked from the dropdown now saves with your custom recipe.** Choosing, say, HC-110 Dilution B left the saved recipe showing "Stock" in the table, cards and detail panel, which is a wrong development instruction. Saving a shared API recipe to your collection lost its dilution the same way. The dilution filter now matches these recipes too. (#356, fixes #322)
- **A bad shared recipe link or recipe code no longer crashes the app.** A link or code with out-of-range values (a 250°F temperature, a push of +9) replaced the whole app with a blank error screen, and an imported code did it on every visit to /development until site data was cleared. Such links now show an "Invalid custom recipe data" banner at the top of the page that stays until you dismiss it, bad codes are refused on import, and recipes already stored with bad values are skipped instead of breaking the page. (#358, fixes #323)
- **When a page fails to load, you get a real error screen instead of a bare one.** Page crashes showed an unstyled "Something went wrong!" box with the navigation gone and no way out. They now show the Dorkroom error screen under the header with Try Again and Reload Page buttons, and Reload Page comes first when the cause is a stale file left over from an update. (#357, fixes #330)
- **The menu button no longer covers "Next" on phones.** On /development the round menu button sat on top of the pagination's Next button, so tapping Next opened the menu. Pages now leave room at the bottom for the button on small screens. (#359, fixes #345)
- **Camera Exposure presets tell you when the settings can't reach them.** A preset like Night Sky (EV −2) at f/8 and ISO 100 needs a 256-second exposure, but the calculator silently stopped at the 30-second dial limit and showed an exposure several stops off. A notice now says what the preset needs and suggests Bulb, a wider aperture, a faster shutter, a different ISO or an ND filter, depending on which way it is out of range. (#360, fixes #337)
- **Film thumbnails load as you scroll instead of all at once.** A hidden image check downloaded every thumbnail in the list as soon as its card rendered, which defeated lazy loading on /films. A thumbnail that takes more than 5 seconds now still appears when it finishes loading, instead of being stuck on the placeholder icon. (#361, part of #353)
- **The mat calculator accepts a decimal comma.** Typing `30,5` in metric was read as 30. It is now read as 30.5. (#362, fixes #318)

## [2026.09.17]

### Fixed

- **Shared recipe preview cards can no longer show the wrong recipe.** The Open Graph image for a `/development?recipe=<uuid>` link looked the uuid up in the first 50 recipes for the film + developer pairing and, on a miss, silently fell back to the first row, so pairings with more than 50 recipes (Ektapan P3200 in XTOL has 70) could render another recipe's time, temperature and ISO. The lookup now pages through the results with `count` + `page` (the upstream function ignores `page` when the size is sent as `limit`, which `docs/API.md` now says) and returns the generic film + developer card when the uuid is not found. (#308, fixes #252)
- **The border calculator preview rescales when the viewport changes.** It read `window.innerWidth` once inside a memo keyed only on the calculation, so rotating a device or resizing the window left it at the old size until an input changed. It now subscribes through `useIsMobile` and a new `useViewportWidth` hook, keeping the original strict 768px desktop boundary. (#309, fixes #247)
- **Share buttons follow theme changes while mounted.** `ShareButton` read `data-theme` off the document on render instead of the theme context, so switching theme on the recipes page left the visible buttons styled for the previous theme. (#309, fixes #247)
- **The dev server loads from other machines with an ad blocker on.** Vite serves modules at their source paths, and `src/app/lib/analytics/events.ts` was fetched from a URL matching uBlock Origin's stock `/analytics/event` rule; it is a first-order import of `main.tsx`, so the app never mounted and nothing was logged. The file is now `tracked-events.ts`. Production was unaffected. (#307, fixes #277)
- **`bun run test` passes on Node 22.** The serverless response mock built `_headers` with `Object.assign`, which on Node < 24 hit the deprecated `OutgoingMessage.prototype._headers` setter and left every header assertion reading `undefined` (24 failures that looked like missing security headers). The field is now defined as an own property. The README's stale "Node 18+" prerequisite now reads 24.x, matching `engines.node` and CI. (#306, fixes #282)

## [2026.09.04]

### Changed

- **Dorkroom now grants an additional permission under AGPLv3 section 7 permitting distribution through app stores** ([`LICENSE-EXCEPTION`](LICENSE-EXCEPTION)). Apple conditions App Store distribution on end users accepting terms that restrict rights the AGPLv3 grants (device-count limits, DRM applied to the delivered binary), and section 12 forbids conveying a covered work at all when you cannot satisfy the license and other pertinent obligations simultaneously — the conflict that got VLC pulled from the App Store in 2011. The exception waives only the conditions that collide with those store terms (section 6 Installation Information, section 10 further restrictions, section 12 conflicting obligations), and only to the extent the store's terms make compliance impossible. **Copyleft and source availability are untouched**, and the document says so in its own section: a modified build shipped through a store is still AGPLv3 and still owes its Corresponding Source, and section 13 still applies in full to any modified version served over a network. The permission runs to everyone, not just this project, and section 7 lets any recipient strip it back out. `LICENSE` itself is unchanged — the FSF text stays verbatim.
- **Every covered work carries a section 7 notice at its entry point.** Section 7 requires added terms to be accompanied, in the relevant source files, by a statement of those terms or a notice pointing to them, and its closing sentence extends that to permissive terms stated as exceptions. `apps/dorkroom/src/main.tsx`, `packages/logic/src/index.ts`, `packages/ui/src/index.ts`, and `apps/mobile/index.js` now carry that pointer; `LICENSE-EXCEPTION` records where the notices live and requires the same of any new top-level package. These are comment-only additions and they survive into built `dist/` output, which is what a distributed binary actually ships. The repo still has no per-file license headers beyond these entry points.
- **`@dorkroom/api` is now MIT-licensed**, deliberately unlike the rest of the repo ([`packages/api/LICENSE`](packages/api/LICENSE)). It is a client for the public REST API and is set up for npm publication, so AGPL made it unusable for the audience it exists for: importing it would pull the consumer's entire application into the copyleft, contradicting what the package README already promised about using it independently. The package has zero runtime workspace dependencies and imports nothing AGPL-licensed, so nothing else in the repo is affected. `NOTICE` point 5 now states the package license as a grant instead of leaving it to be inferred from the arm's-length reasoning about HTTP calls. Everything else stays AGPL, including the API server this client talks to.
- **`CONTRIBUTING.md` states inbound licensing per package**, matching each file's outbound license: MIT for `packages/api/`, AGPL-3.0 together with the exception everywhere else. Both halves are load-bearing. Without the exception in the inbound grant, the first outside contribution would leave part of a release plain AGPLv3 and the store build undistributable; without the `packages/api/` carve-out, the first outside patch to the API client could not lawfully ship in an MIT release. There is still no CLA, no copyright assignment, and no proprietary relicensing right.

## [2026.08.19]

### Fixed

- Turbo remote caching had been silently disabled for the repo's entire history: the CI workflow referenced a `TURBO_TOKEN` secret and `TURBO_TEAM` variable that were never created, so every run logged `Remote caching disabled` and rebuilt from scratch. Turbo caching now works through the `actions/cache`-restored `.turbo` directory, whose `restore-keys` let PR runs reuse main's artifacts — warm CI runs go `FULL TURBO`.
- The root vitest sweep at the end of `bun run test` ran **every** package's tests a second time (its config's `projects` list matched all apps and packages — 88 files / 1788 tests duplicated per run). It now runs only the `serverless` project.
- `@dorkroom/mobile#build` (a no-op — native builds run via EAS) declares `outputs: []`, so Turbo caches it instead of warning `no output files found` and re-running it unconditionally.
- Vercel no longer builds the automated README-badge and homepage-screenshot commits. The ignore script's path allowlist already covered them, but it learns the changed files from an unauthenticated GitHub API call that gets rate-limited on Vercel's shared build IPs, and its (deliberately safe) fallback is to build — so the bot commits deployed anyway. They are now skipped deterministically by commit message before the API call.

### Changed

- `typecheck:api` and `test:serverless` are registered as root Turbo tasks (`//#`), running in parallel with package tasks and cacheable with scoped inputs, instead of being chained serially after Turbo with `&&`.
- `typecheck` still depends on the package's own `build` (each package's `tsconfig.spec.json` references its own composite `tsconfig.lib.json`, so typecheck needs its own dist) — but the web app's typecheck now depends on the three package builds explicitly (`@dorkroom/dorkroom#typecheck`) instead of waiting behind the app's ~28s Vite build. The app declares no workspace dependencies in its `package.json` (it consumes packages via tsconfig project references and Vite aliases), so `^build` is empty for it and the edges must be named. Two `TS6305`/`TS2307` races on cold-cache main runs shaped this: a root-level `package#task` override in `turbo.json` replaces the whole task definition, so `@dorkroom/mobile#build` re-declares `dependsOn`/`inputs` alongside its `outputs: []`.
- Net effect: warm CI runs drop from ~90s to ~22s. (Namespace runners were also evaluated — 17s warm — but reverted in favor of GitHub's free public-repo minutes; details in PR #221.)

## [2026.08.10]

### Changed

- Typecheck and build now run on **stable TypeScript 7** (`7.0.2`), replacing the `typescript@rc` (`7.0.1-rc`) pin. It stays installed as the `typescript-7` npm alias, which every package's `build`/`typecheck` script already invokes by explicit path.
- `typescript` stays on **6.x**, [side-by-side with 7](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0), because TypeScript 7.0 ships no programmatic API (it returns in 7.1). `@vercel/node` does `require.resolve('typescript')` against the project to compile `api/**/*.ts` at deploy time, so promoting `typescript` to 7.x would leave `ts.sys`/`ts.readConfigFile` undefined and break the serverless build; Vite, Vitest, and the editor language service resolve the same package. Dependabot now ignores `typescript` majors so the 6→7 bump stops being re-proposed.
- Dropped `minimumReleaseAgeExcludes` from `bunfig.toml`. It existed only to let the moving `rc` dist-tag bypass the 7-day supply-chain soak gate; with both TypeScripts on released versions, the gate now covers the whole dependency tree with no holes.
- The TypeScript README badge tracks `7.0` instead of `7.0_rc`.

### Fixed

- `sharp` is bumped to `0.35.3` (libvips 8.18.3), closing four libvips CVEs ([GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj)). A repo-wide `overrides` entry was needed because `@vercel/og` declares `sharp` as an optional dependency at `^0.34.5` — a caret on a `0.x` version is minor-locked, so it could only ever resolve inside the vulnerable range, leaving a nested vulnerable copy reachable from `api/og.tsx`.

## [2026.08.09]

### Fixed

- The bot meta endpoint (`api/meta.ts`) now checks the origin response status before rewriting it: because `fetch()` resolves (rather than rejects) on HTTP 4xx/5xx, a failing origin request could previously have its error page rewritten and served as a valid share card. It now returns a 502 instead.

### Changed

- The films / development-recipes filter sidebar memoizes its context value and collapse toggle, so consumers no longer re-render on every parent render. Collapse/expand transitions now name the property they animate (`transition-[width]`) instead of `transition-all`, and the hero preview and skip link use the curated `transition` utility, avoiding animation of unrelated properties.

## [2026.07.13]

### Changed

- **Colon-notation dilutions (`1:31`) are now read as concentrate + water parts — identical to plus notation (`1+31` = 32 total parts) — matching manufacturer usage (Ilford's Ilfotec HC "Dilution B" is documented as 1+31 and stored in our data as `1:31`).** Computed developer volumes for colon-notation recipes changed by roughly 2–3% (e.g. 500 ml at 1:31 is now 15.6 ml concentrate instead of 16.1 ml), and the internal `1:1` special case is gone. The volume mixer now states the interpretation on screen ("1 part concentrate + 31 parts water (1:31 = 32 parts total)") so the convention is never ambiguous.
- Development recipe times render in one format everywhere (`14m` / `9m 30s`); the recipe cards previously showed `14 min` while the table showed `14m`.

### Added

- Free-text search on the development recipes page: a debounced search box (film, developer, or dilution — punctuation-insensitive, so "tri x" finds Tri-X) in the desktop sidebar and mobile filters, synced to a shareable `?q=` URL param.
- A "Clear filters" action on the films page's no-results empty state.
- A skip-to-content link for keyboard users, and hover tooltips explaining the flame/snowflake temperature icons and the OFFICIAL provenance badge.

### Fixed

- Border calculator "Round to 1/4″" now actually produces quarter-inch print sizes (a final 2-decimal rounding step was destroying the correct answer — e.g. blade readings 8.25/5.50 became 8.24/5.49), and the button discloses what it will do ("Sets min border to 0.875″") instead of silently rewriting the typed minimum border. The disclosure line reserves its space so controls don't shift while dragging the slider.
- High Contrast theme: the Film / Developer / Volume Mixer cards in the recipe detail panel no longer render black-on-black (invisible); the theme's white-card override now applies.
- Calculators no longer silently "fix" invalid input: typing `-5` on the stops page no longer inverts to `5`, the resize page explains what's needed instead of blanking its result card, and the border page's min-border field no longer coerces drafts to `0` mid-keystroke. Invalid committed values show inline validation errors.
- The border calculator's "Offset adjusted" warning no longer fires when both offsets are 0 (and reads "honor", not "honour").
- The reciprocity chart's Y-axis title was rotated around the wrong pivot and rendered off the left edge of the canvas — now visible.
- Toast notifications can no longer extend past the right viewport edge (long messages wrap), and the "Themes" tooltip no longer lingers over the open theme menu.
- Copy: "for X amount of stops" → "number of stops".

### Accessibility

- New `--color-focus-ring` token gives keyboard focus a ≥3:1 contrast ring in every theme; the dark and light themes previously used translucent border colors (e.g. `rgba(255,255,255,0.2)`) that were effectively invisible. All interactive components now use the token.

## [2026.07.12]

### Security

- The Supabase edge functions backing `films`, `developers`, `combinations`, and `stats` now require a shared secret (`x-proxy-secret`, matched against `PROXY_SHARED_SECRET`) on every request and fail closed (503) if that secret isn't configured, so the catalog can no longer be read directly by anyone who learns the project URL, bypassing Vercel's rate limits.
- The bot meta endpoint (`api/meta.ts`) HTML-escapes every value it interpolates into the served markup, and every tag rewrite now uses a function-based `String.replace` callback instead of a string replacement — closing a document-splicing bug where a decoded value containing `$\``/`$'`/`$&` could pull surrounding HTML into the output.
- `api/og.tsx` and `api/meta.ts` reject query params outside their allowlist (and reject/normalize a duplicated allowed param, which previously slipped past `og.tsx`'s guard). `api/og.tsx`'s OG-image URLs are only ever emitted by the site itself, so it still 400s; `api/meta.ts` serves bot/crawler previews for arbitrary shared URLs, so it instead redirects (cached 308) to the canonical URL with unknown params dropped, keeping link previews working for links carrying tracking params like `utm_source`.

### Fixed

- The reciprocity calculator no longer returns a corrected exposure shorter than the metered time for sub-1-second exposures.
- Time formatters no longer emit "1m 60s"-style output — seconds now roll over into minutes correctly.

### Performance

- The `films`, `developers`, `combinations`, and `stats` proxy endpoints are now edge-cached (`s-maxage=300`, `stale-while-revalidate=600`) instead of a browser-only `max-age`, so repeat and cold requests are served from Vercel's edge instead of hitting Supabase directly.

### Documentation

- Corrected README/API.md inaccuracies around the TypeScript toolchain, API auth credential, an unimplemented offline claim, and `.env` framing, and documented the previously-undocumented `/stats` endpoint.
- Added `robots.txt` and `sitemap.xml` covering the ten indexable routes ahead of launch.

## [2026.07.04]

### Changed

- Renamed the home page's "Calculators" section heading to "Tools", and removed the "Coming soon" strip (Docs / Infobase) that sat below the tool grid. The now-unused `data-coming-soon` darkroom-theme CSS guards were dropped as well.
- Reworded the non-standard temperature warning in the development recipes / recipe detail view to read "Raise/Lower your chemistry (developer, stop, and fixer) **temperature** to … before starting development" for clarity.
- Faster initial render (First Contentful Paint): the app now paints a lightweight inline shell (a centered spinner) straight from `index.html`, so first paint is no longer gated on downloading and executing the full JavaScript entry bundle — React swaps the shell out on mount. In addition, `@dorkroom/ui` and `@dorkroom/logic` are now marked side-effect-free (`"sideEffects": false`) so the bundler can tree-shake the shared barrel; form, table, and virtualization code no longer lands in the initial critical-path chunk on routes that don't use it. Together these cut the eager critical-path JS by roughly 30% and decouple first paint from bundle execution, without any layout shift (CLS stays 0).

## [2026.07.03]

### Added

- The public API (`api.dorkroom.art`) now supports optional per-client rate limiting via an `X-Client-Id` request header: in addition to the shared API key's own limit, a valid client id gets its own 60 req/min budget (plus a 240 req/min per-IP ceiling to bound id-rotation abuse). Requests without the header are unaffected. This lets a single shared key (e.g. the iOS app's embedded free-tier key) be rate-limited per install instead of globally across every user. See `api/CLAUDE.md` for the new `UNKEY_CLIENT_NAMESPACE` env var and header semantics.
- Ported the print-resize **aspect preview** from the iOS app to the web resize calculator. In Print Size mode, the results column now shows a to-scale diagram overlaying the target print (filled teal) and the original print (dashed outline), scaled by a shared factor so their proportions are directly comparable, plus a legend with each aspect ratio. The pure preview geometry now lives in `@dorkroom/logic` (`computePreviewRects`) and is shared by both the web (`@dorkroom/ui`'s `AspectPreview`) and native renderers, removing the duplicated copy that previously lived inside the mobile app.

### Changed

- The resize calculator now defaults to **landscape** print sizes — original 6×4 (was 4×6) and target 9×6 (was 6×9) — matching the more common enlarging orientation. Applies to new sessions; existing saved inputs are untouched.
- Development Recipes filtering/sorting is markedly faster: the shared recipes hook (`@dorkroom/logic`) now uses O(1) indexed film/developer lookups and computes each row's sort key once instead of per comparison, memoizes the dilution/ISO/tag option lists, and drops hot-path console logging. Name sorting now compares case-insensitively by code point instead of `localeCompare` (identical ordering for the catalog's ASCII names). A punctuation-insensitive `matchesSearchQuery` helper is also exported for list filtering ("tri x" matches "Tri-X").

### Fixed

- Moved the `key` prop after the `{...spread}` in the home page's tool grid and the mat calculator's guide-bar cards, so a `key` field inside the spread object can no longer silently overwrite the explicit key and break React's list reconciliation.

## [2026.06.26]

### Fixed

- Eliminated scroll lag on calculator and list pages by replacing the full-screen `background-attachment: fixed` page gradient with a dedicated `position: fixed` background layer. A fixed-attachment background can't be cached as a compositor layer, so the browser re-rasterized the entire viewport gradient + noise on every scroll frame (a cost that scales with screen size — worst on large/Retina displays); the dedicated fixed layer keeps the same viewport-pinned look but paints once and just composites, dropping per-frame scroll raster to zero. This was the dominant scroll-jank source on body-scroll pages.
- Restored the `backdrop-filter` blur on the sticky header and navigation pill. With the background re-raster fixed, the blur no longer carries meaningful scroll cost — the earlier removal addressed a symptom of the background issue rather than the blur itself. (`backdrop-blur` remains off the mobile menu button, calculator stat cards, development-recipe and film filter panels, and the border-calculator panels/overlay.)
- Reduced overdraw in the border-calculator preview: the blade elements no longer extend ±1000px beyond the clipped preview area (pure wasted paint), trimming per-frame paint cost during slider interaction.

### Changed

- The card film-grain texture now blends against each card's own surface color via `background-blend-mode` instead of `mix-blend-mode`. mix-blend samples the live page backdrop (re-blending every scroll frame); the new approach composites the layer once and just translates it during scroll — same soft-light look, no scroll cost.

## [2026.06.23]

### Changed

- Extracted the mat, lens, and camera-exposure calculator logic out of their page components into reusable `@dorkroom/logic` hooks (`useMatCalculator`, `useLensCalculator`, `useCameraExposureCalculator`). The hooks own their input state, localStorage persistence, and derived results, so the pages are now presentation-only. No user-facing behavior change

### Fixed

- The camera exposure calculator's "Equivalent exposures" table now rounds each computed shutter speed to the nearest real shutter-dial setting (e.g. 1/512s → 1/500s) instead of showing arbitrary mechanical values like 1/8359s, so every row is a speed a film camera can actually be set to

### Removed

- The unused `lensCalculatorSchema` and `cameraExposureCalculatorSchema` form schemas (and their orphaned `@dorkroom/logic` Zod validators), superseded by the validity checks inside the new calculator hooks

## [2026.06.13]

### Added

- The Fumadocs documentation site is now served at `dorkroom.art/docs` (same origin as the app) via Vercel Microfrontends. The docs project (`dorkroom-docs`) is a child app that owns `/docs/*`, plus its supporting paths `/api/search` (Fumadocs search), `/og/docs/*` (social images), and `/llms-full.txt`; the SPA remains the default app. Routing lives in `apps/dorkroom/microfrontends.json`, and the `@vercel/microfrontends` Vite plugin scopes the default app's assets under the group. The plugin is build-only (skipped under Vitest)

### Changed

- The `Docs` nav entry (desktop dropdown and mobile sidebar) now performs a full-document navigation instead of client-side routing, so the edge can route `/docs` to the docs microfrontend instead of the SPA rendering a not-found page

### Removed

- The placeholder SPA `/docs` route (`apps/dorkroom/src/routes/docs.tsx`) — `/docs` is now served by the docs app at the edge

## [2026.06.12]

### Added

- Fraunces display typeface (`@fontsource-variable/fraunces`) for the "Dorkroom.art" hero wordmark and the nav title, exposed via a new `--font-family-display` theme token
- Two off-center setups in the home-page border-calculator preview (6×6 shifted, 4×5 shifted), demonstrating asymmetric easel-blade positioning via the same `bordersFromGaps`/`bladeReadings` helpers the calculator uses (offsets are 0.125″ multiples, so blade readings stay on the quarter-inch grid). Preview transitions tightened: morph `1000ms → 700ms`, dwell `5000ms → 4000ms`

### Changed

- Dark-theme home backdrop is now a "darkroom safelight": warm red/peach light bleeding from the edges into near-black (`#070708`) with a fine SVG film-grain overlay
- Border-calculator paper/print/blade colors retuned for the dark theme — muted grey paper (`#6a6868`), darker print area (`#353535`), near-black easel blades (`#1b1b1d`)
- Hero "Dorkroom.art" wordmark restyled: white grain fill with a grainy red glow behind the letters, set in Fraunces at a larger scale. Theme-aware — dark grain + soft warm glow on light, solid two-tone (no grain/glow) on darkroom and high-contrast. Nav "Dorkroom" now uses Fraunces as well

### Fixed

- Mobile Safari: opening the floating navigation menu no longer leaves a frozen background-colored block over the bottom (and top) of the page that persisted until reload. The menu's backdrop and drawer now unmount when closed (via a new `usePresence` hook, extracted with the FAB into a `MobileNav` component) so iOS WebKit can't retain a stale composited tile behind the dynamic toolbar. The `theme-color` meta now tracks the active theme, so the status-bar/toolbar bands match the page background instead of a hardcoded near-black
- Darkroom theme: the home hero box renders as plain black (film-grain texture removed), and the stray red stroke framing the border-calculator preview (and its caption) is gone in both darkroom and high-contrast — it came from the `main a[href*="/border"]` button-border rule catching the preview link. The primary "Calculate darkroom easel borders" CTA icon is now black instead of blending into the red button
- Homepage Screenshot CI workflow: the capture script waited on a `.hero-card` element that the home-UX refresh removed, timing out on every run — updated to the current `.hero-grain` hero panel
- Home border-calculator preview no longer shifts vertically as it cycles setups: the caption shared a flex row with the "Border calculator" link, leaving the variable-length `{label} on 8×10 paper · blades at {readout}` text only ~250px, so shorter setups sat on one line while longer ones wrapped to two (a ~16px jump every cycle). The caption now takes its own full-width line with `truncate`, locking its height to a single line for every setup (the longest, 254px, still fits the 263px `md` column without clipping)
- Home stats line no longer orphans "23 developers" onto a second line on mobile: the `1,020 development recipes · 165 film stocks · 23 developers` row now stacks one stat per line (bullets hidden) below `sm`, reverting to the inline bulleted row from `sm` up

## [2026.06.11]

### Added

- Legacy-browser support for the app via `@vitejs/plugin-legacy`, targeted at the Kindle Experimental Browser (WebKit ~2009 / Safari 4–5 era, ES5-only, no native `Promise`). The plugin emits a second `nomodule` bundle fully down-levelled to ES5 with core-js + `regenerator-runtime` polyfills, loaded via SystemJS. Modern browsers are unaffected: they load the same oxc-minified ES-module bundle as before and never request the `nomodule` chunks (the modern `build.minify: 'oxc'` config is preserved; only the separate legacy chunks use terser). The legacy `targets` use an `ie >= 11` floor specifically to force full ES5 transpilation — the original `['defaults', 'not IE 11']` left arrow functions, `const`/`let`, optional chaining, and `Promise` usage in the "legacy" bundle, which the Kindle engine cannot parse
- `bun run verify:legacy` and `scripts/verify-legacy-build.ts`: a headless-Chromium check (Playwright) that builds the app and asserts both paths — the modern context loads only the modern `index-*.js` module bundle and requests no legacy/polyfill chunk (modern-regression guard), and a forced-`nomodule` context boots the ES5 bundle via SystemJS and renders the app with no console/page errors

### Changed

- Coordinated TanStack Store/Form bump: upgraded `@tanstack/react-store` `^0.8.0` → `^0.11.0` and `@tanstack/react-form` `^1.27.7` → `^1.33.0` together so a single `@tanstack/store@0.11.0` resolves across both. The standalone Dependabot bump of `@tanstack/react-store` to 0.11 (PR #89) did not compile: 0.11 ships a newer `@tanstack/store` whose `Store`/`Derived` interface requires a `get()` method, while the older `@tanstack/react-form` pinned an older `@tanstack/store` whose `Derived` (e.g. `form.store`) lacked it — two incompatible `@tanstack/store` interfaces typed `useStore(form.store, selector)` state as `unknown` and produced ~40 build errors in the border-calculator components. `react-form@1.33.0` depends on `react-store@^0.11.0` and `form-core@1.33.0` (`@tanstack/store@^0.11.0`), so the coordinated bump resolves a single compatible store with no `overrides` and no consuming-code changes
- Restored React Doctor health to 100/100 across all projects: replaced barrel-file imports with direct module imports in `film-filters-panel` (`../filters/*`) and `film-detail-panel` (`../detail-panel/detail-panel`) for better tree-shaking, and suppressed the `no-barrel-import` finding in `@dorkroom/api`'s `index.test.ts` (the barrel re-export is that suite's subject under test)
- Bumped the TypeScript 7 native preview (`tsgo`) compiler from `7.0.0-dev.20260421.2` to `7.0.0-dev.20260604.1` (the typecheck/build toolchain). Chose a snapshot ≥7 days old so it clears the `bunfig.toml` `minimumReleaseAge` soak gate; full gate (typecheck + build + test) passes clean. Stable TypeScript 7 has not shipped yet, so the preview pin remains

### Fixed

- Print Resize Calculator (`/resize`) crashed on load with `useMeasurementConverter is not defined`: the hook was imported as `type`-only but called at runtime, so the import was erased from the compiled page. Made it a value import

## [2026.05.28]

### Added

- Mat Cut Calculator (`/mat`): plan single-window mats with independent borders, get exact window openings, best-fit borders for artwork, and mat cutter guide-bar settings
- Fraction-aware inputs that accept decimals or fractions and step by 1/16" via arrow keys or tap steppers (mobile-friendly)
- To-scale mat layout diagram with dimensioned borders, window, and artwork footprint
- Tests for the mat calculator logic, the fraction input field, and the page

### Changed

- Upgraded the build/test toolchain to latest stable (>7-day-old) releases: Vite 8.0.14 (Rolldown/Oxc bundler), Vitest 4.1.7 (with `@vitest/ui` and `@vitest/coverage-v8`), jsdom 29.1.1, `@vitejs/plugin-react` 6.0.2, Tailwind CSS 4.3.0, `@babel/core` 7.29.0, `turbo-ignore` 2.9.14, and `@types/jsdom` 28.0.3
- Adopted the TypeScript 7 beta (`@typescript/native-preview`, the native `tsgo` compiler) for package typecheck and build — ~3.5× faster full-repo typecheck. TS 7 removed `baseUrl`, so `tsconfig.base.json` now uses relative path mappings; the `typescript` package is retained for editor/Vite/Vitest type services
- Switched the test DOM environment from jsdom to happy-dom 20.9.0 — ~30% faster full suite (jsdom 29 environment init was the bottleneck; pool/isolation tuning had no effect). jsdom is retained for two logic tests that construct `JSDOM` directly
- Migrated console/debugger stripping from the removed `esbuild.drop` option to Rolldown's `build.rollupOptions.output.minify.compress` options (Vite 8)
- Moved `pool`/`reporters` to the root Vitest config (now root-only in Vitest 4) and renamed the deprecated `TanStackRouterVite` plugin import to `tanstackRouter`

### Fixed

- Film database page (and any page with a text input) failing to load in the dev server after the Vite 7.3.2 bump — a dev-only regression in Vite's bundled `postcss-modules` loader; converted the lone CSS module to Tailwind classes to remove the affected code path
- "Failed to fetch dynamically imported module" errors after a deploy — added a `vite:preloadError` handler that reloads once to pick up the current chunk hashes, plus `Cache-Control` headers in `vercel.json` (immutable for hashed `/assets/*`, revalidate-always for the HTML shell) so returning visitors get current chunk references

### Security

- Bumped Vite to 7.3.2 to resolve three dev-server advisories (GHSA-p9ff-h696-f583, GHSA-v2wj-q39q-566r, GHSA-4w7w-66w2-5vf9); added a `vite` override to dedupe the transitive test-only copy (subsequently bumped to Vite 8.0.14, see Changed)
- Added a `bunfig.toml` `install.minimumReleaseAge` gate (7 days) so Bun refuses npm versions published in the last week, reducing exposure to freshly-published malicious releases

## [2026.03.27]

### Added

- Film alias resolver for mapping legacy slugs to current films with O(1) lookups
- Rebrand tracking: films now display their base/OEM film in the detail panel
- Stats API endpoint for database counts (films, developers, combinations)
- Input sanitization (`sanitizeSlug`, `sanitizeQuery`) on Vercel edge functions
- Planning doc for server-side recipe filtering (`docs/planning/server-side-recipe-filtering.md`)

### Changed

- Film search now normalizes punctuation and tightens matching for better results
- Removed dead `fuzzy` parameter branches from edge functions
- Overrode Supabase default 1000-row limit on combinations endpoint
- Development recipe hook uses alias-aware slug resolution for film lookups

### Fixed

- Removed fragile slug-to-title formatting from film cards (rebrand info shown only in detail panel where proper film data is available)
- Added dev-mode warning for alias conflicts in `buildFilmSlugIndex`
- Removed redundant `fetchStats` export from API client

## [2026.02.27]

### Added

- Dynamic OG images for shared border calculator presets showing preset name, paper size, and print area
- Border preset sharing URLs now use query params (`?preset=`) instead of URL hash for bot/crawler visibility
- Per-route accent colors for OG social preview images (green, cyan, coral, lime, purple)
- Developer-only OG card variant showing developer name and dilution pills
- Film + developer search OG card variant (clean title + subtitle, no recipe details)
- Specific recipe OG card with full detail pills (time, temp, ISO, push/pull)
- Dynamic metadata for developer-only URLs (`/development?developer=slug`)
- Public API docs endpoint at `api.dorkroom.art/` via `api/docs.ts`
- Shared API utilities: `utils/withHandler.ts` and `utils/timeoutSignal.ts`
- Unkey integration for API key verification (`X-API-Key`) and anonymous rate limiting
- New environment variables for Unkey (`UNKEY_ROOT_KEY`, `UNKEY_API_ID`)
- Programmatic Unkey key tier management CLI (`bun run keys:create`, `bun run keys:tier`)
- Programmatic anonymous namespace bootstrap/check CLI (`bun run keys:anon-bootstrap`) using `UNKEY_ROOT_KEY`

### Changed

- Redesigned OG image layout: accent-colored icon circles with glow, colored category labels with divider bars, tinted detail pills, subtler site name
- OG dilution display now uses `name` field with `ratio` fallback (fixes blank pills for developers with null ratios)
- Refactored API handlers (`films`, `developers`, `combinations`, `filmdev`) to use shared wrapper logic
- Updated CORS allow headers to include `X-API-Key`
- Added host-based Vercel route to serve docs on `api.dorkroom.art`
- Bumped CalVer package versions to `2026.02.27`
- Anonymous rate-limit handling now degrades gracefully if namespace auto-create permission is missing
- Hardened host detection for auth mode selection and added required key permission verification (`UNKEY_API_KEY_PERMISSION`)
- Hardened API wrapper security: exact host allowlisting, safer client IP extraction, production fail-closed on Unkey anonymous rate-limit permission misconfiguration, and removed internal/upstream error detail leakage in responses
- Added `Vary: Host, X-API-Key` and disabled caching for keyed public API responses to prevent cross-request cache replay on `api.dorkroom.art`
- Unkey key-creation CLI now defaults key prefixes by tier (`free -> dk_f_`, `standard -> dk_s_`, `partner -> dk_e_`)

## [2026.02.14]

### Added

- Camera Exposure Calculator with EV calculation, equivalent exposures, and exposure comparison
- Lens Equivalency Calculator for comparing focal lengths across formats
- Right-side sidebar for mobile navigation

### Changed

- Improved responsive layouts across all calculator pages
- Updated postcard paper size to 3 7/8 x 5 7/8 in
- Concise CLAUDE.md documentation replacing verbose version

### Fixed

- Resize calculator mobile overflow
- Resize calculator now properly switches modes and allows for input number changes
- Card badge alignment and tooltip accessibility
- Console/debugger stripping restored for production builds
- Resolved 150+ lint warnings across the codebase

### Removed

- E2E tests, Playwright, and Chromatic (simplified CI pipeline)

## [2025.12.23]

### Added

- Film Database page with search, filtering, and detail panels
- Volume mixer and temperature warnings in recipe details
- Push/pull calculations and display in recipe components
- FilmDev.org import with push/pull detection and source tracking
- URL sync for selected recipes
- Confirmation modal for recipe deletes
- CI optimizations: caching, path filtering, deploy skip for docs-only changes
- Enhanced SEO metadata across all routes
- Navigation tooltips and new links
- Open source collaboration files (Code of Conduct, Security Policy, PR templates)

### Changed

- Migrated from Nx to Turborepo
- Migrated from ESLint/Prettier to Biome for linting and formatting
- Extracted reusable calculator components and split oversized hooks
- Renamed warning components to alert components
- Enhanced Dorkroom API client and documentation

## [2025.11.25]

### Added

- Split-grade printing calculator with filter factor compensation toggle

### Changed

- Upgraded React to 19.2.0

## [2025.11.20]

### Added

- Virtual scrolling for development recipes (TanStack Virtual v3)
- Persistent sidebar for recipe filtering

### Changed

- Modularized development recipes page into smaller components
- Extracted reusable hooks (useRecipeActions, useIsMobile)
- Lazy-loaded React Query Devtools in development

## [2025.11.18]

### Added

- "Even borders" aspect ratio option in border calculator
- Quarter-inch rounding in border calculator
- Redesigned homepage layout with stat cards

### Changed

- Migrated theme context and border calculator components to @dorkroom/ui
- Split documentation into package-specific CLAUDE.md files

## [2025.11.17]

### Added

- TanStack Router v1 with file-based routing
- TanStack Form v1 integration across all calculators
- Form state persistence and hydration via localStorage
- Animation settings in theme/settings
- Favorites animation in development recipes
- Vercel Analytics integration
- Comprehensive test suites for border calculator

### Changed

- Complete migration to TanStack ecosystem (Query v5, Router v1, Form v1, Table v8)

## [2025.11.04]

### Added

- Imperial/metric measurement conversion system
- Unit switching for all calculator inputs including enlarger height

### Fixed

- Floating point precision in metric conversions
- Input handling during decimal entry

## [2025.10.16]

### Added

- Interactive reciprocity chart with hover tooltips and wide view
- Time formatting utilities
- Auto-scroll and performance optimizations for chart

## [2025.09.26]

### Added

- AGPL-3.0 license
- Multiple themes: dark, light, darkroom (red), high contrast (black/white)
- Favorites functionality for development recipes
- Toast notifications
- Accessibility improvements with ARIA attributes
- CI/CD pipeline with GitHub Actions

### Changed

- Code splitting and performance optimizations

## [2025.09.22]

### Added

- Initial release of Dorkroom
- Border Calculator with blade readings and animated preview
- Reciprocity Calculator for long exposure correction
- Resize Calculator for scaling prints
- Stops Calculator for exposure stop conversion
- Development Recipes page with Supabase API integration
- FilmDev.org recipe import
- Mobile navigation with drawer component
- Responsive design for all calculators
- @dorkroom/api TypeScript client package
- REST API endpoints: `/api/films`, `/api/developers`, `/api/combinations`
- Monorepo architecture with shared packages (ui, logic, api)

### Technical

- React 19 with TypeScript
- Tailwind CSS with custom darkroom theme
- Vite build tooling
- Supabase backend
- Vercel deployment

---

[2026.02.27]: https://github.com/narrowstacks/dorkroom/compare/8eaf60c...HEAD
[2026.02.14]: https://github.com/narrowstacks/dorkroom/compare/c7b30ce...8eaf60c
[2025.12.23]: https://github.com/narrowstacks/dorkroom/compare/c7b30ce...8eaf60c
[2025.11.25]: https://github.com/narrowstacks/dorkroom/compare/668cb15...c7b30ce
[2025.11.20]: https://github.com/narrowstacks/dorkroom/compare/373246c...668cb15
[2025.11.18]: https://github.com/narrowstacks/dorkroom/compare/4369ceb...373246c
[2025.11.17]: https://github.com/narrowstacks/dorkroom/compare/dab2258...4369ceb
[2025.11.04]: https://github.com/narrowstacks/dorkroom/compare/4cea721...dab2258
[2025.10.16]: https://github.com/narrowstacks/dorkroom/compare/e21f61d...4cea721
[2025.09.26]: https://github.com/narrowstacks/dorkroom/compare/458cb60...e21f61d
[2025.09.22]: https://github.com/narrowstacks/dorkroom/compare/e824485...458cb60
