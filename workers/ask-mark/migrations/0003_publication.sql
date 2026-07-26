PRAGMA foreign_keys = ON;

CREATE TABLE publication_releases (
    id TEXT PRIMARY KEY,
    release_no INTEGER NOT NULL UNIQUE CHECK (release_no > 0),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (
        status IN (
            'draft',
            'validated',
            'published',
            'superseded',
            'rolled_back',
            'archived'
        )
    ),
    title TEXT NOT NULL,
    release_notes TEXT,
    parent_release_id TEXT,
    rollback_of_release_id TEXT,
    knowledge_count INTEGER NOT NULL DEFAULT 0 CHECK (
        knowledge_count >= 0
    ),
    content_hash TEXT,
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    validated_at TEXT,
    validated_by TEXT,
    published_at TEXT,
    published_by TEXT,
    FOREIGN KEY (parent_release_id) REFERENCES publication_releases(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    FOREIGN KEY (rollback_of_release_id) REFERENCES publication_releases(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE publication_release_items (
    release_id TEXT NOT NULL,
    knowledge_item_id TEXT NOT NULL,
    knowledge_version_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    added_at TEXT NOT NULL,
    added_by TEXT NOT NULL,
    PRIMARY KEY (release_id, knowledge_item_id),
    FOREIGN KEY (release_id) REFERENCES publication_releases(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (knowledge_item_id) REFERENCES knowledge_items(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    FOREIGN KEY (knowledge_version_id) REFERENCES knowledge_versions(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE publication_events (
    id TEXT PRIMARY KEY,
    release_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (
        event_type IN (
            'created',
            'validation_started',
            'validation_passed',
            'validation_failed',
            'published',
            'superseded',
            'rollback_started',
            'rollback_completed',
            'rollback_failed',
            'cache_invalidated'
        )
    ),
    event_status TEXT NOT NULL DEFAULT 'success' CHECK (
        event_status IN ('pending', 'success', 'failure')
    ),
    details_json TEXT,
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    FOREIGN KEY (release_id) REFERENCES publication_releases(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE INDEX idx_publication_releases_status_no
    ON publication_releases (status, release_no DESC);

CREATE INDEX idx_publication_release_items_version
    ON publication_release_items (knowledge_version_id);

CREATE INDEX idx_publication_events_release_created
    ON publication_events (release_id, created_at DESC);

CREATE VIEW v_active_knowledge AS
SELECT
    pri.release_id,
    ki.id AS knowledge_item_id,
    ki.item_key,
    ki.kind,
    ki.category,
    ki.title,
    ki.visibility,
    ki.sensitivity,
    kv.id AS knowledge_version_id,
    kv.version_no,
    kv.content_text,
    kv.payload_json,
    kv.answer_template,
    kv.language,
    kv.content_hash,
    pri.sort_order
FROM system_settings AS ss
JOIN publication_releases AS pr
    ON pr.id = ss.value_text
JOIN publication_release_items AS pri
    ON pri.release_id = pr.id
JOIN knowledge_items AS ki
    ON ki.id = pri.knowledge_item_id
JOIN knowledge_versions AS kv
    ON kv.id = pri.knowledge_version_id
WHERE ss.setting_key = 'active_release_id'
  AND ss.value_text IS NOT NULL
  AND pr.status = 'published'
  AND ki.lifecycle_status = 'active'
  AND ki.visibility = 'public'
  AND kv.status IN ('approved', 'superseded');
