
# Overview

  - [Replicate Types](#replicate-types)
  - [Streaming Replicate Setup](#streaming-replicate-setup)
  - [Snapshot Setup](#snapshot-setup)
  - [Statistics](#statistics)
  - [SSL](#ssl)
  - [Rest API](#rest-api)

# Replicate Types

## [Streaming replication](#streaming-replicate-setup)
  - Entire Database replicated
  - PGR roles need to be added on Master
  - Master database modifications required
    - replicate user must be created on master
    - library user must be create on master

## Nightly Replication
 - Need sync mechanism
 - Can limit to certain tables (white/black list)

## [Standalone/Snapshot](#snapshot-setup)
 - Access control to psql

# Streaming Replicate Setup

Two user accounts must be created a replication account and a read-only library
user account.

Example to create replication account:
```sql
CREATE ROLE library_replicate WITH REPLICATION PASSWORD 'password' LOGIN
```

Then create the [library user role](#create-libary_user-role)

Additional Notes:
https://scalegrid.io/blog/getting-started-with-postgresql-streaming-replication/,
https://www.postgresql.org/docs/12/warm-standby.html#STANDBY-SERVER-OPERATION

## pg_hba.conf

host    replication     library_replicate      pg.farm.ip/32    md5

## postgresql.conf

wal_level = replica
wal_log_hints = on
max_wal_senders = 3
wal_keep_segments = 8
hot_standby = on

# Snapshot Setup

First import the data.  Then create the [library user role](#create-libary_user-role).

# Create libary_user role

Create the library user account and provice the proper access

```sql
CREATE ROLE library_user WITH PASSWORD 'library_user' LOGIN
GRANT CONNECT ON DATABASE db_name TO 'library_user';
GRANT USAGE ON SCHEMA schema_name TO 'library_user';
GRANT SELECT ON ALL TABLES IN SCHEMA schema_name TO 'library_user';
GRANT EXECUTE ON SCHEMA schema_name TO 'library_user';
```

### pg_hba.conf

```
host    db_name         library_user           0.0.0.0/0        md5
```

# Statistics

https://www.postgresql.org/docs/12/monitoring-stats.html

Currently tracking; track_activities, track_counts, track_functions for snapshot and
streaming replicate.

# SSL

Need to create certs for domains.  Then follow: https://www.postgresql.org/docs/12/ssl-tcp.html

# Rest API

[PostgREST](http://postgrest.org/en/v6.0/) (PGR) is used to allow RESTful HTTP API access.  

## Setup

The [library user role](#create-libary_user-role) should be user to access the posgrest instance.

# AWS S3 Backups

AWS S3 backups will be created (nightly?).  These backups use the aws cli.  All pg containers have a /pg-stage mount point where database dumbs can be stored when backuping up/restoring the database.  A local .aws-credentials file will be mounted to /root/.aws/credentials provided the container access to the S3 bucket.