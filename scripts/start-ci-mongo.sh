#!/usr/bin/env bash
# Start an isolated test replica set; never connects to a hosted database.
set -euo pipefail

mongo_container="${CI_MONGO_CONTAINER:-collabhub-ci-mongo}"
mongo_port="${CI_MONGO_PORT:-27017}"
mongo_image="mongo@sha256:8e7d23aa641b0ec6c86418866d5d18d74d5abf89061bc5db7bc4b80929021ef6"

report_failure() {
  echo '::error::The CI MongoDB replica set did not become ready.'
  docker inspect --format '{{json .State}}' "$mongo_container" || true
  docker logs --tail 100 "$mongo_container" || true
}
trap report_failure ERR

docker run -d --name "$mongo_container" \
  -p "127.0.0.1:${mongo_port}:27017" \
  "$mongo_image" --replSet rs0 --bind_ip_all

# Wait for the final replica-set process, not only a successful TCP connection.
ready=false
for attempt in $(seq 1 60); do
  if docker exec "$mongo_container" mongosh --host 127.0.0.1 --quiet --eval \
    'const hello = db.hello(); if (hello.setName !== "rs0" && hello.isreplicaset !== true) quit(1); if (db.adminCommand({ping: 1}).ok !== 1) quit(1)' \
    >/dev/null 2>&1; then
    ready=true
    break
  fi
  if [[ "$(docker inspect --format '{{.State.Running}}' "$mongo_container")" != true ]]; then
    echo 'MongoDB exited before initialization.'
    false
  fi
  sleep 1
done
[[ "$ready" == true ]]

docker exec "$mongo_container" mongosh --host 127.0.0.1 --quiet --eval \
  'const result = rs.initiate({_id: "rs0", members: [{_id: 0, host: "127.0.0.1:27017"}]}); if (result.ok !== 1) quit(1)'

for attempt in $(seq 1 60); do
  if docker exec "$mongo_container" mongosh --host 127.0.0.1 --quiet --eval \
    'if (db.hello().isWritablePrimary !== true) quit(1)' >/dev/null 2>&1; then
    echo 'CI MongoDB replica set is ready.'
    exit 0
  fi
  sleep 1
done
false
