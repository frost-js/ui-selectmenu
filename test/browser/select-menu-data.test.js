import { expect, test } from '#test';

test.describe('SelectMenu remote results', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate(() => {
            $.setHtml(document.body,
                '<label for="select">Fruit</label><select id="select" class="input-outline">' +
                '<option value="a">Apple</option></select>',
            );
            window.requests = [];
            window.getResults = (request) => {
                let resolve;
                let reject;
                const promise = new Promise((success, failure) => {
                    resolve = success;
                    reject = failure;
                });
                const entry = { request, resolve, reject, cancelled: false };
                promise.cancel = () => entry.cancelled = true;
                window.requests.push(entry);
                return promise;
            };
        });
    });

    test.describe('responses', () => {
        for (const multiple of [false, true]) {
            test(`refreshes selected labels from search responses without changing values (multiple=${multiple})`, async ({ page }) => {
                await page.evaluate((multiple) => {
                    $.setProperty('#select', 'multiple', multiple);
                    UI.SelectMenu.init($.findOne('#select'), {
                        debounce: 0, getResults: window.getResults,
                    }).setValue('a');
                    window.changes = 0;
                    $.addEvent('#select', 'change.ui.selectmenu', () => window.changes++);
                }, multiple);
                await page.getByRole('combobox').click();
                await expect.poll(() => page.evaluate(() => window.requests.length)).toBe(1);
                const search = page.getByRole(multiple ? 'combobox' : 'searchbox');
                await search.fill('ap');
                await expect.poll(() => page.evaluate(() => window.requests.length)).toBe(2);
                await page.evaluate(() => window.requests[1].resolve({ results: [{ value: 'a', text: 'Apricot' }] }));
                const selection = multiple ? page.locator('.selectmenu-selection') : page.getByRole('combobox');
                await expect(selection).toHaveText('Apricot');
                await expect(page.getByRole('option')).toHaveText('Apricot');
                await expect(search).toHaveValue('ap');
                await expect(search).toBeFocused();
                expect(await page.evaluate(() => $('#select').selectmenu('getValue'))).toEqual(multiple ? ['a'] : 'a');
                expect(await page.evaluate(() => window.requests.length)).toBe(2);
                expect(await page.evaluate(() => window.changes)).toBe(0);
                await expect(page.locator('#select option')).toHaveText('Apple');
            });
        }

        test('shows no results for an empty response', async ({ page }) => {
            await page.evaluate(() => UI.SelectMenu.init($.findOne('#select'), {
                debounce: 0, getResults: () => ({ results: [] }),
            }).show());
            await expect(page.getByRole('status')).toHaveText('No results');
        });
    });

    test.describe('value resolution', () => {
        test('resolves numeric multiple values and adds only selected native options', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#select');
                $.setProperty(node, 'multiple', true);
                UI.SelectMenu.init(node, { getResults: window.getResults }).setValue([0, 2]);
                window.requests[0].resolve({ results: [
                    { value: 0, text: 'Zero' }, { value: 2, text: 'Two' }, { value: 3, text: 'Unused' },
                ] });
            });
            await expect(page.locator('#select')).toHaveValues(['0', '2']);
            await expect(page.locator('#select option')).toHaveCount(3);
            expect(await page.evaluate(() => window.requests[0].request.value)).toEqual([0, 2]);
            expect(await page.evaluate(() => $('#select').selectmenu('getValue'))).toEqual([0, 2]);
        });

        test('updates generated disabled state without changing authored options', async ({ page }) => {
            await page.evaluate(() => {
                $.setProperty($.findOne('#select option'), 'disabled', true);
                UI.SelectMenu.init($.findOne('#select'), {
                    getResults: window.getResults, debounce: 0,
                }).setValue('remote');
                window.requests[0].resolve({ results: [{ value: 'remote', text: 'Remote', disabled: true }] });
            });
            await expect(page.locator('#select')).toHaveValue('remote');
            await expect(page.locator('#select option[value="remote"]')).toBeDisabled();
            await page.getByRole('combobox').click();
            await expect.poll(() => page.evaluate(() => window.requests.length)).toBe(2);
            await page.evaluate(() => window.requests[1].resolve({ results: [
                { value: 'remote', text: 'Remote', disabled: false },
                { value: 'a', text: 'Apple', disabled: false },
            ] }));
            await expect(page.getByRole('option', { name: 'Remote', exact: true })).toHaveAttribute('aria-disabled', 'false');
            await expect(page.locator('#select option[value="remote"]')).toBeEnabled();
            await expect(page.locator('#select option[value="a"]')).toBeDisabled();
        });

        for (const failure of ['throw', 'reject']) {
            test(`preserves the previous selection on a value lookup ${failure}`, async ({ page }) => {
                await page.evaluate((failure) => {
                    const instance = UI.SelectMenu.init($.findOne('#select'), {
                        getResults: () => {
                            if (failure === 'throw') {
                                throw new Error('Unavailable');
                            }
                            return Promise.reject(new Error('Unavailable'));
                        },
                    });
                    instance.setValue('missing');
                }, failure);
                await expect(page.getByRole('combobox')).toHaveText('Apple');
                await expect(page.locator('#select')).toHaveValue('a');
            });
        }
    });

    test.describe('errors and retry', () => {
        for (const failure of ['throw', 'reject']) {
            test(`shows an error after a search ${failure} and allows retry`, async ({ page }) => {
                await page.evaluate((failure) => {
                    let first = true;
                    UI.SelectMenu.init($.findOne('#select'), {
                        debounce: 0,
                        getResults: () => {
                            if (first) {
                                first = false;
                                if (failure === 'throw') {
                                    throw new Error('Unavailable');
                                }
                                return Promise.reject(new Error('Unavailable'));
                            }
                            return { results: [{ value: 'b', text: 'Banana' }] };
                        },
                    });
                }, failure);
                await page.getByRole('combobox').click();
                await expect(page.getByRole('status')).toHaveText('Error loading data.');
                await page.getByRole('searchbox').fill('Ban');
                await expect(page.getByRole('option')).toHaveText('Banana');
                await expect(page.getByRole('status')).toHaveCount(0);
            });
        }
    });

    test.describe('cancellation', () => {
        for (const type of ['search', 'value']) {
            test(`completes disposal when ${type} cancellation throws`, async ({ page }) => {
                await page.evaluate((type) => {
                    window.instance = UI.SelectMenu.init($.findOne('#select'), {
                        debounce: 0,
                        getResults(request) {
                            const result = window.getResults(request);
                            const cancel = result.cancel;
                            result.cancel = () => {
                                cancel();
                                throw new Error('Cancellation failed');
                            };
                            return result;
                        },
                    });
                    if (type === 'search') {
                        window.instance.show();
                    } else {
                        window.instance.setValue('remote');
                    }
                }, type);
                await expect.poll(() => page.evaluate(() => window.requests.length)).toBe(1);
                await page.evaluate(() => window.instance.dispose());
                expect(await page.evaluate(() => window.instance.node)).toBeNull();
                expect(await page.evaluate(() => $.hasData('#select', 'selectmenu'))).toBe(false);
                expect(await page.evaluate(() => window.requests[0].cancelled)).toBe(true);
                await expect(page.locator('.selectmenu-container, .selectmenu-menu')).toHaveCount(0);
                await expect(page.locator('#select')).not.toHaveClass(/visually-hidden/);
                await page.evaluate(() => {
                    UI.SelectMenu.init($.findOne('#select'));
                    window.requests[0].resolve({ results: [{ value: 'late', text: 'Late' }] });
                });
                await expect(page.getByRole('combobox')).toHaveText('Apple');
                await expect(page.locator('#select option')).toHaveCount(1);
            });
        }

        test('shows loading and prevents stale search responses from changing the lookup', async ({ page }) => {
            await page.evaluate(() => UI.SelectMenu.init($.findOne('#select'), {
                getResults: window.getResults, debounce: 0,
            }));
            await page.getByRole('combobox').click();
            await expect(page.getByRole('status')).toHaveText('Loading..');
            await expect.poll(() => page.evaluate(() => window.requests.length)).toBe(1);
            await page.getByRole('searchbox').fill('new');
            await expect.poll(() => page.evaluate(() => window.requests.length)).toBe(2);
            expect(await page.evaluate(() => window.requests[1].request)).toEqual({ offset: 0, term: 'new' });
            await page.evaluate(() => window.requests[1].resolve({ results: [{ value: 'new', text: 'New' }] }));
            await expect(page.getByRole('option')).toHaveText('New');
            await page.evaluate(() => window.requests[0].resolve({ results: [{ value: 'new', text: 'Stale label' }] }));
            await page.getByRole('option', { name: 'New', exact: true }).click();
            await expect(page.getByRole('combobox')).toHaveText('New');
            expect(await page.evaluate(() => window.requests[0].cancelled)).toBe(true);
        });

        test('cancels an active search and ignores its result', async ({ page }) => {
            await page.evaluate(() => UI.SelectMenu.init($.findOne('#select'), {
                getResults: window.getResults, debounce: 0,
            }).show());
            await expect.poll(() => page.evaluate(() => window.requests.length)).toBe(1);
            await page.evaluate(() => {
                $('#select').selectmenu('hide');
                window.requests[0].resolve({ results: [{ value: 'late', text: 'Late' }] });
            });
            await expect(page.locator('.selectmenu-menu')).toHaveCount(0);
            expect(await page.evaluate(() => window.requests[0].cancelled)).toBe(true);
            await page.evaluate(() => $('#select').selectmenu('setValue', 'late'));
            expect(await page.evaluate(() => window.requests.length)).toBe(2);
        });

        test('cancels searches and ignores callbacks after disposal', async ({ page }) => {
            const errors = [];
            page.on('pageerror', (error) => errors.push(error));
            await page.evaluate(() => UI.SelectMenu.init($.findOne('#select'), {
                getResults: window.getResults, debounce: 0,
            }).show());
            await expect.poll(() => page.evaluate(() => window.requests.length)).toBe(1);
            await page.evaluate(() => {
                $('#select').selectmenu('dispose');
                window.requests[0].resolve({ results: [{ value: 'late', text: 'Late' }] });
            });
            expect(await page.evaluate(() => window.requests[0].cancelled)).toBe(true);
            await expect(page.locator('.selectmenu-menu, .selectmenu-toggle')).toHaveCount(0);
            await expect(page.locator('#select')).toHaveValue('a');
            expect(errors).toHaveLength(0);
        });

        test('applies only the latest remote value response', async ({ page }) => {
            await page.evaluate(() => {
                const instance = UI.SelectMenu.init($.findOne('#select'), { getResults: window.getResults });
                instance.setValue('old');
                instance.setValue('new');
                window.requests[1].resolve({ results: [{ value: 'new', text: 'New' }] });
            });
            await expect(page.getByRole('combobox')).toHaveText('New');
            await page.evaluate(() => window.requests[0].resolve({ results: [
                { value: 'old', text: 'Old' }, { value: 'new', text: 'Stale label' },
            ] }));
            await expect(page.locator('#select')).toHaveValue('new');
            expect(await page.evaluate(() => $('#select').selectmenu('data').text)).toBe('New');
            expect(await page.evaluate(() => window.requests[0].cancelled)).toBe(true);
        });

        test('invalidates a pending lookup when a known value is selected', async ({ page }) => {
            await page.evaluate(() => {
                const instance = UI.SelectMenu.init($.findOne('#select'), { getResults: window.getResults });
                instance.setValue('remote');
                instance.setValue(null);
                window.requests[0].resolve({ results: [{ value: 'remote', text: 'Remote' }] });
            });
            await expect(page.locator('#select')).toHaveValue('');
            expect(await page.evaluate(() => $('#select').selectmenu('getValue'))).toBeNull();
            expect(await page.evaluate(() => window.requests[0].cancelled)).toBe(true);
        });

        test('cancels a value lookup and leaves the native control reusable', async ({ page }) => {
            await page.evaluate(() => {
                const instance = UI.SelectMenu.init($.findOne('#select'), { getResults: window.getResults });
                instance.setValue('remote');
                instance.dispose();
                UI.SelectMenu.init($.findOne('#select'));
                window.requests[0].resolve({ results: [{ value: 'remote', text: 'Remote' }] });
            });
            expect(await page.evaluate(() => window.requests[0].cancelled)).toBe(true);
            await expect(page.getByRole('combobox')).toHaveText('Apple');
            await expect(page.locator('#select option')).toHaveCount(1);
        });
    });

    test.describe('pagination', () => {
        test('loads another page when the results are too short to scroll', async ({ page }) => {
            await page.evaluate(() => UI.SelectMenu.init($.findOne('#select'), {
                getResults: window.getResults, debounce: 0,
            }).show());
            await expect.poll(() => page.evaluate(() => window.requests.length)).toBe(1);
            await page.evaluate(() => window.requests[0].resolve({ results: [{ value: 'x', text: 'Extra' }], showMore: true }));
            await expect(page.getByRole('option')).toHaveText('Extra');
            await expect.poll(() => page.evaluate(() => window.requests.length)).toBe(2);
            expect(await page.evaluate(() => window.requests[1].request.offset)).toBe(1);
            await page.evaluate(() => window.requests[1].resolve({ results: [{ value: 'y', text: 'Another' }] }));
            await expect(page.getByRole('option')).toHaveText(['Extra', 'Another']);
            await page.getByRole('option', { name: 'Another' }).click();
            await expect(page.locator('#select')).toHaveValue('y');
        });

        test('paginates on scrolling and retains grouped and disabled results', async ({ page }) => {
            await page.evaluate(() => UI.SelectMenu.init($.findOne('#select'), {
                getResults: window.getResults, debounce: 0, maxHeight: '70px',
            }).show());
            await expect.poll(() => page.evaluate(() => window.requests.length)).toBe(1);
            await page.evaluate(() => window.requests[0].resolve({
                results: [{ text: 'First group', children: Array.from({ length: 10 }, (_, value) => ({ value, text: `Item ${value}` })) }],
                showMore: true,
            }));
            await expect(page.getByRole('option')).toHaveCount(10);
            await page.getByRole('listbox').evaluate((node) => node.scrollTop = node.scrollHeight);
            await expect.poll(() => page.evaluate(() => window.requests.length)).toBe(2);
            expect(await page.evaluate(() => window.requests[1].request.offset)).toBe(1);
            await page.evaluate(() => window.requests[1].resolve({
                results: [{ text: 'Second group', disabled: true, children: [{ value: 'last', text: 'Last' }] }],
            }));
            await expect(page.getByRole('option')).toHaveCount(11);
            await expect(page.getByRole('group', { name: 'Second group' })).toBeVisible();
            await expect(page.getByRole('option', { name: 'Last', exact: true })).toHaveAttribute('aria-disabled', 'true');
            await expect(page.getByRole('status')).toHaveCount(0);
        });

        test.describe('automatic pagination', () => {
            test.use({ mockClock: true });

            for (const { name, respond, status } of [
                {
                    name: 'empty',
                    respond: () => window.requests[1].resolve({ results: [], showMore: true }),
                    status: [],
                },
                {
                    name: 'error',
                    respond: () => window.requests[1].reject(new Error('Unavailable')),
                    status: ['Error loading data.'],
                },
            ]) {
                test(`stops automatic pagination after an ${name} page`, async ({ page }) => {
                    await page.evaluate(() => UI.SelectMenu.init($.findOne('#select'), {
                        getResults: window.getResults, debounce: 0,
                    }).show());
                    await page.clock.runFor(1);
                    await page.evaluate(() => window.requests[0].resolve({ results: [{ value: 'x', text: 'Extra' }], showMore: true }));
                    await page.clock.runFor(300);
                    expect(await page.evaluate(() => window.requests.length)).toBe(2);
                    await page.evaluate(respond);
                    await page.clock.runFor(1000);
                    expect(await page.evaluate(() => window.requests.length)).toBe(2);
                    await expect(page.getByRole('option')).toHaveText('Extra');
                    await expect(page.getByRole('status')).toHaveText(status);
                });
            }
        });
    });

    test.describe('debounce', () => {
        test.use({ mockClock: true });

        test.beforeEach(async ({ page }) => {
            await page.evaluate(() => UI.SelectMenu.init($.findOne('#select'), {
                getResults: window.getResults, debounce: 250, minSearch: 2,
            }).show());
        });

        test('coalesces searches into the latest term', async ({ page }) => {
            await page.getByRole('searchbox').fill('ap');
            await page.clock.runFor(100);
            await page.getByRole('searchbox').fill('app');
            await page.clock.runFor(249);
            expect(await page.evaluate(() => window.requests.length)).toBe(0);

            await page.clock.runFor(2);
            expect(await page.evaluate(() => window.requests.length)).toBe(1);
            expect(await page.evaluate(() => window.requests[0].request.term)).toBe('app');
        });

        test('cancels a queued search below minSearch', async ({ page }) => {
            await page.getByRole('searchbox').fill('banana');
            await page.getByRole('searchbox').fill('b');
            await page.clock.runFor(251);

            expect(await page.evaluate(() => window.requests.length)).toBe(0);
        });

        test('cancels a queued search on disposal', async ({ page }) => {
            await page.getByRole('searchbox').fill('cherry');
            await page.evaluate(() => $('#select').selectmenu('dispose'));
            await page.clock.runFor(251);

            expect(await page.evaluate(() => window.requests.length)).toBe(0);
        });
    });
});
