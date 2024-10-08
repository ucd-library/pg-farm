# PG Farm
PG Farm - Version 2


## Access

First make sure you have the PG Farm CLI installed (requires NodeJS).  Additionally you need to PostgreSQL client (psql) installed on your machine for this example.

First install NodeJS:

 - https://nodejs.org/en/download/prebuilt-installer

Then install the PG Farm CLI:

```bash
npm install -g @ucd-lib/pgfarm
```

You may be need to install as root:

```bash
sudo npm install -g @ucd-lib/pgfarm
```


Then login and connect to database

```bash
pgfarm auth login
PGSERVICE=pgfarm psql [database-name]
```

`pgfarm connect --help` will show you helper scripts for connecting from various sources/programming languages.

`pgfarm auth --help` will show you more options for authentication and accessing your current authentication token.