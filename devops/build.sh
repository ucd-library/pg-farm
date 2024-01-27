#! /bin/bash

set -e
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $ROOT_DIR/..
source ./devops/config.sh

if [[ $PG_FARM_BRANCH == "master" && -z "$PG_FARM_TAG" ]]; then
  echo "ERROR: Cannot build master branch without a tag.  This is probably a CI deployment from Google Cloud Trigger"
  exit -1;
fi

BUILD_DATETIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

DOCKER="docker"
DOCKER_BUILD="$DOCKER buildx build --output=type=docker --cache-to=type=inline,mode=max "
if [[ $LOCAL_DEV != 'true' ]]; then
  DOCKER_BUILD="$DOCKER_BUILD --pull"
fi

function get_tags() {
  IMAGE_TAG_FLAGS="-t $1:$PG_FARM_BRANCH"
  if [[ ! -z "$PG_FARM_TAG" ]]; then
    IMAGE_TAG_FLAGS="$IMAGE_TAG_FLAGS -t $1:$PG_FARM_TAG"
  fi
}

function push() {
  if [[ $LOCAL_DEV == 'true' ]]; then
    return
  fi

  echo "docker push $1:$PG_FARM_BRANCH"
  docker push $1:$PG_FARM_BRANCH

  if [[ ! -z "$PG_FARM_TAG" ]]; then
    echo "docker push $1:$PG_FARM_TAG"
    docker push $1:$PG_FARM_TAG
  fi
}

echo "PG Farm Repository:"
echo "Branch: $PG_FARM_BRANCH"
if [[ ! -z "$PG_FARM_TAG" ]]; then
  echo "Tag: $PG_FARM_TAG"
  TAG_LABEL=", $PG_FARM_TAG"
fi
echo "SHA: $PG_FARM_SHA"
echo "Version: $VERSION"

echo -e "\nBuilding images:"
echo "  $PG_FARM_SERVICE_IMAGE:$PG_FARM_BRANCH$TAG_LABEL"
echo ""

get_tags $PG_FARM_SERVICE_IMAGE
echo "Building $PG_FARM_SERVICE_IMAGE:$PG_FARM_BRANCH$TAG_LABEL"
$DOCKER_BUILD \
  $(echo $IMAGE_TAG_FLAGS) \
  --build-arg PG_FARM_VERSION=${VERSION} \
  --build-arg PG_FARM_REPO_TAG=${PG_FARM_TAG} \
  --build-arg PG_FARM_REPO_BRANCH=${PG_FARM_BRANCH} \
  --build-arg PG_FARM_REPO_HASH=${PG_FARM_SHA} \
  --build-arg BUILD_DATETIME=${BUILD_DATETIME} \
  --cache-from $PG_FARM_SERVICE_IMAGE:$PG_FARM_BRANCH \
  services
push $PG_FARM_SERVICE_IMAGE


echo "Building $PG_FARM_PG_INSTANCE_IMAGE:$PG_VERSION"
$DOCKER_BUILD \
  --tag $PG_FARM_PG_INSTANCE_IMAGE:$PG_VERSION \
  --build-arg PG_VERSION=${PG_VERSION} \
  --build-arg PG_FARM_VERSION=${VERSION} \
  --build-arg PG_FARM_REPO_TAG=${PG_FARM_TAG} \
  --build-arg PG_FARM_REPO_BRANCH=${PG_FARM_BRANCH} \
  --build-arg PG_FARM_REPO_HASH=${PG_FARM_SHA} \
  --build-arg BUILD_DATETIME=${BUILD_DATETIME} \
  --cache-from $PG_FARM_PG_INSTANCE_IMAGE:$PG_FARM_BRANCH \
  pg-instance
push $PG_FARM_PG_INSTANCE_IMAGE:$PG_VERSION