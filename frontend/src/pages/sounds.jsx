import React, { useState, useEffect, useRef } from 'react';
import { Header } from '../components/Header';
import { fetchTree, fetchStats, fetchRandom, getMe, checkExists, uploadRecording } from '../utils/api';
import { showSuccess, showError, showInfo } from '../utils/toast';

export function SoundLibrary() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [recordPanelVisible, setRecordPanelVisible] = useState(false);
  const [tree, setTree] = useState({ children: [] });
  const [expanded, setExpanded] = useState(() => new Set());
  const [stats, setStats] = useState({ files: 0, folders: 0 });
  const [nowPlaying, setNowPlaying] = useState({ title: 'Nothing playing', path: '—' });
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [normalize, setNormalize] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [volume, setVolume] = useState(80);
  const [boostDb, setBoostDb] = useState(0);
  const [existsStatus, setExistsStatus] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordDuration, setRecordDuration] = useState('0:00');
  const [recordSize, setRecordSize] = useState('0 B');
  const [audioLevel, setAudioLevel] = useState(0);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const analyserRef = useRef(null);
  const startTimeRef = useRef(0);
  const durationIntervalRef = useRef(null);
  const levelIntervalRef = useRef(null);
  const countsRef = useRef({});
  const audioCtxRef = useRef(null);
  const gainNodeRef = useRef(null);

  useEffect(() => {
    // Load persisted settings
    const saved = localStorage.getItem('wavebox.settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.volume === 'number') setVolume(parsed.volume);
        if (typeof parsed.boostDb === 'number') setBoostDb(parsed.boostDb);
        if (typeof parsed.normalize === 'boolean') setNormalize(parsed.normalize);
        if (typeof parsed.autoplay === 'boolean') setAutoplay(parsed.autoplay);
        if (typeof parsed.noiseSuppression === 'boolean') setNoiseSuppression(parsed.noiseSuppression);
        if (typeof parsed.selectedDevice === 'string') setSelectedDevice(parsed.selectedDevice);
      } catch {}
    }

    // Check auth
    (async () => {
      try {
        const res = await getMe();
        if (res.ok && res.user) {
          setIsAuthenticated(true);
        }
      } catch {}
    })();

    // Load tree and stats
    loadLibrary();
    loadStats();

    // Get audio devices
    if (navigator.mediaDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const audioInputs = devices.filter(d => d.kind === 'audioinput');
        setDevices(audioInputs);
        if (audioInputs.length > 0) {
          const match = audioInputs.find(d => d.deviceId === selectedDevice);
          setSelectedDevice(match ? match.deviceId : audioInputs[0].deviceId);
        }
      });
    }

    // Keyboard shortcuts
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === ' ') {
        e.preventDefault();
        handlePlayPause();
      } else if (e.key === 'n' || e.key === 'N') {
        handleNext();
      } else if (e.key === 'p' || e.key === 'P') {
        handlePrev();
      } else if (e.key === 'r' || e.key === 'R') {
        handleRandom();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadLibrary = async () => {
    try {
      const data = await fetchTree();
      setTree(data);
      extractPlaylist(data);
      // Collapse all by default; expand only root level on first load
      const initialExpanded = new Set();
      initialExpanded.add('');
      setExpanded(initialExpanded);

      // Build counts map for folders for clearer hierarchy display
      const countsMap = {};
      const buildCounts = (node) => {
        if (!node || !node.children) return { files: 0, folders: 0 };
        let files = 0, folders = 0;
        for (const child of node.children) {
          if (child.type === 'file') {
            files += 1;
          } else if (child.type === 'dir' || child.children) {
            folders += 1;
            const c = buildCounts(child);
            files += c.files;
            folders += c.folders;
          }
        }
        const key = node.path || '';
        countsMap[key] = { files, folders };
        return { files, folders };
      };
      buildCounts(data);
      countsRef.current = countsMap;
    } catch (err) {
      showError('Failed to load library');
    }
  };

  // Persist settings
  useEffect(() => {
    const payload = {
      volume,
      boostDb,
      normalize,
      autoplay,
      noiseSuppression,
      selectedDevice,
    };
    localStorage.setItem('wavebox.settings', JSON.stringify(payload));
  }, [volume, boostDb, normalize, autoplay, noiseSuppression, selectedDevice]);

  // Setup gain node once
  useEffect(() => {
    if (!audioRef.current || gainNodeRef.current) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaElementSource(audioRef.current);
      const gain = ctx.createGain();
      source.connect(gain).connect(ctx.destination);
      audioCtxRef.current = ctx;
      gainNodeRef.current = gain;
    } catch (e) {
      console.warn('AudioContext init failed', e);
    }
  }, []);

  // Apply volume/boost to gain node
  useEffect(() => {
    const gain = gainNodeRef.current;
    if (!gain) return;
    const base = Math.max(0, Math.min(1, volume / 100));
    const boostLinear = Math.pow(10, Math.max(0, boostDb) / 20);
    gain.gain.value = base * boostLinear;
  }, [volume, boostDb]);

  const loadStats = async () => {
    try {
      const data = await fetchStats();
      setStats({
        files: data.files || 0,
        folders: data.folders || 0,
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const extractPlaylist = (node) => {
    const files = [];
    const traverse = (n) => {
      if (n.type === 'file') {
        files.push(n.path);
      } else if (n.children) {
        n.children.forEach(traverse);
      }
    };
    traverse(node);
    setPlaylist(files);
  };

  const playFile = (path) => {
    const url = normalize
      ? `/sounds/stream/${encodeURIComponent(path).replace(/%2F/g, '/')}?normalize=1`
      : `/sounds/media/${encodeURIComponent(path).replace(/%2F/g, '/')}`;
    
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play().catch(err => {
        showError('Failed to play file');
      });
    }

    setNowPlaying({
      title: path.split('/').pop(),
      path: path,
    });

    const idx = playlist.indexOf(path);
    setCurrentIndex(idx >= 0 ? idx : -1);
    setIsPlaying(true);

    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleNext = () => {
    if (playlist.length === 0) return;
    const nextIdx = (currentIndex + 1) % playlist.length;
    setCurrentIndex(nextIdx);
    playFile(playlist[nextIdx]);
  };

  const handlePrev = () => {
    if (playlist.length === 0) return;
    const prevIdx = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentIndex(prevIdx);
    playFile(playlist[prevIdx]);
  };

  const handleRandom = async () => {
    try {
      const res = await fetchRandom();
      if (res.ok && res.path) {
        playFile(res.path);
      }
    } catch (err) {
      showError('Failed to get random track');
    }
  };

  // Recording functions
  const startRecording = async () => {
    try {
      const constraints = {
        audio: {
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
          noiseSuppression,
          echoCancellation: true,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        setRecordSize(formatBytes(blob.size));
        clearInterval(durationIntervalRef.current);
        clearInterval(levelIntervalRef.current);
        setAudioLevel(0);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      startTimeRef.current = Date.now();

      // Duration timer
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        setRecordDuration(`${mins}:${secs.toString().padStart(2, '0')}`);
      }, 100);

      // Level meter
      levelIntervalRef.current = setInterval(() => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(Math.min(100, (average / 255) * 100));
        }
      }, 50);

      showInfo('Recording started');
    } catch (err) {
      showError('Failed to start recording: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
      showSuccess('Recording stopped');
    }
  };

  const playRecorded = () => {
    if (recordedBlob) {
      const url = URL.createObjectURL(recordedBlob);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      }
    }
  };

  const downloadRecorded = () => {
    if (recordedBlob) {
      const url = URL.createObjectURL(recordedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording_${Date.now()}.webm`;
      a.click();
      showSuccess('Download started');
    }
  };

  const handleCheckExists = async () => {
    const path = nowPlaying.path;
    if (!path || path === '—') {
      showError('Select a sound first');
      return;
    }
    try {
      setIsChecking(true);
      const res = await checkExists(path);
      setExistsStatus(res);
      if (!res.ok) {
        showError(res.error || 'Failed to check status');
      }
    } catch (err) {
      showError('Failed to check status');
    } finally {
      setIsChecking(false);
    }
  };

  const handleUploadRecording = async () => {
    const path = nowPlaying.path;
    if (!recordedBlob) {
      showError('Record something first');
      return;
    }
    if (!path || path === '—') {
      showError('Select a sound first');
      return;
    }

    try {
      setIsUploading(true);

      // Re-check to prevent duplicates
      const status = await checkExists(path);
      setExistsStatus(status);
      if (status.ok && status.exists) {
        showError(`Already ${status.status || 'present'} at ${status.path}`);
        return;
      }

      await uploadRecording(recordedBlob, path);
      showSuccess('Upload submitted');
      // Refresh status to pending
      const updated = await checkExists(path);
      setExistsStatus(updated);
    } catch (err) {
      showError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const toggleFolder = (path) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  };

  const renderTree = (node, depth = 0) => {
    if (node.type === 'file') {
      return (
        <div
          key={node.path}
          className="tree-item"
          style={{ paddingLeft: `${depth * 16 + 28}px`, padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease', fontSize: '13px', color: '#b2b2b8', border: '1px solid transparent', position: 'relative' }}
          onClick={() => playFile(node.path)}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#ffffff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#b2b2b8'; }}
        >
          <span style={{ position: 'absolute', left: `${depth * 16 + 16}px`, top: 0, bottom: 0, borderLeft: '1px dashed rgba(255,255,255,0.06)' }}></span>
          🎵 {node.name}
        </div>
      );
    }

    const pathKey = node.path || '';
    const isOpen = expanded.has(pathKey);
    const counts = countsRef.current[pathKey] || { files: 0, folders: 0 };
    return (
      <div key={pathKey || 'root'}>
        <div
          className="tree-item tree-folder"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: `${depth * 16 + 12}px`, padding: '8px 12px', fontSize: '13px', color: '#b2b2b8', fontWeight: 600, cursor: 'pointer', userSelect: 'none', position: 'relative', borderRadius: '8px' }}
          onClick={() => toggleFolder(pathKey)}
        >
          <span style={{ position: 'absolute', left: `${depth * 16}px`, top: 0, bottom: 0, borderLeft: '1px dashed rgba(255,255,255,0.06)' }}></span>
          <span style={{ display: 'inline-block', width: '14px', textAlign: 'center', color: isOpen ? '#1db954' : '#b2b2b8' }}>{isOpen ? '▼' : '▶'}</span>
          <span role="img" aria-label="folder">📁</span>
          <span style={{ color: '#ffffff' }}>{node.name}</span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#7a7a82', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '999px' }}>{counts.folders} folders</span>
            <span style={{ fontSize: '11px', color: '#7a7a82', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '999px' }}>{counts.files} files</span>
          </span>
        </div>
        {isOpen && node.children && (
          <div>
            {node.children.map(child => renderTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0d0d12' }}>
      <Header
        onRecordClick={() => setRecordPanelVisible(!recordPanelVisible)}
        isAuthenticated={isAuthenticated}
        onNormalizeChange={setNormalize}
        onAutoplayChange={setAutoplay}
        normalize={normalize}
        autoplay={autoplay}
        volume={volume}
        boostDb={boostDb}
        onVolumeChange={setVolume}
        onBoostChange={setBoostDb}
      />

      <main className="wrap mainwrap" style={{ maxWidth: '1680px', margin: '0 auto', padding: '20px' }}>
        <section className="shell" style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '20px', height: 'calc(100vh - 200px)' }}>
          {/* Sidebar */}
          <aside className="sidebar" style={{ background: 'rgba(22, 22, 34, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '24px', overflowY: 'auto', backdropFilter: 'blur(10px)' }}>
            <div className="side-head" style={{ marginBottom: '20px' }}>
              <div className="side-title" style={{ fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#b2b2b8', marginBottom: '12px' }}>
                📚 Your Library
              </div>
              <div style={{ color: '#7a7a82', fontSize: '12px' }}>
                <span>{stats.files}</span> files · <span>{stats.folders}</span> folders
              </div>
            </div>
            <nav className="tree" style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '68vh', overflowY: 'auto' }}>
              {renderTree({ ...tree, type: 'dir', name: 'sounds', path: '' })}
            </nav>

            {isAuthenticated && (
              <>
                <hr style={{ borderColor: 'rgba(255, 255, 255, 0.08)', margin: '16px 0' }} />
                <div className="side-title" style={{ color: '#1db954', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase' }}>
                  🎙️ Record
                </div>
                <p style={{ fontSize: '12px', color: '#7a7a82', marginBottom: '12px' }}>Submit new audio files for review</p>
                <button
                  onClick={() => setRecordPanelVisible(!recordPanelVisible)}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(90deg, #1db954, #1ed760)',
                    border: 'none',
                    color: '#000',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {recordPanelVisible ? 'Hide' : 'Start'} Recording
                </button>
              </>
            )}
          </aside>

          {/* Main Panel */}
          <section className="panel" style={{ background: 'rgba(22, 22, 34, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="inner" style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
              {/* Now Playing */}
              <div className="now" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', background: 'rgba(29, 185, 84, 0.1)', border: '1px solid rgba(29, 185, 84, 0.3)', borderRadius: '12px', marginBottom: '28px' }}>
                <div style={{ width: '12px', height: '12px', background: '#1db954', borderRadius: '50%', animation: isPlaying ? 'pulse 1s infinite' : 'none', flexShrink: 0 }}></div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: '#ffffff' }}>{nowPlaying.title}</div>
                  <div style={{ fontSize: '12px', color: '#7a7a82', marginTop: '4px' }}>{nowPlaying.path}</div>
                </div>
              </div>

              {/* Controls */}
              <div className="controls-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' }}>
                <button onClick={handleRandom} className="btn accent" style={{ background: 'linear-gradient(90deg, #1db954, #1ed760)', border: 'none', color: '#000', borderRadius: '10px', padding: '12px 16px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>
                  🎲 Random
                </button>
                <button onClick={handlePlayPause} className="btn" style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#ffffff', borderRadius: '10px', padding: '12px 16px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>
                  {isPlaying ? '⏸ Pause' : '▶ Play'}
                </button>
                <button onClick={handlePrev} className="btn" style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#ffffff', borderRadius: '10px', padding: '12px 16px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>
                  ⏮ Prev
                </button>
                <button onClick={handleNext} className="btn" style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#ffffff', borderRadius: '10px', padding: '12px 16px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>
                  ⏭ Next
                </button>
              </div>

              {/* Visualizer */}
              <div className="eq-wrap" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px', marginBottom: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 600, color: '#b2b2b8', fontSize: '13px' }}>📊 Visualizer</div>
                  <button onClick={() => setShowVisualizer(!showVisualizer)} className="btn" style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#ffffff', borderRadius: '10px', padding: '8px 12px', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}>
                    {showVisualizer ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showVisualizer && (
                  <div style={{ marginTop: '12px' }}>
                    <canvas id="eq" style={{ width: '100%', height: '120px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px' }}></canvas>
                  </div>
                )}
                <div style={{ fontSize: '11px', color: '#7a7a82', marginTop: '8px', textAlign: 'center' }}>
                  Space = Play · N/P = Next/Prev · R = Random
                </div>
              </div>

              {/* Record Panel */}
              {recordPanelVisible && (
                <div className="record-panel visible" style={{ background: 'linear-gradient(135deg, rgba(29, 185, 84, 0.1), rgba(29, 185, 84, 0.05))', border: '2px solid rgba(29, 185, 84, 0.3)', borderRadius: '16px', padding: '24px', display: 'flex', gap: '20px', animation: 'slideIn 0.4s ease' }}>
                  <div style={{ width: '100%' }}>
                    <div style={{ fontWeight: 700, fontSize: '16px', color: '#1db954', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      🎙️ Record Your Audio
                    </div>
                    <p style={{ fontSize: '12px', color: '#7a7a82', marginBottom: '16px' }}>Record and submit new audio to the library</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: '#b2b2b8', display: 'block', marginBottom: '8px', fontWeight: 600 }}>Microphone</label>
                        <select 
                          value={selectedDevice} 
                          onChange={(e) => setSelectedDevice(e.target.value)}
                          style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255, 255, 255, 0.14)', color: '#ffffff', fontSize: '13px', lineHeight: '1.4' }}
                        >
                          {devices.map(d => (
                            <option key={d.deviceId} value={d.deviceId}>{d.label || 'Microphone'}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#b2b2b8', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 600, cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={noiseSuppression}
                            onChange={(e) => setNoiseSuppression(e.target.checked)}
                          />
                          Noise Suppression
                        </label>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: '#b2b2b8', display: 'block', marginBottom: '8px', fontWeight: 600 }}>Playback volume</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} style={{ flex: 1 }} />
                          <span style={{ fontSize: '12px', color: '#dcdce0', minWidth: '42px', textAlign: 'right' }}>{volume}%</span>
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#b2b2b8', display: 'block', marginBottom: '8px', fontWeight: 600 }}>Volume boost (dB)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input type="range" min="0" max="12" value={boostDb} onChange={(e) => setBoostDb(Number(e.target.value))} style={{ flex: 1 }} />
                          <span style={{ fontSize: '12px', color: '#dcdce0', minWidth: '42px', textAlign: 'right' }}>{boostDb} dB</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                      <button 
                        onClick={startRecording} 
                        disabled={isRecording}
                        style={{ background: isRecording ? 'rgba(255, 255, 255, 0.08)' : 'linear-gradient(90deg, #ff006e, #ff1744)', border: 'none', color: isRecording ? '#7a7a82' : '#fff', borderRadius: '10px', padding: '12px 16px', fontWeight: 600, cursor: isRecording ? 'not-allowed' : 'pointer', fontSize: '14px' }}
                      >
                        ⏺ Start
                      </button>
                      <button 
                        onClick={stopRecording} 
                        disabled={!isRecording}
                        style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.08)', color: isRecording ? '#ffffff' : '#7a7a82', borderRadius: '10px', padding: '12px 16px', fontWeight: 600, cursor: isRecording ? 'pointer' : 'not-allowed', fontSize: '14px' }}
                      >
                        ⏹ Stop
                      </button>
                      <button 
                        onClick={playRecorded} 
                        disabled={!recordedBlob}
                        style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.08)', color: recordedBlob ? '#ffffff' : '#7a7a82', borderRadius: '10px', padding: '12px 16px', fontWeight: 600, cursor: recordedBlob ? 'pointer' : 'not-allowed', fontSize: '14px' }}
                      >
                        ▶ Play
                      </button>
                      <button 
                        onClick={downloadRecorded} 
                        disabled={!recordedBlob}
                        style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.08)', color: recordedBlob ? '#ffffff' : '#7a7a82', borderRadius: '10px', padding: '12px 16px', fontWeight: 600, cursor: recordedBlob ? 'pointer' : 'not-allowed', fontSize: '14px' }}
                      >
                        💾 Save
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '12px', alignItems: 'end', marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#b2b2b8' }}>
                        <div style={{ fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>Target path</div>
                        <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#dcdce0', minHeight: '40px' }}>
                          {nowPlaying.path && nowPlaying.path !== '—' ? nowPlaying.path : 'Select a sound to target'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={handleCheckExists}
                          disabled={isChecking}
                          style={{ flex: 1, background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff', borderRadius: '10px', padding: '12px 12px', fontWeight: 600, cursor: isChecking ? 'not-allowed' : 'pointer', fontSize: '14px' }}
                        >
                          {isChecking ? 'Checking...' : 'Check status'}
                        </button>
                        <button
                          onClick={handleUploadRecording}
                          disabled={isUploading}
                          style={{ flex: 1, background: 'linear-gradient(90deg, #1db954, #1ed760)', border: 'none', color: '#000', borderRadius: '10px', padding: '12px 12px', fontWeight: 700, cursor: isUploading ? 'not-allowed' : 'pointer', fontSize: '14px' }}
                        >
                          {isUploading ? 'Submitting...' : 'Submit recording'}
                        </button>
                      </div>
                    </div>

                    {existsStatus && (
                      <div style={{ marginBottom: '12px', fontSize: '13px', color: '#b2b2b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ height: '10px', width: '10px', borderRadius: '50%', background: existsStatus.exists ? (existsStatus.status === 'accepted' ? '#1db954' : '#f5a524') : '#7a7a82', display: 'inline-block' }}></span>
                        <span>
                          {existsStatus.exists
                            ? `Already ${existsStatus.status || 'pending'} at ${existsStatus.path || nowPlaying.path}`
                            : `Available • ${existsStatus.path || nowPlaying.path || ''}`}
                        </span>
                      </div>
                    )}

                    <div style={{ margin: '16px 0' }}>
                      <label style={{ fontSize: '11px', color: '#7a7a82', display: 'block', marginBottom: '8px' }}>Audio Level</label>
                      <div style={{ width: '100%', height: '8px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'linear-gradient(90deg, #1db954, #00d8ff)', width: `${audioLevel}%`, transition: 'width 0.05s linear' }}></div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingTop: '16px', borderTop: '1px solid rgba(29, 185, 84, 0.2)' }}>
                      <div style={{ fontSize: '12px', color: '#7a7a82' }}>
                        Duration: <strong style={{ color: '#ffffff', fontWeight: 600 }}>{recordDuration}</strong>
                      </div>
                      <div style={{ fontSize: '12px', color: '#7a7a82' }}>
                        Size: <strong style={{ color: '#ffffff', fontWeight: 600 }}>{recordSize}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </section>
      </main>

      {/* Audio element */}
      <audio 
        ref={audioRef} 
        crossOrigin="anonymous"
        onEnded={() => {
          setIsPlaying(false);
          if (autoplay) handleNext();
        }}
      ></audio>
    </div>
  );
}
