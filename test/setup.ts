 import dotenv from 'dotenv-flow';
dotenv.config();

 // test/setup.ts
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { connect, connection } from 'mongoose'; // Import mongoose

declare global {
  var __MONGOD__: MongoMemoryReplSet;
}

export default async () => {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
    instanceOpts: [{ storageEngine: 'wiredTiger' }], // NEW: Add instanceOpts
  });

  const uri = replSet.getUri();
  process.env.MONGO_URI = uri;

  // Connect to ensure replica set is ready
  await connect(uri);
  await connection.db!.admin().command({
    setParameter: 1,
    transactionLifetimeLimitSeconds: 1200
  });
  // await disconnect(); // Disconnect after setting parameters - REMOVED
  
  global.__MONGOD__ = replSet;
};
