/* eslint-disable no-undef */
// test/setup.js
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { connect, connection, disconnect } from 'mongoose'; // Import mongoose

export default async () => {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
    instanceOpts: [{ storageEngine: 'wiredTiger' }], // NEW: Add instanceOpts
  });

  const uri = replSet.getUri();
  process.env.MONGO_URI = uri;

  // Connect to ensure replica set is ready
  await connect(uri);
  await connection.db.admin().command({
    setParameter: 1,
    transactionLifetimeLimitSeconds: 60
  });
  await disconnect(); // Disconnect after setting parameters
  
  global.__MONGOD__ = replSet;
};
