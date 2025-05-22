#! /bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $DIR

set -e

./create-docker-build-image.sh

cd ..
rm -rf dist

npm run dist-linux
npm run dist-mac-intel
npm run dist-mac-arm
docker run -ti --rm -v $(pwd)/dist:/build/dist electron-ui-builder:latest bash -c "npm run dist-windows"