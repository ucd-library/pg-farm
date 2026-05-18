# Service Account Authentication

This page explains how to use a **service account** to connect your application to PG Farm without requiring an interactive login.

- [What is a Service Account?](#what-is-a-service-account)
- [Requesting a Service Account](#requesting-a-service-account)
- [Keeping Your Secret Safe](#keeping-your-secret-safe)
- [Rotating a Password](#rotating-a-password)
- [How It Works](#how-it-works)
- [Getting a Token](#getting-a-token)
- [Connecting with psycopg2](#connecting-with-psycopg2)
- [Automatic Token Rotation](#automatic-token-rotation)

---

## What is a Service Account?

A service account is a machine account created specifically for programmatic access — for example, a web application or data pipeline that needs to query PG Farm without a human logging in each time.

Each service account is issued a 512-character **secret**. This secret never expires on its own, but it should be rotated periodically and kept out of your source code.

You use the secret to request a short-lived **token** (valid for 7 days). Your application uses that token as the PostgreSQL password when connecting through PG Farm.

---

## Requesting a Service Account

Contact a **PG Farm administrator** and provide:

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

```bash
# Write once, restrict permissions
echo "your-512-character-secret" > ~/.pgfarm_secret
chmod 600 ~/.pgfarm_secret
```

---

## Rotating a Password

Use this command to obtain your **initial secret** after account creation, or any time you need to replace a lost or compromised secret. You must be logged in as the **parent user** of the account.

### Zero-downtime rotation workflow

The secret is only used to request a token. A token, once issued, is valid for **7 days** regardless of what happens to the secret afterward. You can use this to rotate without any service downtime:

1. **Generate a fresh token** for your running service using the current secret:
   ```bash
   pgfarm auth service-account-login my-etl-pipeline-service-account \
     --file ~/.pgfarm_secret
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

## Connecting with psycopg2

Install the required packages if you haven't already:

```bash
pip install psycopg2-binary requests
```

A basic connection using credentials from environment variables:

```python
import os
import requests
import psycopg2

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

conn = psycopg2.connect(
    host="pgfarm.library.ucdavis.edu",
    port=5432,
    user=USERNAME,
    password=token,
    dbname="your-org/your-database",
    sslmode="require",
)
```

To read the secret from a file instead of an environment variable:

```python
def read_secret(path=os.path.expanduser("~/.pgfarm_secret")):
    """Read a secret from a restricted file."""
    with open(path) as f:
        return f.read().strip()

SECRET = read_secret()
```

---

## Automatic Token Rotation

Tokens are valid for 7 days. For long-running applications you should refresh the token before it expires and reconnect automatically on failure.

The class below handles both time-based token refresh and reconnection after a dropped connection:

```python
import os
import time
import requests
import psycopg2

PGFARM_URL = "https://pgfarm.library.ucdavis.edu"

# Refresh the token this many seconds before it actually expires.
TOKEN_REFRESH_BUFFER = 300  # 5 minutes


class PgFarmConnection:
    """
    Manages a psycopg2 connection to PG Farm with automatic token rotation.

    Tokens are refreshed proactively before expiry and on connection failure,
    so your application never has to handle authentication errors manually.

    Usage:
        db = PgFarmConnection(
            username=os.environ["PG_FARM_USERNAME"],
            secret=os.environ["PG_FARM_SECRET"],
            dbname="your-org/your-database",
        )
        rows = db.query("SELECT * FROM my_table WHERE id = %s", (42,))
        db.close()
    """

    def __init__(self, username, secret, dbname,
                 host="pgfarm.library.ucdavis.edu", port=5432):
        self.username = username
        self.secret = secret
        self.dbname = dbname
        self.host = host
        self.port = port
        self._token = None
        self._token_expiry = 0   # unix timestamp after which the token is stale
        self._conn = None

    def _fetch_token(self):
        """Request a fresh token from PG Farm."""
        resp = requests.post(
            f"{PGFARM_URL}/auth/service-account/login",
            json={"username": self.username, "secret": self.secret},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        self._token = data["access_token"]
        self._token_expiry = time.time() + data["expires_in"] - TOKEN_REFRESH_BUFFER

    def _token_is_fresh(self):
        return self._token is not None and time.time() < self._token_expiry

    def _open(self):
        """Open (or reopen) the database connection, refreshing the token if needed."""
        if not self._token_is_fresh():
            self._fetch_token()
        self._conn = psycopg2.connect(
            host=self.host,
            port=self.port,
            user=self.username,
            password=self._token,
            dbname=self.dbname,
            sslmode="require",
        )

    def query(self, sql, params=None):
        """
        Execute a query and return all rows.

        On a connection or authentication error the token is refreshed and the
        query is retried once before the exception is re-raised.
        """
        for attempt in range(2):
            try:
                if self._conn is None or self._conn.closed:
                    self._open()
                with self._conn.cursor() as cur:
                    cur.execute(sql, params)
                    return cur.fetchall()
            except (psycopg2.OperationalError, psycopg2.InterfaceError):
                if attempt == 0:
                    # Force a fresh token and a new connection on next iteration.
                    self._token_expiry = 0
                    self._conn = None
                else:
                    raise

    def close(self):
        """Close the underlying connection."""
        if self._conn and not self._conn.closed:
            self._conn.close()
```

### Example usage

```python
db = PgFarmConnection(
    username=os.environ["PG_FARM_USERNAME"],
    secret=os.environ["PG_FARM_SECRET"],
    dbname="your-org/your-database",
)

try:
    rows = db.query("SELECT id, name FROM public.my_table LIMIT 10")
    for row in rows:
        print(row)
finally:
    db.close()
```

### Using a file-stored secret

```python
db = PgFarmConnection(
    username="your-service-account-username",
    secret=read_secret("~/.pgfarm_secret"),
    dbname="your-org/your-database",
)
```
