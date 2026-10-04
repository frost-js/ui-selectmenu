(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ?  factory(exports, require('@fr0st/ui'), require('@fr0st/query')) :
  typeof define === 'function' && define.amd ? define(['exports', '@fr0st/ui', '@fr0st/query'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.UI = global.UI || {}), global.UI,global.fQuery));
})(this, function(exports, _fr0st_ui, _fr0st_query) {
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
//#region \0rolldown/runtime.js
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) {
					__defProp(to, key, {
						get: ((k) => from[k]).bind(null, key),
						enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
					});
				}
			}
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));

//#endregion
_fr0st_query = __toESM(_fr0st_query, 1);

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
		const copy = _fr0st_query.default._extend({}, data);
		if (children) copy.children = children.map(cloneItem);
		return copy;
	}
	/**
	* Checks whether a node is the parent itself or one of its descendants.
	* @param {Node} parent The parent node.
	* @param {Node|null} node The node to check.
	* @returns {boolean} Whether the parent contains the node.
	*/
	function containsNode(parent, node) {
		return Boolean(node) && (_fr0st_query.default.isSame(parent, node) || _fr0st_query.default.hasDescendent(parent, node));
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
	function getDomData(node) {
		return _fr0st_query.default.children(node, "option, optgroup").map((child) => {
			if (_fr0st_query.default.is(child, "optgroup")) return {
				text: _fr0st_query.default.getProperty(child, "label"),
				disabled: _fr0st_query.default.getProperty(child, "disabled"),
				children: getDomData(child)
			};
			return {
				..._fr0st_query.default.getDataset(child),
				text: _fr0st_query.default.getProperty(child, "label"),
				value: _fr0st_query.default.getValue(child),
				disabled: _fr0st_query.default.getProperty(child, "disabled"),
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
		const entries = (Array.isArray(value) ? value : [value]).filter((entry) => entry !== null && entry !== void 0).map((entry) => [String(entry), entry]);
		return [...new Map(entries).values()];
	}
	/**
	* Normalizes text for case- and accent-insensitive matching and sorting.
	* @param {string} value The text to normalize.
	* @returns {string} The normalized text.
	*/
	function normalizeText(value) {
		return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
	}

//#endregion
//#region src/js/select-menu.js
	var ariaAttributes = [
		"aria-describedby",
		"aria-errormessage",
		"aria-invalid",
		"aria-required"
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
	var SelectMenu = class extends _fr0st_ui.BaseComponent {
		static classes = {
			active: "active",
			clear: "btn-close",
			container: "form-input selectmenu-container",
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
			multiClear: "btn",
			multiClearIcon: "btn-close p-0 my-auto pe-none",
			multiGroup: "btn-group my-n1",
			multiItem: "btn selectmenu-selection",
			multiSearchInput: "selectmenu-multi-input",
			multiToggle: "selectmenu-multi d-flex flex-wrap position-relative text-start",
			placeholder: "selectmenu-placeholder",
			searchContainer: "form-input",
			searchInputFilled: "input-filled",
			searchInputOutline: "input-outline",
			searchOuter: "p-1",
			selectionSingle: "selectmenu-selection me-auto",
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
			sanitize: (input) => _fr0st_query.default.sanitize(input),
			isMatch(data, term) {
				return normalizeText(data.text).includes(normalizeText(term));
			},
			sortResults(a, b, term) {
				const aNormalized = normalizeText(a.text);
				const bNormalized = normalizeText(b.text);
				const termNormalized = normalizeText(term);
				return aNormalized.indexOf(termNormalized) - bNormalized.indexOf(termNormalized) || aNormalized.localeCompare(bNormalized);
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
		#changeHandler = null;
		#container = null;
		#data = [];
		#documentHandler = null;
		#focusedItem = null;
		#focusHandler = null;
		#form = null;
		#generatedOptions = /* @__PURE__ */ new WeakSet();
		#hidden;
		#itemsList = null;
		#loading = false;
		#loadResults = null;
		#lookup = /* @__PURE__ */ new Map();
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
			if (!_fr0st_query.default.is(node, "select")) throw new Error("SelectMenu must be created on a select element");
			super(node, options);
			try {
				this.#tabIndex = _fr0st_query.default.getAttribute(this.node, "tabindex");
				this.#hidden = _fr0st_query.default.hasClass(this.node, this.constructor.classes.hide);
				this.#ariaHidden = _fr0st_query.default.getAttribute(this.node, "aria-hidden");
				this.#multiple = _fr0st_query.default.getProperty(this.node, "multiple");
				this.#value = this.#multiple ? [] : null;
				this.#maxSelections = Math.max(0, Number(this.options.maxSelections) || 0);
				this.#placeholderText = this.options.placeholder;
				this.#form = _fr0st_query.default.getProperty(this.node, "form");
				const initialValue = this.#readNativeValue();
				const data = _fr0st_query.default._isPlainObject(this.options.data) ? Object.entries(this.options.data).map(([value, text]) => ({
					value,
					text
				})) : this.options.data;
				this.#data = this.#parseData(data || getDomData(this.node));
				this.#loadResults = _fr0st_query.default._debounce((request, id) => this.#fetchResults(request, id), this.options.debounce);
				const focused = _fr0st_query.default.is(this.node, ":focus");
				this.#render();
				this.#events();
				this.#loadValue(initialValue);
				if (focused) _fr0st_query.default.focus(this.#multiple ? this.#searchInput : this.#toggle);
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
			if (this.#value === null) return null;
			return this.#multiple ? this.#value.map((value) => cloneItem(this.#lookup.get(String(value)))) : cloneItem(this.#lookup.get(String(this.#value))) || null;
		}
		/**
		* Disables the SelectMenu.
		*/
		disable() {
			_fr0st_query.default.setProperty(this.node, { disabled: true });
			this.#refreshState();
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
			this.#observer?.disconnect();
			this.#popper?.dispose();
			if (this.#focusHandler) _fr0st_query.default.removeEvent(this.node, "focus.ui.selectmenu", this.#focusHandler);
			if (this.#changeHandler) _fr0st_query.default.removeEvent(this.node, "change.ui.selectmenu", this.#changeHandler);
			if (this.#documentHandler) _fr0st_query.default.removeEvent(this.node.ownerDocument, "mousedown.ui.selectmenu", this.#documentHandler);
			if (this.#form && this.#resetHandler) _fr0st_query.default.removeEvent(this.#form, "reset.ui.selectmenu", this.#resetHandler);
			if (this.#hidden) _fr0st_query.default.addClass(this.node, this.constructor.classes.hide);
			else _fr0st_query.default.removeClass(this.node, this.constructor.classes.hide);
			for (const [name, value] of [["tabindex", this.#tabIndex], ["aria-hidden", this.#ariaHidden]]) if (value === null) _fr0st_query.default.removeAttribute(this.node, name);
			else _fr0st_query.default.setAttribute(this.node, { [name]: value });
			_fr0st_query.default.remove(this.#menuNode);
			_fr0st_query.default.remove(this.#container);
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
			_fr0st_query.default.setProperty(this.node, { disabled: false });
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
			if (!this.node || !this.#open || !_fr0st_query.default.triggerOne(this.node, "hide.ui.selectmenu") || !this.node) return;
			this.#open = false;
			this.#refreshFocus();
			this.#cancelSearch();
			this.#scrollHandler.cancel();
			_fr0st_query.default.setValue(this.#searchInput, "");
			this.#updateSearchWidth();
			this.#focusItem(null);
			_fr0st_query.default.setAttribute(this.#multiple ? this.#searchInput : this.#toggle, { "aria-expanded": false });
			this.#refreshPlaceholder();
			const id = ++this.#transitionId;
			_fr0st_query.default.removeClass(this.#menuNode, "show");
			(0, _fr0st_ui.waitForTransition)(this.#menuNode, ["opacity"]).then(() => {
				if (!this.node || id !== this.#transitionId) return;
				this.#popper?.dispose();
				this.#popper = null;
				_fr0st_query.default.detach(this.#menuNode);
				this.#clearResults();
				_fr0st_query.default.triggerEvent(this.node, "hidden.ui.selectmenu");
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
			if (!this.node || this.#open || _fr0st_query.default.is(this.node, ":disabled") || !_fr0st_query.default.triggerOne(this.node, "show.ui.selectmenu") || !this.node) return;
			this.#open = true;
			this.#refreshFocus();
			const id = ++this.#transitionId;
			if (this.options.appendTo) _fr0st_query.default.append(this.options.appendTo, this.#menuNode);
			else _fr0st_query.default.after(_fr0st_query.default.closest(this.#container, ".input-group")[0] || this.#container, this.#menuNode);
			_fr0st_query.default.show(this.#menuNode);
			this.#load();
			this.#createPopper();
			_fr0st_query.default.css(this.#menuNode, "opacity");
			_fr0st_query.default.addClass(this.#menuNode, "show");
			_fr0st_query.default.setAttribute(this.#multiple ? this.#searchInput : this.#toggle, { "aria-expanded": true });
			(0, _fr0st_ui.waitForTransition)(this.#menuNode, ["opacity"]).then(() => {
				if (this.node && id === this.#transitionId) _fr0st_query.default.triggerEvent(this.node, "shown.ui.selectmenu");
			});
		}
		/**
		* Toggles the menu.
		*/
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
		/**
		* Cancels pending search work and invalidates its responses.
		*/
		#cancelSearch() {
			this.#requestId++;
			this.#loadResults?.cancel();
			const request = this.#request;
			this.#request = null;
			this.#loading = false;
			request?.cancel?.();
		}
		/**
		* Cancels a pending value lookup and invalidates its response.
		*/
		#cancelValueRequest() {
			this.#valueRequestId++;
			const request = this.#valueRequest;
			this.#valueRequest = null;
			request?.cancel?.();
		}
		/**
		* Clears result nodes and their active descendant references.
		*/
		#clearResults() {
			this.#focusItem(null);
			this.#activeItems = [];
			_fr0st_query.default.empty(this.#itemsList);
		}
		/**
		* Creates the menu Popper when positioning is first needed.
		*/
		#createPopper() {
			if (this.#popper) return;
			const options = {
				reference: this.#toggle,
				placement: this.options.placement,
				position: this.options.position,
				fixed: this.options.fixed,
				spacing: this.options.spacing,
				minContact: this.options.minContact
			};
			if (this.options.fullWidth) options.beforeUpdate = (node, reference) => {
				const width = _fr0st_query.default.width(reference, { boxSize: _fr0st_query.default.BORDER_BOX });
				_fr0st_query.default.setStyle(node, "width", `${width}px`);
			};
			this.#popper = new _fr0st_ui.Popper(this.#menuNode, options);
		}
		/**
		* Attaches control events and native form synchronization.
		*/
		#events() {
			this.#focusHandler = () => {
				_fr0st_query.default.focus(this.#multiple ? this.#searchInput : this.#toggle);
			};
			this.#changeHandler = () => {
				if (!this.#notifying) this.#loadValue(this.#readNativeValue());
			};
			_fr0st_query.default.addEvent(this.node, "focus.ui.selectmenu", this.#focusHandler);
			_fr0st_query.default.addEvent(this.node, "change.ui.selectmenu", this.#changeHandler);
			if (this.#form) {
				this.#resetHandler = (event) => {
					clearTimeout(this.#resetTimer);
					this.#resetTimer = setTimeout(() => {
						if (this.node && !event.defaultPrevented) {
							const [selected] = _fr0st_query.default.getProperty(this.node, "selectedOptions");
							if (!this.#multiple && this.#generatedOptions.has(selected) && !_fr0st_query.default.getProperty(selected, "defaultSelected")) _fr0st_query.default.setProperty(this.node, { selectedIndex: -1 });
							this.#loadValue(this.#readNativeValue());
							this.hide();
						}
					}, 0);
				};
				_fr0st_query.default.addEvent(this.#form, "reset.ui.selectmenu", this.#resetHandler);
			}
			this.#documentHandler = (event) => {
				if (this.#open && !containsNode(this.#container, event.target) && !containsNode(this.#menuNode, event.target)) this.hide();
			};
			_fr0st_query.default.addEvent(this.node.ownerDocument, "mousedown.ui.selectmenu", this.#documentHandler);
			_fr0st_query.default.addEvent([this.#container, this.#menuNode], "focusin.ui.selectmenu", () => this.#refreshFocus());
			_fr0st_query.default.addEvent([this.#container, this.#menuNode], "focusout.ui.selectmenu", () => {
				queueMicrotask(() => {
					if (this.node && this.#open && !containsNode(this.#container, this.node.ownerDocument.activeElement) && !containsNode(this.#menuNode, this.node.ownerDocument.activeElement)) this.hide();
					if (this.node) this.#refreshFocus();
				});
			});
			_fr0st_query.default.addEvent(this.#menuNode, "mousedown.ui.selectmenu", (event) => {
				if (event.target !== this.#searchInput) event.preventDefault();
			});
			_fr0st_query.default.addEvent(this.#menuNode, "click.ui.selectmenu", (event) => event.stopPropagation());
			_fr0st_query.default.addEventDelegate(this.#menuNode, "click.ui.selectmenu", "[data-ui-action=\"select\"]", (event) => this.#selectValue(_fr0st_query.default.getAttribute(event.currentTarget, "data-ui-value")));
			_fr0st_query.default.addEventDelegate(this.#itemsList, "mouseover.ui.selectmenu", "[data-ui-action=\"select\"]", (event) => this.#focusItem(event.currentTarget));
			_fr0st_query.default.addEventDelegate(this.#container, "click.ui.selectmenu", "[data-ui-action=\"clear\"]", (event) => {
				if (_fr0st_query.default.is(this.node, ":disabled")) return;
				event.preventDefault();
				event.stopPropagation();
				const key = _fr0st_query.default.getAttribute(event.currentTarget, "data-ui-value");
				const value = this.#multiple ? this.#value.filter((item) => String(item) !== key) : null;
				this.#cancelValueRequest();
				this.#setValue(value, true);
				if (this.node) {
					this.hide();
					_fr0st_query.default.focus(this.#multiple ? this.#searchInput : this.#toggle);
				}
			});
			_fr0st_query.default.addEvent(this.#container, "click.ui.selectmenu", (event) => {
				if (!this.node || event.defaultPrevented || _fr0st_query.default.is(this.node, ":disabled")) return;
				if (this.#multiple) {
					_fr0st_query.default.focus(this.#searchInput);
					this.show();
				} else {
					this.toggle();
					if (this.#open) _fr0st_query.default.focus(this.#searchInput);
				}
			});
			_fr0st_query.default.addEvent(this.#searchInput, "input.ui.selectmenu", () => {
				if (_fr0st_query.default.is(this.node, ":disabled")) return;
				this.#updateSearchWidth();
				if (this.#multiple) this.#refreshPlaceholder();
				if (this.#open) this.#load();
				else this.show();
			});
			_fr0st_query.default.addEvent(this.#searchInput, "keydown.ui.selectmenu", (event) => {
				if (_fr0st_query.default.is(this.node, ":disabled") || event.isComposing) return;
				if (event.key === "Backspace" && this.#multiple && !_fr0st_query.default.getValue(this.#searchInput) && this.#value.length) {
					event.preventDefault();
					const item = this.#lookup.get(String(this.#value.at(-1)));
					this.#cancelValueRequest();
					this.#setValue(this.#value.slice(0, -1), true);
					if (this.node) {
						_fr0st_query.default.setValue(this.#searchInput, item.text);
						this.#updateSearchWidth();
						this.#refreshPlaceholder();
						if (this.#open) this.#load();
						else this.show();
					}
				} else if (event.key === "Escape" && this.#open) {
					event.preventDefault();
					event.stopPropagation();
					this.hide();
					if (this.node) _fr0st_query.default.focus(this.#multiple ? this.#searchInput : this.#toggle);
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
					if (event.key === "Enter") {
						if (this.#focusedItem) this.#selectValue(_fr0st_query.default.getAttribute(this.#focusedItem, "data-ui-value"));
					} else {
						const index = this.#activeItems.indexOf(this.#focusedItem);
						const next = index < 0 ? 0 : index + (event.key === "ArrowDown" ? 1 : -1);
						const option = this.#activeItems[next];
						if (option) {
							this.#focusItem(option);
							_fr0st_query.default._callDomMethod(option, "scrollIntoView", { block: "nearest" });
						}
					}
				}
			});
			if (!this.#multiple) _fr0st_query.default.addEvent(this.#toggle, "keydown.ui.selectmenu", (event) => {
				if (_fr0st_query.default.is(this.node, ":disabled") || event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return;
				if ([
					"ArrowDown",
					"ArrowUp",
					"Enter",
					" "
				].includes(event.key) || event.key.length === 1) {
					event.preventDefault();
					if (event.key.length === 1 && event.key !== " ") _fr0st_query.default.setValue(this.#searchInput, event.key);
					this.show();
					if (this.#open) _fr0st_query.default.focus(this.#searchInput);
				}
			});
			this.#scrollHandler = _fr0st_query.default._throttle(() => {
				if (!this.node || !this.#open || this.#loading || !this.#showMore) return;
				const list = this.#itemsList;
				if (_fr0st_query.default.getScrollY(list) >= _fr0st_query.default.height(list, { boxSize: _fr0st_query.default.SCROLL_BOX }) - _fr0st_query.default.height(list) * 1.25) this.#load(this.#data.length);
			}, 250, { leading: false });
			_fr0st_query.default.addEvent(this.#itemsList, "scroll.ui.selectmenu", this.#scrollHandler);
			const nativeData = !this.options.data && !this.options.getResults;
			this.#observer = new MutationObserver((records) => {
				if (!this.node) return;
				if (this.#refreshData(records)) {
					const focusedValue = _fr0st_query.default.getDataset(this.#focusedItem, "uiValue");
					this.#loadValue(this.#readNativeValue());
					const focusedItem = this.#activeItems.find((item) => _fr0st_query.default.getDataset(item, "uiValue") === focusedValue);
					if (focusedItem) this.#focusItem(focusedItem);
				} else this.#refreshState();
				if (_fr0st_query.default.is(this.node, ":disabled")) this.hide();
			});
			this.#observer.observe(this.node, {
				attributes: true,
				attributeFilter: [
					"disabled",
					"required",
					"aria-label",
					"aria-labelledby",
					...ariaAttributes,
					"value",
					"label",
					"selected"
				],
				childList: nativeData,
				characterData: nativeData,
				subtree: nativeData
			});
			for (const fieldset of _fr0st_query.default.parents(this.node, "fieldset")) this.#observer.observe(fieldset, {
				attributes: true,
				attributeFilter: ["disabled"]
			});
		}
		/**
		* Loads a remote result page, catching synchronous and asynchronous errors.
		* @param {SelectMenuRequest} request The search request.
		* @param {number} id The request generation.
		* @returns {Promise<void>} Resolves when the request settles.
		*/
		async #fetchResults(request, id) {
			if (!this.node || id !== this.#requestId) return;
			try {
				const result = this.options.getResults(request);
				if (!this.node || id !== this.#requestId) {
					result?.cancel?.();
					return;
				}
				this.#request = result;
				const response = await result;
				if (!this.node || id !== this.#requestId) return;
				const data = this.#parseData(response.results);
				if (!request.offset) {
					this.#clearResults();
					this.#data = data;
				} else {
					_fr0st_query.default.remove(_fr0st_query.default.children(this.#itemsList, "[role=\"status\"]"));
					this.#data.push(...data);
				}
				this.#showMore = Boolean(response.showMore) && data.length > 0;
				this.#renderResults(data);
				if (this.#showMore && _fr0st_query.default.height(this.#itemsList, { boxSize: _fr0st_query.default.SCROLL_BOX }) <= _fr0st_query.default.height(this.#itemsList)) this.#scrollHandler();
			} catch {
				if (this.node && id === this.#requestId) {
					_fr0st_query.default.remove(_fr0st_query.default.children(this.#itemsList, "[role=\"status\"]"));
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
				this.#refresh();
				const response = await result;
				if (this.node && id === this.#valueRequestId) {
					this.#parseData(response.results);
					this.#setValue(value);
				}
			} catch {} finally {
				if (this.node && id === this.#valueRequestId) this.#valueRequest = null;
			}
		}
		/**
		* Updates keyboard focus and the active descendant reference.
		* @param {HTMLElement|null} element The focused option.
		*/
		#focusItem(element) {
			_fr0st_query.default.removeClass(this.#focusedItem, this.constructor.classes.focus);
			this.#focusedItem = element;
			if (element) _fr0st_query.default.addClass(element, this.constructor.classes.focus);
			_fr0st_query.default.setAttribute([this.#toggle, this.#searchInput], { "aria-activedescendant": _fr0st_query.default.getProperty(element, "id") || "" });
		}
		/**
		* Gets local results, retaining groups when there is no search term.
		* @param {string} term The current search term.
		* @returns {SelectMenuItem[]} The matching results.
		*/
		#getLocalResults(term) {
			if (!term) return this.#data;
			return flattenItems(this.#data).filter((item) => this.options.isMatch.call(this, cloneItem(item), term)).sort((a, b) => this.options.sortResults.call(this, cloneItem(a), cloneItem(b), term));
		}
		/**
		* Loads local or remote results for the current search input.
		* @param {number} [offset=0] The remote result offset.
		*/
		#load(offset = 0) {
			this.#cancelSearch();
			if (!offset) {
				this.#clearResults();
				this.#showMore = false;
			} else _fr0st_query.default.remove(_fr0st_query.default.children(this.#itemsList, "[role=\"status\"]"));
			const term = _fr0st_query.default.getValue(this.#searchInput);
			if (term.length < this.options.minSearch) {
				if (this.#multiple) _fr0st_query.default.hide(this.#menuNode);
				this.update();
				return;
			}
			_fr0st_query.default.show(this.#menuNode);
			if (this.#multiple && this.#maxSelections && this.#value.length >= this.#maxSelections) this.#renderInfo(this.options.lang.maxSelections);
			else if (this.options.getResults) {
				this.#loading = true;
				this.#renderInfo(this.options.lang.loading);
				this.#loadResults(term ? {
					offset,
					term
				} : { offset }, this.#requestId);
			} else this.#renderResults(this.#getLocalResults(term));
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
		* @returns {SelectMenuItem[]} The internal data.
		*/
		#parseData(data, disabled = false) {
			return data.map((source) => {
				const item = {
					...source,
					text: String(source.text ?? source.value ?? ""),
					disabled: disabled || Boolean(source.disabled)
				};
				if (Array.isArray(source.children)) item.children = this.#parseData(source.children, item.disabled);
				else {
					const key = String(item.value);
					item.element = source.element || this.#lookup.get(key)?.element || [..._fr0st_query.default.getProperty(this.node, "options")].find((option) => _fr0st_query.default.getValue(option) === key);
					if (!item.element) {
						item.element = _fr0st_query.default.create("option", {
							text: item.text,
							value: key
						});
						this.#generatedOptions.add(item.element);
					}
					if (this.#generatedOptions.has(item.element)) _fr0st_query.default.setProperty(item.element, { disabled: item.disabled });
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
			for (const item of flattenItems(getDomData(this.node))) if (!this.#lookup.has(String(item.value))) this.#lookup.set(String(item.value), item);
			const values = [..._fr0st_query.default.getProperty(this.node, "selectedOptions")].map((option) => _fr0st_query.default.getValue(option));
			return this.#multiple ? values : values[0] ?? null;
		}
		/**
		* Refreshes selection labels while retaining native options and defaults.
		*/
		#refresh() {
			const focused = this.#searchInput === this.node.ownerDocument.activeElement;
			if (this.#multiple) this.#refreshMultiple();
			else this.#refreshSingle();
			this.#refreshPlaceholder();
			this.#refreshState();
			this.#updateSearchWidth();
			if (focused) _fr0st_query.default.focus(this.#searchInput);
		}
		/**
		* Rebuilds native option data when mutation records contain option changes.
		* @param {MutationRecord[]} records The observed or queued mutations.
		* @returns {boolean} Whether native option data was refreshed.
		*/
		#refreshData(records) {
			if (this.options.data || this.options.getResults || !records.some((record) => record.type !== "attributes" || _fr0st_query.default.is(record.target, "option, optgroup"))) return false;
			this.#lookup.clear();
			this.#data = this.#parseData(getDomData(this.node));
			return true;
		}
		/**
		* Keeps UI input focus styling active for the control and its menu.
		*/
		#refreshFocus() {
			if (!_fr0st_query.default.is(this.node, ":disabled") && (this.#open || containsNode(this.#container, this.node.ownerDocument.activeElement))) _fr0st_query.default.addClass(this.#toggle, this.constructor.classes.focus);
			else _fr0st_query.default.removeClass(this.#toggle, this.constructor.classes.focus);
		}
		/**
		* Rebuilds selected chips while retaining the multiple search input.
		*/
		#refreshMultiple() {
			const classes = this.constructor.classes;
			_fr0st_query.default.detach(this.#searchInput);
			_fr0st_query.default.empty(this.#toggle);
			for (const value of this.#value) {
				const item = this.#lookup.get(String(value));
				const group = _fr0st_query.default.create("div", { class: classes.multiGroup });
				const clear = this.#renderClear(item.value);
				const label = _fr0st_query.default.create("span", { class: classes.multiItem });
				this.#renderContent(item, label, this.options.renderSelection);
				_fr0st_query.default.append(group, [clear, label]);
				_fr0st_query.default.append(this.#toggle, group);
			}
			_fr0st_query.default.append(this.#toggle, this.#searchInput);
		}
		/**
		* Refreshes the placeholder without interpreting zero or empty-string values as missing.
		*/
		#refreshPlaceholder() {
			_fr0st_query.default.remove(_fr0st_query.default.children(this.#toggle, `.${this.constructor.classes.placeholder}`));
			if ((this.#multiple ? !this.#value.length : this.#value === null) && !_fr0st_query.default.getValue(this.#searchInput)) _fr0st_query.default.prepend(this.#toggle, _fr0st_query.default.create("span", {
				class: this.constructor.classes.placeholder,
				html: this.options.sanitize(this.#placeholderText || "&nbsp;")
			}));
		}
		/**
		* Rebuilds the single selection label and its optional clear button.
		*/
		#refreshSingle() {
			_fr0st_query.default.empty(this.#toggle);
			_fr0st_query.default.remove(_fr0st_query.default.children(this.#container, "[data-ui-action=\"clear\"]"));
			if (this.#value === null) return;
			const item = this.#lookup.get(String(this.#value));
			const label = _fr0st_query.default.create("span", { class: this.constructor.classes.selectionSingle });
			this.#renderContent(item, label, this.options.renderSelection);
			_fr0st_query.default.append(this.#toggle, label);
			if (this.options.allowClear) _fr0st_query.default.append(this.#container, this.#renderClear());
		}
		/**
		* Synchronizes disabled, required, and accessible attributes with the native control.
		*/
		#refreshState() {
			const disabled = _fr0st_query.default.is(this.node, ":disabled");
			if (disabled) _fr0st_query.default.addClass(this.#toggle, this.constructor.classes.disabled);
			else _fr0st_query.default.removeClass(this.#toggle, this.constructor.classes.disabled);
			_fr0st_query.default.setProperty(this.#searchInput, { disabled });
			if (!this.#multiple) _fr0st_query.default.setProperty(this.#toggle, { disabled });
			for (const button of _fr0st_query.default.find("[data-ui-action=\"clear\"]", this.#container)) _fr0st_query.default.setProperty(button, { disabled });
			const control = this.#multiple ? this.#searchInput : this.#toggle;
			_fr0st_query.default.setProperty(control, { tabIndex: disabled ? -1 : Number(this.#tabIndex ?? 0) });
			_fr0st_query.default.setAttribute(control, {
				"aria-disabled": disabled,
				"aria-required": Boolean(_fr0st_query.default.getProperty(this.node, "required"))
			});
			for (const attribute of ariaAttributes) {
				const value = _fr0st_query.default.getAttribute(this.node, attribute);
				if (value === null) {
					if (attribute !== "aria-required") _fr0st_query.default.removeAttribute(control, attribute);
				} else _fr0st_query.default.setAttribute(control, { [attribute]: value });
			}
			const labelledBy = _fr0st_query.default.getAttribute(this.node, "aria-labelledby");
			const label = _fr0st_query.default.getAttribute(this.node, "aria-label") || [..._fr0st_query.default.getProperty(this.node, "labels")].map((node) => _fr0st_query.default.getText(node).trim()).join(" ");
			if (labelledBy) {
				_fr0st_query.default.setAttribute(control, { "aria-labelledby": labelledBy });
				_fr0st_query.default.removeAttribute(control, "aria-label");
			} else {
				_fr0st_query.default.removeAttribute(control, "aria-labelledby");
				if (label) _fr0st_query.default.setAttribute(control, { "aria-label": label });
				else _fr0st_query.default.removeAttribute(control, "aria-label");
			}
			this.#refreshFocus();
		}
		/**
		* Renders the controls and their accessible relationships.
		*/
		#render() {
			const classes = this.constructor.classes;
			const id = (0, _fr0st_ui.generateId)("selectmenu");
			const attributes = {
				"role": "combobox",
				"aria-haspopup": "listbox",
				"aria-expanded": false,
				"aria-controls": id,
				"aria-activedescendant": ""
			};
			let toggleAttributes = {};
			let searchAttributes = attributes;
			let searchClass = classes.multiSearchInput;
			if (!this.#multiple) {
				toggleAttributes = {
					...attributes,
					type: "button"
				};
				searchAttributes = {
					"role": "searchbox",
					"aria-label": this.options.lang.search,
					"aria-controls": id,
					"aria-activedescendant": ""
				};
				searchClass = this.options.searchInputStyle === "filled" ? classes.searchInputFilled : classes.searchInputOutline;
			}
			this.#container = _fr0st_query.default.create("div", {
				class: classes.container,
				attributes: { dir: _fr0st_query.default.css(this.node, "direction") }
			});
			this.#toggle = _fr0st_query.default.create(this.#multiple ? "div" : "button", {
				class: [_fr0st_query.default.getProperty(this.node, "className"), this.#multiple ? classes.multiToggle : classes.toggle],
				attributes: toggleAttributes
			});
			this.#searchInput = _fr0st_query.default.create("input", {
				class: searchClass,
				attributes: {
					...searchAttributes,
					"autocomplete": "off",
					"aria-autocomplete": "list",
					"type": "text"
				}
			});
			_fr0st_query.default.append(this.#container, this.#toggle);
			this.#menuNode = _fr0st_query.default.create("div", {
				class: classes.menu,
				style: { "--ui-selectmenu-duration": `${Math.max(0, Number(this.options.duration) || 0)}ms` },
				attributes: { dir: _fr0st_query.default.css(this.node, "direction") }
			});
			if (_fr0st_query.default.is(this.node, ".input-sm") || _fr0st_query.default.closest(this.node, ".input-group-sm").length) _fr0st_query.default.addClass(this.#menuNode, classes.menuSmall);
			else if (_fr0st_query.default.is(this.node, ".input-lg") || _fr0st_query.default.closest(this.node, ".input-group-lg").length) _fr0st_query.default.addClass(this.#menuNode, classes.menuLarge);
			if (!this.#multiple) {
				const outer = _fr0st_query.default.create("div", { class: classes.searchOuter });
				const container = _fr0st_query.default.create("div", { class: classes.searchContainer });
				_fr0st_query.default.append(container, this.#searchInput);
				_fr0st_query.default.append(outer, container);
				_fr0st_query.default.append(this.#menuNode, outer);
			}
			this.#itemsList = _fr0st_query.default.create("ul", {
				class: classes.items,
				style: { maxHeight: this.options.maxHeight },
				attributes: {
					id,
					"role": "listbox",
					"aria-multiselectable": this.#multiple
				}
			});
			_fr0st_query.default.append(this.#menuNode, this.#itemsList);
			_fr0st_query.default.after(this.node, this.#container);
			_fr0st_query.default.addClass(this.node, classes.hide);
			_fr0st_query.default.setAttribute(this.node, {
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
			const button = _fr0st_query.default.create("button", {
				class: this.#multiple ? this.constructor.classes.multiClear : this.constructor.classes.clear,
				attributes: {
					"type": "button",
					"aria-label": this.options.lang.clear
				},
				dataset: { uiAction: "clear" }
			});
			if (value !== void 0) _fr0st_query.default.setDataset(button, { uiValue: String(value) });
			if (this.#multiple) _fr0st_query.default.append(button, _fr0st_query.default.create("span", {
				class: this.constructor.classes.multiClearIcon,
				attributes: { "aria-hidden": true }
			}));
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
			if (typeof content === "string") _fr0st_query.default.setHtml(element, this.options.sanitize(content));
			else if (_fr0st_query.default._isElement(content) && content !== element) _fr0st_query.default.append(element, content);
		}
		/**
		* Renders a group label and its nested results.
		* @param {SelectMenuItem} item The group.
		* @param {Set<string>} selectedValues The selected value keys.
		* @returns {HTMLLIElement} The group element.
		*/
		#renderGroup(item, selectedValues) {
			const classes = this.constructor.classes;
			const group = _fr0st_query.default.create("li", { attributes: {
				"role": "group",
				"aria-label": item.text
			} });
			const label = _fr0st_query.default.create("div", { class: classes.group });
			const list = _fr0st_query.default.create("ul", {
				class: classes.groupContainer,
				attributes: { role: "none" }
			});
			this.#renderContent(item, label, this.options.renderResult);
			_fr0st_query.default.append(group, [label, list]);
			this.#renderResults(item.children, list, selectedValues);
			return group;
		}
		/**
		* Appends a sanitized status message to the list.
		* @param {string} text The message.
		*/
		#renderInfo(text) {
			_fr0st_query.default.append(this.#itemsList, _fr0st_query.default.create("li", {
				class: this.constructor.classes.info,
				attributes: { role: "status" },
				html: this.options.sanitize(text)
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
			const disabled = item.disabled || _fr0st_query.default.is(item.element, ":disabled");
			const element = _fr0st_query.default.create("li", {
				class: classes.item,
				attributes: {
					"id": (0, _fr0st_ui.generateId)("selectmenu-item"),
					"role": "option",
					"aria-label": item.text,
					"aria-selected": selected,
					"aria-disabled": disabled
				}
			});
			if (selected) _fr0st_query.default.addClass(element, classes.active);
			if (disabled) _fr0st_query.default.addClass(element, classes.disabledItem);
			else {
				_fr0st_query.default.setDataset(element, {
					uiAction: "select",
					uiValue: String(item.value)
				});
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
		#renderResults(results, container = this.#itemsList, selectedValues = new Set(normalizeValues(this.#value).map(String))) {
			for (const item of results) {
				const element = item.children ? this.#renderGroup(item, selectedValues) : this.#renderItem(item, selectedValues.has(String(item.value)));
				_fr0st_query.default.append(container, element);
			}
			if (container !== this.#itemsList) return;
			if (!_fr0st_query.default.hasChildren(this.#itemsList)) this.#renderInfo(this.options.lang.noResults);
			if (!this.#focusedItem) this.#focusItem(this.#activeItems[0] || null);
		}
		/**
		* Applies a user selection and emits change only for an effective change.
		* @param {string} key The lookup key.
		*/
		#selectValue(key) {
			const item = this.#lookup.get(key);
			if (!item || item.disabled || _fr0st_query.default.is(item.element, ":disabled") || _fr0st_query.default.is(this.node, ":disabled")) return;
			this.#cancelValueRequest();
			let value = item.value;
			if (this.#multiple) value = this.#value.some((entry) => String(entry) === key) ? this.#value.filter((entry) => String(entry) !== key) : [...this.#value, item.value];
			this.#setValue(value, true);
			if (!this.node) return;
			_fr0st_query.default.setValue(this.#searchInput, "");
			this.#refreshPlaceholder();
			this.#updateSearchWidth();
			if (this.options.closeOnSelect) this.hide();
			else if (this.#open) this.#load();
			if (this.node) _fr0st_query.default.focus(this.#multiple || this.#open ? this.#searchInput : this.#toggle);
		}
		/**
		* Normalizes values and synchronizes native and rendered selection.
		* @param {SelectMenuValue|SelectMenuValue[]|null} value The requested selection.
		* @param {boolean} [notify=false] Whether to emit a change event.
		*/
		#setValue(value, notify = false) {
			const records = this.#observer?.takeRecords() ?? [];
			this.#refreshData(records);
			let values = normalizeValues(value).filter((entry) => this.#lookup.has(String(entry))).map((entry) => this.#lookup.get(String(entry)).value);
			if (!this.#multiple) values = values.slice(0, 1);
			else if (this.#maxSelections) values = values.slice(0, this.#maxSelections);
			const previous = normalizeValues(this.#value);
			const changed = previous.length !== values.length || previous.some((entry, index) => entry !== values[index]);
			this.#value = this.#multiple ? values : values[0] ?? null;
			for (const entry of values) {
				const element = this.#lookup.get(String(entry)).element;
				if (!containsNode(this.node, element)) _fr0st_query.default.append(this.node, element);
			}
			const selected = new Set(values.map(String));
			const options = _fr0st_query.default.getProperty(this.node, "options");
			for (const option of options) _fr0st_query.default.setProperty(option, { selected: selected.has(_fr0st_query.default.getValue(option)) });
			if (!values.length) _fr0st_query.default.setProperty(this.node, { selectedIndex: -1 });
			this.#refresh();
			if (records.length && _fr0st_query.default.is(this.node, ":disabled")) {
				this.hide();
				if (!this.node) return;
			}
			if (this.#open && !notify) this.#load();
			if (notify && changed) {
				this.#notifying = true;
				try {
					_fr0st_query.default.triggerEvent(this.node, "change.ui.selectmenu");
				} finally {
					this.#notifying = false;
				}
			}
		}
		/**
		* Sizes the multiple search input to its text.
		*/
		#updateSearchWidth() {
			if (!this.#multiple) return;
			const span = _fr0st_query.default.create("span", {
				text: _fr0st_query.default.getValue(this.#searchInput),
				style: {
					position: "absolute",
					visibility: "hidden",
					font: _fr0st_query.default.css(this.#searchInput, "font"),
					whiteSpace: "pre"
				}
			});
			_fr0st_query.default.append(this.node.ownerDocument.body, span);
			_fr0st_query.default.setStyle(this.#searchInput, "width", `${_fr0st_query.default.width(span) + 2}px`);
			_fr0st_query.default.remove(span);
		}
	};

//#endregion
//#region src/js/index.js
	(0, _fr0st_ui.initComponent)("selectmenu", SelectMenu);
	var js_default = SelectMenu;

//#endregion
exports.SelectMenu = js_default;
});
//# sourceMappingURL=frost-ui-selectmenu.js.map