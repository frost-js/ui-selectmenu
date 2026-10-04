# Frost UI SelectMenu

[![CI](https://github.com/elusivecodes/FrostUI-SelectMenu/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/elusivecodes/FrostUI-SelectMenu/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/elusivecodes/FrostUI-SelectMenu/branch/main/graph/badge.svg)](https://codecov.io/gh/elusivecodes/FrostUI-SelectMenu)
[![npm version](https://img.shields.io/npm/v/%40fr0st%2Fui-selectmenu?style=flat-square)](https://www.npmjs.com/package/@fr0st/ui-selectmenu)
[![npm downloads](https://img.shields.io/npm/dm/%40fr0st%2Fui-selectmenu?style=flat-square)](https://www.npmjs.com/package/@fr0st/ui-selectmenu)
[![JS gzip size](https://img.badgesize.io/elusivecodes/FrostUI-SelectMenu/main/dist/frost-ui-selectmenu.min.js?compression=gzip&label=JS%20gzip%20size&style=flat-square)](https://github.com/elusivecodes/FrostUI-SelectMenu/blob/main/dist/frost-ui-selectmenu.min.js)
[![CSS gzip size](https://img.badgesize.io/elusivecodes/FrostUI-SelectMenu/main/dist/frost-ui-selectmenu.min.css?compression=gzip&label=CSS%20gzip%20size&style=flat-square)](https://github.com/elusivecodes/FrostUI-SelectMenu/blob/main/dist/frost-ui-selectmenu.min.css)
[![license](https://img.shields.io/github/license/elusivecodes/FrostUI-SelectMenu?style=flat-square)](./LICENSE)

Searchable single and multiple selects for Frost UI, with grouped options, asynchronous results, custom rendering, and native form integration.

## Highlights

- Single selection with optional clearing, or multiple selection with removable chips
- Native options, grouped local data, and asynchronous search with pagination
- Debounced searches, optional cancellation, and protection against stale responses
- Accent-insensitive local matching and configurable matching/sorting callbacks
- Keyboard navigation, accessible labels, and native required/disabled behavior
- Silent programmatic updates, form submission, and reset synchronization
- Filled and outline Frost UI v4 styles, three sizes, theme tokens, and RTL layouts
- Native `SelectMenu` class and `selectmenu` fQuery plugin
- Existing-instance reuse with frozen resolved options
- Prebuilt ESM and UMD bundles with source maps
- Expanded and minified component CSS with source maps
- JSDoc-powered IntelliSense

Explore [the demo](./demo/index.html) for interactive examples.

## Installation

### Browser projects / bundlers

```bash
npm i @fr0st/ui-selectmenu
```

Frost UI SelectMenu's package entry point is ESM-only and requires a browser DOM. Import the default `SelectMenu` export and the stylesheets in browser projects and bundlers.

```js
import '@fr0st/ui/dist/frost-ui.min.css';
import '@fr0st/ui-selectmenu/dist/frost-ui-selectmenu.min.css';
import SelectMenu from '@fr0st/ui-selectmenu';
```

`@fr0st/ui` and `@fr0st/query` are peer dependencies so the component shares the application's instances.

### Browser (ESM)

The ESM bundle imports `@fr0st/ui` and `@fr0st/query`. fQuery also imports `@fr0st/core`, so map all three dependencies when loading the bundle directly in a browser:

```html
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui.min.css">
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui-selectmenu@latest/dist/frost-ui-selectmenu.min.css">
<script type="importmap">
{
    "imports": {
        "@fr0st/core": "https://cdn.jsdelivr.net/npm/@fr0st/core@latest/dist/frost-core.esm.min.js",
        "@fr0st/query": "https://cdn.jsdelivr.net/npm/@fr0st/query@latest/dist/fquery.esm.min.js",
        "@fr0st/ui": "https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui.esm.min.js"
    }
}
</script>
<script type="module">
    import SelectMenu from 'https://cdn.jsdelivr.net/npm/@fr0st/ui-selectmenu@latest/dist/frost-ui-selectmenu.esm.min.js';
</script>
```

### Browser (UMD)

Load the bundles from your own copy or a CDN:

```html
<link
    rel="stylesheet"
    href="/path/to/dist/frost-ui.min.css">
<link
    rel="stylesheet"
    href="/path/to/dist/frost-ui-selectmenu.min.css">
<script src="/path/to/dist/frost-ui-bundle.min.js"></script>
<script src="/path/to/dist/frost-ui-selectmenu.min.js"></script>
<!-- or -->
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui.min.css">
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui-selectmenu@latest/dist/frost-ui-selectmenu.min.css">
<script src="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui-bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@fr0st/ui-selectmenu@latest/dist/frost-ui-selectmenu.min.js"></script>
<script>
    const { SelectMenu } = globalThis.UI;
</script>
```

The UMD bundle adds `SelectMenu` to the existing `globalThis.UI` object. Load Frost UI's all-in-one bundle first; it supplies the `UI` and `fQuery` globals.

The package root resolves to the prebuilt ESM bundle. Published files under `dist/` and `src/` are also available through matching package subpaths.

## Usage

Start with a labeled native select. Its classes determine the generated input's style and size:

```html
<label for="fruit">Fruit</label>
<select
    id="fruit"
    name="fruit"
    class="input-outline">
    <option value="apple">Apple</option>
    <option value="banana">Banana</option>
    <option value="pear" disabled>Pear (unavailable)</option>
</select>
```

```js
import SelectMenu from '@fr0st/ui-selectmenu';

const selectMenu = SelectMenu.init(
    document.querySelector('#fruit'),
    {
        allowClear: true,
        fullWidth: true,
        placeholder: 'Choose a fruit',
    },
);

selectMenu.setValue(null); // Start empty instead of selecting the first option.
```

Add `multiple` for chips and multiple values. Native selections, including the browser's default first selection for a single select, are respected. `placeholder` labels an empty selection; it does not clear an existing value. An option with `value=""` is a real selectable item, not a special placeholder.

Dispose and reinitialize after changing the native `multiple` attribute or form association.

## Options

Options are resolved in this order:

1. Component defaults
2. The element's `data-ui-*` attributes
3. Options passed to `SelectMenu.init()`

Resolved `instance.options` are shallow-frozen.

`SelectMenu.defaults` and `SelectMenu.classes` are static properties defined on the class. Set application-wide defaults before initializing components:

```js
SelectMenu.defaults.fullWidth = true;
SelectMenu.defaults.debounce = 300;
```

Changes to defaults apply to newly created instances. `SelectMenu.classes` contains the structural and state class names used by the component; custom names need matching CSS and should be configured before initialization.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `allowClear` | `boolean` | `false` | Add a clear button for single selection. Multiple chips always have remove buttons. |
| `appendTo` | `string \| HTMLElement \| null` | `null` | Menu insertion target; otherwise insert after the input group or generated control. |
| `closeOnSelect` | `boolean` | `true` | Close after choosing a result. |
| `data` | `array \| object \| null` | `null` | Local items/groups or a value-to-label object; otherwise read native options. |
| `debounce` | `number` | `250` | Remote-search delay in milliseconds. Value resolution is immediate. |
| `duration` | `number` | `100` | Menu opacity transition in milliseconds; reduced motion is respected. |
| `fixed` | `boolean` | `false` | Preserve the preferred placement rather than flip it. |
| `fullWidth` | `boolean` | `false` | Match the menu width to the control. |
| `getResults` | `function \| null` | `null` | Search, paginate, and resolve unknown selected values. |
| `isMatch` | `function` | Case/accent-insensitive label matching | `(item, term) => boolean` for local searches. |
| `lang` | `object` | See below | Interface labels and status messages. |
| `maxHeight` | `string` | `'250px'` | Maximum height of the scrolling results. |
| `maxSelections` | `number` | `0` | Multiple-selection limit; zero means unlimited. |
| `minContact` | `number \| false` | `false` | Minimum Popper contact with the control. |
| `minSearch` | `number` | `0` | Minimum search length before results load. |
| `placeholder` | `string` | `''` | Empty selection label. |
| `placement` | `'auto' \| 'top' \| 'bottom' \| 'start' \| 'end'` | `'bottom'` | Preferred Popper placement. |
| `position` | `'start' \| 'center' \| 'end'` | `'start'` | Menu alignment. |
| `renderResult` | `function` | `(item) => item.text` | Render a result or group label. |
| `renderSelection` | `function` | `(item) => item.text` | Render a selected item. |
| `sanitize` | `function` | `(html) => $.sanitize(html)` | Sanitize strings used as HTML. |
| `searchInputStyle` | `'filled' \| 'outline'` | `'filled'` | Single-select menu search style. The original select's classes control the main input. |
| `sortResults` | `function` | Normalized match position, then label | `(a, b, term) => number` for local searches, ignoring case and accents by default. |
| `spacing` | `number` | `0` | Gap between menu and control. |

Default `lang` values:

```js
const lang = {
    clear: 'Remove selection',
    error: 'Error loading data.',
    loading: 'Loading..',
    maxSelections: 'Selection limit reached.',
    noResults: 'No results',
    search: 'Search',
};
```

### Local data and groups

```js
SelectMenu.init(document.querySelector('#cities'), {
    data: [
        { value: 0, text: 'Brisbane', region: 'Australia' },
        {
            text: 'Europe',
            children: [
                { value: 'paris', text: 'Paris' },
                { value: 'rome', text: 'Rome', disabled: true },
            ],
        },
    ],
});
```

Leaf items have a unique `value` (`string` or `number`), a `text` label, optional `disabled`, and any custom rendering metadata. Groups have `text`, `children`, and optional `disabled`; disabled groups disable their descendants. A simple `{ apple: 'Apple', pear: 'Pear' }` object is also accepted as local data. Native `optgroup` labels and disabled states are preserved.

Local searches flatten groups, filter with `isMatch`, and sort with `sortResults`; without a search term the original grouping/order is retained. Remote results use the order returned by the callback.

Default matching normalizes both the search term and item labels for case and accents, then performs a literal substring search. For example, `CAFÉ` matches both `Cafe` and `Café`. Sorting uses the same normalization, placing earlier matches first and comparing normalized labels when match positions are equal.

### Asynchronous search, values, and pagination

`getResults(request)` returns `{ results: items, showMore?: boolean }` or a promise for that object. The same callback handles two request shapes:

| Request | Meaning |
| --- | --- |
| `{ offset: 0 }` or `{ offset: 0, term: 'pear' }` | First search page; `term` is omitted when empty. |
| `{ offset: 10, term: 'pear' }` | Next page. Offset counts previously returned top-level items/groups, not group children. |
| `{ value: 'pear' }` or `{ value: ['apple', 'pear'] }` | Resolve selected values absent from the lookup, including programmatic values. Return their items in `results`. |

This self-contained example simulates a paginated service:

```js
const cities = Array.from({ length: 30 }, (_, index) => ({
    value: index,
    text: `City ${index + 1}`,
}));

const selectMenu = SelectMenu.init(document.querySelector('#cities'), {
    getResults: async (request) => {
        await new Promise((resolve) => setTimeout(resolve, 400));

        if ('value' in request) {
            const values = [request.value].flat().map(String);
            return { results: cities.filter((item) => values.includes(String(item.value))) };
        }

        const matches = cities.filter((item) =>
            item.text.toLowerCase().includes((request.term || '').toLowerCase()));
        const offset = request.offset || 0;
        return {
            results: matches.slice(offset, offset + 10),
            showMore: offset + 10 < matches.length,
        };
    },
});

selectMenu.setValue(0); // Unknown values are resolved asynchronously.
```

Scrolling near the bottom requests another page when `showMore` is true. Short pages load automatically until the list can scroll or pagination ends; an empty page stops further loading. Remote filtering, ordering, and pagination are the callback's responsibility. An empty first page displays `lang.noResults`; an empty later page keeps the existing results. Thrown/rejected searches display `lang.error`. Search again or reopen to retry. A failed value lookup retains the previous selection.

Provide selected native options with labels for initial remote values, or call `setValue()` after initialization. Existing native items already in the lookup do not trigger value resolution. `setValue()` returns `void`, even for remote data; it is not an awaitable loading API.

New searches cancel pending debounce work and invalidate prior search results. Closing cancels search work; a new value assignment invalidates earlier value lookups; disposal cancels both. If the returned object/promise exposes `cancel()`, the component calls it. Otherwise the operation may continue, but stale results cannot mutate the component. For `fetch`, attach a `cancel()` method to your returned promise that calls an `AbortController`'s `abort()`.

### Rendering and sanitization

Both renderers receive `(item, element)`. Return an HTML string, return an `HTMLElement`, or fill the destination and return nothing:

```js
SelectMenu.init(document.querySelector('#cities'), {
    data: [{ value: 'brisbane', text: 'Brisbane', region: 'Australia' }],
    renderResult(item, element) {
        const label = document.createElement('strong');
        label.textContent = item.text;
        element.append(label);
        if (item.region) {
            element.append(document.createTextNode(` — ${item.region}`));
        }
    },
    renderSelection: (item) => item.text,
});
```

Renderer items are copies without internal DOM references. Returned strings, placeholders, and status messages pass through `sanitize`. Returned DOM nodes and direct DOM changes bypass string sanitization; use `textContent` for untrusted text. Native option labels remain plain text for forms and disposal. Group labels also pass through `renderResult`, so handle items without `value`. Result accessible names come from `item.text`; include essential identifying information there as well as in custom markup.

## Data attributes

Use kebab-case `data-ui-*` attributes for serializable options. Arrays and objects use JSON. Supply callbacks and DOM nodes through JavaScript.

| Attribute | Example |
| --- | --- |
| `data-ui-allow-clear` | `data-ui-allow-clear="true"` |
| `data-ui-close-on-select` | `data-ui-close-on-select="false"` |
| `data-ui-debounce` | `data-ui-debounce="300"` |
| `data-ui-full-width` | `data-ui-full-width="true"` |
| `data-ui-max-selections` | `data-ui-max-selections="3"` |
| `data-ui-min-search` | `data-ui-min-search="2"` |
| `data-ui-placeholder` | `data-ui-placeholder="Choose a fruit"` |
| `data-ui-search-input-style` | `data-ui-search-input-style="outline"` |

```html
<select
    id="tags"
    class="input-filled"
    multiple
    data-ui-toggle="selectmenu"
    data-ui-placeholder="Choose up to three tags"
    data-ui-max-selections="3"
    data-ui-close-on-select="false"
    data-ui-full-width="true">
    <option value="design">Design</option>
    <option value="development">Development</option>
    <option value="testing">Testing</option>
</select>
```

Array and object options accept JSON, for example `data-ui-data='[{"value":"a","text":"Apple"}]'`. Supply callbacks and DOM elements through JavaScript.

```js
import $ from '@fr0st/query';
import '@fr0st/ui-selectmenu';

$('[data-ui-toggle="selectmenu"]').selectmenu();
```

Data attributes configure options; they do not initialize SelectMenu by themselves. Initialize the component through the class or fQuery plugin. Changing an option's data attribute after initialization does not reconfigure the existing instance.

## Methods

| Method | Returns | Description |
| --- | --- | --- |
| `SelectMenu.init(node, options?)` | `SelectMenu` | Return the existing instance for an element or create one. |
| `data()` | `object \| object[] \| null` | Copies of selected item data, without internal DOM references. |
| `disable()` | `void` | Disable the native and generated controls and close the menu. |
| `dispose()` | `void` | Cancel owned work, remove generated markup/listeners, and restore the native control. |
| `enable()` | `void` | Enable the native control and refresh the generated disabled state. |
| `getMaxSelections()` | `number` | Current selection limit; zero means unlimited. |
| `getPlaceholder()` | `string` | Current empty selection label. |
| `getValue()` | `string \| number \| array \| null` | Selected value, a copied multiple-value array, or `null` for no single selection. |
| `hide()` | `void` | Close the menu and cancel pending search work. |
| `setMaxSelections(limit)` | `void` | Change the limit, silently truncating excess selections. |
| `setPlaceholder(text)` | `void` | Change the empty selection label. |
| `setValue(value)` | `void` | Silently select known values or resolve unknown remote values. Use `null` to clear. |
| `show()` | `void` | Open the menu and load results for the current search. |
| `toggle()` | `void` | Open or close the menu. |
| `update()` | `SelectMenu` | Reposition an open menu; does not reload native options or configuration. |

Values use native string keys: numeric `0` and string `'0'` refer to the same item, so do not use both as separate keys. Returned values use the matched item's type; native option values are strings. Empty strings and zero are valid. Multiple inputs accept arrays, scalars (one selection), or nullish values (clear), deduplicate keys, drop unresolved values, and respect `maxSelections`. A single select uses the first resolved value. Programmatic assignments can select disabled items; user interaction cannot.

```js
selectMenu.setValue('banana');
console.log(selectMenu.getValue());
console.log(selectMenu.data());
selectMenu.setValue(null); // Clear the selection.
selectMenu.setPlaceholder('Select a fruit');
selectMenu.dispose();
```

## Lifecycle

Calling `SelectMenu.init()` again for the same element returns its existing instance. Dispose the current instance before reinitializing with different options.

An instance exposes its original element as `instance.node` and its shallow-frozen resolved configuration as `instance.options`. Both become `null` after disposal.

`dispose()` releases resources owned by the component and removes its registered instance. Repeated disposal is safe and does not affect a new instance initialized on the same element. Use a new instance before calling other methods after disposal.

If initialization fails, the component releases resources it created and removes its registered instance before rethrowing the error. The element can then be initialized again.

## Events

Events originate on the original select:

| Event | Description |
| --- | --- |
| `change.ui.selectmenu` | User selection, clearing, chip removal, or Backspace changed the value. |
| `show.ui.selectmenu` | Before opening; cancel with `event.preventDefault()`. |
| `shown.ui.selectmenu` | Opening transition completed. |
| `hide.ui.selectmenu` | Before closing; cancel with `event.preventDefault()`. |
| `hidden.ui.selectmenu` | Closing transition completed. |

```js
import $ from '@fr0st/query';

$.addEvent(
    '#fruit',
    'change.ui.selectmenu',
    (event) => {
        console.log(SelectMenu.init(event.currentTarget).getValue());
    },
);
```

fQuery exposes the namespace on `event.namespace`; the underlying native event type is `change`, `show`, etc. Initialization, `setValue()`, limit changes, and form resets are silent. Re-selecting the current value in single mode does not emit another change. In multiple mode, choosing a selected result removes it and emits a change. Lifecycle listeners may dispose the component; interrupted transitions do not emit stale completion events.

## fQuery API

Importing SelectMenu registers `selectmenu` on `fQuery.QuerySet`:

```js
import $ from '@fr0st/query';
import '@fr0st/ui-selectmenu';

const selectMenu = $('#fruit').selectmenu({
    allowClear: true,
});

$('#fruit').selectmenu('setValue', 'banana');

const value = $('#fruit').selectmenu('getValue');

$('#fruit').selectmenu('show');
$('#fruit').selectmenu('hide');
$('#fruit').selectmenu('disable');
$('#fruit').selectmenu('enable');
$('#fruit').selectmenu('dispose');
```

Pass an options object to initialize every matched element, or pass a public method name followed by its arguments. The first component or method result is returned.

## Accessibility

- Label the native select with `<label for>`, `aria-label`, or `aria-labelledby`. Generated comboboxes inherit its accessible name.
- `aria-describedby`, `aria-errormessage`, and `aria-invalid` are copied at initialization. Set them before initialization, or update the generated control when changing feedback dynamically.
- Native `required` and disabled state, including disabled ancestor fieldsets, are synchronized. Invalid native focus is redirected to the visible control.
- Combobox/listbox relationships, expanded state, active descendants, selected options, and disabled options are exposed through ARIA.
- Arrow keys navigate results; Enter selects without submitting the form; Escape closes; Tab moves focus away and closes the menu.
- Multiple-selection Backspace with an empty search removes the last selection and places its label into the search field.
- Clear/remove controls are native keyboard-operable buttons. Translate interface text through `lang`.

The native select stays in the form but is visually hidden while active. Disposal restores its original hidden state, `tabindex`, and `aria-hidden` while retaining its options, groups, defaults, and current selection.

## Forms

Use the original select's `name`, `required`, `multiple`, and `disabled` attributes normally. `FormData` reads the synchronized native selection; use `formData.getAll(name)` for multiple values. Disabled fields are excluded. Unknown remote items are appended as native options only when selected.

```html
<form id="fruit-form">
    <label for="fruit">Fruit</label>
    <select class="input-outline" id="fruit" name="fruit" required>
        <option value="apple" selected>Apple</option>
        <option value="banana">Banana</option>
    </select>
    <button type="submit">Submit</button>
    <button type="reset">Reset</button>
</form>
```

Form reset restores native defaults and then synchronizes the visible selection asynchronously. Generated options do not become implicit reset defaults for an initially empty select; an explicit `defaultSelected` is respected. Canceled resets are ignored; resetting does not emit a change event. The associated form is captured at initialization, including association via the native `form` attribute.

When native options provide the result data, option and group additions, removals, text changes, and changes to `value`, `label`, `disabled`, or `selected` attributes synchronize automatically and silently. Open results refresh while retaining the search term and the focused value when available. Explicit `data` and remote results remain their own data sources.

To synchronize an external native value change, dispatch a bubbling `change` event after changing the select. Assigning `select.value` or `option.selected` does not produce an attribute mutation. `update()` only repositions the menu.

## Themes and RTL

Frost UI follows the user's preferred color scheme by default. Set `data-ui-theme="light"` or `data-ui-theme="dark"` on the document or an ancestor to select a theme explicitly.

Load UI CSS before SelectMenu CSS. Apply `input-filled` or `input-outline` to the select, with optional `input-sm` / `input-lg`. Multiple mode uses the same classes. Floating labels, input groups, and modal-contained menus are demonstrated in [the demo](./demo/index.html).

The component uses UI theme tokens. UI follows the system theme unless `data-ui-theme="light"` or `data-ui-theme="dark"` is set on the document or an ancestor. Menus appended outside a scoped theme need that theme on their destination too.

Customize the menu's CSS properties, for example:

```css
.selectmenu-menu {
    --ui-selectmenu-item-padding-y: .5rem;
    --ui-selectmenu-group-color: var(--ui-primary);
}
```

Set `dir="rtl"` on the document, an ancestor, or the select before initialization. The generated control/menu copy the computed direction; logical spacing and Popper start/end placement follow it. Reinitialize after changing direction dynamically.

### Custom Sass builds

Install Sass and create an application stylesheet to customize the component:

```bash
npm i -D sass
```

`src/styles.scss`

```scss
@use "@fr0st/ui-selectmenu/src/scss/selectmenu" with (
    $selectmenu-multi-btn-bg: var(--ui-info),
    $selectmenu-multi-btn-color: var(--ui-info-contrast)
);
```

Compile the entry point with npm package resolution enabled:

```bash
npx sass --load-path=node_modules src/styles.scss dist/styles.css
```

The `selectmenu` module forwards the [component variables](./src/scss/_vars.scss), all of which have `!default` values. Include Frost UI CSS separately. Build tools that already resolve Sass modules from npm packages do not need the explicit load path.

## Development

Install dependencies with `npm ci`, then install Playwright browsers with `npx playwright install --with-deps`.

```bash
npm test
npm run lint
npm run build
```

`npm test` rebuilds the bundles, then runs the Playwright suite in Chromium, Firefox, and WebKit. `npm run test:browser` runs the suite against the existing bundles, so rebuild after changing source files.

After building, `npm run test:coverage` runs Chromium tests and writes coverage reports to `coverage/`.

`npm run test:headed` and `npm run test:ui` also use the existing bundles and open headed browsers or the Playwright UI.

To view the demo, open `demo/index.html` in your browser after building.

## License

Frost UI SelectMenu is released under the [MIT License](./LICENSE).
