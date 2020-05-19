#! /bin/bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $DIR

source ./config.sh

echo "Building PG-FARM ${PG_FARM_VERSION} images..."



if [[ -z "${GCLOUD_BUILD}" ]]; then
  # Use buildkit to speedup builds
  export DOCKER_BUILDKIT=1 
fi

IFS='-'
for version in "${PG_VERSIONS[@]}" ; do
  read -ra va <<< "$version"
  PG_VERSION=${va[0]}
  POSTGIS_VERSION=${va[1]}

  echo "building ${PREFIX}base:$PG_FARM_VERSION-$PG_VERSION"
  if [[ -z "${GCLOUD_BUILD}" ]]; then
    docker pull "${PREFIX}base:$PG_FARM_VERSION-$PG_VERSION" || true
  fi
  docker build \
    -t "${PREFIX}base:$PG_FARM_VERSION-$PG_VERSION" \
    --build-arg PGF_PG_VERSION=${PG_VERSION} \
    --build-arg PGF_POSTGIS_VERSION=${POSTGIS_VERSION} \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    ./base

  echo "building ${PREFIX}snapshot-replicate:$PG_FARM_VERSION-$PG_VERSION"
  if [[ -z "${GCLOUD_BUILD}" ]]; then
    docker pull "${PREFIX}snapshot-replicate:$PG_FARM_VERSION-$PG_VERSION" || true
  fi
  docker build \
    --build-arg PG_FARM_VERSION=$PG_FARM_VERSION \
    --build-arg PGF_PG_VERSION=$PG_VERSION \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    -t "${PREFIX}snapshot-replicate:$PG_FARM_VERSION-$PG_VERSION" \
    ./snapshot-replicate

  echo "building ${PREFIX}streaming-replicate:$PG_FARM_VERSION-$PG_VERSION"
  if [[ -z "${GCLOUD_BUILD}" ]]; then
    docker pull "${PREFIX}streaming-replicate:$PG_FARM_VERSION-$PG_VERSION" || true
  fi
  docker build \
    --build-arg PG_FARM_VERSION=$PG_FARM_VERSION \
    --build-arg PGF_PG_VERSION=$PG_VERSION \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    -t "${PREFIX}streaming-replicate:$PG_FARM_VERSION-$PG_VERSION" \
    ./streaming-replicate 

  echo "building ${PREFIX}controller:$PG_FARM_VERSION-$PG_VERSION" 
  if [[ -z "${GCLOUD_BUILD}" ]]; then
    docker pull "${PREFIX}controller-replicate:$PG_FARM_VERSION-$PG_VERSION" || true
  fi
  docker build \
    --build-arg PGF_PG_VERSION=$PG_VERSION \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    -t "${PREFIX}controller:$PG_FARM_VERSION-$PG_VERSION" \
    ./controller
done