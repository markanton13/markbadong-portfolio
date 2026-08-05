PRAGMA foreign_keys = ON;

CREATE TABLE visitor_submission_events_v4c (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (
        event_type IN (
            'received',
            'queued_for_review',
            'approved',
            'rejected',
            'archived',
            'reopened'
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
            'local_test',
            'admin'
        )
    ),
    actor_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (submission_id) REFERENCES visitor_submissions(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

INSERT INTO visitor_submission_events_v4c (
    id,
    submission_id,
    event_type,
    previous_status,
    resulting_status,
    reason_code,
    actor_type,
    actor_id,
    created_at
)
SELECT
    id,
    submission_id,
    event_type,
    previous_status,
    resulting_status,
    reason_code,
    actor_type,
    actor_id,
    created_at
FROM visitor_submission_events;

DROP TABLE visitor_submission_events;

ALTER TABLE visitor_submission_events_v4c
    RENAME TO visitor_submission_events;

CREATE INDEX idx_visitor_submission_events_submission_created
    ON visitor_submission_events (submission_id, created_at ASC);

CREATE TABLE visitor_submission_moderation_actions (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (
        action_type IN (
            'approve',
            'reject',
            'archive',
            'reopen'
        )
    ),
    previous_status TEXT NOT NULL CHECK (
        previous_status IN (
            'pending_review',
            'approved',
            'rejected',
            'archived'
        )
    ),
    resulting_status TEXT NOT NULL CHECK (
        resulting_status IN (
            'pending_review',
            'approved',
            'rejected',
            'archived'
        )
    ),
    reason_code TEXT NOT NULL,
    note_text TEXT CHECK (
        note_text IS NULL
        OR length(note_text) BETWEEN 1 AND 1000
    ),
    actor_id TEXT NOT NULL CHECK (
        length(actor_id) BETWEEN 1 AND 100
    ),
    created_at TEXT NOT NULL,
    CHECK (
        (
            action_type = 'approve'
            AND previous_status = 'pending_review'
            AND resulting_status = 'approved'
            AND reason_code IN (
                'useful_question',
                'valid_correction',
                'helpful_feedback',
                'other'
            )
        )
        OR (
            action_type = 'reject'
            AND previous_status = 'pending_review'
            AND resulting_status = 'rejected'
            AND reason_code IN (
                'duplicate',
                'not_relevant',
                'unsafe_or_abusive',
                'contains_sensitive_data',
                'not_actionable',
                'other'
            )
        )
        OR (
            action_type = 'archive'
            AND previous_status IN (
                'pending_review',
                'approved',
                'rejected'
            )
            AND resulting_status = 'archived'
            AND reason_code IN (
                'resolved',
                'retention_cleanup',
                'other'
            )
        )
        OR (
            action_type = 'reopen'
            AND previous_status IN (
                'approved',
                'rejected',
                'archived'
            )
            AND resulting_status = 'pending_review'
            AND reason_code IN (
                'needs_reconsideration',
                'other'
            )
        )
    ),
    FOREIGN KEY (submission_id) REFERENCES visitor_submissions(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE INDEX idx_visitor_submission_moderation_submission_created
    ON visitor_submission_moderation_actions (
        submission_id,
        created_at ASC
    );

CREATE INDEX idx_visitor_submission_moderation_action_created
    ON visitor_submission_moderation_actions (
        action_type,
        created_at DESC
    );

CREATE INDEX idx_visitor_submission_moderation_actor_created
    ON visitor_submission_moderation_actions (
        actor_id,
        created_at DESC
    );

INSERT INTO system_settings (
    setting_key,
    value_text,
    value_json,
    updated_at,
    updated_by
) VALUES (
    'schema_version',
    '4C.1',
    NULL,
    CURRENT_TIMESTAMP,
    'migration:0006_private_moderation'
)
ON CONFLICT(setting_key) DO UPDATE SET
    value_text = excluded.value_text,
    value_json = NULL,
    updated_at = excluded.updated_at,
    updated_by = excluded.updated_by;
