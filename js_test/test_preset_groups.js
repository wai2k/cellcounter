// Mocha Specification Cases — Preset Group Totals

const assert = require('assert');
const { JSDOM } = require('jsdom');

const url = 'http://127.0.0.1:8001/';
let window, $;
const loadWebPage = (done) => {
    const handleWebPage = (dom) => {
        const waitForScripts = () => {
            window = dom.window;
            $ = dom.window.jQuery;
            $.when(window.initialised).done(function () { done(); });
        };
        dom.window.onload = waitForScripts;
    };
    const options = { resources: 'usable', runScripts: 'dangerously', pretendToBeVisual: true };
    global.document = JSDOM.fromURL(url, options).then(handleWebPage);
};
const closeWebPage = () => window.close();

function trigger_keydown(key, repeat) {
    var rpt = (typeof repeat === 'undefined') ? 1 : repeat;
    var e = $.Event('keydown');
    var key_code = (typeof key === 'number') ? key : key.charCodeAt(0);
    e.key = e.which = key_code;
    for (var i = 0; i < rpt; i++) { $(window.document).trigger(e); }
}

////////////////////////////////////////////////////////////////////////////////////////////////////

describe('PRESET_GROUPS configuration', function () {
    before(function (done) {
        this.timeout(5000);
        loadWebPage(done);
    });
    after(closeWebPage);
    this.timeout(6000);

    it('exposes PRESET_GROUPS on window', () => {
        assert.ok(window.PRESET_GROUPS, 'PRESET_GROUPS should be defined on window');
    });

    it('has myeloid_lineage_excl_blasts group with correct members', () => {
        const group = window.PRESET_GROUPS['myeloid_lineage_excl_blasts'];
        assert.ok(group, 'myeloid_lineage_excl_blasts group should exist');
        assert.strictEqual(group.label, 'Myeloid Lineage (excl blasts)');
        const expected = ['promyelocytes', 'myelocytes', 'meta', 'neutrophils', 'eosinophils', 'basophils'];
        assert.strictEqual(
            JSON.stringify(Array.from(group.members).sort()),
            JSON.stringify(expected.slice().sort())
        );
    });

    it('has blast_equivalents group with correct members', () => {
        const group = window.PRESET_GROUPS['blast_equivalents'];
        assert.ok(group, 'blast_equivalents group should exist');
        assert.strictEqual(group.label, 'Blast Equivalents');
        const expected = ['blasts', 'monoblast', 'promonocyte'];
        assert.strictEqual(
            JSON.stringify(Array.from(group.members).sort()),
            JSON.stringify(expected.slice().sort())
        );
    });
});

////////////////////////////////////////////////////////////////////////////////////////////////////

describe('compute_group_totals()', function () {
    before(function (done) {
        this.timeout(5000);
        loadWebPage(done);
    });
    after(closeWebPage);
    this.timeout(6000);

    it('is exposed as a function on window', () => {
        assert.strictEqual(typeof window.compute_group_totals, 'function');
    });

    it('returns zero counts when all counts are zero', () => {
        const count_data = [
            { machine_name: 'neutrophils', count: 0, abnormal: 0 },
            { machine_name: 'blasts', count: 0, abnormal: 0 }
        ];
        const result = window.compute_group_totals(count_data, window.PRESET_GROUPS, 0);
        result.forEach(function (g) {
            assert.strictEqual(g.count, 0);
            assert.strictEqual(g.percent, 0);
        });
    });

    it('sums neutrophils into myeloid_lineage_excl_blasts', () => {
        const count_data = [
            { machine_name: 'neutrophils', count: 10, abnormal: 0 },
            { machine_name: 'blasts', count: 5, abnormal: 0 },
            { machine_name: 'lymphocytes', count: 5, abnormal: 0 }
        ];
        const total = 20;
        const result = window.compute_group_totals(count_data, window.PRESET_GROUPS, total);
        const myeloid = result.find(function (g) { return g.key === 'myeloid_lineage_excl_blasts'; });
        assert.strictEqual(myeloid.count, 10);
        assert.strictEqual(myeloid.percent, 50);
    });

    it('sums blasts + monoblast + promonocyte into blast_equivalents', () => {
        const count_data = [
            { machine_name: 'blasts', count: 3, abnormal: 2 },
            { machine_name: 'monoblast', count: 1, abnormal: 0 },
            { machine_name: 'promonocyte', count: 1, abnormal: 0 },
            { machine_name: 'neutrophils', count: 3, abnormal: 0 }
        ];
        const total = 10;
        const result = window.compute_group_totals(count_data, window.PRESET_GROUPS, total);
        const blasts = result.find(function (g) { return g.key === 'blast_equivalents'; });
        // blasts: count=3 + abnormal=2 = 5, monoblast=1, promonocyte=1 → total=7
        assert.strictEqual(blasts.count, 7);
        assert.strictEqual(blasts.percent, 70);
    });

    it('includes abnormal counts in group totals', () => {
        const count_data = [
            { machine_name: 'neutrophils', count: 5, abnormal: 3 }
        ];
        const total = 8;
        const result = window.compute_group_totals(count_data, window.PRESET_GROUPS, total);
        const myeloid = result.find(function (g) { return g.key === 'myeloid_lineage_excl_blasts'; });
        assert.strictEqual(myeloid.count, 8);
    });

    it('returns a result entry for every group in the config', () => {
        const count_data = [];
        const result = window.compute_group_totals(count_data, window.PRESET_GROUPS, 0);
        const groupKeys = Object.keys(window.PRESET_GROUPS);
        assert.strictEqual(result.length, groupKeys.length);
        groupKeys.forEach(function (key) {
            const found = result.find(function (g) { return g.key === key; });
            assert.ok(found, 'result should contain entry for ' + key);
        });
    });
});

////////////////////////////////////////////////////////////////////////////////////////////////////

describe('Group totals DOM rendering', function () {
    before(function (done) {
        this.timeout(5000);
        loadWebPage(done);
    });
    after(closeWebPage);
    this.timeout(6000);

    it('renders a group-totals section in the DOM', () => {
        assert.ok($(window.document).find('div#group-totals').length > 0,
            '#group-totals div should exist in DOM');
    });

    it('has a row for each preset group', () => {
        const groupKeys = Object.keys(window.PRESET_GROUPS);
        groupKeys.forEach(function (key) {
            const row = $(window.document).find('#group-count-' + key);
            assert.ok(row.length > 0, 'DOM should have #group-count-' + key);
        });
    });

    it('shows correct group counts after counting and closing keyboard', () => {
        // Reset first
        window.counter.reset();

        // Press Q (neutrophils) 4 times — goes into Myeloid Lineage
        trigger_keydown('q', 4);
        // Press T (blasts) 2 times — goes into Blast Equivalents
        trigger_keydown('t', 2);

        // Close keyboard to trigger results.update()
        $(window.document).find('#close_button').trigger('click');

        const myeloidCount = parseInt($(window.document).find('#group-count-myeloid_lineage_excl_blasts').text());
        const blastCount = parseInt($(window.document).find('#group-count-blast_equivalents').text());

        assert.strictEqual(myeloidCount, 4, 'Myeloid Lineage count should be 4 (neutrophils)');
        assert.strictEqual(blastCount, 2, 'Blast Equivalents count should be 2 (blasts)');
    });
});
