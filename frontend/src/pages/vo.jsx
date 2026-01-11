import React, { useEffect, useMemo, useState } from 'react';
import { fetchVoTasks, fetchVoContent } from '../utils/api';

const LOCAL_TASKS_KEY = 'vo.community.tasks';
const LOCAL_ASSETS_KEY = 'vo.community.assets';
const LOCAL_MAIN_HTML_KEY = 'vo.community.mainHtml'; // stores HTML from admin
const DEFAULT_ASSETS = { zip: null, videos: [], artwork: [] };

function loadLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const normalizeAssets = (maybeAssets = DEFAULT_ASSETS) => ({
  zip: maybeAssets?.zip || null,
  videos: maybeAssets?.videos || [],
  artwork: maybeAssets?.artwork || [],
});

function TaskCard({ task }) {
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', alignItems: 'center', fontSize: '13px' }}>
      <div style={{ color: '#fff', fontWeight: 600 }}>{task.title || task.Line || 'Untitled'}</div>
      <div style={{ color: '#b2b2b8' }}>{task.Owner || task.owner || task.Assignee || 'Unassigned'}</div>
      <div style={{ color: task.Status === 'Done' ? '#1db954' : '#f5a524' }}>{task.Status || task.status || 'Open'}</div>
    </div>
  );
}

export function VoHub() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [localTasks, setLocalTasks] = useState(() => loadLocal(LOCAL_TASKS_KEY, []));
  const [newTask, setNewTask] = useState({ title: '', owner: '', status: 'Open' });
  const [assets, setAssets] = useState(() => normalizeAssets(loadLocal(LOCAL_ASSETS_KEY, DEFAULT_ASSETS)));
  const [mainText, setMainText] = useState(() => loadLocal(LOCAL_MAIN_HTML_KEY, ''));
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState('');

  const combinedTasks = useMemo(() => {
    return [...tasks, ...localTasks];
  }, [tasks, localTasks]);

  const fetchSheet = async () => {
    setLoading(true);
    setError('');
    try {
      const parsed = await fetchVoTasks();
      const normalized = parsed.map(row => ({
        title: row.title || '',
        Owner: row.owner || '',
        Status: row.status || 'Open',
      }));
      setTasks(normalized);
    } catch (err) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const addLocalTask = () => {
    if (!newTask.title.trim()) return;
    const next = [...localTasks, { title: newTask.title, Owner: newTask.owner, Status: newTask.status }];
    setLocalTasks(next);
    saveLocal(LOCAL_TASKS_KEY, next);
    setNewTask({ title: '', owner: '', status: 'Open' });
  };

  useEffect(() => {
    fetchSheet();
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const content = await fetchVoContent();
        if (!alive) return;
        setMainText(content.html || '');
        const normalized = normalizeAssets(content.assets);
        setAssets(normalized);
        saveLocal(LOCAL_MAIN_HTML_KEY, content.html || '');
        saveLocal(LOCAL_ASSETS_KEY, normalized);
      } catch (err) {
        if (!alive) return;
        setContentError(err.message || 'Failed to load VO content; showing saved local copy.');
        setAssets(normalizeAssets(loadLocal(LOCAL_ASSETS_KEY, DEFAULT_ASSETS)));
        setMainText(loadLocal(LOCAL_MAIN_HTML_KEY, ''));
      } finally {
        if (alive) setContentLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const statusCounts = useMemo(() => {
    const counts = { open: 0, done: 0 };
    combinedTasks.forEach(t => {
      const s = (t.Status || '').toLowerCase();
      if (s.includes('done') || s.includes('complete')) counts.done += 1; else counts.open += 1;
    });
    return counts;
  }, [combinedTasks]);

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d12', color: '#fff' }}>
      <header style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontWeight: 800, fontSize: '18px' }}>Community VO Hub</div>
          <div style={{ fontSize: '13px', color: '#b2b2b8' }}>Track ownership and open lines • Sheet is the source of truth</div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="https://docs.google.com/spreadsheets/d/1_boA9Nsgq4bZoD6DsyekmqD-eofRhzgYZloYB9zEaQQ/edit?gid=920587998" target="_blank" rel="noreferrer" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', padding: '10px 14px', borderRadius: '10px', textDecoration: 'none', fontWeight: 600 }}>Open Sheet</a>
          <button onClick={fetchSheet} style={{ background: 'linear-gradient(90deg, #1db954, #1ed760)', border: 'none', color: '#000', padding: '10px 14px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>{loading ? 'Syncing…' : 'Sync from sheet'}</button>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <section style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 700 }}>Assignments</div>
            <div style={{ display: 'flex', gap: '10px', color: '#b2b2b8', fontSize: '12px' }}>
              <span>Open: <strong style={{ color: '#fff' }}>{statusCounts.open}</strong></span>
              <span>Done: <strong style={{ color: '#1db954' }}>{statusCounts.done}</strong></span>
            </div>
          </div>
          {error && <div style={{ color: '#f5a524', fontSize: '12px' }}>{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '6px' }}>
            {combinedTasks.map((t, idx) => (
              <TaskCard key={idx} task={t} />
            ))}
            {!combinedTasks.length && (
              <div style={{ color: '#7a7a82', fontSize: '13px' }}>No tasks loaded yet.</div>
            )}
          </div>
        </section>

        <section style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontWeight: 700 }}>Add quick note</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} placeholder="Line or task" style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#fff' }} />
            <input value={newTask.owner} onChange={(e) => setNewTask({ ...newTask, owner: e.target.value })} placeholder="Owner" style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#fff' }} />
            <select value={newTask.status} onChange={(e) => setNewTask({ ...newTask, status: e.target.value })} style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
            <button onClick={addLocalTask} style={{ background: 'linear-gradient(90deg, #1db954, #1ed760)', border: 'none', color: '#000', padding: '10px 12px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Add note</button>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
            <div style={{ fontWeight: 700, marginBottom: '8px' }}>Pack / media</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div>ZIP: {assets.zip ? assets.zip.name : '—'}</div>
              <div>Videos: {assets.videos?.length || 0}</div>
              <div>Artwork: {assets.artwork?.length || 0}</div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
            <div style={{ fontWeight: 700, marginBottom: '8px' }}>Main page preview</div>
            {contentLoading && <div style={{ fontSize: '12px', color: '#7a7a82', marginBottom: '6px' }}>Loading content…</div>}
            {contentError && <div style={{ fontSize: '12px', color: '#f5a524', marginBottom: '6px' }}>{contentError}</div>}
            <div style={{ maxHeight: '260px', overflow: 'auto', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '12px', background: 'rgba(255,255,255,0.02)' }}
              dangerouslySetInnerHTML={{ __html: mainText || '<p style="color:#7a7a82">No content yet.</p>' }}></div>
          </div>
        </section>
      </main>
    </div>
  );
}
