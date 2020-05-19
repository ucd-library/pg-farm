ARG PGF_PG_VERSION
FROM postgres:${PGF_PG_VERSION}
LABEL maintainer="jrmerz@ucdavis.edu"

ARG PGF_PG_VERSION
ARG PGF_POSTGIS_VERSION

RUN apt-get update && \
  apt-get install -y --no-install-recommends \
  ca-certificates vim \
  postgis \
  "postgresql-${PGF_PG_VERSION}-postgis-${PGF_POSTGIS_VERSION}" \
  "postgresql-${PGF_PG_VERSION}-postgis-${PGF_POSTGIS_VERSION}-scripts"
RUN rm -rf /var/lib/apt/lists/*

RUN mkdir -p /docker-entrypoint-initdb.d
COPY ./initdb-postgis.sql /docker-entrypoint-initdb.d/postgis.sql

RUN cp /docker-entrypoint.sh /docker-entrypoint-org.sh
COPY docker-entrypoint.sh /docker-entrypoint.sh