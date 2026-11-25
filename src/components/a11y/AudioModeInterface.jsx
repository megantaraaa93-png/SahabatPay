
import { useCallback, useEffect, useRef, useState } from 'react';
import { Hand, Mic, MicOff, ArrowLeft, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useVoiceCommand } from '../../hooks/useVoiceCommand';
import { useAudioGuidance } from '../../hooks/useAudioGuidance';
import { useA11y } from '../../context/A11yContext';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import { formatRupiah } from '../../utils/formatCurrency';

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
  '/sandbox': 'Mode Latihan Sandbox',
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
  const { user, isAuthenticated } = useAuth();
  const { balance } = useWallet();

  const [status, setStatus] = useState('ready');
  const [isPinActive, setIsPinActive] = useState(false);
  const [announcement, setAnnouncement] = useState(
    'Mode audio aktif. Tekan dan tahan tombol Bicara untuk memberi perintah.'
  );

  const friendTimerRef = useRef(null);
  const exitTimerRef = useRef(null);
  const friendHoldRef = useRef(false);
  const suppressClickRef = useRef(false);
  const micSessionRef = useRef(false);
  const processingTimerRef = useRef(null);
  const friendTapTimerRef = useRef(null);
  const friendBackTimerRef = useRef(null);
  const friendTapCountRef = useRef(0);
  const friendLongPressRef = useRef(false);

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
      if (friendTapTimerRef.current) clearTimeout(friendTapTimerRef.current);
      if (friendBackTimerRef.current) clearTimeout(friendBackTimerRef.current);
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

  // Tombol Sahabat: ketukan tunggal/ganda/tiga kali dan tekan lama.
  // Ketukan dihitung setelah jeda singkat agar satu ketukan tidak dieksekusi terlalu cepat.
  const handleFriendTap = () => {
    if (friendLongPressRef.current) {
      friendLongPressRef.current = false;
      return;
    }

    friendTapCountRef.current += 1;
    if (friendTapTimerRef.current) clearTimeout(friendTapTimerRef.current);

    friendTapTimerRef.current = setTimeout(() => {
      const tapCount = friendTapCountRef.current;
      friendTapCountRef.current = 0;

      if (tapCount === 1) {
        stopSpeech();
        const message = isSupported
          ? `${pageLabel}. Mode Audio aktif. Tekan dan tahan Bicara untuk memberi perintah. Anda dapat meminta cek saldo, transfer, QRIS, riwayat, atau bantuan.`
          : 'Browser belum mendukung pengenalan suara. Gunakan Chrome atau Edge.';
        setAnnouncement(message);
        setStatus('response');
        speakText(message);
        return;
      }

      if (tapCount === 2) {
        const message = 'Menu kendali Sahabat. Anda dapat mengatakan bantuan, ulangi instruksi, kembali, atau batalkan aktivitas. Tekan Bicara dan ucapkan pilihan Anda.';
        setAnnouncement(message);
        setStatus('response');
        speakText(message);
        return;
      }

      if (tapCount >= 3) {
        stopSpeech();
        if (micSessionRef.current) {
          micSessionRef.current = false;
          stopListening();
        }
        setStatus('ready');
        setAnnouncement('Aktivitas suara sementara dibatalkan. Anda dapat melanjutkan dengan menekan Bicara.');
        speakText('Aktivitas suara dibatalkan.');
      }
    }, 360);
  };

  const handleFriendPointerDown = () => {
    friendLongPressRef.current = false;
    if (friendTapTimerRef.current) {
      clearTimeout(friendTapTimerRef.current);
      friendTapTimerRef.current = null;
    }

    friendTimerRef.current = setTimeout(() => {
      friendLongPressRef.current = true;
      friendTapCountRef.current = 0;
      stopAllAudio();
      setAnnouncement('Suara dihentikan.');
    }, 900);

    friendBackTimerRef.current = setTimeout(() => {
      friendLongPressRef.current = true;
      friendTapCountRef.current = 0;
      stopSpeech();
      stopListening();
      micSessionRef.current = false;
      navigate(-1);
    }, 2500);

    exitTimerRef.current = setTimeout(() => {
      friendLongPressRef.current = true;
      friendTapCountRef.current = 0;
      exitAudioMode();
    }, 5000);
  };

  const handleFriendPointerUp = () => {
    if (friendTimerRef.current) {
      clearTimeout(friendTimerRef.current);
      friendTimerRef.current = null;
    }
    if (friendBackTimerRef.current) {
      clearTimeout(friendBackTimerRef.current);
      friendBackTimerRef.current = null;
    }
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  };

  // Nonaktifkan mikrofon otomatis saat proses input PIN aktif
  useEffect(() => {
    const handlePinActive = (e) => {
      const active = Boolean(e.detail?.active);
      setIsPinActive(active);
      if (active) {
        micSessionRef.current = false;
        stopListening();
        setAnnouncement('Input PIN aktif. Mikrofon dinonaktifkan sementara demi keamanan.');
      }
    };
    window.addEventListener('sahabatpay:pin-active', handlePinActive);
    return () => window.removeEventListener('sahabatpay:pin-active', handlePinActive);
  }, [stopListening]);

  // Mulai mendengarkan
  const handleMicStart = () => {
    if (!isSupported || micSessionRef.current || isPinActive) return;

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
      className="fixed inset-0 z-[100] h-[100dvh] overflow-hidden bg-[#050816] text-white flex flex-col"
      aria-label="Antarmuka Mode Audio SahabatPay"
    >
      {/* LAYAR ATAS (50%): Zona Informasi & Tombol Sahabat */}
      <section
        aria-label="Zona Informasi Mode Audio"
        className="h-1/2 min-h-0 w-full max-w-xl mx-auto px-4 pt-3 pb-2 sm:px-6 flex flex-col gap-2.5"
      >
        <header className="shrink-0 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-wide">
              SAHABATPAY <span className="text-amber-300 font-bold text-xs sm:text-sm">• Mode Audio</span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm font-semibold">
              {pageLabel}
              {isAuthenticated && user ? ` • Saldo: ${formatRupiah(balance)}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                stopSpeech();
                navigate(-1);
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold flex items-center gap-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              aria-label="Kembali ke halaman sebelumnya"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              <span className="hidden sm:inline">Kembali</span>
            </button>
            <button
              type="button"
              onClick={exitAudioMode}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold flex items-center gap-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              aria-label="Keluar dari Mode Audio"
            >
              <LogOut size={14} aria-hidden="true" />
              <span className="hidden sm:inline">Ganti Mode</span>
            </button>
          </div>
        </header>

        {/* Status & Pengumuman Kontekstual */}
        <div
          role="status"
          aria-live="assertive"
          aria-atomic="true"
          className={`w-full shrink-0 rounded-2xl border px-4 py-2.5 text-center transition-colors ${statusColors[status]}`}
        >
          <p className="text-sm sm:text-base font-black">
            {statusLabels[status]}
          </p>
          <p className="text-xs sm:text-sm mt-0.5 leading-snug line-clamp-2">
            {announcement}
          </p>
        </div>

        {/* Tombol Sahabat (Zona Atas) */}
        <button
          type="button"
          onClick={handleFriendTap}
          onPointerDown={handleFriendPointerDown}
          onPointerUp={handleFriendPointerUp}
          onPointerLeave={handleFriendPointerUp}
          onPointerCancel={handleFriendPointerUp}
          className="flex-1 min-h-0 w-full rounded-3xl bg-[#C62828] hover:bg-[#B71C1C] active:bg-[#8E1717] border-4 border-[#FF8A80] shadow-lg flex flex-col items-center justify-center gap-1.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-white focus-visible:outline-offset-2 transition-colors select-none touch-manipulation"
          aria-label="Tombol Sahabat. Tekan untuk mendengar panduan. Tahan untuk menghentikan suara. Tahan lebih lama untuk kembali ke pemilihan mode."
        >
          <Hand size={40} strokeWidth={2.5} aria-hidden="true" />
          <span className="text-lg sm:text-2xl font-black text-center px-2">
            TOMBOL SAHABAT
          </span>
          <span className="text-red-100 text-xs sm:text-sm text-center px-3">
            Ketuk 1x: Panduan • 2x: Menu • Tahan: Hentikan Suara
          </span>
        </button>
      </section>

      {/* LAYAR BAWAH (50%): Zona Press & Hold Voice Command */}
      <section
        aria-label="Zona Perintah Suara Tekan dan Tahan"
        className="h-1/2 min-h-0 w-full max-w-xl mx-auto px-4 pt-2 pb-3 sm:px-6 flex flex-col gap-2"
      >
        <button
          type="button"
          onPointerDown={handleMicStart}
          onPointerUp={handleMicStop}
          onPointerLeave={handleMicCancel}
          onPointerCancel={handleMicCancel}
          onKeyDown={handleMicKeyDown}
          onKeyUp={handleMicKeyUp}
          onBlur={handleMicStop}
          disabled={!isSupported || isPinActive}
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
            {!isSupported
              ? 'Browser tidak mendukung pengenalan suara. Gunakan tombol Kembali atau Ganti Mode di atas.'
              : isListening
              ? 'Lepaskan untuk memproses perintah'
              : 'Tekan dan tahan area ini untuk berbicara'}
          </span>
        </button>

        <footer className="shrink-0 text-center text-slate-400 text-[10px] sm:text-xs">
          Tahan Sahabat 2,5 detik: Kembali • 5 detik: Pilih Mode
        </footer>
      </section>
    </main>
  );
}
