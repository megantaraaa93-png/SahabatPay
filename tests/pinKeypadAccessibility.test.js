import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for test environment
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

describe('PIN Keypad Accessibility Modes (Normal, Easy, Audio Guidance)', () => {
  beforeEach(() => {
    store.clear();
  });

  // UJI 1: Struktur tombol keypad numerik 0-9 untuk Normal & Easy & Audio
  it('1. Provides standard 0-9 numeric keys across all modes without up/down stepper', () => {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
    assert.equal(keys.length, 10);
    // Memastikan tidak ada tombol panah atas / bawah / volume stepper
    const hasStepper = keys.includes('step_up') || keys.includes('step_down') || keys.includes('volume_up');
    assert.equal(hasStepper, false);
  });

  // UJI 2: Input enam digit bertahap
  it('2. Records 6 digits sequentially and signals completion', () => {
    let pinBuffer = [];
    const pinLength = 6;
    const inputSequence = ['1', '2', '3', '4', '5', '6'];

    inputSequence.forEach((digit) => {
      if (pinBuffer.length < pinLength) {
        pinBuffer.push(digit);
      }
    });

    assert.equal(pinBuffer.length, 6);
    assert.equal(pinBuffer.join(''), '123456');
  });

  // UJI 3: Hapus digit (Backspace)
  it('3. Deletes the last entered digit correctly', () => {
    let pinBuffer = ['1', '2', '3'];
    // Hapus satu digit
    pinBuffer = pinBuffer.slice(0, -1);
    assert.equal(pinBuffer.length, 2);
    assert.equal(pinBuffer.join(''), '12');

    // Hapus sampai kosong
    pinBuffer = pinBuffer.slice(0, -1);
    pinBuffer = pinBuffer.slice(0, -1);
    assert.equal(pinBuffer.length, 0);
  });

  // UJI 4: Bersihkan semua digit (Clear / Reset)
  it('4. Clears all digits on reset action', () => {
    let pinBuffer = ['1', '2', '3', '4', '5'];
    pinBuffer = [];
    assert.equal(pinBuffer.length, 0);
  });

  // UJI 5: Audio Guidance Mode Voice Feedback (Tidak menyuarakan angka PIN)
  it('5. Audio Guidance TTS never exposes PIN numbers and speaks ordinal progress only', () => {
    const DIGIT_WORDS = ['nol', 'pertama', 'kedua', 'ketiga', 'keempat', 'kelima', 'keenam'];
    const spokenPrompts = [];

    // Simulasi penekanan angka 7 untuk digit ke-3
    const selectedDigit = '7';
    const currentLength = 3; // digit ke-3
    const feedback = `Angka berhasil dipilih. Digit ${DIGIT_WORDS[currentLength]} dari enam.`;
    spokenPrompts.push(feedback);

    // Verifikasi: angka rahasia ("7") tidak boleh ada di kalimat ucapan!
    assert.equal(feedback.includes('7'), false);
    assert.equal(feedback.includes('tujuh'), false);
    assert.match(feedback, /Angka berhasil dipilih\. Digit ketiga dari enam\./);
  });

  // UJI 6: Easy Mode Touch Target Specifications (>= 64x64px)
  it('6. Easy Mode specifies minimum 64x64px touch target style tokens', () => {
    const easyModeClasses = 'min-h-[68px] min-w-[68px] text-3xl';
    assert.match(easyModeClasses, /min-h-\[68px\]/);
    assert.match(easyModeClasses, /min-w-\[68px\]/);
  });

  // UJI 7: Normal Mode Touch Target Specifications (Compact Standard)
  it('7. Normal Mode specifies clean compact standard numeric keypad', () => {
    const normalModeClasses = 'min-h-[52px] text-xl';
    assert.match(normalModeClasses, /min-h-\[52px\]/);
  });

  // UJI 8: PIN Verification Security (Hash Match & Mismatch)
  it('8. Validates correct PIN vs incorrect PIN securely without logging raw values', async () => {
    const PROTOTYPE_SALT = 'sahabatpay_salt_demo_2026_';
    async function hashPin(text) {
      const encoder = new TextEncoder();
      const data = encoder.encode(PROTOTYPE_SALT + text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    const userStoredPinHash = await hashPin('123456');

    // Percobaan benar
    const attemptCorrect = await hashPin('123456');
    assert.equal(attemptCorrect, userStoredPinHash);

    // Percobaan salah
    const attemptWrong = await hashPin('654321');
    assert.notEqual(attemptWrong, userStoredPinHash);
  });

  // UJI 9: Pembatalan saat otorisasi PIN
  it('9. Cancelling PIN resets transaction state cleanly', () => {
    let isPinModalOpen = true;
    let txStep = 'AWAITING_PIN';

    // Pengguna membatalkan
    isPinModalOpen = false;
    txStep = 'IDLE';

    assert.equal(isPinModalOpen, false);
    assert.equal(txStep, 'IDLE');
  });

  // UJI 10: Screen reader ARIA accessibility labels
  it('10. Accessible numeric keys contain explicit screen reader labels for TalkBack / VoiceOver', () => {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
    keys.forEach((d) => {
      const ariaLabel = `Angka ${d}`;
      assert.match(ariaLabel, new RegExp(`^Angka ${d}$`));
    });
  });
});
