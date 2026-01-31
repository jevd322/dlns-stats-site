/**
 * Advanced audio processing for recording
 * Features: Noise gating, compression, EQ filters, effects
 */

export class AudioProcessor {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.source = null;
    this.destination = null;
    
    // Create processing nodes
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -50;
    this.compressor.knee.value = 40;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    // Noise gate setup
    this.gateGain = this.ctx.createGain();
    this.gateGain.gain.value = 1;
    
    // EQ - 3 band
    this.lowPassFilter = this.ctx.createBiquadFilter();
    this.lowPassFilter.type = 'highpass'; // Reduce rumble
    this.lowPassFilter.frequency.value = 80;
    this.lowPassFilter.Q.value = 0.7;

    this.midFilter = this.ctx.createBiquadFilter();
    this.midFilter.type = 'peaking';
    this.midFilter.frequency.value = 3000;
    this.midFilter.Q.value = 0.5;
    this.midFilter.gain.value = 0;

    this.highPassFilter = this.ctx.createBiquadFilter();
    this.highPassFilter.type = 'peaking';
    this.highPassFilter.frequency.value = 8000;
    this.highPassFilter.Q.value = 0.5;
    this.highPassFilter.gain.value = 0;

    // Effects
    // Delay (echo)
    this.delayNode = this.ctx.createDelay(5);
    this.delayNode.delayTime.value = 0;
    this.delayMix = this.ctx.createGain();
    this.delayMix.gain.value = 0;
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.value = 0;

    // Reverb (simple convolver)
    this.reverbMix = this.ctx.createGain();
    this.reverbMix.gain.value = 0;
    this.dryGain = this.ctx.createGain();
    this.dryGain.gain.value = 1;

    // Distortion/Saturation
    this.distortionGain = this.ctx.createGain();
    this.distortionGain.gain.value = 0;
    this.distortionWaveShaper = this.ctx.createWaveShaper();
    this.distortionWaveShaper.oversample = '4x';
    this.distortionWaveShaper.curve = this.makeDistortionCurve(0);

    // Pitch shift oscillators (chorus-like effect)
    this.pitchLfoGain = this.ctx.createGain();
    this.pitchLfoGain.gain.value = 0;
    this.pitchLfo = this.ctx.createOscillator();
    this.pitchLfo.frequency.value = 5; // 5 Hz modulation
    this.pitchLfoDepth = this.ctx.createGain();
    this.pitchLfoDepth.gain.value = 0;
    this.pitchLfo.connect(this.pitchLfoDepth);
    this.pitchLfo.start();

    // Delay node connections
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);

    // Final output gain
    this.outputGain = this.ctx.createGain();
    this.outputGain.gain.value = 1;

    // Analyser for level monitoring
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;

    // Connect chain
    this.compressor.connect(this.lowPassFilter);
    this.lowPassFilter.connect(this.midFilter);
    this.midFilter.connect(this.highPassFilter);
    
    // Effect routing
    this.highPassFilter.connect(this.dryGain);
    this.dryGain.connect(this.distortionGain);
    this.distortionGain.connect(this.distortionWaveShaper);
    
    // Delay send
    this.distortionWaveShaper.connect(this.delayNode);
    this.delayNode.connect(this.delayMix);
    
    // Mix outputs
    this.distortionWaveShaper.connect(this.outputGain);
    this.delayMix.connect(this.outputGain);
    this.reverbMix.connect(this.outputGain);
    
    this.outputGain.connect(this.analyser);

    // This node is the entry point
    this.destination = this.gateGain;
    this.gateGain.connect(this.compressor);
  }

  makeDistortionCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  // Set noise gate threshold (in dB, 0 to -100)
  setGateThreshold(thresholdDb) {
    const threshold = Math.pow(10, Math.max(-100, thresholdDb) / 20);
    this.gateThreshold = threshold;
  }

  // Set gate hold time (milliseconds)
  setGateHoldTime(ms) {
    this.gateHoldMs = Math.max(10, Math.min(1000, ms));
  }

  // Set compression amount (0-12)
  setCompression(ratio) {
    this.compressor.ratio.value = Math.max(1, Math.min(12, ratio));
  }

  // Set low-pass filter (rumble reduction)
  setLowPass(frequency) {
    this.lowPassFilter.frequency.value = Math.max(20, Math.min(500, frequency));
  }

  // Set mid-range boost (presence)
  setMid(gainDb) {
    this.midFilter.gain.value = Math.max(-12, Math.min(12, gainDb));
  }

  // Set high-pass filter (brightness)
  setHigh(gainDb) {
    this.highPassFilter.gain.value = Math.max(-12, Math.min(12, gainDb));
  }

  // Set output volume
  setOutputVolume(gainDb) {
    const linear = Math.pow(10, Math.max(-20, Math.min(12, gainDb)) / 20);
    this.outputGain.gain.value = linear;
  }

  // Delay/Echo effect (0-100%)
  setDelay(amountPercent, delayTimeMs, feedback) {
    const amount = Math.max(0, Math.min(1, amountPercent / 100));
    this.delayMix.gain.value = amount;
    this.delayNode.delayTime.value = Math.max(0.01, Math.min(5, delayTimeMs / 1000));
    this.delayFeedback.gain.value = Math.max(0, Math.min(0.8, feedback / 100));
  }

  // Reverb effect (0-100% wet)
  setReverb(amountPercent) {
    const amount = Math.max(0, Math.min(1, amountPercent / 100));
    this.reverbMix.gain.value = amount;
    this.dryGain.gain.value = 1 - amount * 0.3; // Reduce dry signal when reverb is active
  }

  // Distortion/Saturation (0-100)
  setDistortion(amountPercent) {
    const amount = Math.max(0, Math.min(100, amountPercent));
    this.distortionGain.gain.value = 1 + amount / 20;
    this.distortionWaveShaper.curve = this.makeDistortionCurve(amount / 10);
  }

  // Pitch modulation (0-100%, 1-20 Hz)
  setPitchModulation(amountPercent, frequencyHz) {
    const amount = Math.max(0, Math.min(100, amountPercent));
    this.pitchLfoGain.gain.value = amount / 100;
    this.pitchLfo.frequency.value = Math.max(1, Math.min(20, frequencyHz));
    this.pitchLfoDepth.gain.value = amount;
  }

  // Process audio level for gating
  updateGate(levelLinear) {
    if (!this.gateThreshold) return;
    
    if (levelLinear > this.gateThreshold) {
      if (this.gateGain.gain.value < 1) {
        this.gateGain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 0.01);
      }
      this.gateLastOpenTime = this.ctx.currentTime;
    } else {
      const holdTime = (this.gateHoldMs || 100) / 1000;
      const timeSinceOpen = this.ctx.currentTime - (this.gateLastOpenTime || 0);
      
      if (timeSinceOpen > holdTime) {
        if (this.gateGain.gain.value > 0) {
          this.gateGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.05);
        }
      }
    }
  }

  // Get current audio level (0-100)
  getLevel() {
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    return Math.min(100, (average / 255) * 100);
  }

  // Get analyser for visualization
  getAnalyser() {
    return this.analyser;
  }
}
