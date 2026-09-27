import $ from "@fr0st/query";
import { BaseComponent, Popper, generateId, initComponent } from "@fr0st/ui";

//#region src/js/select-menu.js
/**
* SelectMenu Class
* @class
*/
var SelectMenu = class extends BaseComponent {
	/**
	* New SelectMenu constructor.
	* @param {HTMLElement} node The input node.
	* @param {object} [options] The options to create the SelectMenu with.
	*/
	constructor(node, options) {
		super(node, options);
		if (!$.is(this._node, "select")) throw new Error("SelectMenu must be created on a select element");
		this._placeholderText = this._options.placeholder;
		this._maxSelections = this._options.maxSelections;
		this._multiple = $.getProperty(this._node, "multiple");
		this._data = [];
		this._lookup = {};
		this._activeItems = [];
		this._getData = null;
		let data;
		if ($._isFunction(this._options.getResults)) this._getResultsInit();
		else if ($._isPlainObject(this._options.data)) data = this._getDataFromObject(this._options.data);
		else if ($._isArray(this._options.data)) data = this._options.data;
		else data = this._getDataFromDOM(this._node);
		if (data) {
			this._data = this._parseData(data);
			this._lookup = this._parseDataLookup(data);
			this._getDataInit();
		}
		let value;
		if (this._multiple) value = [...this._node.selectedOptions].map((option) => $.getValue(option));
		else value = $.getValue(this._node);
		this._render();
		this._loadValue(value);
		this._events();
	}
	/**
	* Disable the SelectMenu.
	*/
	disable() {
		$.setAttribute(this._node, { disabled: true });
		this._refreshDisabled();
	}
	/**
	* Dispose the SelectMenu.
	*/
	dispose() {
		if (this._popper) {
			this._popper.dispose();
			this._popper = null;
		}
		$.removeAttribute(this._node, "tabindex");
		$.removeEvent(this._node, "focus.ui.selectmenu");
		$.removeClass(this._node, this.constructor.classes.hide);
		$.remove(this._menuNode);
		$.remove(this._toggle);
		this._toggle = null;
		this._clear = null;
		this._searchInput = null;
		this._placeholder = null;
		this._menuNode = null;
		this._itemsList = null;
		this._data = null;
		this._lookup = null;
		this._activeItems = null;
		this._value = null;
		this._requests = null;
		this._popperOptions = null;
		this._getData = null;
		super.dispose();
	}
	/**
	* Enable the SelectMenu.
	*/
	enable() {
		$.removeAttribute(this._node, "disabled");
		this._refreshDisabled();
	}
	/**
	* Hide the SelectMenu.
	*/
	hide() {
		if (!$.isConnected(this._menuNode) || $.getDataset(this._menuNode, "uiAnimating") || !$.triggerOne(this._node, "hide.ui.selectmenu")) return;
		$.setDataset(this._menuNode, { uiAnimating: "out" });
		this._refreshPlaceholder();
		$.setValue(this._searchInput, "");
		$.fadeOut(this._menuNode, { duration: this._options.duration }).then((_) => {
			this._popper.dispose();
			this._popper = null;
			this._activeItems = [];
			$.empty(this._itemsList);
			$.detach(this._menuNode);
			$.removeDataset(this._menuNode, "uiAnimating");
			$.setAttribute(this._toggle, {
				"aria-expanded": false,
				"aria-activedescendent": ""
			});
			$.setAttribute(this._searchInput, { "aria-activedescendent": "" });
			$.triggerEvent(this._node, "hidden.ui.selectmenu");
		}).catch((_) => {
			if ($.getDataset(this._menuNode, "uiAnimating") === "out") $.removeDataset(this._menuNode, "uiAnimating");
		});
	}
	/**
	* Show the SelectMenu.
	*/
	show() {
		if ($.is(this._node, ":disabled") || $.isConnected(this._menuNode) || $.getDataset(this._menuNode, "uiAnimating") || !$.triggerOne(this._node, "show.ui.selectmenu")) return;
		const term = $.getValue(this._searchInput);
		this._getData({ term });
		$.setDataset(this._menuNode, { uiAnimating: "in" });
		if (this._options.appendTo) $.append(this._options.appendTo, this._menuNode);
		else $.after(this._toggle, this._menuNode);
		this._popper = new Popper(this._menuNode, this._popperOptions);
		$.fadeIn(this._menuNode, { duration: this._options.duration }).then((_) => {
			$.removeDataset(this._menuNode, "uiAnimating");
			$.setAttribute(this._toggle, { "aria-expanded": true });
			$.triggerEvent(this._node, "shown.ui.selectmenu");
		}).catch((_) => {
			if ($.getDataset(this._menuNode, "uiAnimating") === "in") $.removeDataset(this._menuNode, "uiAnimating");
		});
	}
	/**
	* Toggle the SelectMenu.
	* @return {SelectMenu} The SelectMenu.
	*/
	toggle() {
		return $.isConnected(this._menuNode) ? this.hide() : this.show();
	}
	/**
	* Update the SelectMenu position.
	* @return {SelectMenu} The SelectMenu.
	*/
	update() {
		if (this._popper) this._popper.update();
		return this;
	}
};

//#endregion
//#region src/js/prototype/api.js
/**
* Get data for the selected value(s).
* @return {array|object} The selected item(s).
*/
function data() {
	if (!this._multiple) return this._cloneItem(this._findValue(this._value));
	return this._value.map((value) => this._cloneItem(this._findValue(value)));
}
/**
* Get the maximum selections.
* @return {number} The maximum selections.
*/
function getMaxSelections() {
	return this._maxSelections;
}
/**
* Get the placeholder text.
* @return {string} The placeholder text.
*/
function getPlaceholder() {
	return this._placeholderText;
}
/**
* Get the selected value(s).
* @return {string|number|array} The selected value(s).
*/
function getValue() {
	return this._value;
}
/**
* Set the maximum selections.
* @param {number} maxSelections The maximum selections.
*/
function setMaxSelections(maxSelections) {
	this._maxSelections = maxSelections;
	this.hide();
	this._refresh();
}
/**
* Set the placeholder text.
* @param {string} placeholder The placeholder text.
*/
function setPlaceholder(placeholder) {
	this._placeholderText = placeholder;
	$.remove(this._placeholder);
	this._renderPlaceholder();
	this._refresh();
}
/**
* Set the selected value(s).
* @param {string|number|array} value The value to set.
*/
function setValue(value) {
	this._loadValue(value);
}

//#endregion
//#region src/js/prototype/data.js
/**
* Initialize preloaded get data.
*/
function _getDataInit() {
	this._getData = ({ term = null }) => {
		this._activeItems = [];
		$.empty(this._itemsList);
		$.setAttribute(this._toggle, { "aria-activedescendent": "" });
		$.setAttribute(this._searchInput, { "aria-activedescendent": "" });
		if (this._options.minSearch && (!term || term.length < this._options.minSearch)) {
			if (this._multiple) $.hide(this._menuNode);
			this.update();
			return;
		}
		$.show(this._menuNode);
		if (this._multiple && this._maxSelections && this._value.length >= this._maxSelections) {
			const info = this._renderInfo(this._options.lang.maxSelections);
			$.append(this._itemsList, info);
			this.update();
			return;
		}
		let results = this._data;
		if (term) {
			const isMatch = this._options.isMatch.bind(this);
			const sortResults = this._options.sortResults.bind(this);
			results = this._data.flatMap((item) => "children" in item && $._isArray(item.children) ? item.children : item).map((item) => this._cloneItem(item)).filter((data) => isMatch(data, term)).sort((a, b) => sortResults(a, b, term));
		}
		this._renderResults(results);
		this.update();
	};
}
/**
* Initialize get data from callback.
*/
function _getResultsInit() {
	const load = $._debounce(({ offset, term }) => {
		const options = { offset };
		if (term) options.term = term;
		const request = Promise.resolve(this._options.getResults(options));
		request.then((response) => {
			const newData = this._parseData(response.results);
			Object.assign(this._lookup, this._parseDataLookup(newData));
			if (this._request !== request) return;
			if (!offset) {
				this._data = newData;
				$.empty(this._itemsList);
			} else {
				this._data.push(...newData);
				$.detach(this._loader);
			}
			this._showMore = response.showMore;
			this._renderResults(newData);
			this._request = null;
		}).catch((_) => {
			if (this._request !== request) return;
			$.detach(this._loader);
			$.append(this._itemsList, this._error);
			this._request = null;
		}).finally((_) => {
			this._loadingScroll = false;
			this.update();
		});
		this._request = request;
	}, this._options.debounce);
	this._getData = ({ offset = 0, term = null }) => {
		if (this._request && this._request.cancel) this._request.cancel();
		this._request = null;
		if (!offset) {
			this._activeItems = [];
			$.setAttribute(this._toggle, { "aria-activedescendent": "" });
			$.setAttribute(this._searchInput, { "aria-activedescendent": "" });
			const children = $.children(this._itemsList, (node) => !$.isSame(node, this._loader));
			$.detach(children);
		} else $.detach(this._error);
		if (this._options.minSearch && (!term || term.length < this._options.minSearch)) {
			if (this._multiple) $.hide(this._menuNode);
			this.update();
			return;
		}
		$.show(this._menuNode);
		if (this._multiple && this._maxSelections && this._value.length >= this._maxSelections) {
			const info = this._renderInfo(this._options.lang.maxSelections);
			$.append(this._itemsList, info);
			this.update();
			return;
		}
		const lastChild = $.child(this._itemsList, ":last-child");
		if (!lastChild || !$.isSame(lastChild, this._loader)) $.append(this._itemsList, this._loader);
		this.update();
		load({
			offset,
			term
		});
	};
}

//#endregion
//#region src/js/prototype/events.js
/**
* Attach events for the SelectMenu.
*/
function _events() {
	$.addEvent(this._itemsList, "contextmenu.ui.selectmenu", (e) => {
		e.preventDefault();
	});
	$.addEvent(this._menuNode, "mousedown.ui.selectmenu", (e) => {
		if ($.isSame(this._searchInput, e.target)) return;
		e.preventDefault();
	});
	$.addEvent(this._menuNode, "click.ui.selectmenu", (e) => {
		e.stopPropagation();
	});
	$.addEvent(this._node, "focus.ui.selectmenu", (_) => {
		if (!$.isSame(this._node, document.activeElement)) return;
		if (this._multiple) $.focus(this._searchInput);
		else $.focus(this._toggle);
	});
	$.addEventDelegate(this._itemsList, "click.ui.selectmenu", "[data-ui-action=\"select\"]", (e) => {
		e.preventDefault();
		if (this._multiple) $.setDataset(this._searchInput, { uiKeepFocus: true });
		const value = $.getDataset(e.currentTarget, "uiValue");
		this._selectValue(value);
		if (this._multiple) $.removeDataset(this._searchInput, "uiKeepFocus");
	});
	$.addEventDelegate(this._itemsList, "mouseover.ui.selectmenu", "[data-ui-action=\"select\"]", $.debounce((e) => {
		const focusedNode = $.findOne("[data-ui-focus]", this._itemsList);
		$.removeClass(focusedNode, this.constructor.classes.focus);
		$.removeDataset(focusedNode, "uiFocus");
		$.addClass(e.currentTarget, this.constructor.classes.focus);
		$.setDataset(e.currentTarget, { uiFocus: true });
		const id = $.getAttribute(e.currentTarget, "id");
		$.setAttribute(this._toggle, { "aria-activedescendent": id });
		$.setAttribute(this._searchInput, { "aria-activedescendent": id });
	}));
	$.addEvent(this._searchInput, "input.ui.selectmenu", $.debounce((_) => {
		if (this._multiple) this._updateSearchWidth();
		if (this._multiple && !$.isConnected(this._menuNode)) this.show();
		else {
			const term = $.getValue(this._searchInput);
			this._getData({ term });
		}
	}));
	$.addEvent(this._searchInput, "keydown.ui.selectmenu", (e) => {
		if (e.code === "Backspace") {
			if (this._multiple && this._value.length && !$.getValue(this._searchInput)) {
				e.preventDefault();
				const lastValue = this._value.pop();
				const lastLabel = this._findValue(lastValue).text;
				if (this._multiple) $.setDataset(this._searchInput, { uiKeepFocus: true });
				this._refreshMulti();
				$.setValue(this._searchInput, lastLabel);
				$.focus(this._searchInput);
				this._updateSearchWidth();
				$.triggerEvent(this._searchInput, "input.ui.selectmenu");
				if (this._multiple) $.removeDataset(this._searchInput, "uiKeepFocus");
			}
			return;
		}
		if (e.code === "Escape" && $.isConnected(this._menuNode)) {
			e.stopPropagation();
			this.hide();
			if (this._multiple) {
				$.blur(this._searchInput);
				$.focus(this._searchInput);
			} else $.focus(this._toggle);
			return;
		}
		if (![
			"ArrowDown",
			"ArrowUp",
			"Enter",
			"NumpadEnter"
		].includes(e.code)) return;
		if (this._multiple && !$.isConnected(this._menuNode)) {
			this.show();
			return;
		}
		const focusedNode = $.findOne("[data-ui-focus]", this._itemsList);
		switch (e.code) {
			case "Enter":
			case "NumpadEnter":
				if (focusedNode) {
					const value = $.getDataset(focusedNode, "uiValue");
					this._selectValue(value);
				}
				return;
		}
		e.preventDefault();
		let focusNode;
		if (!focusedNode) focusNode = this._activeItems[0];
		else {
			let focusIndex = this._activeItems.indexOf(focusedNode);
			switch (e.code) {
				case "ArrowDown":
					focusIndex++;
					break;
				case "ArrowUp": focusIndex--;
			}
			focusNode = this._activeItems[focusIndex];
		}
		if (!focusNode) return;
		$.removeClass(focusedNode, this.constructor.classes.focus);
		$.removeDataset(focusedNode, "uiFocus");
		$.addClass(focusNode, this.constructor.classes.focus);
		$.setDataset(focusNode, { uiFocus: true });
		const id = $.getAttribute(focusNode, "id");
		$.setAttribute(this._toggle, { "aria-activedescendent": id });
		$.setAttribute(this._searchInput, { "aria-activedescendent": id });
		const itemsScrollY = $.getScrollY(this._itemsList);
		const itemsRect = $.rect(this._itemsList, { offset: true });
		const nodeRect = $.rect(focusNode, { offset: true });
		if (nodeRect.top < itemsRect.top) $.setScrollY(this._itemsList, itemsScrollY + nodeRect.top - itemsRect.top);
		else if (nodeRect.bottom > itemsRect.bottom) $.setScrollY(this._itemsList, itemsScrollY + nodeRect.bottom - itemsRect.bottom);
	});
	if (this._options.getResults) $.addEvent(this._itemsList, "scroll.ui.selectmenu", $._throttle((_) => {
		if (this._request || !this._showMore) return;
		const height = $.height(this._itemsList);
		const scrollHeight = $.height(this._itemsList, { boxSize: $.SCROLL_BOX });
		if ($.getScrollY(this._itemsList) >= scrollHeight - height - height / 4) {
			const term = $.getValue(this._searchInput);
			const offset = this._data.length;
			this._loadingScroll = true;
			this._getData({
				term,
				offset
			});
		}
	}, 250, { leading: false }));
	if (this._multiple) this._eventsMulti();
	else this._eventsSingle();
}
/**
* Attach events for a multiple SelectMenu.
*/
function _eventsMulti() {
	$.addEvent(this._searchInput, "focus.ui.selectmenu", (_) => {
		if (!$.isSame(this._searchInput, document.activeElement)) return;
		$.hide(this._placeholder);
		$.detach(this._placeholder);
		$.addClass(this._toggle, "focus");
	});
	$.addEvent(this._searchInput, "blur.ui.selectmenu", (_) => {
		if (!$.isConnected(this._searchInput)) return;
		if ($.isSame(this._searchInput, document.activeElement)) return;
		if ($.getDataset(this._searchInput, "uiKeepFocus")) return;
		$.removeClass(this._toggle, "focus");
		if (!$.isConnected(this._menuNode)) {
			this._refreshPlaceholder();
			return;
		}
		if ($.getDataset(this._menuNode, "uiAnimating") === "out") return;
		$.stop(this._menuNode);
		$.removeDataset(this._menuNode, "uiAnimating");
		this.hide();
	});
	$.addEvent(this._toggle, "mousedown.ui.selectmenu", (e) => {
		if ($.is(e.target, "[data-ui-action=\"clear\"]")) {
			e.preventDefault();
			return;
		}
		if ($.hasClass(this._toggle, "focus")) $.setDataset(this._searchInput, { uiKeepFocus: true });
		else {
			$.hide(this._placeholder);
			$.addClass(this._toggle, "focus");
		}
		$.addEventOnce(window, "mouseup.ui.selectmenu", (_) => {
			$.removeDataset(this._searchInput, "uiKeepFocus");
			$.focus(this._searchInput);
			if (!e.button) this.show();
		});
	});
	$.addEventDelegate(this._toggle, "click.ui.selectmenu", "[data-ui-action=\"clear\"]", (e) => {
		if (e.button) return;
		e.stopPropagation();
		const element = $.parent(e.currentTarget);
		const index = $.index(element);
		const value = this._value.slice();
		value.splice(index, 1);
		this._setValue(value, { triggerEvent: true });
		$.focus(this._searchInput);
	});
}
/**
* Attach events for a single SelectMenu.
*/
function _eventsSingle() {
	$.addEvent(this._searchInput, "blur.ui.selectmenu", (_) => {
		if ($.isSame(this._searchInput, document.activeElement)) return;
		if ($.getDataset(this._menuNode, "uiAnimating") === "out") return;
		$.stop(this._menuNode);
		$.removeDataset(this._menuNode, "uiAnimating");
		this.hide();
	});
	$.addEvent(this._toggle, "mousedown.ui.selectmenu", (e) => {
		if ($.is(e.target, "[data-ui-action=\"clear\"]")) {
			e.preventDefault();
			return;
		}
		if (e.button) return;
		if ($.isConnected(this._menuNode)) this.hide();
		else {
			this.show();
			$.addEventOnce(window, "mouseup.ui.selectmenu", (_) => {
				$.focus(this._searchInput);
			});
		}
	});
	$.addEvent(this._toggle, "keydown.ui.selectmenu", (e) => {
		const searching = /^.$/u.test(e.key);
		if (!searching && ![
			"ArrowDown",
			"ArrowUp",
			"Enter",
			"NumpadEnter"
		].includes(e.code)) return;
		if (!searching) e.preventDefault();
		this.show();
		$.focus(this._searchInput);
	});
	if (this._options.allowClear) $.addEventDelegate(this._toggle, "click.ui.selectmenu", "[data-ui-action=\"clear\"]", (e) => {
		if (e.button) return;
		e.stopPropagation();
		this._setValue(null, { triggerEvent: true });
		if ($.isConnected(this._menuNode)) this.hide();
	});
}

//#endregion
//#region src/js/prototype/helpers.js
/**
* Clone data for an item.
* @param {object} item The item to clone.
* @return {object} The cloned data.
*/
function _cloneItem(item) {
	if (!item) return item;
	const { element: _, ...data } = item;
	return $._extend({}, data);
}
/**
* Retrieve data for a value.
* @param {string|number} value The value to retrieve data for.
* @return {object} The data.
*/
function _findValue(value) {
	if (value in this._lookup) return this._lookup[value];
	return null;
}
/**
* Set a new value, loading the data if it has not already been loaded.
* @param {string|number|array} value The value to load.
*/
function _loadValue(value) {
	if (!value || !this._options.getResults) {
		this._setValue(value);
		return;
	}
	if (this._multiple ? value.every((val) => this._findValue(val)) : this._findValue(value)) {
		this._setValue(value);
		return;
	}
	Promise.resolve(this._options.getResults({ value })).then((response) => {
		const newData = this._parseData(response.results);
		Object.assign(this._lookup, this._parseDataLookup(newData));
		this._setValue(value);
	}).catch((_) => {});
}
/**
* Refresh the selected value(s).
*/
function _refresh() {
	if (this._multiple) this._refreshMulti();
	else this._refreshSingle();
}
/**
* Refresh the toggle disabled class.
*/
function _refreshDisabled() {
	const element = this._multiple ? this._searchInput : this._toggle;
	const disabled = $.is(this._node, ":disabled");
	if (disabled) {
		$.addClass(this._toggle, this.constructor.classes.disabled);
		$.setAttribute(element, { tabindex: -1 });
	} else {
		$.removeClass(this._toggle, this.constructor.classes.disabled);
		$.removeAttribute(element, "tabindex");
	}
	$.setAttribute(this._toggle, { "aria-disabled": disabled });
}
/**
* Refresh the selected value(s) for a multiple SelectMenu.
*/
function _refreshMulti() {
	if (!this._value) this._value = [];
	this._value = this._value.filter((value) => {
		const item = this._findValue(value);
		return item && !item.disabled;
	});
	this._value = $._unique(this._value);
	if (this._maxSelections && this._value.length > this._maxSelections) this._value = this._value.slice(0, this._maxSelections);
	$.detach(this._searchInput);
	$.empty(this._node);
	$.empty(this._toggle);
	this._refreshDisabled();
	this._refreshPlaceholder();
	for (const value of this._value) {
		const item = this._findValue(value);
		$.append(this._node, item.element);
		const group = this._renderMultiSelection(item);
		$.append(this._toggle, group);
	}
	$.append(this._toggle, this._searchInput);
}
/**
* Refresh the placeholder.
*/
function _refreshPlaceholder() {
	if (this._multiple ? this._value.length > 0 : !!this._value) $.hide(this._placeholder);
	else {
		$.show(this._placeholder);
		$.prepend(this._toggle, this._placeholder);
	}
}
/**
* Refresh the selected value for a single SelectMenu.
*/
function _refreshSingle() {
	const item = this._findValue(this._value);
	if (!item || item.disabled) this._value = null;
	$.empty(this._node);
	$.empty(this._toggle);
	this._refreshDisabled();
	this._refreshPlaceholder();
	if (!this._value) return;
	$.append(this._node, item.element);
	const element = $.create("div", { class: this.constructor.classes.selectionSingle });
	$.append(this._toggle, element);
	if (this._options.allowClear) $.append(this._toggle, this._clear);
	const data = this._cloneItem(item);
	const content = this._options.renderSelection.bind(this)(data, element);
	if ($._isString(content)) $.setHTML(element, this._options.sanitize(content));
	else if ($._isElement(content) && !$.isSame(tag, content)) $.append(element, content);
}
/**
* Select a value (from DOM event).
* @param {string|number} value The value to select.
*/
function _selectValue(value) {
	const item = this._findValue(value);
	if (!item) return;
	value = item.value;
	if (this._multiple) {
		const index = this._value.findIndex((otherValue) => otherValue == value);
		if (index >= 0) {
			value = this._value.slice();
			value.splice(index, 1);
		} else value = this._value.concat([value]);
	}
	this._setValue(value, { triggerEvent: true });
	this._refreshPlaceholder();
	$.setValue(this._searchInput, "");
	if (this._options.closeOnSelect) this.hide();
	else this._getData({});
	if (this._multiple) $.focus(this._searchInput);
	else $.focus(this._toggle);
}
/**
* Select the selected value(s).
* @param {string|number|array} value The value to select.
* @param {object} [options] Options for setting the value(s).
* @param {Boolean} [options.triggerEvent] Whether to trigger the change event.
*/
function _setValue(value, { triggerEvent = false } = {}) {
	let valueChanged;
	if (this._multiple) valueChanged = !this._value || value.length !== this._value.length || value.some((val, index) => val !== this._value[index]);
	else valueChanged = value !== this._value;
	if (!valueChanged) return;
	this._value = value;
	this._refresh();
	if (triggerEvent) $.triggerEvent(this._node, "change.ui.selectmenu");
}
/**
* Update the search input width.
*/
function _updateSearchWidth() {
	const span = $.create("span", {
		text: $.getValue(this._searchInput),
		style: {
			display: "inline-block",
			fontSize: $.css(this._searchInput, "fontSize"),
			whiteSpace: "pre-wrap"
		}
	});
	$.append(document.body, span);
	const width = $.width(span);
	$.setStyle(this._searchInput, { width: width + 2 });
	$.remove(span);
}

//#endregion
//#region src/js/prototype/parsers.js
/**
* Build an option element for an item.
* @param {object} item The item to use.
* @return {HTMLElement} The option element.
*/
function _buildOption(item) {
	return $.create("option", {
		text: item.text,
		value: item.value,
		properties: { selected: true }
	});
}
/**
* Build a data array from a DOM element.
* @param {HTMLElement} element The element to parse.
* @return {array} The parsed data.
*/
function _getDataFromDOM(element) {
	return $.children(element).map((child) => {
		const data = $.getDataset(child);
		if ($.is(child, "option")) return {
			text: $.getText(child),
			value: $.getValue(child),
			disabled: $.is(child, ":disabled"),
			...data
		};
		return {
			text: $.getAttribute(child, "label"),
			children: this._getDataFromDOM(child),
			...data
		};
	});
}
/**
* Build a data array from an object.
* @param {object} data The data to parse.
* @return {array} The parsed data.
*/
function _getDataFromObject(data) {
	return Object.entries(data).map(([value, text]) => ({
		value,
		text
	}));
}
/**
* Add option elements to data.
* @param {array} data The data to parse.
* @return {array} The parsed data.
*/
function _parseData(data) {
	for (const item of data) if ("children" in item && $._isArray(item.children)) this._parseData(item.children);
	else item.element = this._buildOption(item);
	return data;
}
/**
* Populate lookup with data.
* @param {array} data The data to parse.
* @param {object} [lookup] The lookup.
* @return {object} The populated lookup.
*/
function _parseDataLookup(data, lookup = {}) {
	for (const item of data) if ("children" in item) this._parseDataLookup(item.children, lookup);
	else {
		const key = item.value;
		lookup[key] = $._extend({}, item);
	}
	return lookup;
}

//#endregion
//#region src/js/prototype/render.js
/**
* Render the toggle element.
*/
function _render() {
	this._renderPlaceholder();
	this._renderMenu();
	if (this._multiple) this._renderToggleMulti();
	else {
		if (this._options.allowClear) this._renderClear();
		this._renderToggleSingle();
	}
	if (this._options.getResults) {
		this._loader = this._renderInfo(this._options.lang.loading);
		this._error = this._renderInfo(this._options.lang.error);
	}
	this._popperOptions = {
		reference: this._toggle,
		placement: this._options.placement,
		position: this._options.position,
		fixed: this._options.fixed,
		spacing: this._options.spacing,
		minContact: this._options.minContact
	};
	if (this._options.fullWidth) {
		this._popperOptions.beforeUpdate = (node) => {
			$.setStyle(node, { width: "" });
		};
		this._popperOptions.afterUpdate = (node, reference) => {
			const width = $.width(reference, { boxSize: $.BORDER_BOX });
			$.setStyle(node, "width", `${width}px`);
		};
	}
	$.addClass(this._node, this.constructor.classes.hide);
	$.setAttribute(this._node, { tabindex: -1 });
	$.after(this._node, this._toggle);
}
/**
* Render the clear button.
*/
function _renderClear() {
	this._clear = $.create("span", {
		class: this.constructor.classes.clear,
		attributes: {
			"role": "button",
			"aria-label": this._options.lang.clear
		},
		dataset: { uiAction: "clear" }
	});
}
/**
* Render a group item.
* @param {object} item The group item to render.
* @return {HTMLElement} The group.
*/
function _renderGroup(item) {
	const id = generateId("selectmenu-group");
	const groupContainer = $.create("li", { attributes: {
		id,
		"role": "group",
		"aria-label": item.text
	} });
	const element = $.create("div", { class: this.constructor.classes.group });
	const data = this._cloneItem(item);
	const content = this._options.renderResult.bind(this)(data, element);
	if ($._isString(content)) $.setHTML(element, this._options.sanitize(content));
	else if ($._isElement(content) && !$.isSame(element, content)) $.append(element, content);
	$.append(groupContainer, element);
	const childList = $.create("ul", {
		class: this.constructor.classes.groupContainer,
		attributes: { role: "none" }
	});
	$.append(groupContainer, childList);
	for (const child of item.children) {
		const element = this._renderItem(child, childList);
		$.append(childList, element);
	}
	return groupContainer;
}
/**
* Render an information item.
* @param {string} text The text to render.
* @return {HTMLElement} The information item.
*/
function _renderInfo(text) {
	return $.create("li", {
		html: this._options.sanitize(text),
		class: this.constructor.classes.info
	});
}
/**
* Render an item.
* @param {object} item The item to render.
* @return {HTMLElement} The item.
*/
function _renderItem(item) {
	const id = generateId("selectmenu-item");
	const value = item.value;
	const active = this._multiple ? this._value.some((otherValue) => otherValue == value) : value == this._value;
	const element = $.create("li", {
		class: this.constructor.classes.item,
		attributes: {
			id,
			"role": "option",
			"aria-label": item.text,
			"aria-selected": active
		}
	});
	if (item.disabled) {
		$.addClass(element, this.constructor.classes.disabledItem);
		$.setAttribute(element, { "aria-disabled": true });
	} else {
		this._activeItems.push(element);
		$.setDataset(element, {
			uiAction: "select",
			uiValue: value
		});
	}
	if (active) {
		$.addClass(element, this.constructor.classes.active);
		$.setDataset(element, { uiActive: true });
	}
	const data = this._cloneItem(item);
	const content = this._options.renderResult.bind(this)(data, element);
	if ($._isString(content)) $.setHTML(element, this._options.sanitize(content));
	else if ($._isElement(content) && !$.isSame(element, content)) $.append(element, content);
	return element;
}
/**
* Render the menu.
*/
function _renderMenu() {
	this._menuNode = $.create("div", { class: this.constructor.classes.menu });
	if ($.is(this._node, ".input-sm")) $.addClass(this._menuNode, this.constructor.classes.menuSmall);
	else if ($.is(this._node, ".input-lg")) $.addClass(this._menuNode, this.constructor.classes.menuLarge);
	const id = generateId("selectmenu");
	if (!this._multiple) {
		const searchOuter = $.create("div", { class: this.constructor.classes.searchOuter });
		$.append(this._menuNode, searchOuter);
		const searchContainer = $.create("div", { class: this.constructor.classes.searchContainer });
		$.append(searchOuter, searchContainer);
		this._searchInput = $.create("input", {
			class: this._options.searchInputStyle === "filled" ? this.constructor.classes.searchInputFilled : this.constructor.classes.searchInputOutline,
			attributes: {
				"role": "searchbox",
				"aria-autocomplete": "list",
				"aria-controls": id,
				"aria-activedescendent": "",
				"aria-label": this._options.lang.search,
				"autocomplete": "off"
			}
		});
		$.append(searchContainer, this._searchInput);
		if (this._options.searchInputStyle === "filled") {
			const ripple = $.create("div", { class: this.constructor.classes.searchInputRipple });
			$.append(searchContainer, ripple);
		}
	}
	this._itemsList = $.create("ul", {
		class: this.constructor.classes.items,
		style: { maxHeight: this._options.maxHeight },
		attributes: {
			id,
			role: "listbox"
		}
	});
	if (this._multiple) $.setAttribute(this._itemsList, { "aria-multiselectable": true });
	$.append(this._menuNode, this._itemsList);
}
/**
* Render a multiple selection item.
* @param {object} item The item to render.
* @return {HTMLElement} The selection group.
*/
function _renderMultiSelection(item) {
	const group = $.create("div", { class: this.constructor.classes.multiGroup });
	const closeBtn = $.create("div", {
		class: this.constructor.classes.multiClear,
		attributes: {
			"role": "button",
			"aria-label": this._options.lang.clear
		},
		dataset: { uiAction: "clear" }
	});
	$.append(group, closeBtn);
	const closeIcon = $.create("small", { class: this.constructor.classes.multiClearIcon });
	$.append(closeBtn, closeIcon);
	const element = $.create("div", { class: this.constructor.classes.multiItem });
	const data = this._cloneItem(item);
	const content = this._options.renderSelection.bind(this)(data, element);
	if ($._isString(content)) $.setHTML(element, this._options.sanitize(content));
	else if ($._isElement(content) && !$.isSame(element, content)) $.append(element, content);
	$.append(group, element);
	return group;
}
/**
* Render the placeholder.
*/
function _renderPlaceholder() {
	this._placeholder = $.create("span", {
		html: this._placeholderText ? this._options.sanitize(this._placeholderText) : "&nbsp;",
		class: this.constructor.classes.placeholder
	});
}
/**
* Render results.
* @param {array} results The results to render.
*/
function _renderResults(results) {
	for (const item of results) {
		const element = "children" in item && $._isArray(item.children) ? this._renderGroup(item) : this._renderItem(item);
		$.append(this._itemsList, element);
	}
	if (!$.hasChildren(this._itemsList)) {
		const info = this._renderInfo(this._options.lang.noResults);
		$.append(this._itemsList, info);
		this.update();
		return;
	}
	if (!$.findOne("[data-ui-focus]", this._itemsList) && this._activeItems.length) {
		const element = this._activeItems[0];
		$.addClass(element, this.constructor.classes.focus);
		$.setDataset(element, { uiFocus: true });
		const id = $.getAttribute(element, "id");
		$.setAttribute(this._toggle, { "aria-activedescendent": id });
		$.setAttribute(this._searchInput, { "aria-activedescendent": id });
	}
}
/**
* Render the multiple toggle element.
*/
function _renderToggleMulti() {
	const id = $.getAttribute(this._itemsList, "id");
	this._toggle = $.create("div", {
		class: [$.getAttribute(this._node, "class") || "", this.constructor.classes.multiToggle],
		attributes: {
			"role": "combobox",
			"aria-haspopup": "listbox",
			"aria-expanded": false,
			"aria-disabled": false,
			"aria-controls": id,
			"aria-activedescendent": ""
		}
	});
	this._searchInput = $.create("input", {
		class: this.constructor.classes.multiSearchInput,
		attributes: {
			"role": "searchbox",
			"aria-autocomplete": "list",
			"aria-label": this._options.lang.search,
			"aria-describedby": id,
			"aria-activedescendent": "",
			"autocomplete": "off"
		}
	});
}
/**
* Render the single toggle element.
*/
function _renderToggleSingle() {
	const id = $.getAttribute(this._itemsList, "id");
	this._toggle = $.create("button", {
		class: [$.getAttribute(this._node, "class") || "", this.constructor.classes.toggle],
		attributes: {
			"type": "button",
			"role": "combobox",
			"aria-haspopup": "listbox",
			"aria-expanded": false,
			"aria-disabled": false,
			"aria-controls": id,
			"aria-activedescendent": ""
		}
	});
}

//#endregion
//#region src/js/index.js
SelectMenu.defaults = {
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
			const diff = aLower.indexOf(term) - bLower.indexOf(term);
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
SelectMenu.classes = {
	active: "active",
	clear: "btn-close mx-2 lh-base",
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
	searchInputRipple: "ripple-line",
	searchOuter: "p-1",
	selectionSingle: "me-auto",
	toggle: "selectmenu-toggle d-flex position-relative justify-content-between text-start"
};
var proto = SelectMenu.prototype;
proto.data = data;
proto.getMaxSelections = getMaxSelections;
proto.getPlaceholder = getPlaceholder;
proto.getValue = getValue;
proto.setMaxSelections = setMaxSelections;
proto.setPlaceholder = setPlaceholder;
proto.setValue = setValue;
proto._buildOption = _buildOption;
proto._cloneItem = _cloneItem;
proto._events = _events;
proto._eventsMulti = _eventsMulti;
proto._eventsSingle = _eventsSingle;
proto._findValue = _findValue;
proto._getDataFromDOM = _getDataFromDOM;
proto._getDataFromObject = _getDataFromObject;
proto._getDataInit = _getDataInit;
proto._getResultsInit = _getResultsInit;
proto._loadValue = _loadValue;
proto._parseData = _parseData;
proto._parseDataLookup = _parseDataLookup;
proto._refresh = _refresh;
proto._refreshDisabled = _refreshDisabled;
proto._refreshMulti = _refreshMulti;
proto._refreshPlaceholder = _refreshPlaceholder;
proto._refreshSingle = _refreshSingle;
proto._render = _render;
proto._renderClear = _renderClear;
proto._renderGroup = _renderGroup;
proto._renderInfo = _renderInfo;
proto._renderItem = _renderItem;
proto._renderMenu = _renderMenu;
proto._renderMultiSelection = _renderMultiSelection;
proto._renderPlaceholder = _renderPlaceholder;
proto._renderResults = _renderResults;
proto._renderToggleMulti = _renderToggleMulti;
proto._renderToggleSingle = _renderToggleSingle;
proto._selectValue = _selectValue;
proto._setValue = _setValue;
proto._updateSearchWidth = _updateSearchWidth;
initComponent("selectmenu", SelectMenu);
var js_default = SelectMenu;

//#endregion
export { js_default as default };
//# sourceMappingURL=frost-ui-selectmenu.esm.js.map