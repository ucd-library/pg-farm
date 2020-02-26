ARG VERSION
FROM ucdlib/pg-farm-base:${VERSION}

COPY postgresql.conf /etc/postgresql/postgresql.conf
COPY pg_hba.conf /etc/postgresql/pg_hba.conf
RUN chown postgres:postgres /etc/postgresql/postgresql.conf
RUN chown postgres:postgres /etc/postgresql/pg_hba.conf

COPY docker-entrypoint.sh docker-entrypoint.sh

CMD docker-entrypoint.sh -c 'config_file=/etc/postgresql/postgresql.conf'