# ForgePLM

A self-contained product lifecycle management workspace prototype for small engineering and manufacturing teams.
A self-contained,  product lifecycle management workspace prototype for small engineering and manufacturing teams.

## Included modules

- Product foundation: parts, documents, revisions, owners, and lifecycle state.
- Bill of materials explorer with clickable product structure details.
- Classification foundation for reusable standardized components.
- Change request/order governance with approval states.
- Workflow overview and admin foundations.
- Authenticated Forge Assist hybrid retrieval across parts, BOMs, documents,
  classifications, changes, and workflows.

## Run locally

The workspace is served by a zero-dependency Node.js API backed by SQLite:
No install is needed. Start the application server:

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000). The seeded development account is `admin@forgeplm.local` with password `forgeplm-demo`; the browser demo uses this account automatically. API routes require HTTP Basic authentication and expose CRUD endpoints for parts, change requests, and workflow definitions, plus read APIs for BOM, classifications, and audit events. SQL migrations live in `server/migrations` and run at startup. Released part revisions are immutable through the parts API; a formal change request must be raised before a new revision can be approved.
Open [http://localhost:8000](http://localhost:8000). The application uses in-memory sample data and sessions, so records and sign-ins reset when the server restarts.

## Authentication and access control

Run the authenticated application with:

```bash
npm start
```

The prototype has password sign-in backed by server-side, scrypt-hashed demo credentials. It uses an opaque, `HttpOnly`, `SameSite=Lax` session cookie (eight-hour lifetime) and protects every `/api/*` record endpoint on the server. The five built-in roles map to permissions as follows:

| Role | Permissions |
| --- | --- |
| Engineering Admin | read, create, revise, release, approve, administer |
| Design Engineer | read, create, revise |
| Manufacturing Engineer | read, create, revise, release |
| Quality Reviewer | read, approve |
| Supplier | read |

The sign-in page lists disposable local demo credentials. They are intended only for this self-contained prototype; use a persistent user store, TLS, CSRF protection, rate limiting, and an external OIDC provider before deploying in production.
Open [http://localhost:8000](http://localhost:8000). The application is a front-end prototype with in-memory sample data; it does not yet include a database, user authentication, backend APIs, or production deployment configuration.

## API prototype

Run `npm start` to serve the workspace and its Node.js API. Document requests require an `x-user-id` header. Create a document with `POST /api/documents`, append base64 content through `POST /api/documents/:id/revisions`, inspect it with `GET /api/documents/:id`, and retrieve a protected binary with `GET /api/documents/:id/revisions/:revisionId/download`. Every revision carries a SHA-256 checksum, immutable object version ID, byte count, revision letter, and release status; `POST .../:revisionId/release` is owner-only.

`POST /api/integrations/jobs` accepts CAD metadata imports (`cad.metadata.import`) and ERP item/BOM synchronization (`erp.item.sync`, `erp.bom.sync`). Contracts live in `server/integrations/contracts.js`; jobs record attempt logs, retry with backoff, and expose failures through `GET /api/integrations/jobs/:id`.
Open [http://localhost:8000](http://localhost:8000).

## Search service

Forge Assist searches the `/api/search` endpoint rather than browser-resident
records. The endpoint requires a bearer token, derives groups from the verified
identity (never request headers), and applies the group predicate in the same
database query that ranks results. Every returned result has a record URL,
revision/state metadata, and a reviewed source snippet.

Keyword ranking uses PostgreSQL full-text search. Semantic ranking uses a
locally computed, deterministic embedding stored and queried with pgvector's
cosine-distance operator; the supplied `pgvector` image also creates HNSW and
full-text indexes. No source document or snippet is sent to an AI provider.
Only bounded, reviewed excerpts are indexed, so binary attachments and their
full contents cannot be returned by search.

Use `type=part` or `state=Released` for type/state facets, or a single exact
metadata facet such as `facet=project:NX-200`. Facets are applied before
ranking and after the authorization predicate.

Start the database, install the service dependency, seed the approved example
records, and launch the endpoint:

```bash
docker compose -f docker-compose.search.yml up -d
python3 -m pip install -r backend/requirements.txt
export DATABASE_URL=postgresql://forgeplm:forgeplm@localhost:5432/forgeplm
python3 -m backend.seed
python3 -m backend.server
```

Deploy the static UI and this endpoint behind the same authenticated origin.
The UI expects the normal sign-in layer to inject a short-lived
`window.FORGE_ASSIST_TOKEN`; it intentionally shows no local fallback when a
token or service is unavailable. `demo-engineering-admin` is only a local
development token and must be replaced with OIDC/JWT validation before
deployment.
