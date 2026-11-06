import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Volume2,
  ChevronUp,
  Check,
  RotateCcw,
  Delete,
  Lock,
  VolumeX,
  Info,
} from 'lucide-react';
import { useA11y } from '../../context/A11yContext';
import { useAudioGuidance } from '../../hooks/useAudioGuidance';
import Button from '../common/Button';

/**
 * Komponen AccessiblePinInput
 * Memungkinkan pengguna tunanetra memasukkan PIN 6 digit menggunakan pola stepper:
 * - Naikkan angka (0-9) dengan tombol fisik Volume Up / Panah Atas / Tombol Layar
 * - Pilih angka dengan tombol fisik Volume Down / Enter / Tombol Layar
 * - Bunyi nada tick setiap angka berubah tanpa pernah membacakan angka PIN
 * - Feedback audio hanya mengumumkan nomor digit yang tercatat demi keamanan
 */
export default function AccessiblePinInput({
  pinLength = 6,
  onComplete,
  disabled = false,
  autoFocus = true,
}) {
  const { isEasyMode, isAudioMode } = useA11y();
  const { playTickSound, playSuccessSound, speakText } = useAudioGuidance();

  // Buffer digit PIN yang sudah dipilih (tersimpan di memory React, TIDAK di LocalStorage)
  const [pinDigits, setPinDigits] = useState([]);
  // Angka saat ini yang sedang dipilih pada stepper (0 - 9)
  const [currentNumber, setCurrentNumber] = useState(0);
  const containerRef = useRef(null);

  const isCompleted = pinDigits.length === pinLength;

  // Naikkan angka (0 -> 1 -> ... -> 9 -> 0)
  const handleStepUp = useCallback(() => {
    if (disabled || isCompleted) return;
    setCurrentNumber((prev) => {
      const next = (prev + 1) % 10;
      playTickSound(500 + next * 35); // Frekuensi nada sedikit naik mengikuti angka
      return next;
    });
  }, [disabled, isCompleted, playTickSound]);

  // Turunkan angka (0 -> 9 -> ... -> 0)
  const handleStepDown = useCallback(() => {
    if (disabled || isCompleted) return;
    setCurrentNumber((prev) => {
      const next = prev === 0 ? 9 : prev - 1;
      playTickSound(500 + next * 35);
      return next;
    });
  }, [disabled, isCompleted, playTickSound]);

  // Pilih angka saat ini sebagai digit PIN aktif
  const handleSelectDigit = useCallback(() => {
    if (disabled || isCompleted) return;

    setPinDigits((prev) => {
      const next = [...prev, String(currentNumber)];
      const digitIndex = next.length;

      playTickSound(880); // Nada konfirmasi digit dipilih

      if (isAudioMode) {
        if (digitIndex === pinLength) {
          speakText('PIN enam digit lengkap.');
        } else if (digitIndex === pinLength - 1) {
          speakText('Satu digit lagi.');
        } else {
          speakText(`Digit ke-${digitIndex} tercatat.`);
        }
      }

      // Reset stepper ke 0 untuk digit berikutnya
      setCurrentNumber(0);

      // Jika sudah lengkap 6 digit, kirim hasil ke parent
      if (next.length === pinLength && onComplete) {
        setTimeout(() => {
          onComplete(next.join(''));
        }, 150);
      }

      return next;
    });
  }, [disabled, isCompleted, currentNumber, pinLength, onComplete, playTickSound, isAudioMode, speakText]);

  // Hapus digit terakhir
  const handleDeleteDigit = useCallback(() => {
    if (disabled || pinDigits.length === 0) return;
    setPinDigits((prev) => {
      const next = prev.slice(0, -1);
      playTickSound(380);
      if (isAudioMode) {
        speakText(`Digit terakhir dihapus. Tersisa ${next.length} digit.`);
      }
      return next;
    });
  }, [disabled, pinDigits.length, playTickSound, isAudioMode, speakText]);

  // Reset seluruh digit
  const handleReset = useCallback(() => {
    if (disabled) return;
    setPinDigits([]);
    setCurrentNumber(0);
    playTickSound(300);
    if (isAudioMode) speakText('Seluruh digit PIN dibersihkan.');
  }, [disabled, playTickSound, isAudioMode, speakText]);

  // Listener Tombol Fisik (Volume Up / Volume Down & Panah Keyboard)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (disabled || isCompleted) return;

      // Tangkap tombol volume fisik (AudioVolumeUp / AudioVolumeDown) atau Panah Keyboard
      if (e.key === 'AudioVolumeUp' || e.key === 'ArrowUp') {
        e.preventDefault();
        handleStepUp();
      } else if (e.key === 'AudioVolumeDown' || e.key === 'Enter') {
        e.preventDefault();
        handleSelectDigit();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleStepDown();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteDigit();
      } else if (/^[0-9]$/.test(e.key)) {
        // Fallback tombol keyboard angka langsung
        e.preventDefault();
        setCurrentNumber(Number(e.key));
        setPinDigits((prev) => {
          if (prev.length >= pinLength) return prev;
          const next = [...prev, e.key];
          playTickSound(880);
          if (next.length === pinLength && onComplete) {
            setTimeout(() => onComplete(next.join('')), 150);
          }
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [disabled, isCompleted, handleStepUp, handleSelectDigit, handleStepDown, handleDeleteDigit, onComplete, pinLength, playTickSound]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center gap-4 w-full text-center"
      role="region"
      aria-label="Input PIN Aksesibel dengan tombol volume atau stepper"
    >
      {/* Tampilan 6 Bullet PIN Tersamar */}
      <div
        className="flex items-center justify-center gap-2.5 my-1"
        role="group"
        aria-label={`Progress PIN: ${pinDigits.length} dari ${pinLength} digit telah dimasukkan`}
      >
        {Array.from({ length: pinLength }).map((_, idx) => {
          const isFilled = idx < pinDigits.length;
          const isCurrent = idx === pinDigits.length;
          return (
            <div
              key={idx}
              className={`rounded-2xl transition-all flex items-center justify-center font-mono font-bold ${
                isEasyMode ? 'w-11 h-14 text-2xl' : 'w-9 h-12 text-xl'
              } ${
                isFilled
                  ? 'bg-amber-600 text-white shadow-sm border border-amber-600'
                  : isCurrent
                  ? 'border-2 border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/20 animate-pulse'
                  : 'border border-gray-300 bg-gray-50'
              }`}
              aria-hidden="true"
            >
              {isFilled ? '•' : ''}
            </div>
          );
        })}
      </div>

      <p className="sr-only" aria-live="polite">
        {pinDigits.length === pinLength
          ? 'PIN enam digit lengkap.'
          : `${pinDigits.length} dari ${pinLength} digit tercatat.`}
      </p>

      {/* Kontrol Stepper Aksesibel (Alternatif Tombol Layar) */}
      {!isCompleted && (
        <div className="w-full max-w-xs flex flex-col gap-2.5 bg-gray-50 p-4 rounded-2xl border border-gray-200">
          <p className="text-xs text-gray-600 font-medium leading-relaxed">
            Pilih angka dengan tombol di bawah atau tombol <strong>Volume / Panah</strong> perangkat Anda:
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleStepUp}
              disabled={disabled}
              className={`rounded-2xl border bg-white text-gray-800 font-bold hover:bg-gray-100 flex items-center justify-center shadow-xs transition-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                isEasyMode ? 'min-h-[64px] min-w-[70px] text-lg' : 'min-h-[52px] min-w-[60px] text-sm'
              }`}
              aria-label="Naikkan angka pilihan 0 sampai 9"
              title="Naikkan Angka (atau tekan Volume Up / Panah Atas)"
            >
              <div className="flex flex-col items-center">
                <ChevronUp size={18} />
                <span>+ Angka</span>
              </div>
            </button>

            {/* Display Angka Stepper Saat Ini */}
            <div
              className={`w-16 h-16 rounded-2xl bg-white border-2 border-amber-500 text-amber-900 font-black flex items-center justify-center shadow-inner ${
                isEasyMode ? 'text-3xl' : 'text-2xl'
              }`}
              aria-label={`Pilihan angka saat ini: ${currentNumber}`}
            >
              {currentNumber}
            </div>

            <button
              type="button"
              onClick={handleSelectDigit}
              disabled={disabled}
              className={`rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center justify-center shadow-sm transition-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                isEasyMode ? 'min-h-[64px] min-w-[90px] text-base px-3' : 'min-h-[52px] min-w-[76px] text-xs px-2.5'
              }`}
              aria-label="Pilih angka ini untuk digit PIN"
              title="Pilih Digit (atau tekan Volume Down / Enter)"
            >
              <div className="flex flex-col items-center">
                <Check size={18} />
                <span>Pilih Digit</span>
              </div>
            </button>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 text-gray-500">
            <button
              type="button"
              onClick={handleDeleteDigit}
              disabled={pinDigits.length === 0}
              className="text-gray-600 hover:text-red-600 p-1 font-semibold flex items-center gap-1 disabled:opacity-40"
              aria-label="Hapus digit terakhir"
            >
              <Delete size={14} />
              <span>Hapus Digit</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={pinDigits.length === 0}
              className="text-gray-600 hover:text-red-600 p-1 font-semibold flex items-center gap-1 disabled:opacity-40"
              aria-label="Bersihkan seluruh digit PIN"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      )}

      {/* Info Hardware Volume Button */}
      <div className="text-[11px] text-gray-500 flex items-center justify-center gap-1.5 max-w-xs">
        <Volume2 size={13} className="shrink-0 text-gray-400" />
        <span>Tips: Tombol Volume Up / Down dapat digunakan di browser yang kompatibel.</span>
      </div>
    </div>
  );
}
