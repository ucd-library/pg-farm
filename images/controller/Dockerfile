FROM node:12

RUN wget -q https://www.postgresql.org/media/keys/ACCC4CF8.asc -O- | apt-key add -
RUN echo "deb http://apt.postgresql.org/pub/repos/apt/ stretch-pgdg main" | tee /etc/apt/sources.list.d/postgresql.list
RUN apt-get update && \
  apt-get install -y --no-install-recommends \
  iputils-ping curl zip unzip ca-certificates vim \
  postgresql-client-10

#
# 
# RUN apt-get update && get install -y postgresql-client-10

RUN rm -rf /var/lib/apt/lists/*

RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
RUN unzip awscliv2.zip
RUN ./aws/install
RUN rm awscliv2.zip

RUN mkdir -p /root/.aws
COPY ./aws-config /root/.aws/config

COPY ./.pgpass /root/.pgpass
RUN chmod go-wr /root/.pgpass

RUN mkdir scripts
WORKDIR /scripts
COPY backup.sh .
COPY restore.sh .

CMD tail -f /dev/null