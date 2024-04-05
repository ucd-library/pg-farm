# PG Farm
PG Farm - Version 2


## Access

First make sure you have the PG Farm CLI installed (requires python + pip).  Additionally you need to PostgreSQL client (psql) installed on your machine for this example.

```bash
pip install \
  --extra-index-url https://us-python.pkg.dev/pgfarm-419213/pip/ \
  pgfarm
```

Then login and connect to database

```bash
pgfarm auth login
export PGSERVICE=pgfarm
psql [database]
```

`pgfarm connect --help` will show you more options for connecting to the database.

`pgfarm auth --help` will show you more options for authentication and accessing your current athentication token.