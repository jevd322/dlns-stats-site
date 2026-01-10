import React, { useState } from 'react';
import { Settings } from 'lucide-react';

export function Header({ onRecordClick, isAuthenticated, onNormalizeChange, onAutoplayChange, normalize, autoplay }) {
  const [search, setSearch] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  return (
    <header className="header" style={{
      background: 'linear-gradient(180deg, rgba(22, 22, 34, 0.4), transparent)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(10px)',
      padding: '16px 20px',
    }}>
      <div className="wrap" style={{ width: '100%', padding: 0 }}>
        <div style={{
          maxWidth: '1600px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 700,
            fontSize: '18px',
            background: 'linear-gradient(90deg, #1db954, #00d8ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              background: '#1db954',
              borderRadius: '50%',
              animation: 'pulse 2s infinite',
            }}></div>
            <span>Wavebox</span>
          </div>

          <div className="search" style={{
            flex: 1,
            maxWidth: '400px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <input
              type="text"
              placeholder="Search audio…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                flex: 1,
                outline: 'none',
                fontSize: '14px',
              }}
            />
          </div>

          <div className="header-actions" style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
          }}>
            {onAutoplayChange && (
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                cursor: 'pointer',
                color: '#b2b2b8',
              }}>
                <input
                  type="checkbox"
                  checked={autoplay}
                  onChange={(e) => onAutoplayChange(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Autoplay
              </label>
            )}

            {onNormalizeChange && (
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                cursor: 'pointer',
                color: '#b2b2b8',
              }}>
                <input
                  type="checkbox"
                  checked={normalize}
                  onChange={(e) => onNormalizeChange(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Normalize
              </label>
            )}

            {isAuthenticated && onRecordClick && (
              <button
                onClick={onRecordClick}
                style={{
                  background: 'linear-gradient(90deg, #1db954, #1ed760)',
                  border: 'none',
                  color: '#000',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.target.style.boxShadow = '0 10px 30px rgba(29, 185, 84, 0.3)';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.boxShadow = 'none';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                🎙️ Record
              </button>
            )}

            <button
              onClick={() => setShowSettings(!showSettings)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.08)';
              }}
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
