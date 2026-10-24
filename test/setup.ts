import dotenv from "dotenv-flow";
dotenv.config();

import { MongoMemoryReplSet } from "mongodb-memory-server";
import { connect, connection } from "mongoose";

declare global {
  var __MONGOD__: MongoMemoryReplSet;
}

export default async () => {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
    instanceOpts: [{ storageEngine: "wiredTiger" }],
  });

  const uri = replSet.getUri();
  process.env.MONGO_URI = uri;

  await connect(uri);
  await connection.db!.admin().command({
    setParameter: 1,
    transactionLifetimeLimitSeconds: 1200,
  });

  global.__MONGOD__ = replSet;
};
