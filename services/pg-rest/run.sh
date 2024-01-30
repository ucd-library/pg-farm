#! /bin/bash

set -e

echo "Generating config file..."
node /services/pg-rest/generate-config.js

echo "Starting postgrest..."
postgrest /etc/postgrest.conf