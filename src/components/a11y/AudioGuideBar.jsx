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
      className={`rounded-2xl p-4 border transition-default ${
        isAudioMode
          ? 'bg-secondary/10 border-secondary/40 shadow-sm'
          : 'bg-white border-gray-200'
      } ${className}`}
      role="region"
      aria-label="Panduan Suara Halaman"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isPlaying ? 'bg-secondary text-white animate-pulse' : 'bg-gray-200 text-gray-800'
            }`}
            aria-hidden="true"
          >
            <Volume2 size={20} />
          </div>
          <div>
            <p className={`font-bold text-gray-900 ${isEasyMode ? 'text-base' : 'text-sm'}`}>
              Panduan Suara
            </p>
            <p className="text-xs text-gray-700 font-medium">
              {isPlaying ? 'Sedang membacakan instruksi...' : 'Tekan tombol untuk mendengarkan panduan layar'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isPlaying ? (
            <button
              type="button"
              onClick={() => onPlay(instructionText)}
              className={`flex items-center justify-center gap-2 font-semibold rounded-xl transition-default bg-secondary text-white hover:bg-secondary-dark focus-visible:outline focus-visible:outline-3 focus-visible:outline-secondary ${
                isEasyMode ? 'px-5 py-3 text-base min-h-[56px]' : 'px-4 py-2 text-sm min-h-[44px]'
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
              className={`flex items-center justify-center gap-2 font-semibold rounded-xl transition-default bg-primary text-white hover:bg-primary-dark focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary ${
                isEasyMode ? 'px-5 py-3 text-base min-h-[56px]' : 'px-4 py-2 text-sm min-h-[44px]'
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
            className={`flex items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-800 hover:bg-gray-100 transition-default focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary ${
              isEasyMode ? 'w-14 h-14' : 'w-11 h-11'
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
