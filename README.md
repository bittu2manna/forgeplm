# ForgePLM

A self-contained product lifecycle management workspace prototype for small engineering and manufacturing teams.

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
