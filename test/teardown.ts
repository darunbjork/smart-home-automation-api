import { disconnect } from "mongoose";

export default async () => {
  await disconnect();
  const replSet = global.__MONGOD__;
  if (replSet) {
    await replSet.stop();
  }
};
