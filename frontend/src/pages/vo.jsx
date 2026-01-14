import React, { useEffect, useState } from 'react';
import { fetchVoContent } from '../utils/api';

const pageStyles = `
  .vo-content {
    line-height: 1.8;
    font-size: 16px;
  }
  .vo-content h1 {
    font-size: 32px;
    margin-bottom: 20px;
    font-weight: 800;
  }
  .vo-content h2 {
    font-size: 24px;
    margin-top: 30px;
    margin-bottom: 15px;
    font-weight: 700;
  }
  .vo-content h3 {
    font-size: 20px;
    margin-top: 25px;
    margin-bottom: 12px;
    font-weight: 600;
  }
  .vo-content p {
    margin-bottom: 15px;
  }
  .vo-content strong {
    font-weight: 700;
    color: #1db954;
  }
  .vo-content em {
    font-style: italic;
    color: #b2b2b8;
  }
  .vo-content a {
    color: #3498db;
    text-decoration: none;
  }
  .vo-content a:hover {
    text-decoration: underline;
  }
  .vo-content img {
    max-width: 100%;
    border-radius: 10px;
    margin: 20px 0;
  }
  .vo-content ul, .vo-content ol {
    margin-left: 20px;
    margin-bottom: 15px;
  }
  .vo-content li {
    margin-bottom: 8px;
  }
  .vo-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    overflow: hidden;
  }
  .vo-content table th {
    background: rgba(255,255,255,0.05);
    padding: 12px 16px;
    text-align: left;
    font-weight: 700;
    border-bottom: 2px solid rgba(255,255,255,0.12);
    color: #1db954;
  }
  .vo-content table td {
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .vo-content table tr:last-child td {
    border-bottom: none;
  }
  .media-section {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    padding: 20px;
    margin-top: 30px;
  }
  .media-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 15px;
    margin-top: 15px;
  }
  .media-item {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    overflow: hidden;
  }
  .media-item img, .media-item video {
    width: 100%;
    display: block;
  }
  .media-item-title {
    padding: 10px;
    font-size: 13px;
    color: #b2b2b8;
  }
`;

function renderMarkdown(md) {
  if (!md || typeof md !== 'string') return '';
  
  let html = md;
  
  // Handle tables - match markdown table format
  // Pattern: | header | header | \n | --- | --- | \n | cell | cell |
  const tableRegex = /\|(.+)\|\n\|[\s:|-]+\|\n((?:\|.+\|\n?)*)/gm;
  
  html = html.replace(tableRegex, (match) => {
    const lines = match.trim().split('\n').filter(line => line.trim());
    
    if (lines.length < 2) return match;
    
    // Extract header
    const headerLine = lines[0];
    const headerCells = headerLine.split('|').map(c => c.trim()).filter(c => c !== '');

    if (headerCells.length === 0) return match;
    
    // Build table with centered headers
    let table = '<table style="width:100%; border-collapse:collapse; margin:20px 0;"><thead><tr style="background-color:#2ecc71;">';
    headerCells.forEach(cell => {
      table += `<th style="padding:12px; text-align:center; border:1px solid #444; font-weight:bold; color:#000;">${cell}</th>`;
    });
    table += '</tr></thead><tbody>';
    
    // Process body rows (skip separator row at index 1)
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('|')) {
        const cells = line.split('|').map(c => c.trim()).filter(c => c !== '');
        if (cells.length > 0) {
          table += '<tr>';
          cells.forEach(cell => {
            table += `<td style="padding:10px; text-align:center; border:1px solid #444; color:#f1f1f1;">${cell}</td>`;
          });
          table += '</tr>';
        }
      }
    }
    
    table += '</tbody></table>';
    return table;
  });
  
  // Continue with other markdown
  html = html
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/!\[(.*?)\]\((.*?)\)/gim, '<img alt="$1" src="$2" />')
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>')
    .replace(/\n/gim, '<br />');
  
  return html;
}

export function VoHub() {
  const [markdown, setMarkdown] = useState('');
  const [assets, setAssets] = useState({ zip: null, images: [], videos: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetchVoContent();
        const data = response.content || response;
        setMarkdown(data.markdown || data.html || '');
        setAssets({
          zip: data.assets?.zip || null,
          images: Array.isArray(data.assets?.images) ? data.assets.images : [],
          videos: Array.isArray(data.assets?.videos) ? data.assets.videos : []
        });
      } catch (err) {
        console.error('Failed to load content:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d12', color: '#fff' }}>
      <style>{pageStyles}</style>
      
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '60px 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#7a7a82' }}>Loading...</div>
        ) : (
          <>
            <div className="vo-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) || '<p style="color:#7a7a82">No content available yet.</p>' }} />

            {/* ZIP Download Section */}
            {assets.zip && (
              <div className="media-section">
                <h3 style={{ margin: 0, marginBottom: '15px' }}>📦 Download Pack</h3>
                <div style={{ background: 'rgba(29, 185, 84, 0.1)', border: '1px solid rgba(29, 185, 84, 0.3)', borderRadius: '10px', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{assets.zip.name}</div>
                    <div style={{ fontSize: '12px', color: '#b2b2b8', marginTop: '4px' }}>
                      {(assets.zip.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                  <button style={{ background: 'linear-gradient(90deg, #1db954, #1ed760)', border: 'none', color: '#000', padding: '10px 16px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>
                    Download
                  </button>
                </div>
              </div>
            )}

            {/* Images Section */}
            {assets.images && assets.images.length > 0 && (
              <div className="media-section">
                <h3 style={{ margin: 0, marginBottom: '15px' }}>🖼️ Images</h3>
                <div className="media-grid">
                  {assets.images.map((img, idx) => (
                    <div key={img.id || idx} className="media-item">
                      <img src={`/vo/uploads/${img.name}`} alt={img.name} />
                      <div className="media-item-title">{img.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Videos Section */}
            {assets.videos && assets.videos.length > 0 && (
              <div className="media-section">
                <h3 style={{ margin: 0, marginBottom: '15px' }}>🎥 Videos</h3>
                <div className="media-grid">
                  {assets.videos.map((vid, idx) => (
                    <div key={vid.id || idx} className="media-item">
                      <video controls src={`/vo/uploads/${vid.name}`} />
                      <div className="media-item-title">{vid.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
