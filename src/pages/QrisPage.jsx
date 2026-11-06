import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Wallet,
  QrCode,
  Camera,
  CameraOff,
  Store,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Loader2,
  Lock,
  Keyboard,
  Info,
  MapPin,
  Tag,
  Check,
} from 'lucide-react';
import { useA11y } from '../context/A11yContext';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { useAudioGuidance } from '../hooks/useAudioGuidance';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import AudioGuideBar from '../components/a11y/AudioGuideBar';
import CognitiveDelayShield from '../components/a11y/CognitiveDelayShield';
import PressAndHoldButton from '../components/a11y/PressAndHoldButton';
import AccessiblePinInput from '../components/a11y/AccessiblePinInput';
import QrisAudioRadar from '../components/a11y/QrisAudioRadar';
import { formatRupiah, formatTanggal } from '../utils/formatCurrency';
import { validateTransactionAmount } from '../utils/transactionUtils';
import {
  getAllMerchants,
  findMerchant,
  validateMerchant,
  generateQrisPayload,
} from '../services/merchantService';

// Pilihan nominal instan untuk pembayaran cepat
const PRESET_QRIS_AMOUNTS = [15000, 25000, 50000, 100000, 250000];

export default function QrisPage() {
  const navigate = useNavigate();
  const { isEasyMode, isAudioMode, cognitiveDelayEnabled, tremorShieldEnabled } = useA11y();
  const { verifyTransactionPin } = useAuth();
  const { balance, payQris } = useWallet();
  const { isPlaying, speakText, stopSpeech, playSuccessSound, playErrorSound } = useAudioGuidance();

  // Tab Metode Input: 'camera' | 'manual' | 'list'
  const [activeMethodTab, setActiveMethodTab] = useState('list');

  // Daftar Merchant Demo
  const demoMerchants = useMemo(() => getAllMerchants(), []);

  // Form State
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [amountInput, setAmountInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Scanner Kamera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // Modal Step State
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinAttempts, setPinAttempts] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [qrisResult, setQrisResult] = useState(null);
  const [activeIdempotencyKey, setActiveIdempotencyKey] = useState(null);

  const guideText = `Halaman Pembayaran QRIS SahabatPay. Saldo Anda saat ini adalah ${formatRupiah(
    balance
  )}. Anda dapat memilih merchant demo dari daftar, memasukkan kode merchant secara manual, atau menyalakan kamera untuk simulasi pemindaian. Masukkan nominal pembayaran mulai seribu rupiah, lalu konfirmasi dengan PIN transaksi.`;

  // Pembersihan kamera saat komponen unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Mengaktifkan kamera secara eksplisit hanya jika diminta pengguna
  const handleStartCamera = async () => {
    setCameraError(null);
    stopSpeech();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const err = 'Perangkat atau browser Anda tidak mendukung akses kamera langsung. Silakan gunakan tab Pilih Merchant atau Input Kode Manual.';
      setCameraError(err);
      playErrorSound();
      if (isAudioMode) speakText(err);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
      if (isAudioMode) {
        speakText('Kamera aktif. Arahkan ke kode QR merchant, atau tekan tombol simulasi scan cepat di bawah video.');
      }
    } catch (err) {
      console.warn('Gagal mengakses kamera:', err);
      const errMsg = 'Izin kamera ditolak atau kamera sedang digunakan aplikasi lain. Anda tetap dapat melakukan pembayaran melalui tab input manual atau memilih merchant dari daftar.';
      setCameraError(errMsg);
      setIsCameraActive(false);
      playErrorSound();
      if (isAudioMode) speakText(errMsg);
    }
  };

  const handleStopCamera = () => {
    stopCameraStream();
    if (isAudioMode) speakText('Kamera dinonaktifkan.');
  };

  // Handler memilih merchant dari daftar atau simulasi scan
  const handleSelectMerchant = (merchant) => {
    setErrorMessage('');
    const validation = validateMerchant(merchant);
    if (!validation.isValid) {
      setErrorMessage(validation.error);
      playErrorSound();
      if (isAudioMode) speakText(validation.error);
      return;
    }

    setSelectedMerchant(validation.merchant);
    stopCameraStream();
    if (isAudioMode) {
      speakText(`Merchant terpilih: ${validation.merchant.merchantName}, kategori ${validation.merchant.merchantCategory}. Masukkan nominal pembayaran.`);
    }
  };

  // Handler verifikasi kode merchant manual
  const handleVerifyManualCode = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!manualCodeInput.trim()) {
      const err = 'Silakan masukkan kode merchant atau payload QR.';
      setErrorMessage(err);
      playErrorSound();
      if (isAudioMode) speakText(err);
      return;
    }

    const validation = validateMerchant(manualCodeInput.trim());
    if (!validation.isValid) {
      setErrorMessage(validation.error);
      playErrorSound();
      if (isAudioMode) speakText(validation.error);
      return;
    }

    setSelectedMerchant(validation.merchant);
    playSuccessSound();
    if (isAudioMode) {
      speakText(`Kode merchant valid: ${validation.merchant.merchantName}. Masukkan nominal pembayaran.`);
    }
  };

  // Handler input nominal
  const handleAmountChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    setAmountInput(raw);
    setErrorMessage('');
  };

  const parsedAmount = amountInput ? parseInt(amountInput, 10) : 0;

  // Langkah 1: Buka Modal Review Pembayaran
  const handleOpenReview = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedMerchant) {
      const err = 'Silakan pilih atau scan merchant terlebih dahulu.';
      setErrorMessage(err);
      playErrorSound();
      if (isAudioMode) speakText(err);
      return;
    }

    const validation = validateTransactionAmount(parsedAmount, {
      minAmount: 1000,
      maxAmount: 10000000,
      currentBalance: balance,
    });

    if (!validation.isValid) {
      setErrorMessage(validation.error);
      playErrorSound();
      if (isAudioMode) speakText(`Peringatan: ${validation.error}`);
      return;
    }

    setIsReviewOpen(true);
    if (isAudioMode) {
      speakText(
        `Konfirmasi pembayaran QRIS sebesar ${formatRupiah(
          parsedAmount
        )} kepada ${selectedMerchant.merchantName}. Biaya admin nol rupiah. Periksa kembali rincian sebelum memasukkan PIN.`
      );
    }
  };

  // Langkah 2: Lanjut ke PIN & Inisialisasi Idempotency Key
  const handleProceedToPin = () => {
    setIsReviewOpen(false);
    setPin('');
    setPinError('');
    const key = `IDEMP-QRIS-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setActiveIdempotencyKey(key);
    setIsPinModalOpen(true);
    if (isAudioMode) {
      speakText('Masukkan enam digit PIN transaksi Anda untuk mengonfirmasi pembayaran QRIS.');
    }
  };

  // Langkah 3: Eksekusi Pembayaran QRIS setelah verifikasi PIN
  const handleConfirmWithPin = async (e, pinOverride = null) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isProcessing) return;

    const targetPin = pinOverride || pin;

    if (pinAttempts >= 3) {
      setPinError('Percobaan PIN telah mencapai batas maksimal (3 kali). Pembayaran dibatalkan demi keamanan.');
      playErrorSound();
      if (isAudioMode) {
        speakText('Percobaan PIN telah mencapai batas maksimal. Pembayaran dibatalkan demi keamanan.');
      }
      return;
    }

    if (!targetPin || targetPin.length < 6) {
      const err = 'PIN harus terdiri dari 6 digit angka.';
      setPinError(err);
      playErrorSound();
      return;
    }

    setIsProcessing(true);
    setPinError('');

    // Verifikasi PIN Pengguna
    const pinCheck = await verifyTransactionPin(targetPin);
    if (!pinCheck.success) {
      const nextAttempts = pinAttempts + 1;
      setPinAttempts(nextAttempts);
      setIsProcessing(false);
      playErrorSound();

      const remaining = 3 - nextAttempts;
      const msg =
        remaining > 0
          ? `${pinCheck.message} Sisa percobaan: ${remaining} kali.`
          : 'PIN salah 3 kali berturut-turut. Pembayaran dibatalkan.';
      setPinError(msg);
      if (isAudioMode) {
        speakText(msg);
      }
      return;
    }

    // Jika PIN benar, eksekusi pembayaran QRIS
    try {
      const res = await payQris(selectedMerchant, parsedAmount, activeIdempotencyKey);
      setIsProcessing(false);
      setIsPinModalOpen(false);

      if (res.success) {
        playSuccessSound();
        setQrisResult(res.transaction);
        if (isAudioMode) {
          speakText(
            `Pembayaran QRIS sebesar ${formatRupiah(
              parsedAmount
            )} kepada ${selectedMerchant.merchantName} berhasil!`
          );
        }
      } else {
        playErrorSound();
        setErrorMessage(res.error || 'Gagal memproses pembayaran QRIS.');
        if (isAudioMode) speakText(res.error || 'Gagal memproses pembayaran.');
      }
    } catch (err) {
      setIsProcessing(false);
      setIsPinModalOpen(false);
      playErrorSound();
      setErrorMessage('Terjadi kendala jaringan saat memproses pembayaran QRIS.');
    }
  };

  const handleFinish = () => {
    setQrisResult(null);
    stopSpeech();
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Audio Guide Bar */}
      <AudioGuideBar
        instructionText={guideText}
        isPlaying={isPlaying}
        onPlay={speakText}
        onStop={stopSpeech}
      />

      {/* Header Halaman */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            stopCameraStream();
            stopSpeech();
            navigate('/dashboard');
          }}
          className={`inline-flex items-center gap-2 font-semibold text-gray-700 hover:text-primary transition-default rounded-xl border border-gray-300 bg-white p-2 focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary ${
            isEasyMode ? 'min-h-[52px] px-4 text-base' : 'text-sm px-3'
          }`}
          aria-label="Kembali ke Beranda"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Kembali</span>
        </button>

        <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 py-1 px-3 rounded-full flex items-center gap-1.5">
          <QrCode size={14} aria-hidden="true" />
          <span>QRIS Simulasi</span>
        </span>
      </div>

      {/* Kartu Saldo Tersedia */}
      <Card className="!p-5 bg-gradient-to-r from-amber-600 to-amber-500 text-white !border-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white" aria-hidden="true">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-xs text-white/90 font-medium">Saldo SahabatPay Tersedia</p>
            <p className="text-2xl font-extrabold tracking-tight" aria-live="polite">
              {formatRupiah(balance)}
            </p>
          </div>
        </div>
      </Card>

      {/* ============================================================ */}
      {/* SECTION 1: Pilih Metode Input Merchant */}
      {/* ============================================================ */}
      <section aria-labelledby="heading-qris-method">
        <h2 id="heading-qris-method" className={`font-bold text-gray-900 mb-2.5 ${isEasyMode ? 'text-xl' : 'text-base'}`}>
          1. Pilih Cara Pembayaran QRIS
        </h2>

        {/* Tab Selector */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-2xl border border-gray-200" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeMethodTab === 'list'}
            onClick={() => {
              stopCameraStream();
              setActiveMethodTab('list');
            }}
            className={`py-2.5 px-3 rounded-xl font-bold transition-default flex items-center justify-center gap-1.5 text-xs sm:text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
              isEasyMode ? 'min-h-[56px] text-base' : ''
            } ${
              activeMethodTab === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Store size={16} aria-hidden="true" />
            <span>Pilih Merchant</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeMethodTab === 'manual'}
            onClick={() => {
              stopCameraStream();
              setActiveMethodTab('manual');
            }}
            className={`py-2.5 px-3 rounded-xl font-bold transition-default flex items-center justify-center gap-1.5 text-xs sm:text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
              isEasyMode ? 'min-h-[56px] text-base' : ''
            } ${
              activeMethodTab === 'manual'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Keyboard size={16} aria-hidden="true" />
            <span>Kode Manual</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeMethodTab === 'camera'}
            onClick={() => {
              setActiveMethodTab('camera');
            }}
            className={`py-2.5 px-3 rounded-xl font-bold transition-default flex items-center justify-center gap-1.5 text-xs sm:text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
              isEasyMode ? 'min-h-[56px] text-base' : ''
            } ${
              activeMethodTab === 'camera'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Camera size={16} aria-hidden="true" />
            <span>Pindai Kamera</span>
          </button>
        </div>

        {/* TAB CONTENT A: DAFTAR MERCHANT DEMO */}
        {activeMethodTab === 'list' && (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-xs text-gray-600 font-medium mb-1">
              Pilih salah satu merchant mitra SahabatPay di bawah ini:
            </p>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Daftar merchant simulasi">
              {demoMerchants.map((merchant) => {
                const isSelected = selectedMerchant?.merchantId === merchant.merchantId;
                const isInactive = merchant.status !== 'active';
                return (
                  <button
                    key={merchant.merchantId}
                    type="button"
                    onClick={() => handleSelectMerchant(merchant)}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-default focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary ${
                      isEasyMode ? 'min-h-[64px] p-4' : 'min-h-[52px]'
                    } ${
                      isSelected
                        ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                        : isInactive
                        ? 'bg-gray-50 border-gray-200 opacity-75'
                        : 'bg-white border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 ${
                        isSelected
                          ? 'bg-amber-600 text-white'
                          : isInactive
                          ? 'bg-gray-200 text-gray-500'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                      aria-hidden="true"
                    >
                      {merchant.logoInitial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`font-bold truncate text-gray-900 ${isEasyMode ? 'text-base' : 'text-sm'}`}>
                          {merchant.merchantName}
                        </p>
                        {isInactive && (
                          <span className="text-[10px] bg-gray-200 text-gray-700 font-bold px-1.5 py-0.5 rounded">
                            Nonaktif
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 truncate mt-0.5">{merchant.merchantCategory}</p>
                      <p className="text-[11px] text-gray-500 font-mono mt-0.5">{merchant.merchantCode}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB CONTENT B: INPUT KODE MERCHANT MANUAL */}
        {activeMethodTab === 'manual' && (
          <form onSubmit={handleVerifyManualCode} className="mt-3 flex flex-col gap-2.5">
            <label htmlFor="manual-merchant-code" className={`block font-semibold text-gray-800 ${isEasyMode ? 'text-base' : 'text-sm'}`}>
              Ketik Kode Merchant atau Payload QRIS:
            </label>
            <div className="flex gap-2">
              <input
                id="manual-merchant-code"
                type="text"
                placeholder="Contoh: SUMELEH-COFFEE atau MERCH-001"
                value={manualCodeInput}
                onChange={(e) => setManualCodeInput(e.target.value)}
                className={`flex-1 rounded-2xl border bg-white text-gray-900 font-mono px-4 transition-default focus:ring-2 focus:ring-primary focus:border-primary border-gray-300 ${
                  isEasyMode ? 'py-3.5 text-base min-h-[56px]' : 'py-2.5 text-sm'
                }`}
              />
              <Button type="submit" variant="primary" size={isEasyMode ? 'lg' : 'md'}>
                Verifikasi
              </Button>
            </div>
            <p className="text-xs text-gray-600">
              Tips: Coba ketik <strong className="font-mono text-gray-900">SUMELEH-COFFEE</strong>, <strong className="font-mono text-gray-900">MINIMARKET-SHB</strong>, atau format QR payload: <strong className="font-mono text-gray-900">SAHABATPAY|QRIS|MERCH-001|SUMELEH-COFFEE</strong>.
            </p>

            {/* Error Message Khusus Tab Manual Jika Belum Memilih Merchant */}
            {errorMessage && !selectedMerchant && (
              <div
                className="p-3 bg-red-50 border border-red-300 rounded-xl text-red-900 font-medium text-xs flex items-start gap-2"
                role="alert"
                aria-live="assertive"
              >
                <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" aria-hidden="true" />
                <p className="flex-1">{errorMessage}</p>
              </div>
            )}
          </form>
        )}

        {/* TAB CONTENT C: SCANNER KAMERA (NATIVE HTML5 / WEB API) */}
        {activeMethodTab === 'camera' && (
          <div className="mt-3 bg-white p-4 rounded-2xl border border-gray-200 flex flex-col items-center text-center">
            {cameraError && (
              <div className="w-full mb-3 p-3 bg-red-50 border border-red-300 rounded-xl text-red-900 font-medium text-xs text-left flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" aria-hidden="true" />
                <p className="flex-1">{cameraError}</p>
              </div>
            )}

            {!isCameraActive ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                  <Camera size={32} />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Pindai QR Melalui Kamera</p>
                  <p className="text-xs text-gray-600 mt-1 max-w-sm">
                    Kamera hanya aktif saat Anda menekan tombol di bawah. Tidak ada foto atau video yang disimpan di server.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size={isEasyMode ? 'lg' : 'md'}
                  icon={<Camera size={18} />}
                  onClick={handleStartCamera}
                >
                  Buka Kamera Scanner
                </Button>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center gap-3">
                <div className="relative w-full max-w-sm aspect-square bg-black rounded-2xl overflow-hidden border-2 border-amber-500 shadow-inner">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Viewfinder Overlay Frame */}
                  <div className="absolute inset-8 border-2 border-dashed border-white/80 rounded-xl pointer-events-none flex items-center justify-center">
                    <p className="text-white text-xs bg-black/60 px-3 py-1.5 rounded-full font-medium">
                      Arahkan QR ke kotak ini
                    </p>
                  </div>
                </div>

                {/* QRIS Audio Radar Component */}
                <QrisAudioRadar
                  isActive={isCameraActive}
                  merchantName={demoMerchants[0]?.merchantName}
                  onQrLocked={() => handleSelectMerchant(demoMerchants[0])}
                />

                <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={<CameraOff size={16} />}
                    onClick={handleStopCamera}
                    className="border border-gray-300"
                  >
                    Tutup Kamera
                  </Button>

                  {/* Tombol Simulasi Deteksi Otomatis untuk Kenyamanan Testing */}
                  <button
                    type="button"
                    onClick={() => handleSelectMerchant(demoMerchants[0])}
                    className="text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 py-2 px-3 rounded-xl transition-default"
                  >
                    ⚡ Simulasi QR Terdeteksi (Sumeleh Coffee)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* SECTION 2: Merchant Terpilih & Form Nominal */}
      {/* ============================================================ */}
      {selectedMerchant && (
        <Card className="!p-5 border-amber-300 bg-amber-50/40 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-2 border-b border-amber-200/60 pb-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-600 text-white font-extrabold flex items-center justify-center text-base">
                {selectedMerchant.logoInitial}
              </div>
              <div>
                <p className="font-extrabold text-gray-900 text-base">{selectedMerchant.merchantName}</p>
                <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                  <Tag size={12} className="text-amber-600" />
                  <span>{selectedMerchant.merchantCategory}</span>
                </p>
                <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                  <MapPin size={12} className="text-gray-400" />
                  <span>{selectedMerchant.merchantLocation}</span>
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-secondary-dark bg-green-100 border border-green-300 px-2 py-0.5 rounded-full shrink-0">
              Terverifikasi ✓
            </span>
          </div>

          <form onSubmit={handleOpenReview} noValidate className="flex flex-col gap-4">
            {/* Input Nominal */}
            <div>
              <label htmlFor="qris-amount-input" className={`block font-bold text-gray-900 mb-1.5 ${isEasyMode ? 'text-lg' : 'text-sm'}`}>
                2. Masukkan Nominal Pembayaran:
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-600 text-lg" aria-hidden="true">
                  Rp
                </span>
                <input
                  id="qris-amount-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Contoh: 25.000 (Min. 1.000)"
                  value={amountInput ? Number(amountInput).toLocaleString('id-ID') : ''}
                  onChange={handleAmountChange}
                  className={`w-full rounded-2xl border bg-white text-gray-900 font-bold pl-12 pr-4 transition-default focus:ring-2 focus:ring-amber-500 focus:border-amber-500 border-gray-300 ${
                    isEasyMode ? 'py-4 text-xl min-h-[64px]' : 'py-3 text-lg min-h-[48px]'
                  }`}
                  aria-describedby="qris-amount-hint"
                />
              </div>
              <p id="qris-amount-hint" className="text-xs text-gray-600 font-medium mt-1">
                Batas pembayaran: Rp 1.000 hingga Rp 10.000.000 (sesuai saldo aktif).
              </p>
            </div>

            {/* Pilihan Nominal Cepat */}
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1.5">Pilihan Cepat:</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_QRIS_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setAmountInput(String(amt));
                      setErrorMessage('');
                    }}
                    className={`px-3 py-1.5 rounded-xl border font-bold text-xs transition-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                      parsedAmount === amt
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-gray-800 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {formatRupiah(amt)}
                  </button>
                ))}
              </div>
            </div>

            {/* Pesan Kesalahan */}
            {errorMessage && (
              <div
                className="p-3 bg-red-50 border border-red-300 rounded-xl text-red-900 font-medium text-xs flex items-start gap-2"
                role="alert"
                aria-live="assertive"
              >
                <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" aria-hidden="true" />
                <p className="flex-1">{errorMessage}</p>
              </div>
            )}

            {/* Ringkasan Biaya */}
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 flex flex-col gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Nominal Belanja:</span>
                <span className="font-bold text-gray-900 text-sm">{formatRupiah(parsedAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Biaya Layanan QRIS:</span>
                <span className="font-semibold text-secondary-dark">Rp 0 (Gratis)</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between items-center text-sm">
                <span className="font-bold text-gray-900">Total Potong Saldo:</span>
                <span className="font-extrabold text-amber-700 text-base">{formatRupiah(parsedAmount)}</span>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size={isEasyMode ? 'lg' : 'md'}
              fullWidth
              className="mt-1 shadow-md bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white"
            >
              Lanjutkan ke Pembayaran
            </Button>
          </form>
        </Card>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: Review Pembayaran QRIS */}
      {/* Dilengkapi Cognitive Delay Shield (10 detik) */}
      {/* ============================================================ */}
      <Modal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        title="Tinjau Pembayaran QRIS"
        showDefaultFooter={false}
      >
        {selectedMerchant && (
          <CognitiveDelayShield
            transactionType="Pembayaran QRIS"
            targetName={selectedMerchant.merchantName}
            targetPhoneMasked={selectedMerchant.merchantCode}
            amount={parsedAmount}
            adminFee={0}
            totalDebit={parsedAmount}
            remainingBalance={balance - parsedAmount}
            notes={selectedMerchant.merchantCategory}
            onCancel={() => setIsReviewOpen(false)}
            onConfirm={handleProceedToPin}
            enabled={cognitiveDelayEnabled}
            countdownSeconds={10}
          />
        )}
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 2: Konfirmasi PIN Transaksi */}
      {/* Dilengkapi Accessible PIN Input & Tremor Shield (Hold 500ms) */}
      {/* ============================================================ */}
      <Modal
        isOpen={isPinModalOpen}
        onClose={() => {
          if (!isProcessing) setIsPinModalOpen(false);
        }}
        title="Konfirmasi PIN Transaksi"
        showDefaultFooter={false}
      >
        <div className="flex flex-col gap-4 text-center">
          <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-2xl mx-auto flex items-center justify-center border border-amber-200" aria-hidden="true">
            <Lock size={24} />
          </div>

          <div>
            <p className="font-bold text-gray-900 text-base">Otorisasi Pembayaran QRIS</p>
            <p className="text-xs text-gray-600 mt-1">
              Masukkan 6 digit PIN akun Anda untuk membayar sebesar{' '}
              <strong className="text-gray-900">{formatRupiah(parsedAmount)}</strong> ke {selectedMerchant?.merchantName}.
            </p>
          </div>

          {/* Accessible Pin Input Component */}
          <AccessiblePinInput
            pinLength={6}
            disabled={isProcessing || pinAttempts >= 3}
            onComplete={(enteredPin) => {
              setPin(enteredPin);
              handleConfirmWithPin(null, enteredPin);
            }}
          />

          {pinError && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-red-900 font-medium text-xs text-left flex items-start gap-2" role="alert">
              <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" aria-hidden="true" />
              <p className="flex-1">{pinError}</p>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              size={isEasyMode ? 'lg' : 'md'}
              disabled={isProcessing}
              onClick={() => setIsPinModalOpen(false)}
            >
              Batal
            </Button>

            {/* Tremor Shield Protected Submit Button */}
            <PressAndHoldButton
              enabled={tremorShieldEnabled}
              disabled={isProcessing || pin.length < 6 || pinAttempts >= 3}
              onHoldComplete={() => handleConfirmWithPin(null, pin)}
              variant="primary"
            >
              {isProcessing ? 'Memproses...' : 'Bayar Sekarang'}
            </PressAndHoldButton>
          </div>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 3: Bukti / Hasil Pembayaran Berhasil */}
      {/* ============================================================ */}
      <Modal
        isOpen={Boolean(qrisResult)}
        onClose={handleFinish}
        title="Bukti Pembayaran QRIS"
        showDefaultFooter={false}
      >
        {qrisResult && (
          <div className="flex flex-col gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 text-secondary-dark mx-auto flex items-center justify-center" aria-hidden="true">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <p className="text-xs font-bold text-secondary-dark uppercase tracking-wider">Pembayaran QRIS Berhasil</p>
              <p className="text-2xl font-extrabold text-gray-900 mt-1">
                -{formatRupiah(qrisResult.amount)}
              </p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                {formatTanggal(qrisResult.createdAt)}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-left text-xs space-y-2 text-gray-700 font-medium">
              <div className="flex justify-between">
                <span className="text-gray-500">Nomor Transaksi:</span>
                <span className="font-mono font-bold text-gray-900">{qrisResult.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Nama Merchant:</span>
                <span className="font-bold text-gray-900">{qrisResult.metadata?.merchantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Kategori:</span>
                <span className="text-gray-900">{qrisResult.metadata?.merchantCategory}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Kode Merchant:</span>
                <span className="font-mono text-gray-900">{qrisResult.metadata?.merchantCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Biaya Layanan:</span>
                <span className="font-semibold text-secondary-dark">Rp 0 (Gratis)</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 text-sm">
                <span className="font-semibold text-gray-800">Sisa Saldo Anda:</span>
                <span className="font-extrabold text-secondary-dark">{formatRupiah(balance)}</span>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-2.5 text-[11px] text-yellow-800 font-medium text-left">
              ℹ Ini adalah bukti pembayaran QRIS simulasi prototype SahabatPay. Tidak ada transaksi perbankan riil.
            </div>

            <Button
              variant="primary"
              size={isEasyMode ? 'lg' : 'md'}
              fullWidth
              onClick={handleFinish}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Kembali ke Beranda
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
