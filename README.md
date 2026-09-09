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

The workspace is served by a zero-dependency Node.js API backed by SQLite:

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000). The seeded development account is `admin@forgeplm.local` with password `forgeplm-demo`; the browser demo uses this account automatically. API routes require HTTP Basic authentication and expose CRUD endpoints for parts, change requests, and workflow definitions, plus read APIs for BOM, classifications, and audit events. SQL migrations live in `server/migrations` and run at startup. Released part revisions are immutable through the parts API; a formal change request must be raised before a new revision can be approved.
