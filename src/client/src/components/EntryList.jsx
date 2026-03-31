import React from 'react';

const TYPE_ICON = { note: '📝', link: '🔗', secret: '🔐' };

function TagBadge({ tag }) {
  return (
    <span className="tag-badge" style={{ background: tag.color + '22', color: tag.color }}>
      {tag.name}
    </span>
  );
}

export default function EntryList({ entries, loading, selectedId, folderName, onSelect, onNew }) {
  return (
    <section className="entry-list-pane">
      <div className="entry-list-header">
        <span className="entry-list-title">{folderName}</span>
        <button className="btn btn-sm btn-primary" onClick={onNew}>+ New</button>
      </div>

      {loading && <div className="loading-spinner">Loading…</div>}

      {!loading && entries.length === 0 && (
        <div className="entry-list-empty">
          <p>No entries here yet.</p>
          <button className="btn btn-primary" onClick={onNew}>+ New Entry</button>
        </div>
      )}

      <ul className="entry-list">
        {entries.map(entry => (
          <li
            key={entry.id}
            className={`entry-item ${entry.id === selectedId ? 'active' : ''}`}
            onClick={() => onSelect(entry)}
          >
            <div className="entry-item-header">
              <span className="entry-type-icon">{TYPE_ICON[entry.type] || '📄'}</span>
              <span className="entry-title">{entry.title}</span>
              {entry.is_pinned && <span className="pin-icon" title="Pinned">📌</span>}
            </div>
            <div className="entry-meta">
              <span className="entry-date">
                {new Date(entry.updated_at).toLocaleDateString()}
              </span>
              <span className="entry-tags">
                {(entry.tags || []).map(t => <TagBadge key={t.id} tag={t} />)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
