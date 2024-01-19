# pg-farm-v2
PG Farm - Version 2


## Access

First make sure you have the CLI installed.  Additionally you need to PostgreSQL client (psql)installed on your machine.

```
npm install -g @ucd-lib/pg-farm-cli
```

Then login and connect to database

```
pgfarm auth login
export PGFARM_TOKEN=$(pgfarm auth token)
psql -U [username] -h [host] [database]
```