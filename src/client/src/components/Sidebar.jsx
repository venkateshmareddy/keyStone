import React, { useState, useEffect, useCallback } from 'react';
import { getFolderTree, createFolder, deleteFolder } from '../services/api.js';

function FolderNode({ node, depth, selectedId, onSelect, onDelete }) {
  const [open, setOpen] = useState(depth < 1);

  return (
    <li>
      <div
        className={`folder-item depth-${Math.min(depth, 4)} ${selectedId === node.id ? 'active' : ''}`}
        onClick={() => { setOpen(o => !o); onSelect(node); }}
      >
        <span className="folder-toggle">{node.children.length ? (open ? '▾' : '▸') : '  '}</span>
        <span className="folder-icon">{node.icon || '📁'}</span>
        <span className="folder-name">{node.name}</span>
        <button
          className="folder-delete-btn"
          title="Delete folder"
          onClick={(e) => { e.stopPropagation(); onDelete(node); }}
        >×</button>
      </div>
      {open && node.children.length > 0 && (
        <ul className="folder-children">
          {node.children.map(child => (
            <FolderNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function Sidebar({ selectedFolder, onSelectFolder, onNewEntry }) {
  const [tree, setTree]         = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName]   = useState('');
  const [newIcon, setNewIcon]   = useState('📁');
  const [parentId, setParentId] = useState('');
  const [error, setError]       = useState('');

  const loadTree = useCallback(async () => {
    try { setTree(await getFolderTree()); }
    catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadTree(); }, [loadTree]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) { setError('Name is required'); return; }
    try {
      await createFolder({ name: newName.trim(), icon: newIcon, parent_id: parentId || null });
      setNewName(''); setNewIcon('📁'); setParentId('');
      setShowForm(false); setError('');
      loadTree();
    } catch (err) { setError(err.message); }
  };

  const handleDelete = async (node) => {
    if (!window.confirm(`Delete folder "${node.name}"? All sub-folders will also be deleted.`)) return;
    try {
      await deleteFolder(node.id);
      if (selectedFolder?.id === node.id) onSelectFolder(null);
      loadTree();
    } catch (err) { alert(err.message); }
  };

  // Flatten tree for parent selector
  function flattenTree(nodes, depth = 0) {
    return nodes.flatMap(n => [
      { id: n.id, label: '  '.repeat(depth) + n.icon + ' ' + n.name },
      ...flattenTree(n.children, depth + 1),
    ]);
  }
  const flatFolders = flattenTree(tree);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="logo">🗝️ KeyStone</span>
      </div>

      <nav className="sidebar-nav">
        {/* All Entries shortcut */}
        <div
          className={`folder-item all-entries ${!selectedFolder ? 'active' : ''}`}
          onClick={() => onSelectFolder(null)}
        >
          <span className="folder-icon">📋</span>
          <span className="folder-name">All Entries</span>
        </div>

        {tree.length === 0 && (
          <p className="sidebar-empty">No folders yet.<br />Create one below.</p>
        )}

        <ul className="folder-list">
          {tree.map(node => (
            <FolderNode
              key={node.id}
              node={node}
              depth={0}
              selectedId={selectedFolder?.id}
              onSelect={onSelectFolder}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button className="btn btn-ghost btn-block" onClick={() => setShowForm(s => !s)}>
          {showForm ? '✕ Cancel' : '+ New Folder'}
        </button>

        {showForm && (
          <form className="folder-form" onSubmit={handleCreate}>
            {error && <p className="form-error">{error}</p>}
            <div className="form-row">
              <input
                className="icon-input"
                value={newIcon}
                onChange={e => setNewIcon(e.target.value)}
                maxLength={4}
                title="Icon (emoji)"
              />
              <input
                className="text-input"
                placeholder="Folder name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <select
              className="text-input"
              value={parentId}
              onChange={e => setParentId(e.target.value)}
            >
              <option value="">— No parent (root) —</option>
              {flatFolders.map(f => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
            <button className="btn btn-primary btn-block" type="submit">Create Folder</button>
          </form>
        )}

        <button className="btn btn-primary btn-block" onClick={onNewEntry}>
          ✏️ New Entry
        </button>

        <button
          className="btn btn-ghost btn-block"
          onClick={() => { localStorage.removeItem('ks_api_key'); window.location.reload(); }}
        >
          🚪 Sign Out
        </button>
      </div>
    </aside>
  );
}
