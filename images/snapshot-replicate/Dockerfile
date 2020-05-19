ARG PGF_PG_VERSION
ARG PG_FARM_VERSION
FROM ucdlib/pg-farm-base:${PG_FARM_VERSION}-${PGF_PG_VERSION}

COPY postgresql.conf /etc/postgresql/postgresql.conf
COPY pg_hba.conf /etc/postgresql/pg_hba.conf
RUN chown postgres:postgres /etc/postgresql/postgresql.conf
RUN chown postgres:postgres /etc/postgresql/pg_hba.conf

CMD docker-entrypoint.sh -c 'config_file=/etc/postgresql/postgresql.conf'