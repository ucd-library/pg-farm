#! /bin/bash
# https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/cloud-storage-fuse-csi-driver

set -e

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $ROOT_DIR

source ./config.sh

gcloud config set project ${GC_PROJECT_ID}

echo "This script expects the following bucket and google cloud service acount to exist:"
echo "Bucket: ${GCS_BACKUP_BUCKET}"
echo "Service Account: ${GC_SA_NAME}"

gcloud container clusters get-credentials ${GKE_CLUSTER_NAME} \
  --zone ${GKE_CLUSTER_ZONE}

kubectl create serviceaccount ${GKE_KSA_NAME} \
    --namespace default

# gcloud iam service-accounts create $GC_SA_NAME \
#     --project=${GC_PROJECT_ID}

gcloud storage buckets add-iam-policy-binding gs://${GCS_BACKUP_BUCKET} \
    --member "serviceAccount:$GC_SA_NAME@$GC_PROJECT_ID.iam.gserviceaccount.com" \
    --role "roles/storage.objectAdmin"

gcloud iam service-accounts add-iam-policy-binding $GC_SA_NAME@$GC_PROJECT_ID.iam.gserviceaccount.com \
    --role roles/iam.workloadIdentityUser \
    --member "serviceAccount:$GC_PROJECT_ID.svc.id.goog[default/$GKE_KSA_NAME]"

kubectl annotate serviceaccount ${GKE_KSA_NAME} \
    --namespace default \
    iam.gke.io/gcp-service-account=$GC_SA_NAME@$GC_PROJECT_ID.iam.gserviceaccount.com