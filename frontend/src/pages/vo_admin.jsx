import React, { useEffect, useMemo, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { fetchVoContent, saveVoContent } from '../utils/api';

const LOCAL_ASSETS_KEY = 'vo.community.assets';
const LOCAL_MAIN_HTML_KEY = 'vo.community.mainHtml'; // stores HTML from editor
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

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, 4, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ script: 'sub' }, { script: 'super' }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ align: [] }],
    ['blockquote', 'code-block'],
    ['link', 'image', 'video'],
    ['clean'],
  ],
};

const quillFormats = [
  'header', 'bold', 'italic', 'underline', 'strike', 'color', 'background', 'script',
  'list', 'indent', 'align', 'blockquote', 'code-block', 'link', 'image', 'video'
];

function AssetList({ title, items, onRemove, onReorder }) {
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px', background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ fontWeight: 700, marginBottom: '8px' }}>{title}</div>
      {!items.length && <div style={{ color: '#7a7a82', fontSize: '12px' }}>None</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map((item, idx) => (
          <div key={item.id} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', background: 'rgba(255,255,255,0.04)' }}>
            <span style={{ flex: 1 }}>{item.name} <span style={{ color: '#7a7a82' }}>({Math.round(item.size / 1024)} KB)</span></span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => onReorder(idx, -1)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer' }}>↑</button>
              <button onClick={() => onReorder(idx, 1)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer' }}>↓</button>
              <button onClick={() => onRemove(idx)} style={{ background: 'rgba(255, 68, 68, 0.16)', border: '1px solid rgba(255, 68, 68, 0.3)', color: '#fff', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer' }}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const emptyFallback = '<p style="color:#7a7a82">No content yet.</p>';

export function VoAdmin() {
  const [mainText, setMainText] = useState(() => loadLocal(LOCAL_MAIN_HTML_KEY, ''));
  const [assets, setAssets] = useState(() => normalizeAssets(loadLocal(LOCAL_ASSETS_KEY, DEFAULT_ASSETS)));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [meta, setMeta] = useState({ updated_at: null, updated_by: null });

  useEffect(() => {
    saveLocal(LOCAL_MAIN_HTML_KEY, mainText);
  }, [mainText]);

  useEffect(() => {
    saveLocal(LOCAL_ASSETS_KEY, assets);
  }, [assets]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const content = await fetchVoContent();
        if (!alive) return;
        setMainText(content.html || '');
        setAssets(normalizeAssets(content.assets));
        setMeta({
          updated_at: content.updated_at || null,
          updated_by: content.updated_by || null,
        });
        saveLocal(LOCAL_MAIN_HTML_KEY, content.html || '');
        saveLocal(LOCAL_ASSETS_KEY, normalizeAssets(content.assets));
      } catch (err) {
        if (!alive) return;
        setError(err.message || 'Failed to load server content; showing local draft.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const addFile = (files, type) => {
    if (!files || !files.length) return;
    const file = files[0];
    const payload = { id: `${type}-${Date.now()}`, name: file.name, size: file.size, type: file.type };
    setAssets(prev => {
      const next = { ...prev };
      if (type === 'zip') next.zip = payload;
      if (type === 'video') next.videos = [...(prev.videos || []), payload];
      if (type === 'artwork') next.artwork = [...(prev.artwork || []), payload];
      return next;
    });
  };

  const removeFrom = (key, idx) => {
    setAssets(prev => {
      const next = { ...prev, [key]: [...prev[key]] };
      next[key].splice(idx, 1);
      return next;
    });
  };

  const reorder = (key, idx, delta) => {
    setAssets(prev => {
      const arr = [...prev[key]];
      const target = idx + delta;
      if (target < 0 || target >= arr.length) return prev;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return { ...prev, [key]: arr };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const saved = await saveVoContent({ html: mainText, assets });
      setMeta({ updated_at: saved?.updated_at || null, updated_by: saved?.updated_by || null });
      const normalized = normalizeAssets(saved?.assets);
      setAssets(normalized);
      saveLocal(LOCAL_MAIN_HTML_KEY, saved?.html || mainText);
      saveLocal(LOCAL_ASSETS_KEY, normalized);
      setNotice('Saved to server');
    } catch (err) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(assets, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vo_assets.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const lastSaved = useMemo(() => {
    if (!meta.updated_at) return 'Not saved yet';
    const date = new Date(meta.updated_at * 1000);
    const by = meta.updated_by ? ` by ${meta.updated_by}` : '';
    return `${date.toLocaleString()}${by}`;
  }, [meta]);

  const stats = useMemo(() => ({
    videos: assets.videos?.length || 0,
    artwork: assets.artwork?.length || 0,
    zip: assets.zip ? 1 : 0,
  }), [assets]);

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d12', color: '#fff' }}>
      <header style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontWeight: 800, fontSize: '18px' }}>Community VO Admin</div>
          <div style={{ fontSize: '13px', color: '#b2b2b8' }}>Rich content + asset metadata, saved server-side at data/vo_content.json</div>
          <div style={{ fontSize: '12px', color: '#7a7a82' }}>Last saved: {lastSaved}{loading ? ' (loading...)' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: '#b2b2b8' }}>ZIP: {stats.zip} · Videos: {stats.videos} · Artwork: {stats.artwork}</div>
          <button onClick={handleSave} disabled={saving || loading} style={{ background: 'linear-gradient(90deg, #1db954, #1ed760)', border: 'none', color: '#000', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, opacity: saving || loading ? 0.7 : 1 }}>{saving ? 'Saving…' : 'Save to server'}</button>
          <button onClick={exportConfig} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700 }}>Export JSON</button>
        </div>
      </header>

      {(error || notice) && (
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '10px 20px', color: error ? '#f5a524' : '#1db954', fontSize: '13px' }}>
          {error || notice}
        </div>
      )}

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
        <section style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontWeight: 700 }}>Main page content</div>
          <ReactQuill
            theme="snow"
            value={mainText}
            onChange={setMainText}
            placeholder="Type rich content here..."
            modules={quillModules}
            formats={quillFormats}
            style={{ background: '#111119', color: '#fff', borderRadius: '10px' }}
          />
          <div style={{ fontSize: '12px', color: '#7a7a82' }}>Preview</div>
          <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '12px', minHeight: '200px', background: 'rgba(255,255,255,0.02)' }}
            dangerouslySetInnerHTML={{ __html: mainText || emptyFallback }}></div>
        </section>

        <section style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontWeight: 700 }}>Assets</div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}>
            <span>Upload ZIP (pack)</span>
            <input type="file" accept=".zip" style={{ display: 'none' }} onChange={(e) => addFile(e.target.files, 'zip')} />
            <span style={{ fontSize: '12px', color: '#7a7a82' }}>{assets.zip ? assets.zip.name : 'No file yet'}</span>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}>
            <span>Upload video</span>
            <input type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => addFile(e.target.files, 'video')} />
            <span style={{ fontSize: '12px', color: '#7a7a82' }}>MP4 / WebM recommended</span>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}>
            <span>Upload artwork</span>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => addFile(e.target.files, 'artwork')} />
            <span style={{ fontSize: '12px', color: '#7a7a82' }}>PNG / JPG recommended</span>
          </label>

          <AssetList
            title="Videos"
            items={assets.videos || []}
            onRemove={(idx) => removeFrom('videos', idx)}
            onReorder={(idx, delta) => reorder('videos', idx, delta)}
          />

          <AssetList
            title="Artwork"
            items={assets.artwork || []}
            onRemove={(idx) => removeFrom('artwork', idx)}
            onReorder={(idx, delta) => reorder('artwork', idx, delta)}
          />
        </section>
      </main>
    </div>
  );
}
