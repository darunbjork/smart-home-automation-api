#!/usr/bin/env bash
set -euo pipefail

# Wait for mongod to accept connections
until mongosh --host mongodb:27017 --eval 'db.runCommand({ ping: 1 })' >/dev/null 2>&1; do
  sleep 1
done

# Initiate replica set if not initiated yet, and retry until successful
echo "Attempting to initiate replica set..."
until mongosh --host mongodb:27017 --eval 'try { const status = rs.status(); if (status.ok === 1) { quit(); } } catch (e) { /* Ignore errors if replica set is not yet initiated */ } rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "mongodb:27017" }] });' >/dev/null 2>&1; do
  sleep 1
done
echo "Replica set initiation command successful."

# Wait for replica set to have a primary
echo "Waiting for replica set to have a primary..."
until mongosh --host mongodb:27017 --eval 'rs.status().members.some(member => member.stateStr === "PRIMARY")' | grep -q "true"; do
  sleep 1
done
echo "Replica set has a primary."
mongosh --host mongodb:27017 --eval 'rs.status();'

