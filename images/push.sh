#! /bin/bash

set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $DIR

source ./config.sh

IFS='-'
for version in "${PG_VERSIONS[@]}" ; do
  read -ra va <<< "$version"
  PG_VERSION=${va[0]}
  POSTGIS_VERSION=${va[1]}

  docker push "${PREFIX}base:$PG_FARM_VERSION-$PG_VERSION"
  docker push "${PREFIX}snapshot-replicate:$PG_FARM_VERSION-$PG_VERSION"
  docker push "${PREFIX}streaming-replicate:$PG_FARM_VERSION-$PG_VERSION"
  docker push "${PREFIX}controller:$PG_FARM_VERSION-$PG_VERSION"
done