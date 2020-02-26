#! /bin/bash

set -e

# clean up
cd /pg-stage
rm -rf *

# install global tables ... ie users/roles
aws s3 cp s3://$AWS_BUCKET/$CLUSTER_NAME/global.sql global.sql
psql -U postgres -f global.sql

# install main database tables
aws s3 cp s3://$AWS_BUCKET/$CLUSTER_NAME/data.Fc data.Fc
pg_restore -d postgres -U postgres --clean --create data.Fc

rm -rf data.Fc
rm -rf global.sql