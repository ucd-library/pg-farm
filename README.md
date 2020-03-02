
# Overview

  - [Replicate Types](#replicate-types)
  - [Streaming Replicate Setup](#streaming-replicate-setup)
  - [Snapshot Setup](#snapshot-setup)
  - [Statistics](#statistics)
  - [SSL](#ssl)
  - [Rest API](#rest-api)
  - [AWS S3 Backups](#aws-s3-backups)
  - [Setup](#setup)
    - [Farm Setup](#farm-setup)
    - [CLI Setup](#cli-setup)

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
  - https://scalegrid.io/blog/getting-started-with-postgresql-streaming-replication/
  - https://www.postgresql.org/docs/12/warm-standby.html#STANDBY-SERVER-OPERATION

## pg_hba.conf

```
host    replication     library_replicate      pg.farm.ip/32    md5
```

## postgresql.conf

```
wal_level = replica
wal_log_hints = on
max_wal_senders = 3
wal_keep_segments = 8
hot_standby = on
```

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

Currently tracking; ```track_activities```, ```track_counts```, ```track_functions``` for snapshot and
streaming replicate.

Required flags posgtesql.conf

```
track_activities = on
track_counts = on
track_functions = all	
```

Example:

```
 select * from pg_stat_user_functions;
```

# SSL

Need to create certs for domains.  Then follow: https://www.postgresql.org/docs/12/ssl-tcp.html

Required flags posgtesql.conf

```
ssl = on
ssl_prefer_server_ciphers = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
```

Using PG SSL without Letsencrypt
https://medium.com/@pavelevstigneev/postgresql-ssl-with-letsencrypt-b53051eacc22


# Rest API

[PostgREST](http://postgrest.org/en/v6.0/) (PGR) is used to allow RESTful HTTP API access.  

## Setup

The [library user role](#create-libary_user-role) should be user to access the posgrest instance.

# AWS S3 Backups

AWS S3 backups will be created (nightly?).  These backups are used by the aws cli.  All pg containers have a /pg-stage mount point where database dumbs can be stored when backuping up/restoring the database.  A local .aws-credentials file will be mounted to /root/.aws/credentials provided the container access to the S3 bucket.

Database backups will be stored in the S3 bucket defined the in [farms config.json](#farm-setup) file.  Inside the bucket, backups will be stored in the folder with the same name as the farms cluster name.  Each cluster folder will have two files: data.Fc and global.sql

Example location: s3://pg-farm/my-project/data.Fc

  - data.Fc
    - a ```pg_dump -F c``` dump of the postgres database containing all data which you wish to store in the pg-farm replicate. 
  - global.sql
    - a ```pg_dumpall --globals-only``` dump of the postgres database containing all user/roles to be stored in the pg-farm replicate.
    - Note.  this file should contain the library_user role!

## AWS CLI key rotation

The clusters access S3 buckets via the AWS CLI which use Service Accounts associated ```access key id``` and ```access key secret``` to authenticate.  It is recommended you rotate these keys every month or so.  The PG Farm CLI as a built in helper function to rotate the access keys for the entire farm.

```
pg-farm rotate-keys --key-id [id] --key-secret [secret]
```

# Setup

This section contains information on setting up pg-farm and accessing via CLI.

## Farm Setup

Setting up pg-farm requires Docker, Docker Compose and the pg-farm cli.


### Install

  - [Docker](https://docs.docker.com/install/)
  - [Docker Compose](https://docs.docker.com/compose/install/)
  - [pg-farm CLI](#cli-setup)

### Configure

Choose a root directory to host the farm.  For this example we will use ```/opt/pg-farm```.

```bash
mkdir /opt/pg-farm
```

In ```/opt/pg-farm``` create a ```config.json``` file.  It should have the following properties

```javascript
{ 
  "name": "test-farm", // give the farm a name
  "domain": "localhost", // domain the farm will be hosted at
  "aws": {
    "bucket": "pg-farm" // aws s3 bucket for the farm to use
  },
  "options": {
    "startingPort": 6000, // port number pg-farm will start allocating ports at
    "apache": false // should pg-farm create apache config files for clusters in /etc/apache2/site-available
  }
}
```

## CLI Setup

### Install

[NodeJS](https://nodejs.org/en/download/) is required.

```bash
npm install -g @ucd-lib/pg-farm
```

### Configure

Now create a ```.pg-farm``` options file in your home directory and set:

```javascript
{
  "rootDir" : "/opt/pg-farm"
}
```

This will set the default location for the farm.  You can override this location in the CLI by:
  - providing the ```--root-dir``` option
  - setting the ```PG_FARM_ROOT``` environment variable

Additonaly you can create an options file ```/etc/pg-farm/conf```.  These options will always be used
when you run the CLI on your system.  Though a local file in your home directory will override any options 
set in the global file.  ```PG_FARM_ROOT``` and ```--root-dir``` will overwrite the ```rootDir``` variable
in any config file.  Use ```pg-farm config list``` to see which files/options are in use.