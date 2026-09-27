# Frost UI SelectMenu 4 migration proposal

Status: sections 1 (package and tooling), 2 (build migration), 3 (component architecture and behavior), 4 (styles and Sass), and 5 (testing infrastructure) complete. Section 6 workflows are implemented; hosted CI/Codecov and npm trusted-publisher verification remain pending. Section 7 (README/demos) and final release verification remain pending.

Reviewed: 2026-09-27. Proposed release: `@fr0st/ui-selectmenu@4.0.0`, from `3.1.9`.

## Objective and reference order

Migrate SelectMenu to Frost UI 4 and fQuery 5, preserving its single/multiple selection, search, grouped data, asynchronous results, custom rendering, and public component API. Align the package, component architecture, styles, documentation, demos, tests, and automation with the current sibling projects.

Use these references in order:

1. `../ui`: component lifecycle, `BaseComponent`, Popper, CSS/Sass conventions, tooling, browser support, and CI.
2. `../ui-authcodeinput`: form integration, restoration on disposal, private fields, JSDoc, standalone component packaging, and browser test structure.
3. `../ui-sortable`: standalone ESM/UMD builds, test infrastructure, coverage, CI, README, and demo presentation.
4. `../fquery`: actual DOM, traversal, event, animation, and utility contracts. Consult `../component`, `../state`, `../datetime`, and `../color` for specific patterns when necessary; they are not proposed new dependencies.

Local source files are the alignment baseline. Registry versions were checked separately with `npm view <package> version engines --json`; a sibling manifest is not assumed to contain the latest published patch.

## Progress tracker

Tracker numbers now match the numbered sections below. The original tracker incorrectly called testing phase 3 while the body placed it in section 5; testing infrastructure was started under that mismatch and finished first at the user's direction. Component refactoring is tracked under section 3; styles remain section 4.

Mark a section complete only after its acceptance criteria pass. Add newly discovered defects to the issue register below and record the relevant test when resolved.

| Section | Status | Deliverable / acceptance criteria |
| --- | --- | --- |
| 0. Inventory and proposal | Complete | Existing source, styles, packaging, demos, and reference patterns reviewed; dependency versions checked; initial issues recorded. |
| 1. Package and tooling | Complete | `.npmrc`, `.gitignore`, major version, metadata, exports, scripts, lint configuration, and lockfile updated; `npx sort-package-json` and clean `npm ci` passed. See phase 1 validation below. |
| 2. Build migration | Complete | Vite produces ESM and UMD, expanded/minified CSS, and source maps; packed bundle loading and UI global extension passed Chromium smoke checks. |
| 3. Component migration and fixes | Complete | Private class implementation, UI 4 lifecycle, documented API, preserved form behavior, and regression tests pass. |
| 4. Styles and Sass | Complete | Sass modules, UI 4 input markup/tokens, logical properties, and component styling checks pass. |
| 5. Test infrastructure | Complete | Local test server, shared fixture, Chromium/Firefox/WebKit smoke checks, and source coverage pass. Behavioral/style tests accompany sections 3–4; see their validation records and the local startup limitation below. |
| 6. CI and Codecov | Implemented; hosted verification pending | Reference CI/release workflows, OIDC coverage upload, tracked bundle freshness, and package validation configured and locally checked. Codecov activation/upload and npm trusted-publisher verification remain outstanding. |
| 7. README and demos | Pending | Installation/API/migration documentation and consolidated UI-style demo are complete and verified. |
| 8. Release verification | Pending | Clean install, lint, builds, all browser projects, coverage, packaging, and documentation examples verified; outstanding issues recorded. |

## 1. Package and tooling

### Dependency targets

These are the published versions observed on the review date. Recheck before implementation and apply the release-age policy when generating the lockfile.

| Package | Reference version/range | Proposed version/range | Placement / note |
| --- | --- | --- | --- |
| `@fr0st/ui` | `^4.0.0` | `^4.0.0` | Peer and development dependency. |
| `@fr0st/query` | `^5.0.0` | `^5.0.0` | Peer and development dependency. |
| `@fr0st/eslint-config` | `^5.0.3` | `^5.0.3` | Development dependency. |
| `@fr0st/stylelint-config` | `^4.0.2` | `^4.0.2` | Development dependency; SelectMenu owns Sass. |
| `@playwright/test` | `^1.63.0` | `^1.63.0` | Development dependency. |
| `vite` | `^8.3.0` | `^8.3.0` | Locked to 8.3.0; latest 8.3.1 is excluded by the three-day release-age policy at implementation time. |
| `eslint` | `^10.10.0` | `^10.11.0` | Latest observed patch. |
| `monocart-reporter` | `^2.13.1` | `^2.13.1` | Browser source coverage. |
| `sass-embedded` | `^1.104.1` | `^1.105.0` | Replaces `sass`, matching UI's compiler choice. |
| `stylelint` | `^17.15.0` | `^17.15.0` | Development dependency. |
| `autoprefixer` | `^10.6.1` | `^10.6.1` | Development dependency. |
| `postcss` | `^8.5.28` | `^8.5.28` | Development dependency. |
| `postcss-cli` | `^11.0.1` | `^11.0.1` initially | Latest is `12.0.0`, which requires Node `>=22`; see compatibility decision below. |
| `clean-css-cli` | `^5.6.3` | `^5.6.3` | Development dependency. |
| `find-unused-sass-variables` | `^6.2.1` | `^6.2.1` | Development dependency. |

Remove direct `rollup`, `@rollup/plugin-node-resolve`, `terser`, and `sass` dependencies after replacing their scripts. Vite handles JavaScript bundling and minification; CSS retains UI's Sass → PostCSS → clean-css pipeline.

**Compatibility decision:** recommend retaining UI's engines, `^20.19.0 || ^22.13.0 || >=24`, and PostCSS CLI 11 for this migration. Adopting CLI 12 would require dropping Node 20 from the development/CI baseline, diverging from all three primary references. This is an explicit latest-compatible exception, not a claim that CLI 11 is the newest release. `sort-package-json@4.0.0` also requires Node `>=22`; run the requested `npx sort-package-json` under Node 24 as a maintenance command, outside the Node 20 test matrix.

- [x] Bump the package to `4.0.0`; improve description and keywords and align author, public publishing metadata, and field ordering.
- [x] Add peers and matching development dependencies for the planned builds/tests and shared UI/fQuery instances.
- [x] Point `main`, `module`, and root `exports` at `./dist/frost-ui-selectmenu.esm.js`; export `./dist/*` and `./src/*` like the references. ESM artifacts will be generated in phase 2.
- [x] Point `jsdelivr` and `unpkg` at `./dist/frost-ui-selectmenu.min.js`; retain `dist`, `src`, `LICENSE`, and `README.md` in published files.
- [x] Adopt `browserslist: ["baseline newly available"]`. Vite's build target belongs to phase 2.
- [x] Add `.npmrc` with `min-release-age=3` and exemptions for `@fr0st/eslint-config`, `@fr0st/stylelint-config`, `@fr0st/core`, `@fr0st/query`, and `@fr0st/ui`.
- [x] Expand `.gitignore` into the references' dependency, temporary, and test-output sections: `node_modules/`, `.tmp/`, `coverage/`, `playwright-report/`, and `test-results/`. Keep `dist/` and `package-lock.json` tracked.
- [x] Update ESLint to the shared base/browser/node configs, explicit browser test globals, and generated-output ignores. Retain the shared Stylelint config and document the PostCSS callback with JSDoc.
- [x] Run `npx sort-package-json` after manifest edits; regenerate the tracked lockfile and verify `npm ci`.

Use UI's script names: `build`, `build:js`, `build:css`, `compile:css`, `autoprefix:css`, `minify:css`, `lint`, `lint:js`, `lint:css`, `lint:sass:unused`, and the reference `test`, `test:browser`, `test:coverage`, `test:headed`, `test:ui` commands. `test` builds first; the other test commands consume the existing build.

The proposed repository identity is `frost-js/ui-selectmenu`, consistent with the sibling projects. An unauthenticated check on 2026-09-27 returned HTTP 404 for that URL. Phase 1 retains the existing `elusivecodes/FrostUI-SelectMenu` package links, normalizes the repository URL to `git+https`, and leaves the Git remote unchanged. Revisit the links when the target repository is available; a repository transfer is outside this migration.

### Phase 1 implementation and validation — 2026-09-27

- Updated the package to 4.0.0, added runtime peers/development copies and future ESM exports, adopted UI's scripts and Node/browser declarations, and replaced the direct Rollup/Terser/Sass dependencies with Vite/Sass Embedded.
- Added `.npmrc`, expanded `.gitignore`, updated ESLint configuration, and documented the PostCSS callback. The existing Stylelint configuration already matches UI and needed no edit.
- Rechecked registry versions. Kept PostCSS CLI 11 for Node 20 compatibility. Vite 8.3.1 was published at `2026-09-24T12:26:19.940Z` and was not yet three days old, so the range starts at 8.3.0 and the lockfile resolves 8.3.0. No release-age exemption was added for Vite.
- Regenerated the lockfile from the manifest in a clean temporary directory after npm's in-place resolver hit the old Stylelint peer tree. Used normal peer resolution, with neither `--force` nor `--legacy-peer-deps`. This also fixes the old lockfile's 3.1.8 version mismatch with the previous 3.1.9 manifest.
- `npx sort-package-json`: passed on Node 24.21.0; rerun after the final manifest edit confirmed the file was already sorted.
- `npm ci`: passed using npm 11.19.0, installing 379 packages; npm audit reported zero vulnerabilities. Manifest/lockfile names, versions, engines, peers, and development ranges match.
- ESLint on `eslint.config.js`, `postcss.config.js`, and `stylelint.config.js`: passed. Full JavaScript lint runs correctly but reports **48 existing source errors**, principally JSDoc/import-order issues and the undefined `tag` in B01. Fix these in section 3; do not weaken the shared rules.
- `npm run lint:css` and `npm run lint:sass:unused`: passed (33 Sass variables, none unused).
- Vite, Playwright, and Sass executable checks passed. Compiling the current Sass with the established `sass ...` command, running PostCSS/autoprefixer, and minifying with clean-css into `/tmp` all passed. Sass reports the known `@import` deprecation scheduled for section 4.
- The 1.105.0 Sass dependency tree includes optional fallback `sass` packages; this clean install pointed `node_modules/.bin/sass` at `sass/sass.js`. Keep UI's established `sass ...` command and `sass-embedded` dependency. Record this installation detail without introducing a custom executable path or packaging workaround.
- `npm ls --depth=0` exits successfully with all direct dependencies present, but labels the fallback `sass`, `@parcel/watcher`, its Linux binary, and `node-addon-api` as extraneous on this platform. npm also warns about the fallback watcher's unapproved build script and deprecated `glob`/`inflight` beneath `clean-css-cli`. No blanket install-script approval or transitive override was added; the intended CSS pipeline passes without them.
- At the end of phase 1, whitespace and configuration syntax checks passed; application source, demos, generated `dist/` files, and the Rollup config were unchanged. Full build, browser tests, and package-consumption checks were still pending. Subsequent validation is recorded in sections 2 and 5; the package remains **not release-ready** until the UI 4-compatible source and behavioral tests are complete.

## 2. Vite and distribution

Retain `src/js/` and `src/scss/`, following UI's mixed JavaScript/Sass layout. The JavaScript-only siblings' flat `src/` layout is not necessary here.

- [x] Replace `rollup.config.js` with `vite.config.js`, following the standalone components' ESM/default and UMD modes, using Vite 8's `build.rolldownOptions` and `baseline-widely-available` target.
- [x] Keep `src/js/index.js` as the default ESM export and registration entry; rename `src/js/wrapper.js` to `src/js/browser.js` and export the named `SelectMenu` for UMD.
- [x] Externalize `@fr0st/query` and `@fr0st/ui` in both modes. UMD uses `fQuery` and `UI` globals, `name: 'UI'`, and `extend: true`.
- [x] Build JavaScript before CSS. Clean `dist/` on the first ESM build and preserve it on the UMD build, so all artifacts survive a full build.
- [x] Generate `frost-ui-selectmenu.esm.js`, `.esm.min.js`, `.js`, and `.min.js`, all with source maps; retain `.css` and `.min.css` with maps.
- [x] Verify ESM import/registration and UMD global extension independently, including minified entry points. Confirm loading SelectMenu leaves existing UI components intact and uses the same fQuery instance.
- [x] Verify package root/subpath resolution and `npm pack --dry-run`; do not bundle UI/fQuery into a second standalone dependency bundle.

Vite's [build configuration](https://vite.dev/config/build-options) and [migration guide](https://vite.dev/guide/migration) support the current Rolldown configuration. The sibling Vite files remain the concrete implementation templates.

### Phase 2 implementation and validation — 2026-09-27

- Committed phase 1 as `3d51740` (`Prepare SelectMenu 4 package and tooling`) before starting the build migration.
- Added `vite.config.js` matching Sortable's configuration exactly after substituting the component name and `src/js/` entry paths. Removed `rollup.config.js` and renamed the unchanged named-export wrapper to `src/js/browser.js`.
- `npm run build`: passed, producing all 12 distribution files (four JavaScript bundles, two stylesheets, and their six source maps). A second full build produced byte-identical files.
- ESLint on `vite.config.js` and `src/js/browser.js`: passed. No component implementation or Sass source edits were needed in this phase.
- `npm pack --dry-run`: passed. A real local tarball also contained the expected root ESM export, `dist/*` and `src/*` files, and renamed browser entry. Verified package-root and representative JS/CSS/Sass subpath resolution against the extracted package.
- Chromium smoke checks against the extracted tarball passed for expanded/minified ESM and UMD. Checks covered exports, inheritance from the installed UI base class, fQuery registration, preservation of the existing UMD UI/fQuery globals and Modal component, CSS loading, and absence of page errors. Chromium required execution outside the filesystem sandbox; section 5 test infrastructure had not been added yet.
- JavaScript source maps include component source and exclude bundled dependency source; JavaScript/CSS maps embed source content. Build files retain external UI/fQuery references.
- Generated CSS drops obsolete vendor prefixes under the phase 1 Browserslist target. The known Sass `@import` deprecation remains for section 4; no new component defects were identified by these packaging checks.
- Validation is limited to building, packaging, registration, and loading. The existing `_node`/`_options` incompatibility (M01), source lint issues, and behavior bugs remain for section 3; passing these smoke checks does not establish that SelectMenu can yet be instantiated against UI 4. The full cross-browser behavioral suite remains pending.

## 3. Component architecture and behavior

Target source layout:

```text
src/js/
  browser.js       # named UMD export
  index.js         # initComponent registration and default export
  select-menu.js   # class, defaults/classes, private state and methods
  helpers.js      # only stateless helpers that benefit from extraction
src/scss/
  selectmenu.scss
  _vars.scss
```

- [x] Move `SelectMenu.defaults` and `SelectMenu.classes` into static class fields, following UI and AuthCodeInput.
- [x] Replace SelectMenu's `_...` state and instance helpers with declared `#...` fields/methods. Access inherited state through `this.node` and `this.options`; UI 4 no longer exposes `_node` and `_options`.
- [x] Remove `src/js/prototype/` and all runtime prototype composition. Extract only stateless functions with explicit inputs; keep stateful rendering/data/event logic in the class.
- [x] Keep `initComponent('selectmenu', SelectMenu)` and default export in the entry module. Preserve `.init()` reuse, registration cleanup, and the fQuery plugin's first-result behavior.
- [x] Add JSDoc types for options, language strings, item/group data, values, result responses, render/match/sort callbacks, and `getResults` search/value requests. Use `@augments {BaseComponent<SelectMenuOptions>}`, `@returns`, and `@inheritdoc` consistently.
- [x] Audit every fQuery call against v5, particularly array-returning traversal, DOM creation, delegated events, sanitization, debounce/throttle, and animation cleanup.
- [x] Align opening/closing with UI's transition lifecycle and reduced-motion styling. Prefer CSS state classes plus `waitForTransition`; preserve the documented numeric `duration` override through component styling if feasible, and explicitly document any changed contract.
- [x] Verify Popper `reference`, container positioning, `placement`, `position`, `fixed`, `spacing`, `minContact`, and `fullWidth` under the current API, including `appendTo` and scrolling containers.
- [x] Preserve event names: `show`, `shown`, `hide`, `hidden`, and `change` under `.ui.selectmenu`; honor cancellation and disposal from event listeners.
- [x] Make request handling robust to out-of-order completion, delayed searches, pagination, rejection, synchronous throws, value loading, hiding, and disposal. Retain cancellable work where supported and ignore obsolete callbacks before mutating any state.
- [x] Preserve the native select's options/optgroups, selected/default-selected states, form association, validity, and label relationships. Synchronize native and rendered selection; handle form reset and define programmatic native-change behavior.
- [x] Restore original visibility/tabindex on disposal, preserve unrelated runtime changes, remove owned listeners/timers/Popper state, and allow safe reinitialization.
- [x] Fix the issues below with browser regressions, including accessible naming and keyboard interaction for the generated control and removal buttons.

Retain the existing public methods: `data`, `disable`, `dispose`, `enable`, `getMaxSelections`, `getPlaceholder`, `getValue`, `hide`, `setMaxSelections`, `setPlaceholder`, `setValue`, `show`, `toggle`, and `update`. Preserve option names unless a specific compatibility fix requires a documented change. Define `null` as an empty single selection and `[]` as an empty multiple selection; normalize and document supported input types rather than relying on truthiness.

Breaking changes to document for v4: UI/fQuery peer majors, supported Node/browser baselines, package root moving to compiled ESM, private internals replacing underscore access/prototype patching, renamed build scripts and browser entry, Sass module configuration, and any deliberate value/event/transition corrections. Do not claim CommonJS support merely because a UMD file exists in a `type: module` package.

### Section 3 implementation and validation — 2026-09-27

- Committed the completed testing infrastructure as `48fd5ca` (`Add Playwright testing and source coverage infrastructure`) before returning to the actual section 3.
- Replaced all six prototype modules with the private `SelectMenu` class, static defaults/classes, UI 4 `node`/`options` access, and documented options, data, requests, callbacks, and public methods. `helpers.js` contains only stateless data-copying, flattening, native-option parsing, and value-normalization helpers. Registration remains in `index.js`.
- Preserved original native options/optgroups and `defaultSelected` state. Selected remote/local data creates native options only when needed. Native `change` synchronizes the displayed selection; reset synchronizes after the browser's default action, following AuthCodeInput's timer pattern. Disposal removes owned listeners and work, preserves consumer listeners, restores original attributes, and supports reinitialization.
- Added accessible combobox naming/descriptions, correctly spelled active-descendant relationships, native buttons for removal, disabled select/fieldset synchronization, keyboard selection without form submission, and one change event per effective user selection change.
- Replaced animation calls with UI's `waitForTransition`, guarded transition generations, and a `.show` opacity state. The only Sass change in this section supplies that lifecycle transition and reduced-motion behavior. Numeric `duration` remains supported through `--ui-selectmenu-duration`; reduced motion disables it. The broader Sass/token/layout migration remains section 4.
- Separated search and selected-value request generations. Obsolete responses are ignored before parsing or updating the lookup. Debounced/throttled work and optional request `cancel()` methods are cancelled where relevant. Synchronous throws and rejected promises follow the same failure path; failed value lookups preserve the previous selection.
- Added browser regressions in the reference grouping/order across `select-menu.test.js`, `select-menu-data.test.js`, and `select-menu-form.test.js`. They cover the B01–B12 fixes, public behavior, cancellation/disposal, async ordering, debounce, grouped pagination, forms, keyboard interaction, and Popper positioning in appended/scrolling containers.
- Found an additional full-width positioning bug (B13): changing width in Popper's `afterUpdate` left placement calculated from the previous width. Set width in `beforeUpdate` instead; regressions cover all four placements and spacing.
- `npm run lint`, the final `npm run lint:js`, `npm run lint:sass:unused`, `npm run build`, and `git diff --check`: passed. The 48 inherited source lint errors are resolved without weakening the shared configuration. Regenerated all 12 distribution files.
- All **255 browser cases passed**: 85 scenarios each in Chromium, Firefox, and WebKit. The Chromium coverage run also passed all **85 cases**, without test retries.
- Source LCOV contains exactly `helpers.js`, `select-menu.js`, and runtime registration in `index.js`. Coverage is **510/528 lines (96.59%)**, **97/98 functions (98.98%)**, and **351/399 branches (87.97%)**. This meets the 95% line target configured for the later Codecov upload. Monocart's V8 line accounting reports 95.75%; its summary also counts intermediate `expect.poll` attempts as errors even though every test passed.
- Restoring pre-existing hidden state is covered even if that class is changed while the component is active; repeated disposal is safe. The full-width positioning and native-button reset regressions passed in all three browsers.
- The unchanged local server was started before each Playwright run and stopped afterward, as documented in M09. The known Sass `@import` deprecation remains for section 4; automatic server startup and hosted CI/Codecov remain for section 6. No dependency, compiler-command, or test-server workaround was introduced.

#### Section 3 value and event contracts for the README migration

- Values are strings or numbers; identity follows native select string keys, so `1` and `'1'` identify the same option. Returned values retain the data item's type. Zero, empty strings, and object-prototype names are valid option values. Duplicate keys normalize to one selection.
- `setValue` accepts a scalar, array, or `null`; a single select takes the first resolved value, while a multiple select normalizes to an array. Unknown local values are ignored; remote values are resolved with `{ value }`. Empty selections return `null` for single and `[]` for multiple. `getValue()` and `data()` return copies without internal DOM references.
- Programmatic setters, native-change synchronization, and reset remain silent. User changes, including Backspace and removal buttons, emit exactly one `change.ui.selectmenu` when the effective selection changes. Programmatic selection may preserve disabled native defaults; disabled options and controls reject user interaction.
- Original options and defaults survive selection, reset, and disposal. External native `.value`/selected changes require dispatching `change` to update the generated control. FormData and required validation use the original select.
- Search requests receive `{ offset, term? }`; pagination offsets count top-level results, including groups. Value requests receive `{ value }`. Both accept immediate results or promises, with optional `cancel()` on the returned request. The latest request of each kind wins; hiding cancels search work, while disposal cancels both kinds.
- The `duration` option now controls a CSS opacity transition, respecting reduced motion. Opening/closing may interrupt each other; superseded transitions do not emit stale `shown`/`hidden` events. Lifecycle cancellation and disposal inside listeners remain supported.

## 4. Styles and Sass

- [x] Replace `@import "vars"` with Sass modules. Use `_vars.scss`, namespaced `@use`, and a public `@forward` so consumers can still configure the component's documented variables.
- [x] Keep component-only CSS and existing `selectmenu-*` selectors where practical. Reuse UI variables for colors, typography, borders, disabled states, and transitions.
- [x] Remove generated `.ripple-line` elements and their class setting: completed with the section 3 render refactor. UI 4 renders filled input focus styling through CSS backgrounds and no longer contains this helper.
- [x] Align filled/outline wrappers, small/large inputs, selection chips, close controls, focus/disabled/validation states, and floating/input-group usage with UI 4.
- [x] Replace directional declarations such as `margin-right`, `padding-left`, and `text-align: left` with appropriate logical properties and check RTL behavior.
- [x] Check menu width/overflow, focus visibility, maximum height, Popper positioning, and custom Sass configuration in the built CSS.

**Theme scope:** SelectMenu owns CSS, but currently has no separate light/dark selectors or palettes; its colors consume UI tokens. Do not duplicate the full behavioral suite across themes or retest UI's theme engine. Add focused theme assertions only if migration introduces component-owned theme rules or a concrete component-specific theme regression. A demo theme selector can still follow the reference presentation.

### Section 4 implementation and validation — 2026-09-27

- Committed section 3 as `830439b` (`Refactor SelectMenu for UI 4 and fix component behavior`) before beginning styling work.
- Renamed `vars.scss` to `_vars.scss`; the public `selectmenu.scss` entry forwards its variables and uses them through the `vars` namespace, following UI's Sass module pattern. The existing compiler command and dependencies remain unchanged. The placeholder now consumes UI's tertiary text token, matching UI inputs.
- Generated controls use UI's `form-input` wrapper, input classes, `.focus` state, button groups, and close icons. A single-select clear button remains a sibling of the combobox, positioned inside its visual boundary; multi-select removal buttons contain a separate close icon instead of combining incompatible `.btn` and `.btn-close` styles on one element.
- Propagated the native control's direction to its generated wrapper as well as its menu. Spacing, group indentation, and alignment use logical properties; selection chips use a configurable gap. Native input-group sizing also applies to menu/search typography.
- Added component-specific integration rules for input-group border radii and focus rings, retaining floating labels and UI validation/disabled styling. Long selection labels truncate, long results wrap, and the menu and multi-select search input stay constrained to their available width. Menus use intrinsic width when `fullWidth` is false; `fullWidth` continues to match the reference within the containing block.
- Visual inspection identified a measurement bug on grid/flex page layouts (B14): the temporary search-width span participated in body layout and could stretch to a grid column. The span is now hidden and absolutely positioned; grid/flex browser regressions pass.
- Added `select-menu-style.test.js` using locator assertions and geometry checks against actual UI input styles. Coverage includes filled/outline, sizes, selected chips, RTL, floating/input-group integration, focus, disabled/validation styling, long results, scrolling, and use inside a UI modal. No theme-specific selectors were added, so no theme matrix was introduced.
- Custom Sass configuration compiles with `--fatal-deprecation=import` through `selectmenu.scss` using `@use ... with (...)`. Verified overrides for toggle width, item padding, and background color; a second `@use` emits no duplicate component CSS. All 33 existing variables remain used. No UI framework styles are bundled into SelectMenu's CSS.
- Lint, the full build, unused-variable checks, and `git diff --check` passed. All 12 distribution files were regenerated; the build no longer reports Sass `@import` deprecations.
- All **339 browser cases passed**: 113 scenarios each in Chromium, Firefox, and WebKit, including 28 styling cases per browser. The separate Chromium coverage run passed all **113 cases**, without test retries. Visual inspection covered filled/outline single/multiple controls and floating input groups on a grid page.
- Current LCOV source coverage is **525/540 lines (97.22%)**, **99/100 functions (99.00%)**, and **369/412 branches (89.56%)**. Source filtering remains unchanged and still includes helpers, the component, and registration. The 95% line target is met; hosted upload remains section 6 work.
- The documented M09 local server startup limitation remains; validation started the unchanged server first and stopped it afterward. No separate theme styling was introduced, and no additional outstanding component styling defect was found in these checks.

For the README migration, consumers should configure the public module, with the npm load path supplied by their build tool (or `--load-path=node_modules`, as documented by UI):

```scss
@use "@fr0st/ui-selectmenu/src/scss/selectmenu" with (
    $selectmenu-toggle-width: 24px,
    $selectmenu-item-padding-x: 1.25rem
);
```

The component entry emits only SelectMenu styles; consumers still load UI's stylesheet or Sass entry separately. The variables partial is now `_vars.scss`, resolved by Sass as `vars`; configure defaults before the component module is first loaded.

## 5. Playwright and coverage

Copy the infrastructure shape from AuthCodeInput/Sortable, adapting assets and names:

```text
playwright.config.js
playwright.coverage.config.js
test/package.json                  # private ESM package; #test import alias
test/support/test.js               # auto page fixture and optional coverage
test/support/server/static-server.js
test/support/app/index.html
test/browser/select-menu.test.js
test/browser/select-menu-data.test.js
test/browser/select-menu-form.test.js
test/browser/select-menu-style.test.js
```

- [x] Use Chromium, Firefox, and WebKit projects, `test/browser/**/*.test.js`, the local server on port 3001, reduced motion, and the references' viewport/timeouts.
- [x] Serve installed UI assets via package resolution and this package's built JS/CSS through explicit local routes; keep tests independent of public CDNs and live APIs.
- [x] Shared fixture verifies UI/SelectMenu/fQuery registration and CSS readiness, resets the page, and conditionally collects Chromium V8 coverage.
- [x] Use Monocart with `FROST_UI_SELECTMENU_COVERAGE`, the unminified SelectMenu UMD URL, the local source map, and source filtering for `src/js/`. Include unexecuted implementation files; exclude dependency code and only demonstrably erased re-export entry modules, with comments explaining exclusions.
- [x] Produce console summary, HTML, and `coverage/lcov.info`; mirror `.github/codecov.yml` with project target 95%, threshold 5%, and informational patch coverage. Record achieved coverage; see section 3 for the current result.

### Testing infrastructure implementation and validation — 2026-09-27

- Committed section 2 as `a6949e9` (`Build SelectMenu ESM and UMD bundles with Vite`) before adding the test infrastructure.
- Browser configuration, `test/package.json`, and Codecov settings match Sortable. The static server, test page, shared fixture, and coverage configuration follow the same reference, with SelectMenu paths/names and stylesheet readiness added.
- Added three smoke checks under `SelectMenu`: UI export/inheritance, fQuery registration, and stylesheet loading. Registration checks use scalar assertions; rendered styles use locator `toHaveCSS` assertions. No theme matrix, constructor workaround, or private-state access was added.
- ESLint on both Playwright configurations and all test JavaScript passed. Playwright discovers nine cases: the three smoke checks in each of Chromium, Firefox, and WebKit.
- All **nine browser cases passed**. The Chromium coverage run also passed all three cases and produced console, HTML, and LCOV reports.
- Verified that LCOV includes all eight current JavaScript implementation modules, retains uncovered functions, and excludes UI/fQuery dependencies and the erased `src/js/browser.js` entry. The runtime registration in `src/js/index.js` remains included.
- At infrastructure completion, LCOV line coverage was **45/707 (6.36%)**, with 0/99 functions covered. Monocart's V8 summary uses a different line accounting and reports 9.77% lines. These are infrastructure-only results; they do not meet the 95% Codecov target. Component behavior and meaningful coverage growth remain part of the section 3 refactor and its regression tests.
- **Local startup limitation:** `npm test` completed its build but stalled at Playwright's initial `HTTP GET http://localhost:3001/` probe before starting the server. That run was interrupted. Starting the unchanged server first allowed the reference `reuseExistingServer` behavior to work, and all browser/coverage checks then passed. No workaround was added to the committed configuration. The server was stopped after validation; automatic startup still needs verification in an environment where the unopened-port probe completes.
- The build left `dist/` byte-identical to the section 2 commit. No component/source/style changes were made. Hosted Codecov upload and CI remain section 6 work.

### Required describe structure and assertions

Follow `../ui-authcodeinput/test/browser/auth-code-input.test.js`, `../ui-sortable/test/browser/sortable.test.js`, and UI's Dropdown tests. Use top-level `test.describe('SelectMenu', ...)`, shared minimal `beforeEach` setup, and this order:

1. `#init`, then `#dispose`.
2. Public method groups, using `#methodName` labels; pair equivalent enable/disable cases and parameterize class/QuerySet invocation within each method group as the standalone references do.
3. `events`, then `user events` with meaningful mouse, keyboard, and focus subgroups.
4. Individual option groups named `'<name> option'`, covering only actual option behavior.

Keep asynchronous data and form integration in focused companion files with the same descriptive grouping style. Do not build a second generic API/snapshot test framework.

Use `getByRole` and stable locators with `toHaveValue`, `toHaveValues`, `toHaveText`, `toHaveCount`, `toHaveAttribute`, `toHaveClass`, `toHaveCSS`, `toBeVisible`, `toBeDisabled`, and `toBeFocused` where applicable. Avoid serializing DOM state into objects for `.toEqual` assertions. Use scalar assertions for public API/instance identity and event counts; structural assertions are appropriate only for real data contracts such as `data()` or callback payloads. Do not inspect private fields or add arbitrary sleeps.

Coverage scenarios:

- Initialization from native options, optgroups, arrays, object maps, and existing selections; option/data-attribute precedence; two independent instances and QuerySet behavior.
- Single/multiple selection, clear/remove/backspace, limits, disabled select/fieldset/options/groups, placeholder changes, empty and numeric values, and unchanged-value events.
- Search matching/sorting, accents, minimum length, no results, custom strings/elements, and sanitized content.
- Loading/errors/retry, debounce, pagination, last-request-wins, overlapping value loads, and callbacks after disposal.
- Arrow/Enter/Escape/Tab behavior, accessible names, active descendant, selection state, focus transfer, and no accidental form submission from selection.
- Cancelable lifecycle events, interruption, disposal within event handlers, full cleanup, native change/reset/FormData/required validity, and reinitialization.
- Filled/outline/sizes, RTL, constrained width/height, append targets, positioning updates, and representative modal integration.
- ESM/UMD package loading and minified smoke checks without duplicating the full behavioral suite.

## 6. CI and Codecov

- [x] Add `.github/workflows/ci.yml` following the references' push-to-main and pull-request triggers and Markdown path exclusions.
- [x] Use the same matrix: Chromium on Node 20/22/24; Firefox and WebKit on Node 24. Keep the Node/PostCSS decision above consistent with the manifest and matrix.
- [x] Use reference checkout/setup-node versions, npm caching, `npm ci`, browser installation with OS dependencies, lint, build, and `--forbid-only` browser tests.
- [x] Run coverage on Node 24/Chromium in place of that matrix cell's normal test run. Upload only `coverage/lcov.info` with the reference Codecov action and OIDC permissions; fail on upload errors as the references do.
- [x] Add generated-bundle freshness and `npm pack --dry-run` checks. Ensure new ESM artifacts are tracked: `git diff --exit-code -- dist` alone does not detect untracked files.
- [ ] Configure/verify the actual repository's Codecov OIDC access and badges when the workflow is exercised. Local source coverage does not by itself prove hosted upload works.
- [x] Add the sibling release-published `publish.yml` workflow with build/lint/Chromium/package checks and npm provenance.
- [ ] Verify npm trusted-publisher configuration before publishing a release; this proposal does not publish anything.

### Section 6 implementation and validation — 2026-09-27

- Started from the clean section 4 commit `50c863e` (`Align SelectMenu styles and Sass with UI 4`). Added `.github/workflows/ci.yml` and `publish.yml`; the existing `.github/codecov.yml` already matches the references and remains unchanged.
- All three primary references have identical CI and release workflows. Retained their triggers, Markdown exclusions, five matrix entries, `actions/checkout@v6`, `actions/setup-node@v6`, npm cache/clean install, Playwright browser installation, lint/build/test commands, and Node 24 Chromium coverage replacement. `--forbid-only` remains in the npm scripts consumed by both workflows.
- Codecov uses `codecov/codecov-action@v7`, `use_oidc: true`, `id-token: write`, `fail_ci_if_error: true`, `disable_search: true`, and only `./coverage/lcov.info`. These OIDC requirements match the [official action documentation](https://github.com/codecov/codecov-action/tree/v7#using-oidc).
- Strengthened the reference freshness step with `git status --porcelain --untracked-files=all -- dist`, catching tracked changes, deletions, staged changes, and new untracked bundles. Applied the same check before package validation in the publish workflow. The release job otherwise matches the references and publishes using `npm publish --provenance` only on `release.published`.
- `actionlint` 1.7.12 passed on both workflow files. The standalone validator was downloaded from its official GitHub release into `/tmp` and its published SHA-256 digest verified; no new project dependency was added. Parsed both workflows as YAML and compared their triggers, permissions, matrix, and steps with UI's references.
- Exercised the exact freshness script in a temporary Git repository: clean output and unrelated changes pass; modified, staged, deleted, and untracked ESM output fail. The check also passes against this checkout after a full rebuild; `dist/` remains byte-identical to the section 4 commit.
- `npm run lint`, `npm run lint:sass:unused`, `npm run build`, and `git diff --check` passed. `npm pack --dry-run --json` passed and lists 21 package files, including all 12 distribution files. The dry run used a temporary npm cache because the default cache is read-only inside the local sandbox.
- A bounded `CI=true npm run test:coverage -- --workers=4` attempt reproduced M09: automatic server startup did not reach test execution before the 45-second timeout. No server workaround was added to the workflows or test configuration. Starting the unchanged server first, as in earlier sections, allowed all **113 coverage cases to pass**, without retries. LCOV remains **525/540 lines (97.22%)**, **99/100 functions (99.00%)**, and **369/412 branches (89.56%)**. Monocart reports four intermediate assertion errors from polling; Playwright reports no failed tests.

### Hosted setup and verification still required

- GitHub API confirms `elusivecodes/FrostUI-SelectMenu` is public, its default branch is `main`, Actions are enabled, and all actions are allowed. There are currently no hosted workflows; the new files have not been pushed or dispatched. The first GitHub run must verify the five Node/browser cells, automatic server startup, and the Codecov OIDC upload.
- The [public Codecov repository API](https://api.codecov.io/api/v2/github/elusivecodes/repos/FrostUI-SelectMenu/) currently returns `active: false` and `activated: false`. Confirm repository activation and a successful first OIDC upload in [Codecov](https://app.codecov.io/gh/elusivecodes/FrostUI-SelectMenu) before claiming hosted coverage works. CI/coverage badges belong to section 7 after their URLs/statuses are verified.
- `npm trust list @fr0st/ui-selectmenu --json` returned HTTP 401, so the existing trusted-publisher settings could not be read or configured. Before publishing a release, verify the package's GitHub trusted publisher uses owner `elusivecodes`, repository `FrostUI-SelectMenu`, workflow filename `publish.yml`, no environment (the workflow defines none), and permits direct `npm publish`. npm's [trusted-publishing documentation](https://docs.npmjs.com/trusted-publishers/) describes these fields and the Node/npm minimum versions; the reference Node 24 release job satisfies those minimums.
- No remote settings, releases, or npm packages were changed. Workflow implementation is ready for review, but section 6's external acceptance checks remain open rather than being marked complete on local evidence alone.

## 7. README and demos

- [ ] Rewrite README in the standalone reference order: badges/introduction, highlights, installation, usage, options, data attributes, methods, events, fQuery API, accessibility, forms, styling/Sass/RTL, development, migration notes, and license.
- [ ] Document both required stylesheets, npm/bundler ESM imports, direct-browser ESM import maps, and UMD script ordering. Browser ESM maps must include UI/fQuery's transitive `@fr0st/core` requirement, without adding an unnecessary direct core dependency here.
- [ ] Document item/group schemas, search/value callback signatures, pagination response shape, sanitization, initial remote values, cancellation behavior, value types, and form reset/validation contracts.
- [ ] Replace the duplicated light/dark filled/outline demo pages and separate methods/events pages with `demo/index.html` and `demo/assets/demo.css` / `demo.js`, following UI and the component references' navigation, cards, examples, and theme selector.
- [ ] Preserve all useful demonstrations: filled/outline, sizes, single/multiple, groups, disabled options, placeholders, clear/removal, limits, custom rendering, local/asynchronous search, loading/error/no-results, pagination, forms, methods, and event logging.
- [ ] Use deterministic local asynchronous data in demos. Reference current UI package assets and this checkout's SelectMenu build; remove legacy `elusivecodes/frostui@latest` GitHub-CDN links.
- [ ] Label the demo with the correct SelectMenu/UI versions. The current Sortable reference still displays “Frost UI v3 component”; do not copy that stale label.

## Initial bug and issue register

The original findings below came from pre-migration source inspection; file references describe that historical source. Section 3 adds browser regressions and fixes for M01, M05, and B01–B12. B13 was discovered during section 3 browser validation. Styling, tooling, and documentation follow-ups retain their own section scope.

| ID | Finding and evidence | Proposed resolution / regression |
| --- | --- | --- |
| M01 | **Fixed in section 3:** `src/js/select-menu.js` and all prototype modules read `_node`/`_options`; UI 4 stores these privately and exposes `node`/`options`. | Migrate inherited access before testing against new peers; verify initialization and every public method. |
| B01 | **Fixed in section 3:** `_refreshSingle` in `prototype/helpers.js` references undefined `tag` when `renderSelection` returns an element. | Compare with the actual destination element; test returned DOM nodes and callbacks that fill the supplied destination. |
| B02 | **Fixed in section 3:** rendering, focus, and hide paths use `aria-activedescendent` instead of `aria-activedescendant`. | Correct all paths and assert the focused option's ID through the actual ARIA attribute. |
| B03 | **Fixed in section 3:** `_refreshSingle` and `_refreshPlaceholder` use truthiness, so valid `0`/empty-string values are treated as empty. | Distinguish missing selection from valid values; assert native value and displayed label. |
| B04 | **Fixed in section 3:** multiple `_setValue` dereferences `value.length`/`value.some` after initialization without normalizing null/scalar input; `getValue()` also exposes the internal multiple-value array. | Define/normalize input contracts and protect internal selection state; test empty/scalar/multiple values and returned-array mutation. |
| B05 | **Fixed in section 3:** multiple-selection Backspace directly pops `_value` and refreshes without the change-event path. | Apply changes through the shared selection path and assert exactly one change event when selection changes. |
| B06 | **Fixed in section 3:** refresh empties the native select and keeps only selected generated options; original options/optgroups/default selections cannot survive disposal/reset. No form-reset handler exists. | Preserve original controls and defaults; test reset, disposal, reinitialization, required validity, and submission. |
| B07 | **Fixed in section 3:** `dispose()` always removes tabindex/hidden class and clears `_requests`, but active loading uses `_request`. Pending debounce, mouseup handlers, animations, and requests are not comprehensively invalidated. | Restore original attributes and cancel/invalidate owned work; test disposal during search, mouse interaction, transition, and lifecycle listeners. |
| B08 | **Fixed in section 3:** remote search merges data into lookup before checking request identity; value-loading requests have no latest-request guard. | Check request generation/liveness before every mutation; reproduce out-of-order search and `setValue` responses. |
| B09 | **Fixed in section 3:** `Promise.resolve(getResults(...))` evaluates the callback before promise handling, so synchronous throws escape the rejection path. Pending debounced searches can also outlive a below-minimum search. | Handle synchronous/async failures consistently and invalidate pending work when search conditions change. |
| B10 | **Fixed in section 3:** lookup is a normal object, uses `value in lookup`, and assigns arbitrary values as keys; inherited keys such as `constructor`/`toString` can be mistaken for results and `__proto__` has special assignment behavior. | Use a Map or a null-prototype dictionary with explicit membership checks and documented key normalization. |
| B11 | **Fixed in section 3:** generated comboboxes do not inherit the original label/description; clear controls are spans/divs with button roles and no complete keyboard activation path. | Establish accessible naming/relationships and keyboard-operable removal controls without invalid nested interactive elements. |
| B12 | **Fixed in section 3:** Enter in the search handler selects without preventing the form default; disabled controls use class/tabindex/ARIA but event handlers do not consistently enforce disabled state. | Test Enter submission and disabled/fieldset/clear interactions; enforce the intended native behavior. |
| B13 | **Fixed in section 3:** full-width menu positioning used its old width because width was set after Popper measured it; start placement could be hundreds of pixels away. | Set width in `beforeUpdate`; assert placement/spacing for top, bottom, start, and end and anchoring during scrolling. |
| B14 | **Fixed in section 4:** search input width measurement participates in body grid/flex layout and can stretch, creating an unnecessary extra row in multiple selections. | Measure with a hidden, absolutely positioned span; check input width on grid and flex pages. |
| M02 | **Fixed in sections 3–4:** obsolete `.ripple-line` markup, Sass `@import`, and physical left/right spacing differed from current UI. | Sass modules, UI input markup/focus, logical spacing, RTL positioning, and configurable Sass builds are covered by section 4 validation. |
| M03 | **Partially resolved:** the original package lacked UI/fQuery dependency declarations, compiled ESM, tests, coverage, and CI. | Sections 1, 2, 3, and testing infrastructure in 5 are complete. Section 6 workflows are implemented and locally validated; hosted CI/Codecov verification remains open. |
| M04 | **Confirmed tooling choice:** PostCSS CLI 12 requires Node >=22 while UI supports Node 20; sibling manifests also trail some current patch versions. | Apply the explicit latest-compatible policy above and record the final resolved versions. |
| M05 | **Fixed in section 3:** fQuery 5 traversal returns arrays (`child`, `parent`, etc.), while some current code treats results as individual nodes/truthy presence. | Audit consumers individually; use `.shift()` or cardinality checks where required, with pagination/removal regressions. |
| M06 | **Resolved in phase 1:** the old lockfile identified the package as 3.1.8 while the manifest was 3.1.9; in-place resolution also conflicted with old Stylelint peers. | Generated a fresh lockfile through normal npm resolution; clean `npm ci` passed and root metadata matches 4.0.0. |
| M07 | **Recorded in phase 1:** Sass's optional fallback installation can claim the `sass` executable; npm reports fallback packages as extraneous and warns about the optional watcher script. | Retain UI's `sass ...` command and `sass-embedded` dependency. No custom executable path or packaging workaround. |
| M08 | **Recorded in phase 1:** current `clean-css-cli` pulls deprecated `glob`/`inflight`. | Retain UI's supported CSS minifier for alignment; the clean-install audit reports zero vulnerabilities. No unsupported transitive major override was introduced. |
| M09 | **Local validation limitation, reproduced in section 6:** Playwright's initial availability check on an unopened localhost:3001 port stalled before launching the web server. | Starting the reference server first allowed browser validation and all 113 current coverage cases to pass. Keep reference configuration; verify automatic startup again in CI or an environment where the probe completes. |
| M10 | **Section 6 hosted checks pending:** Codecov reports the repository inactive and npm trusted-publisher inspection returns HTTP 401. Local workflow validation cannot establish hosted upload or release authentication. | Verify activation/first upload and the exact `publish.yml` trusted-publisher mapping described in section 6 before release. |
| D01 | **Confirmed documentation drift:** current README lacks API/migration guidance, demos use legacy CDN paths, and a reference demo contains a stale version label. | Rewrite with verified package/repository links and current version labels. |

## Completion checklist and validation record

- [x] Reviewed current source and primary reference configurations, component conventions, styles, README/demo patterns, and test grouping.
- [x] Verified published direct dependency targets and Node engine constraints through npm metadata.
- [ ] Execute the implementation phases above and update this file as each completes.
- [x] Run `npx sort-package-json` on Node 24; verify the phase 1 manifest and lockfile agree. Repeat if later phases change dependencies.
- [ ] Run `npm ci`, `npm run lint`, `npm run lint:sass:unused`, and `npm run build`.
- [ ] Run `npm run test:browser` for all three configured browsers, then `npm run test:coverage`.
- [ ] Confirm LCOV maps to SelectMenu source, inspect uncovered branches, and record achieved coverage.
- [ ] Verify clean/repeat builds and tracked distribution outputs, including newly introduced ESM files.
- [ ] Run `npm pack --dry-run` and exercise packed-package ESM/UMD consumption, exported CSS/Sass paths, and minified files.
- [ ] Smoke-test README examples and the consolidated demo, including forms, keyboard use, RTL, asynchronous data, and lifecycle controls.
- [ ] Verify hosted CI/Codecov and publishing configuration where repository access permits; record external setup still outstanding.
- [ ] Resolve every confirmed defect or explicitly document a remaining limitation and its impact before declaring migration complete.

Initial proposal validation consisted of source/configuration review and registry metadata queries. Tooling, build/package checks, and testing-infrastructure validation are recorded in sections 1, 2, and 5. Section 3 implementation and its runtime/browser validation are recorded above; final migration/release validation remains pending.
