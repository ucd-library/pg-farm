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
  -t $TEMPLATE_ROOT/proxy-deployment.yaml \
  -o $DEPLOYMENT_DIR/proxy-deployment.yaml

cork-template \
  -c ./config.sh \
  -t $TEMPLATE_ROOT/proxy-service.yaml \
  -o $DEPLOYMENT_DIR/proxy-service.yaml
