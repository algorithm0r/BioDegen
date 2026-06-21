let MongoClient;
try { ({ MongoClient } = require('mongodb')); }
catch { ({ MongoClient } = require('../Server/node_modules/mongodb')); }

const expRuns = [];
for (const lr of ['l01', 'l02', 'l03'])
  for (const s of [5,7,9,11,13,15])
    expRuns.push(`6 Step ${s} ${lr}M15`);

const nolearnRuns = [];
for (const s of [5,7,9,11,13,15])
  nolearnRuns.push(`6 Step ${s} l01M15 (no learn/social)`);

const nosocialRuns = [];
for (const lr of ['l01', 'l02', 'l03'])
  for (const s of [5,7,9,11,13,15])
    nosocialRuns.push(`6 Step ${s} ${lr}M15 (no social)`);

async function main() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const col = client.db('BioDegenDB').collection('timing_test');

  let minE=999, maxE=0, minN=999, maxN=0, minNS=999, maxNS=0;

  console.log('=== Exp reps ===');
  for (const name of expRuns) {
    const n = await col.countDocuments({ run: name });
    if (n < minE) minE = n; if (n > maxE) maxE = n;
    console.log(n.toString().padStart(3) + '  ' + name);
  }

  console.log('\n=== Nolearn reps ===');
  for (const name of nolearnRuns) {
    const n = await col.countDocuments({ run: name });
    if (n < minN) minN = n; if (n > maxN) maxN = n;
    console.log(n.toString().padStart(3) + '  ' + name);
  }

  console.log('\n=== Nosocial reps ===');
  for (const name of nosocialRuns) {
    const n = await col.countDocuments({ run: name });
    if (n < minNS) minNS = n; if (n > maxNS) maxNS = n;
    console.log(n.toString().padStart(3) + '  ' + name);
  }

  console.log(`\nSummary: exp ${minE}–${maxE}  |  nolearn ${minN}–${maxN}  |  nosocial ${minNS}–${maxNS}`);
  await client.close();
}
main().catch(console.error);
