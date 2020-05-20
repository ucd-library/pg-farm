#! /bin/bash

# Postgres-postgis version combinations
PG_VERSIONS=("9.6-2.3" "10-2.5" "11-2.5" "12-2.5")

if [[ -z "${TAG_NAME}" ]]; then
  PG_FARM_VERSION=$(git describe --tags --abbrev=0)
else
  PG_FARM_VERSION=$TAG_NAME
fi

ORG=ucdlib
PREFIX=$ORG/pg-farm-