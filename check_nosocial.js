'use strict';
const { MongoClient } = require('../Server/node_modules/mongodb');
(async () => {
  const c = new MongoClient('mongodb://127.0.0.1:27017');
  await c.connect();
  const counts = await c.db('BioDegenDB').collection('timing_test')
    .aggregate([
      { $match: { run: { $regex: 'no social' } } },
      { $group: { _id: '$run', n: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();
  counts.forEach(r => console.log(r.n.toString().padStart(3), r._id));
  const total = counts.reduce((a,r)=>a+r.n,0);
  const minN = Math.min(...counts.map(r=>r.n));
  const maxN = Math.max(...counts.map(r=>r.n));
  console.log('Total:', total, '| min n='+minN, '| max n='+maxN);
  // Show recent inserts from last 2h
  const cutoff = new Date(Date.now() - 2*60*60*1000);
  const recent = await c.db('BioDegenDB').collection('timing_test')
    .find({ run: { $regex: 'no social' }, _id: { $gte: require('../Server/node_modules/mongodb').ObjectId.createFromTime(Math.floor(cutoff.getTime()/1000)) } })
    .sort({ _id: -1 }).limit(5).toArray();
  console.log('\nLast 5 inserts:');
  recent.forEach(d => console.log(' ', d._id.getTimestamp().toISOString(), d.run));
  await c.close();
})();
