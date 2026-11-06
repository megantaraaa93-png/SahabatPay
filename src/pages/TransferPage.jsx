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
import { formatRupiah, formatTanggal } from '../utils/formatCurrency';
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
      });
      setActiveTab('saved');
      if (isAudioMode) {
        speakText(`Penerima ${preselected.alias || preselected.name} sudah dipilih. Silakan masukkan nominal transfer.`);
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
    setSelectedRecipient({ name, phone: r.phone, isDemo: r.isDemo });
    setErrorMessage('');
    if (isAudioMode) {
      speakText(`Penerima terpilih: ${name}, nomor ${maskPhoneNumber(r.phone)}.`);
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
      speakText(
        `Tinjau transfer sebesar ${formatRupiah(
          parsedAmount
        )} kepada ${selectedRecipient.name}. Biaya admin nol rupiah. Periksa kembali sebelum memasukkan PIN.`
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
      speakText('Masukkan enam digit PIN transaksi Anda untuk mengesahkan transfer ini.');
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
          className={`inline-flex items-center gap-2 font-semibold text-gray-700 hover:text-primary transition-default rounded-xl border border-gray-300 bg-white p-2 focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary ${
            isEasyMode ? 'min-h-[52px] px-4 text-base' : 'text-sm px-3'
          }`}
          aria-label="Kembali ke Beranda"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Kembali</span>
        </button>

        <span className="text-xs font-semibold text-primary bg-red-50 border border-red-200 py-1 px-3 rounded-full">
          Transfer Saldo
        </span>
      </div>

      {/* Kartu Saldo Tersedia */}
      <Card className="!p-5 bg-gradient-to-r from-primary-dark to-primary text-white !border-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center text-white" aria-hidden="true">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-xs text-white/80 font-medium">Saldo SahabatPay Tersedia</p>
            <p className="text-2xl font-extrabold tracking-tight" aria-live="polite">
              {formatRupiah(balance)}
            </p>
          </div>
        </div>
      </Card>

      {/* Form Utama Transfer */}
      <form onSubmit={handleOpenReview} noValidate className="flex flex-col gap-5">
        {/* SECTION 1: Pilih / Cari Penerima */}
        <section aria-labelledby="heading-recipient">
          <div className="flex items-center justify-between mb-2.5">
            <h2
              id="heading-recipient"
              className={`font-bold text-gray-900 ${isEasyMode ? 'text-xl' : 'text-base'}`}
            >
              1. Pilih Akun Penerima
            </h2>
            <button
              type="button"
              onClick={() => navigate('/recipients')}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary rounded"
              aria-label="Kelola daftar penerima tersimpan"
            >
              <BookUser size={13} aria-hidden="true" />
              Kelola Daftar
            </button>
          </div>

          {/* Notifikasi simpan */}
          {saveNotif && (
            <div className="mb-2 p-2.5 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800 font-medium flex items-center gap-2" role="status">
              <CheckCircle2 size={14} className="text-secondary-dark shrink-0" aria-hidden="true" />
              {saveNotif}
            </div>
          )}

          {/* Tab Selector */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl border border-gray-200 mb-3" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'saved'}
              onClick={() => { setActiveTab('saved'); setSearchQuery(''); }}
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                isEasyMode ? 'min-h-[52px] text-base' : ''
              } ${
                activeTab === 'saved'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
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
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                isEasyMode ? 'min-h-[52px] text-base' : ''
              } ${
                activeTab === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users size={14} aria-hidden="true" />
              <span>Semua Pengguna</span>
            </button>
          </div>

          {/* Kotak Pencarian */}
          <div className="relative mb-3">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true">
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
              className={`w-full rounded-2xl border bg-white text-gray-900 pl-10 pr-4 transition-default focus:ring-2 focus:ring-primary focus:border-primary border-gray-300 ${
                isEasyMode ? 'py-4 text-base min-h-[56px]' : 'py-2.5 text-sm'
              }`}
            />
          </div>

          {/* Penerima Terpilih (Highlight) */}
          {selectedRecipient && (
            <div className="mb-3 p-3.5 bg-red-50/60 border border-primary rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold">
                  {selectedRecipient.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                    {selectedRecipient.name}
                    {selectedRecipient.isDemo && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded">
                        Akun Demo
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-600 font-mono mt-0.5">
                    {maskPhoneNumber(selectedRecipient.phone)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary px-2.5 py-1 bg-white rounded-lg border border-red-200">
                  Terpilih ✓
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedRecipient(null)}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
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
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center text-gray-600 text-sm">
                <User size={28} className="mx-auto text-gray-400 mb-2" aria-hidden="true" />
                <p className="font-semibold text-gray-800">
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
                    className="mt-2 text-xs text-primary font-semibold hover:underline"
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
                        ? 'bg-red-50 border-primary ring-2 ring-primary/20 shadow-sm'
                        : 'bg-white border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectRecipient(rec)}
                      className="flex items-center gap-3 flex-1 text-left focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary rounded-xl"
                      aria-pressed={isSelected}
                      aria-label={`Pilih ${displayName} sebagai penerima`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                          isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'
                        }`}
                        aria-hidden="true"
                      >
                        {displayName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className={`font-bold text-gray-900 ${isEasyMode ? 'text-base' : 'text-sm'}`}>
                          {displayName}
                        </p>
                        <p className={`text-gray-600 font-mono ${isEasyMode ? 'text-sm' : 'text-xs'}`}>
                          {maskPhoneNumber(rec.phone)}
                        </p>
                        {activeTab === 'saved' && rec.name && rec.name !== rec.alias && (
                          <p className="text-[10px] text-gray-400">{rec.name}</p>
                        )}
                      </div>
                    </button>

                    {/* Tombol Simpan (hanya di tab Semua Pengguna) */}
                    {activeTab === 'all' && (
                      <button
                        type="button"
                        onClick={() => handleSaveRecipient(rec)}
                        disabled={alreadySaved}
                        className={`ml-2 p-1.5 rounded-lg text-xs font-semibold transition-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary shrink-0 ${
                          alreadySaved
                            ? 'text-secondary-dark bg-green-50 border border-green-200 cursor-default'
                            : 'text-primary bg-red-50 border border-red-200 hover:bg-red-100'
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
            className={`font-bold text-gray-900 mb-2 ${isEasyMode ? 'text-xl' : 'text-base'}`}
          >
            2. Masukkan Nominal Transfer
          </h2>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-600 text-lg" aria-hidden="true">
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
              className={`w-full rounded-2xl border bg-white text-gray-900 font-bold pl-12 pr-4 transition-default focus:ring-2 focus:ring-primary focus:border-primary border-gray-300 ${
                isEasyMode ? 'py-4 text-xl min-h-[64px]' : 'py-3 text-lg min-h-[48px]'
              }`}
              aria-describedby="transfer-hint"
            />
          </div>
          <p id="transfer-hint" className="text-xs text-gray-600 font-medium mt-1">
            Batas per transaksi: Rp 10.000 hingga Rp 10.000.000.
          </p>
        </section>

        {/* SECTION 3: Catatan Opsional */}
        <section aria-labelledby="heading-notes">
          <label
            htmlFor="transfer-notes"
            id="heading-notes"
            className={`block font-bold text-gray-900 mb-1.5 ${isEasyMode ? 'text-lg' : 'text-sm'}`}
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
            className={`w-full rounded-2xl border bg-white text-gray-900 px-4 transition-default focus:ring-2 focus:ring-primary focus:border-primary border-gray-300 ${
              isEasyMode ? 'py-3.5 text-base min-h-[56px]' : 'py-2.5 text-sm'
            }`}
          />
        </section>

        {/* Pesan Kesalahan Form */}
        {errorMessage && (
          <div
            className="p-3.5 bg-red-50 border border-red-300 rounded-xl text-red-900 font-medium text-sm flex items-start gap-2"
            role="alert"
            aria-live="assertive"
          >
            <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" aria-hidden="true" />
            <p className="flex-1">{errorMessage}</p>
          </div>
        )}

        {/* Ringkasan Ringkas */}
        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col gap-2.5">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 font-medium">Nominal Transfer:</span>
            <span className="font-bold text-gray-900 text-base">{formatRupiah(parsedAmount)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 font-medium">Biaya Admin:</span>
            <span className="font-semibold text-secondary-dark">Gratis (Rp 0)</span>
          </div>
          <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
            <span className="font-bold text-gray-900">Total Potong Saldo:</span>
            <span className="font-extrabold text-primary text-xl">{formatRupiah(parsedAmount)}</span>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size={isEasyMode ? 'lg' : 'md'}
          fullWidth
          className="mt-1 shadow-md"
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
          <CognitiveDelayShield
            transactionType="Transfer Saldo"
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
          />
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
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl mx-auto flex items-center justify-center" aria-hidden="true">
            <Lock size={24} />
          </div>

          <div>
            <p className="font-bold text-gray-900 text-base">Konfirmasi Otorisasi</p>
            <p className="text-xs text-gray-600 mt-1">
              Masukkan 6 digit PIN akun Anda untuk menyelesaikan transfer sebesar{' '}
              <strong className="text-gray-900">{formatRupiah(parsedAmount)}</strong>.
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
            <div className="w-16 h-16 rounded-full bg-green-100 text-secondary-dark mx-auto flex items-center justify-center" aria-hidden="true">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <p className="text-xs font-bold text-secondary-dark uppercase tracking-wider">Transfer Berhasil</p>
              <p className="text-2xl font-extrabold text-gray-900 mt-1">
                -{formatRupiah(transferResult.amount)}
              </p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                {formatTanggal(transferResult.createdAt)}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-left text-xs space-y-2 text-gray-700 font-medium">
              <div className="flex justify-between">
                <span className="text-gray-500">Nomor Transaksi:</span>
                <span className="font-mono font-bold text-gray-900">{transferResult.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Penerima:</span>
                <span className="font-bold text-gray-900">{transferResult.metadata?.recipientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Nomor Akun:</span>
                <span className="font-mono text-gray-900">{maskPhoneNumber(transferResult.metadata?.recipientPhone)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Biaya Admin:</span>
                <span className="font-semibold text-secondary-dark">Rp 0</span>
              </div>
              {transferResult.metadata?.notes && transferResult.metadata.notes !== '-' && (
                <div className="flex justify-between border-t border-gray-200 pt-1.5">
                  <span className="text-gray-500">Catatan:</span>
                  <span className="text-gray-800 italic">{transferResult.metadata.notes}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-2 text-sm">
                <span className="font-semibold text-gray-800">Sisa Saldo Anda:</span>
                <span className="font-extrabold text-secondary-dark">{formatRupiah(balance)}</span>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-2.5 text-[11px] text-yellow-800 font-medium text-left">
              ℹ Ini adalah bukti transaksi simulasi prototype SahabatPay. Tidak ada aliran dana riil antar-rekening perbankan.
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
