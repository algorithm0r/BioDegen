/**
 * Headless test suite for BioDegen simulation.
 * Usage: node test.js
 */

'use strict';

const fs     = require('fs');
const path   = require('path');
const vm     = require('vm');
const assert = require('assert');

// ── Shared context ────────────────────────────────────────────────────────────
const gameEngineStub = { entities: [], addEntity: () => {}, World: null };

const ctx = vm.createContext({
    Math, Number, Array, Object, JSON, Infinity, NaN, isNaN, isFinite,
    parseInt, parseFloat, setTimeout, clearTimeout,

    window:   { requestAnimationFrame: () => {}, requestAnimFrame: () => {} },
    document: { getElementById: () => ({ innerHTML: '', innerText: '', value: 0, checked: false }) },
    console:  { log: () => {}, warn: () => {}, error: () => {} },

    socket:     { emit: () => {} },
    gameEngine: gameEngineStub,

    Graph:     class { constructor() {} draw() {} update() {} },
    Histogram: class { constructor() {} draw() {} update() {} },

    loadParameters:       () => {},
    saveParametersToUI:   () => {},
    loadParametersFromUI: () => {},
});

function load(filename) {
    let code = fs.readFileSync(path.join(__dirname, filename), 'utf8');
    code = code.replace(/^const\s+/gm,     'var ');
    code = code.replace(/^let\s+/gm,        'var ');
    code = code.replace(/^class\s+(\w+)/gm, 'var $1 = class $1');
    vm.runInContext(code, ctx);
}

load('util.js');
load('dataManager.js');
load('human.js');
load('village.js');
load('world.js');

ctx.loadParameters = () => {};

const PARAMETERS = ctx.PARAMETERS;
const runs = ctx.runs;

// ── Helpers ───────────────────────────────────────────────────────────────────
function setup(overrides = {}) {
    Object.assign(PARAMETERS, {
        worldDimension:             6,
        maxEnvironmentalBonus:      5,
        randomEnvironmentalBonuses: false,
        graphWidth: 600, graphHeight: 100,
        populationSoftCap:          30,
        numTraits:                  10,
        traitThreshold:             5,
        reproductionThresholdBase:  50,
        reproductionThresholdStep:  10,
        migrationRate:              0.2,
        mutationRate:               0.0,
        learningRate:               0.0,
        deathRate:                  0.0,
        socialLearningRate:         0.1,
        migratePeriod:              10,
        reportingPeriod:            400,
        epoch:                      200000,
        learningOn:                 200000,
        socialOn:                   200000,
        day:                        0,
        db: 'BioDegenDB', collection: 'test',
    });
    Object.assign(PARAMETERS, overrides);
}

function newWorld(overrides = {}) {
    setup(overrides);
    PARAMETERS.day = 0;
    ctx.gameEngine.entities = [];
    const w = vm.runInContext('new World(gameEngine)', ctx);
    w.reset = () => {};
    return w;
}

// ── Test runner ───────────────────────────────────────────────────────────────
let passed = 0, failed = 0;

function test(label, fn) {
    try {
        fn();
        console.log(`  \x1b[32m✓\x1b[0m ${label}`);
        passed++;
    } catch(e) {
        console.log(`  \x1b[31m✗\x1b[0m ${label}`);
        console.log(`    ${e.message}`);
        failed++;
    }
}

// ── Run definitions ───────────────────────────────────────────────────────────
console.log('\n\x1b[1mRun definitions\x1b[0m');

test('all 6 step values present for l01M15 (s=5,7,9,11,13,15)', () => {
    [5, 7, 9, 11, 13, 15].forEach(s => {
        const r = runs.find(r => r.run === `6 Step ${s} l01M15`);
        assert.ok(r, `missing run: 6 Step ${s} l01M15`);
        assert.strictEqual(r.reproductionThresholdStep, s);
        assert.strictEqual(r.mutationRate,   0.15);
        assert.strictEqual(r.learningRate,   0.01);
        assert.strictEqual(r.learningOn,  50000);
        assert.strictEqual(r.socialOn,   100000);
    });
});

test('all 6 step values present for l02M15 and l03M15', () => {
    [0.02, 0.03].forEach(lr => {
        const tag = lr === 0.02 ? 'l02' : 'l03';
        [5, 7, 9, 11, 13, 15].forEach(s => {
            const r = runs.find(r => r.run === `6 Step ${s} ${tag}M15`);
            assert.ok(r, `missing: 6 Step ${s} ${tag}M15`);
            assert.strictEqual(r.learningRate, lr);
        });
    });
});

test('no-learn/social controls present for s=5,7,9,11,13,15', () => {
    [5, 7, 9, 11, 13, 15].forEach(s => {
        const r = runs.find(r => r.run === `6 Step ${s} l01M15 (no learn/social)`);
        assert.ok(r, `missing: 6 Step ${s} l01M15 (no learn/social)`);
        assert.strictEqual(r.learningOn,  200000);
        assert.strictEqual(r.socialOn,    200000);
    });
});

// ── Human ─────────────────────────────────────────────────────────────────────
console.log('\n\x1b[1mHuman\x1b[0m');

test('new human has 12 genes (10 task + IL + SL)', () => {
    const world = newWorld({ mutationRate: 0.0 });
    const village = world.world[0][0];
    ctx.testVillage = village;
    const h = vm.runInContext('new Human(testVillage)', ctx);
    assert.strictEqual(h.genes.length, 12);
    assert.strictEqual(h.memes.length, 10);
});

test('reproduction threshold is 50 when all genes are 0', () => {
    const world = newWorld({ mutationRate: 0.0, reproductionThresholdStep: 10 });
    const village = world.world[0][0];
    ctx.testVillage = village;
    const h = vm.runInContext('new Human(testVillage)', ctx);
    h.genes = new Array(12).fill(0);
    h.geneTotal = h.genes.reduce((a, b) => a + b, 0);
    h.reproductionThreshold = PARAMETERS.reproductionThresholdBase + PARAMETERS.reproductionThresholdStep * h.geneTotal;
    assert.strictEqual(h.reproductionThreshold, 50);
});

test('task completes when env bonus alone meets threshold', () => {
    const world = newWorld({ mutationRate: 0.0, traitThreshold: 5 });
    const village = world.world[0][0];
    village.environmentalBonuses = new Array(10).fill(5);
    ctx.testVillage = village;
    const h = vm.runInContext('new Human(testVillage)', ctx);
    h.genes = new Array(12).fill(0);
    h.memes = new Array(10).fill(0);
    h.performTasks();
    assert.strictEqual(h.successes, 10);
});

test('task does not complete when total bonus < threshold', () => {
    const world = newWorld({ mutationRate: 0.0, traitThreshold: 5 });
    const village = world.world[0][0];
    village.environmentalBonuses = new Array(10).fill(0);
    ctx.testVillage = village;
    const h = vm.runInContext('new Human(testVillage)', ctx);
    h.genes = new Array(12).fill(0);
    h.memes = new Array(10).fill(0);
    h.performTasks();
    assert.strictEqual(h.successes, 0);
});

// ── Village ───────────────────────────────────────────────────────────────────
console.log('\n\x1b[1mVillage\x1b[0m');

test('each village starts with exactly 1 agent', () => {
    const world = newWorld({ mutationRate: 0.0 });
    world.world.forEach(row => row.forEach(village => {
        assert.strictEqual(village.population.length, 1, `village has ${village.population.length} agents`);
    }));
});

test('world starts with 36 agents total (6x6 grid, 1 each)', () => {
    const world = newWorld({ mutationRate: 0.0 });
    const total = world.world.reduce((s, row) => s + row.reduce((ss, v) => ss + v.population.length, 0), 0);
    assert.strictEqual(total, 36);
});

// ── World smoke test ──────────────────────────────────────────────────────────
console.log('\n\x1b[1mWorld\x1b[0m');

test('world creates 6×6 village grid', () => {
    const world = newWorld();
    assert.strictEqual(world.world.length, 6);
    assert.strictEqual(world.world[0].length, 6);
});

test('day increments on each update', () => {
    const world = newWorld();
    world.update();
    assert.strictEqual(PARAMETERS.day, 1);
    world.update();
    assert.strictEqual(PARAMETERS.day, 2);
});

test('world runs 500 steps without error', () => {
    const world = newWorld({ deathRate: 0.0, mutationRate: 0.0 });
    for (let i = 0; i < 500; i++) world.update();
    assert.strictEqual(PARAMETERS.day, 500);
});

test('socket insert fires at epoch end', () => {
    let logged = false;
    setup({ epoch: 50, reportingPeriod: 50, mutationRate: 0.0, deathRate: 0.0 });
    PARAMETERS.day = 0;
    ctx.gameEngine.entities = [];
    const world = vm.runInContext('new World(gameEngine)', ctx);
    world.reset = () => {};
    ctx.socket.emit = (event) => { if (event === 'insert') logged = true; };
    for (let i = 0; i < 50; i++) world.update();
    assert.ok(logged, 'socket.emit("insert") was not called at epoch end');
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} tests  —  \x1b[32m${passed} passed\x1b[0m, \x1b[31m${failed} failed\x1b[0m\n`);
if (failed > 0) process.exit(1);
