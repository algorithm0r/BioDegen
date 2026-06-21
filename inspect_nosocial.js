'use strict';
const { MongoClient } = require('../Server/node_modules/mongodb');
(async () => {
  const c = new MongoClient('mongodb://127.0.0.1:27017');
  await c.connect();
  const doc = await c.db('BioDegenDB').collection('timing_test')
    .findOne({ run: /no social/, geneTickets: { $exists: true } });
  if (!doc) { console.log('no doc found'); await c.close(); return; }
  const gt = doc.geneTickets;
  console.log('run:', doc.run);
  console.log('geneTickets length:', Array.isArray(gt) ? gt.length : (gt && typeof gt));
  if (Array.isArray(gt)) {
    console.log('type of first element:', typeof gt[0]);
    const vals = [gt[0], gt[50], gt[100], gt[124], gt[249], gt[374], gt[499]];
    console.log('sample [0,50,100,124,249,374,499]:', vals.map(v => v === undefined ? 'undef' : Number(v).toFixed(4)).join(', '));
    const delta = (gt[499] || 0) - (gt[124] || 0);
    console.log('delta (200k - 50k):', delta.toFixed(4));
  } else if (gt && typeof gt === 'object') {
    console.log('keys sample:', Object.keys(gt).slice(0,5));
    // might be array-like
    const arr = Object.values(gt);
    console.log('values length:', arr.length);
    console.log('sample values:', arr.slice(0,5));
  }
  await c.close();
})();
