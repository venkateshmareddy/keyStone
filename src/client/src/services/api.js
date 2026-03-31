/**
 * KeyStone API client
 * Reads API_KEY from localStorage and sends it with every request.
 */

const BASE = '/api';

function getKey() {
  return localStorage.getItem('ks_api_key') || '';
}

function headers(extra = {}) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getKey()}`,
    ...extra,
  };
}

async function request(method, path, body) {
  const opts = { method, headers: headers() };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── Auth ─────────────────────────────────────────────────────
export async function validateKey(apiKey) {
  const res = await fetch(`${BASE}/auth/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Invalid key');
  return data;
}

// ── Folders ──────────────────────────────────────────────────
export const getFolderTree    = ()       => request('GET',    '/folders/tree');
export const getFolder        = (id)     => request('GET',    `/folders/${id}`);
export const createFolder     = (body)   => request('POST',   '/folders', body);
export const updateFolder     = (id, b)  => request('PUT',    `/folders/${id}`, b);
export const deleteFolder     = (id)     => request('DELETE', `/folders/${id}`);

// ── Entries ──────────────────────────────────────────────────
export const getFolderEntries = (fid)    => request('GET',    `/entries/folder/${fid}`);
export const getAllEntries     = ()       => request('GET',    '/entries');
export const getEntry         = (id)     => request('GET',    `/entries/${id}`);
export const createEntry      = (body)   => request('POST',   '/entries', body);
export const updateEntry      = (id, b)  => request('PUT',    `/entries/${id}`, b);
export const deleteEntry      = (id)     => request('DELETE', `/entries/${id}`);

// ── Tags ─────────────────────────────────────────────────────
export const getTags   = ()      => request('GET',    '/tags');
export const createTag = (body)  => request('POST',   '/tags', body);
export const updateTag = (id, b) => request('PUT',    `/tags/${id}`, b);
export const deleteTag = (id)    => request('DELETE', `/tags/${id}`);
