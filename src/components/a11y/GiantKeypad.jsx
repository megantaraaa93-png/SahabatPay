import { Delete, RotateCcw, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useA11y } from '../../context/A11yContext';
import { useAudioGuidance } from '../../hooks/useAudioGuidance';
import PressAndHoldButton from './PressAndHoldButton';

/**
 * Komponen GiantKeypad (EasyFocus & Aksesibilitas Motorik)
 * Keypad angka besar (0-9) dengan tombol Hapus, Koreksi, Kembali, dan Konfirmasi.
 * Pada EasyFocus, tombol Konfirmasi mendukung penahanan 0,5 detik (Tremor Shield)
 * untuk mencegah sentuhan tidak sengaja.
 */
export default function GiantKeypad({
  value = '',
  onChange,
  onConfirm,
  onBack,
  confirmLabel = 'Konfirmasi',
  backLabel = 'Kembali',
  maxLength = 10,
  disabled = false,
  holdToConfirm = false,
}) {
  const { isEasyMode, isAudioMode, tremorShieldEnabled } = useA11y();
  const { playTickSound, speakText } = useAudioGuidance();

  const handleDigit = (digit) => {
    if (disabled) return;
    const current = String(value || '');
    if (current.length >= maxLength) return;
    if (current === '0' && digit === '0') return;
    const next = current === '0' ? digit : current + digit;
    playTickSound(520 + Number(digit) * 25);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
    onChange?.(next);
  };

  const handleDelete = () => {
    if (disabled) return;
    const current = String(value || '');
    if (!current) return;
    playTickSound(380);
    onChange?.(current.slice(0, -1));
  };

  const handleClear = () => {
    if (disabled) return;
    playTickSound(320);
    if (isAudioMode) speakText('Nominal dibersihkan.');
    onChange?.('');
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div
      className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 flex flex-col gap-2.5"
      role="group"
      aria-label="Keypad angka besar"
    >
      <div className="grid grid-cols-3 gap-2">
        {keys.map((digit) => (
          <button
            key={digit}
            type="button"
            disabled={disabled}
            onClick={() => handleDigit(digit)}
            className="min-h-[64px] rounded-2xl bg-white border border-gray-300 hover:bg-gray-100 active:bg-gray-200 text-gray-900 font-extrabold text-2xl shadow-xs transition-default focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary touch-manipulation"
            aria-label={`Angka ${digit}`}
          >
            {digit}
          </button>
        ))}

        <button
          type="button"
          disabled={disabled}
          onClick={handleClear}
          className="min-h-[64px] rounded-2xl bg-amber-50 border border-amber-300 hover:bg-amber-100 text-amber-900 font-bold text-sm flex flex-col items-center justify-center gap-0.5 focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary touch-manipulation"
          aria-label="Koreksi atau bersihkan semua angka"
        >
          <RotateCcw size={18} aria-hidden="true" />
          <span>Koreksi</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => handleDigit('0')}
          className="min-h-[64px] rounded-2xl bg-white border border-gray-300 hover:bg-gray-100 active:bg-gray-200 text-gray-900 font-extrabold text-2xl shadow-xs transition-default focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary touch-manipulation"
          aria-label="Angka 0"
        >
          0
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={handleDelete}
          className="min-h-[64px] rounded-2xl bg-red-50 border border-red-200 hover:bg-red-100 text-red-800 font-bold text-sm flex flex-col items-center justify-center gap-0.5 focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary touch-manipulation"
          aria-label="Hapus satu digit terakhir"
        >
          <Delete size={18} aria-hidden="true" />
          <span>Hapus</span>
        </button>
      </div>

      {(onBack || onConfirm) && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="min-h-[64px] rounded-2xl bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 font-bold text-base flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary touch-manipulation"
            >
              <ArrowLeft size={18} aria-hidden="true" />
              <span>{backLabel}</span>
            </button>
          )}

          {onConfirm && (
            <div className={onBack ? '' : 'col-span-2'}>
              {holdToConfirm && (isEasyMode || tremorShieldEnabled) ? (
                <PressAndHoldButton
                  enabled
                  disabled={disabled}
                  onHoldComplete={onConfirm}
                  variant="primary"
                  className="w-full min-h-[64px]"
                >
                  {confirmLabel}
                </PressAndHoldButton>
              ) : (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={onConfirm}
                  className="w-full min-h-[64px] rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold text-base flex items-center justify-center gap-2 shadow-sm focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary disabled:opacity-50 touch-manipulation"
                >
                  <CheckCircle2 size={18} aria-hidden="true" />
                  <span>{confirmLabel}</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
