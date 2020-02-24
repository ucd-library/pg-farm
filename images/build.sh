#! /bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $DIR

VERSION=cat ../package.json | jq -r .version
ORG=ucdlib
PREFIX=$ORG/pg-farm-

for d in *; do
  if [ -d "$d" ]; then
    cd $d
    echo "docker build -t $PREFIX$d:$VERSION ."
    cd ..
  fi 
done