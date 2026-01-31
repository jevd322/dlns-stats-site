import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Header } from '../components/Header';
import { fetchTree, fetchStats, fetchRandom, getMe, checkExists, uploadRecording, fetchAllStatuses } from '../utils/api';
import { showSuccess, showError, showInfo } from '../utils/toast';
import { AudioProcessor } from '../utils/audioProcessor';

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
  const [treeFilter, setTreeFilter] = useState('');
  const [volume, setVolume] = useState(80);
  const [boostDb, setBoostDb] = useState(0);
  const [existsStatus, setExistsStatus] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileStatuses, setFileStatuses] = useState({});
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordDuration, setRecordDuration] = useState('0:00');
  const [recordDurationExact, setRecordDurationExact] = useState('0:00.000');
  const [recordSize, setRecordSize] = useState('0 B');
  const [audioLevel, setAudioLevel] = useState(0);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [recorderMode, setRecorderMode] = useState('record');
  const fileInputRef = useRef(null);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [countdownEnabled, setCountdownEnabled] = useState(true);
  const [countdownSeconds, setCountdownSeconds] = useState(3);
  const [countdownRemaining, setCountdownRemaining] = useState(0);
  
  // Audio processing state
  const [gateThreshold, setGateThreshold] = useState(-40);
  const [gateHoldTime, setGateHoldTime] = useState(100);
  const [compression, setCompression] = useState(4);
  const [lowPassFreq, setLowPassFreq] = useState(80);
  const [midGain, setMidGain] = useState(0);
  const [highGain, setHighGain] = useState(0);
  const [outputVolume, setOutputVolume] = useState(0);
  const [showAdvancedAudio, setShowAdvancedAudio] = useState(false);
  const [advancedImportText, setAdvancedImportText] = useState('');
  const [trackDuration, setTrackDuration] = useState('—');
  const [trackDurationSeconds, setTrackDurationSeconds] = useState(0);
  const [trackPositionSeconds, setTrackPositionSeconds] = useState(0);
  
  // Effects state
  const [delayAmount, setDelayAmount] = useState(0);
  const [delayTime, setDelayTime] = useState(250);
  const [delayFeedback, setDelayFeedback] = useState(30);
  const [reverbAmount, setReverbAmount] = useState(0);
  const [distortionAmount, setDistortionAmount] = useState(0);
  const [pitchModAmount, setPitchModAmount] = useState(0);
  const [pitchModFreq, setPitchModFreq] = useState(5);
  
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const analyserRef = useRef(null);
  const playbackAnalyserRef = useRef(null);
  const startTimeRef = useRef(0);
  const durationIntervalRef = useRef(null);
  const levelIntervalRef = useRef(null);
  const countsRef = useRef({});
  const audioCtxRef = useRef(null);
  const gainNodeRef = useRef(null);
  const recordedUrlRef = useRef(null);
  const audioProcessorRef = useRef(null);
  const processorUpdateIntervalRef = useRef(null);
  const selectedDeviceRef = useRef('');
  const eqCanvasRef = useRef(null);
  const vizRafRef = useRef(null);
  const countdownTimerRef = useRef(null);

  const ADVANCED_DEFAULTS = useMemo(() => ({
    gateThreshold: -40,
    gateHoldTime: 100,
    compression: 4,
    lowPassFreq: 80,
    midGain: 0,
    highGain: 0,
    outputVolume: 0,
    delayAmount: 0,
    delayTime: 250,
    delayFeedback: 30,
    reverbAmount: 0,
    distortionAmount: 0,
    pitchModAmount: 0,
    pitchModFreq: 5,
    showAdvancedAudio: false,
  }), []);

  const allFolderPaths = useMemo(() => {
    const paths = [];
    const walk = (node) => {
      if (!node) return;
      const key = node.path || '';
      paths.push(key);
      (node.children || []).forEach(child => {
        if (child.type === 'dir' || child.children) {
          walk(child);
        }
      });
    };
    walk(tree);
    return paths;
  }, [tree]);

  const refreshDevices = async (preferId = '') => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(d => d.kind === 'audioinput');
    setDevices(audioInputs);
    if (audioInputs.length > 0) {
      const preferred = preferId || selectedDeviceRef.current || '';
      const match = preferred ? audioInputs.find(d => d.deviceId === preferred) : null;
      setSelectedDevice(match ? match.deviceId : audioInputs[0].deviceId);
    }
  };

  useEffect(() => {
    selectedDeviceRef.current = selectedDevice;
  }, [selectedDevice]);

  useEffect(() => {
    let preferredDeviceId = '';
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
        if (typeof parsed.selectedDevice === 'string') {
          preferredDeviceId = parsed.selectedDevice;
          setSelectedDevice(parsed.selectedDevice);
        }
        if (typeof parsed.countdownEnabled === 'boolean') setCountdownEnabled(parsed.countdownEnabled);
        if (typeof parsed.countdownSeconds === 'number') setCountdownSeconds(parsed.countdownSeconds);
        const adv = parsed.advancedAudio || {};
        if (typeof adv.gateThreshold === 'number') setGateThreshold(adv.gateThreshold);
        if (typeof adv.gateHoldTime === 'number') setGateHoldTime(adv.gateHoldTime);
        if (typeof adv.compression === 'number') setCompression(adv.compression);
        if (typeof adv.lowPassFreq === 'number') setLowPassFreq(adv.lowPassFreq);
        if (typeof adv.midGain === 'number') setMidGain(adv.midGain);
        if (typeof adv.highGain === 'number') setHighGain(adv.highGain);
        if (typeof adv.outputVolume === 'number') setOutputVolume(adv.outputVolume);
        if (typeof adv.delayAmount === 'number') setDelayAmount(adv.delayAmount);
        if (typeof adv.delayTime === 'number') setDelayTime(adv.delayTime);
        if (typeof adv.delayFeedback === 'number') setDelayFeedback(adv.delayFeedback);
        if (typeof adv.reverbAmount === 'number') setReverbAmount(adv.reverbAmount);
        if (typeof adv.distortionAmount === 'number') setDistortionAmount(adv.distortionAmount);
        if (typeof adv.pitchModAmount === 'number') setPitchModAmount(adv.pitchModAmount);
        if (typeof adv.pitchModFreq === 'number') setPitchModFreq(adv.pitchModFreq);
        if (typeof adv.showAdvancedAudio === 'boolean') setShowAdvancedAudio(adv.showAdvancedAudio);
      } catch {}
    }

    // Check auth - verify with server (cookie-based session)
    (async () => {
      try {
        const res = await getMe();
        if (res.ok && res.user) {
          setIsAuthenticated(true);
        }
      } catch {
        setIsAuthenticated(false);
      }
    })();

    // Load tree and stats
    loadLibrary();
    loadStats();

    // Get audio devices
    refreshDevices(preferredDeviceId);

    const handleDeviceChange = () => {
      refreshDevices(selectedDeviceRef.current);
    };
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
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
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      }
      if (recordedUrlRef.current) {
        URL.revokeObjectURL(recordedUrlRef.current);
      }
    };
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
      
      // Load file statuses
      try {
        const statuses = await fetchAllStatuses();
        setFileStatuses(statuses);
      } catch (err) {
        console.warn('Failed to load statuses:', err);
      }
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
      countdownEnabled,
      countdownSeconds,
      advancedAudio: {
        gateThreshold,
        gateHoldTime,
        compression,
        lowPassFreq,
        midGain,
        highGain,
        outputVolume,
        delayAmount,
        delayTime,
        delayFeedback,
        reverbAmount,
        distortionAmount,
        pitchModAmount,
        pitchModFreq,
        showAdvancedAudio,
      },
    };
    localStorage.setItem('wavebox.settings', JSON.stringify(payload));
  }, [
    volume,
    boostDb,
    normalize,
    autoplay,
    noiseSuppression,
    selectedDevice,
    countdownEnabled,
    countdownSeconds,
    gateThreshold,
    gateHoldTime,
    compression,
    lowPassFreq,
    midGain,
    highGain,
    outputVolume,
    delayAmount,
    delayTime,
    delayFeedback,
    reverbAmount,
    distortionAmount,
    pitchModAmount,
    pitchModFreq,
    showAdvancedAudio,
  ]);

  const getAdvancedSettings = () => ({
    gateThreshold,
    gateHoldTime,
    compression,
    lowPassFreq,
    midGain,
    highGain,
    outputVolume,
    delayAmount,
    delayTime,
    delayFeedback,
    reverbAmount,
    distortionAmount,
    pitchModAmount,
    pitchModFreq,
    showAdvancedAudio,
  });

  const applyAdvancedSettings = (settings) => {
    if (!settings || typeof settings !== 'object') return false;
    if (typeof settings.gateThreshold === 'number') setGateThreshold(settings.gateThreshold);
    if (typeof settings.gateHoldTime === 'number') setGateHoldTime(settings.gateHoldTime);
    if (typeof settings.compression === 'number') setCompression(settings.compression);
    if (typeof settings.lowPassFreq === 'number') setLowPassFreq(settings.lowPassFreq);
    if (typeof settings.midGain === 'number') setMidGain(settings.midGain);
    if (typeof settings.highGain === 'number') setHighGain(settings.highGain);
    if (typeof settings.outputVolume === 'number') setOutputVolume(settings.outputVolume);
    if (typeof settings.delayAmount === 'number') setDelayAmount(settings.delayAmount);
    if (typeof settings.delayTime === 'number') setDelayTime(settings.delayTime);
    if (typeof settings.delayFeedback === 'number') setDelayFeedback(settings.delayFeedback);
    if (typeof settings.reverbAmount === 'number') setReverbAmount(settings.reverbAmount);
    if (typeof settings.distortionAmount === 'number') setDistortionAmount(settings.distortionAmount);
    if (typeof settings.pitchModAmount === 'number') setPitchModAmount(settings.pitchModAmount);
    if (typeof settings.pitchModFreq === 'number') setPitchModFreq(settings.pitchModFreq);
    if (typeof settings.showAdvancedAudio === 'boolean') setShowAdvancedAudio(settings.showAdvancedAudio);
    return true;
  };

  const encodeAdvancedSettings = (settings) => {
    const clamp = (v, min, max) => Math.min(Math.max(Number(v), min), max);
    const values = [
      clamp(settings.gateThreshold, -100, 0) + 100,
      clamp(settings.gateHoldTime, 10, 500) - 10,
      clamp(settings.compression, 1, 12) - 1,
      clamp(settings.lowPassFreq, 20, 500) - 20,
      clamp(settings.midGain, -12, 12) + 12,
      clamp(settings.highGain, -12, 12) + 12,
      clamp(settings.outputVolume, -20, 12) + 20,
      clamp(settings.delayAmount, 0, 100),
      clamp(settings.delayTime, 50, 1000) - 50,
      clamp(settings.delayFeedback, 0, 80),
      clamp(settings.reverbAmount, 0, 100),
      clamp(settings.distortionAmount, 0, 100),
      clamp(settings.pitchModAmount, 0, 100),
      clamp(settings.pitchModFreq, 1, 20) - 1,
      settings.showAdvancedAudio ? 1 : 0,
    ];
    const widths = [7, 9, 4, 9, 5, 5, 6, 7, 10, 7, 7, 7, 7, 5, 1];
    const totalBits = widths.reduce((a, b) => a + b, 0);
    const bytes = new Uint8Array(Math.ceil(totalBits / 8));
    let bitPos = 0;
    values.forEach((v, idx) => {
      const width = widths[idx];
      let value = v;
      for (let i = 0; i < width; i += 1) {
        const byteIndex = Math.floor(bitPos / 8);
        const bitIndex = bitPos % 8;
        const bit = value & 1;
        bytes[byteIndex] |= bit << bitIndex;
        value >>= 1;
        bitPos += 1;
      }
    });
    const binary = String.fromCharCode(...bytes);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  };

  const decodeAdvancedSettings = (text) => {
    const cleaned = String(text || '').trim();
    if (!cleaned) return null;
    const padded = cleaned.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (padded.length % 4)) % 4;
    const base64 = padded + '='.repeat(padLen);
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

    const widths = [7, 9, 4, 9, 5, 5, 6, 7, 10, 7, 7, 7, 7, 5, 1];
    const totalBits = widths.reduce((a, b) => a + b, 0);
    const expectedBytes = Math.ceil(totalBits / 8);

    if (bytes.length >= expectedBytes) {
      const values = [];
      let bitPos = 0;
      for (let w = 0; w < widths.length; w += 1) {
        const width = widths[w];
        let value = 0;
        for (let i = 0; i < width; i += 1) {
          const byteIndex = Math.floor(bitPos / 8);
          const bitIndex = bitPos % 8;
          const bit = (bytes[byteIndex] >> bitIndex) & 1;
          value |= bit << i;
          bitPos += 1;
        }
        values.push(value);
      }

      return {
        gateThreshold: clamp(values[0] - 100, -100, 0),
        gateHoldTime: clamp(values[1] + 10, 10, 500),
        compression: clamp(values[2] + 1, 1, 12),
        lowPassFreq: clamp(values[3] + 20, 20, 500),
        midGain: clamp(values[4] - 12, -12, 12),
        highGain: clamp(values[5] - 12, -12, 12),
        outputVolume: clamp(values[6] - 20, -20, 12),
        delayAmount: clamp(values[7], 0, 100),
        delayTime: clamp(values[8] + 50, 50, 1000),
        delayFeedback: clamp(values[9], 0, 80),
        reverbAmount: clamp(values[10], 0, 100),
        distortionAmount: clamp(values[11], 0, 100),
        pitchModAmount: clamp(values[12], 0, 100),
        pitchModFreq: clamp(values[13] + 1, 1, 20),
        showAdvancedAudio: values[14] === 1,
      };
    }

    const expectedLegacyBytes = 15 * 2;
    if (bytes.length >= expectedLegacyBytes) {
      const view = new DataView(bytes.buffer);
      const read = (i) => view.getUint16(i * 2, true);
      return {
        gateThreshold: clamp(read(0) - 100, -100, 0),
        gateHoldTime: clamp(read(1) + 10, 10, 500),
        compression: clamp(read(2), 1, 12),
        lowPassFreq: clamp(read(3) + 20, 20, 500),
        midGain: clamp(read(4) - 12, -12, 12),
        highGain: clamp(read(5) - 12, -12, 12),
        outputVolume: clamp(read(6) - 20, -20, 12),
        delayAmount: clamp(read(7), 0, 100),
        delayTime: clamp(read(8) + 50, 50, 1000),
        delayFeedback: clamp(read(9), 0, 80),
        reverbAmount: clamp(read(10), 0, 100),
        distortionAmount: clamp(read(11), 0, 100),
        pitchModAmount: clamp(read(12), 0, 100),
        pitchModFreq: clamp(read(13), 1, 20),
        showAdvancedAudio: read(14) === 1,
      };
    }

    return null;
  };

  const handleExportAdvanced = async () => {
    const payload = encodeAdvancedSettings(getAdvancedSettings());
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(payload);
        showSuccess('Advanced settings string copied');
      }
    } catch {
      showError('Copy failed. You can still download the string.');
    }
  };

  const handleDownloadAdvanced = () => {
    const payload = encodeAdvancedSettings(getAdvancedSettings());
    const blob = new Blob([payload], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wavebox-advanced-settings-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('Advanced settings string downloaded');
  };

  const handleImportAdvanced = () => {
    try {
      const parsed = decodeAdvancedSettings(advancedImportText);
      if (applyAdvancedSettings(parsed)) {
        setAdvancedImportText('');
        showSuccess('Advanced settings applied');
      } else {
        showError('Invalid settings string');
      }
    } catch {
      showError('Invalid settings string. Please paste a valid export string.');
    }
  };

  const handleResetAdvanced = () => {
    applyAdvancedSettings(ADVANCED_DEFAULTS);
    showSuccess('Advanced settings reset to defaults');
  };

  const formatDurationPrecise = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00.000';
    const totalMs = Math.round(seconds * 1000);
    const ms = totalMs % 1000;
    const totalSeconds = Math.floor(totalMs / 1000);
    const s = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const m = totalMinutes % 60;
    const h = Math.floor(totalMinutes / 60);
    const base = h > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${m}`;
    return `${base}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  };

  const decodeBlobDuration = async (blob) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      return audioBuffer.duration;
    } catch {
      return null;
    } finally {
      try {
        if (audioContext.state !== 'closed') await audioContext.close();
      } catch {}
    }
  };

  const formatTimeShort = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const totalSeconds = Math.floor(seconds);
    const s = totalSeconds % 60;
    const m = Math.floor(totalSeconds / 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const sliderStyle = {
    width: '100%',
    height: '6px',
    borderRadius: '999px',
    background: 'linear-gradient(90deg, rgba(29,185,84,0.9), rgba(0,216,255,0.9))',
    appearance: 'none',
    outline: 'none',
  };

  const sliderThinStyle = {
    ...sliderStyle,
    height: '4px',
    background: 'linear-gradient(90deg, rgba(29,185,84,0.6), rgba(255,255,255,0.25))',
  };

  const cardStyle = {
    background: 'rgba(8, 10, 16, 0.55)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '12px',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
  };

  const fieldStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    background: 'rgba(0,0,0,0.35)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#ffffff',
    fontSize: '13px',
    lineHeight: '1.4',
  };

  // Setup gain node once
  useEffect(() => {
    if (!audioRef.current || gainNodeRef.current) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaElementSource(audioRef.current);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.85;
      const gain = ctx.createGain();
      source.connect(analyser);
      analyser.connect(gain);
      gain.connect(ctx.destination);
      audioCtxRef.current = ctx;
      gainNodeRef.current = gain;
      analyserRef.current = analyser;
      playbackAnalyserRef.current = analyser;
    } catch (e) {
      console.warn('AudioContext init failed', e);
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateDuration = () => {
      if (Number.isFinite(audio.duration)) {
        setTrackDuration(formatDurationPrecise(audio.duration));
        setTrackDurationSeconds(audio.duration);
      }
    };
    const updatePosition = () => {
      if (Number.isFinite(audio.currentTime)) {
        setTrackPositionSeconds(audio.currentTime);
      }
    };
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('timeupdate', updatePosition);
    audio.addEventListener('seeked', updatePosition);
    return () => {
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('timeupdate', updatePosition);
      audio.removeEventListener('seeked', updatePosition);
    };
  }, []);

  useEffect(() => {
    if (!showVisualizer) {
      if (vizRafRef.current) cancelAnimationFrame(vizRafRef.current);
      return;
    }
    const canvas = eqCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    if (!ctx || !analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const render = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(0, 0, width, height);

      analyser.getByteFrequencyData(dataArray);
      const barCount = Math.min(64, dataArray.length);
      const step = Math.floor(dataArray.length / barCount) || 1;
      const barWidth = width / barCount;

      for (let i = 0; i < barCount; i += 1) {
        const value = dataArray[i * step] / 255;
        const barHeight = Math.max(2, value * height);
        const x = i * barWidth;
        const y = height - barHeight;
        ctx.fillStyle = `rgba(29, 185, 84, ${0.25 + value * 0.6})`;
        ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
      }

      vizRafRef.current = requestAnimationFrame(render);
    };
    render();

    return () => {
      if (vizRafRef.current) cancelAnimationFrame(vizRafRef.current);
    };
  }, [showVisualizer, nowPlaying.path, isRecording]);

  // Apply volume/boost to gain node
  useEffect(() => {
    const gain = gainNodeRef.current;
    if (!gain) return;
    const base = Math.max(0, Math.min(1, volume / 100));
    const boostLinear = Math.pow(10, Math.max(0, boostDb) / 20);
    gain.gain.value = base * boostLinear;
  }, [volume, boostDb]);

  // Update audio processor settings in real-time during recording
  useEffect(() => {
    const processor = audioProcessorRef.current;
    if (!processor || !isRecording) return;
    
    processor.setGateThreshold(gateThreshold);
    processor.setGateHoldTime(gateHoldTime);
    processor.setCompression(compression);
    processor.setLowPass(lowPassFreq);
    processor.setMid(midGain);
    processor.setHigh(highGain);
    processor.setOutputVolume(outputVolume);
    processor.setDelay(delayAmount, delayTime, delayFeedback);
    processor.setReverb(reverbAmount);
    processor.setDistortion(distortionAmount);
    processor.setPitchModulation(pitchModAmount, pitchModFreq);
  }, [gateThreshold, gateHoldTime, compression, lowPassFreq, midGain, highGain, outputVolume, delayAmount, delayTime, delayFeedback, reverbAmount, distortionAmount, pitchModAmount, pitchModFreq, isRecording]);

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

  const beginRecording = async () => {
    try {
      const constraints = {
        audio: {
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
          noiseSuppression,
          echoCancellation: true,
        },
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        if (err && err.name === 'OverconstrainedError') {
          showInfo('Selected microphone not available. Using default input.');
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              noiseSuppression,
              echoCancellation: true,
            },
          });
        } else {
          throw err;
        }
      }

      const track = stream.getAudioTracks && stream.getAudioTracks()[0];
      const settings = track && track.getSettings ? track.getSettings() : null;
      if (settings && settings.deviceId) {
        await refreshDevices(settings.deviceId);
      }
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      
      // Create audio processor
      const processor = new AudioProcessor(audioContext);
      processor.setGateThreshold(gateThreshold);
      processor.setGateHoldTime(gateHoldTime);
      processor.setCompression(compression);
      processor.setLowPass(lowPassFreq);
      processor.setMid(midGain);
      processor.setHigh(highGain);
      processor.setOutputVolume(outputVolume);
      processor.setDelay(delayAmount, delayTime, delayFeedback);
      processor.setReverb(reverbAmount);
      processor.setDistortion(distortionAmount);
      processor.setPitchModulation(pitchModAmount, pitchModFreq);
      
      audioProcessorRef.current = processor;
      analyserRef.current = processor.getAnalyser();
      
      source.connect(processor.destination);
      source.connect(processor.getAnalyser()); // Direct connection for immediate display

      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        if (recordedUrlRef.current) {
          URL.revokeObjectURL(recordedUrlRef.current);
        }
        recordedUrlRef.current = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordSize(formatBytes(blob.size));
        decodeBlobDuration(blob).then((duration) => {
          if (duration != null) {
            setRecordDurationExact(formatDurationPrecise(duration));
          }
        });
        clearInterval(durationIntervalRef.current);
        clearInterval(levelIntervalRef.current);
        clearInterval(processorUpdateIntervalRef.current);
        setAudioLevel(0);
        analyserRef.current = playbackAnalyserRef.current;
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordDurationExact('0:00.000');
      startTimeRef.current = Date.now();

      // Duration timer
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        setRecordDuration(`${mins}:${secs.toString().padStart(2, '0')}`);
      }, 100);

      // Level meter with gate processing
      levelIntervalRef.current = setInterval(() => {
        if (processor) {
          const level = processor.getLevel();
          setAudioLevel(Math.min(100, level));
          
          // Update gate with current level
          const levelLinear = level / 100;
          processor.updateGate(levelLinear);
        }
      }, 50);

      showInfo('Recording started');
    } catch (err) {
      showError('Failed to start recording: ' + err.message);
    }
  };

  // Recording functions
  const startRecording = async () => {
    if (countdownRemaining > 0 || isRecording) return;
    if (!countdownEnabled || countdownSeconds <= 0) {
      beginRecording();
      return;
    }

    setCountdownRemaining(countdownSeconds);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    countdownTimerRef.current = setInterval(() => {
      setCountdownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          beginRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
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
    if (recordedUrlRef.current && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.src = recordedUrlRef.current;
      audioRef.current.play().catch(err => {
        showError('Failed to play recording: ' + err.message);
      });
    }
  };

  const downloadRecorded = () => {
    if (recordedUrlRef.current && recordedBlob) {
      const a = document.createElement('a');
      a.href = recordedUrlRef.current;
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

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    showSuccess(`Loaded: ${file.name}`);
  };

  const handleUploadRecording = async () => {
    const path = nowPlaying.path;
    const blob = uploadedFile || recordedBlob;
    if (!blob) {
      showError('Record or upload something first');
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

      await uploadRecording(blob, path);
      showSuccess('Upload submitted');
      // Refresh status to pending
      const updated = await checkExists(path);
      setExistsStatus(updated);
      // Clear uploaded file after successful submit
      setUploadedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
    const matchesFilter = (pathStr) => {
      if (!treeFilter.trim()) return true;
      const q = treeFilter.toLowerCase();
      return pathStr.toLowerCase().includes(q);
    };

    const hasMatchingDescendant = (n) => {
      if (n.type === 'file') return matchesFilter(n.path);
      return (n.children || []).some(hasMatchingDescendant);
    };

    if (node.type === 'file') {
      if (!matchesFilter(node.path)) return null;
      const isActive = nowPlaying.path === node.path;
      
      // Get file status (normalize path to lowercase and remove leading slash)
      const statusKey = node.path.toLowerCase().replace(/^\//, '');
      const status = fileStatuses[statusKey];
      const isPending = status?.status === 'pending';
      const isAccepted = status?.status === 'accepted';
      const statusBg = isAccepted ? 'rgba(29, 185, 84, 0.12)' : isPending ? 'rgba(245, 165, 36, 0.12)' : 'transparent';
      const statusBorder = isAccepted ? '1px solid rgba(29,185,84,0.4)' : isPending ? '1px solid rgba(245,165,36,0.3)' : '1px solid transparent';
      
      return (
        <div
          key={node.path}
          className="tree-item"
          style={{ paddingLeft: `${depth * 48 + 72}px`, padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s ease', fontSize: '13px', color: isActive ? '#ffffff' : '#b2b2b8', border: isActive ? '1px solid rgba(29,185,84,0.6)' : statusBorder, background: isActive ? 'rgba(29,185,84,0.15)' : statusBg, position: 'relative' }}
          onClick={() => playFile(node.path)}
          onMouseEnter={(e) => { e.currentTarget.style.background = isActive ? 'rgba(29,185,84,0.15)' : statusBg !== 'transparent' ? statusBg.replace(/0\.\d+/, m => String(Math.min(parseFloat(m) + 0.1, 0.25))) : 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#ffffff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? 'rgba(29,185,84,0.15)' : statusBg; e.currentTarget.style.color = isActive ? '#ffffff' : '#b2b2b8'; }}
        >
          <span style={{ position: 'absolute', left: `${depth * 48 + 48}px`, top: 0, bottom: 0, borderLeft: '1px dashed rgba(255,255,255,0.06)' }}></span>
          🎵 {node.name}
        </div>
      );
    }

    const pathKey = node.path || '';
    const isOpen = expanded.has(pathKey);
    const counts = countsRef.current[pathKey] || { files: 0, folders: 0 };
    if (treeFilter.trim() && !hasMatchingDescendant(node)) return null;
    return (
      <div key={pathKey || 'root'}>
        <div
          className="tree-item tree-folder"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: `${depth * 48 + 28}px`, padding: '4px 8px', fontSize: '13px', color: '#b2b2b8', fontWeight: 600, cursor: 'pointer', userSelect: 'none', position: 'relative', borderRadius: '6px' }}
          onClick={() => toggleFolder(pathKey)}
        >
          <span style={{ position: 'absolute', left: `${depth * 48 + 16}px`, top: 0, bottom: 0, borderLeft: '1px dashed rgba(255,255,255,0.06)' }}></span>
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
        <section className="shell" style={{ display: 'grid', gridTemplateColumns: '520px 1fr', gap: '20px', height: 'calc(100vh - 200px)' }}>
          {/* Sidebar */}
          <aside className="sidebar" style={{ background: 'rgba(22, 22, 34, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px', overflowY: 'auto', backdropFilter: 'blur(10px)' }}>
            <div className="side-head" style={{ marginBottom: '20px' }}>
              <div className="side-title" style={{ fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#b2b2b8', marginBottom: '12px' }}>
                📚 Your Library
              </div>
              <div style={{ color: '#7a7a82', fontSize: '12px' }}>
                <span>{stats.files}</span> files · <span>{stats.folders}</span> folders
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Filter path or name"
                value={treeFilter}
                onChange={(e) => setTreeFilter(e.target.value)}
                style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.14)', color: '#ffffff', fontSize: '13px' }}
              />
              <button
                onClick={() => setExpanded(new Set(allFolderPaths))}
                style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#ffffff', borderRadius: '10px', padding: '10px 12px', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}
              >
                Expand
              </button>
              <button
                onClick={() => setExpanded(new Set())}
                style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#ffffff', borderRadius: '10px', padding: '10px 12px', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}
              >
                Collapse
              </button>
            </div>
            <nav className="tree" style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '60vh', overflowY: 'auto' }}>
              {renderTree({ ...tree, type: 'dir', name: 'sounds', path: '' })}
            </nav>

            {!isAuthenticated && (
              <>
                <hr style={{ borderColor: 'rgba(255, 255, 255, 0.08)', margin: '16px 0' }} />
                <div style={{ background: 'rgba(29, 185, 84, 0.1)', border: '1px solid rgba(29, 185, 84, 0.3)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px', color: '#1db954' }}>🔐 Log in to Record</div>
                  <p style={{ fontSize: '12px', color: '#b2b2b8', marginBottom: '12px' }}>Sign in to submit audio files for review</p>
                  <button
                    onClick={() => {
                      const returnUrl = window.location.pathname + window.location.search;
                      window.location.href = `/auth/login?next=${encodeURIComponent(returnUrl)}`;
                    }}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(90deg, #1db954, #1ed760)',
                      border: 'none',
                      color: '#000',
                      padding: '10px 16px',
                      borderRadius: '10px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    Login with Discord
                  </button>
                </div>
              </>
            )}

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
            <div className="inner" style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {/* Now Playing */}
              <div className="now" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', background: 'rgba(29, 185, 84, 0.1)', border: '1px solid rgba(29, 185, 84, 0.3)', borderRadius: '12px', marginBottom: '28px' }}>
                <div style={{ width: '12px', height: '12px', background: '#1db954', borderRadius: '50%', animation: isPlaying ? 'pulse 1s infinite' : 'none', flexShrink: 0 }}></div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: '#ffffff' }}>{nowPlaying.title}</div>
                  <div style={{ fontSize: '12px', color: '#7a7a82', marginTop: '4px' }}>{nowPlaying.path}</div>
                  <div style={{ fontSize: '11px', color: '#b2b2b8', marginTop: '6px' }}>Length: <strong style={{ color: '#ffffff', fontWeight: 600 }}>{trackDuration}</strong></div>
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

              <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 48px', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', color: '#b2b2b8', textAlign: 'right' }}>{formatTimeShort(trackPositionSeconds)}</div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, trackDurationSeconds || 0)}
                  step="0.01"
                  value={Math.min(trackPositionSeconds, trackDurationSeconds || 0)}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setTrackPositionSeconds(next);
                    if (audioRef.current && Number.isFinite(next)) {
                      audioRef.current.currentTime = next;
                    }
                  }}
                  style={sliderStyle}
                />
                <div style={{ fontSize: '11px', color: '#b2b2b8' }}>{formatTimeShort(trackDurationSeconds)}</div>
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
                    <canvas ref={eqCanvasRef} style={{ width: '100%', height: '120px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px' }}></canvas>
                  </div>
                )}
                <div style={{ fontSize: '11px', color: '#7a7a82', marginTop: '8px', textAlign: 'center' }}>
                  Space = Play · N/P = Next/Prev · R = Random
                </div>
              </div>

              {/* Record Panel */}
              {recordPanelVisible && (
                <div className="record-panel visible" style={{ position: 'relative', background: 'linear-gradient(135deg, rgba(29, 185, 84, 0.08), rgba(13, 16, 24, 0.2))', border: '1px solid rgba(29, 185, 84, 0.25)', borderRadius: '16px', padding: '22px', display: 'flex', gap: '16px', animation: 'slideIn 0.4s ease', boxShadow: '0 14px 36px rgba(0,0,0,0.35)' }}>
                  <div style={{ width: '100%' }}>
                    <div style={{ fontWeight: 700, fontSize: '16px', color: '#1db954', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      🎙️ Record Your Audio
                    </div>
                    <p style={{ fontSize: '12px', color: '#7a7a82', marginBottom: '16px' }}>Record or upload audio to submit to the library</p>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      <button
                        onClick={() => setRecorderMode('record')}
                        style={{ flex: 1, background: recorderMode === 'record' ? 'linear-gradient(90deg, #1db954, #1ed760)' : 'rgba(255, 255, 255, 0.08)', border: recorderMode === 'record' ? 'none' : '1px solid rgba(255, 255, 255, 0.12)', color: recorderMode === 'record' ? '#000' : '#ffffff', borderRadius: '10px', padding: '12px 16px', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
                      >
                        🎤 Record
                      </button>
                      <button
                        onClick={() => setRecorderMode('upload')}
                        style={{ flex: 1, background: recorderMode === 'upload' ? 'linear-gradient(90deg, #1db954, #1ed760)' : 'rgba(255, 255, 255, 0.08)', border: recorderMode === 'upload' ? 'none' : '1px solid rgba(255, 255, 255, 0.12)', color: recorderMode === 'upload' ? '#000' : '#ffffff', borderRadius: '10px', padding: '12px 16px', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
                      >
                        📁 Upload
                      </button>
                    </div>

                    {recorderMode === 'record' && (
                      <>
                        <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                          <div>
                            <label style={{ fontSize: '12px', color: '#b2b2b8', display: 'block', marginBottom: '8px', fontWeight: 600 }}>Microphone</label>
                            <select 
                              value={selectedDevice} 
                              onChange={(e) => setSelectedDevice(e.target.value)}
                              style={fieldStyle}
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

                        <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                          <div>
                            <label style={{ fontSize: '12px', color: '#b2b2b8', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 600, cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={countdownEnabled}
                                onChange={(e) => setCountdownEnabled(e.target.checked)}
                              />
                              Countdown before recording
                            </label>
                          </div>
                          <div>
                            <label style={{ fontSize: '12px', color: '#b2b2b8', display: 'block', marginBottom: '8px', fontWeight: 600 }}>Countdown seconds</label>
                            <select
                              value={countdownSeconds}
                              onChange={(e) => setCountdownSeconds(Number(e.target.value))}
                              disabled={!countdownEnabled}
                              style={{ ...fieldStyle, color: countdownEnabled ? '#ffffff' : '#7a7a82' }}
                            >
                              {[1,2,3,4,5].map((s) => (
                                <option key={s} value={s}>{s} sec</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div style={{ fontSize: '12px', color: '#7a7a82', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Playback</div>
                        <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                          <div>
                            {countdownRemaining > 0 && (
                              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                                <div style={{ fontSize: '48px', fontWeight: 800, color: '#ffffff', textShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>{countdownRemaining}</div>
                              </div>
                            )}
                            <label style={{ fontSize: '12px', color: '#b2b2b8', display: 'block', marginBottom: '8px', fontWeight: 600 }}>Playback volume</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} disabled={isRecording || countdownRemaining > 0} style={{ ...sliderStyle, flex: 1 }} />
                              <span style={{ fontSize: '12px', color: '#dcdce0', minWidth: '42px', textAlign: 'right' }}>{volume}%</span>
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize: '12px', color: '#b2b2b8', display: 'block', marginBottom: '8px', fontWeight: 600 }}>Volume boost (dB)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <input type="range" min="0" max="12" value={boostDb} onChange={(e) => setBoostDb(Number(e.target.value))} style={{ ...sliderStyle, flex: 1 }} />
                              <span style={{ fontSize: '12px', color: '#dcdce0', minWidth: '42px', textAlign: 'right' }}>{boostDb} dB</span>
                            </div>
                          </div>
                        </div>

                        {/* Advanced Audio Processing */}
                        <div style={{ ...cardStyle, marginBottom: '16px' }}>
                          <button
                            onClick={() => setShowAdvancedAudio(!showAdvancedAudio)}
                            style={{ width: '100%', background: 'transparent', border: 'none', color: '#1db954', textAlign: 'left', fontSize: '13px', fontWeight: 700, cursor: 'pointer', padding: '0' }}
                          >
                            {showAdvancedAudio ? '▼' : '▶'} Advanced Audio Processing
                          </button>

                          <div style={{ display: 'grid', gap: '10px', marginTop: '10px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                              <input
                                value={advancedImportText}
                                onChange={(e) => setAdvancedImportText(e.target.value)}
                                placeholder="Paste preset string"
                                style={fieldStyle}
                              />
                              <button
                                onClick={handleImportAdvanced}
                                disabled={!advancedImportText.trim()}
                                style={{ background: !advancedImportText.trim() ? 'rgba(255,255,255,0.08)' : 'rgba(29, 185, 84, 0.2)', border: '1px solid rgba(255,255,255,0.12)', color: !advancedImportText.trim() ? '#7a7a82' : '#1db954', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, cursor: !advancedImportText.trim() ? 'not-allowed' : 'pointer' }}
                              >
                                Import
                              </button>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              <button
                                onClick={handleExportAdvanced}
                                style={{ background: 'rgba(29, 185, 84, 0.15)', border: '1px solid rgba(29, 185, 84, 0.35)', color: '#1db954', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                              >
                                Copy string
                              </button>
                              <button
                                onClick={handleDownloadAdvanced}
                                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#dcdce0', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                              >
                                Download string
                              </button>
                              <button
                                onClick={handleResetAdvanced}
                                style={{ background: 'rgba(255, 86, 86, 0.12)', border: '1px solid rgba(255, 86, 86, 0.3)', color: '#ff7b7b', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                              >
                                Reset defaults
                              </button>
                              <button
                                onClick={() => setAdvancedImportText('')}
                                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#dcdce0', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                              >
                                Clear
                              </button>
                            </div>
                            <div style={{ fontSize: '11px', color: '#7a7a82' }}>Tip: share presets by copying the compact string.</div>
                          </div>

                          {showAdvancedAudio && (
                            <div style={{ marginTop: '12px', display: 'grid', gap: '12px' }}>
                              <div>
                                <label style={{ fontSize: '11px', color: '#b2b2b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Noise Gate Threshold: {gateThreshold} dB</label>
                                <input type="range" min="-100" max="0" value={gateThreshold} onChange={(e) => setGateThreshold(Number(e.target.value))} style={sliderStyle} />
                                <div style={{ fontSize: '10px', color: '#7a7a82', marginTop: '4px' }}>Lower = more aggressive noise reduction</div>
                              </div>

                              <div>
                                <label style={{ fontSize: '11px', color: '#b2b2b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Gate Hold Time: {gateHoldTime} ms</label>
                                <input type="range" min="10" max="500" value={gateHoldTime} onChange={(e) => setGateHoldTime(Number(e.target.value))} style={sliderStyle} />
                                <div style={{ fontSize: '10px', color: '#7a7a82', marginTop: '4px' }}>Time gate stays open after signal drops below threshold</div>
                              </div>

                              <div>
                                <label style={{ fontSize: '11px', color: '#b2b2b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Compression: {compression}:1</label>
                                <input type="range" min="1" max="12" value={compression} onChange={(e) => setCompression(Number(e.target.value))} style={sliderStyle} />
                                <div style={{ fontSize: '10px', color: '#7a7a82', marginTop: '4px' }}>Reduces volume peaks for consistent levels</div>
                              </div>

                              <div>
                                <label style={{ fontSize: '11px', color: '#b2b2b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Low Pass Filter: {lowPassFreq} Hz</label>
                                <input type="range" min="20" max="500" value={lowPassFreq} onChange={(e) => setLowPassFreq(Number(e.target.value))} style={sliderStyle} />
                                <div style={{ fontSize: '10px', color: '#7a7a82', marginTop: '4px' }}>Removes rumble and background noise</div>
                              </div>

                              <div>
                                <label style={{ fontSize: '11px', color: '#b2b2b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Mid Boost: {midGain > 0 ? '+' : ''}{midGain} dB</label>
                                <input type="range" min="-12" max="12" value={midGain} onChange={(e) => setMidGain(Number(e.target.value))} style={sliderStyle} />
                                <div style={{ fontSize: '10px', color: '#7a7a82', marginTop: '4px' }}>Presence and clarity (3kHz)</div>
                              </div>

                              <div>
                                <label style={{ fontSize: '11px', color: '#b2b2b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>High Boost: {highGain > 0 ? '+' : ''}{highGain} dB</label>
                                <input type="range" min="-12" max="12" value={highGain} onChange={(e) => setHighGain(Number(e.target.value))} style={sliderStyle} />
                                <div style={{ fontSize: '10px', color: '#7a7a82', marginTop: '4px' }}>Brightness and detail (8kHz)</div>
                              </div>

                              <div>
                                <label style={{ fontSize: '11px', color: '#b2b2b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Output Volume: {outputVolume > 0 ? '+' : ''}{outputVolume} dB</label>
                                <input type="range" min="-20" max="12" value={outputVolume} onChange={(e) => setOutputVolume(Number(e.target.value))} style={sliderStyle} />
                                <div style={{ fontSize: '10px', color: '#7a7a82', marginTop: '4px' }}>Final output level</div>
                              </div>

                              {/* Divider */}
                              <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '8px 0' }} />

                              {/* Effects Section */}
                              <div style={{ fontWeight: 600, color: '#1db954', fontSize: '11px', marginBottom: '8px' }}>🎛️ EFFECTS</div>

                              <div>
                                <label style={{ fontSize: '11px', color: '#b2b2b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Delay/Echo: {delayAmount}%</label>
                                <input type="range" min="0" max="100" value={delayAmount} onChange={(e) => setDelayAmount(Number(e.target.value))} style={sliderStyle} />
                                <div style={{ fontSize: '10px', color: '#7a7a82', marginTop: '4px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                  <div>
                                    Time: <input type="range" min="50" max="1000" value={delayTime} onChange={(e) => setDelayTime(Number(e.target.value))} style={sliderThinStyle} /> {delayTime}ms
                                  </div>
                                  <div>
                                    Feedback: <input type="range" min="0" max="80" value={delayFeedback} onChange={(e) => setDelayFeedback(Number(e.target.value))} style={sliderThinStyle} /> {delayFeedback}%
                                  </div>
                                </div>
                              </div>

                              <div>
                                <label style={{ fontSize: '11px', color: '#b2b2b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Reverb: {reverbAmount}%</label>
                                <input type="range" min="0" max="100" value={reverbAmount} onChange={(e) => setReverbAmount(Number(e.target.value))} style={sliderStyle} />
                                <div style={{ fontSize: '10px', color: '#7a7a82', marginTop: '4px' }}>Room ambience and space</div>
                              </div>

                              <div>
                                <label style={{ fontSize: '11px', color: '#b2b2b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Distortion: {distortionAmount}%</label>
                                <input type="range" min="0" max="100" value={distortionAmount} onChange={(e) => setDistortionAmount(Number(e.target.value))} style={sliderStyle} />
                                <div style={{ fontSize: '10px', color: '#7a7a82', marginTop: '4px' }}>Saturation and edge</div>
                              </div>

                              <div>
                                <label style={{ fontSize: '11px', color: '#b2b2b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Pitch Modulation: {pitchModAmount}%</label>
                                <input type="range" min="0" max="100" value={pitchModAmount} onChange={(e) => setPitchModAmount(Number(e.target.value))} style={sliderStyle} />
                                <div style={{ fontSize: '10px', color: '#7a7a82', marginTop: '4px', display: 'grid', gridTemplateColumns: '1fr' }}>
                                  <div>
                                    Rate: <input type="range" min="1" max="20" value={pitchModFreq} onChange={(e) => setPitchModFreq(Number(e.target.value))} style={sliderThinStyle} /> {pitchModFreq} Hz
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
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
                      </>
                    )}

                    {recorderMode === 'upload' && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', padding: '12px 16px', fontWeight: 600, cursor: 'pointer', fontSize: '14px', color: '#ffffff', transition: 'all 0.2s ease' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
                        >
                          <span>Choose audio file</span>
                          <span style={{ fontSize: '12px', color: '#dcdce0' }}>wav, mp3, ogg</span>
                          <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                        </label>
                        <div style={{ fontSize: '12px', color: '#7a7a82', marginTop: '8px' }}>Uploads transcode to mp3 automatically.</div>
                      </div>
                    )}

                    {uploadedFile && (
                      <div style={{ background: 'rgba(29, 185, 84, 0.15)', border: '1px solid rgba(29, 185, 84, 0.3)', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#dcdce0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>📄 {uploadedFile.name}</span>
                        <button onClick={() => { setUploadedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ background: 'transparent', border: 'none', color: '#b2b2b8', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                      </div>
                    )}

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

                    {recorderMode === 'record' && (
                      <>
                        <div style={{ margin: '16px 0' }}>
                          <label style={{ fontSize: '11px', color: '#7a7a82', display: 'block', marginBottom: '8px' }}>Audio Level</label>
                          <div style={{ width: '100%', height: '8px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: 'linear-gradient(90deg, #1db954, #00d8ff)', width: `${audioLevel}%`, transition: 'width 0.05s linear' }}></div>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingTop: '16px', borderTop: '1px solid rgba(29, 185, 84, 0.2)' }}>
                          <div style={{ fontSize: '12px', color: '#7a7a82' }}>
                            Exact length: <strong style={{ color: '#ffffff', fontWeight: 600 }}>{recordDurationExact}</strong>
                          </div>
                          <div style={{ fontSize: '12px', color: '#7a7a82' }}>
                            Live timer: <strong style={{ color: '#ffffff', fontWeight: 600 }}>{recordDuration}</strong>
                          </div>
                          <div style={{ fontSize: '12px', color: '#7a7a82' }}>
                            Size: <strong style={{ color: '#ffffff', fontWeight: 600 }}>{recordSize}</strong>
                          </div>
                        </div>
                      </>
                    )}
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
