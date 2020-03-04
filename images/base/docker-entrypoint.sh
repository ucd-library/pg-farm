#! /bin/bash

chown postgres:postgres /etc/postgres/server.crt
chown postgres:postgres /etc/postgres/server.key

exec /docker-entrypoint-org.sh "$@"