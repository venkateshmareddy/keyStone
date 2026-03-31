import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { deleteEntry } from '../services/api.js';

const TYPE_ICON  = { note: '📝', link: '🔗', secret: '🔐' };
const TYPE_LABEL = { note: 'Note', link: 'Link', secret: 'Secret' };

function TagBadge({ tag }) {
  return (
    <span className="tag-badge" style={{ background: tag.color + '22', color: tag.color }}>
      {tag.name}
    </span>
  );
}

export default function EntryViewer({ entry, onEdit, onDeleted }) {
  const [secretVisible, setSecretVisible] = useState(false);
  const [deleting, setDeleting]           = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${entry.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteEntry(entry.id);
      onDeleted();
    } catch (err) {
      alert(err.message);
      setDeleting(false);
    }
  };

  return (
    <article className="entry-viewer">
      <div className="viewer-header">
        <div className="viewer-title-row">
          <span className="type-badge">
            {TYPE_ICON[entry.type]} {TYPE_LABEL[entry.type]}
          </span>
          <h1 className="viewer-title">{entry.title}</h1>
          {entry.is_pinned && <span title="Pinned">📌</span>}
        </div>

        <div className="viewer-actions">
          <button className="btn btn-sm btn-ghost" onClick={onEdit}>✏️ Edit</button>
          <button className="btn btn-sm btn-danger" onClick={handleDelete} disabled={deleting}>
            🗑️ Delete
          </button>
        </div>
      </div>

      <div className="viewer-meta">
        <span>Created: {new Date(entry.created_at).toLocaleString()}</span>
        <span>Updated: {new Date(entry.updated_at).toLocaleString()}</span>
        {(entry.tags || []).length > 0 && (
          <span className="viewer-tags">
            {entry.tags.map(t => <TagBadge key={t.id} tag={t} />)}
          </span>
        )}
      </div>

      <div className="viewer-body">
        {entry.type === 'note' && (
          <div className="markdown-body">
            <ReactMarkdown>{entry.content || '*Empty note*'}</ReactMarkdown>
          </div>
        )}

        {entry.type === 'link' && (
          <div className="link-card">
            <a href={entry.url} target="_blank" rel="noopener noreferrer" className="link-url">
              🔗 {entry.url}
            </a>
          </div>
        )}

        {entry.type === 'secret' && (
          <div className="secret-box">
            {entry.decryptError ? (
              <p className="decrypt-error">⚠️ {entry.decryptError}</p>
            ) : (
              <>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSecretVisible(v => !v)}
                >
                  {secretVisible ? '🙈 Hide Secret' : '👁️ Reveal Secret'}
                </button>
                {secretVisible && (
                  <pre className="secret-value">{entry.secret}</pre>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
