#! /bin/bash

set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $DIR

VERSION=$(cat .version)
ORG=ucdlib
PREFIX=$ORG/pg-farm-

docker build \
  -t $PREFIX"base:"$VERSION \
  ./base

docker build \
  --build-arg VERSION=$VERSION \
  -t $PREFIX"snapshot-replicate:"$VERSION \
   ./snapshot-replicate

docker build \
  --build-arg VERSION=$VERSION \
  -t $PREFIX"streaming-replicate:"$VERSION \
  ./streaming-replicate 

docker build \
  -t $PREFIX"controller:"$VERSION \
   ./controller