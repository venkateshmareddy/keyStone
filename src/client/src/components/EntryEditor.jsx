import React, { useState } from 'react';
import { createEntry, updateEntry } from '../services/api.js';

export default function EntryEditor({ entry, folderId, tags, onSaved, onCancel }) {
  const isNew = !entry;

  const [title,    setTitle]    = useState(entry?.title    || '');
  const [type,     setType]     = useState(entry?.type     || 'note');
  const [content,  setContent]  = useState(entry?.content  || '');
  const [url,      setUrl]      = useState(entry?.url      || '');
  const [secret,   setSecret]   = useState('');
  const [pinned,   setPinned]   = useState(entry?.is_pinned || false);
  const [selTags,  setSelTags]  = useState((entry?.tags || []).map(t => t.id));
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const toggleTag = (id) =>
    setSelTags(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');

    const body = {
      title: title.trim(),
      type,
      content: type === 'note' ? content : undefined,
      url:     type === 'link' ? url      : undefined,
      secret:  type === 'secret' && secret ? secret : undefined,
      folder_id: folderId || entry?.folder_id || null,
      is_pinned: pinned,
      tags: selTags,
    };

    try {
      const saved = isNew
        ? await createEntry(body)
        : await updateEntry(entry.id, body);
      onSaved(saved);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="entry-editor">
      <div className="editor-header">
        <h2>{isNew ? '✏️ New Entry' : '✏️ Edit Entry'}</h2>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>✕ Cancel</button>
      </div>

      <form className="editor-form" onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}

        <label className="form-label">
          Title
          <input
            className="text-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Entry title"
            autoFocus
          />
        </label>

        <label className="form-label">
          Type
          <div className="type-selector">
            {['note', 'link', 'secret'].map(t => (
              <button
                key={t}
                type="button"
                className={`type-btn ${type === t ? 'active' : ''}`}
                onClick={() => setType(t)}
              >
                {t === 'note' ? '📝 Note' : t === 'link' ? '🔗 Link' : '🔐 Secret'}
              </button>
            ))}
          </div>
        </label>

        {type === 'note' && (
          <label className="form-label">
            Content (Markdown)
            <textarea
              className="text-area"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write in **Markdown**…"
              rows={14}
            />
          </label>
        )}

        {type === 'link' && (
          <label className="form-label">
            URL
            <input
              className="text-input"
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </label>
        )}

        {type === 'secret' && (
          <label className="form-label">
            Secret value
            <textarea
              className="text-area secret-area"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              placeholder={isNew ? 'Enter the secret to encrypt…' : 'Leave blank to keep current secret'}
              rows={4}
            />
            <small className="form-hint">Stored with AES-256-GCM encryption</small>
          </label>
        )}

        {tags.length > 0 && (
          <div className="form-label">
            Tags
            <div className="tag-selector">
              {tags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  className={`tag-toggle ${selTags.includes(tag.id) ? 'selected' : ''}`}
                  style={selTags.includes(tag.id)
                    ? { background: tag.color, color: '#fff', borderColor: tag.color }
                    : { borderColor: tag.color, color: tag.color }}
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="form-label form-row checkbox-row">
          <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} />
          <span>📌 Pin this entry</span>
        </label>

        <div className="editor-actions">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : isNew ? 'Create Entry' : 'Save Changes'}
          </button>
          <button className="btn btn-ghost" type="button" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
