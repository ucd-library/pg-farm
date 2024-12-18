#! /bin/bash

set -e
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $ROOT_DIR

rm -rf dist
mkdir dist

# cp -r dev/images dist/
# cp -r dev/fonts dist/

cp dev/index.html dist/
cp dev/jwt.html dist/
cp dev/loader.html.mjs dist/
cp dev/manifest.json dist/

webpack --config webpack-dist.config.cjs
