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
        for (const multiple of [false, true]) {
            for (const value of ['[]', '{}']) {
                test(`retains focus on JSON-shaped option values (${value}, multiple=${multiple})`, async ({ page }) => {
                    await page.evaluate(({ multiple, value }) => {
                        $.setProperty('#select', 'multiple', multiple);
                        $.setProperty('#select option[value="b"]', 'value', value);
                        UI.SelectMenu.init($.findOne('#select'));
                    }, { multiple, value });
                    await page.getByRole('combobox').click();
                    await page.getByRole('option', { name: 'Banana' }).hover();
                    await page.evaluate(() => $.append('#select', '<option value="d">Date</option>'));
                    await expect(page.getByRole('option')).toHaveText(['Apple', 'Banana', 'Date']);
                    const search = page.getByRole(multiple ? 'combobox' : 'searchbox');
                    await expect(search).toHaveAttribute('aria-activedescendant',
                        await page.getByRole('option', { name: 'Banana' }).getAttribute('id'),
                    );
                    expect(await page.evaluate(() => window.changes)).toBe(0);
                    await search.press('Enter');
                    expect(await page.evaluate(() => $('#select').selectmenu('getValue')))
                        .toEqual(multiple ? ['a', value] : value);
                });
            }

            test(`does not reread option data for ordinary value changes (multiple=${multiple})`, async ({ page }) => {
                const reads = await page.evaluate((multiple) => {
                    $.setProperty('#select', 'multiple', multiple);
                    const instance = UI.SelectMenu.init($.findOne('#select'));
                    const option = $.findOne('#select option[value="a"]');
                    const label = $.getProperty(option, 'label');
                    let reads = 0;
                    Object.defineProperty(option, 'label', {
                        get() {
                            reads++;
                            return label;
                        },
                    });

                    instance.setValue('b');
                    instance.setValue('a');

                    return reads;
                }, multiple);
                expect(reads).toBe(0);
                expect(await page.evaluate(() => $('#select').selectmenu('getValue'))).toEqual(multiple ? ['a'] : 'a');
            });

            test(`processes queued control state when setting a value (multiple=${multiple})`, async ({ page }) => {
                await page.evaluate((multiple) => {
                    $.setProperty('#select', 'multiple', multiple);
                    UI.SelectMenu.init($.findOne('#select')).show();
                    $.setProperty('fieldset', 'disabled', true);
                    $.setProperty('#select', 'required', true);
                    $.setAttribute('#select', 'aria-invalid', true);
                    $('#select').selectmenu('setValue', 'b');
                }, multiple);
                const control = page.getByRole('combobox');
                await expect(control).toBeDisabled();
                await expect(control).toHaveAttribute('aria-required', 'true');
                await expect(control).toHaveAttribute('aria-invalid', 'true');
                await expect(page.locator('.selectmenu-menu')).toHaveCount(0);
                expect(await page.evaluate(() => $('#select').selectmenu('getValue'))).toEqual(multiple ? ['b'] : 'b');
            });

            test(`refreshes option labels while retaining search and focus (multiple=${multiple})`, async ({ page }) => {
                await page.evaluate((multiple) => {
                    $.setProperty('#select', 'multiple', multiple);
                    UI.SelectMenu.init($.findOne('#select'));
                }, multiple);
                await page.getByRole('combobox').click();
                const search = page.getByRole(multiple ? 'combobox' : 'searchbox');
                await search.fill('a');
                await page.getByRole('option', { name: 'Banana' }).hover();
                const selection = multiple ? page.locator('.selectmenu-selection') : page.getByRole('combobox');

                await page.evaluate(() => $.setText('#select option[value="a"]', 'Apricot'));
                await expect(selection).toHaveText('Apricot');
                await expect(page.getByRole('option')).toHaveText(['Apricot', 'Banana']);
                await expect(search).toHaveValue('a');
                await expect(search).toHaveAttribute('aria-activedescendant',
                    await page.getByRole('option', { name: 'Banana' }).getAttribute('id'),
                );

                await page.evaluate(() => $.findOne('#select option[value="a"]').firstChild.data = 'Avocado');
                await expect(selection).toHaveText('Avocado');
                await page.evaluate(() => $.setAttribute('#select option[value="a"]', 'label', 'Amazing'));
                await expect(selection).toHaveText('Amazing');
                await page.evaluate(() => $.removeAttribute('#select option[value="a"]', 'label'));
                await expect(selection).toHaveText('Avocado');
                expect(await page.evaluate(() => window.changes)).toBe(0);
            });

            test(`refreshes option values and disabled groups (multiple=${multiple})`, async ({ page }) => {
                await page.evaluate((multiple) => {
                    $.setProperty('#select', 'multiple', multiple);
                    UI.SelectMenu.init($.findOne('#select')).show();
                }, multiple);
                await page.evaluate(() => $.setAttribute('#select option[value="a"]', 'value', 'apple'));
                await expect.poll(() => page.evaluate(() => $('#select').selectmenu('getValue')))
                    .toEqual(multiple ? ['apple'] : 'apple');
                await page.evaluate(() => $.setProperty('#select optgroup', 'disabled', true));
                await expect(page.getByRole('option', { name: 'Apple' })).toBeDisabled();
                await expect(page.getByRole('option', { name: 'Banana' })).toBeDisabled();
                await page.evaluate(() => {
                    $.setProperty('#select optgroup', 'disabled', false);
                    $.setAttribute('#select optgroup', 'label', 'Fresh fruit');
                });
                await expect(page.getByRole('group', { name: 'Fresh fruit' })).toBeVisible();
                await expect(page.getByRole('option', { name: 'Apple' })).toBeEnabled();
                await page.evaluate(() => $.setProperty('#select option[value="b"]', 'disabled', true));
                await expect(page.getByRole('option', { name: 'Banana' })).toBeDisabled();
                expect(await page.evaluate(() => window.changes)).toBe(0);
            });

            test(`synchronizes additions, removals, and replacement without restoring stale options (multiple=${multiple})`, async ({ page }) => {
                await page.evaluate((multiple) => {
                    $.setProperty('#select', 'multiple', multiple);
                    UI.SelectMenu.init($.findOne('#select')).show();
                    $.append('#select', '<option value="d">Date</option>');
                }, multiple);
                await expect(page.getByRole('option')).toHaveText(['Apple', 'Banana', 'Date']);
                await page.evaluate(() => $.remove('#select option[value="a"]'));
                await expect(page.getByRole('option')).toHaveText(['Banana', 'Date']);
                await expect.poll(() => page.evaluate(() => $('#select').selectmenu('getValue')))
                    .toEqual(multiple ? [] : 'b');
                await expect(page.locator('#select option[value="a"]')).toHaveCount(0);

                await page.evaluate(() => $.setHtml('#select',
                    '<optgroup label="New fruit"><option value="e" selected>Elderberry</option>' +
                    '<option value="f">Fig</option></optgroup>',
                ));
                await expect(page.getByRole('option')).toHaveText(['Elderberry', 'Fig']);
                await expect.poll(() => page.evaluate(() => $('#select').selectmenu('getValue')))
                    .toEqual(multiple ? ['e'] : 'e');
                await page.evaluate(() => {
                    $.remove('#select option[value="e"]');
                    $('#select').selectmenu('setValue', 'e');
                });
                await expect(page.locator('#select option')).toHaveCount(1);
                await expect(page.getByRole('option')).toHaveText(['Fig']);
                expect(await page.evaluate(() => $('#select').selectmenu('getValue'))).toEqual(multiple ? [] : null);
                expect(await page.evaluate(() => window.changes)).toBe(0);
            });

            test(`reads current selection when default selected attributes change (multiple=${multiple})`, async ({ page }) => {
                await page.evaluate((multiple) => {
                    $.setProperty('#select', 'multiple', multiple);
                    UI.SelectMenu.init($.findOne('#select'));
                    $.setProperty('#select option[value="b"]', 'defaultSelected', true);
                }, multiple);
                await expect.poll(() => page.evaluate(() => $('#select').selectmenu('getValue')))
                    .toEqual(multiple ? ['a', 'b'] : 'b');
                const nativeValue = await page.evaluate((multiple) => {
                    $('#select').selectmenu('setValue', 'a');
                    $.removeAttribute('#select option[value="b"]', 'selected');
                    $.setAttribute('#select option[value="b"]', 'selected', true);
                    const values = [...$.getProperty('#select', 'selectedOptions')].map((option) => $.getValue(option));

                    return multiple ? values : values[0] ?? null;
                }, multiple);
                await expect.poll(() => page.evaluate(() => $('#select').selectmenu('getValue')))
                    .toEqual(nativeValue);
                await page.getByRole('button', { name: 'Reset' }).click();
                await expect.poll(() => page.evaluate(() => $('#select').selectmenu('getValue')))
                    .toEqual(multiple ? ['a', 'b'] : 'b');
                expect(await page.evaluate(() => window.changes)).toBe(0);
            });
        }

        test('preserves configured data when native options change', async ({ page }) => {
            await page.evaluate(() => {
                UI.SelectMenu.init($.findOne('#select'), {
                    data: [{ value: 'x', text: 'Extra', custom: true }],
                }).setValue('x');
                $('#select').selectmenu('show');
                $.setText('#select option[value="x"]', 'Changed');
                $.append('#select', '<option value="d">Date</option>');
            });
            await expect(page.getByRole('option')).toHaveText(['Extra']);
            await expect(page.getByRole('combobox')).toHaveText('Extra');
            expect(await page.evaluate(() => $('#select').selectmenu('data').custom)).toBe(true);
        });

        test('keeps generated remote options from starting another request', async ({ page }) => {
            await page.evaluate(() => {
                window.searchRequests = 0;
                UI.SelectMenu.init($.findOne('#select'), {
                    debounce: 0,
                    getResults() {
                        window.searchRequests++;
                        return { results: [{ value: 'r', text: 'Remote' }] };
                    },
                });
            });
            await page.getByRole('combobox').click();
            await page.getByRole('option', { name: 'Remote' }).click();
            await expect(page.getByRole('combobox')).toHaveText('Remote');
            await expect(page.locator('.selectmenu-menu')).toHaveCount(0);
            await expect(page.locator('#select')).toHaveValue('r');
            expect(await page.evaluate(() => window.searchRequests)).toBe(1);
        });

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

    test.describe('accessible state', () => {
        for (const multiple of [false, true]) {
            test(`synchronizes ARIA changes and restores native required state (multiple=${multiple})`, async ({ page }) => {
                await page.evaluate((multiple) => {
                    const node = $.findOne('#select');
                    $.setProperty(node, 'multiple', multiple);
                    $.setAttribute(node, {
                        'aria-describedby': 'help',
                        'aria-errormessage': 'error',
                        'aria-invalid': true,
                        'aria-required': true,
                    });
                    UI.SelectMenu.init(node);
                }, multiple);
                const control = page.getByRole('combobox');
                await expect(control).toHaveAttribute('aria-describedby', 'help');
                await expect(control).toHaveAttribute('aria-errormessage', 'error');
                await expect(control).toHaveAttribute('aria-invalid', 'true');
                await expect(control).toHaveAttribute('aria-required', 'true');

                await control.click();
                await expect(control).toHaveAttribute('aria-expanded', 'true');
                const controls = await control.getAttribute('aria-controls');
                const activeDescendant = await control.getAttribute('aria-activedescendant');
                await page.evaluate(() => {
                    $.setProperty('#select', 'required', true);
                    $.setAttribute('#select', {
                        'aria-describedby': 'updated-help',
                        'aria-errormessage': 'updated-error',
                        'aria-invalid': false,
                        'aria-required': false,
                    });
                });
                await expect(control).toHaveAttribute('aria-describedby', 'updated-help');
                await expect(control).toHaveAttribute('aria-errormessage', 'updated-error');
                await expect(control).toHaveAttribute('aria-invalid', 'false');
                await expect(control).toHaveAttribute('aria-required', 'false');

                await page.evaluate(() => {
                    for (const attribute of ['aria-describedby', 'aria-errormessage', 'aria-invalid', 'aria-required']) {
                        $.removeAttribute('#select', attribute);
                    }
                });
                await expect(control).not.toHaveAttribute('aria-describedby');
                await expect(control).not.toHaveAttribute('aria-errormessage');
                await expect(control).not.toHaveAttribute('aria-invalid');
                await expect(control).toHaveAttribute('aria-required', 'true');
                await expect(control).toHaveAttribute('aria-expanded', 'true');
                await expect(control).toHaveAttribute('aria-controls', controls);
                await expect(control).toHaveAttribute('aria-activedescendant', activeDescendant);

                await page.evaluate(() => $.setProperty('#select', 'required', false));
                await expect(control).toHaveAttribute('aria-required', 'false');
                expect(await page.evaluate(() => window.changes)).toBe(0);
            });

            test(`updates accessible names and falls back to the native label (multiple=${multiple})`, async ({ page }) => {
                await page.evaluate((multiple) => {
                    $.append(document.body, '<span id="fruit-label">Preferred fruit</span>');
                    $.setProperty('#select', 'multiple', multiple);
                    UI.SelectMenu.init($.findOne('#select'));
                }, multiple);
                const control = page.getByRole('combobox');
                await expect(control).toHaveAccessibleName('Fruit');

                await page.evaluate(() => $.setAttribute('#select', 'aria-label', 'Choose fruit'));
                await expect(control).toHaveAccessibleName('Choose fruit');
                await page.evaluate(() => $.setAttribute('#select', 'aria-labelledby', 'fruit-label'));
                await expect(control).toHaveAccessibleName('Preferred fruit');
                await expect(control).not.toHaveAttribute('aria-label');

                await page.evaluate(() => $.setAttribute('#select', 'aria-label', 'Other fruit'));
                await expect(control).toHaveAccessibleName('Preferred fruit');
                await page.evaluate(() => $.removeAttribute('#select', 'aria-labelledby'));
                await expect(control).not.toHaveAttribute('aria-labelledby');
                await expect(control).toHaveAccessibleName('Other fruit');
                await page.evaluate(() => $.removeAttribute('#select', 'aria-label'));
                await expect(control).toHaveAccessibleName('Fruit');

                if (!multiple) {
                    await control.click();
                    await expect(page.getByRole('searchbox')).toHaveAccessibleName('Search');
                }
            });
        }
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
                    $.setProperty(node, 'multiple', multiple);
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
                $.empty(node);
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
                const [second] = $.clone(first);
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
