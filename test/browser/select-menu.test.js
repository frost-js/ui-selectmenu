import { expect, test } from '#test';

test.describe('SelectMenu', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate((_) => {
            document.body.innerHTML =
                '<button id="outside">Outside</button><br><label for="select">Fruit</label><select id="select" class="input-outline">' +
                '<option value="a">Apple</option><option value="b">Banana</option>' +
                '<option value="c" disabled>Cherry</option></select>';
        });
    });

    test.describe('#init', () => {
        for (const { name, init } of [
            { name: 'class', init: () => UI.SelectMenu.init(document.querySelector('#select')) },
            { name: 'QuerySet', init: () => $('#select').selectmenu() },
        ]) {
            test(`creates and registers a SelectMenu (${name})`, async ({ page }) => {
                const instance = await page.evaluateHandle(init);
                expect(await instance.evaluate((value) => value instanceof UI.SelectMenu)).toBe(true);
                expect(await instance.evaluate((value) => $.getData('#select', 'selectmenu') === value)).toBe(true);
                expect(await instance.evaluate((value) => Object.isFrozen(value.options))).toBe(true);
                await expect(page.getByRole('combobox', { name: 'Fruit' })).toHaveText('Apple');
                await expect(page.locator('#select option')).toHaveCount(3);
            });
        }

        test('reuses an existing instance and respects data options', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const node = document.querySelector('#select');
                node.dataset.uiPlaceholder = 'Choose fruit';
                const first = UI.SelectMenu.init(node);
                const second = UI.SelectMenu.init(node, { placeholder: 'Ignored' });
                return first === second && second.getPlaceholder() === 'Choose fruit';
            })).toBe(true);
            await expect(page.getByRole('combobox')).toHaveCount(1);
        });

        test('initializes multiple nodes and returns the first instance through QuerySet', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const first = document.querySelector('#select');
                const second = first.cloneNode(true);
                second.id = 'second';
                first.after(second);
                const instance = $('select').selectmenu();
                return instance === $.getData(first, 'selectmenu') && $.getData(second, 'selectmenu') instanceof UI.SelectMenu;
            })).toBe(true);
            await expect(page.getByRole('combobox')).toHaveCount(2);
        });

        test('rejects non-select nodes without leaving a registered instance', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const node = document.querySelector('#outside');
                try {
                    UI.SelectMenu.init(node);
                } catch (error) {
                    return error.message;
                }
            })).toBe('SelectMenu must be created on a select element');
            expect(await page.evaluate((_) => $.hasData('#outside', 'selectmenu'))).toBe(false);
        });

        test('inherits labels, descriptions, required state, and initial values', async ({ page }) => {
            await page.evaluate((_) => {
                const node = document.querySelector('#select');
                node.required = true;
                node.setAttribute('aria-describedby', 'help');
                node.value = 'b';
                UI.SelectMenu.init(node);
            });
            const control = page.getByRole('combobox', { name: 'Fruit' });
            await expect(control).toHaveText('Banana');
            await expect(control).toHaveAttribute('aria-describedby', 'help');
            await expect(control).toHaveAttribute('aria-required', 'true');
            await page.getByText('Fruit', { exact: true }).click();
            await expect(control).toBeFocused();
        });
    });

    test.describe('#dispose', () => {
        for (const { name, dispose } of [
            { name: 'class', dispose: () => $.getData('#select', 'selectmenu').dispose() },
            { name: 'QuerySet', dispose: () => $('#select').selectmenu('dispose') },
        ]) {
            test(`restores the native select and permits reinitialization (${name})`, async ({ page }) => {
                const state = await page.evaluateHandle((_) => {
                    const node = document.querySelector('#select');
                    node.tabIndex = 4;
                    const option = node.options[0];
                    const instance = UI.SelectMenu.init(node);
                    instance.setValue('b');
                    node.classList.add('runtime');
                    instance.show();
                    return { instance, option };
                });
                await page.evaluate(dispose);
                expect(await state.evaluate(({ instance }) => instance.node)).toBeNull();
                expect(await state.evaluate(({ instance }) => instance.options)).toBeNull();
                expect(await state.evaluate(({ option }) => document.querySelector('#select').options[0] === option)).toBe(true);
                await expect(page.locator('#select')).toHaveClass('input-outline runtime');
                await expect(page.locator('#select')).toHaveAttribute('tabindex', '4');
                await expect(page.locator('#select')).not.toHaveAttribute('aria-hidden');
                await expect(page.locator('#select')).toHaveValue('b');
                await expect(page.locator('.selectmenu-menu')).toHaveCount(0);
                await expect(page.locator('.selectmenu-toggle')).toHaveCount(0);
                await page.evaluate((_) => UI.SelectMenu.init(document.querySelector('#select')));
                await expect(page.getByRole('combobox', { name: 'Fruit' })).toHaveText('Banana');
            });
        }

        test('preserves existing visibility and accessibility attributes', async ({ page }) => {
            await page.evaluate((_) => {
                const node = document.querySelector('#select');
                node.classList.add('visually-hidden');
                node.setAttribute('aria-hidden', 'false');
                const instance = UI.SelectMenu.init(node);
                node.classList.remove('visually-hidden');
                instance.dispose();
                instance.dispose();
            });
            await expect(page.locator('#select')).toHaveClass('input-outline visually-hidden');
            await expect(page.locator('#select')).not.toHaveAttribute('tabindex');
            await expect(page.locator('#select')).toHaveAttribute('aria-hidden', 'false');
        });

        test('disposes automatically when fQuery removes the native control', async ({ page }) => {
            await page.evaluate((_) => {
                UI.SelectMenu.init(document.querySelector('#select')).show();
                $.remove('#select');
            });
            await expect(page.locator('.selectmenu-menu, .selectmenu-toggle')).toHaveCount(0);
        });

        test('does not remove another instance or consumer change listeners', async ({ page }) => {
            await page.evaluate((_) => {
                document.body.insertAdjacentHTML('beforeend', '<select id="second"><option>Other</option></select>');
                $('select').selectmenu();
                window.changes = 0;
                $.addEvent('#select', 'change.ui.selectmenu', () => window.changes++);
                $('#select').selectmenu('dispose');
                $.triggerEvent('#select', 'change.ui.selectmenu');
                $('#second').selectmenu('show');
            });
            expect(await page.evaluate((_) => window.changes)).toBe(1);
            await expect(page.getByRole('option', { name: 'Other' })).toBeVisible();
            await page.locator('#outside').click();
            await expect(page.locator('.selectmenu-menu')).toHaveCount(0);
        });
    });

    for (const method of ['disable', 'enable']) {
        test.describe(`#${method}`, () => {
            test('synchronizes native and generated disabled state', async ({ page }) => {
                await page.evaluate((method) => {
                    const node = document.querySelector('#select');
                    const instance = UI.SelectMenu.init(node, { allowClear: true });
                    instance.disable();
                    instance[method]();
                }, method);
                const enabled = method === 'enable';
                await expect(page.locator('#select')).toBeEnabled({ enabled });
                await expect(page.getByRole('combobox')).toBeEnabled({ enabled });
                await expect(page.getByRole('button', { name: 'Remove selection' })).toBeEnabled({ enabled });
            });
        });
    }

    test.describe('#getValue', () => {
        test('returns a copy of multiple values', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const node = document.querySelector('#select');
                node.multiple = true;
                const instance = UI.SelectMenu.init(node);
                instance.setValue(['a', 'b']);
                const values = instance.getValue();
                values.pop();
                return instance.getValue().length;
            })).toBe(2);
            await expect(page.locator('#select')).toHaveValues(['a', 'b']);
        });
    });

    test.describe('#setValue', () => {
        for (const { name, value, expected } of [
            { name: 'null clears the selection', value: null, expected: [] },
            { name: 'a scalar selects one option', value: 'a', expected: ['a'] },
            { name: 'an array selects multiple options', value: ['a', 'b'], expected: ['a', 'b'] },
            { name: 'duplicates and unknown values are ignored', value: ['a', 'a', 'missing'], expected: ['a'] },
        ]) {
            test(`normalizes multiple values (${name})`, async ({ page }) => {
                await page.evaluate((value) => {
                    const node = document.querySelector('#select');
                    node.multiple = true;
                    const instance = UI.SelectMenu.init(node);
                    instance.setValue(value);
                }, value);
                await expect(page.locator('#select')).toHaveValues(expected);
            });
        }

        for (const value of [0, '', '__proto__', 'constructor', 'toString', 'null']) {
            test(`supports the value ${JSON.stringify(value)}`, async ({ page }) => {
                expect(await page.evaluate((value) => {
                    const instance = UI.SelectMenu.init(document.querySelector('#select'), {
                        data: [{ value, text: 'Selected item' }],
                    });
                    instance.setValue(value);
                    return instance.getValue();
                }, value)).toBe(value);
                await expect(page.getByRole('combobox')).toHaveText('Selected item');
                await expect(page.locator('#select')).toHaveValue(String(value));
                await page.evaluate((_) => $('#select').selectmenu('setValue', null));
                expect(await page.evaluate((_) => $('#select').selectmenu('data'))).toBeNull();
            });
        }
    });

    test.describe('#data', () => {
        test('returns copied metadata without internal elements', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const instance = UI.SelectMenu.init(document.querySelector('#select'), { data: [{ value: 1, text: 'One', extra: 'metadata' }] });
                instance.setValue(1);
                const data = instance.data();
                data.text = 'Changed';
                return instance.data();
            })).toEqual({ value: 1, text: 'One', extra: 'metadata', disabled: false });
            await expect(page.getByRole('combobox')).toHaveText('One');
        });
    });

    test.describe('#setMaxSelections', () => {
        test('normalizes selection and exposes the updated limit', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const node = document.querySelector('#select');
                node.multiple = true;
                const instance = UI.SelectMenu.init(node);
                instance.setValue(['a', 'b']);
                instance.setMaxSelections(1);
                return instance.getMaxSelections();
            })).toBe(1);
            await expect(page.locator('#select')).toHaveValues(['a']);
        });
    });

    test.describe('#setPlaceholder', () => {
        test('updates an empty selection without discarding valid values', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const instance = UI.SelectMenu.init(document.querySelector('#select'));
                instance.setValue(null);
                instance.setPlaceholder('Choose fruit');
                return instance.getPlaceholder();
            })).toBe('Choose fruit');
            await expect(page.getByRole('combobox')).toHaveText('Choose fruit');
        });
    });

    for (const method of ['show', 'hide', 'toggle']) {
        test.describe(`#${method}`, () => {
            test('updates visibility and expanded state', async ({ page }) => {
                await page.evaluate((method) => {
                    const instance = UI.SelectMenu.init(document.querySelector('#select'));
                    if (method === 'hide') {
                        instance.show();
                    }
                    instance[method]();
                }, method);
                await expect(page.getByRole('combobox')).toHaveAttribute('aria-expanded', String(method !== 'hide'));
                await expect(page.locator('.selectmenu-menu')).toHaveCount(method === 'hide' ? 0 : 1);
            });
        });
    }

    test.describe('#update', () => {
        test('updates an appended full-width menu and returns the instance', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const instance = UI.SelectMenu.init(document.querySelector('#select'), { appendTo: document.body, fullWidth: true });
                instance.show();
                return instance.update() === instance;
            })).toBe(true);
            await expect(page.locator('body > .selectmenu-menu')).toBeVisible();
            const control = await page.getByRole('combobox').boundingBox();
            await expect(page.locator('.selectmenu-menu')).toHaveCSS('width', `${control.width}px`);
        });

        test('keeps an appended menu anchored when its reference container scrolls', async ({ page }) => {
            await page.evaluate((_) => {
                const node = document.querySelector('#select');
                const scroller = document.createElement('div');
                scroller.id = 'scroller';
                scroller.style.cssText = 'overflow:auto;height:200px;width:300px;position:relative';
                const content = document.createElement('div');
                content.style.cssText = 'height:800px;padding-top:100px';
                node.before(scroller);
                scroller.append(content);
                content.append(node);
                UI.SelectMenu.init(node, { appendTo: document.body, fullWidth: true, fixed: true, spacing: 8 }).show();
            });
            const before = await page.locator('.selectmenu-menu').boundingBox();
            await page.locator('#scroller').evaluate((node) => node.scrollTop = 40);
            await expect.poll(async (_) => {
                const menu = await page.locator('.selectmenu-menu').boundingBox();
                return before.y - menu.y;
            }).toBeCloseTo(40, 0);
        });
    });

    test.describe('events', () => {
        test('emits lifecycle events in order and user change exactly once', async ({ page }) => {
            await page.evaluate((_) => {
                window.events = [];
                const node = document.querySelector('#select');
                for (const event of ['show', 'shown', 'hide', 'hidden', 'change']) {
                    $.addEvent(node, `${event}.ui.selectmenu`, () => window.events.push(event));
                }
                UI.SelectMenu.init(node).setValue('a');
            });
            await page.getByRole('combobox').click();
            await expect.poll(() => page.evaluate((_) => window.events.join(','))).toBe('show,shown');
            await page.getByRole('option', { name: 'Banana' }).click();
            await expect.poll(() => page.evaluate((_) => window.events.join(','))).toBe('show,shown,change,hide,hidden');
        });

        for (const event of ['show', 'hide']) {
            test(`honors cancellation of ${event}`, async ({ page }) => {
                await page.evaluate((event) => {
                    const node = document.querySelector('#select');
                    const instance = UI.SelectMenu.init(node);
                    if (event === 'hide') {
                        instance.show();
                    }
                    $.addEvent(node, `${event}.ui.selectmenu`, (event) => event.preventDefault());
                    instance[event]();
                }, event);
                await expect(page.getByRole('combobox')).toHaveAttribute('aria-expanded', String(event === 'hide'));
            });
        }

        for (const event of ['show', 'shown', 'hide', 'hidden', 'change']) {
            test(`allows disposal in ${event} listeners`, async ({ page }) => {
                const errors = [];
                page.on('pageerror', (error) => errors.push(error.message));
                await page.evaluate((event) => {
                    const node = document.querySelector('#select');
                    const instance = UI.SelectMenu.init(node);
                    $.addEvent(node, `${event}.ui.selectmenu`, () => instance.dispose());
                    instance.show();
                }, event);
                if (event === 'change') {
                    await page.getByRole('option', { name: 'Banana' }).click();
                } else if (['hide', 'hidden'].includes(event)) {
                    await page.evaluate((_) => $('#select').selectmenu('hide'));
                }
                await expect(page.locator('.selectmenu-toggle, .selectmenu-menu')).toHaveCount(0);
                expect(errors).toHaveLength(0);
            });
        }

        test('settles interrupted opening and closing transitions without stale events', async ({ page }) => {
            await page.emulateMedia({ reducedMotion: 'no-preference' });
            await page.evaluate((_) => {
                window.events = [];
                const node = document.querySelector('#select');
                for (const event of ['shown', 'hidden']) {
                    $.addEvent(node, `${event}.ui.selectmenu`, () => window.events.push(event));
                }
                const instance = UI.SelectMenu.init(node, { duration: 30 });
                instance.show();
                instance.hide();
                instance.show();
            });
            await expect.poll(() => page.evaluate((_) => window.events.join(','))).toBe('shown');
            await expect(page.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');
        });
    });

    test.describe('user events', () => {
        test('does not emit a change when selecting the same single value', async ({ page }) => {
            await page.evaluate((_) => {
                window.changes = 0;
                $.addEvent('#select', 'change.ui.selectmenu', (_) => window.changes++);
                UI.SelectMenu.init(document.querySelector('#select')).show();
            });
            await page.getByRole('option', { name: 'Apple', exact: true }).click();
            expect(await page.evaluate((_) => window.changes)).toBe(0);
            await expect(page.locator('#select')).toHaveValue('a');
        });

        test('toggles multiple choices and removes chips with the keyboard', async ({ page }) => {
            await page.evaluate((_) => {
                const node = document.querySelector('#select');
                node.multiple = true;
                const instance = UI.SelectMenu.init(node, { closeOnSelect: false });
                instance.setValue(['a']);
                instance.show();
            });
            await page.getByRole('option', { name: 'Banana' }).click();
            await expect(page.locator('#select')).toHaveValues(['a', 'b']);
            await page.getByRole('option', { name: 'Apple', exact: true }).click();
            await expect(page.locator('#select')).toHaveValues(['b']);
            await page.getByRole('button', { name: 'Remove selection' }).press('Enter');
            await expect(page.locator('#select')).toHaveValues([]);
            await expect(page.getByRole('combobox')).toBeFocused();
        });

        test('navigates options with correct ARIA references and skips disabled choices', async ({ page }) => {
            await page.evaluate((_) => UI.SelectMenu.init(document.querySelector('#select')));
            const control = page.getByRole('combobox');
            await control.press('ArrowDown');
            const search = page.getByRole('searchbox');
            await expect(search).toBeFocused();
            await search.press('ArrowDown');
            const banana = page.getByRole('option', { name: 'Banana' });
            await expect(search).toHaveAttribute('aria-activedescendant', await banana.getAttribute('id'));
            await search.press('ArrowDown');
            await expect(banana).toHaveClass(/focus/);
            await search.press('Enter');
            await expect(page.locator('#select')).toHaveValue('b');
            await expect(control).toBeFocused();
        });

        test('closes on Escape and outside clicks', async ({ page }) => {
            await page.evaluate((_) => UI.SelectMenu.init(document.querySelector('#select')));
            await page.getByRole('combobox').click();
            await page.getByRole('searchbox').press('Escape');
            await expect(page.getByRole('combobox')).toBeFocused();
            await page.getByRole('combobox').click();
            await page.locator('#outside').click();
            await expect(page.locator('.selectmenu-menu')).toHaveCount(0);
        });

        test('removes a multiple selection with Backspace and emits change', async ({ page }) => {
            await page.evaluate((_) => {
                const node = document.querySelector('#select');
                node.multiple = true;
                const instance = UI.SelectMenu.init(node);
                instance.setValue(['a', 'b']);
                window.changes = 0;
                $.addEvent(node, 'change.ui.selectmenu', () => window.changes++);
            });
            await page.getByRole('combobox', { name: 'Fruit' }).press('Backspace');
            await expect(page.locator('#select')).toHaveValues(['a']);
            await expect(page.getByRole('combobox')).toHaveValue('Banana');
            expect(await page.evaluate((_) => window.changes)).toBe(1);
        });

        test('uses a separate keyboard-operable clear button', async ({ page }) => {
            await page.evaluate((_) => UI.SelectMenu.init(document.querySelector('#select'), { allowClear: true }));
            await expect(page.getByRole('combobox').getByRole('button')).toHaveCount(0);
            await page.getByRole('button', { name: 'Remove selection' }).press('Enter');
            await expect(page.getByRole('button', { name: 'Remove selection' })).toHaveCount(0);
            expect(await page.evaluate((_) => $('#select').selectmenu('getValue'))).toBeNull();
        });
    });

    test.describe('data option', () => {
        test('supports object maps, nested groups, disabled groups, and immutable caller data', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const child = Object.freeze({ text: 'Grouped', value: 'g' });
                const data = Object.freeze([Object.freeze({ text: 'Group', disabled: true, children: Object.freeze([child]) })]);
                UI.SelectMenu.init(document.querySelector('#select'), { data }).show();
                return Object.hasOwn(child, 'element');
            })).toBe(false);
            await expect(page.getByRole('group', { name: 'Group' })).toBeVisible();
            await expect(page.getByRole('option', { name: 'Grouped' })).toHaveAttribute('aria-disabled', 'true');
        });
    });

    test.describe('renderSelection option', () => {
        test('allows rendering directly into the destination without exposing internal data', async ({ page }) => {
            await page.evaluate((_) => UI.SelectMenu.init(document.querySelector('#select'), {
                renderSelection: (item, element) => {
                    element.textContent = item.text;
                    item.text = 'Changed by renderer';
                    return element;
                },
            }));
            await expect(page.getByRole('combobox')).toHaveText('Apple');
            expect(await page.evaluate((_) => $('#select').selectmenu('data').text)).toBe('Apple');
        });

        test('accepts a returned element and sanitizes string output', async ({ page }) => {
            await page.evaluate((_) => {
                UI.SelectMenu.init(document.querySelector('#select'), {
                    renderSelection: (item) => {
                        const span = document.createElement('span');
                        span.textContent = `Chosen ${item.text}`;
                        return span;
                    },
                    renderResult: (item) => `<strong>${item.text}</strong><img src="x" onerror="window.unsafe = true">`,
                }).show();
            });
            await expect(page.getByRole('combobox')).toHaveText('Chosen Apple');
            await expect(page.locator('.selectmenu-items [onerror]')).toHaveCount(0);
            await expect(page.getByRole('option', { name: 'Apple' }).locator('strong')).toHaveText('Apple');
        });
    });

    test.describe('isMatch option', () => {
        test('normalizes accents and case in both labels and search terms', async ({ page }) => {
            await page.evaluate((_) => UI.SelectMenu.init(document.querySelector('#select'), {
                data: { plain: 'Cafe', accented: 'Café', other: 'Tea' },
            }).show());

            for (const term of ['cafe', 'CAFÉ', 'cafe\u0301']) {
                await page.getByRole('searchbox').fill(term);
                await expect(page.getByRole('option')).toHaveText(['Cafe', 'Café']);
            }
        });

        test('treats regular expression characters as literal search text', async ({ page }) => {
            await page.evaluate((_) => UI.SelectMenu.init(document.querySelector('#select'), {
                data: { literal: 'Fruit (fresh)', other: 'Fruit basket' },
            }).show());
            await page.getByRole('searchbox').fill('(');
            await expect(page.getByRole('option')).toHaveText('Fruit (fresh)');
        });
    });

    test.describe('sortResults option', () => {
        test('orders prefix matches first, then sorts equally placed matches alphabetically', async ({ page }) => {
            await page.evaluate((_) => UI.SelectMenu.init(document.querySelector('#select'), {
                data: { bread: 'Banana bread', cabana: 'Cabana', banana: 'Banana' },
            }).show());
            await page.getByRole('searchbox').fill('ban');
            await expect(page.getByRole('option')).toHaveText(['Banana', 'Banana bread', 'Cabana']);
        });

        test('uses the same accent normalization for matching and sort position', async ({ page }) => {
            await page.evaluate((_) => UI.SelectMenu.init(document.querySelector('#select'), {
                data: { suffix: 'Le café', prefix: 'Cafeteria', accented: 'Café noir' },
            }).show());
            await page.getByRole('searchbox').fill('CAFÉ');
            await expect(page.getByRole('option')).toHaveText(['Café noir', 'Cafeteria', 'Le café']);
        });
    });

    test.describe('closeOnSelect option', () => {
        test('keeps searching and updates selected states after selection', async ({ page }) => {
            await page.evaluate((_) => UI.SelectMenu.init(document.querySelector('#select'), { closeOnSelect: false }).show());
            await page.getByRole('option', { name: 'Banana' }).click();
            await expect(page.getByRole('option', { name: 'Banana' })).toHaveAttribute('aria-selected', 'true');
            await expect(page.getByRole('searchbox')).toBeFocused();
        });
    });

    test.describe('minSearch option', () => {
        test('filters local results with accent-insensitive matching and reports empty results', async ({ page }) => {
            await page.evaluate((_) => UI.SelectMenu.init(document.querySelector('#select'), {
                minSearch: 2,
                data: { one: 'Café', two: 'Tea' },
            }).show());
            await expect(page.getByRole('option')).toHaveCount(0);
            await page.getByRole('searchbox').fill('cafe');
            await expect(page.getByRole('option')).toHaveText('Café');
            await page.getByRole('searchbox').fill('missing');
            await expect(page.getByRole('status')).toHaveText('No results');
        });

        test('hides the multiple menu until the minimum search length is met', async ({ page }) => {
            await page.evaluate((_) => {
                const node = document.querySelector('#select');
                node.multiple = true;
                UI.SelectMenu.init(node, { minSearch: 2 }).show();
            });
            await expect(page.locator('.selectmenu-menu')).toBeHidden();
            await page.getByRole('combobox').fill('ba');
            await expect(page.getByRole('option')).toHaveText('Banana');
            await page.getByRole('combobox').fill('b');
            await expect(page.locator('.selectmenu-menu')).toBeHidden();
        });
    });

    test.describe('maxSelections option', () => {
        test('announces the limit and permits another choice after a removal', async ({ page }) => {
            await page.evaluate((_) => {
                const node = document.querySelector('#select');
                node.multiple = true;
                const instance = UI.SelectMenu.init(node, { maxSelections: 1, closeOnSelect: false });
                instance.setValue('a');
                instance.show();
            });
            await expect(page.getByRole('status')).toHaveText('Selection limit reached.');
            await page.getByRole('button', { name: 'Remove selection' }).press('Enter');
            await page.getByRole('combobox').press('ArrowDown');
            await page.getByRole('option', { name: 'Banana' }).click();
            await expect(page.locator('#select')).toHaveValues(['b']);
            await expect(page.getByRole('status')).toHaveText('Selection limit reached.');
        });
    });

    test.describe('placement option', () => {
        for (const placement of ['top', 'bottom', 'start', 'end']) {
            test(`positions the menu ${placement} with the configured spacing`, async ({ page }) => {
                await page.evaluate((placement) => {
                    const node = document.querySelector('#select');
                    const host = document.createElement('div');
                    host.style.cssText = 'position:absolute;left:250px;top:250px;width:200px';
                    node.before(host);
                    host.append(node);
                    UI.SelectMenu.init(node, {
                        placement, position: 'center', fixed: true, spacing: 8, minContact: 20,
                        fullWidth: true, appendTo: document.body,
                    }).show();
                }, placement);
                const menu = page.locator('.selectmenu-menu');
                await expect(menu).toHaveAttribute('data-ui-placement', placement);
                await expect.poll(async (_) => {
                    const result = await menu.boundingBox();
                    const control = await page.getByRole('combobox').boundingBox();
                    if (placement === 'top') {
                        return control.y - result.y - result.height;
                    }
                    if (placement === 'bottom') {
                        return result.y - control.y - control.height;
                    }
                    return placement === 'start' ? control.x - result.x - result.width : result.x - control.x - control.width;
                }).toBeCloseTo(8, 0);
            });
        }
    });
});
