#! /bin/bash

set -e

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $ROOT_DIR

source ./config.sh

gcloud config set project ${GC_PROJECT_ID}

# Create cluster with default pool
gcloud beta container clusters create ${GKE_CLUSTER_NAME} \
  --zone ${GKE_CLUSTER_ZONE} \
  --addons GcsFuseCsiDriver \
  --num-nodes 3 \
  --disk-size 50GB \
  --release-channel=regular \
  --machine-type e2-standard-2 \
  --workload-pool=${GC_PROJECT_ID}.svc.id.goog \
  --node-labels=intendedfor=services

gcloud beta container node-pools create instance-pool \
  --cluster ${GKE_CLUSTER_NAME} \
  --zone ${GKE_CLUSTER_ZONE} \
  --machine-type e2-standard-4 \
  --num-nodes 1 \
  --disk-size 50GB \
  --workload-metadata=GKE_METADATA \
  --node-labels=intendedfor=instance-pool \
  --enable-autoscaling --min-nodes 1 --max-nodes 8

./create-secrets.sh

./setup-k8s-service-accounts.sh

./setup-k8s-gcs-volume.sh