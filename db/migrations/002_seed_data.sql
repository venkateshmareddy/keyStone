-- KeyStone Knowledge Vault — Seed Data (optional demo content)
-- Run after 001_initial_schema.sql

INSERT INTO folders (id, name, parent_id, icon, sort_order)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'Personal',   NULL,                                    '🏠', 0),
    ('00000000-0000-0000-0000-000000000002', 'Work',       NULL,                                    '💼', 1),
    ('00000000-0000-0000-0000-000000000003', 'Journal',    '00000000-0000-0000-0000-000000000001',  '📔', 0),
    ('00000000-0000-0000-0000-000000000004', 'Resources',  '00000000-0000-0000-0000-000000000002',  '📚', 0),
    ('00000000-0000-0000-0000-000000000005', 'Credentials','00000000-0000-0000-0000-000000000002',  '🔐', 1)
ON CONFLICT DO NOTHING;

INSERT INTO tags (id, name, color)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'important', '#ef4444'),
    ('10000000-0000-0000-0000-000000000002', 'reference', '#3b82f6'),
    ('10000000-0000-0000-0000-000000000003', 'todo',      '#f59e0b')
ON CONFLICT DO NOTHING;

INSERT INTO entries (id, title, type, content, folder_id, is_pinned, sort_order)
VALUES
    (
        '20000000-0000-0000-0000-000000000001',
        'Welcome to KeyStone',
        'note',
        E'# Welcome to KeyStone 🗝️\n\nThis is your private **Knowledge Vault**.\n\n## Features\n- 📁 Hierarchical folders\n- 📝 Markdown notes\n- 🔗 Saved links\n- 🔐 Encrypted secrets (AES-256)\n- 🏷️ Tags\n\n## Getting Started\n1. Create a folder in the sidebar\n2. Add entries via the **+** button\n3. Click any entry to view it instantly',
        '00000000-0000-0000-0000-000000000001',
        TRUE,
        0
    ),
    (
        '20000000-0000-0000-0000-000000000002',
        'KeyStone API Documentation',
        'link',
        NULL,
        '00000000-0000-0000-0000-000000000004',
        FALSE,
        0
    )
ON CONFLICT DO NOTHING;

UPDATE entries
SET url = 'https://github.com/venkateshmareddy/keyStone'
WHERE id = '20000000-0000-0000-0000-000000000002';

INSERT INTO entry_tags (entry_id, tag_id)
VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;
