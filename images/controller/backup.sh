#! /bin/bash

set -e

# clean up
cd /pg-stage
rm -rf *

zip -r /var/lib/postgres/data /pg-stage/backup.zip
cp -r /etc/postgres /pg-stage/etc
zip -r /pg-stage/etc /pg-stage/backup.zip