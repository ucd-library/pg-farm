FROM postgres:10
LABEL maintainer="jrmerz@ucdavis.edu"

RUN apt-get update
RUN apt-get install -y --no-install-recommends \
  ca-certificates vim \
  postgis \
  postgresql-10-postgis-2.5 \
  postgresql-10-postgis-2.5-scripts
RUN rm -rf /var/lib/apt/lists/*

RUN mkdir -p /docker-entrypoint-initdb.d
COPY ./initdb-postgis.sql /docker-entrypoint-initdb.d/postgis.sql

RUN cp /docker-entrypoint.sh /docker-entrypoint-org.sh
COPY docker-entrypoint.sh /docker-entrypoint.sh