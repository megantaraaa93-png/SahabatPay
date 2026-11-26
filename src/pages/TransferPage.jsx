import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Wallet,
  Send,
  User,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Loader2,
  Lock,
  UserCheck,
  BookUser,
  Star,
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
import GiantKeypad from '../components/a11y/GiantKeypad';
import { formatRupiah, formatTanggal } from '../utils/formatCurrency';

const PRESET_TRANSFER_AMOUNTS = [10000, 20000, 50000, 100000];
import { validateTransactionAmount, maskPhoneNumber } from '../utils/transactionUtils';
import { getSavedRecipients, addSavedRecipient, revalidateSavedRecipient } from '../services/recipientService';

export default function TransferPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isEasyMode, isAudioMode, cognitiveDelayEnabled, tremorShieldEnabled } = useA11y();
  const { user, getAvailableRecipients, verifyTransactionPin } = useAuth();
  const { balance, transfer } = useWallet();
  const { isPlaying, speakText, stopSpeech, playSuccessSound, playErrorSound } = useAudioGuidance();

  const userId = user?.id || user?.phone || '';

  // Tab: 'saved' | 'all'
  const [activeTab, setActiveTab] = useState('saved');

  // Daftar calon penerima terdaftar (semua pengguna)
  const allRecipients = useMemo(() => getAvailableRecipients(), [getAvailableRecipients]);
  // Daftar penerima tersimpan
  const [savedRecipients, setSavedRecipients] = useState(() => getSavedRecipients(userId));

  // Form State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [amountInput, setAmountInput] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Modal Step State
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinAttempts, setPinAttempts] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transferResult, setTransferResult] = useState(null);
  const [activeIdempotencyKey, setActiveIdempotencyKey] = useState(null);

  // Notifikasi simpan penerima
  const [saveNotif, setSaveNotif] = useState('');

  const guideText = `Halaman Transfer Saldo SahabatPay. Saldo Anda saat ini adalah ${formatRupiah(
    balance
  )}. Pilih penerima dari tab Tersimpan atau semua pengguna, masukkan nominal transfer minimal sepuluh ribu rupiah, lalu lanjutkan ke tinjauan transaksi dan konfirmasi PIN.`;

  // Pre-select penerima dari navigasi (misal dari RecipientsPage)
  useEffect(() => {
    const preselected = location.state?.preselectedRecipient;
    if (preselected) {
      setSelectedRecipient({
        name: preselected.alias || preselected.name,
        phone: preselected.phone,
        isDemo: Boolean(preselected.isDemo),
      });
      setActiveTab('saved');
      if (isAudioMode) {
        const demoNote = preselected.isDemo
          ? ' Penerima ini adalah penerima simulasi yang belum terdaftar.'
          : '';
        speakText(
          `Penerima ${preselected.alias || preselected.name} sudah dipilih.${demoNote} Silakan masukkan nominal transfer.`
        );
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter berdasarkan tab aktif dan pencarian
  const displayedRecipients = useMemo(() => {
    const source = activeTab === 'saved' ? savedRecipients : allRecipients;
    if (!searchQuery.trim()) return source;
    const q = searchQuery.toLowerCase();
    const qDigits = searchQuery.replace(/\D/g, '');
    return source.filter((r) => {
      const name = (activeTab === 'saved' ? r.alias : r.name) || '';
      const matchName = name.toLowerCase().includes(q);
      const matchPhone = qDigits ? (r.phone || '').replace(/\D/g, '').includes(qDigits) : false;
      return matchName || matchPhone;
    });
  }, [activeTab, savedRecipients, allRecipients, searchQuery]);

  // Handler memilih penerima
  const handleSelectRecipient = (r) => {
    const name = activeTab === 'saved' ? (r.alias || r.name) : r.name;
    setSelectedRecipient({ name, phone: r.phone, isDemo: Boolean(r.isDemo) });
    setErrorMessage('');
    if (isAudioMode) {
      const demoNote = r.isDemo
        ? ' Penerima ini adalah penerima simulasi yang belum terdaftar.'
        : '';
      speakText(`Penerima terpilih: ${name}, nomor ${maskPhoneNumber(r.phone)}.${demoNote}`);
    }
  };

  // Handler simpan penerima ke daftar (dari tab semua pengguna)
  const handleSaveRecipient = (r) => {
    const result = addSavedRecipient(userId, user?.phone || '', r.phone, r.name);
    if (result.success) {
      playSuccessSound();
      setSavedRecipients(getSavedRecipients(userId));
      setSaveNotif(`${r.name} disimpan ke daftar penerima.`);
      setTimeout(() => setSaveNotif(''), 3000);
    } else {
      setSaveNotif(result.error);
      setTimeout(() => setSaveNotif(''), 4000);
    }
  };

  // Handler input nominal
  const handleAmountChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    setAmountInput(raw);
    setErrorMessage('');
  };

  const parsedAmount = amountInput ? parseInt(amountInput, 10) : 0;

  // Langkah 1: Buka Modal Review
  const handleOpenReview = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedRecipient) {
      const err = 'Silakan pilih penerima transfer dari daftar.';
      setErrorMessage(err);
      playErrorSound();
      if (isAudioMode) speakText(err);
      return;
    }

    const validation = validateTransactionAmount(parsedAmount, {
      minAmount: 10000,
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
      const demoWarning = selectedRecipient.isDemo
        ? ' Peringatan: Penerima ini belum terdaftar di SahabatPay. Transaksi ini hanya simulasi dan tidak mengirim uang ke nomor tujuan.'
        : '';
      speakText(
        `Tinjau transfer sebesar ${formatRupiah(
          parsedAmount
        )} kepada ${selectedRecipient.name}. Biaya admin nol rupiah.${demoWarning} Periksa kembali sebelum memasukkan PIN.`
      );
    }
  };

  // Langkah 2: Lanjut dari Review ke Input PIN & Inisialisasi Idempotency Key
  const handleProceedToPin = () => {
    setIsReviewOpen(false);
    setPin('');
    setPinError('');
    const key = `IDEMP-TF-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setActiveIdempotencyKey(key);
    setIsPinModalOpen(true);
    if (isAudioMode) {
      const demoPinWarning = selectedRecipient?.isDemo
        ? 'Peringatan: penerima belum terdaftar dan transaksi ini hanya simulasi. '
        : '';
      speakText(`${demoPinWarning}Masukkan enam digit PIN transaksi Anda untuk mengesahkan transfer ini.`);
    }
  };

  // Langkah 3: Eksekusi transfer setelah verifikasi PIN
  const handleConfirmWithPin = async (e, pinOverride = null) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isProcessing) return;

    const targetPin = pinOverride || pin;

    if (pinAttempts >= 3) {
      setPinError('Percobaan PIN telah mencapai batas maksimal (3 kali). Transaksi dibatalkan demi keamanan.');
      playErrorSound();
      if (isAudioMode) {
        speakText('Percobaan PIN telah mencapai batas maksimal. Transaksi dibatalkan demi keamanan.');
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

    // Verifikasi PIN
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
          : 'PIN salah 3 kali berturut-turut. Transaksi dibatalkan.';
      setPinError(msg);
      if (isAudioMode) {
        speakText(msg);
      }
      return;
    }

    // Jika PIN cocok, jalankan transfer dengan Idempotency Key
    try {
      const res = await transfer(selectedRecipient, parsedAmount, notes, activeIdempotencyKey);
      setIsProcessing(false);
      setIsPinModalOpen(false);

      if (res.success) {
        playSuccessSound();
        setTransferResult(res.transaction);
        if (isAudioMode) {
          speakText(
            `Transfer sebesar ${formatRupiah(
              parsedAmount
            )} kepada ${selectedRecipient.name} berhasil diproses!`
          );
        }
      } else {
        playErrorSound();
        setErrorMessage(res.error || 'Gagal memproses transaksi transfer.');
        if (isAudioMode) speakText(res.error || 'Gagal memproses transaksi.');
      }
    } catch (err) {
      setIsProcessing(false);
      setIsPinModalOpen(false);
      playErrorSound();
      setErrorMessage('Terjadi kendala jaringan saat memproses transaksi transfer.');
    }
  };

  const handleFinish = () => {
    setTransferResult(null);
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
            stopSpeech();
            navigate('/dashboard');
          }}
          className={`inline-flex items-center gap-2 font-semibold text-brand-charcoal hover:text-brand-forest transition-default rounded-xl border border-brand-border bg-white shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest ${
            isEasyMode ? 'min-h-[64px] px-5 text-base' : 'min-h-[42px] text-sm px-3.5'
          }`}
          aria-label="Kembali ke Beranda"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Kembali</span>
        </button>

        <span className="sp-badge-forest py-1.5 px-3">
          Transfer Saldo
        </span>
      </div>

      {/* Kartu Saldo Tersedia */}
      <div className="balance-card rounded-2xl p-5 text-white shadow-balance">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white" aria-hidden="true">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-xs text-white/75 font-medium">Saldo SahabatPay Tersedia</p>
            <p className="text-2xl font-extrabold tracking-tight tabular-nums mt-0.5" aria-live="polite">
              {formatRupiah(balance)}
            </p>
          </div>
        </div>
      </div>

      {/* Form Utama Transfer */}
      <form onSubmit={handleOpenReview} noValidate className="flex flex-col gap-5">
        {/* SECTION 1: Pilih / Cari Penerima */}
        <section aria-labelledby="heading-recipient">
          <div className="flex items-center justify-between mb-2.5">
            <h2
              id="heading-recipient"
              className={`font-bold text-brand-charcoal ${isEasyMode ? 'text-xl' : 'text-base'}`}
            >
              1. Pilih Akun Penerima
            </h2>
            <button
              type="button"
              onClick={() => navigate('/recipients')}
              className="text-xs font-semibold text-brand-forest hover:underline flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest rounded px-1.5 py-1"
              aria-label="Kelola daftar penerima tersimpan"
            >
              <BookUser size={13} aria-hidden="true" />
              Kelola Daftar
            </button>
          </div>

          {/* Notifikasi simpan */}
          {saveNotif && (
            <div className="mb-2.5 sp-alert-success flex items-center gap-2 text-xs" role="status">
              <CheckCircle2 size={14} className="text-brand-emerald shrink-0" aria-hidden="true" />
              {saveNotif}
            </div>
          )}

          {/* Tab Selector */}
          <div className="flex gap-1 p-1 bg-white rounded-2xl border border-brand-border shadow-card mb-3" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'saved'}
              onClick={() => { setActiveTab('saved'); setSearchQuery(''); }}
              className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest ${
                isEasyMode ? 'min-h-[64px] text-base' : ''
              } ${
                activeTab === 'saved'
                  ? 'bg-brand-forest text-white shadow-sm'
                  : 'text-brand-muted hover:text-brand-charcoal'
              }`}
            >
              <Star size={14} aria-hidden="true" />
              <span>Tersimpan ({savedRecipients.length})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'all'}
              onClick={() => { setActiveTab('all'); setSearchQuery(''); }}
              className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest ${
                isEasyMode ? 'min-h-[64px] text-base' : ''
              } ${
                activeTab === 'all'
                  ? 'bg-brand-forest text-white shadow-sm'
                  : 'text-brand-muted hover:text-brand-charcoal'
              }`}
            >
              <Users size={14} aria-hidden="true" />
              <span>Semua Pengguna</span>
            </button>
          </div>

          {/* Kotak Pencarian */}
          <div className="relative mb-3">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" aria-hidden="true">
              <Search size={18} />
            </span>
            <label htmlFor="transfer-recipient-search" className="sr-only">
              Cari nama atau nomor penerima
            </label>
            <input
              id="transfer-recipient-search"
              type="text"
              placeholder={activeTab === 'saved' ? 'Cari nama tersimpan...' : 'Cari nama atau nomor HP...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded-xl border border-brand-border bg-white text-brand-charcoal pl-10 pr-4 transition-default focus:outline-none focus:ring-2 focus:ring-brand-forest/20 focus:border-brand-forest placeholder:text-brand-muted/60 ${
                isEasyMode ? 'py-4 text-base min-h-[64px]' : 'py-2.5 text-sm min-h-[46px]'
              }`}
            />
          </div>

          {/* Penerima Terpilih (Highlight) */}
          {selectedRecipient && (
            <div className="mb-3 p-3.5 bg-brand-forest/5 border-2 border-brand-forest rounded-2xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-brand-forest text-white flex items-center justify-center font-bold shrink-0">
                  {selectedRecipient.name?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-brand-charcoal text-sm flex items-center gap-1.5 flex-wrap">
                    <span className="truncate">{selectedRecipient.name}</span>
                    {selectedRecipient.isDemo && (
                      <span className="sp-badge-amber text-[10px]">
                        Akun Demo
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-brand-muted font-mono mt-0.5">
                    {maskPhoneNumber(selectedRecipient.phone)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="sp-badge-green text-xs">
                  <CheckCircle2 size={12} aria-hidden="true" />
                  <span>Terpilih</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedRecipient(null)}
                  className="text-xs text-brand-muted hover:text-brand-charcoal font-semibold underline px-1"
                  aria-label="Batalkan pilihan penerima"
                >
                  Ubah
                </button>
              </div>
            </div>
          )}

          {/* Daftar Penerima */}
          <div
            className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1"
            role="listbox"
            aria-label={activeTab === 'saved' ? 'Daftar penerima tersimpan' : 'Daftar semua pengguna terdaftar'}
          >
            {displayedRecipients.length === 0 ? (
              <div className="bg-white border border-brand-border rounded-2xl p-6 text-center text-brand-muted text-sm shadow-card">
                <User size={28} className="mx-auto text-brand-muted/50 mb-2" aria-hidden="true" />
                <p className="font-semibold text-brand-charcoal">
                  {activeTab === 'saved'
                    ? savedRecipients.length === 0
                      ? 'Belum ada penerima tersimpan'
                      : 'Tidak ada penerima yang cocok'
                    : 'Tidak ada pengguna lain yang terdaftar'}
                </p>
                {activeTab === 'saved' && savedRecipients.length === 0 && (
                  <button
                    type="button"
                    onClick={() => navigate('/recipients')}
                    className="mt-2 text-xs text-brand-forest font-semibold hover:underline"
                  >
                    + Tambah penerima baru
                  </button>
                )}
              </div>
            ) : (
              displayedRecipients.map((rec) => {
                const displayName = activeTab === 'saved' ? (rec.alias || rec.name) : rec.name;
                const isSelected = selectedRecipient?.phone === rec.phone;
                const alreadySaved = activeTab === 'all' && savedRecipients.some(
                  (s) => s.phone.replace(/\D/g, '') === rec.phone.replace(/\D/g, '')
                );
                return (
                  <div
                    key={rec.phone || rec.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-default ${
                      isEasyMode ? 'min-h-[64px] p-4' : 'min-h-[52px]'
                    } ${
                      isSelected
                        ? 'bg-brand-forest/5 border-brand-forest ring-2 ring-brand-forest/15 shadow-sm'
                        : 'bg-white border-brand-border hover:border-brand-muted/40'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectRecipient(rec)}
                      className="flex items-center gap-3 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest rounded-xl"
                      aria-pressed={isSelected}
                      aria-label={`Pilih ${displayName} sebagai penerima`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                          isSelected ? 'bg-brand-forest text-white' : 'bg-brand-cream text-brand-forest'
                        }`}
                        aria-hidden="true"
                      >
                        {displayName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className={`font-bold text-brand-charcoal flex items-center gap-1.5 ${isEasyMode ? 'text-base' : 'text-sm'}`}>
                          <span>{displayName}</span>
                          {rec.isDemo && (
                            <span className="sp-badge-amber text-[10px]">
                              Akun Demo
                            </span>
                          )}
                        </p>
                        <p className={`text-brand-muted font-mono ${isEasyMode ? 'text-sm' : 'text-xs'}`}>
                          {maskPhoneNumber(rec.phone)}
                        </p>
                        {activeTab === 'saved' && rec.name && rec.name !== rec.alias && (
                          <p className="text-[10px] text-brand-muted/80">{rec.name}</p>
                        )}
                      </div>
                    </button>

                    {/* Tombol Simpan (hanya di tab Semua Pengguna) */}
                    {activeTab === 'all' && (
                      <button
                        type="button"
                        onClick={() => handleSaveRecipient(rec)}
                        disabled={alreadySaved}
                        className={`ml-2 p-2 rounded-xl text-xs font-semibold transition-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest shrink-0 ${
                          alreadySaved
                            ? 'text-brand-emerald bg-brand-emerald/10 border border-brand-emerald/20 cursor-default'
                            : 'text-brand-forest bg-brand-forest/8 border border-brand-forest/20 hover:bg-brand-forest/15'
                        }`}
                        aria-label={alreadySaved ? `${rec.name} sudah tersimpan` : `Simpan ${rec.name} ke daftar penerima`}
                      >
                        {alreadySaved ? <CheckCircle2 size={14} /> : <Star size={14} />}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* SECTION 2: Input Nominal */}
        <section aria-labelledby="heading-transfer-amount">
          <h2
            id="heading-transfer-amount"
            className={`font-bold text-brand-charcoal mb-2.5 ${isEasyMode ? 'text-xl' : 'text-base'}`}
          >
            2. Masukkan Nominal Transfer
          </h2>

          {/* Preset Nominal Praktis */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3" role="group" aria-label="Pilihan nominal cepat transfer">
            {PRESET_TRANSFER_AMOUNTS.map((preset) => {
              const isSelected = parsedAmount === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setAmountInput(String(preset));
                    setErrorMessage('');
                    if (isAudioMode) speakText(`Nominal ${formatRupiah(preset)} dipilih.`);
                  }}
                  className={`rounded-xl border font-bold transition-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest tabular-nums ${
                    isEasyMode ? 'min-h-[64px] text-base px-3' : 'min-h-[44px] text-xs px-2.5'
                  } ${
                    isSelected
                      ? 'bg-brand-forest text-white border-brand-forest shadow-sm'
                      : 'bg-white text-brand-charcoal border-brand-border hover:border-brand-forest/50'
                  }`}
                >
                  {formatRupiah(preset)}
                </button>
              );
            })}
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-brand-muted text-lg" aria-hidden="true">
              Rp
            </span>
            <input
              id="transfer-amount-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Contoh: 50.000 (Min. 10.000)"
              value={amountInput ? Number(amountInput).toLocaleString('id-ID') : ''}
              onChange={handleAmountChange}
              className={`w-full rounded-xl border border-brand-border bg-white text-brand-charcoal font-bold tabular-nums pl-12 pr-4 transition-default focus:outline-none focus:ring-2 focus:ring-brand-forest/20 focus:border-brand-forest placeholder:text-brand-muted/50 placeholder:font-normal ${
                isEasyMode ? 'py-4 text-xl min-h-[64px]' : 'py-3 text-lg min-h-[48px]'
              }`}
              aria-describedby="transfer-hint"
            />
          </div>
          <p id="transfer-hint" className="text-xs text-brand-muted font-medium mt-1.5">
            Batas per transaksi: Rp 10.000 hingga Rp 10.000.000.
          </p>

          {/* Giant Keypad di EasyFocus */}
          {isEasyMode && (
            <div className="mt-3">
              <GiantKeypad
                value={amountInput}
                onChange={(val) => {
                  setAmountInput(val);
                  setErrorMessage('');
                }}
              />
            </div>
          )}
        </section>

        {/* SECTION 3: Catatan Opsional */}
        <section aria-labelledby="heading-notes">
          <label
            htmlFor="transfer-notes"
            id="heading-notes"
            className={`block font-bold text-brand-charcoal mb-1.5 ${isEasyMode ? 'text-lg' : 'text-sm'}`}
          >
            3. Catatan Transfer (Opsional)
          </label>
          <input
            id="transfer-notes"
            type="text"
            placeholder="Contoh: Uang makan siang, iuran, dll."
            maxLength={60}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`w-full rounded-xl border border-brand-border bg-white text-brand-charcoal px-4 transition-default focus:outline-none focus:ring-2 focus:ring-brand-forest/20 focus:border-brand-forest placeholder:text-brand-muted/50 ${
              isEasyMode ? 'py-4 text-base min-h-[64px]' : 'py-2.5 text-sm min-h-[46px]'
            }`}
          />
        </section>

        {/* Pesan Kesalahan Form */}
        {errorMessage && (
          <div
            className="sp-alert-error flex items-start gap-2"
            role="alert"
            aria-live="assertive"
          >
            <AlertCircle size={18} className="shrink-0 text-brand-coral mt-0.5" aria-hidden="true" />
            <p className="flex-1">{errorMessage}</p>
          </div>
        )}

        {/* Ringkasan Ringkas */}
        <Card className="bg-white border-brand-border flex flex-col gap-2.5">
          <div className="flex justify-between items-center text-sm">
            <span className="text-brand-muted font-medium">Nominal Transfer</span>
            <span className="font-bold text-brand-charcoal text-base tabular-nums">{formatRupiah(parsedAmount)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-brand-muted font-medium">Biaya Admin</span>
            <span className="font-semibold text-brand-emerald">Gratis (Rp 0)</span>
          </div>
          <div className="border-t border-brand-border pt-2.5 flex justify-between items-center">
            <span className="font-bold text-brand-charcoal">Total Potong Saldo</span>
            <span className="font-extrabold text-brand-forest text-xl tabular-nums">{formatRupiah(parsedAmount)}</span>
          </div>
        </Card>

        <Button
          type="submit"
          variant="primary"
          size={isEasyMode ? 'lg' : 'md'}
          fullWidth
          className="mt-1"
        >
          Tinjau & Lanjutkan
        </Button>
      </form>

      {/* ============================================================ */}
      {/* MODAL 1: Review Transfer Sebelum PIN */}
      {/* ============================================================ */}
      <Modal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        title="Tinjau Transfer Saldo"
        showDefaultFooter={false}
      >
        {selectedRecipient && (
          <div className="flex flex-col gap-3">
            {selectedRecipient.isDemo && (
              <div
                className="sp-alert-warning text-xs flex items-start gap-2"
                role="alert"
              >
                <ShieldAlert size={16} className="shrink-0 text-amber-700 mt-0.5" aria-hidden="true" />
                <p className="flex-1">
                  <strong>Penerima Belum Terdaftar (Simulasi):</strong> Nomor tujuan belum terdaftar di SahabatPay. Transaksi ini hanya simulasi dan tidak mengirim uang ke nomor atau rekening eksternal.
                </p>
              </div>
            )}
            <CognitiveDelayShield
              transactionType={selectedRecipient.isDemo ? 'Transfer Simulasi Eksternal' : 'Transfer Saldo'}
              targetName={selectedRecipient.name}
              targetPhoneMasked={maskPhoneNumber(selectedRecipient.phone)}
              amount={parsedAmount}
              adminFee={0}
              totalDebit={parsedAmount}
              remainingBalance={balance - parsedAmount}
              notes={notes}
              onCancel={() => setIsReviewOpen(false)}
              onConfirm={handleProceedToPin}
              enabled={cognitiveDelayEnabled}
              countdownSeconds={10}
              warningMessage={
                selectedRecipient.isDemo
                  ? 'Penerima belum terdaftar di SahabatPay. Transaksi ini hanya simulasi dan tidak mengirim uang ke nomor tujuan.'
                  : ''
              }
            />
          </div>
        )}
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 2: Konfirmasi PIN Transaksi */}
      {/* ============================================================ */}
      <Modal
        isOpen={isPinModalOpen}
        onClose={() => {
          if (!isProcessing) setIsPinModalOpen(false);
        }}
        title="Masukkan PIN Transaksi"
        showDefaultFooter={false}
      >
        <div className="flex flex-col gap-4 text-center">
          <div className="w-12 h-12 bg-brand-forest/10 text-brand-forest rounded-2xl mx-auto flex items-center justify-center" aria-hidden="true">
            <Lock size={24} />
          </div>

          <div>
            <p className="font-bold text-brand-charcoal text-base">Konfirmasi Otorisasi</p>
            <p className="text-xs text-brand-muted mt-1">
              Masukkan 6 digit PIN akun Anda untuk menyelesaikan transfer sebesar{' '}
              <strong className="text-brand-charcoal tabular-nums">{formatRupiah(parsedAmount)}</strong>.
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
            <div className="sp-alert-error text-xs text-left flex items-start gap-2" role="alert">
              <AlertCircle size={16} className="shrink-0 text-brand-coral mt-0.5" aria-hidden="true" />
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
              {isProcessing ? 'Mengirim...' : 'Konfirmasi Transfer'}
            </PressAndHoldButton>
          </div>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 3: Bukti / Hasil Transaksi Berhasil */}
      {/* ============================================================ */}
      <Modal
        isOpen={Boolean(transferResult)}
        onClose={handleFinish}
        title="Hasil Transaksi Transfer"
        showDefaultFooter={false}
      >
        {transferResult && (
          <div className="flex flex-col gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-brand-emerald/15 text-brand-emerald mx-auto flex items-center justify-center" aria-hidden="true">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <p className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Transfer Berhasil</p>
              <p className="text-2xl font-extrabold text-brand-charcoal tabular-nums mt-1">
                -{formatRupiah(transferResult.amount)}
              </p>
              <p className="text-xs text-brand-muted font-medium mt-0.5">
                {formatTanggal(transferResult.createdAt)}
              </p>
            </div>

            <div className="bg-brand-cream/60 p-4 rounded-xl border border-brand-border text-left text-xs space-y-2 text-brand-charcoal font-medium">
              <div className="flex justify-between">
                <span className="text-brand-muted">Nomor Transaksi</span>
                <span className="font-mono font-bold text-brand-charcoal">{transferResult.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-muted">Penerima</span>
                <span className="font-bold text-brand-charcoal">{transferResult.metadata?.recipientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-muted">Nomor Akun</span>
                <span className="font-mono text-brand-charcoal">{maskPhoneNumber(transferResult.metadata?.recipientPhone)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-muted">Biaya Admin</span>
                <span className="font-semibold text-brand-emerald">Rp 0</span>
              </div>
              {transferResult.metadata?.notes && transferResult.metadata.notes !== '-' && (
                <div className="flex justify-between border-t border-brand-border pt-1.5">
                  <span className="text-brand-muted">Catatan</span>
                  <span className="text-brand-charcoal italic">{transferResult.metadata.notes}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-brand-border pt-2 text-sm">
                <span className="font-semibold text-brand-charcoal">Sisa Saldo Anda</span>
                <span className="font-extrabold text-brand-forest tabular-nums">{formatRupiah(balance)}</span>
              </div>
            </div>

            <div className="sp-alert-info text-[11px] text-left">
              {transferResult.metadata?.isDemo || transferResult.metadata?.simulation
                ? 'Simulasi Eksternal: Saldo lokal Anda telah dipotong untuk keperluan demonstrasi, tetapi uang tidak dikirim ke nomor tujuan atau rekening eksternal.'
                : 'Ini adalah bukti transaksi simulasi prototype SahabatPay. Tidak ada aliran dana riil antar-rekening perbankan.'}
            </div>

            <Button
              variant="primary"
              size={isEasyMode ? 'lg' : 'md'}
              fullWidth
              onClick={handleFinish}
            >
              Kembali ke Beranda
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
