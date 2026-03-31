import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import EntryList from './components/EntryList.jsx';
import EntryViewer from './components/EntryViewer.jsx';
import EntryEditor from './components/EntryEditor.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import { getFolderEntries, getAllEntries, getEntry, getTags } from './services/api.js';

export default function App() {
  const [authenticated, setAuthenticated] = useState(
    Boolean(localStorage.getItem('ks_api_key'))
  );

  const [selectedFolder, setSelectedFolder] = useState(null); // {id, name}
  const [entries, setEntries]     = useState([]);
  const [activeEntry, setActiveEntry] = useState(null);      // full entry data
  const [editorEntry, setEditorEntry] = useState(undefined); // undefined=closed, null=new, obj=edit
  const [tags, setTags]           = useState([]);
  const [loading, setLoading]     = useState(false);

  const loadTags = useCallback(async () => {
    try { setTags(await getTags()); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (authenticated) loadTags();
  }, [authenticated, loadTags]);

  // Load entries when folder changes (lazy)
  useEffect(() => {
    if (!authenticated) return;
    setActiveEntry(null);
    setEditorEntry(undefined);
    setLoading(true);
    const promise = selectedFolder
      ? getFolderEntries(selectedFolder.id)
      : getAllEntries();
    promise
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedFolder, authenticated]);

  // Click an entry → fetch full data (lazy "retrieve on click")
  const handleSelectEntry = useCallback(async (entry) => {
    setActiveEntry(null);
    setEditorEntry(undefined);
    try {
      const full = await getEntry(entry.id);
      setActiveEntry(full);
    } catch (err) {
      console.error('Failed to load entry', err);
    }
  }, []);

  const handleNewEntry = useCallback(() => {
    setActiveEntry(null);
    setEditorEntry(null); // null = new
  }, []);

  const handleEditEntry = useCallback((entry) => {
    setEditorEntry(entry);
  }, []);

  const handleSaved = useCallback(async (savedEntry) => {
    setEditorEntry(undefined);
    // Refresh the entry list
    const refreshed = selectedFolder
      ? await getFolderEntries(selectedFolder.id)
      : await getAllEntries();
    setEntries(refreshed);
    // Show the saved entry
    const full = await getEntry(savedEntry.id);
    setActiveEntry(full);
  }, [selectedFolder]);

  const handleDeletedEntry = useCallback(async () => {
    setActiveEntry(null);
    const refreshed = selectedFolder
      ? await getFolderEntries(selectedFolder.id)
      : await getAllEntries();
    setEntries(refreshed);
  }, [selectedFolder]);

  if (!authenticated) {
    return <LoginScreen onLogin={() => setAuthenticated(true)} />;
  }

  return (
    <div className="app-layout">
      {/* Left: folder tree */}
      <Sidebar
        selectedFolder={selectedFolder}
        onSelectFolder={setSelectedFolder}
        onNewEntry={handleNewEntry}
      />

      {/* Middle: entry list */}
      <EntryList
        entries={entries}
        loading={loading}
        selectedId={activeEntry?.id}
        folderName={selectedFolder?.name || 'All Entries'}
        onSelect={handleSelectEntry}
        onNew={handleNewEntry}
      />

      {/* Right: viewer or editor */}
      <main className="content-pane">
        {editorEntry !== undefined ? (
          <EntryEditor
            entry={editorEntry}
            folderId={selectedFolder?.id || null}
            tags={tags}
            onSaved={handleSaved}
            onCancel={() => setEditorEntry(undefined)}
          />
        ) : activeEntry ? (
          <EntryViewer
            entry={activeEntry}
            onEdit={() => handleEditEntry(activeEntry)}
            onDeleted={handleDeletedEntry}
          />
        ) : (
          <div className="empty-state">
            <span className="empty-icon">🗝️</span>
            <p>Select an entry to view it, or</p>
            <button className="btn btn-primary" onClick={handleNewEntry}>
              + New Entry
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
