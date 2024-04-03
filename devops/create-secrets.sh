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

gcloud secrets versions access latest --secret=app-service-account > $SECRET_DIR/service-account.json
gcloud secrets versions access latest --secret=app-env > $SECRET_DIR/env
gcloud secrets versions access latest --secret=ssl-pgfarm-cert > $SECRET_DIR/ssl-pgfarm.crt
gcloud secrets versions access latest --secret=ssl-pgfarm-key > $SECRET_DIR/ssl-pgfarm.key

kubectl delete secret app-env || true
kubectl create secret generic app-env \
  --from-env-file=$SECRET_DIR/env

kubectl delete secret service-account || true
kubectl create secret generic service-account \
 --from-file=service-account.json=$SECRET_DIR/service-account.json || true

kubectl delete secret pgfarm-ssl || true
kubectl create secret generic pgfarm-ssl \
 --from-file=ssl-pgfarm.crt=$SECRET_DIR/ssl-pgfarm.crt \
 --from-file=ssl-pgfarm.key=$SECRET_DIR/ssl-pgfarm.key || true