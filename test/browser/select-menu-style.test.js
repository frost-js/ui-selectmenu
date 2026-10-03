import { expect, test } from '#test';

test.describe('SelectMenu styles', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate(() => {
            $.setHtml(document.body,
                '<button id="outside">Outside</button><div id="host" style="width:260px">' +
                '<label for="select">Fruit</label><select id="select" class="input-outline">' +
                '<optgroup label="Fruit"><option value="a">Apple</option><option value="b">Banana</option>' +
                '</optgroup></select></div>',
            );
        });
    });

    test.describe('control sizing', () => {
        for (const style of ['filled', 'outline']) {
            for (const { size, fontSize } of [
                { size: '', fontSize: '16px' },
                { size: 'sm', fontSize: '14px' },
                { size: 'lg', fontSize: '20px' },
            ]) {
                test.describe(`${style}, size=${size || 'default'}`, () => {
                    test.beforeEach(async ({ page }) => {
                        await page.evaluate(({ style, size }) => {
                            const node = $.findOne('#select');
                            $.setAttribute(node, 'class', `input-${style}${size ? ` input-${size}` : ''}`);
                            node.selectedIndex = -1;
                            const reference = $.create('input');
                            $.setProperty(reference, 'id', 'reference');
                            $.setAttribute(reference, 'class', $.getProperty(node, 'className'));
                            $.append($.findOne('#host'), reference);
                        }, { style, size });
                    });

                    for (const multiple of [false, true]) {
                        test(`matches UI control and menu sizing (multiple=${multiple})`, async ({ page }) => {
                            await page.evaluate((multiple) => {
                                const node = $.findOne('#select');
                                $.setProperty(node, 'multiple', multiple);
                                UI.SelectMenu.init(node, { placeholder: 'Choose fruit' });
                            }, multiple);

                            const toggle = page.locator('.selectmenu-toggle, .selectmenu-multi');
                            const reference = page.locator('#reference');
                            for (const property of ['font-size', 'padding-top', 'padding-bottom', 'min-height', 'border-top-width', 'border-radius']) {
                                const value = await reference.evaluate((node, property) => getComputedStyle(node).getPropertyValue(property), property);
                                await expect(toggle).toHaveCSS(property, value);
                            }
                            await expect(toggle).toHaveCSS('width', '260px');
                            await expect(page.locator('.ripple-line')).toHaveCount(0);

                            await page.getByRole('combobox').click();
                            await expect(page.locator('.selectmenu-menu')).toHaveCSS('font-size', fontSize);
                        });
                    }

                    test('matches the single-select search font size', async ({ page }) => {
                        await page.evaluate(() => UI.SelectMenu.init($.findOne('#select')));
                        await page.getByRole('combobox').click();

                        await expect(page.getByRole('searchbox')).toHaveCSS('font-size', fontSize);
                    });

                    test('keeps a multiple selection at the UI input height', async ({ page }) => {
                        await page.evaluate(() => {
                            const node = $.findOne('#select');
                            $.setProperty(node, 'multiple', true);
                            UI.SelectMenu.init(node, { placeholder: 'Choose fruit' });
                        });
                        await page.getByRole('combobox').click();
                        await page.evaluate(() => $('#select').selectmenu('setValue', ['a']));

                        const height = await page.locator('#reference').evaluate((node) => getComputedStyle(node).height);
                        await expect(page.locator('.selectmenu-multi')).toHaveCSS('height', height);
                    });
                });
            }
        }
    });

    test.describe('selection overflow', () => {
        for (const direction of ['ltr', 'rtl']) {
            test(`keeps the clear control beside a long selection (${direction})`, async ({ page }) => {
                await page.evaluate((direction) => {
                    const node = $.findOne('#select');
                    $.setProperty(node, 'dir', direction);
                    node.options[0].text = 'An extremely long selected label that must fit inside the control';
                    UI.SelectMenu.init(node, { allowClear: true });
                }, direction);
                const control = page.getByRole('combobox');
                const clear = page.getByRole('button', { name: 'Remove selection' });
                await expect(control).toHaveCSS('direction', direction);
                const bounds = await control.boundingBox();
                const close = await clear.boundingBox();
                const label = await page.locator('.selectmenu-selection').boundingBox();
                expect(close.x).toBeGreaterThanOrEqual(bounds.x);
                expect(close.x + close.width).toBeLessThanOrEqual(bounds.x + bounds.width);
                if (direction === 'ltr') {
                    expect(label.x + label.width).toBeLessThanOrEqual(close.x);
                } else {
                    expect(label.x).toBeGreaterThanOrEqual(close.x + close.width);
                }
                await clear.press('Enter');
                await expect(control).toBeFocused();
            });

            test(`keeps multiple-selection chips inside narrow controls (${direction})`, async ({ page }) => {
                await page.evaluate((direction) => {
                    const node = $.findOne('#select');
                    $.setProperty(node, 'dir', direction);
                    node.options[0].text = 'An extremely long selected label that must fit inside the control';
                    $.setProperty(node, 'multiple', true);
                    UI.SelectMenu.init(node).setValue(['a', 'b']);
                }, direction);
                await expect(page.locator('.selectmenu-multi')).toHaveCSS('direction', direction);
                expect(await page.locator('.selectmenu-multi').evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
                await expect(page.locator('.selectmenu-multi button.btn-close')).toHaveCount(0);
                await expect(page.locator('.selectmenu-multi button > .btn-close')).toHaveCount(2);
                await expect(page.locator('.selectmenu-multi')).toHaveCSS('column-gap', '4px');
            });
        }
    });

    test.describe('search sizing', () => {
        for (const display of ['grid', 'flex']) {
            test(`measures search text independently of a ${display} page layout`, async ({ page }) => {
                await page.evaluate((display) => {
                    $.setAttribute(document.body, 'style', `display:${display};grid-template-columns:320px`);
                    const node = $.findOne('#select');
                    $.setProperty(node, 'multiple', true);
                    UI.SelectMenu.init(node).setValue('a');
                }, display);
                await expect(page.getByRole('combobox')).toHaveCSS('width', '20px');
                await expect(page.locator('.selectmenu-multi')).toHaveCSS('height', '42px');
                await page.getByRole('combobox').fill('Banana');
                const input = await page.getByRole('combobox').boundingBox();
                expect(input.width).toBeGreaterThan(20);
                expect(input.width).toBeLessThan(100);
            });
        }

        test('restores the multiple control size after clearing a long search', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#select');
                $.setProperty(node, 'multiple', true);
                node.selectedIndex = -1;
                UI.SelectMenu.init(node, { placeholder: 'Choose fruit' });
            });
            const control = page.locator('.selectmenu-multi');
            const search = page.getByRole('combobox');
            const height = await control.evaluate((node) => getComputedStyle(node).height);
            const width = await search.evaluate((node) => getComputedStyle(node).width);
            await search.fill('A long search phrase that does not match any fruit');
            await search.press('Escape');
            await expect(search).toHaveValue('');
            await expect(search).toHaveCSS('width', width);
            await expect(control).toHaveCSS('height', height);
            await expect(control).toHaveText('Choose fruit');
        });
    });

    test.describe('menu sizing and overflow', () => {
        test('wraps long results and constrains the scrollable menu', async ({ page }) => {
            await page.evaluate(() => UI.SelectMenu.init($.findOne('#select'), {
                fullWidth: true, maxHeight: '70px',
                data: Array.from({ length: 10 }, (_, value) => ({ value, text: `An unbroken label ${'x'.repeat(200)}` })),
            }).show());
            await expect(page.locator('.selectmenu-menu')).toHaveCSS('width', '260px');
            await expect(page.getByRole('listbox')).toHaveCSS('max-height', '70px');
            expect(await page.getByRole('listbox').evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
            expect(await page.getByRole('listbox').evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
        });
    });

    test.describe('input groups', () => {
        for (const [style, nested] of [['outline', false], ['outline', true], ['filled', false], ['filled', true]]) {
            test.describe(`${style}, nested=${nested}`, () => {
                test.beforeEach(async ({ page }) => {
                    await page.evaluate(({ style, nested }) => {
                        const host = $.findOne('#host');
                        const select = `<select id="select" class="input-${style} input-floating"><option>Apple</option></select>`;
                        const field = nested ? `<div class="form-input">${select}<label for="select" class="label-floating">Fruit</label></div>` : select;
                        $.setHtml(host, `<div class="input-group input-group-sm"><span class="input-group-text">@</span>${field}<button class="btn">Go</button></div>`);
                        UI.SelectMenu.init($.findOne('#select'), { allowClear: true });
                    }, { style, nested });
                });

                test('fits the control and adjoining button within the group', async ({ page }) => {
                    const bounds = await page.locator('.input-group').boundingBox();
                    const button = await page.getByRole('button', { name: 'Go' }).boundingBox();
                    expect(button.x + button.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
                    expect(button.y).toBe(bounds.y);
                    await expect(page.getByRole('combobox')).toHaveCSS('border-top-left-radius', '0px');
                    await expect(page.getByRole('combobox')).toHaveCSS('border-top-right-radius', '0px');
                });

                if (nested) {
                    test('sizes and positions the floating label above the selection', async ({ page }) => {
                        await expect(page.locator('.label-floating')).toHaveCSS('font-size', '12px');
                        const label = await page.locator('.label-floating').boundingBox();
                        const selection = await page.locator('.selectmenu-selection').boundingBox();
                        expect(label.y).toBeLessThan(selection.y);
                    });
                }

                test('applies focus styling to the group', async ({ page }) => {
                    await page.getByRole('combobox').click();

                    const group = page.locator('.input-group');
                    if (style === 'outline') {
                        await expect(group).not.toHaveCSS('box-shadow', 'none');
                    } else {
                        await expect(page.getByRole('combobox')).toHaveCSS('background-size', '0% 2px, 100% 1px');
                        expect(await group.evaluate((node) => getComputedStyle(node, '::after').opacity)).toBe('1');
                    }
                    await expect(page.getByRole('combobox')).toHaveCSS('box-shadow', 'none');
                });

                test('uses the small input-group menu font size', async ({ page }) => {
                    await page.getByRole('combobox').click();

                    await expect(page.locator('.selectmenu-menu')).toHaveCSS('font-size', '14px');
                });
            });
        }

        test('retains the starting radius when the native select is the first input-group child', async ({ page }) => {
            await page.evaluate(() => {
                $.setHtml($.findOne('#host'),
                    '<div class="input-group"><select id="select" class="input-outline">' +
                    '<option>Apple</option></select><button class="btn">Go</button></div>',
                );
                UI.SelectMenu.init($.findOne('#select'));
            });
            const radius = await page.locator('.input-group').evaluate((node) => getComputedStyle(node).borderTopLeftRadius);
            await expect(page.getByRole('combobox')).toHaveCSS('border-top-left-radius', radius);
            await expect(page.getByRole('combobox')).toHaveCSS('border-top-right-radius', '0px');
        });
    });

    test.describe('floating labels', () => {
        for (const style of ['outline', 'filled']) {
            for (const direction of ['ltr', 'rtl']) {
                test(`preserves floating labels and input-group geometry during interaction (${style}, ${direction})`, async ({ page }) => {
                    await page.evaluate(({ style, direction }) => {
                        $.setHtml($.findOne('#host'), `<div class="input-group" dir="${direction}">` +
                            '<span class="input-group-text">Fruit</span><div class="form-input">' +
                            `<select id="select" class="input-${style} input-floating"><option>Apple</option></select>` +
                            '<label for="select" class="label-floating">Favorite fruit</label></div></div>');
                        UI.SelectMenu.init($.findOne('#select'));
                    }, { style, direction });
                    const control = page.getByRole('combobox');
                    const label = page.locator('.label-floating');
                    const bounds = await control.boundingBox();
                    const radius = await control.evaluate((node) => getComputedStyle(node).borderRadius);

                    const expectFieldUnchanged = async () => {
                        await expect(control).toHaveCSS('border-radius', radius);
                        const current = await control.boundingBox();
                        expect(current.x).toBe(bounds.x);
                        expect(current.width).toBe(bounds.width);

                        // Include the label in hit testing to detect whether the control paints over it.
                        expect(await label.evaluate((node) => {
                            const range = document.createRange();
                            range.selectNodeContents(node);
                            const text = range.getBoundingClientRect();
                            $.setStyle(node, 'pointerEvents', 'auto');
                            const visible = document.elementFromPoint(text.x + text.width / 2, text.y + text.height / 2) === node;
                            $.removeStyle(node, 'pointer-events');
                            return visible;
                        })).toBe(true);
                    };

                    await control.hover();
                    await expectFieldUnchanged();

                    await control.focus();
                    await expectFieldUnchanged();

                    await control.click();
                    await expect(page.getByRole('listbox')).toBeVisible();
                    await expectFieldUnchanged();

                    await page.getByRole('searchbox').press('Escape');
                    await expect(page.locator('.selectmenu-menu')).toHaveCount(0);
                    await expectFieldUnchanged();
                });
            }
        }
    });

    test.describe('focus, disabled, and validation styling', () => {
        test('shows the UI focus ring when the clear control receives keyboard focus', async ({ page }) => {
            await page.evaluate(() => UI.SelectMenu.init($.findOne('#select'), { allowClear: true }));
            await page.getByRole('combobox').focus();
            await page.keyboard.press('Tab');
            const clear = page.getByRole('button', { name: 'Remove selection' });
            await expect(clear).toBeFocused();
            await expect(clear).not.toHaveCSS('box-shadow', 'none');
        });

        for (const { style, focusProperty } of [
            { style: 'filled', focusProperty: 'background-size' },
            { style: 'outline', focusProperty: 'box-shadow' },
        ]) {
            test.describe(style, () => {
                test.beforeEach(async ({ page }) => {
                    await page.evaluate((style) => {
                        const node = $.findOne('#select');
                        $.setAttribute(node, 'class', `input-${style}`);
                        $.setProperty(node, 'multiple', true);
                        UI.SelectMenu.init(node);
                        const reference = $.create('input');
                        $.setProperty(reference, 'id', 'reference');
                        $.setAttribute(reference, 'class', `input-${style}`);
                        $.append($.findOne('#host'), reference);
                    }, style);
                });

                test('matches UI focus styling and clears focus on blur', async ({ page }) => {
                    await page.evaluate(() => $.addClass($.findOne('#reference'), 'focus'));
                    await page.getByRole('combobox').focus();

                    const toggle = page.locator('.selectmenu-multi');
                    await expect(toggle).toHaveClass(/focus/);
                    const value = await page.locator('#reference').evaluate((node, property) => getComputedStyle(node).getPropertyValue(property), focusProperty);
                    await expect(toggle).toHaveCSS(focusProperty, value);

                    await page.locator('#outside').click();
                    await expect(toggle).not.toHaveClass(/focus/);
                });

                test('matches UI validation styling', async ({ page }) => {
                    await page.evaluate(() => $.addClass($.findOne('#host'), 'form-error'));

                    for (const property of ['background-color', 'border-color']) {
                        const value = await page.locator('#reference').evaluate((node, property) => getComputedStyle(node).getPropertyValue(property), property);
                        await expect(page.locator('.selectmenu-multi')).toHaveCSS(property, value);
                    }
                });

                for (const invalid of [false, true]) {
                    test(`matches UI disabled styling (invalid=${invalid})`, async ({ page }) => {
                        await page.evaluate((invalid) => {
                            $.findOne('#host').classList.toggle('form-error', invalid);
                            $('#select').selectmenu('disable');
                            $.setProperty($.findOne('#reference'), 'disabled', true);
                        }, invalid);

                        await expect(page.getByRole('combobox')).toBeDisabled();
                        const color = await page.locator('#reference').evaluate((node) => getComputedStyle(node).backgroundColor);
                        await expect(page.locator('.selectmenu-multi')).toHaveCSS('background-color', color);
                    });
                }
            });
        }
    });

    test.describe('attachment and positioning', () => {
        test('keeps an appended menu anchored when its reference container scrolls', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#select');
                const scroller = $.create('div');
                $.setProperty(scroller, 'id', 'scroller');
                $.setAttribute(scroller, 'style', 'overflow:auto;height:200px;width:300px;position:relative');
                const content = $.create('div');
                $.setAttribute(content, 'style', 'height:800px;padding-top:100px');
                $.before(node, scroller);
                $.append(scroller, content);
                $.append(content, node);
                UI.SelectMenu.init(node, { appendTo: document.body, fullWidth: true, fixed: true, spacing: 8 }).show();
            });
            const before = await page.locator('.selectmenu-menu').boundingBox();
            await page.locator('#scroller').evaluate((node) => node.scrollTop = 40);
            await expect.poll(async () => {
                const menu = await page.locator('.selectmenu-menu').boundingBox();
                return before.y - menu.y;
            }).toBeCloseTo(40, 0);
        });

        for (const placement of ['top', 'bottom', 'start', 'end']) {
            test(`positions the menu ${placement} with the configured spacing`, async ({ page }) => {
                await page.evaluate((placement) => {
                    const node = $.findOne('#select');
                    const host = $.create('div');
                    $.setAttribute(host, 'style', 'position:absolute;left:250px;top:250px;width:200px');
                    $.before(node, host);
                    $.append(host, node);
                    UI.SelectMenu.init(node, {
                        placement, position: 'center', fixed: true, spacing: 8, minContact: 20,
                        fullWidth: true, appendTo: document.body,
                    }).show();
                }, placement);
                const menu = page.locator('.selectmenu-menu');
                await expect(menu).toHaveAttribute('data-ui-placement', placement);
                await expect.poll(async () => {
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

        test('preserves RTL grouping and fits within the viewport when appended to body', async ({ page }) => {
            await page.evaluate(() => {
                $.setProperty($.findOne('#select'), 'dir', 'rtl');
                UI.SelectMenu.init($.findOne('#select'), { appendTo: document.body }).show();
            });
            const menu = page.locator('body > .selectmenu-menu');
            await expect(menu).toHaveCSS('direction', 'rtl');
            await expect(menu).toHaveCSS('text-align', 'start');
            await expect(page.getByRole('option').first()).toHaveCSS('padding-right', '16px');
            await expect(page.getByRole('option').first()).toHaveCSS('padding-left', '8px');
            const bounds = await menu.boundingBox();
            expect(bounds.width).toBeLessThanOrEqual(page.viewportSize().width);
        });

        test('positions logical start on the right of an RTL control', async ({ page }) => {
            await page.evaluate(() => {
                $.setAttribute($.findOne('#host'), 'style', 'position:absolute;left:250px;top:200px;width:200px');
                const node = $.findOne('#select');
                $.setProperty(node, 'dir', 'rtl');
                UI.SelectMenu.init(node, {
                    placement: 'start', fixed: true, spacing: 8, fullWidth: true, appendTo: document.body,
                }).show();
            });
            const menu = await page.locator('.selectmenu-menu').boundingBox();
            const control = await page.getByRole('combobox').boundingBox();
            expect(menu.x - control.x - control.width).toBeCloseTo(8, 0);
        });
    });

    test.describe('modal integration', () => {
        test('keeps the menu usable inside a UI modal', async ({ page }) => {
            await page.evaluate(async () => {
                const host = $.findOne('#host');
                const modal = $.create('div');
                $.setProperty(modal, 'id', 'modal');
                $.setAttribute(modal, 'class', 'modal');
                $.setHtml(modal, '<div class="modal-dialog"><div class="modal-content"><div class="modal-body"></div></div></div>');
                $.append($.findOne('.modal-body', modal), host);
                $.append(document.body, modal);
                UI.SelectMenu.init($.findOne('#select'));
                await new Promise((resolve) => {
                    $.addEventOnce(modal, 'shown.ui.modal', resolve);
                    UI.Modal.init(modal).show();
                });
            });
            await page.getByRole('combobox').click();
            await expect(page.locator('#modal .selectmenu-menu')).toBeVisible();
            await page.getByRole('option', { name: 'Banana' }).click();
            await expect(page.getByRole('combobox')).toHaveText('Banana');
            await expect(page.getByRole('combobox')).toBeFocused();
            await expect(page.locator('#modal')).toHaveAttribute('aria-hidden', 'false');
        });
    });
});
