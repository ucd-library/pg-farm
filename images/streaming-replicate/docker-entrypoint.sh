#!/bin/bash

if [ ! -s "$PGDATA/PG_VERSION" ]; then

  echo "checking master is up"
  until ping -c 1 -W 1 ${PG_MASTER_HOST:?missing environment variable. PG_MASTER_HOST must be set}
      do
          echo "Waiting for master to ping..."
          sleep 1s
  done

  mkdir -p /home/${PG_REP_USER}
  echo "${PG_MASTER_HOST}:${PG_MASTER_PORT}:replication:${PG_REP_USER}:${PG_REP_PASSWORD}" > /root/.pgpass
  chmod 0600 /root/.pgpass

  echo "attempting fresh backup for initial start"
  until pg_basebackup -h ${PG_MASTER_HOST} -D ${PGDATA} -U ${PG_REP_USER} -X stream -c fast -p ${PG_MASTER_PORT} -R
      do
          echo "Waiting for master to connect..."
          sleep 1s
  done

  # HACK: Not sure why the database isn't using the /root/.pgpass file once started (pg_basebackup above does work)
  # so I'm updating the recovery file to use the password directly
  rm /var/lib/postgresql/data/recovery.conf
  echo "standby_mode = 'on'
primary_conninfo = 'user=${PG_REP_USER} password=${PG_REP_PASSWORD} host=${PG_MASTER_HOST} port=${PG_MASTER_PORT} sslmode=prefer sslcompression=0 krbsrvname=postgres target_session_attrs=any'" \
  >> /var/lib/postgresql/data/recovery.conf

fi

/docker-entrypoint-org.sh postgres