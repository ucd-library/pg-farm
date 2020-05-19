#! /bin/bash

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $ROOT_DIR/..

echo "Submitting build to Google Cloud..."
gcloud builds submit \
  --config ./images/cloudbuild.yaml \
  --substitutions=REPO_NAME=pg-farm,TAG_NAME=$(git describe --tags --abbrev=0),BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD),SHORT_SHA=$(git log -1 --pretty=%h) \
  .