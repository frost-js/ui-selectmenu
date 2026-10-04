import $ from '@fr0st/query';
import { BaseComponent, generateId, Popper, waitForTransition } from '@fr0st/ui';
import { cloneItem, containsNode, flattenItems, getDomData, normalizeText, normalizeValues } from './helpers.js';

const ariaAttributes = [
    'aria-describedby',
    'aria-errormessage',
    'aria-invalid',
    'aria-required',
];

/** @typedef {string|number} SelectMenuValue */
/**
 * @typedef {object} SelectMenuItem
 * @property {string} text The displayed label.
 * @property {SelectMenuValue} [value] The option value, omitted for groups.
 * @property {boolean} [disabled=false] Whether user selection is disabled.
 * @property {SelectMenuItem[]} [children] The group's items.
 * @property {HTMLOptionElement} [element] The internal native option.
 */
/**
 * @typedef {object} SelectMenuResults
 * @property {SelectMenuItem[]} results The returned items or groups.
 * @property {boolean} [showMore=false] Whether another page is available.
 */
/**
 * @typedef {object} SelectMenuRequest
 * @property {number} [offset] The number of previously loaded top-level results.
 * @property {string} [term] The search term, omitted when empty.
 * @property {SelectMenuValue|SelectMenuValue[]} [value] Values to resolve instead of searching.
 */
/**
 * @typedef {object} SelectMenuLanguage
 * @property {string} [clear] The selection removal label.
 * @property {string} [error] The loading error message.
 * @property {string} [loading] The loading message.
 * @property {string} [maxSelections] The selection limit message.
 * @property {string} [noResults] The empty results message.
 * @property {string} [search] The search input label.
 */
/**
 * @callback SelectMenuRenderer
 * @param {SelectMenuItem} data A copy of the item, without internal DOM references.
 * @param {HTMLElement} element The rendering destination, which can be filled directly.
 * @returns {string|HTMLElement|void} HTML to sanitize, an element, or nothing.
 */
/** @typedef {(SelectMenuResults|PromiseLike<SelectMenuResults>) & {cancel?: Function}} SelectMenuPendingResults */
/**
 * @callback SelectMenuGetResultsCallback
 * @param {SelectMenuRequest} request The search or value request.
 * @returns {SelectMenuPendingResults} Results or a promise, optionally exposing a cancel method.
 */
/**
 * @callback SelectMenuSanitizeCallback
 * @param {string} html The rendered HTML.
 * @returns {string} The sanitized HTML.
 */
/**
 * @callback SelectMenuMatchCallback
 * @param {SelectMenuItem} item The item to match.
 * @param {string} term The search term.
 * @returns {boolean} Whether the item matches.
 */
/**
 * @callback SelectMenuSortCallback
 * @param {SelectMenuItem} a The first item.
 * @param {SelectMenuItem} b The second item.
 * @param {string} term The search term.
 * @returns {number} The relative sort order.
 */
/**
 * @typedef {object} SelectMenuOptions
 * @property {string} [placeholder=''] The empty selection label.
 * @property {SelectMenuLanguage} [lang] The translated interface labels.
 * @property {'filled'|'outline'} [searchInputStyle='filled'] The search input style.
 * @property {SelectMenuItem[]|Record<string, string>|null} [data=null] Local data; defaults to native options.
 * @property {SelectMenuGetResultsCallback|null} [getResults=null] Loads search results or resolves values.
 * @property {SelectMenuRenderer} [renderResult] Renders a result or group label.
 * @property {SelectMenuRenderer} [renderSelection] Renders a selected item.
 * @property {SelectMenuSanitizeCallback} [sanitize] Sanitizes rendered HTML.
 * @property {SelectMenuMatchCallback} [isMatch] Matches a local result.
 * @property {SelectMenuSortCallback} [sortResults] Sorts local search results.
 * @property {number} [maxSelections=0] The selection limit; zero is unlimited.
 * @property {number} [minSearch=0] The minimum search length.
 * @property {boolean} [allowClear=false] Shows a clear button for single selection.
 * @property {boolean} [closeOnSelect=true] Closes the menu after selection.
 * @property {number} [debounce=250] The remote search debounce in milliseconds.
 * @property {number} [duration=100] The opacity transition duration, respecting reduced motion.
 * @property {string} [maxHeight='250px'] The results' maximum height.
 * @property {string|HTMLElement|null} [appendTo=null] The menu's insertion target.
 * @property {boolean} [fullWidth=false] Matches the reference width after positioning.
 * @property {'auto'|'top'|'bottom'|'start'|'end'} [placement='bottom'] The preferred menu placement.
 * @property {'start'|'center'|'end'} [position='start'] The menu alignment.
 * @property {boolean} [fixed=false] Whether to preserve the preferred placement.
 * @property {number} [spacing=0] The spacing from the control.
 * @property {number|false} [minContact=false] The minimum contact with the control.
 */

/**
 * Controls a searchable native select with single or multiple selection.
 * @augments {BaseComponent<SelectMenuOptions>}
 */
export default class SelectMenu extends BaseComponent {
    // SelectMenu classes
    static classes = {
        active: 'active',
        clear: 'btn-close',
        container: 'form-input selectmenu-container',
        disabled: 'disabled',
        disabledItem: 'disabled',
        focus: 'focus',
        group: 'selectmenu-group',
        groupContainer: 'selectmenu-group-container list-unstyled',
        hide: 'visually-hidden',
        info: 'selectmenu-item text-body-secondary',
        item: 'selectmenu-item',
        items: 'selectmenu-items list-unstyled',
        menu: 'selectmenu-menu',
        menuSmall: 'selectmenu-menu-sm',
        menuLarge: 'selectmenu-menu-lg',
        multiClear: 'btn',
        multiClearIcon: 'btn-close p-0 my-auto pe-none',
        multiGroup: 'btn-group my-n1',
        multiItem: 'btn selectmenu-selection',
        multiSearchInput: 'selectmenu-multi-input',
        multiToggle: 'selectmenu-multi d-flex flex-wrap position-relative text-start',
        placeholder: 'selectmenu-placeholder',
        searchContainer: 'form-input',
        searchInputFilled: 'input-filled',
        searchInputOutline: 'input-outline',
        searchOuter: 'p-1',
        selectionSingle: 'selectmenu-selection me-auto',
        toggle: 'selectmenu-toggle d-flex position-relative justify-content-between text-start flex-grow-1',
    };
    /** @type {SelectMenuOptions} */
    static defaults = {
        placeholder: '',
        lang: {
            clear: 'Remove selection',
            error: 'Error loading data.',
            loading: 'Loading..',
            maxSelections: 'Selection limit reached.',
            noResults: 'No results',
            search: 'Search',
        },
        searchInputStyle: 'filled',
        data: null,
        getResults: null,
        renderResult: (data) => data.text,
        renderSelection: (data) => data.text,
        sanitize: (input) => $.sanitize(input),
        isMatch(data, term) {
            return normalizeText(data.text).includes(normalizeText(term));
        },
        sortResults(a, b, term) {
            const aNormalized = normalizeText(a.text);
            const bNormalized = normalizeText(b.text);
            const termNormalized = normalizeText(term);
            const diff = aNormalized.indexOf(termNormalized) - bNormalized.indexOf(termNormalized);

            return diff || aNormalized.localeCompare(bNormalized);
        },
        maxSelections: 0,
        minSearch: 0,
        allowClear: false,
        closeOnSelect: true,
        debounce: 250,
        duration: 100,
        maxHeight: '250px',
        appendTo: null,
        fullWidth: false,
        placement: 'bottom',
        position: 'start',
        fixed: false,
        spacing: 0,
        minContact: false,
    };

    #activeItems = [];
    #ariaHidden;
    #changeHandler = null;
    #container = null;
    #data = [];
    #documentHandler = null;
    #focusedItem = null;
    #focusHandler = null;
    #form = null;
    #generatedOptions = new WeakSet();
    #hidden;
    #itemsList = null;
    #loading = false;
    #loadResults = null;
    #lookup = new Map();
    #maxSelections;
    #menuNode = null;
    #multiple;
    #notifying = false;
    #observer = null;
    #open = false;
    #placeholderText;
    #popper = null;
    #request = null;
    #requestId = 0;
    #resetHandler = null;
    #resetTimer;
    #scrollHandler = null;
    #searchInput = null;
    #showMore = false;
    #tabIndex;
    #toggle = null;
    #transitionId = 0;
    #value = null;
    #valueRequest = null;
    #valueRequestId = 0;

    /**
     * Creates a SelectMenu.
     * @param {HTMLSelectElement} node The native select.
     * @param {SelectMenuOptions} [options] The component options.
     */
    constructor(node, options) {
        if (!$.is(node, 'select')) {
            throw new Error('SelectMenu must be created on a select element');
        }

        super(node, options);

        try {
            this.#tabIndex = $.getAttribute(this.node, 'tabindex');
            this.#hidden = $.hasClass(this.node, this.constructor.classes.hide);
            this.#ariaHidden = $.getAttribute(this.node, 'aria-hidden');

            this.#multiple = $.getProperty(this.node, 'multiple');
            this.#value = this.#multiple ? [] : null;
            this.#maxSelections = Math.max(0, Number(this.options.maxSelections) || 0);
            this.#placeholderText = this.options.placeholder;

            this.#form = $.getProperty(this.node, 'form');

            const nativeData = getDomData(this.node);

            // Keep native values available even when configured data omits them.
            for (const item of flattenItems(nativeData)) {
                if (!this.#lookup.has(String(item.value))) {
                    this.#lookup.set(String(item.value), item);
                }
            }

            const initialValue = this.#readNativeValue();
            const data = $._isPlainObject(this.options.data) ?
                Object.entries(this.options.data).map(([value, text]) => ({ value, text })) :
                this.options.data;

            this.#data = this.#parseData(data || nativeData);

            this.#loadResults = $._debounce(
                (request, id, focusedValue) => this.#fetchResults(request, id, focusedValue),
                this.options.debounce,
            );

            const focused = $.is(this.node, ':focus');

            this.#render();
            this.#events();
            this.#loadValue(initialValue);

            if (focused) {
                $.focus(this.#multiple ? this.#searchInput : this.#toggle);
            }
        } catch (error) {
            this.dispose();
            throw error;
        }
    }

    /**
     * Gets copies of the selected data without internal DOM references.
     * @returns {SelectMenuItem|SelectMenuItem[]|null} The selected data.
     */
    data() {
        if (this.#value === null) {
            return null;
        }

        return this.#multiple ?
            this.#value.map((value) => cloneItem(this.#lookup.get(String(value)))) :
            cloneItem(this.#lookup.get(String(this.#value))) || null;
    }

    /**
     * Disables the SelectMenu.
     */
    disable() {
        $.setProperty(this.node, { disabled: true });
        this.#refreshState();
        this.hide();
    }

    /** @inheritdoc */
    dispose() {
        if (!this.node) {
            return;
        }

        this.#transitionId++;
        this.#cancelSearch();
        this.#cancelValueRequest();
        clearTimeout(this.#resetTimer);
        this.#scrollHandler?.cancel();

        this.#observer?.disconnect();
        this.#popper?.dispose();

        if (this.#focusHandler) {
            $.removeEvent(this.node, 'focus.ui.selectmenu', this.#focusHandler);
        }

        if (this.#changeHandler) {
            $.removeEvent(this.node, 'change.ui.selectmenu', this.#changeHandler);
        }

        if (this.#documentHandler) {
            $.removeEvent(this.node.ownerDocument, 'mousedown.ui.selectmenu', this.#documentHandler);
        }

        if (this.#form && this.#resetHandler) {
            $.removeEvent(this.#form, 'reset.ui.selectmenu', this.#resetHandler);
        }

        if (this.#hidden) {
            $.addClass(this.node, this.constructor.classes.hide);
        } else {
            $.removeClass(this.node, this.constructor.classes.hide);
        }

        for (const [name, value] of [['tabindex', this.#tabIndex], ['aria-hidden', this.#ariaHidden]]) {
            if (value === null) {
                $.removeAttribute(this.node, name);
            } else {
                $.setAttribute(this.node, { [name]: value });
            }
        }

        $.remove(this.#menuNode);
        $.remove(this.#container);

        this.#activeItems = [];
        this.#data = [];
        this.#focusedItem = null;
        this.#lookup.clear();

        this.#changeHandler = null;
        this.#documentHandler = null;
        this.#focusHandler = null;
        this.#resetHandler = null;

        this.#container = null;
        this.#form = null;
        this.#itemsList = null;
        this.#menuNode = null;
        this.#observer = null;
        this.#popper = null;
        this.#searchInput = null;
        this.#toggle = null;
        this.#loadResults = null;
        this.#scrollHandler = null;
        this.#value = null;
        this.#open = false;

        super.dispose();
    }

    /**
     * Enables the SelectMenu.
     */
    enable() {
        $.setProperty(this.node, { disabled: false });
        this.#refreshState();
    }

    /**
     * Gets the selection limit.
     * @returns {number} The limit, or zero for unlimited selections.
     */
    getMaxSelections() {
        return this.#maxSelections;
    }

    /**
     * Gets the empty selection label.
     * @returns {string} The placeholder.
     */
    getPlaceholder() {
        return this.#placeholderText;
    }

    /**
     * Gets the selected values without exposing the internal array.
     * @returns {SelectMenuValue|SelectMenuValue[]|null} The current selection.
     */
    getValue() {
        return this.#multiple ? this.#value.slice() : this.#value;
    }

    /**
     * Hides the menu, allowing interruption of an opening transition.
     */
    hide() {
        if (
            !this.node ||
            !this.#open ||
            !$.triggerOne(this.node, 'hide.ui.selectmenu') ||
            !this.node
        ) {
            return;
        }

        this.#open = false;
        this.#refreshFocus();

        this.#cancelSearch();
        this.#scrollHandler.cancel();

        $.setValue(this.#searchInput, '');
        this.#updateSearchWidth();

        this.#focusItem(null);
        $.setAttribute(this.#multiple ? this.#searchInput : this.#toggle, { 'aria-expanded': false });
        this.#refreshPlaceholder();

        const id = ++this.#transitionId;
        $.removeClass(this.#menuNode, 'show');

        waitForTransition(this.#menuNode, ['opacity']).then(() => {
            if (!this.node || id !== this.#transitionId) {
                return;
            }

            this.#popper?.dispose();
            this.#popper = null;
            $.detach(this.#menuNode);
            this.#clearResults();

            $.triggerEvent(this.node, 'hidden.ui.selectmenu');
        });
    }

    /**
     * Sets the selection limit and silently normalizes the selection.
     * @param {number} maxSelections The limit, or zero for unlimited selections.
     */
    setMaxSelections(maxSelections) {
        this.#maxSelections = Math.max(0, Number(maxSelections) || 0);
        this.#loadValue(this.#readNativeValue());
    }

    /**
     * Sets the empty selection label.
     * @param {string} placeholder The placeholder.
     */
    setPlaceholder(placeholder) {
        this.#placeholderText = String(placeholder ?? '');
        this.#refreshPlaceholder();
    }

    /**
     * Silently selects values, resolving remote values when necessary.
     * @param {SelectMenuValue|SelectMenuValue[]|null} value The selection; null clears it.
     */
    setValue(value) {
        this.#loadValue(value);
    }

    /**
     * Shows the menu, allowing interruption of a closing transition.
     */
    show() {
        if (
            !this.node ||
            this.#open ||
            $.is(this.node, ':disabled') ||
            !$.triggerOne(this.node, 'show.ui.selectmenu') ||
            !this.node
        ) {
            return;
        }

        this.#open = true;
        this.#refreshFocus();
        const id = ++this.#transitionId;

        if (this.options.appendTo) {
            $.append(this.options.appendTo, this.#menuNode);
        } else {
            // The menu's search input must not affect UI input-group styling.
            $.after($.closest(this.#container, '.input-group')[0] || this.#container, this.#menuNode);
        }

        $.show(this.#menuNode);
        this.#load();

        if (!this.node) {
            return;
        }

        this.#createPopper();

        $.css(this.#menuNode, 'opacity');
        $.addClass(this.#menuNode, 'show');

        waitForTransition(this.#menuNode, ['opacity']).then(() => {
            if (this.node && id === this.#transitionId) {
                $.triggerEvent(this.node, 'shown.ui.selectmenu');
            }
        });
    }

    /**
     * Toggles the menu.
     */
    toggle() {
        if (this.#open) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Updates the menu position.
     * @returns {SelectMenu} The component.
     */
    update() {
        this.#popper?.update();

        return this;
    }

    /**
     * Cancels pending search work and invalidates its responses.
     */
    #cancelSearch() {
        this.#requestId++;
        this.#loadResults?.cancel();

        const request = this.#request;
        this.#request = null;
        this.#loading = false;

        try {
            request?.cancel?.();
        } catch {
            // Consumer cancellation errors must not interrupt cleanup.
        }
    }

    /**
     * Cancels a pending value lookup and invalidates its response.
     */
    #cancelValueRequest() {
        this.#valueRequestId++;

        const request = this.#valueRequest;
        this.#valueRequest = null;

        try {
            request?.cancel?.();
        } catch {
            // Consumer cancellation errors must not interrupt cleanup.
        }
    }

    /**
     * Clears result nodes and their active descendant references.
     */
    #clearResults() {
        this.#focusItem(null);
        this.#activeItems = [];
        $.empty(this.#itemsList);
    }

    /**
     * Creates the menu Popper when positioning is first needed.
     */
    #createPopper() {
        if (this.#popper) {
            return;
        }

        const options = {
            reference: this.#toggle,
            placement: this.options.placement,
            position: this.options.position,
            fixed: this.options.fixed,
            spacing: this.options.spacing,
            minContact: this.options.minContact,
        };

        if (this.options.fullWidth) {
            options.beforeUpdate = (node, reference) => {
                const width = `${$.width(reference, { boxSize: $.BORDER_BOX })}px`;

                $.setStyle(node, { width, minWidth: width, maxWidth: width });
            };
        }

        this.#popper = new Popper(this.#menuNode, options);
    }

    /**
     * Attaches control events and native form synchronization.
     */
    #events() {
        this.#focusHandler = () => {
            $.focus(this.#multiple ? this.#searchInput : this.#toggle);
        };

        this.#changeHandler = () => {
            if (!this.#notifying) {
                this.#loadValue(this.#readNativeValue());
            }
        };

        $.addEvent(this.node, 'focus.ui.selectmenu', this.#focusHandler);
        $.addEvent(this.node, 'change.ui.selectmenu', this.#changeHandler);

        if (this.#form) {
            this.#resetHandler = (event) => {
                clearTimeout(this.#resetTimer);
                this.#resetTimer = setTimeout(() => {
                    if (this.node && !event.defaultPrevented) {
                        const [selected] = $.getProperty(this.node, 'selectedOptions');

                        // Native reset can select a generated option even when the original select was empty.
                        if (
                            !this.#multiple &&
                            this.#generatedOptions.has(selected) &&
                            !$.getProperty(selected, 'defaultSelected')
                        ) {
                            $.setProperty(this.node, { selectedIndex: -1 });
                        }

                        this.#loadValue(this.#readNativeValue());
                        this.hide();
                    }
                }, 0);
            };

            $.addEvent(this.#form, 'reset.ui.selectmenu', this.#resetHandler);
        }

        this.#documentHandler = (event) => {
            if (
                this.#open &&
                !containsNode(this.#container, event.target) &&
                !containsNode(this.#menuNode, event.target)
            ) {
                this.hide();
            }
        };

        $.addEvent(this.node.ownerDocument, 'mousedown.ui.selectmenu', this.#documentHandler);
        $.addEvent([this.#container, this.#menuNode], 'focusin.ui.selectmenu', () => this.#refreshFocus());
        $.addEvent([this.#container, this.#menuNode], 'focusout.ui.selectmenu', () => {
            queueMicrotask(() => {
                if (
                    this.node &&
                    this.#open &&
                    !containsNode(this.#container, this.node.ownerDocument.activeElement) &&
                    !containsNode(this.#menuNode, this.node.ownerDocument.activeElement)
                ) {
                    this.hide();
                }

                if (this.node) {
                    this.#refreshFocus();
                }
            });
        });

        $.addEvent(this.#menuNode, 'mousedown.ui.selectmenu', (event) => {
            if (event.target !== this.#searchInput) {
                event.preventDefault();
            }
        });

        $.addEvent(this.#menuNode, 'click.ui.selectmenu', (event) => event.stopPropagation());

        // Selection keys use raw attributes to preserve strings such as "001" and "true".
        $.addEventDelegate(
            this.#menuNode,
            'click.ui.selectmenu',
            '[data-ui-action="select"]',
            (event) => this.#selectValue($.getAttribute(event.currentTarget, 'data-ui-value')),
        );

        $.addEventDelegate(
            this.#itemsList,
            'mouseover.ui.selectmenu',
            '[data-ui-action="select"]',
            (event) => this.#focusItem(event.currentTarget),
        );

        $.addEventDelegate(
            this.#container,
            'click.ui.selectmenu',
            '[data-ui-action="clear"]',
            (event) => {
                if ($.is(this.node, ':disabled')) {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();

                const key = $.getAttribute(event.currentTarget, 'data-ui-value');
                const value = this.#multiple ?
                    this.#value.filter((item) => String(item) !== key) :
                    null;

                this.#cancelValueRequest();
                this.#setValue(value, true);

                if (this.node) {
                    this.hide();
                    $.focus(this.#multiple ? this.#searchInput : this.#toggle);
                }
            },
        );

        $.addEvent(this.#container, 'click.ui.selectmenu', (event) => {
            if (!this.node || event.defaultPrevented || $.is(this.node, ':disabled')) {
                return;
            }

            if (this.#multiple) {
                $.focus(this.#searchInput);
                this.show();
            } else {
                this.toggle();

                if (this.#open) {
                    $.focus(this.#searchInput);
                }
            }
        });

        $.addEvent(this.#searchInput, 'input.ui.selectmenu', () => {
            if ($.is(this.node, ':disabled')) {
                return;
            }

            this.#updateSearchWidth();

            if (this.#multiple) {
                this.#refreshPlaceholder();
            }

            if (this.#open) {
                this.#load();
            } else {
                this.show();
            }
        });

        $.addEvent(this.#searchInput, 'keydown.ui.selectmenu', (event) => {
            if ($.is(this.node, ':disabled') || event.isComposing) {
                return;
            }

            if (
                event.key === 'Backspace' &&
                this.#multiple &&
                !$.getValue(this.#searchInput) &&
                this.#value.length
            ) {
                event.preventDefault();

                const item = this.#lookup.get(String(this.#value.at(-1)));

                this.#cancelValueRequest();
                this.#setValue(this.#value.slice(0, -1), true);

                if (this.node) {
                    $.setValue(this.#searchInput, item.text);
                    this.#updateSearchWidth();
                    this.#refreshPlaceholder();

                    if (this.#open) {
                        this.#load();
                    } else {
                        this.show();
                    }
                }
            } else if (event.key === 'Escape' && this.#open) {
                event.preventDefault();
                event.stopPropagation();
                this.hide();

                if (this.node) {
                    $.focus(this.#multiple ? this.#searchInput : this.#toggle);
                }
            } else if (['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) {
                event.preventDefault();

                if (!this.#open) {
                    this.show();

                    return;
                }

                if (event.key === 'Enter') {
                    if (this.#focusedItem) {
                        this.#selectValue($.getAttribute(this.#focusedItem, 'data-ui-value'));
                    }
                } else {
                    const index = this.#activeItems.indexOf(this.#focusedItem);
                    const next = index < 0 ? 0 : index + (event.key === 'ArrowDown' ? 1 : -1);
                    const option = this.#activeItems[next];

                    if (option) {
                        this.#focusItem(option);
                        $._callDomMethod(option, 'scrollIntoView', { block: 'nearest' });
                    }
                }
            }
        });

        if (!this.#multiple) {
            $.addEvent(this.#toggle, 'keydown.ui.selectmenu', (event) => {
                if (
                    $.is(this.node, ':disabled') ||
                    event.ctrlKey ||
                    event.altKey ||
                    event.metaKey ||
                    event.isComposing
                ) {
                    return;
                }

                if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key) || event.key.length === 1) {
                    event.preventDefault();

                    if (event.key.length === 1 && event.key !== ' ') {
                        $.setValue(this.#searchInput, event.key);
                    }

                    this.show();

                    if (this.#open) {
                        $.focus(this.#searchInput);
                    }
                }
            });
        }

        this.#scrollHandler = $._throttle(() => {
            if (!this.node || !this.#open || this.#loading || !this.#showMore) {
                return;
            }

            const list = this.#itemsList;

            if ($.getScrollY(list) >= $.height(list, { boxSize: $.SCROLL_BOX }) - $.height(list) * 1.25) {
                this.#load(this.#data.length);
            }
        }, 250, { leading: false });

        $.addEvent(this.#itemsList, 'scroll.ui.selectmenu', this.#scrollHandler);

        const nativeData = !this.options.data && !this.options.getResults;

        this.#observer = new MutationObserver((records) => {
            if (!this.node) {
                return;
            }

            if (this.#refreshData(records)) {
                // Rebuilding results replaces nodes, so restore focus using the option value.
                const focusedValue = $.getAttribute(this.#focusedItem, 'data-ui-value');
                this.#loadValue(this.#readNativeValue());
                this.#restoreFocus(focusedValue);
            } else {
                this.#refreshState();
            }

            if ($.is(this.node, ':disabled')) {
                this.hide();
            }
        });

        this.#observer.observe(this.node, {
            attributes: true,
            attributeFilter: [
                'disabled', 'required', 'aria-label', 'aria-labelledby',
                ...ariaAttributes,
                'value', 'label', 'selected',
            ],
            childList: nativeData,
            characterData: nativeData,
            subtree: nativeData,
        });

        for (const fieldset of $.parents(this.node, 'fieldset')) {
            this.#observer.observe(fieldset, {
                attributes: true,
                attributeFilter: ['disabled'],
            });
        }
    }

    /**
     * Loads a remote result page, catching synchronous and asynchronous errors.
     * @param {SelectMenuRequest} request The search request.
     * @param {number} id The request generation.
     * @param {string|null} focusedValue The option to keep active after rendering.
     * @returns {Promise<void>} Resolves when the request settles.
     */
    async #fetchResults(request, id, focusedValue) {
        if (!this.node || id !== this.#requestId) {
            return;
        }

        try {
            const result = this.options.getResults(request);

            // The callback can synchronously dispose this instance or start a newer request.
            if (!this.node || id !== this.#requestId) {
                result?.cancel?.();

                return;
            }

            this.#request = result;

            const response = await result;

            if (!this.node || id !== this.#requestId) {
                return;
            }

            const data = this.#parseData(response.results);

            if (!request.offset) {
                this.#clearResults();
                this.#data = data;
            } else {
                $.remove($.children(this.#itemsList, '[role="status"]'));
                this.#data.push(...data);
            }

            // Responses can update labels for values that are already selected.
            this.#refresh();

            if (!this.node || id !== this.#requestId) {
                return;
            }

            this.#showMore = Boolean(response.showMore) && data.length > 0;
            this.#renderResults(data);

            if (!this.node || id !== this.#requestId) {
                return;
            }

            this.#restoreFocus(focusedValue);

            if (this.#showMore && $.height(this.#itemsList, { boxSize: $.SCROLL_BOX }) <= $.height(this.#itemsList)) {
                this.#scrollHandler();
            }
        } catch {
            if (this.node && id === this.#requestId) {
                $.remove($.children(this.#itemsList, '[role="status"]'));
                this.#renderInfo(this.options.lang.error);
            }
        } finally {
            if (this.node && id === this.#requestId) {
                this.#request = null;
                this.#loading = false;
                this.update();
            }
        }
    }

    /**
     * Fetches an unknown selection while containing remote lookup failures.
     * @param {SelectMenuValue|SelectMenuValue[]|null} value The requested selection.
     * @param {number} id The value request generation.
     * @returns {Promise<void>} Resolves when the lookup settles.
     */
    async #fetchValue(value, id) {
        try {
            const result = this.options.getResults({ value });

            if (!this.node || id !== this.#valueRequestId) {
                result?.cancel?.();

                return;
            }

            this.#valueRequest = result;

            const response = await result;

            if (this.node && id === this.#valueRequestId) {
                this.#parseData(response.results);
                this.#setValue(value);
            }
        } catch {
            // A failed value lookup preserves the previous selection.
        } finally {
            if (this.node && id === this.#valueRequestId) {
                this.#valueRequest = null;
            }
        }
    }

    /**
     * Updates keyboard focus and the active descendant reference.
     * @param {HTMLElement|null} element The focused option.
     */
    #focusItem(element) {
        $.removeClass(this.#focusedItem, this.constructor.classes.focus);
        this.#focusedItem = element;

        if (element) {
            $.addClass(element, this.constructor.classes.focus);
        }

        $.setAttribute([this.#toggle, this.#searchInput], { 'aria-activedescendant': $.getProperty(element, 'id') || '' });
    }

    /**
     * Gets local results, retaining groups when there is no search term.
     * @param {string} term The current search term.
     * @returns {SelectMenuItem[]} The matching results.
     */
    #getLocalResults(term) {
        if (!term) {
            return this.#data;
        }

        const results = flattenItems(this.#data).filter((item) =>
            this.options.isMatch.call(this, cloneItem(item), term),
        );

        return results.sort((a, b) =>
            this.options.sortResults.call(this, cloneItem(a), cloneItem(b), term),
        );
    }

    /**
     * Loads local or remote results for the current search input.
     * @param {number} [offset=0] The remote result offset.
     * @param {string|null} [focusedValue=null] The option to keep active after rendering.
     */
    #load(offset = 0, focusedValue = null) {
        this.#cancelSearch();

        if (!offset) {
            this.#clearResults();
            this.#showMore = false;
        } else {
            $.remove($.children(this.#itemsList, '[role="status"]'));
        }

        const term = $.getValue(this.#searchInput);
        $.setAttribute(this.#multiple ? this.#searchInput : this.#toggle, {
            'aria-expanded': !this.#multiple || term.length >= this.options.minSearch,
        });

        if (term.length < this.options.minSearch) {
            if (this.#multiple) {
                $.hide(this.#menuNode);
            }

            this.update();

            return;
        }

        $.show(this.#menuNode);

        if (this.#multiple && this.#maxSelections && this.#value.length >= this.#maxSelections) {
            this.#renderInfo(this.options.lang.maxSelections);
        } else if (this.options.getResults) {
            this.#loading = true;
            this.#renderInfo(this.options.lang.loading);
            this.#loadResults(term ? { offset, term } : { offset }, this.#requestId, focusedValue);
        } else {
            this.#renderResults(this.#getLocalResults(term));
            this.#restoreFocus(focusedValue);
        }

        this.update();
    }

    /**
     * Applies known selections immediately and starts lookups for unknown values.
     * @param {SelectMenuValue|SelectMenuValue[]|null} value The requested selection.
     */
    #loadValue(value) {
        this.#cancelValueRequest();

        const values = normalizeValues(value);

        if (!this.options.getResults || values.every((item) => this.#lookup.has(String(item)))) {
            this.#setValue(value);

            return;
        }

        const id = this.#valueRequestId;
        const requested = this.#multiple ? values : values[0] ?? null;

        this.#fetchValue(requested, id);
    }

    /**
     * Copies data into the lookup without mutating caller-owned objects.
     * @param {SelectMenuItem[]} data The source data.
     * @param {boolean} [disabled=false] Whether the containing group is disabled.
     * @param {HTMLOptionElement[]} [nativeOptions] The native options, shared by nested groups.
     * @returns {SelectMenuItem[]} The internal data.
     */
    #parseData(
        data,
        disabled = false,
        nativeOptions = [...$.getProperty(this.node, 'options')],
    ) {
        return data.map((source) => {
            const item = {
                ...source,
                text: String(source.text ?? source.value ?? ''),
                disabled: disabled || Boolean(source.disabled),
            };

            if (Array.isArray(source.children)) {
                item.children = this.#parseData(source.children, item.disabled, nativeOptions);
            } else {
                const key = String(item.value);

                item.element = source.element ||
                    this.#lookup.get(key)?.element ||
                    nativeOptions.find((option) => $.getValue(option) === key);

                if (!item.element) {
                    item.element = $.create('option', { text: item.text, value: key });
                    this.#generatedOptions.add(item.element);
                }

                // Generated options inherit data's disabled state; authored options keep their native state.
                if (this.#generatedOptions.has(item.element)) {
                    $.setProperty(item.element, { disabled: item.disabled });
                }

                this.#lookup.set(key, item);
            }

            return item;
        });
    }

    /**
     * Reads native selected values, including newly added native options.
     * @returns {string|string[]|null} The native selection.
     */
    #readNativeValue() {
        const values = [...$.getProperty(this.node, 'selectedOptions')].map((option) => $.getValue(option));

        if (values.some((value) => !this.#lookup.has(value))) {
            for (const item of flattenItems(getDomData(this.node))) {
                if (!this.#lookup.has(String(item.value))) {
                    this.#lookup.set(String(item.value), item);
                }
            }
        }

        return this.#multiple ? values : values[0] ?? null;
    }

    /**
     * Refreshes selection labels while retaining native options and defaults.
     */
    #refresh() {
        const focused = this.#searchInput === this.node.ownerDocument.activeElement;

        if (this.#multiple) {
            this.#refreshMultiple();
        } else {
            this.#refreshSingle();
        }

        if (!this.node) {
            return;
        }

        this.#refreshPlaceholder();
        this.#refreshState();
        this.#updateSearchWidth();

        if (focused) {
            $.focus(this.#searchInput);
        }
    }

    /**
     * Rebuilds native option data when mutation records contain option changes.
     * @param {MutationRecord[]} records The observed or queued mutations.
     * @returns {boolean} Whether native option data was refreshed.
     */
    #refreshData(records) {
        if (
            this.options.data ||
            this.options.getResults ||
            !records.some((record) => record.type !== 'attributes' || $.is(record.target, 'option, optgroup'))
        ) {
            return false;
        }

        this.#lookup.clear();
        this.#data = this.#parseData(getDomData(this.node));

        return true;
    }

    /**
     * Keeps UI input focus styling active for the control and its menu.
     */
    #refreshFocus() {
        const focused = !$.is(this.node, ':disabled') &&
            (this.#open || containsNode(this.#container, this.node.ownerDocument.activeElement));

        if (focused) {
            $.addClass(this.#toggle, this.constructor.classes.focus);
        } else {
            $.removeClass(this.#toggle, this.constructor.classes.focus);
        }
    }

    /**
     * Rebuilds selected chips while retaining the multiple search input.
     */
    #refreshMultiple() {
        const classes = this.constructor.classes;

        $.detach(this.#searchInput);
        $.empty(this.#toggle);

        for (const value of this.#value) {
            const item = this.#lookup.get(String(value));
            const group = $.create('div', { class: classes.multiGroup });
            const clear = this.#renderClear(item.value);
            const label = $.create('span', { class: classes.multiItem });

            this.#renderContent(item, label, this.options.renderSelection);

            if (!this.node) {
                return;
            }

            $.append(group, [clear, label]);
            $.append(this.#toggle, group);
        }

        $.append(this.#toggle, this.#searchInput);
    }

    /**
     * Refreshes the placeholder without interpreting zero or empty-string values as missing.
     */
    #refreshPlaceholder() {
        $.remove($.children(this.#toggle, `.${this.constructor.classes.placeholder}`));

        const empty = this.#multiple ? !this.#value.length : this.#value === null;

        if (empty && !$.getValue(this.#searchInput)) {
            $.prepend(this.#toggle, $.create('span', {
                class: this.constructor.classes.placeholder,
                html: this.options.sanitize(this.#placeholderText || '&nbsp;'),
            }));
        }
    }

    /**
     * Rebuilds the single selection label and its optional clear button.
     */
    #refreshSingle() {
        $.empty(this.#toggle);
        $.remove($.children(this.#container, '[data-ui-action="clear"]'));

        if (this.#value === null) {
            return;
        }

        const item = this.#lookup.get(String(this.#value));
        const label = $.create('span', { class: this.constructor.classes.selectionSingle });

        this.#renderContent(item, label, this.options.renderSelection);

        if (!this.node) {
            return;
        }

        $.append(this.#toggle, label);

        if (this.options.allowClear) {
            $.append(this.#container, this.#renderClear());
        }
    }

    /**
     * Synchronizes disabled, required, and accessible attributes with the native control.
     */
    #refreshState() {
        const disabled = $.is(this.node, ':disabled');

        if (disabled) {
            $.addClass(this.#toggle, this.constructor.classes.disabled);
        } else {
            $.removeClass(this.#toggle, this.constructor.classes.disabled);
        }

        $.setProperty(this.#searchInput, { disabled });

        if (!this.#multiple) {
            $.setProperty(this.#toggle, { disabled });
        }

        for (const button of $.find('[data-ui-action="clear"]', this.#container)) {
            $.setProperty(button, { disabled });
        }

        const control = this.#multiple ? this.#searchInput : this.#toggle;
        $.setProperty(control, { tabIndex: disabled ? -1 : Number(this.#tabIndex ?? 0) });
        $.setAttribute(control, {
            'aria-disabled': disabled,
            'aria-required': Boolean($.getProperty(this.node, 'required')),
        });

        for (const attribute of ariaAttributes) {
            const value = $.getAttribute(this.node, attribute);
            if (value === null) {
                if (attribute !== 'aria-required') {
                    $.removeAttribute(control, attribute);
                }
            } else {
                $.setAttribute(control, { [attribute]: value });
            }
        }

        const labelledBy = $.getAttribute(this.node, 'aria-labelledby');
        const label = $.getAttribute(this.node, 'aria-label') || [...$.getProperty(this.node, 'labels')]
            .map((node) => $.getText(node).trim())
            .join(' ');

        if (labelledBy) {
            $.setAttribute(control, { 'aria-labelledby': labelledBy });
            $.removeAttribute(control, 'aria-label');
        } else {
            $.removeAttribute(control, 'aria-labelledby');

            if (label) {
                $.setAttribute(control, { 'aria-label': label });
            } else {
                $.removeAttribute(control, 'aria-label');
            }
        }

        this.#refreshFocus();
    }

    /**
     * Renders the controls and their accessible relationships.
     */
    #render() {
        const classes = this.constructor.classes;
        const id = generateId('selectmenu');
        const attributes = {
            'role': 'combobox',
            'aria-haspopup': 'listbox',
            'aria-expanded': false,
            'aria-controls': id,
            'aria-activedescendant': '',
        };

        let toggleAttributes = {};
        let searchAttributes = attributes;
        let searchClass = classes.multiSearchInput;

        if (!this.#multiple) {
            toggleAttributes = { ...attributes, type: 'button' };
            searchAttributes = {
                'role': 'searchbox',
                'aria-label': this.options.lang.search,
                'aria-controls': id,
                'aria-activedescendant': '',
            };
            searchClass = this.options.searchInputStyle === 'filled' ?
                classes.searchInputFilled :
                classes.searchInputOutline;
        }

        this.#container = $.create('div', {
            class: classes.container,
            attributes: { dir: $.css(this.node, 'direction') },
        });

        this.#toggle = $.create(this.#multiple ? 'div' : 'button', {
            class: [$.getProperty(this.node, 'className'), this.#multiple ? classes.multiToggle : classes.toggle],
            attributes: toggleAttributes,
        });

        this.#searchInput = $.create('input', {
            class: searchClass,
            attributes: {
                ...searchAttributes,
                'autocomplete': 'off',
                'aria-autocomplete': 'list',
                'type': 'text',
            },
        });

        $.append(this.#container, this.#toggle);

        this.#menuNode = $.create('div', {
            class: classes.menu,
            style: {
                '--ui-selectmenu-duration': `${Math.max(0, Number(this.options.duration) || 0)}ms`,
            },
            attributes: { dir: $.css(this.node, 'direction') },
        });

        if ($.is(this.node, '.input-sm') || $.closest(this.node, '.input-group-sm').length) {
            $.addClass(this.#menuNode, classes.menuSmall);
        } else if ($.is(this.node, '.input-lg') || $.closest(this.node, '.input-group-lg').length) {
            $.addClass(this.#menuNode, classes.menuLarge);
        }

        if (!this.#multiple) {
            const outer = $.create('div', { class: classes.searchOuter });
            const container = $.create('div', { class: classes.searchContainer });

            $.append(container, this.#searchInput);
            $.append(outer, container);
            $.append(this.#menuNode, outer);
        }

        this.#itemsList = $.create('ul', {
            class: classes.items,
            style: { maxHeight: this.options.maxHeight },
            attributes: {
                id,
                'role': 'listbox',
                'aria-multiselectable': this.#multiple,
            },
        });

        $.append(this.#menuNode, this.#itemsList);
        $.after(this.node, this.#container);
        $.addClass(this.node, classes.hide);
        $.setAttribute(this.node, { 'tabindex': -1, 'aria-hidden': true });
    }

    /**
     * Renders a keyboard-operable clear control outside the single-select button.
     * @param {SelectMenuValue} [value] The multiple selection to remove.
     * @returns {HTMLButtonElement} The clear button.
     */
    #renderClear(value) {
        const button = $.create('button', {
            class: this.#multiple ?
                this.constructor.classes.multiClear :
                this.constructor.classes.clear,
            attributes: {
                'type': 'button',
                'aria-label': this.options.lang.clear,
            },
            dataset: { uiAction: 'clear' },
        });

        if (value !== undefined) {
            $.setDataset(button, { uiValue: String(value) });
        }

        if (this.#multiple) {
            $.append(button, $.create('span', {
                class: this.constructor.classes.multiClearIcon,
                attributes: { 'aria-hidden': true },
            }));
        }

        return button;
    }

    /**
     * Renders callback output, sanitizing strings but preserving supplied nodes.
     * @param {SelectMenuItem} item The item.
     * @param {HTMLElement} element The destination.
     * @param {SelectMenuRenderer} renderer The renderer.
     */
    #renderContent(item, element, renderer) {
        const content = renderer.call(this, cloneItem(item), element);

        if (!this.node) {
            return;
        }

        if (typeof content === 'string') {
            $.setHtml(element, this.options.sanitize(content));
        } else if ($._isElement(content) && content !== element) {
            $.append(element, content);
        }
    }

    /**
     * Renders a group label and its nested results.
     * @param {SelectMenuItem} item The group.
     * @param {Set<string>} selectedValues The selected value keys.
     * @returns {HTMLLIElement|null} The group element, or `null` after disposal.
     */
    #renderGroup(item, selectedValues) {
        const classes = this.constructor.classes;
        const group = $.create('li', {
            attributes: {
                'role': 'group',
                'aria-label': item.text,
            },
        });
        const label = $.create('div', { class: classes.group });
        const list = $.create('ul', {
            class: classes.groupContainer,
            attributes: { role: 'none' },
        });

        this.#renderContent(item, label, this.options.renderResult);

        if (!this.node) {
            return null;
        }

        $.append(group, [label, list]);
        this.#renderResults(item.children, list, selectedValues);

        return group;
    }

    /**
     * Appends a sanitized status message to the list.
     * @param {string} text The message.
     */
    #renderInfo(text) {
        $.append(this.#itemsList, $.create('li', {
            class: this.constructor.classes.info,
            attributes: { role: 'status' },
            html: this.options.sanitize(text),
        }));
    }

    /**
     * Renders an option and registers it for keyboard navigation when enabled.
     * @param {SelectMenuItem} item The result item.
     * @param {boolean} selected Whether the item is selected.
     * @returns {HTMLLIElement} The option element.
     */
    #renderItem(item, selected) {
        const classes = this.constructor.classes;
        const disabled = item.disabled || $.is(item.element, ':disabled');
        const element = $.create('li', {
            class: classes.item,
            attributes: {
                'id': generateId('selectmenu-item'),
                'role': 'option',
                'aria-label': item.text,
                'aria-selected': selected,
                'aria-disabled': disabled,
            },
        });

        if (selected) {
            $.addClass(element, classes.active);
        }

        if (disabled) {
            $.addClass(element, classes.disabledItem);
        } else {
            $.setDataset(element, { uiAction: 'select', uiValue: String(item.value) });
            this.#activeItems.push(element);
        }

        this.#renderContent(item, element, this.options.renderResult);

        return element;
    }

    /**
     * Renders results and initializes keyboard focus for the top-level list.
     * @param {SelectMenuItem[]} results The results.
     * @param {HTMLElement} [container] The destination list.
     * @param {Set<string>} [selectedValues] The selected value keys, shared by nested groups.
     */
    #renderResults(
        results,
        container = this.#itemsList,
        selectedValues = new Set(normalizeValues(this.#value).map(String)),
    ) {
        for (const item of results) {
            const element = item.children ?
                this.#renderGroup(item, selectedValues) :
                this.#renderItem(item, selectedValues.has(String(item.value)));

            if (!this.node) {
                return;
            }

            $.append(container, element);
        }

        if (container !== this.#itemsList) {
            return;
        }

        if (!$.hasChildren(this.#itemsList)) {
            this.#renderInfo(this.options.lang.noResults);
        }

        if (!this.#focusedItem) {
            this.#focusItem(this.#activeItems[0] || null);
        }
    }

    /**
     * Restores an option's focus and visibility after replacing result nodes.
     * @param {string|null} value The option value key.
     */
    #restoreFocus(value) {
        const element = this.#activeItems.find((item) => $.getAttribute(item, 'data-ui-value') === value);

        if (element) {
            this.#focusItem(element);
            $._callDomMethod(element, 'scrollIntoView', { block: 'nearest' });
        }
    }

    /**
     * Applies a user selection and emits change only for an effective change.
     * @param {string} key The lookup key.
     */
    #selectValue(key) {
        const item = this.#lookup.get(key);

        if (
            !item ||
            item.disabled ||
            $.is(item.element, ':disabled') ||
            $.is(this.node, ':disabled')
        ) {
            return;
        }

        this.#cancelValueRequest();

        let value = item.value;

        if (this.#multiple) {
            value = this.#value.some((entry) => String(entry) === key) ?
                this.#value.filter((entry) => String(entry) !== key) :
                [...this.#value, item.value];
        }

        this.#setValue(value, true);

        if (!this.node) {
            return;
        }

        $.setValue(this.#searchInput, '');
        this.#refreshPlaceholder();
        this.#updateSearchWidth();

        if (this.options.closeOnSelect) {
            this.hide();
        } else if (this.#open) {
            this.#load(0, key);
        }

        if (this.node) {
            $.focus(this.#multiple || this.#open ? this.#searchInput : this.#toggle);
        }
    }

    /**
     * Normalizes values and synchronizes native and rendered selection.
     * @param {SelectMenuValue|SelectMenuValue[]|null} value The requested selection.
     * @param {boolean} [notify=false] Whether to emit a change event.
     */
    #setValue(value, notify = false) {
        // Apply queued option mutations before resolving the requested values.
        const records = this.#observer?.takeRecords() ?? [];
        this.#refreshData(records);

        let values = normalizeValues(value)
            .filter((entry) => this.#lookup.has(String(entry)))
            .map((entry) => this.#lookup.get(String(entry)).value);

        if (!this.#multiple) {
            values = values.slice(0, 1);
        } else if (this.#maxSelections) {
            values = values.slice(0, this.#maxSelections);
        }

        const previous = normalizeValues(this.#value);
        const changed = previous.length !== values.length ||
            previous.some((entry, index) => entry !== values[index]);

        this.#value = this.#multiple ? values : values[0] ?? null;

        for (const entry of values) {
            const element = this.#lookup.get(String(entry)).element;

            if (!containsNode(this.node, element)) {
                $.append(this.node, element);
            }
        }

        const selected = new Set(values.map(String));
        const options = $.getProperty(this.node, 'options');

        for (const option of options) {
            $.setProperty(option, { selected: selected.has($.getValue(option)) });
        }

        if (!values.length) {
            $.setProperty(this.node, { selectedIndex: -1 });
        }

        this.#refresh();

        if (!this.node) {
            return;
        }

        if (records.length && $.is(this.node, ':disabled')) {
            this.hide();

            if (!this.node) {
                return;
            }
        }

        if (this.#open && !notify) {
            this.#load();
        }

        if (notify && changed) {
            this.#notifying = true;

            try {
                $.triggerEvent(this.node, 'change.ui.selectmenu');
            } finally {
                this.#notifying = false;
            }
        }
    }

    /**
     * Sizes the multiple search input to its text.
     */
    #updateSearchWidth() {
        if (!this.#multiple) {
            return;
        }

        const span = $.create('span', {
            text: $.getValue(this.#searchInput),
            style: {
                position: 'absolute',
                visibility: 'hidden',
                font: $.css(this.#searchInput, 'font'),
                whiteSpace: 'pre',
            },
        });
        $.append(this.node.ownerDocument.body, span);

        $.setStyle(this.#searchInput, 'width', `${$.width(span) + 2}px`);

        $.remove(span);
    }
}
