# ForgePLM

A self-contained product lifecycle management workspace prototype for small engineering and manufacturing teams.
A self-contained, Teamcenter-inspired product lifecycle management workspace prototype for small engineering and manufacturing teams.

## Included modules

- Product foundation: parts, documents, revisions, owners, and lifecycle state.
- Bill of materials explorer with clickable product structure details.
- Classification foundation for reusable standardized components.
- Change request/order governance with approval states.
- Workflow overview and admin foundations.
- Authenticated Forge Assist hybrid retrieval across parts, BOMs, documents,
  classifications, changes, and workflows.

## Run locally

No install or build is needed. Serve the directory with any static server:

```bash
python3 -m http.server 8000
```

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
