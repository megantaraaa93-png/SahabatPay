import { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Radar, CheckCircle2, Zap } from 'lucide-react';
import { useAudioGuidance } from '../../hooks/useAudioGuidance';
import { useA11y } from '../../context/A11yContext';

/**
 * Komponen QrisAudioRadar
 * Menghasilkan nada radar akustik dinamis yang frekuensi dan kecepatannya berubah
 * mengikuti estimasi kedekatan dan keterlihatan kode QR di dalam frame kamera.
 * Membantu pengguna tunanetra menemukan posisi QR tanpa harus melihat layar.
 */
export default function QrisAudioRadar({
  isActive = false,
  onQrLocked,
  merchantName = 'Merchant Mitra',
}) {
  const { isAudioMode, isEasyMode } = useA11y();
  const { playRadarPulse, playSuccessSound, speakText } = useAudioGuidance();

  const [isMuted, setIsMuted] = useState(false);
  // Estimasi persentase kedekatan QR di frame (0%: belum terdeteksi, 100%: tepat di tengah frame)
  const [proximity, setProximity] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const timerRef = useRef(null);

  // Fungsi memicu pulse nada radar
  const triggerPulse = useCallback(() => {
    if (isMuted || !isActive || isLocked) return;

    if (proximity === 0) {
      // Status Searching: Nada rendah dan santai
      playRadarPulse(480, 0.1);
    } else {
      // Status Mendekat: Frekuensi naik seiring kedekatan (520Hz -> 880Hz)
      const freq = 520 + (proximity / 100) * 360;
      const vol = 0.12 + (proximity / 100) * 0.1;
      playRadarPulse(freq, vol);
    }
  }, [isMuted, isActive, isLocked, proximity, playRadarPulse]);

  // Efek interval dinamis: Semakin dekat (proximity tinggi), interval semakin cepat
  useEffect(() => {
    if (!isActive || isLocked) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // Interval: 1200ms saat mencari, turun hingga 180ms saat sangat dekat
    const intervalMs = proximity === 0 ? 1200 : Math.max(180, 1000 - proximity * 8.2);

    timerRef.current = setInterval(() => {
      triggerPulse();
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isLocked, proximity, triggerPulse]);

  // Handler saat QR terkunci sempurna
  const handleLockSuccess = useCallback(() => {
    if (isLocked) return;
    setIsLocked(true);
    if (timerRef.current) clearInterval(timerRef.current);

    playSuccessSound();
    if (isAudioMode) {
      speakText('QR berhasil ditemukan. Memeriksa kode merchant.');
    }

    if (onQrLocked) {
      setTimeout(() => {
        onQrLocked();
      }, 600);
    }
  }, [isLocked, playSuccessSound, isAudioMode, speakText, onQrLocked]);

  // Petunjuk awal saat radar aktif
  useEffect(() => {
    if (isActive && isAudioMode) {
      speakText('Audio radar aktif. Arahkan kamera secara perlahan mengikuti kecepatan bunyi radar.');
    }
  }, [isActive, isAudioMode, speakText]);

  if (!isActive) return null;

  return (
    <div
      className="w-full bg-gray-900/90 text-white p-3 rounded-2xl border border-amber-500/50 shadow-md flex flex-col gap-2.5 my-2"
      role="region"
      aria-label="Audio Radar QRIS"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radar size={18} className="text-amber-400 animate-spin" />
          <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
            QRIS Audio Radar {proximity > 0 ? `(${Math.round(proximity)}% Dekat)` : '(Mencari)'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsMuted((prev) => !prev)}
          className="p-1 rounded-lg text-gray-300 hover:text-white bg-white/10 text-xs flex items-center gap-1 px-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
          aria-label={isMuted ? 'Nyalakan bunyi radar' : 'Bisukan bunyi radar'}
        >
          {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          <span>{isMuted ? 'Muted' : 'Radar On'}</span>
        </button>
      </div>

      {/* Bar Indikator Kedekatan Visual */}
      <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
        <div
          className="bg-gradient-to-r from-amber-500 to-green-400 h-full transition-all duration-200"
          style={{ width: `${proximity}%` }}
        />
      </div>

      {/* Kontrol Demonstrasi Radar Interaktif untuk Presentasi */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-700 text-xs">
        <span className="text-[11px] text-gray-400">Simulasi Jarak QR:</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setProximity(35)}
            className={`px-2 py-1 rounded-md text-[11px] font-bold border ${
              proximity === 35
                ? 'bg-amber-500 text-gray-900 border-amber-400'
                : 'bg-white/10 text-gray-300 border-white/20 hover:bg-white/20'
            }`}
          >
            Mulai Terlihat
          </button>
          <button
            type="button"
            onClick={() => setProximity(75)}
            className={`px-2 py-1 rounded-md text-[11px] font-bold border ${
              proximity === 75
                ? 'bg-amber-500 text-gray-900 border-amber-400'
                : 'bg-white/10 text-gray-300 border-white/20 hover:bg-white/20'
            }`}
          >
            Mendekat
          </button>
          <button
            type="button"
            onClick={() => {
              setProximity(100);
              handleLockSuccess();
            }}
            className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-green-600 hover:bg-green-700 text-white flex items-center gap-1 shadow-xs"
          >
            <Zap size={12} />
            <span>Kunci QR</span>
          </button>
        </div>
      </div>
    </div>
  );
}
