// /docker-entrypoint-initdb.d/init.js

// This script initializes a single-node replica set
// It only runs when MongoDB starts with an empty data directory

const rsConfig = {
  _id: 'rs0',
  members: [
    { _id: 0, host: 'mongodb:27017' }, // use the service name from docker-compose
  ],
};

try {
  const status = rs.status();
  if (status.ok === 1) {
    print('Replica set already initialized.');
  }
} catch (e) {
  print('No replica set initialized yet. Initiating...');
  rs.initiate(rsConfig);

  // Wait until PRIMARY
  let retries = 10;
  while (retries > 0) {
    const state = rs.status().members[0].stateStr;
    if (state === 'PRIMARY') {
      print('Replica set is PRIMARY now.');
      break;
    }
    print('Waiting for replica set to become PRIMARY...');
    sleep(1000);
    retries--;
  }
}
