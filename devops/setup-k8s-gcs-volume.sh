#! /bin/bash

set -e

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $ROOT_DIR

source ./config.sh

gcloud config set project ${GC_PROJECT_ID}
gcloud container clusters get-credentials ${GKE_CLUSTER_NAME} \
  --zone ${GKE_CLUSTER_ZONE}

kubectl apply -f ./k8s-templates/gcs-pv.yaml  
kubectl apply -f ./k8s-templates/gcs-pvc.yaml