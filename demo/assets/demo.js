const $ = globalThis.fQuery;
const { SelectMenu } = globalThis.UI;
const themeKey = 'frostui-selectmenu-demo-theme';

const setTheme = (theme) => {
    if (theme === 'system') {
        $(document.documentElement).removeAttribute('data-ui-theme');
    } else {
        $(document.documentElement).setAttribute('data-ui-theme', theme);
    }

    $('[data-demo-theme]').setValue(theme);
};

const logEvent = (message, className = 'text-body-secondary') => {
    const log = $.findOne('#event-log');
    const entry = $.create('div', {
        class: ['small', 'font-monospace', 'py-2', 'border-bottom', className],
        text: message,
    });

    $.append(log, entry);

    while ($.children(log).length > 50) {
        $.remove($.child(log)[0]);
    }

    $.setScrollY(log, $.height(log, { boxSize: $.SCROLL_BOX }));
};

$.ready(() => {
    let storedTheme;

    try {
        storedTheme = localStorage.getItem(themeKey);
    } catch {
        // The demo remains usable when browser storage is unavailable.
    }

    const requestedTheme = new URLSearchParams(location.search).get('theme');
    const initialTheme = requestedTheme || storedTheme;
    setTheme(['light', 'dark'].includes(initialTheme) ? initialTheme : 'system');

    $('[data-demo-theme]').addEvent('change', (event) => {
        const theme = $.getValue(event.currentTarget);
        setTheme(theme);

        try {
            if (theme === 'system') {
                localStorage.removeItem(themeKey);
            } else {
                localStorage.setItem(themeKey, theme);
            }
        } catch {
            // Theme selection still applies for the current page.
        }
    });

    $('#clear-log').addEvent('click', () => {
        $('#event-log').empty();
    });

    const cities = [
        { value: 'brisbane', text: 'Brisbane', region: 'Australia' },
        { value: 'cafe', text: 'Café Village', region: 'France' },
        { value: 'sao', text: 'São Paulo', region: 'Brazil' },
        { value: 'zurich', text: 'Zürich', region: 'Switzerland' },
    ];
    const remoteCities = Array.from({ length: 35 }, (_, index) => ({
        value: `city-${index + 1}`,
        text: `City ${String(index + 1).padStart(2, '0')}`,
    }));

    /**
     * Simulates a cancellable service with search, pagination, and value resolution.
     * @param {object} request The SelectMenu search or value request.
     * @returns {Promise} A delayed result with an optional cancel method.
     */
    const getResults = (request) => {
        let timer;
        const pending = new Promise((resolve, reject) => {
            timer = setTimeout((_) => {
                if ('value' in request) {
                    const values = [request.value].flat().map(String);
                    resolve({ results: remoteCities.filter((item) => values.includes(item.value)) });
                    return;
                }

                const term = (request.term || '').toLowerCase();
                if (term === 'error') {
                    reject(new Error('Demo search failure'));
                    return;
                }

                const results = remoteCities.filter((item) => item.text.toLowerCase().includes(term));
                const offset = request.offset || 0;
                resolve({
                    results: results.slice(offset, offset + 10),
                    showMore: offset + 10 < results.length,
                });
            }, 500);
        });
        pending.cancel = () => clearTimeout(timer);
        return pending;
    };

    // Initialize custom examples before the shared selector; init reuses existing instances.
    for (const id of ['cities', 'minimum']) {
        SelectMenu.init($.findOneById(id), { data: cities });
    }
    SelectMenu.init($.findOneById('object-data'), {
        data: { planned: 'Planned', active: 'Active', complete: 'Complete' },
    });
    SelectMenu.init($.findOneById('rendered'), {
        data: cities,
        renderResult(item, element) {
            const label = $.create('strong');
            $.setText(label, item.text);
            $.append(element, [label, $.createText(` — ${item.region}`)]);
        },
        renderSelection: (item) => item.text,
    });
    for (const id of ['remote', 'remote-initial', 'remote-error', 'remote-multiple']) {
        SelectMenu.init($.findOneById(id), { getResults, fullWidth: true });
    }
    $('[data-ui-toggle="selectmenu"]').selectmenu();
    $('#placeholder').selectmenu('setValue', null);

    $('#resolve-values').addEvent('click', (_) => {
        $('#remote-multiple').selectmenu('setValue', ['city-2', 'city-24']);
    });

    $('#selection-form').addEvent('submit', (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        $('#form-output').setText(`Fruit: ${data.get('fruit')}; tags: ${data.getAll('tags').join(', ') || '(none)'}`);
    });
    $('#selection-form').addEvent('reset', (_) => {
        $('#form-output').setText('Reset to the original selections.');
    });
    $('#toggle-fieldset').addEvent('click', (event) => {
        const fieldset = $.findOneById('demo-fieldset');
        $.setProperty(fieldset, 'disabled', !$.getProperty(fieldset, 'disabled'));
        $.setText(event.currentTarget, $.getProperty(fieldset, 'disabled') ? 'Enable fieldset' : 'Disable fieldset');
    });

    const methodNode = $.findOneById('methods-fruit');
    let methodInstance = SelectMenu.init(methodNode);
    const events = ['change', 'show', 'shown', 'hide', 'hidden'].map((name) => `${name}.ui.selectmenu`).join(' ');
    $.addEvent(methodNode, events, (event) => {
        logEvent(`${event.type}.ui.selectmenu — ${JSON.stringify(methodInstance?.getValue())}`);
    });

    const methodArguments = {
        setValue: [['apple', 'banana']],
        clear: [null],
        setPlaceholder: ['Pick your favorites'],
        setMaxSelections: [1],
    };
    $('[data-demo-method]').addEvent('mousedown', (event) => {
        // Preserve the current focus/menu state until the requested method runs.
        event.preventDefault();
        event.stopPropagation();
    });
    $('[data-demo-method]').addEvent('click', (event) => {
        const method = $.getDataset(event.currentTarget, 'demoMethod');
        const output = $.findOneById('method-output');
        if (method === 'init') {
            methodInstance = SelectMenu.init(methodNode);
            $.setText(output, 'Initialized.');
            return;
        }
        if (!methodInstance) {
            $.setText(output, 'Use Init to create an instance first.');
            return;
        }
        if (method === 'dispose') {
            methodInstance.dispose();
            methodInstance = null;
            $.setText(output, 'Disposed. The native select is restored.');
            return;
        }

        const name = method === 'clear' ? 'setValue' : method;
        const result = methodInstance[name](...(methodArguments[method] || []));
        $.setText(output, result === undefined || result === methodInstance ?
            `${name}() called.` : `${name}(): ${JSON.stringify(result)}`);
    });
});
