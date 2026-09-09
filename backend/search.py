"""Security-first indexing and hybrid retrieval helpers.

Embeddings are calculated locally from already-authorized index text. This module
does not call an AI provider and deliberately keeps document binary content out
of the index; callers supply a reviewed, bounded text snippet instead.
"""
from __future__ import annotations

import hashlib
import math
import re
from dataclasses import dataclass
from typing import Iterable

VECTOR_DIMENSIONS = 96
TOKEN_RE = re.compile(r"[a-z0-9][a-z0-9-]*", re.I)


@dataclass(frozen=True)
class Principal:
    subject: str
    groups: tuple[str, ...]


def local_embedding(text: str) -> list[float]:
    """Create a stable local hashed embedding suitable for the demo index."""
    values = [0.0] * VECTOR_DIMENSIONS
    for token in TOKEN_RE.findall(text.lower()):
        digest = hashlib.blake2b(token.encode(), digest_size=8).digest()
        slot = int.from_bytes(digest[:4], "big") % VECTOR_DIMENSIONS
        values[slot] += 1 if digest[4] & 1 else -1
    length = math.sqrt(sum(value * value for value in values)) or 1.0
    return [round(value / length, 7) for value in values]


def can_read(principal: Principal, allowed_groups: Iterable[str]) -> bool:
    """Deny by default; a record needs at least one group in common."""
    return bool(set(principal.groups).intersection(allowed_groups))


def bounded_snippet(text: str, limit: int = 360) -> str:
    """Normalize a reviewed excerpt before exposing it in a search response."""
    return " ".join(text.split())[:limit]
