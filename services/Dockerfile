# install postgrest
FROM postgrest/postgrest:v12.0.2 as postgrest

FROM node:20

RUN apt update && apt install -y \
    vim \
    apt-transport-https \
    ca-certificates \
    gnupg \
    curl \
    postgresql-client

RUN curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
RUN curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
RUN echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /' | tee /etc/apt/sources.list.d/kubernetes.list
RUN apt-get update && apt-get install -y google-cloud-cli kubectl google-cloud-sdk-gke-gcloud-auth-plugin

RUN rm -rf /var/lib/apt/lists/*

COPY --from=postgrest /bin/postgrest /bin/postgrest

RUN mkdir /services
WORKDIR /services

COPY package.json .
COPY package-lock.json .
RUN npm install

COPY . .

ARG PG_FARM_VERSION
ENV PG_FARM_VERSION=${PG_FARM_VERSION}
ARG PG_FARM_REPO_BRANCH
ENV PG_FARM_REPO_BRANCH=${PG_FARM_REPO_BRANCH}
ARG PG_FARM_REPO_TAG
ENV PG_FARM_REPO_TAG=${PG_FARM_REPO_TAG}
ARG PG_FARM_REPO_HASH
ENV PG_FARM_REPO_HASH=${PG_FARM_REPO_HASH}
ARG BUILD_DATETIME
ENV BUILD_DATETIME=${BUILD_DATETIME}

CMD bash -c 'tail -f /dev/null'