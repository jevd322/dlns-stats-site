/**
 * API wrapper for Wavebox endpoints
 */

const API_BASE = '/sounds/api';
const VO_API_BASE = '/vo/api';

export async function fetchTree(path = '') {
  const url = new URL(`${API_BASE}/tree`, window.location.origin);
  if (path) url.searchParams.append('path', path);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch tree');
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function fetchRandom() {
  const res = await fetch(`${API_BASE}/random`);
  if (!res.ok) throw new Error('Failed to fetch random');
  return res.json();
}

export async function getMe() {
  const res = await fetch(`${API_BASE}/me`);
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json();
}

export async function checkExists(path) {
  const url = new URL(`${API_BASE}/exists`, window.location.origin);
  url.searchParams.append('path', path);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to check exists');
  return res.json();
}

export async function uploadRecording(file, path) {
  const formData = new FormData();
  // Ensure the backend sees a valid audio extension; default to webm if unnamed
  const filename = (file && file.name) ? file.name : 'recording.webm';
  formData.append('file', file, filename);
  formData.append('path', path);
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

export async function acceptRecording(id) {
  const res = await fetch(`${API_BASE}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Accept failed');
  }
  return res.json();
}

export async function rejectRecording(id) {
  const res = await fetch(`${API_BASE}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Reject failed');
  }
  return res.json();
}

export async function getUploads() {
  // This endpoint doesn't exist yet - we'll add it to sound_viewer.py
  const res = await fetch(`${API_BASE}/uploads`);
  if (!res.ok) throw new Error('Failed to fetch uploads');
  return res.json();
}

export async function downloadAccepted() {
  const res = await fetch(`${API_BASE}/download-accepted`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Download failed');
  }
  return res.blob();
}

export async function downloadAll() {
  const res = await fetch(`${API_BASE}/download-all`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Download failed');
  }
  return res.blob();
}

export async function acceptAllPending() {
  const res = await fetch(`${API_BASE}/accept-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Accept-all failed');
  }
  return res.json();
}

export async function fetchAllStatuses() {
  const res = await fetch(`${API_BASE}/all-statuses`);
  if (!res.ok) throw new Error('Failed to fetch statuses');
  const data = await res.json();
  return data.statuses || {};
}

export async function fetchVoTasks() {
  const res = await fetch(`${VO_API_BASE}/tasks`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to load VO tasks');
  return data.tasks || [];
}

export async function fetchVoContent() {
  const res = await fetch(`${VO_API_BASE}/content`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to load VO content');
  return data.content || { html: '', assets: { zip: null, videos: [], artwork: [] } };
}

export async function saveVoContent(content) {
  const res = await fetch(`${VO_API_BASE}/content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(content || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to save VO content');
  return data.content;
}

/**
 * Ranker API
 */
const RANK_API_BASE = '/rank/api';

export async function rankGetMe() {
  const res = await fetch(`${RANK_API_BASE}/me`);
  if (!res.ok) throw new Error('Failed to fetch me');
  return res.json();
}

export async function rankSubmit(rank) {
  const res = await fetch(`${RANK_API_BASE}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rank }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to submit rank');
  return data;
}

export async function rankListPlayers() {
  const res = await fetch(`${RANK_API_BASE}/players`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to load players');
  return data;
}

export async function rankAssignTeam(id, team) {
  const res = await fetch(`${RANK_API_BASE}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, team }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to assign team');
  return data;
}

export async function rankClearAll() {
  const res = await fetch(`${RANK_API_BASE}/clear`, { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to clear');
  return data;
}
