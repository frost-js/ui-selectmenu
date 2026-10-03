import { expect, test } from '#test';

test.describe('SelectMenu forms', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate(() => {
            $.setHtml(document.body,
                '<form id="form"><fieldset><label for="select">Fruit</label>' +
                '<select id="select" name="fruit" class="input-outline"><optgroup label="Fruit">' +
                '<option value="a" selected>Apple</option><option value="b">Banana</option>' +
                '</optgroup></select></fieldset><button type="reset">Reset</button>' +
                '<button type="submit">Submit</button></form>',
            );
            window.changes = 0;
            window.submits = 0;
            $.addEvent('#select', 'change.ui.selectmenu', () => window.changes++);
            $.findOne('#form').addEventListener('submit', (event) => {
                event.preventDefault();
                window.submits++;
            });
        });
    });

    test.describe('native synchronization', () => {
        test('synchronizes external native changes without duplicating events', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#select');
                UI.SelectMenu.init(node);
                node.add(new Option('Date', 'd'));
                node.value = 'd';
                node.dispatchEvent(new Event('change', { bubbles: true }));
            });
            await expect(page.getByRole('combobox')).toHaveText('Date');
            expect(await page.evaluate(() => $('#select').selectmenu('getValue'))).toBe('d');
            expect(await page.evaluate(() => window.changes)).toBe(1);
        });
    });

    test.describe('submission', () => {
        test('updates FormData without emitting changes or replacing defaults', async ({ page }) => {
            await page.evaluate(() => {
                const instance = UI.SelectMenu.init($.findOne('#select'));
                instance.setValue('b');
            });
            expect(await page.evaluate(() => new FormData($.findOne('#form')).get('fruit'))).toBe('b');
            expect(await page.evaluate(() => window.changes)).toBe(0);
            await expect(page.locator('#select option').first()).toHaveAttribute('selected', '');
        });

        test('submits multiple values and excludes a disabled native control', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#select');
                $.setProperty(node, 'multiple', true);
                UI.SelectMenu.init(node).setValue(['a', 'b']);
            });
            expect(await page.evaluate(() => new FormData($.findOne('#form')).getAll('fruit'))).toEqual(['a', 'b']);
            await page.evaluate(() => $('#select').selectmenu('disable'));
            expect(await page.evaluate(() => new FormData($.findOne('#form')).has('fruit'))).toBe(false);
        });

        test('prevents Enter from submitting while selecting a result', async ({ page }) => {
            await page.evaluate(() => UI.SelectMenu.init($.findOne('#select')));
            await page.getByRole('combobox').press('Enter');
            await page.getByRole('searchbox').fill('Ban');
            await page.getByRole('searchbox').press('Enter');
            await expect(page.locator('#select')).toHaveValue('b');
            expect(await page.evaluate(() => window.submits)).toBe(0);
            expect(await page.evaluate(() => window.changes)).toBe(1);
        });
    });

    test.describe('validation', () => {
        test('preserves native required validation and redirects invalid focus', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#select');
                $.setProperty(node, 'required', true);
                UI.SelectMenu.init(node).setValue(null);
            });
            expect(await page.locator('#select').evaluate((node) => node.validity.valueMissing)).toBe(true);
            await page.getByRole('button', { name: 'Submit' }).click();
            await expect(page.getByRole('combobox')).toBeFocused();
            expect(await page.evaluate(() => window.submits)).toBe(0);
            await page.evaluate(() => $('#select').selectmenu('setValue', 'b'));
            expect(await page.locator('#select').evaluate((node) => node.checkValidity())).toBe(true);
        });
    });

    test.describe('disabled state', () => {
        for (const multiple of [false, true]) {
            test(`enables options after an initially disabled fieldset is enabled (multiple=${multiple})`, async ({ page }) => {
                await page.evaluate((multiple) => {
                    $.setProperty($.findOne('fieldset'), 'disabled', true);
                    const node = $.findOne('#select');
                    $.setProperty(node, 'multiple', multiple);
                    $.append(node, '<option value="c" disabled>Cherry</option>' +
                        '<optgroup label="Unavailable" disabled><option value="p">Pear</option></optgroup>');
                    UI.SelectMenu.init(node);
                }, multiple);
                await expect(page.getByRole('combobox')).toBeDisabled();
                await page.evaluate(() => $.setProperty($.findOne('fieldset'), 'disabled', false));
                await expect(page.getByRole('combobox')).toBeEnabled();
                await page.getByRole('combobox').click();
                await expect(page.getByRole('option', { name: 'Banana', exact: true })).toBeEnabled();
                await expect(page.getByRole('option', { name: 'Cherry', exact: true })).toBeDisabled();
                await expect(page.getByRole('option', { name: 'Pear', exact: true })).toBeDisabled();
                await page.getByRole('option', { name: 'Banana', exact: true }).click();
                if (multiple) {
                    await expect(page.locator('#select')).toHaveValues(['a', 'b']);
                } else {
                    await expect(page.locator('#select')).toHaveValue('b');
                }
            });
        }

        test('preserves disabled data items in native options and after disposal', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#select');
                $.setProperty(node, 'multiple', true);
                UI.SelectMenu.init(node, { data: [
                    { value: 'x', text: 'Unavailable', disabled: true },
                    { text: 'Disabled group', disabled: true, children: [{ value: 'y', text: 'Grouped' }] },
                ] }).setValue(['x', 'y']);
            });
            await expect(page.locator('#select')).toHaveValues(['x', 'y']);
            await expect(page.locator('#select option[value="x"]')).toBeDisabled();
            await expect(page.locator('#select option[value="y"]')).toBeDisabled();
            expect(await page.evaluate(() => new FormData($.findOne('#form')).has('fruit'))).toBe(false);
            await page.evaluate(() => $('#select').selectmenu('dispose'));
            await expect(page.locator('#select option[value="x"]')).toBeDisabled();
            await expect(page.locator('#select option[value="y"]')).toBeDisabled();
        });

        for (const multiple of [false, true]) {
            test(`tracks disabled fieldsets and native state (multiple=${multiple})`, async ({ page }) => {
                await page.evaluate((multiple) => {
                    const node = $.findOne('#select');
                    node.multiple = multiple;
                    UI.SelectMenu.init(node, { allowClear: true });
                }, multiple);
                await page.getByRole('combobox').click();
                await page.evaluate(() => $.findOne('fieldset').disabled = true);
                await expect(page.getByRole('combobox')).toBeDisabled();
                await expect(page.getByRole('button', { name: 'Remove selection' })).toBeDisabled();
                await expect(page.locator('.selectmenu-menu')).toHaveCount(0);
                await page.evaluate(() => {
                    $.findOne('fieldset').disabled = false;
                    $.findOne('#select').required = true;
                });
                await expect(page.getByRole('combobox')).toBeEnabled();
                await expect(page.getByRole('combobox')).toHaveAttribute('aria-required', 'true');
                await page.evaluate(() => $.findOne('#select').disabled = true);
                await expect(page.getByRole('combobox')).toBeDisabled();
            });
        }
    });

    test.describe('reset', () => {
        test('resets an initially empty select without selecting a generated option', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#select');
                node.replaceChildren();
                const instance = UI.SelectMenu.init(node, {
                    placeholder: 'Choose fruit',
                    data: [{ value: 'x', text: 'Extra' }, { value: 'y', text: 'Another' }],
                });
                instance.setValue('y');
                instance.setValue('x');
            });
            await page.getByRole('button', { name: 'Reset' }).click();
            await expect(page.locator('#select')).toHaveValue('');
            await expect(page.getByRole('combobox')).toHaveText('Choose fruit');
            expect(await page.evaluate(() => window.changes)).toBe(0);

            await page.evaluate(() => {
                $.setProperty($.findOne('#select option[value="x"]'), 'defaultSelected', true);
                $('#select').selectmenu('setValue', 'y');
            });
            await page.getByRole('button', { name: 'Reset' }).click();
            await expect(page.locator('#select')).toHaveValue('x');
            await expect(page.getByRole('combobox')).toHaveText('Extra');
        });

        for (const multiple of [false, true]) {
            test(`restores default selections silently on reset (multiple=${multiple})`, async ({ page }) => {
                await page.evaluate((multiple) => {
                    const node = $.findOne('#select');
                    $.setProperty(node, 'multiple', multiple);
                    const instance = UI.SelectMenu.init(node, { data: [{ value: 'x', text: 'Extra' }] });
                    instance.setValue('x');
                    instance.show();
                }, multiple);
                await page.getByRole('button', { name: 'Reset' }).press('Enter');
                if (multiple) {
                    await expect(page.locator('#select')).toHaveValues(['a']);
                    await expect(page.locator('.selectmenu-multi')).toHaveText('Apple');
                } else {
                    await expect(page.locator('#select')).toHaveValue('a');
                    await expect(page.getByRole('combobox')).toHaveText('Apple');
                }
                await expect(page.locator('.selectmenu-menu')).toHaveCount(0);
                expect(await page.evaluate(() => window.changes)).toBe(0);
            });
        }

        test('respects a cancelled form reset', async ({ page }) => {
            await page.evaluate(() => {
                UI.SelectMenu.init($.findOne('#select')).setValue('b');
                $.findOne('#form').addEventListener('reset', (event) => event.preventDefault());
            });
            await page.getByRole('button', { name: 'Reset' }).click();
            await expect(page.locator('#select')).toHaveValue('b');
            await expect(page.getByRole('combobox')).toHaveText('Banana');
        });
    });

    test.describe('keyboard navigation', () => {
        test('closes when Tab moves focus outside the component', async ({ page }) => {
            await page.evaluate(() => UI.SelectMenu.init($.findOne('#select')));
            await page.getByRole('combobox').click();
            await page.getByRole('searchbox').press('Tab');
            await expect(page.getByRole('button', { name: 'Reset' })).toBeFocused();
            await expect(page.locator('.selectmenu-menu')).toHaveCount(0);
        });
    });

    test.describe('disposal', () => {
        test('preserves reset handlers for another instance and the form consumer', async ({ page }) => {
            await page.evaluate(() => {
                const first = $.findOne('#select');
                const second = first.cloneNode(true);
                $.setProperty(second, 'id', 'second');
                $.setAttribute(second, 'aria-label', 'Other fruit');
                $.after(first, second);
                $('select').selectmenu();
                $('#second').selectmenu('setValue', 'b');
                window.resets = 0;
                $.addEvent('#form', 'reset.ui.selectmenu', () => window.resets++);
                $('#select').selectmenu('dispose');
            });

            await expect(page.getByRole('combobox', { name: 'Other fruit' })).toHaveText('Banana');
            await page.getByRole('button', { name: 'Reset' }).click();
            await expect(page.getByRole('combobox', { name: 'Other fruit' })).toHaveText('Apple');
            await expect(page.locator('#second')).toHaveValue('a');
            expect(await page.evaluate(() => window.resets)).toBe(1);
        });

        test('retains original options, groups, defaults, and the current selection', async ({ page }) => {
            expect(await page.evaluate(() => {
                const node = $.findOne('#select');
                const group = node.firstElementChild;
                const option = node.options[0];
                const instance = UI.SelectMenu.init(node);
                instance.setValue('b');
                instance.dispose();
                return { groupPreserved: node.firstElementChild === group, optionPreserved: node.options[0] === option };
            })).toEqual({ groupPreserved: true, optionPreserved: true });
            await expect(page.locator('#select')).toHaveValue('b');
            await expect(page.locator('#select option').first()).toHaveAttribute('selected', '');
            await page.getByRole('button', { name: 'Reset' }).click();
            await expect(page.locator('#select')).toHaveValue('a');
            await expect(page.locator('.selectmenu-toggle')).toHaveCount(0);
        });
    });
});
