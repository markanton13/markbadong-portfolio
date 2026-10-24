-- DRAFT ONLY. Not registered in the active migrations directory.
-- Rehearse only against a newly-created disposable local D1 database.
-- Dropping the persisted digest is irreversible without a pre-migration backup.

PRAGMA foreign_keys = ON;

DROP INDEX idx_visitor_submissions_hash_created;
ALTER TABLE visitor_submissions DROP COLUMN content_hash;

UPDATE system_settings
SET value_text = '4D.1',
    value_json = NULL,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'migration:0007_remove_unkeyed_intake_content_hash'
WHERE setting_key = 'schema_version';
