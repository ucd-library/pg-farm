# HTTP REST API Access (PostgREST)

This page explains how to access PostgreSQL databases hosted by PG Farm via an HTTP REST API. PG Farm uses [PostgREST](https://postgrest.org) to automatically expose database views and tables as REST endpoints.

- [Overview](#overview)
- [API Endpoint Format](#api-endpoint-format)
- [Public Access (Anonymous Queries)](#public-access-anonymous-queries)
- [Authenticated Access (JWT Bearer Tokens)](#authenticated-access-jwt-bearer-tokens)
- [Querying Syntax & Examples](#querying-syntax--examples)
- [API Playground (Swagger UI)](#api-playground-swagger-ui)

---

## Overview

When enabled, PG Farm automatically starts a PostgREST instance for your database. PostgREST inspects the database's `api` schema and builds a RESTful API reflecting the tables, views, and functions defined there.

Querying the REST API uses standard HTTP methods (`GET`, `POST`, etc.) and results are returned in JSON format.

---

## API Endpoint Format

The base path for database queries follows this format:

```
https://pgfarm.library.ucdavis.edu/api/query/[organization]/[database]/[table_or_view]
```

For example, to access the table/view named `weather-readings` in the `weather-stats` database owned by the `library` organization:
```
https://pgfarm.library.ucdavis.edu/api/query/library/weather-stats/weather-readings
```

---

## Public Access (Anonymous Queries)

For databases where public access is enabled:
- Any exposed table or view under the `api` schema can be queried **anonymously** (without providing any authentication header).
- Anonymous requests automatically run with the permissions of the read-only [public user account](/docs/public-user-account) (`pgfarm-public`).

### Example
```bash
curl "https://pgfarm.library.ucdavis.edu/api/query/library/weather-stats/weather-readings?limit=5"
```

---

## Authenticated Access (JWT Bearer Tokens)

If you are querying a private database, or need to connect as a specific user/service account, you must include a JSON Web Token (JWT) in your request's `Authorization` header:

```bash
export TOKEN=$(pgfarm auth token)
curl -H "Authorization: Bearer $TOKEN" \
  "https://pgfarm.library.ucdavis.edu/api/query/library/weather-stats/weather-readings?limit=5"
```

You can obtain a token via:
- The [PG Farm CLI tool](/docs/authenticate#cli-login) (`pgfarm auth token`).
- The [Service Account Authentication flow](/docs/authenticate-service-account) (exchanging your secret for a token).

---

## Querying Syntax & Examples

PostgREST supports rich querying directly in the URL query string. Below are common operations:

### 1. Selecting Specific Columns
Use the `select` parameter to limit which columns are returned:
```
?select=timestamp,temperature
```

### 2. Filtering
Filter results using operators like `eq` (equal), `like` (pattern matching), `gt` (greater than), and `lt` (less than):
- **Equal:** `?city=eq.Davis`
- **Pattern Match (Wildcard):** `?status=like.*active*`
- **Greater Than:** `?temperature=gt.75`
- **In List:** `?id=in.(1,2,3)`

### 3. Ordering / Sorting
Sort your results by one or more columns:
- **Ascending:** `?order=timestamp`
- **Descending:** `?order=temperature.desc`

### 4. Limits and Pagination
Limit the number of returned records and offset the start for pagination:
- `?limit=10`
- `?limit=10&offset=20`

### Combined Query Example
To get the top 5 warmest readings in Davis, returning only the timestamp and temperature:
```bash
curl "https://pgfarm.library.ucdavis.edu/api/query/library/weather-stats/weather-readings?city=eq.Davis&order=temperature.desc&limit=5&select=timestamp,temperature"
```

For more advanced querying features (such as JSON columns, resource embedding, and full-text search), see the official [PostgREST Querying Documentation](https://postgrest.org/en/stable/references/api/tables_views.html).

---

## API Playground (Swagger UI)

Each database page in PG Farm features an interactive **API Playground**. This playground automatically generates an OpenAPI spec based on the `api` schema, allowing you to test queries, filters, and endpoints directly from your browser.
