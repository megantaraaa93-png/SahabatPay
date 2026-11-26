import { Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { useA11y } from '../../context/A11yContext';

/**
 * Komponen AudioGuideBar
 * Memberikan tombol kontrol langsung bagi pengguna untuk:
 * - Mendengarkan petunjuk halaman / formulir
 * - Menghentikan suara kapan saja
 * - Memutar ulang instruksi
 *
 * Ditampilkan jelas di Audio Mode, dan tetap opsional tersedia jika dibutuhkan di mode lain.
 */
export default function AudioGuideBar({
  instructionText,
  isPlaying,
  onPlay,
  onStop,
  className = '',
}) {
  const { isAudioMode, isEasyMode } = useA11y();

  return (
    <div
      className={`rounded-2xl p-4 border transition-default shadow-card ${
        isAudioMode
          ? 'bg-brand-emerald/10 border-brand-emerald/40'
          : 'bg-white border-brand-border'
      } ${className}`}
      role="region"
      aria-label="Panduan Suara Halaman"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isPlaying ? 'bg-brand-emerald text-white animate-pulse' : 'bg-brand-cream text-brand-forest'
            }`}
            aria-hidden="true"
          >
            <Volume2 size={20} />
          </div>
          <div>
            <p className={`font-bold text-brand-charcoal ${isEasyMode ? 'text-base' : 'text-sm'}`}>
              Panduan Suara
            </p>
            <p className="text-xs text-brand-muted font-medium">
              {isPlaying ? 'Sedang membacakan instruksi...' : 'Tekan tombol untuk mendengarkan panduan layar'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isPlaying ? (
            <button
              type="button"
              onClick={() => onPlay(instructionText)}
              className={`flex items-center justify-center gap-2 font-semibold rounded-xl transition-default bg-brand-emerald text-white hover:bg-brand-emerald/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald ${
                isEasyMode ? 'px-5 py-3 text-base min-h-[64px]' : 'px-4 py-2 text-sm min-h-[44px]'
              }`}
              aria-label="Putar panduan suara untuk halaman ini"
            >
              <Volume2 size={18} aria-hidden="true" />
              <span>Dengarkan Panduan</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onStop}
              className={`flex items-center justify-center gap-2 font-semibold rounded-xl transition-default bg-brand-coral text-white hover:bg-brand-coral/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral ${
                isEasyMode ? 'px-5 py-3 text-base min-h-[64px]' : 'px-4 py-2 text-sm min-h-[44px]'
              }`}
              aria-label="Hentikan panduan suara"
            >
              <VolumeX size={18} aria-hidden="true" />
              <span>Hentikan Suara</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onStop();
              setTimeout(() => onPlay(instructionText), 150);
            }}
            className={`flex items-center justify-center rounded-xl border border-brand-border bg-white text-brand-charcoal hover:bg-brand-cream transition-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest ${
              isEasyMode ? 'w-16 h-16 min-h-[64px] min-w-[64px]' : 'w-11 h-11'
            }`}
            aria-label="Ulangi panduan suara dari awal"
            title="Ulangi panduan suara"
          >
            <RotateCcw size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
