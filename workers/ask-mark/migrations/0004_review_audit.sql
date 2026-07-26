PRAGMA foreign_keys = ON;

CREATE TABLE review_decisions (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (
        entity_type IN (
            'knowledge_version',
            'publication_release',
            'source_snapshot'
        )
    ),
    entity_id TEXT NOT NULL,
    decision TEXT NOT NULL CHECK (
        decision IN (
            'approve',
            'reject',
            'request_changes',
            'keep_private',
            'publish',
            'rollback',
            'mark_false_positive'
        )
    ),
    review_reason TEXT,
    previous_state TEXT,
    resulting_state TEXT,
    decided_at TEXT NOT NULL,
    decided_by TEXT NOT NULL
);

CREATE TABLE audit_events (
    id TEXT PRIMARY KEY,
    actor_type TEXT NOT NULL DEFAULT 'admin' CHECK (
        actor_type IN ('admin', 'system', 'migration', 'sync_job')
    ),
    actor_id TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    before_json TEXT,
    after_json TEXT,
    metadata_json TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX idx_review_decisions_entity
    ON review_decisions (entity_type, entity_id, decided_at DESC);

CREATE INDEX idx_review_decisions_decision
    ON review_decisions (decision, decided_at DESC);

CREATE INDEX idx_audit_events_entity
    ON audit_events (entity_type, entity_id, created_at DESC);

CREATE INDEX idx_audit_events_actor
    ON audit_events (actor_type, actor_id, created_at DESC);

INSERT INTO system_settings (
    setting_key,
    value_text,
    value_json,
    updated_at,
    updated_by
) VALUES (
    'schema_version',
    '2A.1',
    NULL,
    CURRENT_TIMESTAMP,
    'migration:0004_review_audit'
)
ON CONFLICT(setting_key) DO UPDATE SET
    value_text = excluded.value_text,
    value_json = NULL,
    updated_at = excluded.updated_at,
    updated_by = excluded.updated_by;
