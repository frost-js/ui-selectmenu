const $ = globalThis.$;
const { SelectMenu } = globalThis.UI;

const setTheme = (theme) => {
    if (theme === 'system') {
        $(document.documentElement).removeAttribute('data-ui-theme');
    } else {
        $(document.documentElement).setAttribute('data-ui-theme', theme);
    }

    $('[data-demo-theme]').setValue(theme);
};

const storedTheme = localStorage.getItem('frostui-selectmenu-demo-theme');
setTheme(['light', 'dark'].includes(storedTheme) ? storedTheme : 'system');

$('[data-demo-theme]').addEvent('change', (event) => {
    const theme = $.getValue(event.currentTarget);

    if (theme === 'system') {
        localStorage.removeItem('frostui-selectmenu-demo-theme');
    } else {
        localStorage.setItem('frostui-selectmenu-demo-theme', theme);
    }

    setTheme(theme);
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
    SelectMenu.init(document.getElementById(id), { data: cities });
}
SelectMenu.init(document.getElementById('object-data'), {
    data: { planned: 'Planned', active: 'Active', complete: 'Complete' },
});
SelectMenu.init(document.getElementById('rendered'), {
    data: cities,
    renderResult(item, element) {
        const label = document.createElement('strong');
        label.textContent = item.text;
        element.append(label, document.createTextNode(` — ${item.region}`));
    },
    renderSelection: (item) => item.text,
});
for (const id of ['remote', 'remote-initial', 'remote-error', 'remote-multiple']) {
    SelectMenu.init(document.getElementById(id), { getResults, fullWidth: true });
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
    const fieldset = document.getElementById('demo-fieldset');
    fieldset.disabled = !fieldset.disabled;
    $.setText(event.currentTarget, fieldset.disabled ? 'Enable fieldset' : 'Disable fieldset');
});

const methodNode = document.getElementById('methods-fruit');
let methodInstance = SelectMenu.init(methodNode);
const events = ['change', 'show', 'shown', 'hide', 'hidden'].map((name) => `${name}.ui.selectmenu`).join(' ');
$.addEvent(methodNode, events, (event) => {
    const entry = document.createElement('div');
    entry.className = 'small font-monospace py-2 border-bottom';
    entry.textContent = `${event.type}.ui.selectmenu — ${JSON.stringify(methodInstance?.getValue())}`;
    const log = document.getElementById('event-log');
    log.append(entry);
    if (log.children.length > 50) {
        log.firstElementChild.remove();
    }
    log.scrollTop = log.scrollHeight;
});
$('#clear-log').addEvent('click', (_) => $('#event-log').empty());

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
    const method = event.currentTarget.dataset.demoMethod;
    const output = document.getElementById('method-output');
    if (method === 'init') {
        methodInstance = SelectMenu.init(methodNode);
        output.textContent = 'Initialized.';
        return;
    }
    if (!methodInstance) {
        output.textContent = 'Use Init to create an instance first.';
        return;
    }
    if (method === 'dispose') {
        methodInstance.dispose();
        methodInstance = null;
        output.textContent = 'Disposed. The native select is restored.';
        return;
    }

    const name = method === 'clear' ? 'setValue' : method;
    const result = methodInstance[name](...(methodArguments[method] || []));
    output.textContent = result === undefined || result === methodInstance ?
        `${name}() called.` : `${name}(): ${JSON.stringify(result)}`;
});
