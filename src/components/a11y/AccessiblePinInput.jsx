import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Delete,
  RotateCcw,
  Volume2,
  Lock,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { useA11y } from '../../context/A11yContext';
import { useAudioGuidance } from '../../hooks/useAudioGuidance';
import Button from '../common/Button';

/**
 * Komponen AccessiblePinInput (SahabatPay Responsive PIN Keypad)
 *
 * Mengimplementasikan 3 perilaku PIN Keypad sesuai Mode Aksesibilitas:
 *
 * A. AUDIO GUIDANCE MODE (TUNANETRA):
 * - Keypad numerik 0-9 ramah screen reader (TalkBack / VoiceOver).
 * - Pengguna menggeser jari untuk menjelajahi tombol; screen reader membacakan nama tombol: "Angka 1", "Angka 2", dll.
 * - Pengguna memilih angka dengan double-tap native bawaan screen reader (tanpa custom touch listener yang bertabrakan).
 * - Setelah angka dipilih, TTS hanya membacakan status netral: "Angka berhasil dipilih" dan progres digit: "Digit ke-2 dari 6" (TIDAK membacakan angka PIN).
 * - Tombol kontrol dapat dijangkau: Hapus (Delete), Ulangi Instruksi, Bersihkan (Clear), dan Konfirmasi.
 *
 * B. NORMAL MODE:
 * - Keypad numerik standar 0-9 ringkas dan modern.
 * - Ketukan langsung pada angka.
 * - Tombol Hapus dan Konfirmasi.
 * - Hapus seluruh mekanisme up/down atau stepper.
 *
 * C. EASY MODE:
 * - Keypad numerik standar 0-9 dengan target sentuh ekstra besar minimal 64x64 piksel.
 * - Jarak antartombol lega, kontras tinggi.
 * - Tombol Hapus, Koreksi, dan Konfirmasi besar dan mudah dijangkau.
 * - Tidak ada mekanisme stepper atau up/down.
 */

const DIGIT_WORDS = [
  'nol',
  'pertama',
  'kedua',
  'ketiga',
  'keempat',
  'kelima',
  'keenam',
];

export default function AccessiblePinInput({
  pinLength = 6,
  onComplete,
  disabled = false,
  autoFocus = true,
  onCancel,
}) {
  const { isEasyMode, isAudioMode } = useA11y();
  const { playTickSound, playSuccessSound, playErrorSound, speakText } = useAudioGuidance();

  // Buffer digit PIN tersimpan di memory React (TIDAK di LocalStorage)
  const [pinDigits, setPinDigits] = useState([]);
  const containerRef = useRef(null);

  const isCompleted = pinDigits.length === pinLength;

  // Nonaktifkan mikrofon saat komponen input PIN aktif demi privasi
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('sahabatpay:pin-active', { detail: { active: true } })
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent('sahabatpay:pin-active', { detail: { active: false } })
      );
    };
  }, []);

  // Pengumuman instruksi awal saat masuk di Audio Guidance Mode
  useEffect(() => {
    if (isAudioMode) {
      speakText(
        'Keypad PIN enam digit aktif. Jelajahi tombol angka nol sampai sembilan dengan menggeser jari, lalu ketuk dua kali untuk memilih angka. Angka rahasia tidak akan dibacakan demi keamanan.'
      );
    }
  }, [isAudioMode, speakText]);

  // Handler memilih digit (0-9)
  const handleDigitSelect = useCallback(
    (digit) => {
      if (disabled || isCompleted) return;

      setPinDigits((prev) => {
        if (prev.length >= pinLength) return prev;
        const next = [...prev, String(digit)];
        const digitIndex = next.length;

        // Feedback nada tick
        playTickSound(520 + Number(digit) * 25);

        // Feedback getaran jika perangkat mendukung
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(15);
        }

        // Feedback suara khusus Audio Mode
        if (isAudioMode) {
          if (digitIndex === pinLength) {
            playSuccessSound();
            speakText(
              'Angka berhasil dipilih. Enam digit PIN lengkap. Tekan tombol Konfirmasi atau sistem sedang memvalidasi.'
            );
          } else {
            const wordOrder = DIGIT_WORDS[digitIndex] || `ke-${digitIndex}`;
            speakText(`Angka berhasil dipilih. Digit ${wordOrder} dari enam.`);
          }
        }

        // Trigger onComplete jika sudah mencapai 6 digit
        if (next.length === pinLength && onComplete) {
          setTimeout(() => {
            onComplete(next.join(''));
          }, 200);
        }

        return next;
      });
    },
    [disabled, isCompleted, pinLength, isAudioMode, playTickSound, playSuccessSound, speakText, onComplete]
  );

  // Hapus satu digit terakhir
  const handleDelete = useCallback(() => {
    if (disabled || pinDigits.length === 0) return;

    setPinDigits((prev) => {
      const next = prev.slice(0, -1);
      playTickSound(380);

      if (isAudioMode) {
        if (next.length === 0) {
          speakText('Satu digit dihapus. Belum ada digit terisi.');
        } else {
          const wordOrder = DIGIT_WORDS[next.length] || `ke-${next.length}`;
          speakText(`Satu digit dihapus. Tersisa digit ${wordOrder} dari enam.`);
        }
      }

      return next;
    });
  }, [disabled, pinDigits.length, isAudioMode, playTickSound, speakText]);

  // Bersihkan seluruh digit (Reset)
  const handleClear = useCallback(() => {
    if (disabled || pinDigits.length === 0) return;

    setPinDigits([]);
    playTickSound(320);

    if (isAudioMode) {
      speakText('Seluruh digit PIN telah dibersihkan. Silakan masukkan dari digit pertama.');
    }
  }, [disabled, pinDigits.length, isAudioMode, playTickSound, speakText]);

  // Ulangi instruksi penggunaan keypad
  const handleRepeatInstruction = useCallback(() => {
    if (isAudioMode) {
      const filled = pinDigits.length;
      speakText(
        `Panduan: Saat ini ${filled} dari enam digit telah terisi. Geser jari untuk menemukan tombol angka nol sampai sembilan, lalu ketuk dua kali untuk memilih angka.`
      );
    }
  }, [isAudioMode, pinDigits.length, speakText]);

  // Konfirmasi manual (opsional, selain auto onComplete)
  const handleManualConfirm = useCallback(() => {
    if (pinDigits.length === pinLength && onComplete) {
      onComplete(pinDigits.join(''));
    } else if (isAudioMode) {
      playErrorSound();
      speakText(`PIN belum lengkap. Baru terisi ${pinDigits.length} dari enam digit.`);
    }
  }, [pinDigits, pinLength, onComplete, isAudioMode, playErrorSound, speakText]);

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div
      ref={containerRef}
      className={`w-full flex flex-col items-center gap-4 ${
        isEasyMode ? 'p-4' : 'p-2'
      }`}
      role="region"
      aria-label="Keypad input PIN rahasia"
    >
      {/* 1. INDIKATOR PROGRES 6 DIGIT */}
      <div
        className="flex items-center justify-center gap-3 py-2"
        role="status"
        aria-label={`${pinDigits.length} dari ${pinLength} digit telah terisi`}
      >
        {[...Array(pinLength)].map((_, i) => {
          const isFilled = i < pinDigits.length;
          return (
            <div
              key={i}
              className={`transition-all duration-200 rounded-full border-2 ${
                isEasyMode ? 'h-6 w-6' : 'h-4 w-4'
              } ${
                isFilled
                  ? 'bg-brand-forest border-brand-forest scale-110 shadow-sm'
                  : 'bg-stone-100 border-stone-300 dark:bg-stone-800 dark:border-stone-600'
              }`}
              aria-hidden="true"
            />
          );
        })}
      </div>

      <p className="sr-only" aria-live="polite">
        {pinDigits.length === pinLength
          ? 'Enam digit PIN lengkap.'
          : `${pinDigits.length} digit telah dimasukkan.`}
      </p>

      {/* 2. AUDIO GUIDANCE MODE CONTROLS: Tombol Ulangi Instruksi khusus */}
      {isAudioMode && (
        <div className="w-full flex justify-center pb-1">
          <button
            type="button"
            onClick={handleRepeatInstruction}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-brand-emerald/10 text-brand-emerald hover:bg-brand-emerald/20 focus-visible:ring-2 focus-visible:ring-brand-emerald"
            aria-label="Ulangi instruksi panduan keypad suara"
          >
            <HelpCircle size={14} aria-hidden="true" />
            <span>Ulangi Instruksi</span>
          </button>
        </div>
      )}

      {/* 3. KEYPAD GRID NUMERIK (0-9) SESUAI MODE */}
      <div
        className={`w-full max-w-sm grid grid-cols-3 ${
          isEasyMode ? 'gap-3.5' : isAudioMode ? 'gap-2.5' : 'gap-2'
        }`}
        role="group"
        aria-label="Tombol angka numerik"
      >
        {/* Tombol Angka 1 sampai 9 */}
        {keys.map((digit) => (
          <button
            key={digit}
            type="button"
            disabled={disabled || isCompleted}
            onClick={() => handleDigitSelect(digit)}
            aria-label={`Angka ${digit}`}
            className={`flex items-center justify-center font-extrabold rounded-2xl border transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-forest disabled:opacity-40 ${
              isEasyMode
                ? 'min-h-[68px] min-w-[68px] text-3xl bg-white border-stone-300 shadow-md active:bg-stone-100'
                : isAudioMode
                ? 'min-h-[64px] min-w-[64px] text-2xl bg-white border-brand-border shadow-sm active:bg-brand-cream hover:bg-brand-cream/60'
                : 'min-h-[52px] text-xl bg-white border-stone-200 shadow-sm active:bg-stone-100 hover:bg-stone-50'
            } text-brand-charcoal dark:bg-stone-800 dark:border-stone-700 dark:text-stone-100`}
          >
            {digit}
          </button>
        ))}

        {/* Baris Bawah: Tombol Hapus (Kiri) */}
        <button
          type="button"
          disabled={disabled || pinDigits.length === 0}
          onClick={handleDelete}
          aria-label="Hapus satu digit terakhir"
          className={`flex flex-col items-center justify-center font-bold rounded-2xl border transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-coral disabled:opacity-30 ${
            isEasyMode
              ? 'min-h-[68px] min-w-[68px] text-sm bg-rose-50 border-rose-200 text-rose-800 active:bg-rose-100'
              : isAudioMode
              ? 'min-h-[64px] min-w-[64px] text-xs bg-rose-50 border-rose-200 text-rose-700 active:bg-rose-100'
              : 'min-h-[52px] text-xs bg-stone-100 border-stone-200 text-stone-700 active:bg-stone-200'
          }`}
        >
          <Delete
            size={isEasyMode ? 24 : isAudioMode ? 22 : 18}
            aria-hidden="true"
          />
          <span className="mt-0.5">Hapus</span>
        </button>

        {/* Tombol Angka 0 (Tengah) */}
        <button
          type="button"
          disabled={disabled || isCompleted}
          onClick={() => handleDigitSelect('0')}
          aria-label="Angka 0"
          className={`flex items-center justify-center font-extrabold rounded-2xl border transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-forest disabled:opacity-40 ${
            isEasyMode
              ? 'min-h-[68px] min-w-[68px] text-3xl bg-white border-stone-300 shadow-md active:bg-stone-100'
              : isAudioMode
              ? 'min-h-[64px] min-w-[64px] text-2xl bg-white border-brand-border shadow-sm active:bg-brand-cream hover:bg-brand-cream/60'
              : 'min-h-[52px] text-xl bg-white border-stone-200 shadow-sm active:bg-stone-100 hover:bg-stone-50'
          } text-brand-charcoal dark:bg-stone-800 dark:border-stone-700 dark:text-stone-100`}
        >
          0
        </button>

        {/* Tombol Bersihkan / Konfirmasi (Kanan) */}
        {pinDigits.length === pinLength ? (
          <button
            type="button"
            onClick={handleManualConfirm}
            aria-label="Konfirmasi enam digit PIN"
            className={`flex flex-col items-center justify-center font-bold rounded-2xl border transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-emerald ${
              isEasyMode
                ? 'min-h-[68px] min-w-[68px] text-sm bg-emerald-600 text-white border-emerald-700 active:bg-emerald-700'
                : isAudioMode
                ? 'min-h-[64px] min-w-[64px] text-xs bg-emerald-600 text-white border-emerald-700 active:bg-emerald-700'
                : 'min-h-[52px] text-xs bg-brand-forest text-white border-brand-forest active:bg-brand-forest/90'
            }`}
          >
            <CheckCircle2
              size={isEasyMode ? 24 : isAudioMode ? 22 : 18}
              aria-hidden="true"
            />
            <span className="mt-0.5">Konfirmasi</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled || pinDigits.length === 0}
            onClick={handleClear}
            aria-label="Bersihkan semua digit PIN"
            className={`flex flex-col items-center justify-center font-bold rounded-2xl border transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-amber-500 disabled:opacity-30 ${
              isEasyMode
                ? 'min-h-[68px] min-w-[68px] text-sm bg-amber-50 border-amber-200 text-amber-800 active:bg-amber-100'
                : isAudioMode
                ? 'min-h-[64px] min-w-[64px] text-xs bg-amber-50 border-amber-200 text-amber-800 active:bg-amber-100'
                : 'min-h-[52px] text-xs bg-stone-100 border-stone-200 text-stone-600 active:bg-stone-200'
            }`}
          >
            <RotateCcw
              size={isEasyMode ? 22 : isAudioMode ? 20 : 16}
              aria-hidden="true"
            />
            <span className="mt-0.5">Reset</span>
          </button>
        )}
      </div>

      {/* Pesan Keamanan Privasi */}
      <div className="flex items-center gap-1.5 text-xs text-brand-muted mt-1" role="note">
        <Lock size={13} className="shrink-0 text-brand-emerald" aria-hidden="true" />
        <span>PIN dienkripsi secara lokal & tidak pernah disuarakan.</span>
      </div>
    </div>
  );
}
