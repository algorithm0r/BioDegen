'use strict';
// Computes nosocial task gene delta (200k - 50k) per condition.
// geneTickets[124] ≈ 50k days, geneTickets[499] = 200k days.
const { MongoClient } = require('../Server/node_modules/mongodb');
(async () => {
  const c = new MongoClient('mongodb://127.0.0.1:27017');
  await c.connect();
  const docs = await c.db('BioDegenDB').collection('timing_test')
    .find({ run: /no social/, geneTickets: { $exists: true } })
    .toArray();
  await c.close();

  const byCondition = {};
  for (const doc of docs) {
    const run = doc.run;
    if (!byCondition[run]) byCondition[run] = { at50k: [], at200k: [], delta: [] };
    const gt = doc.geneTickets;
    if (!Array.isArray(gt) || gt.length < 500) continue;
    const v50  = gt[124];
    const v200 = gt[499];
    byCondition[run].at50k.push(v50);
    byCondition[run].at200k.push(v200);
    byCondition[run].delta.push(v200 - v50);
  }

  const mean = arr => arr.reduce((a,b)=>a+b,0)/arr.length;
  const se   = arr => { const m = mean(arr); const v = arr.map(x=>(x-m)**2).reduce((a,b)=>a+b,0)/(arr.length-1); return Math.sqrt(v/arr.length); };

  const sorted = Object.keys(byCondition).sort();
  console.log('\nNosocial task-gene delta (200k − 50k)');
  console.log('Condition                              n   at50k      at200k     delta      SE(delta)');
  console.log('─'.repeat(90));
  for (const run of sorted) {
    const d = byCondition[run];
    const n = d.delta.length;
    if (n === 0) { console.log(run.padEnd(38), 'no data'); continue; }
    const m50  = mean(d.at50k).toFixed(4).padStart(9);
    const m200 = mean(d.at200k).toFixed(4).padStart(9);
    const md   = mean(d.delta).toFixed(4).padStart(9);
    const mse  = (n > 1 ? se(d.delta) : 0).toFixed(4).padStart(9);
    console.log(`${run.padEnd(38)} ${String(n).padStart(2)}  ${m50}  ${m200}  ${md}  ${mse}`);
  }
  console.log('\nTotal docs:', docs.length);
})();
