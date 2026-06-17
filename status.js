/**
 * Batch status reporter for the BioDegen runner.
 *
 * The runner mirrors each worker's latest heartbeat into status.json and
 * appends every completed run to completed.log. This script reads those and
 * prints a snapshot of the current batch.
 *
 *   node status.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const STATUS_FILE   = path.join(__dirname, 'status.json');
const COMPLETED_LOG = path.join(__dirname, 'completed.log');

function fmtDuration(sec) {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return (h ? `${h}h ` : '') + (h || m ? `${m}m ` : '') + `${s}s`;
}

if (!fs.existsSync(STATUS_FILE)) {
    console.log('No status.json here — is a batch running in this folder?');
    process.exit(0);
}

let st;
try {
    st = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
} catch (e) {
    console.error('Could not parse status.json:', e.message);
    process.exit(1);
}

const ageSec = (Date.now() - new Date(st.updatedAt).getTime()) / 1000;
const stale  = ageSec > 15; // heartbeats are every ~2s; 15s of silence = likely stopped
const pct    = st.total ? (100 * st.done / st.total).toFixed(1) : '0.0';

console.log('');
console.log(`BioDegen batch — ${st.done}/${st.total} runs done (${pct}%)`);
console.log(`Elapsed ${fmtDuration(st.elapsedSec)}  |  ETA ${fmtDuration(st.etaSec)}  |  avg ${(st.avgMsPerRun / 1000).toFixed(1)}s/run`);
console.log(`Updated ${ageSec.toFixed(0)}s ago${stale ? '  ** STALE — batch may have stopped **' : ''}  (pid ${st.pid})`);
console.log('');
console.log('Workers:');
for (const w of st.workers) {
    if (!w) { console.log('  - idle'); continue; }
    const filled = Math.floor(w.pct / 5);
    const bar = '#'.repeat(filled) + '.'.repeat(20 - filled);
    console.log(`  #${w.id}  [${bar}] ${String(w.pct).padStart(5)}%  ${w.run}`);
}
console.log('');

if (fs.existsSync(COMPLETED_LOG)) {
    const lines  = fs.readFileSync(COMPLETED_LOG, 'utf8').trim().split('\n').filter(Boolean);
    const recent = lines.slice(-5);
    console.log(`Recently completed (last ${recent.length} of ${lines.length} total):`);
    for (const l of recent) console.log('  ' + l);
    console.log('');
}
