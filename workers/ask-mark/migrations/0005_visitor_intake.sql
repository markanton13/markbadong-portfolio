PRAGMA foreign_keys = ON;

CREATE TABLE visitor_submissions (
    id TEXT PRIMARY KEY,
    submission_type TEXT NOT NULL CHECK (
        submission_type IN (
            'question',
            'correction',
            'feedback'
        )
    ),
    language TEXT NOT NULL CHECK (
        language IN (
            'en',
            'tl',
            'taglish'
        )
    ),
    content_text TEXT NOT NULL CHECK (
        length(content_text) BETWEEN 10 AND 1000
    ),
    content_hash TEXT NOT NULL CHECK (
        length(content_hash) = 64
    ),
    deduplication_hash TEXT NOT NULL CHECK (
        length(deduplication_hash) = 64
    ),
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (
        status IN (
            'received',
            'pending_review',
            'approved',
            'rejected',
            'archived'
        )
    ),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    CHECK (updated_at >= created_at),
    CHECK (expires_at > created_at),
    UNIQUE (deduplication_hash)
);

CREATE TABLE visitor_submission_events (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (
        event_type IN (
            'received',
            'queued_for_review',
            'approved',
            'rejected',
            'archived'
        )
    ),
    previous_status TEXT CHECK (
        previous_status IS NULL
        OR previous_status IN (
            'received',
            'pending_review',
            'approved',
            'rejected',
            'archived'
        )
    ),
    resulting_status TEXT NOT NULL CHECK (
        resulting_status IN (
            'received',
            'pending_review',
            'approved',
            'rejected',
            'archived'
        )
    ),
    reason_code TEXT,
    actor_type TEXT NOT NULL CHECK (
        actor_type IN (
            'system',
            'local_test'
        )
    ),
    actor_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (submission_id) REFERENCES visitor_submissions(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE TABLE visitor_rate_limit_buckets (
    bucket_hash TEXT NOT NULL CHECK (
        length(bucket_hash) = 64
    ),
    window_started_at TEXT NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0 CHECK (
        request_count BETWEEN 0 AND 5
    ),
    expires_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (bucket_hash, window_started_at),
    CHECK (expires_at > window_started_at),
    CHECK (updated_at >= window_started_at)
);

CREATE INDEX idx_visitor_submissions_status_created
    ON visitor_submissions (status, created_at DESC);

CREATE INDEX idx_visitor_submissions_expiry
    ON visitor_submissions (expires_at);

CREATE INDEX idx_visitor_submissions_hash_created
    ON visitor_submissions (content_hash, created_at DESC);

CREATE INDEX idx_visitor_submissions_type_language_created
    ON visitor_submissions (
        submission_type,
        language,
        created_at DESC
    );

CREATE INDEX idx_visitor_submission_events_submission_created
    ON visitor_submission_events (submission_id, created_at ASC);

CREATE INDEX idx_visitor_rate_limit_buckets_expiry
    ON visitor_rate_limit_buckets (expires_at);

INSERT INTO system_settings (
    setting_key,
    value_text,
    value_json,
    updated_at,
    updated_by
) VALUES (
    'schema_version',
    '4A.1',
    NULL,
    CURRENT_TIMESTAMP,
    'migration:0005_visitor_intake'
)
ON CONFLICT(setting_key) DO UPDATE SET
    value_text = excluded.value_text,
    value_json = NULL,
    updated_at = excluded.updated_at,
    updated_by = excluded.updated_by;
