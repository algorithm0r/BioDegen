/**
 * Headless simulation runner for BioDegen.
 * Runs simulations in parallel Node.js worker threads using dynamic dispatch —
 * each worker pulls one run at a time from a shared queue, so no worker idles
 * while work remains.
 *
 * Usage:
 *   node runner.js                          # all active runs, 4 workers, 1 rep
 *   node runner.js --workers 8              # 8 parallel workers
 *   node runner.js --reps 70               # 70 replications of each run
 *   node runner.js --run "6 Step 7 l01M15" # single named run
 *   node runner.js --skip-existing          # skip runs already in MongoDB
 *   node runner.js --collection my_batch    # override target collection
 */

'use strict';

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

let MongoClient = null;
try {
    ({ MongoClient } = require('mongodb'));
} catch {
    try {
        ({ MongoClient } = require('../Server/node_modules/mongodb'));
    } catch {
        // mongodb driver not installed — only needed for direct (non --server) mode.
    }
}

const DEFAULT_MONGO_URL = 'mongodb://127.0.0.1:27017';
const DIR = __dirname;
const HEARTBEAT_MS = 2000; // how often each worker reports progress to the main thread

// BASE defaults applied before each run's own overrides.
const BASE = {
    worldDimension:             6,
    maxEnvironmentalBonus:      5,
    randomEnvironmentalBonuses: false,
    graphWidth: 600, graphHeight: 100,
    populationSoftCap:          30,
    numTraits:                  10,
    traitThreshold:             5,
    reproductionThresholdBase:  50,
    migrationRate:              0.2,
    mutationRate:               0.15,
    learningRate:               0.01,
    deathRate:                  0.005,
    socialLearningRate:         0.1,
    migratePeriod:              10,
    reportingPeriod:            400,
    epoch:                      200000,
    learningOn:                 50000,
    socialOn:                   100000,
    day:                        0,
    db:                         'BioDegenDB',
    collection:                 'timing_test',
};

// ── Simulation context (each worker gets its own isolated copy) ───────────────
function createSimContext() {
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
        let code = fs.readFileSync(path.join(DIR, filename), 'utf8');
        code = code.replace(/^const\s+/gm,      'var ');
        code = code.replace(/^let\s+/gm,         'var ');
        code = code.replace(/^class\s+(\w+)/gm,  'var $1 = class $1');
        vm.runInContext(code, ctx);
    }

    load('util.js');
    load('dataManager.js');
    load('human.js');
    load('village.js');
    load('world.js');

    ctx.loadParameters = () => {};

    return ctx;
}

// ── Worker ────────────────────────────────────────────────────────────────────
if (!isMainThread) {
    (async () => {
        const { collection, mongoUrl, serverUrl } = workerData;
        const ctx = createSimContext();
        const PARAMETERS = ctx.PARAMETERS;

        let client = null;
        let socket = null;

        if (serverUrl) {
            let ioClient;
            try {
                ({ io: ioClient } = require('socket.io-client'));
            } catch {
                ({ io: ioClient } = require('../Server/node_modules/socket.io-client'));
            }
            socket = ioClient(serverUrl, { rejectUnauthorized: false });
            await new Promise((resolve, reject) => {
                socket.on('connect', resolve);
                socket.on('connect_error', reject);
            });
        } else {
            client = new MongoClient(mongoUrl);
            await client.connect();
        }

        // Run one full simulation to completion, emitting a heartbeat to the
        // main thread every HEARTBEAT_MS so progress is observable live.
        function runWorldLoop() {
            let runComplete = false;
            let lastBeat = Date.now();
            const world = vm.runInContext('new World(gameEngine)', ctx);
            world.reset = () => { runComplete = true; };
            while (!runComplete) {
                world.update();
                const now = Date.now();
                if (now - lastBeat >= HEARTBEAT_MS) {
                    lastBeat = now;
                    parentPort.postMessage({
                        type:  'heartbeat',
                        run:   PARAMETERS.run,
                        day:   PARAMETERS.day,
                        epoch: PARAMETERS.epoch,
                    });
                }
            }
        }

        async function processRun(run) {
            const t0 = Date.now();

            Object.assign(PARAMETERS, BASE, run);
            if (collection) PARAMETERS.collection = collection;
            PARAMETERS.day = 0;
            ctx.gameEngine.entities = [];

            if (socket) {
                ctx.socket.emit = (event, packet) => socket.emit(event, packet);
                runWorldLoop();
                return Date.now() - t0;
            }

            let capturedData = null;
            ctx.socket.emit = (event, packet) => {
                if (event === 'insert') capturedData = JSON.parse(JSON.stringify(packet));
            };
            runWorldLoop();
            if (capturedData) {
                const col = client.db(capturedData.db).collection(capturedData.collection);
                await col.insertOne(capturedData.data);
            }
            return Date.now() - t0;
        }

        // Signal ready to receive first run.
        parentPort.postMessage({ type: 'ready' });

        parentPort.on('message', async msg => {
            if (msg.type === 'run') {
                const ms = await processRun(msg.run);
                parentPort.postMessage({ type: 'done', run: msg.run.run, ms });
            } else if (msg.type === 'exit') {
                if (client) await client.close();
                if (socket) socket.disconnect();
                process.exit(0);
            }
        });
    })();
}

// ── Main ──────────────────────────────────────────────────────────────────────
if (isMainThread) {
    function parseArgs() {
        const args = process.argv.slice(2);
        const get  = flag => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
        return {
            workers:      parseInt(get('--workers')    ?? '4'),
            reps:         parseInt(get('--reps')       ?? '1'),
            runName:      get('--run'),
            collection:   get('--collection'),
            mongoUrl:     get('--mongo') || DEFAULT_MONGO_URL,
            serverUrl:    get('--server'),
            skipExisting: args.includes('--skip-existing'),
        };
    }

    async function main() {
        const { workers: numWorkers, reps, runName, collection, mongoUrl, serverUrl, skipExisting } = parseArgs();

        const ctx  = createSimContext();
        const runs = ctx.runs;

        let baseRuns;
        if (runName) baseRuns = runs.filter(r => r.run === runName);
        else         baseRuns = runs;

        if (!baseRuns.length) { console.error('No matching runs found.'); process.exit(1); }

        let queue = [];
        for (let r = 0; r < reps; r++) queue = queue.concat(baseRuns);

        if (skipExisting && serverUrl) {
            console.warn('Warning: --skip-existing requires direct MongoDB access and is ignored with --server.');
        }

        if (skipExisting && !serverUrl) {
            const targetCol = collection || BASE.collection;
            const client = new MongoClient(mongoUrl);
            await client.connect();
            const counts = await client.db(BASE.db).collection(targetCol)
                .aggregate([
                    { $match: { run: { $in: baseRuns.map(r => r.run) } } },
                    { $group: { _id: '$run', n: { $sum: 1 } } }
                ]).toArray();
            const existing = new Set();
            counts.forEach(({ _id, n }) => {
                for (let i = 0; i < n; i++) existing.add(`${_id}::${i}`);
            });
            const seen = {};
            let skipped = 0;
            queue = queue.filter(r => {
                const key = r.run;
                seen[key] = seen[key] || 0;
                const skip = existing.has(`${key}::${seen[key]}`);
                seen[key]++;
                if (skip) skipped++;
                return !skip;
            });
            await client.close();
            console.log(`Skipping ${skipped} existing | ${queue.length} remaining`);
            if (!queue.length) { console.log('Nothing to do.'); return; }
        }

        const n = Math.min(numWorkers, queue.length);
        const repStr = reps > 1 ? ` × ${reps} reps` : '';
        console.log(`\n${baseRuns.length} runs${repStr} = ${queue.length} total | ${n} workers (dynamic dispatch)\n`);

        let done = 0;
        const total     = queue.length;
        const startTime = Date.now();

        // ── Live status instrumentation ──────────────────────────────────────
        // Each worker's latest heartbeat is mirrored into status.json so a
        // separate `node status.js` can report batch progress at any time, and
        // every completed run is appended to completed.log.
        const STATUS_FILE   = path.join(DIR, 'status.json');
        const COMPLETED_LOG = path.join(DIR, 'completed.log');
        const workerStates  = new Array(n).fill(null);
        let lastStatusWrite = 0;

        function buildStatus() {
            const elapsed = (Date.now() - startTime) / 1000;
            const perRun  = done ? (Date.now() - startTime) / done : 0;
            const eta     = perRun ? (perRun * (total - done)) / 1000 : 0;
            return {
                pid:         process.pid,
                startedAt:   new Date(startTime).toISOString(),
                updatedAt:   new Date().toISOString(),
                total, done,
                elapsedSec:  Math.round(elapsed),
                etaSec:      Math.round(eta),
                avgMsPerRun: Math.round(perRun),
                workers: workerStates.map((w, id) => w && {
                    id,
                    run:   w.run,
                    day:   w.day,
                    epoch: w.epoch,
                    pct:   w.epoch ? +(100 * w.day / w.epoch).toFixed(1) : 0,
                }),
            };
        }

        function writeStatus(force = false) {
            const now = Date.now();
            if (!force && now - lastStatusWrite < 1000) return; // throttle to ~1/s
            lastStatusWrite = now;
            try { fs.writeFileSync(STATUS_FILE, JSON.stringify(buildStatus(), null, 2)); } catch {}
        }

        await Promise.all(Array.from({ length: n }, (_, idx) => new Promise((resolve, reject) => {
            const worker = new Worker(__filename, { workerData: { collection, mongoUrl, serverUrl } });

            function sendNext() {
                const run = queue.shift();
                if (run) worker.postMessage({ type: 'run', run });
                else     worker.postMessage({ type: 'exit' });
            }

            worker.on('message', msg => {
                if (msg.type === 'ready') {
                    sendNext();
                } else if (msg.type === 'heartbeat') {
                    workerStates[idx] = { run: msg.run, day: msg.day, epoch: msg.epoch };
                    writeStatus();
                } else if (msg.type === 'done') {
                    done++;
                    workerStates[idx] = null;
                    try {
                        fs.appendFileSync(COMPLETED_LOG,
                            `${new Date().toISOString()}\t${msg.run}\t${msg.ms}ms\n`);
                    } catch {}
                    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                    const perRun  = (Date.now() - startTime) / done;
                    const eta     = ((perRun * (total - done)) / 1000).toFixed(0);
                    process.stdout.write(
                        `\r[${String(done).padStart(4)}/${total}] ${msg.run.padEnd(44)} ${String(msg.ms).padStart(6)}ms | ${elapsed}s | ~${eta}s left  `
                    );
                    writeStatus(true);
                    sendNext();
                }
            });

            worker.on('error', reject);
            worker.on('exit', resolve);
        })));

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        const avg = ((Date.now() - startTime) / done) | 0;
        writeStatus(true);
        console.log(`\n\nDone — ${done} runs in ${totalTime}s  (avg ${avg}ms/run)\n`);
    }

    main().catch(err => { console.error(err); process.exit(1); });
}
