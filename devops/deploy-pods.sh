#! /bin/bash

set -e
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $ROOT_DIR

YAML_DIR=$ROOT_DIR/k8s

./generate-deployment-files.sh

kubectl apply -f $YAML_DIR/admin-db-statefulset.yaml
kubectl apply -f $YAML_DIR/admin-db-service.yaml

kubectl apply -f $YAML_DIR/health-probe-deployment.yaml
kubectl apply -f $YAML_DIR/health-probe-service.yaml

kubectl apply -f $YAML_DIR/admin-deployment.yaml
kubectl apply -f $YAML_DIR/admin-service.yaml

kubectl apply -f $YAML_DIR/gateway-deployment.yaml
kubectl apply -f $YAML_DIR/gateway-service.yaml

kubectl rollout restart deployment admin
kubectl rollout restart deployment health-probe
kubectl rollout restart deployment gateway

kubectl autoscale deployment gateway \
  --max 10 --min 2 \
  --cpu-percent 30 || true
