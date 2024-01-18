#! /bin/bash

set -e
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $ROOT_DIR

SECRET_DIR=$ROOT_DIR/../secrets
if [[ ! -d $SECRET_DIR ]]; then
  mkdir $SECRET_DIR
fi

source ./config.sh
./setup-kubectl.sh

gcloud config set project ${GC_PROJECT_ID}

gcloud secrets versions access latest --secret=pg-farm-service-account > $SECRET_DIR/service-account.json
gcloud secrets versions access latest --secret=pg-farm-env > $SECRET_DIR/env

kubectl delete secrete pg-farm-env || true
kubectl create secret generic pg-farm-env \
  --from-env-file=$SECRET_DIR/env

kubectl delete secret pg-farm-service-account || true
kubectl create secret generic pg-farm-service-account \
 --from-file=service-account.json=$SECRET_DIR/service-account.json || true