# Public User Account Access

This page explains how to use the read-only public user account (`pgfarm-public`) to connect to databases hosted by PG Farm, and how to query public tables and views exposed under the database's `api` schema.

- [Overview](#overview)
- [Connecting with the Public Account](#connecting-with-the-public-account)
- [Querying via the `api` Schema](#querying-via-the-api-schema)
- [HTTP REST API Access](#http-rest-api-access)
- [Listing Available Tables](#listing-available-tables)
- [Exposing Tables (For Database Owners/Administrators)](#exposing-tables-for-database-ownersadministrators)

---

## Overview

For PG Farm databases where public access is enabled, a read-only public user account is provided. This allows anyone to connect to and query the database without needing a UC Davis CAS login or a temporary service account token.

The public user account is limited to **read-only (`SELECT`) access** and can only access tables or views explicitly exposed inside the `api` schema.

---

## Connecting with the Public Account

Use the following parameters to connect directly to the database:

- **Host:** `pgfarm.library.ucdavis.edu`
- **Port:** `5432`
- **Database:** `[organization]/[database_name]` (e.g., `library/weather-stats`)
- **Username:** `pgfarm-public`
- **Password:** `go-aggies`
- **SSL Mode:** Required (`require` or `verify-full`)

### Connection Examples

Below are examples of how to connect to a PG Farm database using the public account.

#### command-line (psql)
```bash
PGPASSWORD="go-aggies" PGSSLMODE="verify-full" PGSSLROOTCERT="system" \
  psql -U pgfarm-public -h pgfarm.library.ucdavis.edu -p 5432 -d library/weather-stats
```

#### Python (psycopg)
```python
import psycopg

conn = psycopg.connect(
    host="pgfarm.library.ucdavis.edu",
    port=5432,
    user="pgfarm-public",
    password="go-aggies",
    dbname="library/weather-stats",
    sslmode="require"
)

with conn.cursor() as cur:
    cur.execute("SELECT * FROM api.weather_readings LIMIT 5;")
    for row in cur.fetchall():
        print(row)

conn.close()
```

---

## Querying via the `api` Schema

In PG Farm, raw database tables are kept isolated from public access. Instead, public data is exposed via a schema named `api`. 

Because the `pgfarm-public` user only has select privileges on the `api` schema, you must query tables and views accordingly.

### 1. Fully-Qualified Names (Recommended)
You can query exposed tables and views by prefixing them with `api.`:
```sql
SELECT * FROM api.weather_readings LIMIT 10;
```
If you omit the `api.` prefix (e.g., `SELECT * FROM weather_readings;`), PostgreSQL will default to searching the `public` schema and fail with a permission error.

### 2. Setting the search_path
To avoid typing the `api.` prefix on every table, you can set the search path for your connection session:
```sql
SET search_path TO api, public;
```
Once configured, you can query public tables directly:
```sql
SELECT * FROM weather_readings LIMIT 10;
```

---

## HTTP REST API Access

The same views and tables exposed in the `api` schema can also be accessed via standard HTTP requests without any credentials using the auto-generated REST API.

See the [HTTP REST API (PostgREST) Documentation](/docs/http-rest-api) for details on query syntax, endpoint format, and HTTP client examples.

---

## Listing Available Tables

To discover which tables and views are exposed and readable by the public user, run the following SQL query:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'api';
```

If you are using `psql`, you can list them with:
```bash
\d api.*
```

---

## Exposing Tables (For Database Owners/Administrators)

If you are a database owner or administrator and want to make data from your internal schema public, you should follow this view-based exposure pattern:

1. Create a view in the `api` schema that references your internal table.
2. Grant SELECT privileges on the view (which is handled automatically for the `api` schema).

For example, if your internal data resides in `sensor_data.readings` and you want to expose it to the public:

```sql
CREATE OR REPLACE VIEW api.readings AS 
SELECT * FROM sensor_data.readings;
```

### Why use views?
- **Security Boundary:** Views act as a firewall. You can select only specific columns (excluding internal metadata or sensitive information) instead of exposing the entire table:
  ```sql
  CREATE OR REPLACE VIEW api.readings AS 
  SELECT timestamp, temperature, humidity FROM sensor_data.readings;
  ```
- **Stability:** You can change or migrate internal schemas/tables behind the scenes without breaking queries from public users, as long as the view definition in `api` remains stable.
