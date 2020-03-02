FROM postgres:10
LABEL maintainer="jrmerz@ucdavis.edu"

RUN apt-get update
RUN apt-get install -y --no-install-recommends \
  iputils-ping curl zip unzip ca-certificates vim \
  postgis \
  postgresql-10-postgis-2.5 \
  postgresql-10-postgis-2.5-scripts
RUN rm -rf /var/lib/apt/lists/*

RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
RUN unzip awscliv2.zip
RUN ./aws/install
RUN rm awscliv2.zip

RUN mkdir -p /root/.aws
COPY ./aws-config /root/.aws/config

RUN mkdir -p /docker-entrypoint-initdb.d
COPY ./initdb-postgis.sql /docker-entrypoint-initdb.d/postgis.sql

RUN mkdir scripts
WORKDIR /scripts
COPY backup.sh .
COPY restore.sh .

