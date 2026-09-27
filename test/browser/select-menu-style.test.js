import { expect, test } from '#test';

test.describe('SelectMenu styles', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate((_) => {
            document.body.innerHTML = '<button id="outside">Outside</button><div id="host" style="width:260px">' +
                '<label for="select">Fruit</label><select id="select" class="input-outline">' +
                '<optgroup label="Fruit"><option value="a">Apple</option><option value="b">Banana</option>' +
                '</optgroup></select></div>';
        });
    });

    test.describe('#init', () => {
        for (const style of ['filled', 'outline']) {
            for (const multiple of [false, true]) {
                for (const size of ['', 'sm', 'lg']) {
                    test(`uses UI input sizing (${style}, multiple=${multiple}, size=${size || 'default'})`, async ({ page }) => {
                        await page.evaluate(({ style, multiple, size }) => {
                            const node = document.querySelector('#select');
                            node.className = `input-${style}${size ? ` input-${size}` : ''}`;
                            node.multiple = multiple;
                            node.selectedIndex = -1;
                            const reference = document.createElement('input');
                            reference.id = 'reference';
                            reference.className = node.className;
                            document.querySelector('#host').append(reference);
                            UI.SelectMenu.init(node, { placeholder: 'Choose fruit' });
                        }, { style, multiple, size });
                        const toggle = page.locator('.selectmenu-toggle, .selectmenu-multi');
                        const reference = page.locator('#reference');
                        for (const property of ['fontSize', 'paddingTop', 'paddingBottom', 'minHeight', 'borderTopWidth', 'borderRadius']) {
                            const value = await reference.evaluate((node, property) => getComputedStyle(node)[property], property);
                            const cssProperty = property.replaceAll(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
                            await expect(toggle).toHaveCSS(cssProperty, value);
                        }
                        await expect(toggle).toHaveCSS('width', '260px');
                        await expect(page.locator('.ripple-line')).toHaveCount(0);
                        await page.getByRole('combobox').click();
                        const sizes = { '': '16px', 'sm': '14px', 'lg': '20px' };
                        await expect(page.locator('.selectmenu-menu')).toHaveCSS('font-size', sizes[size]);
                        if (!multiple) {
                            const fontSize = await toggle.evaluate((node) => getComputedStyle(node).fontSize);
                            await expect(page.getByRole('searchbox')).toHaveCSS('font-size', fontSize);
                        } else {
                            await page.evaluate((_) => $('#select').selectmenu('setValue', ['a']));
                            const height = await reference.evaluate((node) => getComputedStyle(node).height);
                            await expect(toggle).toHaveCSS('height', height);
                        }
                    });
                }
            }
        }

        for (const direction of ['ltr', 'rtl']) {
            test(`keeps clear controls and chips inside narrow controls (${direction})`, async ({ page }) => {
                await page.evaluate((direction) => {
                    const node = document.querySelector('#select');
                    node.dir = direction;
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
                await page.evaluate((_) => {
                    $('#select').selectmenu('dispose');
                    const node = document.querySelector('#select');
                    node.multiple = true;
                    UI.SelectMenu.init(node).setValue(['a', 'b']);
                });
                await expect(page.locator('.selectmenu-multi')).toHaveCSS('direction', direction);
                expect(await page.locator('.selectmenu-multi').evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
                await expect(page.locator('.selectmenu-multi button.btn-close')).toHaveCount(0);
                await expect(page.locator('.selectmenu-multi button > .btn-close')).toHaveCount(2);
                await expect(page.locator('.selectmenu-multi')).toHaveCSS('column-gap', '4px');
            });
        }

        for (const [style, nested] of [['outline', false], ['outline', true], ['filled', false], ['filled', true]]) {
            test(`fits UI input groups with floating labels (${style}, nested=${nested})`, async ({ page }) => {
                await page.evaluate(({ style, nested }) => {
                    const host = document.querySelector('#host');
                    const select = `<select id="select" class="input-${style} input-floating"><option>Apple</option></select>`;
                    const field = nested ? `<div class="form-input">${select}<label for="select" class="label-floating">Fruit</label></div>` : select;
                    host.innerHTML = `<div class="input-group input-group-sm"><span class="input-group-text">@</span>${field}<button class="btn">Go</button></div>`;
                    UI.SelectMenu.init(document.querySelector('#select'), { allowClear: true });
                }, { style, nested });
                const group = page.locator('.input-group');
                const bounds = await group.boundingBox();
                const button = await page.getByRole('button', { name: 'Go' }).boundingBox();
                expect(button.x + button.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
                expect(button.y).toBe(bounds.y);
                await expect(page.getByRole('combobox')).toHaveCSS('border-top-left-radius', '0px');
                await expect(page.getByRole('combobox')).toHaveCSS('border-top-right-radius', '0px');
                if (nested) {
                    await expect(page.locator('.label-floating')).toHaveCSS('font-size', '12px');
                    const label = await page.locator('.label-floating').boundingBox();
                    const selection = await page.locator('.selectmenu-selection').boundingBox();
                    expect(label.y).toBeLessThan(selection.y);
                }
                await page.getByRole('combobox').click();
                if (style === 'outline') {
                    await expect(group).not.toHaveCSS('box-shadow', 'none');
                } else {
                    await expect(page.getByRole('combobox')).toHaveCSS('background-size', '0% 2px, 100% 1px');
                    expect(await group.evaluate((node) => getComputedStyle(node, '::after').opacity)).toBe('1');
                }
                await expect(page.getByRole('combobox')).toHaveCSS('box-shadow', 'none');
                await expect(page.locator('.selectmenu-menu')).toHaveCSS('font-size', '14px');
            });
        }

        test('retains the starting radius when the native select is the first input-group child', async ({ page }) => {
            await page.evaluate((_) => {
                document.querySelector('#host').innerHTML = '<div class="input-group"><select id="select" class="input-outline">' +
                    '<option>Apple</option></select><button class="btn">Go</button></div>';
                UI.SelectMenu.init(document.querySelector('#select'));
            });
            const radius = await page.locator('.input-group').evaluate((node) => getComputedStyle(node).borderTopLeftRadius);
            await expect(page.getByRole('combobox')).toHaveCSS('border-top-left-radius', radius);
            await expect(page.getByRole('combobox')).toHaveCSS('border-top-right-radius', '0px');
        });

        for (const display of ['grid', 'flex']) {
            test(`measures search text independently of a ${display} page layout`, async ({ page }) => {
                await page.evaluate((display) => {
                    document.body.style.cssText = `display:${display};grid-template-columns:320px`;
                    const node = document.querySelector('#select');
                    node.multiple = true;
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
    });

    test.describe('user events', () => {
        test('keeps the menu usable inside a UI modal', async ({ page }) => {
            await page.evaluate(async (_) => {
                const host = document.querySelector('#host');
                const modal = document.createElement('div');
                modal.id = 'modal';
                modal.className = 'modal';
                modal.innerHTML = '<div class="modal-dialog"><div class="modal-content"><div class="modal-body"></div></div></div>';
                modal.querySelector('.modal-body').append(host);
                document.body.append(modal);
                UI.SelectMenu.init(document.querySelector('#select'));
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

        test('shows the UI focus ring when the clear control receives keyboard focus', async ({ page }) => {
            await page.evaluate((_) => UI.SelectMenu.init(document.querySelector('#select'), { allowClear: true }));
            await page.getByRole('combobox').focus();
            await page.keyboard.press('Tab');
            const clear = page.getByRole('button', { name: 'Remove selection' });
            await expect(clear).toBeFocused();
            await expect(clear).not.toHaveCSS('box-shadow', 'none');
        });

        for (const style of ['filled', 'outline']) {
            test(`uses UI focus, disabled, and validation styling (${style})`, async ({ page }) => {
                await page.evaluate((style) => {
                    const node = document.querySelector('#select');
                    node.className = `input-${style}`;
                    node.multiple = true;
                    UI.SelectMenu.init(node);
                    const reference = document.createElement('input');
                    reference.id = 'reference';
                    reference.className = `input-${style} focus`;
                    document.querySelector('#host').append(reference);
                }, style);
                const toggle = page.locator('.selectmenu-multi');
                await page.getByRole('combobox').focus();
                await expect(toggle).toHaveClass(/focus/);
                const property = style === 'filled' ? 'background-size' : 'box-shadow';
                const focusStyle = await page.locator('#reference').evaluate((node, property) => getComputedStyle(node).getPropertyValue(property), property);
                await expect(toggle).toHaveCSS(property, focusStyle);
                await page.locator('#outside').click();
                await expect(toggle).not.toHaveClass(/focus/);
                await page.evaluate((_) => {
                    document.querySelector('#host').classList.add('form-error');
                    document.querySelector('#reference').classList.remove('focus');
                });
                for (const property of ['background-color', 'border-color']) {
                    const value = await page.locator('#reference').evaluate((node, property) => getComputedStyle(node).getPropertyValue(property), property);
                    await expect(toggle).toHaveCSS(property, value);
                }
                await page.evaluate((_) => {
                    $('#select').selectmenu('disable');
                    document.querySelector('#reference').disabled = true;
                });
                await expect(page.getByRole('combobox')).toBeDisabled();
                const disabledColor = await page.locator('#reference').evaluate((node) => getComputedStyle(node).backgroundColor);
                await expect(toggle).toHaveCSS('background-color', disabledColor);
            });
        }
    });

    test.describe('#hide', () => {
        test('restores the multiple control size after clearing a long search', async ({ page }) => {
            await page.evaluate((_) => {
                const node = document.querySelector('#select');
                node.multiple = true;
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

    test.describe('fullWidth option', () => {
        test('wraps long results and constrains the scrollable menu', async ({ page }) => {
            await page.evaluate((_) => UI.SelectMenu.init(document.querySelector('#select'), {
                fullWidth: true, maxHeight: '70px',
                data: Array.from({ length: 10 }, (_, value) => ({ value, text: `An unbroken label ${'x'.repeat(200)}` })),
            }).show());
            await expect(page.locator('.selectmenu-menu')).toHaveCSS('width', '260px');
            await expect(page.getByRole('listbox')).toHaveCSS('max-height', '70px');
            expect(await page.getByRole('listbox').evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
            expect(await page.getByRole('listbox').evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
        });
    });

    test.describe('appendTo option', () => {
        test('preserves RTL grouping and fits within the viewport when appended to body', async ({ page }) => {
            await page.evaluate((_) => {
                document.querySelector('#select').dir = 'rtl';
                UI.SelectMenu.init(document.querySelector('#select'), { appendTo: document.body }).show();
            });
            const menu = page.locator('body > .selectmenu-menu');
            await expect(menu).toHaveCSS('direction', 'rtl');
            await expect(menu).toHaveCSS('text-align', 'start');
            await expect(page.getByRole('option').first()).toHaveCSS('padding-right', '16px');
            await expect(page.getByRole('option').first()).toHaveCSS('padding-left', '8px');
            const bounds = await menu.boundingBox();
            expect(bounds.width).toBeLessThanOrEqual(page.viewportSize().width);
        });
    });

    test.describe('placement option', () => {
        test('positions logical start on the right of an RTL control', async ({ page }) => {
            await page.evaluate((_) => {
                document.querySelector('#host').style.cssText = 'position:absolute;left:250px;top:200px;width:200px';
                const node = document.querySelector('#select');
                node.dir = 'rtl';
                UI.SelectMenu.init(node, {
                    placement: 'start', fixed: true, spacing: 8, fullWidth: true, appendTo: document.body,
                }).show();
            });
            const menu = await page.locator('.selectmenu-menu').boundingBox();
            const control = await page.getByRole('combobox').boundingBox();
            expect(menu.x - control.x - control.width).toBeCloseTo(8, 0);
        });
    });
});
