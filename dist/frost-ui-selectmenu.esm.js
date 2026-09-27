import { BaseComponent, Popper, generateId, initComponent, waitForTransition } from "@fr0st/ui";
import $ from "@fr0st/query";

//#region src/js/helpers.js
/** @import { SelectMenuItem, SelectMenuValue } from './select-menu.js'; */
/**
* Copies public item data without exposing internal DOM nodes.
* @param {SelectMenuItem} item The internal item.
* @returns {SelectMenuItem|undefined} The copied item.
*/
function cloneItem(item) {
	if (!item) return;
	const { element: _, children, ...data } = item;
	const copy = $._extend({}, data);
	if (children) copy.children = children.map(cloneItem);
	return copy;
}
/**
* Gets all leaf items from a grouped result set.
* @param {SelectMenuItem[]} items The items and groups.
* @returns {SelectMenuItem[]} The leaf items.
*/
function flattenItems(items) {
	return items.flatMap((item) => item.children ? flattenItems(item.children) : item);
}
/**
* Reads native option data while retaining original option elements.
* @param {HTMLSelectElement|HTMLOptGroupElement} node The select or group.
* @returns {SelectMenuItem[]} The native data.
*/
function getDOMData(node) {
	return [...node.children].filter((child) => child.matches("option, optgroup")).map((child) => {
		if (child.matches("optgroup")) return {
			text: child.label,
			disabled: child.disabled,
			children: getDOMData(child)
		};
		return {
			...$.getDataset(child),
			text: child.textContent,
			value: child.value,
			disabled: child.matches(":disabled"),
			element: child
		};
	});
}
/**
* Normalizes scalar and array values using native select string keys.
* @param {SelectMenuValue|SelectMenuValue[]|null} value The input value.
* @returns {SelectMenuValue[]} Unique non-null values.
*/
function normalizeValues(value) {
	return [...new Map((Array.isArray(value) ? value : [value]).filter((entry) => entry !== null && entry !== void 0).map((entry) => [String(entry), entry])).values()];
}

//#endregion
//#region src/js/select-menu.js
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
/**
* @typedef {object} SelectMenuOptions
* @property {string} [placeholder=''] The empty selection label.
* @property {SelectMenuLanguage} [lang] The translated interface labels.
* @property {'filled'|'outline'} [searchInputStyle='filled'] The search input style.
* @property {SelectMenuItem[]|Record<string, string>|null} [data=null] Local data; defaults to native options.
* @property {((request: SelectMenuRequest) => SelectMenuResults|PromiseLike<SelectMenuResults>)|null} [getResults=null] Loads search results or resolves values. Requests may expose a cancel method.
* @property {SelectMenuRenderer} [renderResult] Renders a result or group label.
* @property {SelectMenuRenderer} [renderSelection] Renders a selected item.
* @property {((html: string) => string)} [sanitize] Sanitizes rendered HTML.
* @property {((item: SelectMenuItem, term: string) => boolean)} [isMatch] Matches a local result.
* @property {((a: SelectMenuItem, b: SelectMenuItem, term: string) => number)} [sortResults] Sorts local search results.
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
var SelectMenu = class extends BaseComponent {
	static classes = {
		active: "active",
		clear: "btn-close mx-2 lh-base",
		container: "d-flex align-items-center",
		disabled: "disabled",
		disabledItem: "disabled",
		focus: "focus",
		group: "selectmenu-group",
		groupContainer: "selectmenu-group-container list-unstyled",
		hide: "visually-hidden",
		info: "selectmenu-item text-body-secondary",
		item: "selectmenu-item",
		items: "selectmenu-items list-unstyled",
		menu: "selectmenu-menu",
		menuSmall: "selectmenu-menu-sm",
		menuLarge: "selectmenu-menu-lg",
		multiClear: "btn d-flex",
		multiClearIcon: "btn-close p-0 my-auto pe-none",
		multiGroup: "btn-group my-n1",
		multiItem: "btn",
		multiSearchInput: "selectmenu-multi-input",
		multiToggle: "selectmenu-multi d-flex flex-wrap position-relative text-start",
		placeholder: "selectmenu-placeholder",
		searchContainer: "form-input",
		searchInputFilled: "input-filled",
		searchInputOutline: "input-outline",
		searchOuter: "p-1",
		selectionSingle: "me-auto",
		toggle: "selectmenu-toggle d-flex position-relative justify-content-between text-start flex-grow-1"
	};
	/** @type {SelectMenuOptions} */
	static defaults = {
		placeholder: "",
		lang: {
			clear: "Remove selection",
			error: "Error loading data.",
			loading: "Loading..",
			maxSelections: "Selection limit reached.",
			noResults: "No results",
			search: "Search"
		},
		searchInputStyle: "filled",
		data: null,
		getResults: null,
		renderResult: (data) => data.text,
		renderSelection: (data) => data.text,
		sanitize: (input) => $.sanitize(input),
		isMatch(data, term) {
			const value = data.text;
			const escapedTerm = $._escapeRegExp(term);
			const regExp = new RegExp(escapedTerm, "i");
			if (regExp.test(value)) return true;
			const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
			return regExp.test(normalized);
		},
		sortResults(a, b, term) {
			const aLower = a.text.toLowerCase();
			const bLower = b.text.toLowerCase();
			if (term) {
				const diff = aLower.indexOf(term.toLowerCase()) - bLower.indexOf(term.toLowerCase());
				if (diff) return diff;
			}
			return aLower.localeCompare(bLower);
		},
		maxSelections: 0,
		minSearch: 0,
		allowClear: false,
		closeOnSelect: true,
		debounce: 250,
		duration: 100,
		maxHeight: "250px",
		appendTo: null,
		fullWidth: false,
		placement: "bottom",
		position: "start",
		fixed: false,
		spacing: 0,
		minContact: false
	};
	#activeItems = [];
	#ariaHidden;
	#container;
	#data = [];
	#form;
	#hidden;
	#itemsList;
	#listeners = [];
	#loading = false;
	#loadResults;
	#lookup = /* @__PURE__ */ new Map();
	#maxSelections;
	#menuNode;
	#multiple;
	#notifying = false;
	#observer;
	#open = false;
	#placeholderText;
	#popper;
	#request;
	#requestId = 0;
	#resetTimer;
	#scrollHandler;
	#searchInput;
	#showMore = false;
	#tabIndex;
	#toggle;
	#transitionId = 0;
	#value;
	#valueRequest;
	#valueRequestId = 0;
	/**
	* Creates a SelectMenu.
	* @param {HTMLSelectElement} node The native select.
	* @param {SelectMenuOptions} [options] The component options.
	*/
	constructor(node, options) {
		if (!$.is(node, "select")) throw new Error("SelectMenu must be created on a select element");
		super(node, options);
		this.#multiple = this.node.multiple;
		this.#value = this.#multiple ? [] : null;
		this.#maxSelections = Math.max(0, Number(this.options.maxSelections) || 0);
		this.#placeholderText = this.options.placeholder;
		this.#form = this.node.form;
		this.#tabIndex = this.node.getAttribute("tabindex");
		this.#hidden = $.hasClass(this.node, this.constructor.classes.hide);
		this.#ariaHidden = this.node.getAttribute("aria-hidden");
		const initialValue = this.#readNativeValue();
		const data = $._isPlainObject(this.options.data) ? Object.entries(this.options.data).map(([value, text]) => ({
			value,
			text
		})) : this.options.data;
		this.#data = this.#parseData(data || getDOMData(this.node));
		this.#loadResults = $._debounce((request, id) => this.#fetchResults(request, id), this.options.debounce);
		this.#render();
		this.#events();
		this.#loadValue(initialValue);
	}
	/**
	* Gets copies of the selected data without internal DOM references.
	* @returns {SelectMenuItem|SelectMenuItem[]|null} The selected data.
	*/
	data() {
		if (this.#value === null) return null;
		return this.#multiple ? this.#value.map((value) => cloneItem(this.#lookup.get(String(value)))) : cloneItem(this.#lookup.get(String(this.#value))) || null;
	}
	/** Disables the SelectMenu. */
	disable() {
		this.node.disabled = true;
		this.#refreshDisabled();
		this.hide();
	}
	/** @inheritdoc */
	dispose() {
		if (!this.node) return;
		this.#transitionId++;
		this.#cancelSearch();
		this.#cancelValueRequest();
		clearTimeout(this.#resetTimer);
		this.#scrollHandler?.cancel();
		this.#observer.disconnect();
		this.#popper?.dispose();
		for (const [node, events, callback] of this.#listeners) $.removeEvent(node, events, callback);
		if (this.#hidden) $.addClass(this.node, this.constructor.classes.hide);
		else $.removeClass(this.node, this.constructor.classes.hide);
		for (const [name, value] of [["tabindex", this.#tabIndex], ["aria-hidden", this.#ariaHidden]]) if (value === null) this.node.removeAttribute(name);
		else this.node.setAttribute(name, value);
		$.remove(this.#menuNode);
		$.remove(this.#container);
		this.#activeItems = [];
		this.#data = [];
		this.#lookup.clear();
		this.#listeners = [];
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
	/** Enables the SelectMenu. */
	enable() {
		this.node.disabled = false;
		this.#refreshDisabled();
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
	/** Hides the menu, allowing interruption of an opening transition. */
	hide() {
		if (!this.node || !this.#open || !$.triggerOne(this.node, "hide.ui.selectmenu") || !this.node) return;
		this.#open = false;
		this.#cancelSearch();
		this.#scrollHandler.cancel();
		this.#searchInput.value = "";
		this.#setActive(null);
		this.#setExpanded(false);
		this.#refreshPlaceholder();
		const id = ++this.#transitionId;
		$.removeClass(this.#menuNode, "show");
		waitForTransition(this.#menuNode, ["opacity"]).then((_) => {
			if (!this.node || id !== this.#transitionId) return;
			this.#popper?.dispose();
			this.#popper = null;
			$.detach(this.#menuNode);
			this.#clearResults();
			$.triggerEvent(this.node, "hidden.ui.selectmenu");
		});
	}
	/**
	* Sets the selection limit and silently normalizes the selection.
	* @param {number} maxSelections The limit, or zero for unlimited selections.
	*/
	setMaxSelections(maxSelections) {
		this.#maxSelections = Math.max(0, Number(maxSelections) || 0);
		this.#loadValue(this.#value);
	}
	/**
	* Sets the empty selection label.
	* @param {string} placeholder The placeholder.
	*/
	setPlaceholder(placeholder) {
		this.#placeholderText = String(placeholder ?? "");
		this.#refresh();
	}
	/**
	* Silently selects values, resolving remote values when necessary.
	* @param {SelectMenuValue|SelectMenuValue[]|null} value The selection; null clears it.
	*/
	setValue(value) {
		this.#loadValue(value);
	}
	/** Shows the menu, allowing interruption of a closing transition. */
	show() {
		if (!this.node || this.#open || $.is(this.node, ":disabled") || !$.triggerOne(this.node, "show.ui.selectmenu") || !this.node) return;
		this.#open = true;
		const id = ++this.#transitionId;
		if (this.options.appendTo) $.append(this.options.appendTo, this.#menuNode);
		else $.after(this.#container, this.#menuNode);
		$.show(this.#menuNode);
		this.#getData();
		this.#popper ??= new Popper(this.#menuNode, {
			reference: this.#toggle,
			placement: this.options.placement,
			position: this.options.position,
			fixed: this.options.fixed,
			spacing: this.options.spacing,
			minContact: this.options.minContact,
			beforeUpdate: this.options.fullWidth ? (node, reference) => {
				$.setStyle(node, "width", `${$.width(reference, { boxSize: $.BORDER_BOX })}px`);
			} : null
		});
		$.css(this.#menuNode, "opacity");
		$.addClass(this.#menuNode, "show");
		this.#setExpanded(true);
		waitForTransition(this.#menuNode, ["opacity"]).then((_) => {
			if (this.node && id === this.#transitionId) $.triggerEvent(this.node, "shown.ui.selectmenu");
		});
	}
	/** Toggles the menu. */
	toggle() {
		if (this.#open) this.hide();
		else this.show();
	}
	/**
	* Updates the menu position.
	* @returns {SelectMenu} The component.
	*/
	update() {
		this.#popper?.update();
		return this;
	}
	/** Cancels pending search work and invalidates its responses. */
	#cancelSearch() {
		this.#requestId++;
		this.#loadResults?.cancel();
		const request = this.#request;
		this.#request = null;
		this.#loading = false;
		request?.cancel?.();
	}
	/** Cancels a pending value lookup and invalidates its response. */
	#cancelValueRequest() {
		this.#valueRequestId++;
		const request = this.#valueRequest;
		this.#valueRequest = null;
		request?.cancel?.();
	}
	/** Clears result nodes and their active descendant references. */
	#clearResults() {
		this.#setActive(null);
		this.#activeItems = [];
		$.empty(this.#itemsList);
	}
	/** Attaches owned listeners and native form synchronization. */
	#events() {
		this.#listen(this.node, "focus.ui.selectmenu", (_) => {
			$.focus(this.#multiple ? this.#searchInput : this.#toggle);
		});
		this.#listen(this.node, "change.ui.selectmenu", (_) => {
			if (!this.#notifying) this.#loadValue(this.#readNativeValue());
		});
		if (this.#form) this.#listen(this.#form, "reset.ui.selectmenu", (event) => {
			clearTimeout(this.#resetTimer);
			this.#resetTimer = setTimeout((_) => {
				if (this.node && !event.defaultPrevented) {
					this.#loadValue(this.#readNativeValue());
					this.hide();
				}
			}, 0);
		});
		this.#listen(this.node.ownerDocument, "mousedown.ui.selectmenu", (event) => {
			if (this.#open && !this.#container.contains(event.target) && !this.#menuNode.contains(event.target)) this.hide();
		});
		this.#listen([this.#container, this.#menuNode], "focusout.ui.selectmenu", (_) => {
			queueMicrotask((_) => {
				if (this.node && this.#open && !this.#container.contains(this.node.ownerDocument.activeElement) && !this.#menuNode.contains(this.node.ownerDocument.activeElement)) this.hide();
			});
		});
		this.#listen(this.#menuNode, "mousedown.ui.selectmenu", (event) => {
			if (event.target !== this.#searchInput) event.preventDefault();
		});
		this.#listen(this.#menuNode, "click.ui.selectmenu", (event) => {
			event.stopPropagation();
			const option = event.target.closest("[data-ui-action=\"select\"]");
			if (option) this.#selectValue(option.dataset.uiValue);
		});
		this.#listen(this.#itemsList, "mouseover.ui.selectmenu", (event) => {
			const option = event.target.closest("[data-ui-action=\"select\"]");
			if (option) this.#setActive(option);
		});
		this.#listen(this.#container, "click.ui.selectmenu", (event) => {
			if ($.is(this.node, ":disabled")) return;
			const clear = event.target.closest("[data-ui-action=\"clear\"]");
			if (clear) {
				event.preventDefault();
				event.stopPropagation();
				const value = this.#multiple ? this.#value.filter((item) => String(item) !== clear.dataset.uiValue) : null;
				this.#cancelValueRequest();
				this.#setValue(value, true);
				if (this.node) {
					this.hide();
					$.focus(this.#multiple ? this.#searchInput : this.#toggle);
				}
			} else if (this.#multiple) {
				$.focus(this.#searchInput);
				this.show();
			} else {
				this.toggle();
				if (this.#open) $.focus(this.#searchInput);
			}
		});
		this.#listen(this.#searchInput, "input.ui.selectmenu", (_) => {
			if ($.is(this.node, ":disabled")) return;
			this.#updateSearchWidth();
			if (this.#open) this.#getData();
			else this.show();
		});
		this.#listen(this.#searchInput, "keydown.ui.selectmenu", (event) => this.#keydown(event));
		if (!this.#multiple) this.#listen(this.#toggle, "keydown.ui.selectmenu", (event) => {
			if ($.is(this.node, ":disabled") || event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return;
			if ([
				"ArrowDown",
				"ArrowUp",
				"Enter",
				" "
			].includes(event.key) || event.key.length === 1) {
				event.preventDefault();
				if (event.key.length === 1 && event.key !== " ") this.#searchInput.value = event.key;
				this.show();
				if (this.#open) $.focus(this.#searchInput);
			}
		});
		this.#scrollHandler = $._throttle((_) => {
			if (!this.node || !this.#open || this.#loading || !this.#showMore) return;
			const list = this.#itemsList;
			if (list.scrollTop >= list.scrollHeight - list.clientHeight * 1.25) this.#getData(this.#data.length);
		}, 250, { leading: false });
		this.#listen(this.#itemsList, "scroll.ui.selectmenu", this.#scrollHandler);
		this.#observer = new MutationObserver((_) => {
			if (this.node) {
				this.#refreshDisabled();
				if ($.is(this.node, ":disabled")) this.hide();
			}
		});
		this.#observer.observe(this.node, {
			attributes: true,
			attributeFilter: ["disabled", "required"]
		});
		for (const fieldset of $.parents(this.node, "fieldset")) this.#observer.observe(fieldset, {
			attributes: true,
			attributeFilter: ["disabled"]
		});
	}
	/**
	* Loads a remote result page, catching synchronous and asynchronous errors.
	* @param {SelectMenuRequest} request The search request.
	* @param {number} id The request generation.
	*/
	#fetchResults(request, id) {
		if (!this.node || id !== this.#requestId) return;
		let result;
		try {
			result = this.options.getResults(request);
		} catch {
			this.#showError(id);
			return;
		}
		if (!this.node || id !== this.#requestId) {
			result?.cancel?.();
			return;
		}
		this.#request = result;
		Promise.resolve(result).then((response) => {
			if (!this.node || id !== this.#requestId) return;
			const data = this.#parseData(response.results);
			if (!request.offset) {
				this.#clearResults();
				this.#data = data;
			} else {
				$.remove($.children(this.#itemsList, "[role=\"status\"]"));
				this.#data.push(...data);
			}
			this.#showMore = !!response.showMore;
			this.#renderResults(data);
		}).catch((_) => this.#showError(id)).finally((_) => {
			if (this.node && id === this.#requestId) {
				this.#request = null;
				this.#loading = false;
				this.update();
			}
		});
	}
	/**
	* Loads local or remote results for the current search input.
	* @param {number} [offset=0] The remote result offset.
	*/
	#getData(offset = 0) {
		this.#cancelSearch();
		if (!offset) {
			this.#clearResults();
			this.#showMore = false;
		} else $.remove($.children(this.#itemsList, "[role=\"status\"]"));
		const term = this.#searchInput.value;
		if (term.length < this.options.minSearch) {
			if (this.#multiple) $.hide(this.#menuNode);
			this.update();
			return;
		}
		$.show(this.#menuNode);
		if (this.#multiple && this.#maxSelections && this.#value.length >= this.#maxSelections) this.#renderInfo(this.options.lang.maxSelections);
		else if (this.options.getResults) {
			this.#loading = true;
			this.#renderInfo(this.options.lang.loading);
			this.#loadResults(term ? {
				offset,
				term
			} : { offset }, this.#requestId);
		} else {
			const results = term ? flattenItems(this.#data).filter((item) => this.options.isMatch.call(this, cloneItem(item), term)).sort((a, b) => this.options.sortResults.call(this, cloneItem(a), cloneItem(b), term)) : this.#data;
			this.#renderResults(results);
		}
		this.update();
	}
	/**
	* Handles search navigation and selection without submitting a form.
	* @param {KeyboardEvent} event The keyboard event.
	*/
	#keydown(event) {
		if ($.is(this.node, ":disabled") || event.isComposing) return;
		if (event.key === "Backspace" && this.#multiple && !this.#searchInput.value && this.#value.length) {
			event.preventDefault();
			const item = this.#lookup.get(String(this.#value.at(-1)));
			this.#cancelValueRequest();
			this.#setValue(this.#value.slice(0, -1), true);
			if (this.node) {
				this.#searchInput.value = item.text;
				this.#updateSearchWidth();
				this.#open ? this.#getData() : this.show();
			}
		} else if (event.key === "Escape" && this.#open) {
			event.preventDefault();
			event.stopPropagation();
			this.hide();
			if (this.node) $.focus(this.#multiple ? this.#searchInput : this.#toggle);
		} else if ([
			"ArrowDown",
			"ArrowUp",
			"Enter"
		].includes(event.key)) {
			event.preventDefault();
			if (!this.#open) {
				this.show();
				return;
			}
			const active = $.findOne("[data-ui-focus]", this.#itemsList);
			if (event.key === "Enter") {
				if (active) this.#selectValue(active.dataset.uiValue);
			} else {
				const index = this.#activeItems.indexOf(active);
				const next = index < 0 ? 0 : index + (event.key === "ArrowDown" ? 1 : -1);
				const option = this.#activeItems[next];
				if (option) {
					this.#setActive(option);
					option.scrollIntoView({ block: "nearest" });
				}
			}
		}
	}
	/**
	* Registers a listener whose removal is owned by this instance.
	* @param {EventTarget|EventTarget[]} node The event targets.
	* @param {string} events The namespaced event names.
	* @param {Function} callback The callback.
	*/
	#listen(node, events, callback) {
		$.addEvent(node, events, callback);
		this.#listeners.push([
			node,
			events,
			callback
		]);
	}
	/**
	* Resolves unknown selected values without allowing stale responses to win.
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
		let result;
		try {
			result = this.options.getResults({ value: requested });
		} catch {
			this.#refresh();
			return;
		}
		if (!this.node || id !== this.#valueRequestId) {
			result?.cancel?.();
			return;
		}
		this.#valueRequest = result;
		this.#refresh();
		Promise.resolve(result).then((response) => {
			if (this.node && id === this.#valueRequestId) {
				this.#parseData(response.results);
				this.#setValue(requested);
			}
		}).catch((_) => {}).finally((_) => {
			if (this.node && id === this.#valueRequestId) this.#valueRequest = null;
		});
	}
	/**
	* Copies data into the lookup without mutating caller-owned objects.
	* @param {SelectMenuItem[]} data The source data.
	* @param {boolean} [disabled=false] Whether the containing group is disabled.
	* @returns {SelectMenuItem[]} The internal data.
	*/
	#parseData(data, disabled = false) {
		return data.map((source) => {
			const item = {
				...source,
				text: String(source.text ?? source.value ?? ""),
				disabled: disabled || !!source.disabled
			};
			if (Array.isArray(source.children)) item.children = this.#parseData(source.children, item.disabled);
			else {
				const key = String(item.value);
				item.element = source.element || this.#lookup.get(key)?.element || [...this.node.options].find((option) => option.value === key) || $.create("option", {
					text: item.text,
					value: key
				});
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
		for (const item of flattenItems(getDOMData(this.node))) if (!this.#lookup.has(String(item.value))) this.#lookup.set(String(item.value), item);
		const values = [...this.node.selectedOptions].map((option) => option.value);
		return this.#multiple ? values : values[0] ?? null;
	}
	/** Refreshes selection labels while retaining native options and defaults. */
	#refresh() {
		const focused = this.#searchInput === this.node.ownerDocument.activeElement;
		if (this.#multiple) $.detach(this.#searchInput);
		$.empty(this.#toggle);
		const values = this.#multiple ? this.#value : normalizeValues(this.#value);
		for (const value of values) {
			const item = this.#lookup.get(String(value));
			if (this.#multiple) {
				const group = $.create("div", { class: this.constructor.classes.multiGroup });
				const clear = this.#renderClear(item.value);
				const label = $.create("span", { class: this.constructor.classes.multiItem });
				this.#renderContent(item, label, this.options.renderSelection);
				$.append(group, [clear, label]);
				$.append(this.#toggle, group);
			} else {
				const label = $.create("span", { class: this.constructor.classes.selectionSingle });
				this.#renderContent(item, label, this.options.renderSelection);
				$.append(this.#toggle, label);
			}
		}
		if (this.#multiple) $.append(this.#toggle, this.#searchInput);
		else {
			$.remove($.children(this.#container, "[data-ui-action=\"clear\"]"));
			if (this.options.allowClear && values.length) $.append(this.#container, this.#renderClear());
		}
		this.#refreshPlaceholder();
		this.#refreshDisabled();
		this.#updateSearchWidth();
		if (focused) $.focus(this.#searchInput);
	}
	/** Synchronizes disabled and required semantics with the native control. */
	#refreshDisabled() {
		const disabled = $.is(this.node, ":disabled");
		if (disabled) $.addClass(this.#toggle, this.constructor.classes.disabled);
		else $.removeClass(this.#toggle, this.constructor.classes.disabled);
		this.#searchInput.disabled = disabled;
		if (!this.#multiple) this.#toggle.disabled = disabled;
		for (const button of this.#container.querySelectorAll("[data-ui-action=\"clear\"]")) button.disabled = disabled;
		const control = this.#multiple ? this.#searchInput : this.#toggle;
		control.tabIndex = disabled ? -1 : Number(this.#tabIndex ?? 0);
		control.setAttribute("aria-disabled", String(disabled));
		control.setAttribute("aria-required", String(this.node.required));
	}
	/** Refreshes the placeholder without interpreting zero or empty-string values as missing. */
	#refreshPlaceholder() {
		$.remove($.children(this.#toggle, `.${this.constructor.classes.placeholder}`));
		if ((this.#multiple ? !this.#value.length : this.#value === null) && !this.#searchInput.value) $.prepend(this.#toggle, $.create("span", {
			class: this.constructor.classes.placeholder,
			html: this.options.sanitize(this.#placeholderText || "&nbsp;")
		}));
	}
	/** Renders the controls and their accessible relationships. */
	#render() {
		const classes = this.constructor.classes;
		const id = generateId("selectmenu");
		const inherited = Object.fromEntries([
			"aria-describedby",
			"aria-errormessage",
			"aria-invalid"
		].filter((name) => this.node.hasAttribute(name)).map((name) => [name, this.node.getAttribute(name)]));
		const labelledBy = this.node.getAttribute("aria-labelledby");
		const label = this.node.getAttribute("aria-label") || [...this.node.labels].map((node) => node.textContent.trim()).join(" ");
		const attributes = {
			...inherited,
			"role": "combobox",
			"aria-haspopup": "listbox",
			"aria-expanded": false,
			"aria-controls": id,
			"aria-activedescendant": ""
		};
		if (labelledBy) attributes["aria-labelledby"] = labelledBy;
		else if (label) attributes["aria-label"] = label;
		this.#container = $.create("div", { class: classes.container });
		this.#toggle = $.create(this.#multiple ? "div" : "button", {
			class: [this.node.className, this.#multiple ? classes.multiToggle : classes.toggle],
			attributes: this.#multiple ? {} : {
				...attributes,
				type: "button"
			}
		});
		$.append(this.#container, this.#toggle);
		const searchClass = this.options.searchInputStyle === "filled" ? classes.searchInputFilled : classes.searchInputOutline;
		this.#searchInput = $.create("input", {
			class: this.#multiple ? classes.multiSearchInput : searchClass,
			attributes: {
				...this.#multiple ? attributes : {
					"role": "searchbox",
					"aria-label": this.options.lang.search,
					"aria-controls": id,
					"aria-activedescendant": ""
				},
				"autocomplete": "off",
				"aria-autocomplete": "list",
				"type": "text"
			}
		});
		this.#menuNode = $.create("div", {
			class: classes.menu,
			style: { "--ui-selectmenu-duration": `${Math.max(0, Number(this.options.duration) || 0)}ms` },
			attributes: { dir: $.css(this.node, "direction") }
		});
		if ($.is(this.node, ".input-sm")) $.addClass(this.#menuNode, classes.menuSmall);
		else if ($.is(this.node, ".input-lg")) $.addClass(this.#menuNode, classes.menuLarge);
		if (!this.#multiple) {
			const outer = $.create("div", { class: classes.searchOuter });
			const container = $.create("div", { class: classes.searchContainer });
			$.append(container, this.#searchInput);
			$.append(outer, container);
			$.append(this.#menuNode, outer);
		}
		this.#itemsList = $.create("ul", {
			class: classes.items,
			style: { maxHeight: this.options.maxHeight },
			attributes: {
				id,
				"role": "listbox",
				"aria-multiselectable": this.#multiple
			}
		});
		$.append(this.#menuNode, this.#itemsList);
		$.after(this.node, this.#container);
		$.addClass(this.node, classes.hide);
		$.setAttribute(this.node, {
			"tabindex": -1,
			"aria-hidden": true
		});
	}
	/**
	* Renders a keyboard-operable clear control outside the single-select button.
	* @param {SelectMenuValue} [value] The multiple selection to remove.
	* @returns {HTMLButtonElement} The clear button.
	*/
	#renderClear(value) {
		return $.create("button", {
			class: this.#multiple ? [this.constructor.classes.multiClear, this.constructor.classes.clear] : this.constructor.classes.clear,
			attributes: {
				"type": "button",
				"aria-label": this.options.lang.clear
			},
			dataset: {
				uiAction: "clear",
				...value === void 0 ? {} : { uiValue: String(value) }
			}
		});
	}
	/**
	* Renders callback output, sanitizing strings but preserving supplied nodes.
	* @param {SelectMenuItem} item The item.
	* @param {HTMLElement} element The destination.
	* @param {SelectMenuRenderer} renderer The renderer.
	*/
	#renderContent(item, element, renderer) {
		const content = renderer.call(this, cloneItem(item), element);
		if (typeof content === "string") $.setHtml(element, this.options.sanitize(content));
		else if ($._isElement(content) && content !== element) $.append(element, content);
	}
	/**
	* Appends a sanitized status message to the list.
	* @param {string} text The message.
	*/
	#renderInfo(text) {
		$.append(this.#itemsList, $.create("li", {
			class: this.constructor.classes.info,
			attributes: { role: "status" },
			html: this.options.sanitize(text)
		}));
	}
	/**
	* Renders result items and recursively nested groups.
	* @param {SelectMenuItem[]} results The results.
	* @param {HTMLElement} [container] The destination list.
	*/
	#renderResults(results, container = this.#itemsList) {
		for (const item of results) {
			if (item.children) {
				const group = $.create("li", { attributes: {
					"role": "group",
					"aria-label": item.text
				} });
				const label = $.create("div", { class: this.constructor.classes.group });
				const list = $.create("ul", {
					class: this.constructor.classes.groupContainer,
					attributes: { role: "none" }
				});
				this.#renderContent(item, label, this.options.renderResult);
				$.append(group, [label, list]);
				$.append(container, group);
				this.#renderResults(item.children, list);
				continue;
			}
			const selected = normalizeValues(this.#value).some((value) => String(value) === String(item.value));
			const disabled = item.disabled || $.is(item.element, ":disabled");
			const element = $.create("li", {
				class: [
					this.constructor.classes.item,
					selected ? this.constructor.classes.active : "",
					disabled ? this.constructor.classes.disabledItem : ""
				],
				attributes: {
					"id": generateId("selectmenu-item"),
					"role": "option",
					"aria-label": item.text,
					"aria-selected": selected,
					"aria-disabled": disabled
				}
			});
			if (!disabled) {
				$.setDataset(element, {
					uiAction: "select",
					uiValue: String(item.value)
				});
				this.#activeItems.push(element);
			}
			this.#renderContent(item, element, this.options.renderResult);
			$.append(container, element);
		}
		if (container === this.#itemsList) {
			if (!this.#itemsList.children.length) this.#renderInfo(this.options.lang.noResults);
			if (!$.findOne("[data-ui-focus]", this.#itemsList)) this.#setActive(this.#activeItems[0] || null);
		}
	}
	/**
	* Applies a user selection and emits change only for an effective change.
	* @param {string} key The lookup key.
	*/
	#selectValue(key) {
		const item = this.#lookup.get(key);
		if (!item || item.disabled || $.is(item.element, ":disabled") || $.is(this.node, ":disabled")) return;
		this.#cancelValueRequest();
		let value = item.value;
		if (this.#multiple) value = this.#value.some((entry) => String(entry) === key) ? this.#value.filter((entry) => String(entry) !== key) : [...this.#value, item.value];
		this.#setValue(value, true);
		if (!this.node) return;
		this.#searchInput.value = "";
		this.#refreshPlaceholder();
		this.#updateSearchWidth();
		if (this.options.closeOnSelect) this.hide();
		else if (this.#open) this.#getData();
		if (this.node) $.focus(this.#multiple || this.#open ? this.#searchInput : this.#toggle);
	}
	/**
	* Updates the active option and its ARIA reference.
	* @param {HTMLElement|null} element The active option.
	*/
	#setActive(element) {
		const previous = $.findOne("[data-ui-focus]", this.#itemsList);
		$.removeClass(previous, this.constructor.classes.focus);
		$.removeDataset(previous, "uiFocus");
		if (element) {
			$.addClass(element, this.constructor.classes.focus);
			$.setDataset(element, { uiFocus: true });
		}
		$.setAttribute([this.#toggle, this.#searchInput], { "aria-activedescendant": element?.id || "" });
	}
	/**
	* Updates the combobox expanded state.
	* @param {boolean} expanded Whether results are expanded.
	*/
	#setExpanded(expanded) {
		(this.#multiple ? this.#searchInput : this.#toggle).setAttribute("aria-expanded", String(expanded));
	}
	/**
	* Normalizes values and synchronizes native and rendered selection.
	* @param {SelectMenuValue|SelectMenuValue[]|null} value The requested selection.
	* @param {boolean} [notify=false] Whether to emit a change event.
	*/
	#setValue(value, notify = false) {
		let values = normalizeValues(value).filter((entry) => this.#lookup.has(String(entry))).map((entry) => this.#lookup.get(String(entry)).value);
		if (!this.#multiple) values = values.slice(0, 1);
		else if (this.#maxSelections) values = values.slice(0, this.#maxSelections);
		const previous = normalizeValues(this.#value);
		const changed = previous.length !== values.length || previous.some((entry, index) => entry !== values[index]);
		this.#value = this.#multiple ? values : values[0] ?? null;
		for (const entry of values) {
			const element = this.#lookup.get(String(entry)).element;
			if (!this.node.contains(element)) this.node.append(element);
		}
		const selected = new Set(values.map(String));
		for (const option of this.node.options) option.selected = selected.has(option.value);
		if (!values.length) this.node.selectedIndex = -1;
		this.#refresh();
		if (this.#open && !notify) this.#getData();
		if (notify && changed) {
			this.#notifying = true;
			try {
				$.triggerEvent(this.node, "change.ui.selectmenu");
			} finally {
				this.#notifying = false;
			}
		}
	}
	/**
	* Displays a loading error only for the current request.
	* @param {number} id The request generation.
	*/
	#showError(id) {
		if (this.node && id === this.#requestId) {
			$.remove($.children(this.#itemsList, "[role=\"status\"]"));
			this.#renderInfo(this.options.lang.error);
			this.#loading = false;
			this.update();
		}
	}
	/** Sizes the multiple search input to its text. */
	#updateSearchWidth() {
		if (!this.#multiple) return;
		const span = $.create("span", {
			text: this.#searchInput.value,
			style: {
				display: "inline-block",
				font: $.css(this.#searchInput, "font"),
				whiteSpace: "pre"
			}
		});
		this.node.ownerDocument.body.append(span);
		$.setStyle(this.#searchInput, "width", `${$.width(span) + 2}px`);
		$.remove(span);
		this.#refreshPlaceholder();
	}
};

//#endregion
//#region src/js/index.js
initComponent("selectmenu", SelectMenu);
var js_default = SelectMenu;

//#endregion
export { js_default as default };
//# sourceMappingURL=frost-ui-selectmenu.esm.js.map