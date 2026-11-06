import { useState, useRef, useEffect, useCallback } from 'react';
import { ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { useA11y } from '../../context/A11yContext';
import { useAudioGuidance } from '../../hooks/useAudioGuidance';

/**
 * Komponen PressAndHoldButton (Tremor Shield)
 * Melindungi pengguna dari salah tekan (accidental tap/tremor) pada aksi finansial penting.
 * Memerlukan penahanan stabil selama tremorDurationMs (1000-2000ms) sebelum aksi dieksekusi.
 *
 * Urutan alur yang benar:
 * CognitiveDelayShield (10s) → PressAndHoldButton (1-2s tahan) → PIN → Proses
 */
export default function PressAndHoldButton({
  children,
  onHoldComplete,
  onClick,
  disabled = false,
  variant = 'primary',
  className = '',
  enabled = true,
}) {
  const { isEasyMode, tremorDurationMs } = useA11y();
  const { speakText, playTickSound, playSuccessSound, playErrorSound } = useAudioGuidance();

  // Gunakan durasi dari A11yContext (default 1500ms), bisa dioverride via prop untuk testing
  const holdDurationMs = tremorDurationMs ?? 1500;

  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const startTimeRef = useRef(null);
  const animFrameRef = useRef(null);
  const hasTriggeredRef = useRef(false);
  const holdStartPosRef = useRef({ x: 0, y: 0 });

  // Label durasi manusiawi untuk tampilan & audio
  const durationLabel = holdDurationMs >= 2000 ? '2d' : holdDurationMs >= 1500 ? '1,5d' : '1d';
  const durationSpoken =
    holdDurationMs >= 2000
      ? 'dua detik'
      : holdDurationMs >= 1500
      ? 'satu setengah detik'
      : 'satu detik';

  // Batalkan penahanan (lepas terlalu cepat / pointer bergeser / cancel)
  const handleCancelHold = useCallback(() => {
    if (hasTriggeredRef.current) return;
    if (!isHolding && !startTimeRef.current) return;

    setIsHolding(false);
    setProgress(0);
    startTimeRef.current = null;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    playErrorSound();
  }, [isHolding, playErrorSound]);

  // Selesaikan penahanan (durasi terpenuhi)
  const handleCompleteHold = useCallback(() => {
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setIsHolding(false);
    setProgress(100);
    setIsCompleted(true);
    playSuccessSound();

    if (onHoldComplete) {
      onHoldComplete();
    } else if (onClick) {
      onClick();
    }

    setTimeout(() => {
      setIsCompleted(false);
      setProgress(0);
      hasTriggeredRef.current = false;
    }, 1200);
  }, [onHoldComplete, onClick, playSuccessSound]);

  // Loop animasi progress
  const updateProgress = useCallback(() => {
    if (!startTimeRef.current) return;
    const elapsed = Date.now() - startTimeRef.current;
    const currentProgress = Math.min(100, (elapsed / holdDurationMs) * 100);
    setProgress(currentProgress);

    if (elapsed >= holdDurationMs) {
      handleCompleteHold();
    } else {
      animFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, [holdDurationMs, handleCompleteHold]);

  // Mulai penahanan
  const handleStartHold = useCallback(
    (e) => {
      if (disabled || isCompleted || hasTriggeredRef.current) return;

      // Jika fitur Tremor Shield dinonaktifkan, langsung panggil aksi
      if (!enabled) {
        if (onHoldComplete) onHoldComplete();
        else if (onClick) onClick(e);
        return;
      }

      // Simpan posisi awal untuk deteksi pointer drift
      if (e.clientX !== undefined) {
        holdStartPosRef.current = { x: e.clientX, y: e.clientY };
      }

      setIsHolding(true);
      setProgress(0);
      startTimeRef.current = Date.now();
      playTickSound(520);
      animFrameRef.current = requestAnimationFrame(updateProgress);
    },
    [disabled, isCompleted, enabled, onClick, onHoldComplete, playTickSound, updateProgress]
  );

  // Deteksi pointer bergeser terlalu jauh (> 20px) → batalkan
  const handlePointerMove = useCallback(
    (e) => {
      if (!isHolding || !startTimeRef.current) return;
      const dx = e.clientX - holdStartPosRef.current.x;
      const dy = e.clientY - holdStartPosRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 20) {
        handleCancelHold();
      }
    },
    [isHolding, handleCancelHold]
  );

  // Bersihkan saat unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      hasTriggeredRef.current = false;
    };
  }, []);

  // Penanganan Keyboard: Space atau Enter memulai / melepas membatalkan
  const handleKeyDown = (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !isHolding && !disabled) {
      e.preventDefault();
      handleStartHold(e);
    }
  };

  const handleKeyUp = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleCancelHold();
    }
  };

  return (
    <button
      type="button"
      disabled={disabled || isCompleted}
      onPointerDown={handleStartHold}
      onPointerUp={handleCancelHold}
      onPointerLeave={handleCancelHold}
      onPointerCancel={handleCancelHold}
      onPointerMove={handlePointerMove}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      className={`relative overflow-hidden select-none font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary ${
        isEasyMode ? 'min-h-[64px] text-lg px-6' : 'min-h-[50px] text-sm px-4'
      } ${
        disabled
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
          : variant === 'secondary'
          ? 'bg-secondary hover:bg-secondary-dark text-white'
          : 'bg-primary hover:bg-primary-dark text-white'
      } ${className}`}
      aria-label={
        enabled
          ? `Tekan dan tahan tombol selama ${durationSpoken} untuk mengonfirmasi`
          : undefined
      }
    >
      {/* Background Fill Progress Bar (Tremor Shield Visualizer) */}
      {enabled && isHolding && (
        <span
          className="absolute left-0 top-0 bottom-0 bg-white/30 pointer-events-none"
          style={{ width: `${progress}%`, transition: 'width 75ms linear' }}
          aria-hidden="true"
        />
      )}

      {/* Konten Label Tombol */}
      <span className="relative z-10 flex items-center gap-2">
        {isCompleted ? (
          <>
            <CheckCircle2 size={isEasyMode ? 22 : 18} />
            <span>Terkonfirmasi!</span>
          </>
        ) : isHolding ? (
          <>
            <Loader2 size={isEasyMode ? 22 : 18} className="animate-spin" />
            <span>Tahan ({Math.round(progress)}%)...</span>
          </>
        ) : (
          <>
            {enabled && <ShieldCheck size={isEasyMode ? 20 : 16} className="opacity-90" />}
            {children}
            {enabled && (
              <span className="text-[11px] font-normal opacity-80">(Tahan {durationLabel})</span>
            )}
          </>
        )}
      </span>
    </button>
  );
}
