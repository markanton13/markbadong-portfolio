PRAGMA foreign_keys = ON;

CREATE TABLE knowledge_items (
    id TEXT PRIMARY KEY,
    item_key TEXT NOT NULL UNIQUE,
    kind TEXT NOT NULL CHECK (
        kind IN (
            'fact',
            'experience',
            'project',
            'skill',
            'credential',
            'education',
            'working_style',
            'role_classification',
            'privacy_boundary',
            'unsupported_boundary',
            'faq',
            'action',
            'contact',
            'testimonial'
        )
    ),
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'public' CHECK (
        visibility IN ('public', 'private', 'internal')
    ),
    sensitivity TEXT NOT NULL DEFAULT 'normal' CHECK (
        sensitivity IN ('normal', 'restricted', 'private')
    ),
    lifecycle_status TEXT NOT NULL DEFAULT 'active' CHECK (
        lifecycle_status IN ('active', 'deprecated', 'archived')
    ),
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL
);

CREATE TABLE knowledge_versions (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    version_no INTEGER NOT NULL CHECK (version_no > 0),
    content_text TEXT NOT NULL,
    payload_json TEXT,
    answer_template TEXT,
    language TEXT NOT NULL DEFAULT 'en',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (
        status IN (
            'draft',
            'in_review',
            'approved',
            'rejected',
            'superseded',
            'archived'
        )
    ),
    change_reason TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    approved_by TEXT,
    approved_at TEXT,
    supersedes_version_id TEXT,
    content_hash TEXT NOT NULL,
    FOREIGN KEY (item_id) REFERENCES knowledge_items(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    FOREIGN KEY (supersedes_version_id) REFERENCES knowledge_versions(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    UNIQUE (item_id, version_no),
    UNIQUE (item_id, content_hash)
);

CREATE TABLE knowledge_provenance (
    id TEXT PRIMARY KEY,
    knowledge_version_id TEXT NOT NULL,
    source_snapshot_id TEXT NOT NULL,
    evidence_type TEXT NOT NULL DEFAULT 'supports' CHECK (
        evidence_type IN ('supports', 'quotes', 'derives_from', 'supersedes')
    ),
    evidence_note TEXT,
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    FOREIGN KEY (knowledge_version_id) REFERENCES knowledge_versions(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (source_snapshot_id) REFERENCES source_snapshots(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    UNIQUE (knowledge_version_id, source_snapshot_id, evidence_type)
);

CREATE TABLE knowledge_match_terms (
    id TEXT PRIMARY KEY,
    knowledge_item_id TEXT NOT NULL,
    term TEXT NOT NULL,
    normalized_term TEXT NOT NULL,
    match_mode TEXT NOT NULL CHECK (
        match_mode IN ('exact', 'phrase', 'whole_word', 'prefix')
    ),
    weight INTEGER NOT NULL DEFAULT 100 CHECK (
        weight BETWEEN 0 AND 1000
    ),
    is_negative INTEGER NOT NULL DEFAULT 0 CHECK (is_negative IN (0, 1)),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    FOREIGN KEY (knowledge_item_id) REFERENCES knowledge_items(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    UNIQUE (
        knowledge_item_id,
        normalized_term,
        match_mode,
        is_negative
    )
);

CREATE TABLE knowledge_relations (
    id TEXT PRIMARY KEY,
    from_item_id TEXT NOT NULL,
    to_item_id TEXT NOT NULL,
    relation_type TEXT NOT NULL CHECK (
        relation_type IN (
            'related_to',
            'supports',
            'part_of',
            'follow_up',
            'conflicts_with',
            'replaces'
        )
    ),
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    FOREIGN KEY (from_item_id) REFERENCES knowledge_items(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (to_item_id) REFERENCES knowledge_items(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CHECK (from_item_id <> to_item_id),
    UNIQUE (from_item_id, to_item_id, relation_type)
);

CREATE INDEX idx_knowledge_items_kind_category_status
    ON knowledge_items (kind, category, lifecycle_status);

CREATE INDEX idx_knowledge_versions_item_version
    ON knowledge_versions (item_id, version_no DESC);

CREATE INDEX idx_knowledge_versions_status_approved
    ON knowledge_versions (status, approved_at DESC);

CREATE INDEX idx_knowledge_versions_hash
    ON knowledge_versions (content_hash);

CREATE INDEX idx_knowledge_provenance_version
    ON knowledge_provenance (knowledge_version_id);

CREATE INDEX idx_knowledge_provenance_source
    ON knowledge_provenance (source_snapshot_id);

CREATE INDEX idx_knowledge_match_terms_lookup
    ON knowledge_match_terms (
        normalized_term,
        match_mode,
        is_negative,
        is_active
    );

CREATE INDEX idx_knowledge_relations_from
    ON knowledge_relations (from_item_id, relation_type);

CREATE INDEX idx_knowledge_relations_to
    ON knowledge_relations (to_item_id, relation_type);
