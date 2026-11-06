/**
 * Layanan Audio Terpusat SahabatPay.
 * Mengelola Speech Synthesis (Text-to-Speech id-ID) dan Sound Effects (Web Audio API).
 *
 * Prinsip Utama Aksesibilitas & Keamanan:
 * 1. Tidak memutar audio secara otomatis tanpa izin/interaksi pengguna.
 * 2. Suara dapat dihentikan (stop), diulang (repeat), atau dibisukan (mute) kapan saja.
 * 3. Tidak pernah membacakan angka PIN, password, atau data autentikasi rahasia.
 * 4. Mencegah audio bertumpuk dengan membatalkan pengumuman lama saat pengumuman baru yang lebih prioritas dipicu.
 */

class AudioService {
  constructor() {
    this.isMuted = false;
    this.speechRate = 0.95; // Default ramah pemahaman fonem Bahasa Indonesia
    this.lastSpokenText = '';
    this.audioCtx = null;
    this.isSpeaking = false;
    this.onSpeakingStateChange = null;
  }

  /**
   * Menginisialisasi AudioContext secara aman saat ada interaksi pengguna
   */
  getAudioContext() {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Menyaring teks agar tidak memuat digit PIN atau password sensitif
   */
  sanitizeText(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/pin\s*(?:adalah|:|=)?\s*\d{4,6}/gi, 'PIN tersembunyi')
      .replace(/password\s*(?:adalah|:|=)?\s*\S+/gi, 'kata sandi tersembunyi')
      .replace(/\b\d{6}\b/g, 'rahasia');
  }

  /**
   * Membacakan teks dalam Bahasa Indonesia
   * @param {string} text - Teks yang akan dibacakan
   * @param {Object} [options]
   * @param {boolean} [options.cancelPrevious=true] - Batalkan suara sebelumnya
   * @param {number} [options.rate] - Kecepatan bicara (0.8 - 1.2)
   */
  speak(text, options = {}) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (this.isMuted) return;

    const { cancelPrevious = true, rate = this.speechRate } = options;
    const cleanText = this.sanitizeText(text).trim();
    if (!cleanText) return;

    if (cancelPrevious) {
      window.speechSynthesis.cancel();
    }

    this.lastSpokenText = cleanText;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'id-ID';
    utterance.rate = rate;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (this.onSpeakingStateChange) this.onSpeakingStateChange(true);
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      if (this.onSpeakingStateChange) this.onSpeakingStateChange(false);
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      if (this.onSpeakingStateChange) this.onSpeakingStateChange(false);
    };

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Mengulang kalimat terakhir yang dibacakan
   */
  repeatLast() {
    if (this.lastSpokenText) {
      this.speak(this.lastSpokenText);
    }
  }

  /**
   * Menghentikan seluruh pembacaan suara seketika
   */
  stop() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
    if (this.onSpeakingStateChange) this.onSpeakingStateChange(false);
  }

  /**
   * Mengatur status bisu (mute)
   */
  setMuted(muted) {
    this.isMuted = Boolean(muted);
    if (this.isMuted) {
      this.stop();
    }
  }

  /**
   * Mengatur kecepatan bicara
   */
  setSpeechRate(rate) {
    if (rate >= 0.7 && rate <= 1.3) {
      this.speechRate = rate;
    }
  }

  /* =========================================================================
     EFEK NADA UMPAN BALIK (WEB AUDIO API - SYNTHETIC SOUNDS)
     ========================================================================= */

  /**
   * Nada Sukses (Chime harmonis C5 -> G5)
   */
  playSuccessSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.18); // G5

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn('Audio tone error', e);
    }
  }

  /**
   * Nada Peringatan / Gagal (Beep turun segitiga)
   */
  playErrorSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.setValueAtTime(220, now + 0.12);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn('Audio tone error', e);
    }
  }

  /**
   * Nada Klik / Tick Pendek (untuk perubahan angka stepper / radar tick)
   * @param {number} [freq=600]
   */
  playTickSound(freq = 600) {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {
      console.warn('Tick sound error', e);
    }
  }

  /**
   * Nada Radar QRIS Dinamis (Frekuensi dan interval mengikuti estimasi ukuran QR)
   * @param {number} frequency - Rentang 440 Hz s/d 900 Hz
   * @param {number} volume - Rentang 0.05 s/d 0.25
   */
  playRadarPulse(frequency = 550, volume = 0.15) {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Batasi batas aman agar tidak menyakitkan telinga
      const safeFreq = Math.min(Math.max(frequency, 400), 950);
      const safeVol = Math.min(Math.max(volume, 0.05), 0.25);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(safeFreq, now);

      gain.gain.setValueAtTime(safeVol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      console.warn('Radar audio pulse error', e);
    }
  }
}

export const audioService = new AudioService();
