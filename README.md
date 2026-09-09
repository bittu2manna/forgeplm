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

No install is needed. Start the application server:

```bash
npm start
```

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
