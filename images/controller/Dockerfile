FROM node:12

RUN apt-get update
RUN apt-get install -y --no-install-recommends \
  iputils-ping curl zip unzip ca-certificates vim
RUN rm -rf /var/lib/apt/lists/*

RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
RUN unzip awscliv2.zip
RUN ./aws/install
RUN rm awscliv2.zip

RUN mkdir -p /root/.aws
COPY ./aws-config /root/.aws/config

RUN mkdir scripts
WORKDIR /scripts
COPY backup.sh .
COPY restore.sh .