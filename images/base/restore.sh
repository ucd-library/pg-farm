#! /bin/bash

set -e

# clean up
cd /pg-stage
rm -rf *

FILES=$(aws s3 ls s3://$AWS_BUCKET/$CLUSTER_NAME/)

# install global tables ... ie users/roles
if [[ "$FILES" =~ [global.sql] ]]; then 
  aws s3 cp s3://$AWS_BUCKET/$CLUSTER_NAME/global.sql global.sql
  psql -U postgres -f global.sql
else
  echo "No global user file found"
fi

# install main database tables
if [[ "$FILES" =~ [data.Fc] ]]; then 
  aws s3 cp s3://$AWS_BUCKET/$CLUSTER_NAME/data.Fc data.Fc
  pg_restore -d postgres -U postgres --clean --create data.Fc
else
  echo "No data file found"
fi

rm -rf data.Fc
rm -rf global.sql