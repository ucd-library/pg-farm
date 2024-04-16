#! /bin/bash

set -e
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $ROOT_DIR

TEMPLATE_ROOT=$ROOT_DIR/k8s-templates
DEPLOYMENT_DIR=$ROOT_DIR/k8s

if ! command -v cork-template &> /dev/null
then
    echo -e "\nThe cork-template command could not be found.\nInstall via \"npm install -g @ucd-lib/cork-template\"\n"
    exit -1
fi

# check if dir exists
if [ -d "$DEPLOYMENT_DIR" ]; then
  rm -rf $DEPLOYMENT_DIR
fi
mkdir $DEPLOYMENT_DIR

cork-template \
  -c ./config.sh \
  -t $TEMPLATE_ROOT/health-probe-service.yaml \
  -o $DEPLOYMENT_DIR/health-probe-service.yaml

cork-template \
  -c ./config.sh \
  -t $TEMPLATE_ROOT/health-probe-deployment.yaml \
  -o $DEPLOYMENT_DIR/health-probe-deployment.yaml

cork-template \
  -c ./config.sh \
  -t $TEMPLATE_ROOT/admin-db-statefulset.yaml \
  -o $DEPLOYMENT_DIR/admin-db-statefulset.yaml

cork-template \
  -c ./config.sh \
  -t $TEMPLATE_ROOT/admin-db-service.yaml \
  -o $DEPLOYMENT_DIR/admin-db-service.yaml

cork-template \
  -c ./config.sh \
  -t $TEMPLATE_ROOT/admin-deployment.yaml \
  -o $DEPLOYMENT_DIR/admin-deployment.yaml

cork-template \
  -c ./config.sh \
  -t $TEMPLATE_ROOT/admin-service.yaml \
  -o $DEPLOYMENT_DIR/admin-service.yaml

  cork-template \
  -c ./config.sh \
  -t $TEMPLATE_ROOT/admin-deployment.yaml \
  -o $DEPLOYMENT_DIR/admin-deployment.yaml

cork-template \
  -c ./config.sh \
  -t $TEMPLATE_ROOT/gateway-service.yaml \
  -o $DEPLOYMENT_DIR/gateway-service.yaml

cork-template \
  -c ./config.sh \
  -t $TEMPLATE_ROOT/gateway-deployment.yaml \
  -o $DEPLOYMENT_DIR/gateway-deployment.yaml

cork-template \
  -c ./config.sh \
  -t $TEMPLATE_ROOT/gateway-dev-service.yaml \
  -o $DEPLOYMENT_DIR/gateway-dev-service.yaml

cork-template \
  -c ./config.sh \
  -t $TEMPLATE_ROOT/gateway-dev-deployment.yaml \
  -o $DEPLOYMENT_DIR/gateway-dev-deployment.yaml