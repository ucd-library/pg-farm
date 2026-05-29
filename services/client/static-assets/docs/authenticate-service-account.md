# Service Account Authentication

This page explains how to use a **service account** to connect your application to PG Farm without requiring an interactive login.

- [What is a Service Account?](#what-is-a-service-account)
- [Requesting a Service Account](#requesting-a-service-account)
- [Keeping Your Secret Safe](#keeping-your-secret-safe)
- [Rotating a Password](#rotating-a-password)
- [How It Works](#how-it-works)
- [Getting a Token](#getting-a-token)
- [Connecting with psycopg3](#connecting-with-psycopg3)
- [Automatic Token Rotation](#automatic-token-rotation)

---

## What is a Service Account?

A service account is a machine account created specifically for programmatic access — for example, a web application or data pipeline that needs to query PG Farm without a human logging in each time.

Each service account is issued a 512-character **secret**. This secret never expires on its own, but it should be rotated periodically and kept out of your source code.

You use the secret to request a short-lived **token** (valid for 7 days). Your application uses that token as the PostgreSQL password when connecting through PG Farm.

---

## Requesting a Service Account

Contact a **PG Farm administrator** at pgfarm@ucdavis.edu and provide:

- Your PG Farm username (the account that will own the service account)
- A short name for the service account (e.g., `my-etl-pipeline`)
- A description of what the account will be used for

The administrator will create the account using the CLI:

```bash
pgfarm auth service-account-create my-etl-pipeline \
  --parent your-username \
  --description "Nightly ETL pipeline for the departmental reporting server"
```

Service account usernames always end in `-service-account` — the suffix is appended automatically if omitted, so the above example creates the user `my-etl-pipeline-service-account`.

> **No secret is issued at creation.** PG Farm administrators never see or handle your secret. Once the administrator tells you your account username, you generate your own initial secret by running the rotate command yourself (see [Rotating a Password](#rotating-a-password)). This ensures the secret is known only to you.

---

## Keeping Your Secret Safe

The secret is equivalent to a password. Treat it accordingly:

- **Never commit it to source code or a public repository.**
- Store it in an environment variable or a restricted file, not in your application config.
- Restrict file permissions if storing on disk: `chmod 600 ~/.pgfarm_secret`
- Rotate it immediately if you suspect it has been compromised (see [Rotating a Password](#rotating-a-password) below).

### Environment variable (recommended)

```bash
export PG_FARM_USERNAME="your-service-account-username"
export PG_FARM_SECRET="your-512-character-secret"
```

Add these to your server's environment (e.g. systemd unit file, `.env` loaded by your process manager, or a secrets manager). Do **not** check a `.env` file into version control.

### File on disk

Use the `--save` flag when rotating to write a credentials file:

```bash
pgfarm auth service-account-rotate my-etl-pipeline-service-account \
  --save ~/my-etl-pipeline-service-account.json
chmod 600 ~/my-etl-pipeline-service-account.json
```

The file contains:

```json
{
  "username": "my-etl-pipeline-service-account",
  "secret": "your-512-character-secret"
}
```

---

## Rotating a Password

Use this command to obtain your **initial secret** after account creation, or any time you need to replace a lost or compromised secret. You must be logged in as the **parent user** of the account.

### Zero-downtime rotation workflow

The secret is only used to request a token. A token, once issued, is valid for **7 days** regardless of what happens to the secret afterward. You can use this to rotate without any service downtime:

1. **Generate a fresh token** for your running service using the current secret:
   ```bash
   pgfarm auth service-account-login my-etl-pipeline-service-account \
     --file ~/my-etl-pipeline-service-account.json
   ```
   Your service now holds a token valid for up to 7 days.

2. **Rotate the secret** to generate a new one:
   ```bash
   pgfarm auth service-account-rotate my-etl-pipeline-service-account \
     --save ~/my-etl-pipeline-service-account-new.json
   chmod 600 ~/my-etl-pipeline-service-account-new.json
   ```
   The old secret is now invalid, but your running service is unaffected — its existing token still works.

3. **Deploy the new secret** to your service within 7 days. Once deployed, the service uses the new secret to obtain future tokens and the transition is complete.

You will be shown a warning and asked to confirm before anything changes.

To save the credentials directly to a file instead of printing to the terminal (as shown above):

```bash
pgfarm auth service-account-rotate my-etl-pipeline-service-account \
  --save ~/my-etl-pipeline-service-account.json
chmod 600 ~/my-etl-pipeline-service-account.json
```

The file contains a JSON object with `username` and `secret` fields. Keep it out of version control.

Administrators can rotate any service account regardless of ownership.

---

## How It Works

1. Your application POSTs your username and secret to the PG Farm token endpoint.
2. PG Farm returns an `access_token` valid for 7 days.
3. Your application uses that token as the **PostgreSQL password** when connecting.
4. Before the token expires, your application requests a fresh one using the same secret.

---

## Getting a Token

Send a POST request to `/auth/service-account/login` with your username and secret:

```bash
curl -s -X POST https://pgfarm.library.ucdavis.edu/auth/service-account/login \
  -H "Content-Type: application/json" \
  -d '{"username": "your-username", "secret": "your-secret"}' \
  | python3 -m json.tool
```

A successful response looks like:

```json
{
  "access_token": "eyJhbGci...",
  "expires_in": 604800,
  "token_type": "Bearer"
}
```

Use the value of `access_token` as your PostgreSQL password. The `expires_in` field is in seconds (604800 = 7 days).

---

## Connecting with psycopg3

Install the required packages if you haven't already:

```bash
pip install "psycopg[binary]" requests
```

A basic connection using credentials from environment variables:

```python
import os
import requests
import psycopg

PGFARM_URL = "https://pgfarm.library.ucdavis.edu"
USERNAME = os.environ["PG_FARM_USERNAME"]
SECRET = os.environ["PG_FARM_SECRET"]


def get_token():
    """Fetch a fresh access token from PG Farm."""
    resp = requests.post(
        f"{PGFARM_URL}/auth/service-account/login",
        json={"username": USERNAME, "secret": SECRET},
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["access_token"], data["expires_in"]


token, _ = get_token()

conn = psycopg.connect(
    host="pgfarm.library.ucdavis.edu",
    port=5432,
    user=USERNAME,
    password=token,
    dbname="your-org/your-database",
    sslmode="require",
)
```

To read credentials from a JSON file instead of environment variables:

```python
import json

def read_credentials(path=os.path.expanduser("~/my-etl-pipeline-service-account.json")):
    """Read username and secret from a JSON credentials file."""
    with open(path) as f:
        data = json.load(f)
    return data["username"], data["secret"]

USERNAME, SECRET = read_credentials()
```

---

## Automatic Token Rotation

Tokens are valid for 7 days. For long-running applications you should refresh the token before it expires. The class below maintains a pool of 3 connections and rotates the token every 5 days — giving a 2-day safety buffer — using a background timer. When the token is rotated, a fresh pool is opened before the old one is closed so in-flight queries are never interrupted.

Install the required packages:

```bash
pip install "psycopg[binary]" psycopg_pool requests
```

```python
import os
import time
import threading
import requests
import psycopg
from psycopg_pool import ConnectionPool

PGFARM_URL = "https://pgfarm.library.ucdavis.edu"

# Rotate the token after 5 days; token lifetime is 7 days, leaving a 2-day buffer.
TOKEN_ROTATE_AFTER = 5 * 24 * 3600

POOL_SIZE = 3


class PgFarmPool:
    """
    psycopg3 connection pool for PG Farm with automatic token rotation.

    Opens a pool of `POOL_SIZE` connections on construction and schedules a
    background token rotation every 5 days. On rotation, a new pool is
    opened before the old one is closed so no queries are interrupted.

    Usage:
        pool = PgFarmPool(
            username=os.environ["PG_FARM_USERNAME"],
            secret=os.environ["PG_FARM_SECRET"],
            dbname="your-org/your-database",
        )
        with pool.connection() as conn:
            rows = conn.execute("SELECT * FROM my_table WHERE id = %s", (42,)).fetchall()
        pool.close()
    """

    def __init__(self, username, secret, dbname,
                 host="pgfarm.library.ucdavis.edu", port=5432):
        self.username = username
        self.secret = secret
        self.dbname = dbname
        self.host = host
        self.port = port
        self._token = None
        self._pool = None
        self._lock = threading.Lock()
        self._timer = None
        self._open()

    def _fetch_token(self):
        """Request a fresh token from PG Farm."""
        resp = requests.post(
            f"{PGFARM_URL}/auth/service-account/login",
            json={"username": self.username, "secret": self.secret},
            timeout=10,
        )
        resp.raise_for_status()
        self._token = resp.json()["access_token"]

    def _conninfo(self):
        """Build a libpq connection string with the current token as password."""
        return (
            f"host={self.host} port={self.port} dbname={self.dbname} "
            f"user={self.username} password={self._token} sslmode=require"
        )

    def _open(self):
        """Fetch a token and open the connection pool."""
        self._fetch_token()
        self._pool = ConnectionPool(
            self._conninfo(),
            min_size=POOL_SIZE,
            max_size=POOL_SIZE,
            open=True,
        )
        self._schedule_rotation()

    def _rotate(self):
        """Replace the token and pool without interrupting in-flight queries."""
        self._fetch_token()
        new_pool = ConnectionPool(
            self._conninfo(),
            min_size=POOL_SIZE,
            max_size=POOL_SIZE,
            open=True,
        )
        with self._lock:
            old_pool, self._pool = self._pool, new_pool
        old_pool.close()
        self._schedule_rotation()

    def _schedule_rotation(self):
        """Schedule the next token rotation TOKEN_ROTATE_AFTER seconds from now."""
        if self._timer is not None:
            self._timer.cancel()
        self._timer = threading.Timer(TOKEN_ROTATE_AFTER, self._rotate)
        self._timer.daemon = True
        self._timer.start()

    def connection(self):
        """
        Return a context manager that yields a pooled psycopg connection.

        The connection is automatically returned to the pool when the ``with``
        block exits, whether normally or via an exception. The underlying
        socket is kept alive for reuse — call ``close()`` only at shutdown.

        :returns: psycopg_pool connection context manager
        """
        with self._lock:
            pool = self._pool
        return pool.connection()

    def close(self):
        """Cancel the rotation timer and close the connection pool (call at shutdown only)."""
        if self._timer is not None:
            self._timer.cancel()
        if self._pool is not None:
            self._pool.close()
```

### Example usage

Create the pool once at application startup and share it across requests. Each call to `pool.connection()` borrows a connection from the pool for the duration of the `with` block, then returns it automatically — no explicit close needed per request. On token rotation, the new pool handles incoming requests immediately while any connections already borrowed from the old pool finish their work and drain naturally; existing DB sessions are unaffected because the token is only needed when opening a new connection.

```python
# --- application startup ---
pool = PgFarmPool(
    username=os.environ["PG_FARM_USERNAME"],
    secret=os.environ["PG_FARM_SECRET"],
    dbname="your-org/your-database",
)

# --- per-request usage ---
# Connection is returned to the pool automatically when the with block exits.
with pool.connection() as conn:
    rows = conn.execute("SELECT id, name FROM public.my_table LIMIT 10").fetchall()

# --- application shutdown only ---
pool.close()
```

### Using a file-stored secret

```python
username, secret = read_credentials("~/my-etl-pipeline-service-account.json")

pool = PgFarmPool(
    username=username,
    secret=secret,
    dbname="your-org/your-database",
)
```
