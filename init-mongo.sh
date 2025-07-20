#!/bin/bash
for i in `seq 1 10`; do
  mongosh --host mongodb --eval "printjson(rs.initiate({ _id: 'rs0', members: [ { _id: 0, host: 'mongodb:27017' } ] }))" && break;
  echo "Waiting for mongo to start...";
  sleep 5;
done