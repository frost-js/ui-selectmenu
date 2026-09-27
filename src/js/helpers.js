/** @import { SelectMenuItem, SelectMenuValue } from './select-menu.js'; */

import $ from '@fr0st/query';

/**
 * Copies public item data without exposing internal DOM nodes.
 * @param {SelectMenuItem} item The internal item.
 * @returns {SelectMenuItem|undefined} The copied item.
 */
export function cloneItem(item) {
    if (!item) {
        return;
    }

    const { element: _, children, ...data } = item;
    const copy = $._extend({}, data);

    if (children) {
        copy.children = children.map(cloneItem);
    }

    return copy;
}

/**
 * Gets all leaf items from a grouped result set.
 * @param {SelectMenuItem[]} items The items and groups.
 * @returns {SelectMenuItem[]} The leaf items.
 */
export function flattenItems(items) {
    return items.flatMap((item) => item.children ? flattenItems(item.children) : item);
}

/**
 * Reads native option data while retaining original option elements.
 * @param {HTMLSelectElement|HTMLOptGroupElement} node The select or group.
 * @returns {SelectMenuItem[]} The native data.
 */
export function getDomData(node) {
    return [...node.children]
        .filter((child) => child.matches('option, optgroup'))
        .map((child) => {
            if (child.matches('optgroup')) {
                return {
                    text: child.label,
                    disabled: child.disabled,
                    children: getDomData(child),
                };
            }

            return {
                ...$.getDataset(child),
                text: child.textContent,
                value: child.value,
                disabled: child.matches(':disabled'),
                element: child,
            };
        });
}

/**
 * Normalizes scalar and array values using native select string keys.
 * @param {SelectMenuValue|SelectMenuValue[]|null} value The input value.
 * @returns {SelectMenuValue[]} Unique non-null values.
 */
export function normalizeValues(value) {
    const values = Array.isArray(value) ? value : [value];
    const entries = values
        .filter((entry) => entry !== null && entry !== undefined)
        .map((entry) => [String(entry), entry]);

    return [...new Map(entries).values()];
}

/**
 * Normalizes text for case- and accent-insensitive matching and sorting.
 * @param {string} value The text to normalize.
 * @returns {string} The normalized text.
 */
export function normalizeText(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}
