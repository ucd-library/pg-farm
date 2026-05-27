# PG Farm Test Suite

## Test Types

| Command | Scope | Requires |
|---|---|---|
| `npm test` | Unit + integration + api + gateway | Local test DB container |
| `npm run test:unit` | Unit tests only | Nothing |
| `npm run test:integration` | Integration tests (DB-level) | Local test DB container |
| `npm run test:api` | API route tests | Local test DB container |
| `npm run test:gateway` | Gateway/proxy tests | Local test DB container |
| `npm run test:e2e` | CLI E2E — local Docker Desktop k8s | See E2E setup below |
| `npm run test:e2e:gke-dev` | CLI E2E — GKE dev cluster | See E2E setup below |

---

## E2E Test Setup

The CLI-driven E2E tests operate against a real running pgfarm stack. They call
the `pgfarm` CLI binary and verify results via the API and `kubectl`. No internal
service code is imported.

### Prerequisites

All of the following must be in place before running `npm run test:e2e` or
`npm run test:e2e:gke-dev`.

---

### 1. pgfarm CLI logged in

```bash
pgfarm auth login
```

Verify with:

```bash
pgfarm auth status
```

The token must be valid (not expired). The tests fail fast with a clear message
if not logged in.

---

### 2. kubectl context

#### Local (Docker Desktop)

```bash
kubectl config use-context docker-desktop
```

#### GKE dev cluster

```bash
cork-kube init dev
```

---

### 3. pgfarm stack running

#### Local

The pgfarm services must be running and reachable at `http://localhost:30000`.
Refer to the main project README for local stack startup instructions.

#### GKE dev

The dev cluster is always up. No action required beyond `cork-kube init dev`.

---

### 4. Admin DB port-forward (local only)

The E2E reset function connects directly to the pgfarm admin database to clean
test data between runs. For local, port-forward the admin DB before running
tests:

```bash
kubectl port-forward svc/pg-farm-postgres 30544:5432 -n pg-farm
```

Keep this running in a separate terminal while tests execute.

Environment variable overrides (all have defaults for local-dev):

| Variable | Default | Description |
|---|---|---|
| `E2E_ADMIN_DB_HOST` | `localhost` | Admin DB host |
| `E2E_ADMIN_DB_PORT` | `30544` | Admin DB port |
| `E2E_ADMIN_DB_USER` | `postgres` | Admin DB user |
| `E2E_ADMIN_DB_PASSWORD` | `postgres` | Admin DB password |
| `E2E_ADMIN_DB_NAME` | `postgres` | Admin DB database name |

For the GKE dev cluster, set these env vars to match the cluster's admin DB
connection details before running `npm run test:e2e:gke-dev`.

---

### 5. Namespace

The tests use `kubectl` to verify k8s resources (StatefulSets, pod readiness)
in the namespace where pgfarm deploys instances.

| Env variable | Default | Description |
|---|---|---|
| `E2E_K8S_NAMESPACE` | `pg-farm` | Namespace for kubectl verification |

---

## Test Data and Reset

E2E tests use deterministic resource names prefixed with `e2e-` (e.g. `e2e-org`,
`e2e-inst`, `e2e-db`). The `resetE2EData()` helper in `helpers/db.js` deletes
all records matching `e2e-%` from the pgfarm admin database before each test
suite runs, ensuring a clean slate.

There are currently no CLI commands to delete organizations or instances. The
reset function connects directly to the admin DB for cleanup. See
`helpers/db.js:resetE2EData` for the implementation.

**TODO:** Add `pgfarm organization delete` and `pgfarm instance delete` CLI
commands so cleanup can eventually be done through the API rather than direct
DB access.

---

## Environment Variable Reference

| Variable | Local default | GKE dev default | Description |
|---|---|---|---|
| `PGFARM_HOST` | `http://localhost:30000` | `https://dev.pgfarm.library.ucdavis.edu` | pgfarm API base URL |
| `E2E_K8S_NAMESPACE` | `pg-farm` | `pg-farm` | Namespace for kubectl verification |
| `E2E_ADMIN_DB_PORT` | `30544` | *(set explicitly)* | Admin DB port |
| `PGFARM_E2E_TEST_ADMIN_SLEEP` | *(unset)* | *(unset)* | Set to `true` to enable the admin sleep cron test (affects all eligible instances) |
