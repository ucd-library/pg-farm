# install postgrest
FROM postgrest/postgrest:v12.0.2 AS postgrest

FROM node:20



RUN apt update && apt install -y \
    vim \
    apt-transport-https \
    ca-certificates \
    gnupg \
    curl \
    lsb-release

# pg 16 tools
RUN echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
RUN curl https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
# gcloud
RUN curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
# kubectl
RUN curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
RUN echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /' | tee /etc/apt/sources.list.d/kubernetes.list

RUN apt-get update && apt-get install -y \
  postgresql-client-16 \
  google-cloud-cli \
  kubectl \
  google-cloud-sdk-gke-gcloud-auth-plugin

RUN rm -rf /var/lib/apt/lists/*
RUN apt-get clean

COPY --from=postgrest /bin/postgrest /bin/postgrest

RUN mkdir /services
WORKDIR /services

COPY services/package.json .
COPY services/package-lock.json .
RUN npm install

RUN mkdir /tools
WORKDIR /tools

COPY tools/package.json .
COPY tools/package-lock.json .
RUN npm install
COPY tools .

WORKDIR /services
COPY services/client ./client
RUN cd client/dev && npm install
RUN npm run client-build
RUN npm run client-dist

COPY services .

ARG PG_FARM_VERSION
ENV PG_FARM_VERSION=${PG_FARM_VERSION}
ARG PG_FARM_REPO_TAG
ENV PG_FARM_REPO_TAG=${PG_FARM_REPO_TAG}
ARG PG_FARM_REPO_HASH
ENV PG_FARM_REPO_HASH=${PG_FARM_REPO_HASH}
ARG BUILD_DATETIME
ENV BUILD_DATETIME=${BUILD_DATETIME}

CMD ["bash", "-c", "tail -f /dev/null"]