"""Load reviewed searchable metadata into pgvector.

Run with DATABASE_URL=postgresql://... python -m backend.seed.
"""
from __future__ import annotations

import os
import psycopg

from backend.search import bounded_snippet, local_embedding

RECORDS = [
    {"id":"part:NX-200-014","type":"part","title":"NX-200-014 — Battery housing, 48V","url":"/parts/NX-200-014","revision":"B","state":"Released","snippet":"Aluminum battery housing for the 48V pack. Approved enclosure venting configuration.","facets":{"project":"NX-200","classification":"Mechanical components"},"groups":["engineering","manufacturing"]},
    {"id":"bom:NX-200-001:C","type":"bom","title":"NX-200 Assembly bill of materials","url":"/bom/NX-200-001?revision=C","revision":"C","state":"Released","snippet":"Released structure contains the chassis, motor control board, battery pack, M8 bolts, and washers.","facets":{"project":"NX-200"},"groups":["engineering","manufacturing"]},
    {"id":"document:DOC-1018","type":"document","title":"DOC-1018 — Supplier qualification package","url":"/documents/DOC-1018","revision":"A","state":"In Review","snippet":"Reviewed supplier qualification evidence for the alternate motor supplier. Full attachment remains access controlled.","facets":{"project":"NX-200","document_type":"Supplier evidence"},"groups":["engineering","quality"]},
    {"id":"classification:fasteners","type":"classification","title":"Fasteners classification","url":"/classification/fasteners","revision":None,"state":"Active","snippet":"Standardized mechanical fasteners with ISO, DIN, and ANSI attributes.","facets":{"classification":"Mechanical components"},"groups":["engineering","manufacturing"]},
    {"id":"change:ECR-2026-042","type":"change","title":"ECR-2026-042 — Update battery enclosure venting","url":"/changes/ECR-2026-042","revision":"A","state":"In Review","snippet":"Engineering change request evaluating battery enclosure venting impacts and approvals.","facets":{"project":"NX-200","change_type":"Engineering Change"},"groups":["engineering","quality"]},
    {"id":"workflow:engineering-change","type":"workflow","title":"Engineering Change workflow","url":"/workflows/engineering-change","revision":"v3","state":"Active","snippet":"Workflow evaluates change impacts, routes reviewers, and controls implementation evidence.","facets":{"process":"Change management"},"groups":["engineering","quality","manufacturing"]},
    {"id":"document:SEC-900","type":"document","title":"SEC-900 — Restricted supplier pricing","url":"/documents/SEC-900","revision":"A","state":"Released","snippet":"Restricted commercial document. This record must never appear for standard engineering users.","facets":{"document_type":"Commercial"},"groups":["procurement-restricted"]},
]

UPSERT = """
INSERT INTO search_records (id, record_type, title, record_url, revision, lifecycle_state,
 source_snippet, keywords, facets, allowed_groups, embedding)
VALUES (%(id)s, %(type)s, %(title)s, %(url)s, %(revision)s, %(state)s, %(snippet)s,
 to_tsvector('english', %(search_text)s), %(facets)s::jsonb, %(groups)s, %(embedding)s::vector)
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, record_url=EXCLUDED.record_url,
 revision=EXCLUDED.revision, lifecycle_state=EXCLUDED.lifecycle_state,
 source_snippet=EXCLUDED.source_snippet, keywords=EXCLUDED.keywords, facets=EXCLUDED.facets,
 allowed_groups=EXCLUDED.allowed_groups, embedding=EXCLUDED.embedding, updated_at=now();
"""

def main() -> None:
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        with conn.cursor() as cursor:
            for record in RECORDS:
                record = record.copy()
                record["snippet"] = bounded_snippet(record["snippet"])
                record["search_text"] = " ".join(filter(None, [record["title"], record["snippet"], " ".join(record["facets"].values())]))
                record["embedding"] = str(local_embedding(record["search_text"]))
                cursor.execute(UPSERT, record)

if __name__ == "__main__":
    main()
