# ForgePLM

A self-contained, Teamcenter-inspired product lifecycle management workspace prototype for small engineering and manufacturing teams.

## Included modules

- Product foundation: parts, documents, revisions, owners, and lifecycle state.
- Bill of materials explorer with clickable product structure details.
- Classification foundation for reusable standardized components.
- Change request/order governance with approval states.
- Workflow overview and admin foundations.
- Local “Forge Assist” semantic-style lookup across example part records.

## Run locally

No install or build is needed. Serve the directory with any static server:

```bash
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000). The application is a front-end prototype with in-memory sample data; it does not yet include a database, user authentication, backend APIs, or production deployment configuration.

## API prototype

Run `npm start` to serve the workspace and its Node.js API. Document requests require an `x-user-id` header. Create a document with `POST /api/documents`, append base64 content through `POST /api/documents/:id/revisions`, inspect it with `GET /api/documents/:id`, and retrieve a protected binary with `GET /api/documents/:id/revisions/:revisionId/download`. Every revision carries a SHA-256 checksum, immutable object version ID, byte count, revision letter, and release status; `POST .../:revisionId/release` is owner-only.

`POST /api/integrations/jobs` accepts CAD metadata imports (`cad.metadata.import`) and ERP item/BOM synchronization (`erp.item.sync`, `erp.bom.sync`). Contracts live in `server/integrations/contracts.js`; jobs record attempt logs, retry with backoff, and expose failures through `GET /api/integrations/jobs/:id`.
