#! /bin/bash

set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $DIR

VERSION=$(cat ../package.json | jq -r .version)
ORG=ucdlib
PREFIX=$ORG/pg-farm-

docker push $PREFIX"snapshot-replicate:"$VERSION
docker push $PREFIX"streaming-replicate:"$VERSION
docker push $PREFIX"controller:"$VERSION