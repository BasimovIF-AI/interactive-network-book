/**
 * SoundManager.js — Синтезатор тактильных и сетевых звуков на чистом Web Audio API.
 * Работает без внешних .mp3/.wav файлов оффлайн, воспроизводит живые звуковые сигналы.
 */

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = localStorage.getItem('sound_muted') === 'true';
    this.morseOsc = null;
    this.morseGain = null;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('sound_muted', this.isMuted);
    return this.isMuted;
  }

  /**
   * Телеграфный зуммер Морзе (старт)
   */
  startMorseTone(freq = 650) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    this.stopMorseTone();

    this.morseOsc = this.ctx.createOscillator();
    this.morseGain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    this.morseOsc.type = 'sine';
    this.morseOsc.frequency.setValueAtTime(freq, t);

    this.morseGain.gain.setValueAtTime(0.001, t);
    this.morseGain.gain.exponentialRampToValueAtTime(0.15, t + 0.01);

    this.morseOsc.connect(this.morseGain);
    this.morseGain.connect(this.ctx.destination);
    this.morseOsc.start(t);
  }

  /**
   * Телеграфный зуммер Морзе (стоп)
   */
  stopMorseTone() {
    if (this.morseGain && this.ctx) {
      const t = this.ctx.currentTime;
      this.morseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
      setTimeout(() => {
        if (this.morseOsc) {
          try { this.morseOsc.stop(); } catch (e) {}
          this.morseOsc.disconnect();
          this.morseOsc = null;
        }
      }, 30);
    }
  }

  /**
   * Короткая точка или тире
   */
  playMorseTone(isDash = false) {
    if (this.isMuted) return;
    this.startMorseTone(isDash ? 580 : 720);
    setTimeout(() => {
      this.stopMorseTone();
    }, isDash ? 180 : 70);
  }

  /**
   * Тактильный щелчок переключателя (тумблера)
   */
  click() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.03);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.03);
  }

  /**
   * Звук отправки пакета по проводу
   */
  packetSend() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.07);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  /**
   * Звук успешного приема пакета адресатом
   */
  packetArrive() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1320, t + 0.1);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  /**
   * Звук сетевой коллизии / помехи
   */
  collision() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.linearRampToValueAtTime(50, t + 0.15);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  /**
   * Звук правильного ответа / победы в квизе
   */
  success() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime + (i * 0.08);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  /**
   * Звук ошибки / блокировки пакета
   */
  error() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.linearRampToValueAtTime(110, t + 0.15);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.15);
  }
}

export const sounds = new SoundManager();
