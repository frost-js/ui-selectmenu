# Frost UI SelectMenu 4 migration proposal

Status: sections 1 (package and tooling), 2 (build migration), and 5 (testing infrastructure) complete. Sections 3, 4, 6, and 7 and final release verification remain pending. Component behavior still requires the section 3 UI 4 source migration; current tests are infrastructure smoke checks.

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

Tracker numbers now match the numbered sections below. The original tracker incorrectly called testing phase 3 while the body placed it in section 5; testing infrastructure was started under that mismatch and finished first at the user's direction. Component refactoring (section 3) and styles (section 4) have not been completed.

Mark a section complete only after its acceptance criteria pass. Add newly discovered defects to the issue register below and record the relevant test when resolved.

| Section | Status | Deliverable / acceptance criteria |
| --- | --- | --- |
| 0. Inventory and proposal | Complete | Existing source, styles, packaging, demos, and reference patterns reviewed; dependency versions checked; initial issues recorded. |
| 1. Package and tooling | Complete | `.npmrc`, `.gitignore`, major version, metadata, exports, scripts, lint configuration, and lockfile updated; `npx sort-package-json` and clean `npm ci` passed. See phase 1 validation below. |
| 2. Build migration | Complete | Vite produces ESM and UMD, expanded/minified CSS, and source maps; packed bundle loading and UI global extension passed Chromium smoke checks. |
| 3. Component migration and fixes | Pending | Private class implementation, UI 4 lifecycle, documented API, preserved form behavior, and regression tests pass. |
| 4. Styles and Sass | Pending | Sass modules, UI 4 input markup/tokens, logical properties, and component styling checks pass. |
| 5. Test infrastructure | Complete | Local test server, shared fixture, Chromium/Firefox/WebKit smoke checks, and source coverage pass. Behavioral tests and the coverage target remain pending; see validation and the local startup limitation below. |
| 6. CI and Codecov | Pending | Reference CI matrix, hosted coverage upload, bundle freshness, and package validation are configured. |
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

- [ ] Move `SelectMenu.defaults` and `SelectMenu.classes` into static class fields, following UI and AuthCodeInput.
- [ ] Replace SelectMenu's `_...` state and instance helpers with declared `#...` fields/methods. Access inherited state through `this.node` and `this.options`; UI 4 no longer exposes `_node` and `_options`.
- [ ] Remove `src/js/prototype/` and all runtime prototype composition. Extract only stateless functions with explicit inputs; keep stateful rendering/data/event logic in the class.
- [ ] Keep `initComponent('selectmenu', SelectMenu)` and default export in the entry module. Preserve `.init()` reuse, registration cleanup, and the fQuery plugin's first-result behavior.
- [ ] Add JSDoc types for options, language strings, item/group data, values, result responses, render/match/sort callbacks, and `getResults` search/value requests. Use `@augments {BaseComponent<SelectMenuOptions>}`, `@returns`, and `@inheritdoc` consistently.
- [ ] Audit every fQuery call against v5, particularly array-returning traversal, DOM creation, delegated events, sanitization, debounce/throttle, and animation cleanup.
- [ ] Align opening/closing with UI's transition lifecycle and reduced-motion styling. Prefer CSS state classes plus `waitForTransition`; preserve the documented numeric `duration` override through component styling if feasible, and explicitly document any changed contract.
- [ ] Verify Popper `reference`, container positioning, `placement`, `position`, `fixed`, `spacing`, `minContact`, and `fullWidth` under the current API, including `appendTo` and scrolling containers.
- [ ] Preserve event names: `show`, `shown`, `hide`, `hidden`, and `change` under `.ui.selectmenu`; honor cancellation and disposal from event listeners.
- [ ] Make request handling robust to out-of-order completion, delayed searches, pagination, rejection, synchronous throws, value loading, hiding, and disposal. Retain cancellable work where supported and ignore obsolete callbacks before mutating any state.
- [ ] Preserve the native select's options/optgroups, selected/default-selected states, form association, validity, and label relationships. Synchronize native and rendered selection; handle form reset and define programmatic native-change behavior.
- [ ] Restore original visibility/tabindex on disposal, preserve unrelated runtime changes, remove owned listeners/timers/Popper state, and allow safe reinitialization.
- [ ] Fix the issues below with browser regressions, including accessible naming and keyboard interaction for the generated control and removal buttons.

Retain the existing public methods: `data`, `disable`, `dispose`, `enable`, `getMaxSelections`, `getPlaceholder`, `getValue`, `hide`, `setMaxSelections`, `setPlaceholder`, `setValue`, `show`, `toggle`, and `update`. Preserve option names unless a specific compatibility fix requires a documented change. Define `null` as an empty single selection and `[]` as an empty multiple selection; normalize and document supported input types rather than relying on truthiness.

Breaking changes to document for v4: UI/fQuery peer majors, supported Node/browser baselines, package root moving to compiled ESM, private internals replacing underscore access/prototype patching, renamed build scripts and browser entry, Sass module configuration, and any deliberate value/event/transition corrections. Do not claim CommonJS support merely because a UMD file exists in a `type: module` package.

## 4. Styles and Sass

- [ ] Replace `@import "vars"` with Sass modules. Use `_vars.scss`, namespaced `@use`, and a public `@forward` so consumers can still configure the component's documented variables.
- [ ] Keep component-only CSS and existing `selectmenu-*` selectors where practical. Reuse UI variables for colors, typography, borders, disabled states, and transitions.
- [ ] Remove generated `.ripple-line` elements and their class setting: UI 4 renders filled input focus styling through CSS backgrounds and no longer contains this helper.
- [ ] Align filled/outline wrappers, small/large inputs, selection chips, close controls, focus/disabled/validation states, and floating/input-group usage with UI 4.
- [ ] Replace directional declarations such as `margin-right`, `padding-left`, and `text-align: left` with appropriate logical properties and check RTL behavior.
- [ ] Check menu width/overflow, focus visibility, maximum height, Popper positioning, and custom Sass configuration in the built CSS.

**Theme scope:** SelectMenu owns CSS, but currently has no separate light/dark selectors or palettes; its colors consume UI tokens. Do not duplicate the full behavioral suite across themes or retest UI's theme engine. Add focused theme assertions only if migration introduces component-owned theme rules or a concrete component-specific theme regression. A demo theme selector can still follow the reference presentation.

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
```

- [x] Use Chromium, Firefox, and WebKit projects, `test/browser/**/*.test.js`, the local server on port 3001, reduced motion, and the references' viewport/timeouts.
- [x] Serve installed UI assets via package resolution and this package's built JS/CSS through explicit local routes; keep tests independent of public CDNs and live APIs.
- [x] Shared fixture verifies UI/SelectMenu/fQuery registration and CSS readiness, resets the page, and conditionally collects Chromium V8 coverage.
- [x] Use Monocart with `FROST_UI_SELECTMENU_COVERAGE`, the unminified SelectMenu UMD URL, the local source map, and source filtering for `src/js/`. Include unexecuted implementation files; exclude dependency code and only demonstrably erased re-export entry modules, with comments explaining exclusions.
- [x] Produce console summary, HTML, and `coverage/lcov.info`; mirror `.github/codecov.yml` with project target 95%, threshold 5%, and informational patch coverage. Record achieved coverage; the target is not yet met.

### Testing infrastructure implementation and validation — 2026-09-27

- Committed section 2 as `a6949e9` (`Build SelectMenu ESM and UMD bundles with Vite`) before adding the test infrastructure.
- Browser configuration, `test/package.json`, and Codecov settings match Sortable. The static server, test page, shared fixture, and coverage configuration follow the same reference, with SelectMenu paths/names and stylesheet readiness added.
- Added three smoke checks under `SelectMenu`: UI export/inheritance, fQuery registration, and stylesheet loading. Registration checks use scalar assertions; rendered styles use locator `toHaveCSS` assertions. No theme matrix, constructor workaround, or private-state access was added.
- ESLint on both Playwright configurations and all test JavaScript passed. Playwright discovers nine cases: the three smoke checks in each of Chromium, Firefox, and WebKit.
- All **nine browser cases passed**. The Chromium coverage run also passed all three cases and produced console, HTML, and LCOV reports.
- Verified that LCOV includes all eight current JavaScript implementation modules, retains uncovered functions, and excludes UI/fQuery dependencies and the erased `src/js/browser.js` entry. The runtime registration in `src/js/index.js` remains included.
- Current LCOV line coverage is **45/707 (6.36%)**, with 0/99 functions covered. Monocart's V8 summary uses a different line accounting and reports 9.77% lines. These are infrastructure-only results; they do not meet the 95% Codecov target. Component behavior and meaningful coverage growth remain part of the section 3 refactor and its regression tests.
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

- [ ] Add `.github/workflows/ci.yml` following the references' push-to-main and pull-request triggers and Markdown path exclusions.
- [ ] Use the same matrix: Chromium on Node 20/22/24; Firefox and WebKit on Node 24. Keep the Node/PostCSS decision above consistent with the manifest and matrix.
- [ ] Use reference checkout/setup-node versions, npm caching, `npm ci`, browser installation with OS dependencies, lint, build, and `--forbid-only` browser tests.
- [ ] Run coverage on Node 24/Chromium in place of that matrix cell's normal test run. Upload only `coverage/lcov.info` with the reference Codecov action and OIDC permissions; fail on upload errors as the references do.
- [ ] Add generated-bundle freshness and `npm pack --dry-run` checks. Ensure new ESM artifacts are tracked: `git diff --exit-code -- dist` alone does not detect untracked files.
- [ ] Configure/verify the actual repository's Codecov OIDC access and badges when the workflow is exercised. Local source coverage does not by itself prove hosted upload works.
- [ ] For full automation alignment, add the sibling release-published `publish.yml` workflow with build/lint/Chromium/package checks and npm provenance. Verify npm trusted-publisher configuration before enabling a release; this proposal does not publish anything.

## 7. README and demos

- [ ] Rewrite README in the standalone reference order: badges/introduction, highlights, installation, usage, options, data attributes, methods, events, fQuery API, accessibility, forms, styling/Sass/RTL, development, migration notes, and license.
- [ ] Document both required stylesheets, npm/bundler ESM imports, direct-browser ESM import maps, and UMD script ordering. Browser ESM maps must include UI/fQuery's transitive `@fr0st/core` requirement, without adding an unnecessary direct core dependency here.
- [ ] Document item/group schemas, search/value callback signatures, pagination response shape, sanitization, initial remote values, cancellation behavior, value types, and form reset/validation contracts.
- [ ] Replace the duplicated light/dark filled/outline demo pages and separate methods/events pages with `demo/index.html` and `demo/assets/demo.css` / `demo.js`, following UI and the component references' navigation, cards, examples, and theme selector.
- [ ] Preserve all useful demonstrations: filled/outline, sizes, single/multiple, groups, disabled options, placeholders, clear/removal, limits, custom rendering, local/asynchronous search, loading/error/no-results, pagination, forms, methods, and event logging.
- [ ] Use deterministic local asynchronous data in demos. Reference current UI package assets and this checkout's SelectMenu build; remove legacy `elusivecodes/frostui@latest` GitHub-CDN links.
- [ ] Label the demo with the correct SelectMenu/UI versions. The current Sortable reference still displays “Frost UI v3 component”; do not copy that stale label.

## Initial bug and issue register

These findings come from source inspection, not a completed browser run. “Confirmed” means the source contains the defect described; regression reproduction and fixes remain pending. File references describe the pre-migration source and will change during refactoring.

| ID | Finding and evidence | Proposed resolution / regression |
| --- | --- | --- |
| M01 | **Confirmed migration blocker:** `src/js/select-menu.js` and all prototype modules read `_node`/`_options`; UI 4 stores these privately and exposes `node`/`options`. | Migrate inherited access before testing against new peers; verify initialization and every public method. |
| B01 | **Confirmed:** `_refreshSingle` in `prototype/helpers.js` references undefined `tag` when `renderSelection` returns an element. | Compare with the actual destination element; test returned DOM nodes and callbacks that fill the supplied destination. |
| B02 | **Confirmed:** rendering, focus, and hide paths use `aria-activedescendent` instead of `aria-activedescendant`. | Correct all paths and assert the focused option's ID through the actual ARIA attribute. |
| B03 | **Confirmed:** `_refreshSingle` and `_refreshPlaceholder` use truthiness, so valid `0`/empty-string values are treated as empty. | Distinguish missing selection from valid values; assert native value and displayed label. |
| B04 | **Confirmed:** multiple `_setValue` dereferences `value.length`/`value.some` after initialization without normalizing null/scalar input; `getValue()` also exposes the internal multiple-value array. | Define/normalize input contracts and protect internal selection state; test empty/scalar/multiple values and returned-array mutation. |
| B05 | **Confirmed:** multiple-selection Backspace directly pops `_value` and refreshes without the change-event path. | Apply changes through the shared selection path and assert exactly one change event when selection changes. |
| B06 | **Confirmed:** refresh empties the native select and keeps only selected generated options; original options/optgroups/default selections cannot survive disposal/reset. No form-reset handler exists. | Preserve original controls and defaults; test reset, disposal, reinitialization, required validity, and submission. |
| B07 | **Confirmed:** `dispose()` always removes tabindex/hidden class and clears `_requests`, but active loading uses `_request`. Pending debounce, mouseup handlers, animations, and requests are not comprehensively invalidated. | Restore original attributes and cancel/invalidate owned work; test disposal during search, mouse interaction, transition, and lifecycle listeners. |
| B08 | **Confirmed:** remote search merges data into lookup before checking request identity; value-loading requests have no latest-request guard. | Check request generation/liveness before every mutation; reproduce out-of-order search and `setValue` responses. |
| B09 | **Confirmed:** `Promise.resolve(getResults(...))` evaluates the callback before promise handling, so synchronous throws escape the rejection path. Pending debounced searches can also outlive a below-minimum search. | Handle synchronous/async failures consistently and invalidate pending work when search conditions change. |
| B10 | **Confirmed:** lookup is a normal object, uses `value in lookup`, and assigns arbitrary values as keys; inherited keys such as `constructor`/`toString` can be mistaken for results and `__proto__` has special assignment behavior. | Use a Map or a null-prototype dictionary with explicit membership checks and documented key normalization. |
| B11 | **Confirmed markup gap:** generated comboboxes do not inherit the original label/description; clear controls are spans/divs with button roles and no complete keyboard activation path. | Establish accessible naming/relationships and keyboard-operable removal controls without invalid nested interactive elements. |
| B12 | **Needs browser confirmation:** Enter in the search handler selects without preventing the form default; disabled controls use class/tabindex/ARIA but event handlers do not consistently enforce disabled state. | Test Enter submission and disabled/fieldset/clear interactions; enforce the intended native behavior. |
| M02 | **Confirmed styling mismatch:** obsolete `.ripple-line` markup, Sass `@import`, and physical left/right spacing differ from current UI. | Update styling and verify filled focus, RTL, and custom Sass builds. |
| M03 | **Partially resolved:** the original package lacked UI/fQuery dependency declarations, compiled ESM, tests, coverage, and CI. | Sections 1, 2, and testing infrastructure in 5 are complete. Implement CI in section 6 and behavioral tests alongside section 3. |
| M04 | **Confirmed tooling choice:** PostCSS CLI 12 requires Node >=22 while UI supports Node 20; sibling manifests also trail some current patch versions. | Apply the explicit latest-compatible policy above and record the final resolved versions. |
| M05 | **Needs contract audit:** fQuery 5 traversal returns arrays (`child`, `parent`, etc.), while some current code treats results as individual nodes/truthy presence. | Audit consumers individually; use `.shift()` or cardinality checks where required, with pagination/removal regressions. |
| M06 | **Resolved in phase 1:** the old lockfile identified the package as 3.1.8 while the manifest was 3.1.9; in-place resolution also conflicted with old Stylelint peers. | Generated a fresh lockfile through normal npm resolution; clean `npm ci` passed and root metadata matches 4.0.0. |
| M07 | **Recorded in phase 1:** Sass's optional fallback installation can claim the `sass` executable; npm reports fallback packages as extraneous and warns about the optional watcher script. | Retain UI's `sass ...` command and `sass-embedded` dependency. No custom executable path or packaging workaround. |
| M08 | **Recorded in phase 1:** current `clean-css-cli` pulls deprecated `glob`/`inflight`. | Retain UI's supported CSS minifier for alignment; the clean-install audit reports zero vulnerabilities. No unsupported transitive major override was introduced. |
| M09 | **Local validation limitation:** Playwright's initial availability check on an unopened localhost:3001 port stalled before launching the web server. | Starting the reference server first allowed all nine browser cases and the coverage run to pass. Keep reference configuration; verify automatic startup again in CI or an environment where the probe completes. |
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

Initial proposal validation consisted of source/configuration review and registry metadata queries. Tooling, build/package checks, and testing-infrastructure validation are recorded in sections 1, 2, and 5. Full component runtime/browser validation remains pending.
