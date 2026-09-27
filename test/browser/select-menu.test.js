import { expect, test } from '#test';

test.describe('SelectMenu', () => {
    test.describe('#init', () => {
        test('exports the component through Frost UI', async ({ page }) => {
            expect(await page.evaluate((_) => typeof UI.SelectMenu)).toBe('function');
            expect(await page.evaluate((_) => UI.SelectMenu.prototype instanceof UI.BaseComponent)).toBe(true);
        });

        test('registers the component with fQuery', async ({ page }) => {
            expect(await page.evaluate((_) => typeof $.QuerySet.prototype.selectmenu)).toBe('function');
            expect(await page.evaluate((_) => UI.SelectMenu.DATA_KEY)).toBe('selectmenu');
        });
    });

    test.describe('styles', () => {
        test('loads the UI and SelectMenu stylesheets', async ({ page }) => {
            await page.evaluate((_) => {
                document.body.innerHTML =
                    '<div class="text-center">UI styles</div>' +
                    '<div class="selectmenu-menu">SelectMenu styles</div>';
            });

            await expect(page.locator('.text-center')).toHaveCSS('text-align', 'center');
            await expect(page.locator('.selectmenu-menu')).toHaveCSS('position', 'absolute');
            await expect(page.locator('.selectmenu-menu')).toHaveCSS('z-index', '1000');
        });
    });
});
