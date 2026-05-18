# PG Farm Test Suite — Implementation Plan

## Stack
- **Runner:** Mocha + Chai
- **HTTP:** Supertest (against Express app directly)
- **Stubs:** Sinon (for kubectl/K8s calls in lower layers)
- **K8s:** Docker Desktop Kubernetes, `pgfarm-test` namespace
- **Admin DB:** testcontainers-node (PostgreSQL container per test run)
- **GCS (backups):** fake-gcs-server (`fsouza/fake-gcs-server` Docker image)
- **Auth:** Mint test JWTs locally using `jsonwebtoken.sign()` — no real Keycloak needed

## Directory Layout
```
tests/
├── PLAN.md               ← this file
├── package.json          ← mocha, chai, supertest, sinon, testcontainers
├── .mocharc.yml          ← timeout, recursive, exit
├── helpers/
│   ├── auth.js           ← mint JWTs for each role (user, org-admin, pgfarm-admin)
│   ├── db.js             ← start/stop admin DB container, run migrations/schema
│   ├── fixtures.js       ← seed org/instance/database records
│   ├── app.js            ← bootstrap administration Express app for Supertest
│   └── k8s.js            ← namespace create/teardown, apply/delete manifests
├── unit/
│   ├── grant-definitions.test.js
│   ├── connect-examples.test.js
│   ├── config.test.js
│   └── context.test.js
├── integration/          ← admin DB in Docker, kubectl stubbed with sinon
│   ├── organization.test.js
│   ├── instance.test.js
│   ├── database.test.js
│   ├── user.test.js
│   ├── backup.test.js
│   └── admin.test.js
├── api/                  ← full Express app + real admin DB, HTTP via supertest
│   ├── auth.test.js
│   ├── organization-api.test.js
│   ├── instance-api.test.js
│   ├── database-api.test.js
│   ├── user-api.test.js
│   └── admin-api.test.js
├── gateway/              ← gateway service, TCP + HTTP routing
│   ├── http-routing.test.js
│   ├── pg-proxy.test.js
│   └── cidr-deny.test.js
└── e2e/                  ← full stack, Docker Desktop K8s, pgfarm-test namespace
    ├── lifecycle.test.js
    ├── access.test.js
    ├── backup.test.js
    └── api-exposure.test.js
```

## CLI Coverage Checklist
These CLI commands define what must have test coverage.

### auth
- [ ] `pgfarm auth login` — JWT validation, 401 on bad/missing token
- [ ] `pgfarm auth service-account-login` — POST /auth/service-account/login
- [ ] `pgfarm auth logout`
- [ ] `pgfarm auth status`

### organization
- [ ] `pgfarm organization create` — POST /api/organization (admin only)
- [ ] `pgfarm organization get <org>` — GET /api/organization/:org
- [ ] `pgfarm organization update <org>` — PATCH /api/organization/:org (org-admin)
- [ ] `pgfarm organization users <org>` — GET /api/organization/:org/users

### instance
- [ ] `pgfarm instance list` — GET /api/instance
- [ ] `pgfarm instance get <org/instance>` — GET /api/instance/:org/:instance
- [ ] `pgfarm instance add-user` — PUT /api/instance/:org/:instance/user/:user
- [ ] `pgfarm instance update-user` — change user type
- [ ] `pgfarm instance delete-user` — remove user
- [ ] `pgfarm instance start <org/instance>` — triggers K8s scale-up

### database
- [ ] `pgfarm database get <org/db>` — GET /api/db/:org/:db
- [ ] `pgfarm database search` — GET/POST /api/db/search
- [ ] `pgfarm database update <org/db>` — PATCH /api/db/:org/:db
- [ ] `pgfarm database show` — schemas, tables, users overview
- [ ] `pgfarm database set-access` — grant/revoke per schema/user/permission
- [ ] `pgfarm database link` — POST /api/db/:org/:db/link (FDW)

### admin
- [ ] `pgfarm admin connections` — GET /api/admin/connections
- [ ] `pgfarm admin connection-log` — GET /api/admin/connection-log/:sessionId
- [ ] `pgfarm admin sleep` — GET /api/admin/sleep-instances
- [ ] `pgfarm admin update-user-iam-profile` — PUT /api/admin/ucd-iam-profile/:username

### connect
- [ ] `pgfarm connect` — connection string generation for psql, Python, Node, JDBC

## Implementation Phases

### Phase 1 — Scaffolding [x]
- [x] Create `tests/package.json` with all dev dependencies
- [x] Create `.mocharc.yml`
- [x] Write `helpers/auth.js` — keycloak stub (no OIDC/Keycloak needed)
- [x] Write `helpers/db.js` — docker compose postgres on port 15432
- [x] Write `helpers/compose.test.yml` — test postgres container
- [x] Write `helpers/hooks.js` — global before/after for DB start/stop
- [x] Write `helpers/fixtures.js` — seed data helpers
- [x] Write `helpers/app.js` — Express app for supertest (no listen)
- [x] Write `helpers/env.cjs` — env vars set before ESM imports
- [x] Add `test` script to `services/package.json`

### Phase 2 — Unit Tests [x]
- [x] `unit/grant-definitions.test.js`
- [x] `unit/connect-examples.test.js`
- [x] `unit/config.test.js`
- [x] `unit/context.test.js`

### Phase 3 — Model Integration Tests [x]
- [x] `integration/organization.test.js` — 15/15 passing
- [x] `integration/instance.test.js` — 29/29 passing
- [x] `integration/database.test.js` — 16/16 passing
- [x] `integration/user.test.js` — 14/14 passing
- [ ] `integration/backup.test.js` — skipped (requires GCS / fake-gcs-server)
- [x] `integration/admin.test.js` — 7/7 passing (sleepInstances omitted: calls kubectl unconditionally)

### Phase 4 — API Tests [x]
- [x] `helpers/app.js` — bootstrap Express for supertest
- [x] `api/organization-api.test.js` — 11/11 passing (search, create, get, patch, users, is-admin, logo)
- [x] `api/instance-api.test.js` — 11/11 passing (list, get, priority, user-type-update, auth gates)
- [x] `api/database-api.test.js` — 13/13 passing (search, aggregations, get, patch, is-admin)
- [x] `api/admin-api.test.js` — 5/5 passing (connections, connection-log, auth gate)
- [x] `api/user-api.test.js` — 6/6 passing (me, me/db)
- Note: auth.test.js omitted — keycloak token issuance requires a real OIDC server; tested indirectly via stub
- Note: routes requiring live pg instance (isInstanceAlive without useAliveFlag) covered by E2E tests

### Phase 5 — Gateway Tests [x]
- [x] `gateway/cidr-deny.test.js` — 11/11 passing (env var list, file list, ::ffff: normalization, enabled:false)
- [x] `gateway/http-routing.test.js` — 20/20 passing (dbRouteRegex, swaggerUiRouteRegex, adminRoutes, swagger domain validation)
- [x] `gateway/pg-proxy.test.js` — 8/8 passing (getSessionId, registerConnection, multi-socket session, close cleanup)
- Note: bug found and fixed in cidr-deny.js — cleanList regex used capturing group causing commas to appear as CIDR entries
- Note: archived-DB 503 path and start-instance path require E2E (live K8s); covered in Phase 6

### Phase 6 — E2E (Docker Desktop K8s) [ ]
- [ ] `helpers/k8s.js` — namespace setup, manifest apply
- [ ] `e2e/lifecycle.test.js` — create org → instance → db → connect → sleep → wake
- [ ] `e2e/access.test.js` — grant/revoke, verify real pg connection works/fails
- [ ] `e2e/backup.test.js` — backup → archive → restore (fake-gcs-server)
- [ ] `e2e/api-exposure.test.js` — expose table → PostgREST endpoint responds

## Notes
- Phases 2–4 can run without K8s (kubectl stubbed via sinon)
- Phase 6 requires Docker Desktop K8s with `pgfarm-test` namespace
- Auth: no real Keycloak needed — sign JWTs locally with `JWT_SECRET` env var
- GCS: `fsouza/fake-gcs-server` Docker container, point `@google-cloud/storage` at it via `apiEndpoint`
- Keep test DB state isolated: each test file should create/drop its own fixtures in `before`/`after` hooks
