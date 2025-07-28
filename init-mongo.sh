#!/bin/bash
# init-mongo.sh

# Wait for MongoDB to be ready
until mongosh --host mongodb --eval "print(\"waited for connection\")"; do
  sleep 2
done

# Initiate the replica set
mongosh --host mongodb <<EOF
try {
  if (rs.status().ok) {
    print("Replica set already initiated.");
  }
} catch (e) {
  rs.initiate({
    _id: "rs0",
    members: [{
      _id: 0,
      host: "mongodb:27017"
    }]
  });
}
EOF
