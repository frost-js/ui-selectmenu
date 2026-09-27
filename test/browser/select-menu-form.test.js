import { expect, test } from '#test';

test.describe('SelectMenu forms', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate((_) => {
            document.body.innerHTML = '<form id="form"><fieldset><label for="select">Fruit</label>' +
                '<select id="select" name="fruit" class="input-outline"><optgroup label="Fruit">' +
                '<option value="a" selected>Apple</option><option value="b">Banana</option>' +
                '</optgroup></select></fieldset><button type="reset">Reset</button>' +
                '<button type="submit">Submit</button></form>';
            window.changes = 0;
            window.submits = 0;
            $.addEvent('#select', 'change.ui.selectmenu', (_) => window.changes++);
            document.querySelector('#form').addEventListener('submit', (event) => {
                event.preventDefault();
                window.submits++;
            });
        });
    });

    test.describe('#dispose', () => {
        test('preserves reset handlers for another instance and the form consumer', async ({ page }) => {
            await page.evaluate((_) => {
                const first = document.querySelector('#select');
                const second = first.cloneNode(true);
                second.id = 'second';
                second.setAttribute('aria-label', 'Other fruit');
                first.after(second);
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
            expect(await page.evaluate((_) => window.resets)).toBe(1);
        });

        test('retains original options, groups, defaults, and the current selection', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const node = document.querySelector('#select');
                const group = node.firstElementChild;
                const option = node.options[0];
                const instance = UI.SelectMenu.init(node);
                instance.setValue('b');
                instance.dispose();
                return node.firstElementChild === group && node.options[0] === option;
            })).toBe(true);
            await expect(page.locator('#select')).toHaveValue('b');
            await expect(page.locator('#select option').first()).toHaveAttribute('selected', '');
            await page.getByRole('button', { name: 'Reset' }).click();
            await expect(page.locator('#select')).toHaveValue('a');
            await expect(page.locator('.selectmenu-toggle')).toHaveCount(0);
        });
    });

    test.describe('#setValue', () => {
        test('preserves disabled data items in native options and after disposal', async ({ page }) => {
            await page.evaluate((_) => {
                const node = document.querySelector('#select');
                node.multiple = true;
                UI.SelectMenu.init(node, { data: [
                    { value: 'x', text: 'Unavailable', disabled: true },
                    { text: 'Disabled group', disabled: true, children: [{ value: 'y', text: 'Grouped' }] },
                ] }).setValue(['x', 'y']);
            });
            await expect(page.locator('#select')).toHaveValues(['x', 'y']);
            await expect(page.locator('#select option[value="x"]')).toBeDisabled();
            await expect(page.locator('#select option[value="y"]')).toBeDisabled();
            expect(await page.evaluate((_) => new FormData(document.querySelector('#form')).has('fruit'))).toBe(false);
            await page.evaluate((_) => $('#select').selectmenu('dispose'));
            await expect(page.locator('#select option[value="x"]')).toBeDisabled();
            await expect(page.locator('#select option[value="y"]')).toBeDisabled();
        });

        test('updates FormData without emitting changes or replacing defaults', async ({ page }) => {
            await page.evaluate((_) => {
                const instance = UI.SelectMenu.init(document.querySelector('#select'));
                instance.setValue('b');
            });
            expect(await page.evaluate((_) => new FormData(document.querySelector('#form')).get('fruit'))).toBe('b');
            expect(await page.evaluate((_) => window.changes)).toBe(0);
            await expect(page.locator('#select option').first()).toHaveAttribute('selected', '');
        });

        test('submits multiple values and excludes a disabled native control', async ({ page }) => {
            await page.evaluate((_) => {
                const node = document.querySelector('#select');
                node.multiple = true;
                UI.SelectMenu.init(node).setValue(['a', 'b']);
            });
            expect(await page.evaluate((_) => new FormData(document.querySelector('#form')).getAll('fruit'))).toEqual(['a', 'b']);
            await page.evaluate((_) => $('#select').selectmenu('disable'));
            expect(await page.evaluate((_) => new FormData(document.querySelector('#form')).has('fruit'))).toBe(false);
        });

        test('preserves native required validation and redirects invalid focus', async ({ page }) => {
            await page.evaluate((_) => {
                const node = document.querySelector('#select');
                node.required = true;
                UI.SelectMenu.init(node).setValue(null);
            });
            expect(await page.locator('#select').evaluate((node) => node.validity.valueMissing)).toBe(true);
            await page.getByRole('button', { name: 'Submit' }).click();
            await expect(page.getByRole('combobox')).toBeFocused();
            expect(await page.evaluate((_) => window.submits)).toBe(0);
            await page.evaluate((_) => $('#select').selectmenu('setValue', 'b'));
            expect(await page.locator('#select').evaluate((node) => node.checkValidity())).toBe(true);
        });
    });

    test.describe('events', () => {
        test('resets an initially empty select without selecting a generated option', async ({ page }) => {
            await page.evaluate((_) => {
                const node = document.querySelector('#select');
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
            expect(await page.evaluate((_) => window.changes)).toBe(0);

            await page.evaluate((_) => {
                document.querySelector('#select option[value="x"]').defaultSelected = true;
                $('#select').selectmenu('setValue', 'y');
            });
            await page.getByRole('button', { name: 'Reset' }).click();
            await expect(page.locator('#select')).toHaveValue('x');
            await expect(page.getByRole('combobox')).toHaveText('Extra');
        });

        test('synchronizes external native changes without duplicating events', async ({ page }) => {
            await page.evaluate((_) => {
                const node = document.querySelector('#select');
                UI.SelectMenu.init(node);
                node.add(new Option('Date', 'd'));
                node.value = 'd';
                node.dispatchEvent(new Event('change', { bubbles: true }));
            });
            await expect(page.getByRole('combobox')).toHaveText('Date');
            expect(await page.evaluate((_) => $('#select').selectmenu('getValue'))).toBe('d');
            expect(await page.evaluate((_) => window.changes)).toBe(1);
        });

        for (const multiple of [false, true]) {
            test(`restores default selections silently on reset (multiple=${multiple})`, async ({ page }) => {
                await page.evaluate((multiple) => {
                    const node = document.querySelector('#select');
                    node.multiple = multiple;
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
                expect(await page.evaluate((_) => window.changes)).toBe(0);
            });
        }

        test('respects a cancelled form reset', async ({ page }) => {
            await page.evaluate((_) => {
                UI.SelectMenu.init(document.querySelector('#select')).setValue('b');
                document.querySelector('#form').addEventListener('reset', (event) => event.preventDefault());
            });
            await page.getByRole('button', { name: 'Reset' }).click();
            await expect(page.locator('#select')).toHaveValue('b');
            await expect(page.getByRole('combobox')).toHaveText('Banana');
        });
    });

    test.describe('user events', () => {
        test('prevents Enter from submitting while selecting a result', async ({ page }) => {
            await page.evaluate((_) => UI.SelectMenu.init(document.querySelector('#select')));
            await page.getByRole('combobox').press('Enter');
            await page.getByRole('searchbox').fill('Ban');
            await page.getByRole('searchbox').press('Enter');
            await expect(page.locator('#select')).toHaveValue('b');
            expect(await page.evaluate((_) => window.submits)).toBe(0);
            expect(await page.evaluate((_) => window.changes)).toBe(1);
        });

        test('closes when Tab moves focus outside the component', async ({ page }) => {
            await page.evaluate((_) => UI.SelectMenu.init(document.querySelector('#select')));
            await page.getByRole('combobox').click();
            await page.getByRole('searchbox').press('Tab');
            await expect(page.getByRole('button', { name: 'Reset' })).toBeFocused();
            await expect(page.locator('.selectmenu-menu')).toHaveCount(0);
        });

        for (const multiple of [false, true]) {
            test(`tracks disabled fieldsets and native state (multiple=${multiple})`, async ({ page }) => {
                await page.evaluate((multiple) => {
                    const node = document.querySelector('#select');
                    node.multiple = multiple;
                    UI.SelectMenu.init(node, { allowClear: true });
                }, multiple);
                await page.getByRole('combobox').click();
                await page.evaluate((_) => document.querySelector('fieldset').disabled = true);
                await expect(page.getByRole('combobox')).toBeDisabled();
                await expect(page.getByRole('button', { name: 'Remove selection' })).toBeDisabled();
                await expect(page.locator('.selectmenu-menu')).toHaveCount(0);
                await page.evaluate((_) => {
                    document.querySelector('fieldset').disabled = false;
                    document.querySelector('#select').required = true;
                });
                await expect(page.getByRole('combobox')).toBeEnabled();
                await expect(page.getByRole('combobox')).toHaveAttribute('aria-required', 'true');
                await page.evaluate((_) => document.querySelector('#select').disabled = true);
                await expect(page.getByRole('combobox')).toBeDisabled();
            });
        }
    });
});
