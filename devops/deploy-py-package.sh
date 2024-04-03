#! /bin/bash

set -e
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $ROOT_DIR/..
source ./devops/config.sh

cd $ROOT_DIR/../admin-cli/python

# python3 setup.py sdist

# Setup authentication first
# https://cloud.google.com/artifact-registry/docs/python/authentication
python3 -m twine upload \
   --verbose \
  --repository-url $PY_REG \
  dist/*