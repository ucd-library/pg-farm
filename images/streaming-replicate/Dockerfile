FROM postgres:10

RUN apt-get update
RUN apt-get install -y iputils-ping

RUN mv docker-entrypoint.sh docker-entrypoint-org.sh
COPY docker-entrypoint.sh docker-entrypoint.sh

CMD /docker-entrypoint.sh