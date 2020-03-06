#! /bin/bash

set -e

# clean up
cd /pg-stage
rm -rf *

cd /var/lib/postgresql
zip -r /pg-stage/backup.zip data
cp -r /etc/postgres /pg-stage/etc
cd /pg-stage
zip -r /pg-stage/backup.zip etc

aws s3 cp /pg-stage/backup.zip s3://$AWS_BUCKET/$CLUSTER_NAME/backup.zip

rm -rf /pg-stage/*