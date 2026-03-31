# KeyStone API Reference

Base URL: `http://localhost:3001/api`

All protected endpoints require:
```
Authorization: Bearer <API_KEY>
```
or
```
x-api-key: <API_KEY>
```

---

## Authentication

### POST `/api/auth/validate`
Validate the API key (no auth header needed for this route).

**Request body:**
```json
{ "apiKey": "your-api-key" }
```

**Response 200:**
```json
{ "ok": true, "message": "API key is valid" }
```

---

## Folders

### GET `/api/folders/tree`
Returns the complete folder hierarchy. Each node includes a `children` array.
Entry data is **not** included (lazy loading).

**Response 200:**
```json
[
  {
    "id": "uuid",
    "name": "Personal",
    "parent_id": null,
    "icon": "🏠",
    "sort_order": 0,
    "created_at": "...",
    "updated_at": "...",
    "children": [
      { "id": "uuid", "name": "Journal", "children": [] }
    ]
  }
]
```

### GET `/api/folders/:id`
Returns metadata for a single folder.

### POST `/api/folders`
Create a new folder.

**Request body:**
```json
{
  "name": "My Folder",
  "parent_id": null,
  "icon": "📁",
  "sort_order": 0
}
```

### PUT `/api/folders/:id`
Update folder fields (all optional — only provided fields are updated).

### DELETE `/api/folders/:id`
Delete a folder and all its descendants (cascades).

---

## Entries

### GET `/api/entries/folder/:folderId`
**Lazy-load** — returns the entry list for a folder.  
Does **not** include `content`, `url`, or `encrypted_content`.  
Use this to populate the entry list after the user clicks a folder.

**Response 200:**
```json
[
  {
    "id": "uuid",
    "title": "My Note",
    "type": "note",
    "folder_id": "uuid",
    "is_pinned": false,
    "sort_order": 0,
    "created_at": "...",
    "updated_at": "...",
    "tags": [{ "id": "uuid", "name": "important", "color": "#ef4444" }]
  }
]
```

### GET `/api/entries`
List all entries (lazy — no content).

### GET `/api/entries/:id` ← "Retrieve on Click"
Fetch the **full content** of a single entry.

- For `type=note`: returns `content` (Markdown string)
- For `type=link`: returns `url`
- For `type=secret`: returns `secret` (decrypted plaintext). `encrypted_content` is never sent to the client.

**Response 200 (note):**
```json
{
  "id": "uuid",
  "title": "My Note",
  "type": "note",
  "content": "# Hello\n\nMarkdown here.",
  "folder_id": "uuid",
  "is_pinned": false,
  "tags": [...],
  "created_at": "...",
  "updated_at": "..."
}
```

**Response 200 (secret):**
```json
{
  "id": "uuid",
  "title": "AWS Credentials",
  "type": "secret",
  "secret": "AKIAIOSFODNN7EXAMPLE",
  "folder_id": "uuid",
  "tags": [...],
  "created_at": "...",
  "updated_at": "..."
}
```

### POST `/api/entries`
Create a new entry.

**Request body (note):**
```json
{
  "title": "My Note",
  "type": "note",
  "content": "# Hello\n\nMarkdown.",
  "folder_id": "uuid-or-null",
  "is_pinned": false,
  "tags": ["tag-uuid-1", "tag-uuid-2"]
}
```

**Request body (link):**
```json
{
  "title": "Useful Link",
  "type": "link",
  "url": "https://example.com",
  "folder_id": "uuid-or-null",
  "tags": []
}
```

**Request body (secret):**
```json
{
  "title": "AWS Secret Key",
  "type": "secret",
  "secret": "plaintext-value-to-encrypt",
  "folder_id": "uuid-or-null",
  "tags": []
}
```

### PUT `/api/entries/:id`
Update entry (all fields optional).  
To update a secret, include the new plaintext value in `secret`.

### DELETE `/api/entries/:id`
Delete an entry.

---

## Tags

### GET `/api/tags`
List all tags sorted alphabetically.

### POST `/api/tags`
```json
{ "name": "important", "color": "#ef4444" }
```

### PUT `/api/tags/:id`
```json
{ "name": "urgent", "color": "#f59e0b" }
```

### DELETE `/api/tags/:id`

---

## Health Check

### GET `/health`
Public — no auth required.

```json
{ "status": "ok", "ts": "2024-01-01T00:00:00.000Z" }
```
