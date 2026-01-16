import React, { useEffect, useState, useRef } from 'react';
import { fetchVoContent, saveVoContent, saveVoContentWithProgress, uploadVoFile, uploadVoFileWithProgress } from '../utils/api';

const editorStyles = `
  .md-editor-container {
    background-color: #1e1e1e;
    padding: 20px;
    border-radius: 10px;
    margin-bottom: 30px;
  }
  .md-textarea {
    width: 100%;
    min-height: 400px;
    background: #2c2c2c;
    border: 1px solid #444;
    border-radius: 6px;
    padding: 15px;
    color: #f1f1f1;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 14px;
    line-height: 1.6;
    resize: vertical;
  }
  .md-textarea:focus {
    outline: none;
    border-color: #3498db;
  }
  .md-preview {
    background: #2c2c2c;
    border: 1px solid #444;
    padding: 15px;
    border-radius: 6px;
    color: #f1f1f1;
    min-height: 400px;
    line-height: 1.6;
  }
  .md-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  .md-status {
    font-size: 0.9em;
    color: #bbb;
    margin-left: 15px;
  }
  .md-count {
    font-size: 0.9em;
    color: #bbb;
    margin-left: 15px;
  }
  .asset-upload-section {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
    margin-top: 20px;
  }
  .upload-box {
    background: #2c2c2c;
    border: 2px dashed #444;
    border-radius: 6px;
    padding: 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
  }
  .upload-box:hover {
    border-color: #3498db;
    background: #333;
  }
  .upload-box input {
    display: none;
  }
  .asset-list {
    margin-top: 10px;
    font-size: 12px;
    color: #aaa;
  }
  .asset-item {
    background: #222;
    padding: 5px 8px;
    border-radius: 4px;
    margin-top: 5px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .asset-item button {
    background: #d9534f;
    border: none;
    color: white;
    padding: 2px 6px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
  }
  .progress-bar {
    width: 100%;
    height: 8px;
    background: #1a1a1a;
    border: 1px solid #444;
    border-radius: 4px;
    overflow: hidden;
    margin-top: 8px;
  }
  .progress-fill {
    height: 100%;
    width: 0%;
    background: #3498db;
    transition: width 0.2s ease;
  }
  .progress-text {
    font-size: 11px;
    color: #aaa;
    margin-top: 4px;
    text-align: right;
  }
`;

export function VoAdmin() {
  const [markdown, setMarkdown] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [status, setStatus] = useState('Saved');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [assets, setAssets] = useState({ zip: null, images: [], videos: [] });
  const [progress, setProgress] = useState({ save: 0, zip: 0, image: 0, video: 0 });
  const autosaveTimerRef = useRef(null);
  const lastSavedContentRef = useRef('');

  useEffect(() => {
    // Load initial content
    (async () => {
      try {
        const response = await fetchVoContent();
        const data = response.content || response;
        const md = data.markdown || data.html || '';
        const loadedAssets = {
          zip: data.assets?.zip || null,
          images: Array.isArray(data.assets?.images) ? data.assets.images : [],
          videos: Array.isArray(data.assets?.videos) ? data.assets.videos : []
        };
        setMarkdown(md);
        setAssets(loadedAssets);
        lastSavedContentRef.current = md;
      } catch (err) {
        console.error('Failed to load content:', err);
      }
    })();
  }, []);

  useEffect(() => {
    // Update word/char count
    const text = markdown.trim();
    const words = text.split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    setWordCount(words);
    setCharCount(chars);

    // Auto-save logic
    if (markdown !== lastSavedContentRef.current) {
      setStatus('Unsaved');
      
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }

      autosaveTimerRef.current = setTimeout(async () => {
        try {
          setStatus('Saving...');
          await saveVoContentWithProgress({ markdown, assets }, (loaded, total) => {
            const pct = total ? Math.round((loaded / total) * 100) : (loaded ? 100 : 0);
            setProgress(prev => ({ ...prev, save: pct }));
          });
          setStatus('Saved');
          setProgress(prev => ({ ...prev, save: 0 }));
          lastSavedContentRef.current = markdown;
        } catch (err) {
          setStatus('Error');
          console.error('Autosave failed:', err);
        }
      }, 3000);
    }

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [markdown, assets]);

  const handleSave = async () => {
    try {
      setStatus('Saving...');
      await saveVoContentWithProgress({ markdown, assets }, (loaded, total) => {
        const pct = total ? Math.round((loaded / total) * 100) : (loaded ? 100 : 0);
        setProgress(prev => ({ ...prev, save: pct }));
      });
      setStatus('Saved');
      setProgress(prev => ({ ...prev, save: 0 }));
      lastSavedContentRef.current = markdown;
    } catch (err) {
      setStatus('Error');
      console.error('Save failed:', err);
    }
  };

  const handleFileUpload = async (type, files) => {
    if (!files || files.length === 0) return;
    
    try {
      if (type === 'zip') {
        const file = files[0];
        setStatus('Uploading...');
        const uploadedFile = await uploadVoFileWithProgress(file, (loaded, total) => {
          const pct = total ? Math.round((loaded / total) * 100) : (loaded ? 100 : 0);
          setProgress(prev => ({ ...prev, zip: pct }));
        });
        setAssets(prev => ({ ...prev, zip: uploadedFile }));
        setProgress(prev => ({ ...prev, zip: 0 }));
        setStatus('Saved');
      } else if (type === 'image' || type === 'video') {
        // Upload multiple files
        setStatus('Uploading...');
        const key = type === 'image' ? 'images' : 'videos';
        const keyProg = type === 'image' ? 'image' : 'video';

        const uploadedFiles = [];
        const fileArray = Array.from(files);
        for (let i = 0; i < fileArray.length; i++) {
          const f = fileArray[i];
          const result = await uploadVoFileWithProgress(f, (loaded, total) => {
            const filePct = total ? (loaded / total) * 100 : (loaded ? 100 : 0);
            const overall = Math.round(((i + filePct / 100) / fileArray.length) * 100);
            setProgress(prev => ({ ...prev, [keyProg]: overall }));
          });
          uploadedFiles.push(result);
        }
        
        setAssets(prev => ({ 
          ...prev, 
          [key]: [...(prev[key] || []), ...uploadedFiles]
        }));
        setProgress(prev => ({ ...prev, [keyProg]: 0 }));
        setStatus('Saved');
      }
    } catch (err) {
      setStatus('Upload failed');
      console.error('Upload error:', err);
    }
  };

  const removeAsset = (type, index) => {
    if (type === 'zip') {
      setAssets(prev => ({ ...prev, zip: null }));
    } else if (type === 'image') {
      setAssets(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
    } else if (type === 'video') {
      setAssets(prev => ({ ...prev, videos: prev.videos.filter((_, i) => i !== index) }));
    }
  };

  const insertTable = () => {
    const tableMarkdown = `| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Data | Data | Data |
| Data | Data | Data |

`;
    setMarkdown(markdown + tableMarkdown);
  };

  const renderMarkdown = (md) => {
    // Simple markdown to HTML conversion
    let html = md
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/!\[(.*?)\]\((.*?)\)/gim, '<img alt="$1" src="$2" />')
      .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>')
      .replace(/\n/gim, '<br />');
    return html;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#121212', color: '#eee', padding: '20px', fontFamily: "'Segoe UI', sans-serif" }}>
      <style>{editorStyles}</style>
      
      <h1 style={{ marginBottom: '30px' }}>Admin: Edit Community VO Content</h1>

      <div className="md-editor-container">
        <div className="md-toolbar">
          <div>
            <h2 style={{ display: 'inline-block', margin: 0 }}>Markdown Editor</h2>
            <span className="md-status">{status}</span>
            <span className="md-count">{wordCount} words, {charCount} chars</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={insertTable}
              style={{
                background: '#2ecc71',
                color: 'white',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              onMouseOver={(e) => e.target.style.background = '#27ae60'}
              onMouseOut={(e) => e.target.style.background = '#2ecc71'}
            >
              📊 Insert Table
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              style={{
                background: '#555',
                color: 'white',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => e.target.style.background = '#777'}
              onMouseOut={(e) => e.target.style.background = '#555'}
            >
              {showPreview ? 'Edit' : 'Preview'}
            </button>
          </div>
        </div>

        {!showPreview ? (
          <textarea
            className="md-textarea"
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="# Community VO Hub&#10;&#10;Write your content in **Markdown**...&#10;&#10;## Example:&#10;- Use **bold** with **text**&#10;- Use *italic* with *text*&#10;- Add images: ![alt](url)&#10;- Add links: [text](url)"
          />
        ) : (
          <div className="md-preview" dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }} />
        )}

        {/* Save progress */}
        {progress.save > 0 && (
          <div style={{ marginTop: '8px' }}>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress.save}%`, background: '#3498db' }}></div>
            </div>
            <div className="progress-text">Saving... {progress.save}%</div>
          </div>
        )}

        {/* Asset Upload Section */}
        <div className="asset-upload-section">
          <div className="upload-box">
            <label style={{ cursor: 'pointer', display: 'block' }}>
              <div style={{ fontSize: '40px' }}>📦</div>
              <div style={{ fontWeight: 600, marginTop: '10px' }}>Upload ZIP</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                {assets.zip ? assets.zip.name : 'Click to upload'}
              </div>
              <input type="file" accept=".zip" onChange={(e) => handleFileUpload('zip', e.target.files)} />
            </label>
            {progress.zip > 0 && (
              <div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress.zip}%`, background: '#2ecc71' }}></div>
                </div>
                <div className="progress-text">Uploading ZIP... {progress.zip}%</div>
              </div>
            )}
            {assets.zip && (
              <div className="asset-list">
                <div className="asset-item">
                  <span>{assets.zip.name}</span>
                  <button onClick={() => removeAsset('zip')}>×</button>
                </div>
              </div>
            )}
          </div>

          <div className="upload-box">
            <label style={{ cursor: 'pointer', display: 'block' }}>
              <div style={{ fontSize: '40px' }}>🖼️</div>
              <div style={{ fontWeight: 600, marginTop: '10px' }}>Upload Images</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                {(assets.images || []).length} uploaded
              </div>
              <input type="file" accept="image/*" multiple onChange={(e) => handleFileUpload('image', e.target.files)} />
            </label>
            {progress.image > 0 && (
              <div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress.image}%`, background: '#2ecc71' }}></div>
                </div>
                <div className="progress-text">Uploading Images... {progress.image}%</div>
              </div>
            )}
            {(assets.images || []).length > 0 && (
              <div className="asset-list">
                {(assets.images || []).map((img, idx) => (
                  <div key={img.id} className="asset-item">
                    <span>{img.name}</span>
                    <button onClick={() => removeAsset('image', idx)}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="upload-box">
            <label style={{ cursor: 'pointer', display: 'block' }}>
              <div style={{ fontSize: '40px' }}>🎥</div>
              <div style={{ fontWeight: 600, marginTop: '10px' }}>Upload Videos</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                {(assets.videos || []).length} uploaded
              </div>
              <input type="file" accept="video/*" multiple onChange={(e) => handleFileUpload('video', e.target.files)} />
            </label>
            {progress.video > 0 && (
              <div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress.video}%`, background: '#2ecc71' }}></div>
                </div>
                <div className="progress-text">Uploading Videos... {progress.video}%</div>
              </div>
            )}
            {(assets.videos || []).length > 0 && (
              <div className="asset-list">
                {(assets.videos || []).map((vid, idx) => (
                  <div key={vid.id} className="asset-item">
                    <span>{vid.name}</span>
                    <button onClick={() => removeAsset('video', idx)}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleSave}
          style={{
            backgroundColor: '#3498db',
            color: 'white',
            padding: '10px 18px',
            border: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            cursor: 'pointer',
            marginTop: '20px'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#2980b9'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#3498db'}
        >
          Save Content
        </button>
      </div>
    </div>
  );
}
