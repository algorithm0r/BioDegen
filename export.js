/**
 * MongoDB → CSV exporter for BioDegen.
 * Writes the per-run long-format CSV consumed by stats_analysis.py and
 * paper_figures.py.
 *
 * Usage:
 *   node export.js                             # timing_test collection
 *   node export.js --collection timing_test    # explicit collection
 *   node export.js --out path/to/out.csv       # custom output path
 */

'use strict';

const fs   = require('fs');
const path = require('path');

let MongoClient;
try {
    ({ MongoClient } = require('mongodb'));
} catch {
    ({ MongoClient } = require('../Server/node_modules/mongodb'));
}

const MONGO_URL = 'mongodb://127.0.0.1:27017';
const DB_NAME   = 'BioDegenDB';

// Active run names — matches util.js (s=0 removed).
const bioRunAll = [
    // no-learn/social controls
    "6 Step 5 l01M15 (no learn/social)",
    "6 Step 7 l01M15 (no learn/social)",
    "6 Step 9 l01M15 (no learn/social)",
    "6 Step 11 l01M15 (no learn/social)",
    "6 Step 13 l01M15 (no learn/social)",
    "6 Step 15 l01M15 (no learn/social)",

    // experimental: learning rate 0.01
    "6 Step 5 l01M15",  "6 Step 7 l01M15",  "6 Step 9 l01M15",
    "6 Step 11 l01M15", "6 Step 13 l01M15", "6 Step 15 l01M15",

    // experimental: learning rate 0.02
    "6 Step 5 l02M15",  "6 Step 7 l02M15",  "6 Step 9 l02M15",
    "6 Step 11 l02M15", "6 Step 13 l02M15", "6 Step 15 l02M15",

    // experimental: learning rate 0.03
    "6 Step 5 l03M15",  "6 Step 7 l03M15",  "6 Step 9 l03M15",
    "6 Step 11 l03M15", "6 Step 13 l03M15", "6 Step 15 l03M15",
];

const METRICS = [
    ["geneHistogram",     "gene"],
    ["learningHistogram", "learning"],
    ["socialHistogram",   "social"],
    ["memeHistogram",     "meme"],
];

// Collapse a 20-bucket integer histogram into n / mean / median.
function bucketStats(buckets) {
    let n = 0, weighted = 0;
    for (let b = 0; b < buckets.length; b++) {
        const c = buckets[b] || 0;
        n += c; weighted += b * c;
    }
    if (n === 0) return null;
    const mean = weighted / n;
    let cum = 0, median = 0;
    const half = n / 2;
    for (let b = 0; b < buckets.length; b++) {
        cum += buckets[b] || 0;
        if (cum >= half) { median = b; break; }
    }
    return { n, mean: mean.toFixed(6), median };
}

function csv(s) {
    return /[",\n]/.test(String(s)) ? `"${String(s).replace(/"/g, '""')}"` : String(s);
}

function runRows(runName, runIndex, doc) {
    const rows = [];
    const period = (doc.params && doc.params.reportingPeriod) || 400;

    for (const [field, metric] of METRICS) {
        const series = doc[field];
        if (!Array.isArray(series)) continue;
        for (let t = 0; t < series.length; t++) {
            if (!series[t]) continue;
            const s = bucketStats(series[t]);
            if (!s) continue;
            rows.push(`${csv(runName)},${runIndex},${t * period},${metric},${s.n},${s.mean},${s.median}`);
        }
    }

    if (Array.isArray(doc.population)) {
        for (let t = 0; t < doc.population.length; t++) {
            rows.push(`${csv(runName)},${runIndex},${t * period},population,,${doc.population[t]},`);
        }
    }

    return rows;
}

async function main() {
    const args    = process.argv.slice(2);
    const getArg  = flag => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
    const collection = getArg('--collection') || 'timing_test';
    const outFile    = getArg('--out') || path.join(__dirname, 'data', 'biodegen_perrun_all.csv');

    const client = new MongoClient(MONGO_URL);
    await client.connect();
    const col = client.db(DB_NAME).collection(collection);

    const lines = ['run,run_index,timestep,metric,n,mean,median'];
    let totalDocs = 0;

    for (let i = 0; i < bioRunAll.length; i++) {
        const runName = bioRunAll[i];
        const docs = await col.find(
            { run: runName, geneHistogram: { $exists: true } },
            { sort: { _id: 1 } }
        ).toArray();
        console.log(`[${String(i + 1).padStart(2)}/${bioRunAll.length}] ${runName.padEnd(46)} ${docs.length} reps`);
        docs.forEach((doc, idx) => lines.push(...runRows(runName, idx, doc)));
        totalDocs += docs.length;
    }

    await client.close();

    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, lines.join('\n') + '\n');
    console.log(`\nExported ${totalDocs} reps → ${outFile}  (${lines.length - 1} data rows)`);
}

main().catch(err => { console.error(err); process.exit(1); });
