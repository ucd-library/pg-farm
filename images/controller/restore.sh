#! /bin/bash

set -e

# clean up
cd /pg-stage
rm -rf *

FILES=$(aws s3 ls s3://$AWS_BUCKET/$CLUSTER_NAME/)

if [[ "$FILES" =~ [backup.zip] ]]; then
  mkdir -p /var/lib/postgres/data
  mkdir -p /etc/postgres

  aws s3 cp s3://$AWS_BUCKET/$CLUSTER_NAME/backup.zip backup.zip
  
  unzip -d backup backup.zip
  
  rm -rf /var/lib/postgres/data/*
  
  cp -r backup/data/* /var/lib/postgresql/data/
  cp -r backup/etc/* /etc/postgres/
else
  echo "No backup file found"
fi


rm -rf /pg-stage/*