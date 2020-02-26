#! /bin/bash

set -e

# clean up
cd /pg-stage
rm -rf *

pg_dumpall -U postgres --clean --globals-only --file global.sql
pg_dump -U postgres -F c -f data.Fc