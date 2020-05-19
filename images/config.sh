#! /bin/bash

# Postgres-postgis version combinations
PG_VERSIONS=("9.6-2.3" "10-2.5" "11-2.5" "12-2.5")

PG_FARM_VERSION=$(git describe --tags --abbrev=0)
ORG=ucdlib
PREFIX=$ORG/pg-farm-