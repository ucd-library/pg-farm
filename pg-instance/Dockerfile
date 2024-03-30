ARG PG_VERSION
FROM postgres:${PG_VERSION}

ARG PLV8_VERSION=3.2.2

# COPY pg_hba.conf /var/lib/postgresql/data/pg_hba.conf
ARG PG_VERSION
ENV PG_VERSION=${PG_VERSION}

RUN apt-get update \
      && apt-get install -y --no-install-recommends \
        postgis \
        postgresql-${PG_VERSION}-postgis-3 \
        postgresql-${PG_VERSION}-postgis-3-scripts \
        postgresql-server-dev-${PG_VERSION} \
        libtinfo5 \
        build-essential \
        pkg-config \
        libstdc++-12-dev \
        cmake \
        git \
        wget \
        ca-certificates \
        python3 \ 
      && rm -rf /var/lib/apt/lists/*

RUN ln -s /usr/bin/python3 /usr/bin/python 

# RUN wget https://github.com/plv8/plv8/archive/v${PLV8_VERSION}.tar.gz 
# RUN tar -xvzf v${PLV8_VERSION}.tar.gz
# WORKDIR /plv8-${PLV8_VERSION}
RUN git clone https://github.com/plv8/plv8.git --branch v${PLV8_VERSION} --single-branch
WORKDIR /plv8
RUN make 
RUN make install
WORKDIR /
# RUN rm -rf plv8-${PLV8_VERSION} \
#     && rm v${PLV8_VERSION}.tar.gz

RUN mkdir -p /docker-entrypoint-initdb.d
COPY ./initdb-postgis.sql /docker-entrypoint-initdb.d/postgis.sql

ENV POSTGRES_HOST_AUTH_METHOD=password
ENV POSTGRES_PASSWORD=postgres
ENV POSTGRES_USER=postgres
ENV POSTGIS_ENABLE_OUTDB_RASTERS=1
ENV POSTGIS_GDAL_ENABLED_DRIVERS=ENABLE_ALL

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