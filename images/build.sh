#! /bin/bash

VERSION=0.0.1
ORG=ucdlib
PREFIX=$ORG/pg-farm-

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $DIR

for d in *; do
  if [ -d "$d" ]; then
    cd $d
    echo "docker build -t $PREFIX$d:$VERSION ."
    cd ..
  fi 
done