#! /bin/bash

# Grab build number is mounted in CI system
if [[ -f /config/.buildenv ]]; then
  source /config/.buildenv
else
  BUILD_NUM=-1
fi

if [[ -z "$BRANCH_NAME" ]]; then
  PG_FARM_BRANCH=$(git rev-parse --abbrev-ref HEAD)
else
  PG_FARM_BRANCH=$BRANCH_NAME
fi

if [[ -z "$TAG_NAME" ]]; then
  PG_FARM_TAG=$(git tag --points-at HEAD) || true
else
  PG_FARM_TAG=$TAG_NAME
fi

if [[ -z "$SHORT_SHA" ]]; then
  PG_FARM_SHA=$(git log -1 --pretty=%h)
else
  PG_FARM_SHA=$SHORT_SHA
fi

if [[ -z "$PG_FARM_TAG" ]]; then
  APP_TAG=$PG_FARM_BRANCH
else 
  APP_TAG=$PG_FARM_TAG
fi

VERSION=${APP_TAG}.${BUILD_NUM}

if [[ -z $REG_HOST ]]; then
  REG_HOST=us-docker.pkg.dev/pgfarm-419213/containers

  # set local-dev tags used by
  # local development docker-compose file
  if [[ $LOCAL_DEV == 'true' ]]; then
    REG_HOST=localhost/local-dev
  fi
fi
PY_REG=https://us-python.pkg.dev/pgfarm-419213/pip/

APP_URL=${APP_URL:-https://pgfarm.library.ucdavis.edu}

# Postgres Instance
PG_VERSION=16

# Image Names
PG_FARM_SERVICE_IMAGE=$REG_HOST/pgfarm-service
PG_FARM_PG_INSTANCE_IMAGE=$REG_HOST/pgfarm-instance

# Google Cloud
GC_PROJECT_ID=pgfarm-419213
GKE_CLUSTER_NAME=pgfarm
GKE_CLUSTER_ZONE=us-central1-c
GKE_EXTERNAL_IP=34.170.150.232
GC_SA_NAME=pgfarm-app
GKE_KSA_NAME=pgfarm-ksa
GCS_BACKUP_BUCKET=app-database-backups