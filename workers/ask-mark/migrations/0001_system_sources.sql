PRAGMA foreign_keys = ON;

CREATE TABLE system_settings (
    setting_key TEXT PRIMARY KEY,
    value_text TEXT,
    value_json TEXT,
    updated_at TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    CHECK (
        (value_text IS NOT NULL AND value_json IS NULL)
        OR
        (value_text IS NULL AND value_json IS NOT NULL)
    )
);

CREATE TABLE source_records (
    id TEXT PRIMARY KEY,
    source_key TEXT NOT NULL UNIQUE,
    source_type TEXT NOT NULL CHECK (
        source_type IN (
            'portfolio',
            'resume',
            'master_career_profile',
            'testimonial_archive',
            'contact',
            'metadata',
            'manual_approved'
        )
    ),
    title TEXT NOT NULL,
    canonical_location TEXT,
    trust_level INTEGER NOT NULL DEFAULT 100 CHECK (
        trust_level BETWEEN 0 AND 100
    ),
    sync_mode TEXT NOT NULL DEFAULT 'manual' CHECK (
        sync_mode IN ('manual', 'import', 'generated', 'external_task')
    ),
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (
        visibility IN ('public', 'private', 'internal')
    ),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL
);

CREATE TABLE source_snapshots (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    version_label TEXT,
    content_hash TEXT NOT NULL,
    content_text TEXT,
    metadata_json TEXT,
    captured_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    FOREIGN KEY (source_id) REFERENCES source_records(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    UNIQUE (source_id, content_hash)
);

CREATE INDEX idx_source_records_type_active
    ON source_records (source_type, is_active);

CREATE INDEX idx_source_snapshots_source_captured
    ON source_snapshots (source_id, captured_at DESC);

CREATE INDEX idx_source_snapshots_hash
    ON source_snapshots (content_hash);
