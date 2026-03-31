-- KeyStone Knowledge Vault — Initial Schema
-- Run with: psql -U $POSTGRES_USER -d $POSTGRES_DB -f 001_initial_schema.sql

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- FOLDERS (hierarchical notebooks)
-- ============================================================
CREATE TABLE IF NOT EXISTS folders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    parent_id   UUID REFERENCES folders(id) ON DELETE CASCADE,
    icon        VARCHAR(50)  DEFAULT '📁',
    sort_order  INTEGER      DEFAULT 0,
    created_at  TIMESTAMPTZ  DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);

-- ============================================================
-- ENTRY TYPE ENUM
-- ============================================================
DO $$ BEGIN
    CREATE TYPE entry_type AS ENUM ('note', 'link', 'secret');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- ENTRIES (notes, links, or AES-256 encrypted secrets)
-- ============================================================
CREATE TABLE IF NOT EXISTS entries (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title             VARCHAR(500)  NOT NULL,
    type              entry_type    NOT NULL DEFAULT 'note',
    -- For type='note': Markdown content
    content           TEXT,
    -- For type='link': URL
    url               VARCHAR(2048),
    -- For type='secret': AES-256-GCM encrypted blob (iv:authTag:ciphertext in hex)
    encrypted_content TEXT,
    folder_id         UUID REFERENCES folders(id) ON DELETE SET NULL,
    is_pinned         BOOLEAN       DEFAULT FALSE,
    sort_order        INTEGER       DEFAULT 0,
    created_at        TIMESTAMPTZ   DEFAULT NOW(),
    updated_at        TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entries_folder   ON entries(folder_id);
CREATE INDEX IF NOT EXISTS idx_entries_type     ON entries(type);
CREATE INDEX IF NOT EXISTS idx_entries_pinned   ON entries(is_pinned) WHERE is_pinned = TRUE;

-- ============================================================
-- TAGS
-- ============================================================
CREATE TABLE IF NOT EXISTS tags (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(100)  NOT NULL,
    color      VARCHAR(7)    DEFAULT '#6366f1',
    created_at TIMESTAMPTZ   DEFAULT NOW(),
    CONSTRAINT uq_tag_name UNIQUE(name)
);

-- ============================================================
-- ENTRY ↔ TAG (many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS entry_tags (
    entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    tag_id   UUID NOT NULL REFERENCES tags(id)    ON DELETE CASCADE,
    PRIMARY KEY (entry_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_entry_tags_tag ON entry_tags(tag_id);

-- ============================================================
-- AUTO-UPDATE updated_at via trigger
-- ============================================================
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_folders_updated_at ON folders;
CREATE TRIGGER set_folders_updated_at
    BEFORE UPDATE ON folders
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS set_entries_updated_at ON entries;
CREATE TRIGGER set_entries_updated_at
    BEFORE UPDATE ON entries
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
