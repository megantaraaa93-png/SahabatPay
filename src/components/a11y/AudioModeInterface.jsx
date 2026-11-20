
import { useCallback, useEffect, useRef, useState } from 'react';
import { Hand, Mic, MicOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useVoiceCommand } from '../../hooks/useVoiceCommand';
import { useAudioGuidance } from '../../hooks/useAudioGuidance';
import { useA11y } from '../../context/A11yContext';

const PAGE_LABELS = {
  '/': 'Halaman pemilihan mode',
  '/login': 'Halaman masuk',
  '/register': 'Halaman pendaftaran',
  '/verification': 'Halaman verifikasi',
  '/setup-pin': 'Halaman pengaturan PIN',
  '/dashboard': 'Beranda SahabatPay',
  '/top-up': 'Halaman isi saldo',
  '/transfer': 'Halaman transfer',
  '/qris': 'Halaman QRIS',
  '/history': 'Riwayat transaksi',
  '/profile': 'Profil pengguna',
  '/settings/accessibility': 'Pengaturan aksesibilitas',
  '/settings/account': 'Pengaturan akun',
  '/recipients': 'Daftar penerima',
  '/about': 'Tentang SahabatPay',
};

export default function AudioModeInterface() {
  const navigate = useNavigate();

  const {
    isSupported,
    isListening,
    transcript,
    errorMessage,
    startListening,
    stopListening,
    currentPath,
  } = useVoiceCommand();

  const {
    speakText,
    stopSpeech,
    isPlaying,
    playErrorSound,
  } = useAudioGuidance();

  const { isAudioMode, setMode } = useA11y();

  const [status, setStatus] = useState('ready');
  const [announcement, setAnnouncement] = useState(
    'Mode audio aktif. Tekan dan tahan tombol Bicara untuk memberi perintah.'
  );

  const friendTimerRef = useRef(null);
  const exitTimerRef = useRef(null);
  const friendHoldRef = useRef(false);
  const suppressClickRef = useRef(false);
  const micSessionRef = useRef(false);
  const processingTimerRef = useRef(null);

  const pageLabel = PAGE_LABELS[currentPath] || 'Halaman SahabatPay';

  // Pengumuman ketika memasuki Audio Mode atau berpindah halaman
  useEffect(() => {
    if (!isAudioMode) return;

    const message = `Anda berada di ${pageLabel}. Tekan dan tahan tombol Bicara untuk memberikan perintah.`;

    setStatus('ready');
    setAnnouncement(message);
    speakText(message);
  }, [isAudioMode, currentPath]);

  // Sinkronisasi status mikrofon
  useEffect(() => {
    if (isListening) {
      setStatus('listening');
    }
  }, [isListening]);

  // Status pemrosesan perintah
  useEffect(() => {
    if (!transcript) return;

    setStatus('processing');
    setAnnouncement(`Perintah Anda: ${transcript}`);

    if (processingTimerRef.current) {
      clearTimeout(processingTimerRef.current);
    }

    processingTimerRef.current = setTimeout(() => {
      if (!isListening && !isPlaying) {
        setStatus('ready');
      }
    }, 3500);

    return () => {
      if (processingTimerRef.current) {
        clearTimeout(processingTimerRef.current);
      }
    };
  }, [transcript]);

  // Status suara respons
  useEffect(() => {
    if (isPlaying) {
      setStatus('response');
    } else if (!isListening && status === 'response') {
      setStatus('ready');
    }
  }, [isPlaying, isListening]);

  // Penanganan error
  useEffect(() => {
    if (!errorMessage) return;

    setStatus('error');
    setAnnouncement(errorMessage);
    playErrorSound();
  }, [errorMessage]);

  // Bersihkan seluruh timer ketika komponen dilepas
  useEffect(() => {
    return () => {
      if (friendTimerRef.current) {
        clearTimeout(friendTimerRef.current);
      }

      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
      }

      if (processingTimerRef.current) {
        clearTimeout(processingTimerRef.current);
      }
    };
  }, []);

  // Menghentikan seluruh suara
  const stopAllAudio = useCallback(() => {
    stopSpeech();

    setStatus('ready');
    setAnnouncement('Suara telah dihentikan.');
  }, [stopSpeech]);

  // Kembali ke halaman pemilihan mode
  const exitAudioMode = useCallback(() => {
    stopSpeech();
    stopListening();

    micSessionRef.current = false;

    setMode('normal');
    navigate('/', { replace: true });
  }, [stopSpeech, stopListening, setMode, navigate]);

  // Panduan Tombol Sahabat
  const handleFriendClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    stopSpeech();

    const message = isSupported
      ? `${pageLabel}. Anda sedang menggunakan Mode Audio SahabatPay. Tekan dan tahan tombol Bicara, ucapkan perintah, lalu lepaskan. Anda dapat mengatakan cek saldo, isi saldo, transfer, QRIS, atau riwayat transaksi. Tahan Tombol Sahabat untuk menghentikan suara. Tahan lebih lama untuk kembali ke pemilihan mode.`
      : `${pageLabel}. Browser Anda belum mendukung pengenalan suara. Silakan gunakan Google Chrome atau Microsoft Edge.`;

    setAnnouncement(message);
    setStatus('response');
    speakText(message);
  };

  // Tekan Tombol Sahabat
  const handleFriendPointerDown = () => {
    friendHoldRef.current = false;
    suppressClickRef.current = false;

    // Tahan singkat: menghentikan suara
    friendTimerRef.current = setTimeout(() => {
      friendHoldRef.current = true;
      suppressClickRef.current = true;
      stopAllAudio();
    }, 700);

    // Tahan lebih lama: keluar ke pemilihan mode
    exitTimerRef.current = setTimeout(() => {
      suppressClickRef.current = true;
      exitAudioMode();
    }, 2500);
  };

  const handleFriendPointerUp = () => {
    if (friendTimerRef.current) {
      clearTimeout(friendTimerRef.current);
      friendTimerRef.current = null;
    }

    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  };

  // Mulai mendengarkan
  const handleMicStart = () => {
    if (!isSupported || micSessionRef.current) return;

    micSessionRef.current = true;

    stopSpeech();
    setStatus('listening');
    setAnnouncement('Mendengarkan. Silakan ucapkan perintah Anda.');

    startListening();
  };

  // Berhenti mendengarkan dan memproses
  const handleMicStop = () => {
    if (!micSessionRef.current) return;

    micSessionRef.current = false;

    setStatus('processing');
    setAnnouncement('Sedang memproses perintah Anda.');

    stopListening();
  };

  const handleMicCancel = () => {
    handleMicStop();
  };

  // Keyboard support
  const handleMicKeyDown = (event) => {
    if (event.repeat) return;

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      handleMicStart();
    }

    // Escape untuk kembali ke pemilihan mode
    if (event.key === 'Escape') {
      exitAudioMode();
    }
  };

  const handleMicKeyUp = (event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      handleMicStop();
    }
  };

  // Escape dari seluruh interface
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        exitAudioMode();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [exitAudioMode]);

  const statusLabels = {
    ready: 'SIAP',
    listening: 'MENDENGARKAN',
    processing: 'MEMPROSES',
    response: 'SAHABATPAY BERBICARA',
    error: 'TERJADI KENDALA',
  };

  const statusColors = {
    ready: 'bg-slate-800 border-slate-600',
    listening: 'bg-red-900/80 border-red-500',
    processing: 'bg-amber-900/80 border-amber-500',
    response: 'bg-green-900/80 border-green-500',
    error: 'bg-red-950 border-red-700',
  };

  return (
    <main
      className="fixed inset-0 z-[100] h-[100dvh] overflow-hidden bg-[#050816] text-white flex flex-col items-center px-4 py-3 sm:px-6"
      aria-label="Antarmuka Mode Audio SahabatPay"
    >
      {/* Header ringkas */}
      <header className="shrink-0 text-center pt-1 pb-3">
        <h1 className="text-2xl sm:text-3xl font-black tracking-wide">
          SAHABATPAY
        </h1>

        <p className="text-slate-400 text-sm mt-1">
          Mode Audio
        </p>
      </header>

      {/* Status */}
      <section
        role="status"
        aria-live="assertive"
        aria-atomic="true"
        className={`w-full max-w-xl shrink-0 rounded-2xl border px-4 py-3 text-center transition-colors ${statusColors[status]}`}
      >
        <p className="text-base sm:text-lg font-black">
          {statusLabels[status]}
        </p>

        <p className="text-sm sm:text-base mt-1 leading-snug">
          {announcement}
        </p>
      </section>

      {/* Hanya dua tombol utama */}
      <div className="w-full max-w-xl flex-1 min-h-0 flex flex-col gap-3 py-4">

        {/* Tombol Sahabat */}
        <button
          type="button"
          onClick={handleFriendClick}
          onPointerDown={handleFriendPointerDown}
          onPointerUp={handleFriendPointerUp}
          onPointerLeave={handleFriendPointerUp}
          onPointerCancel={handleFriendPointerUp}
          className="flex-1 min-h-0 w-full rounded-3xl bg-[#C62828] hover:bg-[#B71C1C] active:bg-[#8E1717] border-4 border-[#FF8A80] shadow-lg flex flex-col items-center justify-center gap-2 focus-visible:outline focus-visible:outline-4 focus-visible:outline-white focus-visible:outline-offset-2 transition-colors select-none touch-manipulation"
          aria-label="Tombol Sahabat. Tekan untuk mendengar panduan. Tahan untuk menghentikan suara. Tahan lebih lama untuk kembali ke pemilihan mode."
        >
          <Hand
            size={48}
            strokeWidth={2.5}
            aria-hidden="true"
          />

          <span className="text-xl sm:text-2xl font-black text-center px-2">
            TOMBOL SAHABAT
          </span>

          <span className="text-red-100 text-xs sm:text-sm text-center px-3">
            Tekan untuk bantuan
          </span>
        </button>

        {/* Tombol Bicara */}
        <button
          type="button"
          onPointerDown={handleMicStart}
          onPointerUp={handleMicStop}
          onPointerLeave={handleMicCancel}
          onPointerCancel={handleMicCancel}
          onKeyDown={handleMicKeyDown}
          onKeyUp={handleMicKeyUp}
          onBlur={handleMicStop}
          disabled={!isSupported}
          className={`flex-1 min-h-0 w-full rounded-3xl border-4 shadow-lg flex flex-col items-center justify-center gap-2 focus-visible:outline focus-visible:outline-4 focus-visible:outline-white focus-visible:outline-offset-2 transition-colors select-none touch-manipulation ${
            isListening
              ? 'bg-[#B71C1C] border-red-300 animate-pulse'
              : 'bg-[#15803D] hover:bg-[#166534] active:bg-[#14532D] border-[#86EFAC]'
          } disabled:bg-slate-700 disabled:border-slate-500 disabled:cursor-not-allowed`}
          aria-label={
            isListening
              ? 'Sedang mendengarkan. Lepaskan tombol untuk memproses perintah.'
              : 'Bicara. Tekan dan tahan untuk berbicara, kemudian lepaskan.'
          }
        >
          {isListening ? (
            <MicOff size={48} strokeWidth={2.5} aria-hidden="true" />
          ) : (
            <Mic size={48} strokeWidth={2.5} aria-hidden="true" />
          )}

          <span className="text-xl sm:text-2xl font-black">
            {isListening ? 'MENDENGARKAN' : 'BICARA'}
          </span>

          <span className="text-green-100 text-xs sm:text-sm text-center px-3">
            {isListening
              ? 'Lepaskan untuk memproses'
              : 'Tekan dan tahan untuk berbicara'}
          </span>
        </button>
      </div>

      {/* Petunjuk ringkas, bukan tombol tambahan */}
      <footer className="shrink-0 pb-1 text-center text-slate-500 text-[10px] sm:text-xs">
        Tahan Sahabat 2,5 detik untuk kembali ke pemilihan mode
      </footer>
    </main>
  );
}
