-- SQLite cannot add a constrained FK in place; this index documents and accelerates current revision lookups.
CREATE INDEX IF NOT EXISTS idx_parts_current_revision ON parts(current_revision_id);
CREATE INDEX IF NOT EXISTS idx_part_revisions_part ON part_revisions(part_id);
CREATE INDEX IF NOT EXISTS idx_bom_lines_assembly ON bom_lines(assembly_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events(entity_type, entity_id, created_at);
