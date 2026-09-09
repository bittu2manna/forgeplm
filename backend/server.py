"""Authenticated hybrid-search API for Forge Assist."""
from __future__ import annotations

import json
import os
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

import psycopg

from backend.search import Principal, local_embedding

# Replace this demo verifier with the deployment's OIDC/JWT verification. Never
# accept a client-provided group header: authorization comes from the token only.
DEMO_TOKENS = {"demo-engineering-admin": Principal("alex.morgan", ("engineering", "quality"))}

SEARCH_SQL = """
WITH permitted AS (
  SELECT *, ts_rank_cd(keywords, websearch_to_tsquery('english', %(query)s)) AS keyword_score,
    1 - (embedding <=> %(embedding)s::vector) AS semantic_score
  FROM search_records
  WHERE allowed_groups && %(groups)s::text[]
    AND (%(types)s::text[] IS NULL OR record_type = ANY(%(types)s::text[]))
    AND (%(state)s IS NULL OR lifecycle_state = %(state)s)
    AND (%(facet)s::jsonb IS NULL OR facets @> %(facet)s::jsonb)
)
SELECT id, record_type, title, record_url, revision, lifecycle_state, source_snippet, facets,
  keyword_score, semantic_score, (0.55 * keyword_score + 0.45 * semantic_score) AS score
FROM permitted
WHERE keyword_score > 0 OR semantic_score >= 0.18
ORDER BY score DESC, updated_at DESC LIMIT 20;
"""

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        return

    def respond(self, status: int, payload: dict) -> None:
        data = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:
        if self.path.split("?", 1)[0] != "/api/search":
            self.respond(HTTPStatus.NOT_FOUND, {"error": "not_found"}); return
        token = self.headers.get("Authorization", "").removeprefix("Bearer ")
        principal = DEMO_TOKENS.get(token)
        if not principal:
            self.respond(HTTPStatus.UNAUTHORIZED, {"error": "authentication_required"}); return
        params = parse_qs(urlparse(self.path).query)
        query = params.get("q", [""])[0].strip()
        if not query or len(query) > 300:
            self.respond(HTTPStatus.BAD_REQUEST, {"error": "q_must_be_1_to_300_characters"}); return
        types = [value for value in params.get("type", []) if value in {"part", "bom", "document", "classification", "change", "workflow"}]
        state = params.get("state", [None])[0]
        facet = params.get("facet", [None])[0]
        # A facet is one exact key:value pair (for example project:NX-200).
        # Converting it to JSON here keeps the SQL parameterized and prevents
        # clients from supplying arbitrary JSON query expressions.
        if facet:
            key, separator, value = facet.partition(":")
            if not separator or not key or not value or len(key) > 64 or len(value) > 128:
                self.respond(HTTPStatus.BAD_REQUEST, {"error": "facet_must_be_key_value"}); return
            facet = json.dumps({key: value})
        try:
            with psycopg.connect(os.environ["DATABASE_URL"], row_factory=psycopg.rows.dict_row) as conn:
                with conn.cursor() as cursor:
                    cursor.execute(SEARCH_SQL, {"query": query, "embedding": str(local_embedding(query)), "groups": list(principal.groups), "types": types or None, "state": state, "facet": facet})
                    results = cursor.fetchall()
        except (KeyError, psycopg.Error):
            self.respond(HTTPStatus.SERVICE_UNAVAILABLE, {"error": "search_unavailable"}); return
        self.respond(HTTPStatus.OK, {"query": query, "mode": "hybrid", "results": results,
          "facets": {"record_type": sorted({row["record_type"] for row in results}), "state": sorted({row["lifecycle_state"] for row in results})}})

if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", int(os.getenv("PORT", "8080"))), Handler).serve_forever()
