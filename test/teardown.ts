 // test/teardown.js
import { disconnect } from 'mongoose'; // Import mongoose

export default async () => {
  await disconnect(); // Ensure mongoose connection is closed
  const replSet = global.__MONGOD__;
  if (replSet) {
    await replSet.stop();
  }
};
