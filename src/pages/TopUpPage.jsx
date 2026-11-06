import { useState, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Wallet,
  Building2,
  CreditCard,
  Store,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { useA11y } from '../context/A11yContext';
import { useWallet } from '../context/WalletContext';
import { useAudioGuidance } from '../hooks/useAudioGuidance';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import AudioGuideBar from '../components/a11y/AudioGuideBar';
import { formatRupiah, formatTanggal } from '../utils/formatCurrency';
import { validateTransactionAmount } from '../utils/transactionUtils';

// Pilihan nominal cepat
const PRESET_AMOUNTS = [50000, 100000, 200000, 500000, 1000000];

// Pilihan metode top up simulasi
const PAYMENT_METHODS = [
  {
    id: 'bank_transfer',
    name: 'Transfer Bank (BCA, Mandiri, BNI, BRI)',
    category: 'Transfer Bank',
    icon: Building2,
    code: 'BANK-SIMULASI',
    instruction: 'Transfer melalui ATM, Mobile Banking, atau Internet Banking ke nomor rekening penampung simulasi.',
  },
  {
    id: 'virtual_account',
    name: 'Virtual Account Instan (VA)',
    category: 'Virtual Account',
    icon: CreditCard,
    code: '8801-9923-4567-8901',
    instruction: 'Bayar via menu pembayaran Virtual Account perbankan dengan kode nomor VA di atas.',
  },
  {
    id: 'retail_store',
    name: 'Gerai Retail (Indomaret / Alfamart)',
    category: 'Gerai Retail',
    icon: Store,
    code: 'SP-RETAIL-88992',
    instruction: 'Tunjukkan kode pembayaran di atas kepada kasir gerai retail dan bayar sesuai nominal.',
  },
];

export default function TopUpPage() {
  const navigate = useNavigate();
  const { isEasyMode, isAudioMode } = useA11y();
  const { balance, topUp } = useWallet();
  const { isPlaying, speakText, stopSpeech, playSuccessSound, playErrorSound } = useAudioGuidance();

  // State alur
  const [amount, setAmount] = useState(100000);
  const [customAmountInput, setCustomAmountInput] = useState('');
  const [selectedMethodId, setSelectedMethodId] = useState('virtual_account');
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [resultModalData, setResultModalData] = useState(null); // Data transaksi jika berhasil
  const [isCopied, setIsCopied] = useState(false);

  const selectedMethod = PAYMENT_METHODS.find((m) => m.id === selectedMethodId) || PAYMENT_METHODS[0];

  const guideText = `Halaman Top Up Saldo SahabatPay. Saldo Anda saat ini adalah ${formatRupiah(
    balance
  )}. Pilih nominal cepat atau masukkan nominal manual, pilih metode simulasi seperti Transfer Bank, Virtual Account, atau Gerai Retail, lalu tekan tombol Lanjutkan untuk meninjau dan mengonfirmasi.`;

  // Handler memilih nominal preset
  const handleSelectPreset = (val) => {
    setAmount(val);
    setCustomAmountInput('');
    setErrorMessage('');
    if (isAudioMode) {
      speakText(`Nominal ${formatRupiah(val)} dipilih.`);
    }
  };

  // Handler input nominal manual
  const handleCustomAmountChange = (e) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    setCustomAmountInput(rawVal);
    setErrorMessage('');
    if (rawVal) {
      const parsed = parseInt(rawVal, 10);
      setAmount(parsed);
    } else {
      setAmount(0);
    }
  };

  // Handler tombol Lanjutkan / Review
  const handleOpenReview = (e) => {
    e.preventDefault();
    setErrorMessage('');

    const validation = validateTransactionAmount(amount, {
      minAmount: 10000,
      maxAmount: 10000000,
    });

    if (!validation.isValid) {
      setErrorMessage(validation.error);
      playErrorSound();
      if (isAudioMode) {
        speakText(`Peringatan: ${validation.error}`);
      }
      return;
    }

    setIsReviewModalOpen(true);
    if (isAudioMode) {
      speakText(
        `Konfirmasi Top Up sebesar ${formatRupiah(
          amount
        )} menggunakan metode ${selectedMethod.name}. Periksa kembali rincian sebelum menekan tombol Konfirmasi.`
      );
    }
  };

  // Handler konfirmasi eksekusi transaksi (mencegah klik ganda)
  const handleConfirmTopUp = async () => {
    if (isProcessing) return; // Mencegah double submission

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const res = await topUp(amount, selectedMethod.name, {
        methodId: selectedMethod.id,
        code: selectedMethod.code,
      });

      setIsProcessing(false);
      setIsReviewModalOpen(false);

      if (res.success) {
        playSuccessSound();
        setResultModalData(res.transaction);
        if (isAudioMode) {
          speakText(
            `Top Up sebesar ${formatRupiah(
              amount
            )} berhasil! Saldo baru Anda adalah ${formatRupiah(res.newBalance)}.`
          );
        }
      } else {
        playErrorSound();
        setErrorMessage(res.error || 'Terjadi kesalahan pada transaksi simulasi.');
        if (isAudioMode) {
          speakText(res.error || 'Terjadi kesalahan pada transaksi.');
        }
      }
    } catch (err) {
      setIsProcessing(false);
      setIsReviewModalOpen(false);
      playErrorSound();
      setErrorMessage('Terjadi kendala saat memproses transaksi simulasi.');
    }
  };

  // Salin kode pembayaran dummy
  const handleCopyCode = () => {
    if (selectedMethod?.code) {
      navigator.clipboard?.writeText(selectedMethod.code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      if (isAudioMode) {
        speakText('Kode pembayaran simulasi berhasil disalin ke papan klip.');
      }
    }
  };

  const handleFinishAndGoHome = () => {
    setResultModalData(null);
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

        <span className="text-xs font-semibold text-yellow-800 bg-yellow-100 border border-yellow-300 py-1 px-3 rounded-full">
          Simulasi Top Up
        </span>
      </div>

      {/* Kartu Saldo Saat Ini */}
      <Card className="!p-5 bg-gradient-to-r from-secondary-dark to-secondary text-white !border-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center text-white" aria-hidden="true">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-xs text-white/80 font-medium">Saldo SahabatPay Saat Ini</p>
            <p className="text-2xl font-extrabold tracking-tight" aria-live="polite">
              {formatRupiah(balance)}
            </p>
          </div>
        </div>
      </Card>

      {/* Form Pemilihan Top Up */}
      <form onSubmit={handleOpenReview} noValidate className="flex flex-col gap-5">
        {/* SECTION 1: Pilihan Nominal */}
        <section aria-labelledby="heading-nominal">
          <h2
            id="heading-nominal"
            className={`font-bold text-gray-900 mb-3 ${isEasyMode ? 'text-xl' : 'text-base'}`}
          >
            1. Pilih Nominal Top Up
          </h2>

          {/* Grid Preset Nominal */}
          <div
            className={`grid gap-2.5 ${isEasyMode ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}
            role="group"
            aria-label="Pilihan nominal cepat"
          >
            {PRESET_AMOUNTS.map((val) => {
              const isSelected = amount === val && !customAmountInput;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleSelectPreset(val)}
                  className={`flex items-center justify-between font-bold rounded-2xl border transition-default focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary ${
                    isEasyMode ? 'p-5 text-xl min-h-[64px]' : 'p-3.5 text-base min-h-[52px]'
                  } ${
                    isSelected
                      ? 'bg-red-50 border-primary text-primary shadow-sm ring-2 ring-primary/20'
                      : 'bg-white border-gray-300 text-gray-800 hover:border-gray-400'
                  }`}
                  aria-pressed={isSelected}
                >
                  <span>{formatRupiah(val)}</span>
                  {isSelected && <Check size={18} className="text-primary shrink-0" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          {/* Input Manual */}
          <div className="mt-4">
            <label
              htmlFor="custom-amount-input"
              className={`block font-semibold text-gray-800 mb-1.5 ${isEasyMode ? 'text-lg' : 'text-sm'}`}
            >
              Atau Masukkan Nominal Sendiri:
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-600 text-lg" aria-hidden="true">
                Rp
              </span>
              <input
                id="custom-amount-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Contoh: 75.000 (Min. 10.000)"
                value={customAmountInput ? Number(customAmountInput).toLocaleString('id-ID') : ''}
                onChange={handleCustomAmountChange}
                className={`w-full rounded-2xl border bg-white text-gray-900 font-bold pl-12 pr-4 transition-default focus:ring-2 focus:ring-primary focus:border-primary border-gray-300 ${
                  isEasyMode ? 'py-4 text-xl min-h-[64px]' : 'py-3 text-lg min-h-[48px]'
                }`}
                aria-describedby="amount-hint"
              />
            </div>
            <p id="amount-hint" className="text-xs text-gray-600 font-medium mt-1">
              Minimal Top Up Rp 10.000 dan maksimal Rp 10.000.000 per transaksi.
            </p>
          </div>
        </section>

        {/* SECTION 2: Pilihan Metode Pembayaran Simulasi */}
        <section aria-labelledby="heading-method">
          <h2
            id="heading-method"
            className={`font-bold text-gray-900 mb-3 ${isEasyMode ? 'text-xl' : 'text-base'}`}
          >
            2. Pilih Metode Pembayaran (Simulasi)
          </h2>

          <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Metode pembayaran simulasi">
            {PAYMENT_METHODS.map((method) => {
              const isSelected = selectedMethodId === method.id;
              const Icon = method.icon;
              return (
                <button
                  key={method.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => {
                    setSelectedMethodId(method.id);
                    if (isAudioMode) {
                      speakText(`Metode ${method.name} dipilih.`);
                    }
                  }}
                  className={`flex items-start gap-3.5 w-full text-left rounded-2xl border transition-default focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary ${
                    isEasyMode ? 'p-5 min-h-[64px]' : 'p-4'
                  } ${
                    isSelected
                      ? 'bg-red-50/50 border-primary shadow-sm ring-2 ring-primary/20'
                      : 'bg-white border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                      isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                    aria-hidden="true"
                  >
                    <Icon size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-gray-900 ${isEasyMode ? 'text-lg' : 'text-base'}`}>
                      {method.name}
                    </p>
                    <p className={`text-gray-600 mt-1 font-medium ${isEasyMode ? 'text-base' : 'text-xs'}`}>
                      {method.instruction}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Pesan Kesalahan Validasi */}
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

        {/* Ringkasan Singkat & Tombol Lanjut */}
        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col gap-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 font-medium">Nominal Top Up:</span>
            <span className="font-bold text-gray-900 text-base">{formatRupiah(amount)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 font-medium">Biaya Transaksi Simulasi:</span>
            <span className="font-semibold text-secondary-dark">Gratis (Rp 0)</span>
          </div>
          <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
            <span className="font-bold text-gray-900">Total Pembayaran:</span>
            <span className="font-extrabold text-primary text-xl">{formatRupiah(amount)}</span>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size={isEasyMode ? 'lg' : 'md'}
          fullWidth
          className="mt-1 shadow-md"
        >
          Lanjutkan ke Konfirmasi
        </Button>
      </form>

      {/* ============================================================ */}
      {/* MODAL 1: Review & Konfirmasi Transaksi (Tahap Konfirmasi) */}
      {/* ============================================================ */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => {
          if (!isProcessing) setIsReviewModalOpen(false);
        }}
        title="Tinjau & Konfirmasi Top Up"
      >
        <div className="flex flex-col gap-4 text-gray-800">
          <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 font-medium">
            <ShieldAlert size={18} className="shrink-0 text-amber-700 mt-0.5" aria-hidden="true" />
            <p>
              <strong>Simulasi Prototype:</strong> Ini adalah simulasi transaksi. Tidak ada uang riil yang ditarik dari rekening atau dompet Anda.
            </p>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Metode:</span>
              <span className="font-bold text-gray-900 text-right">{selectedMethod.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Kode/Tujuan Simulasi:</span>
              <span className="font-mono font-bold text-primary text-right">{selectedMethod.code}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span className="text-gray-600 font-medium">Nominal Top Up:</span>
              <span className="font-extrabold text-gray-900 text-base">{formatRupiah(amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Saldo Setelah Top Up:</span>
              <span className="font-bold text-secondary-dark">{formatRupiah(balance + amount)}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              size={isEasyMode ? 'lg' : 'md'}
              disabled={isProcessing}
              onClick={() => setIsReviewModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size={isEasyMode ? 'lg' : 'md'}
              disabled={isProcessing}
              onClick={handleConfirmTopUp}
              icon={isProcessing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            >
              {isProcessing ? 'Memproses Transaksi...' : 'Konfirmasi Top Up'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 2: Bukti / Hasil Transaksi Berhasil */}
      {/* ============================================================ */}
      <Modal
        isOpen={Boolean(resultModalData)}
        onClose={handleFinishAndGoHome}
        title="Hasil Transaksi Top Up"
      >
        {resultModalData && (
          <div className="flex flex-col gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 text-secondary-dark mx-auto flex items-center justify-center" aria-hidden="true">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <p className="text-xs font-bold text-secondary-dark uppercase tracking-wider">Top Up Berhasil</p>
              <p className="text-2xl font-extrabold text-gray-900 mt-1">
                +{formatRupiah(resultModalData.amount)}
              </p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                {formatTanggal(resultModalData.createdAt)}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-left text-xs space-y-2 text-gray-700 font-medium">
              <div className="flex justify-between">
                <span className="text-gray-500">Nomor Transaksi:</span>
                <span className="font-mono font-bold text-gray-900">{resultModalData.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Metode:</span>
                <span className="font-semibold text-gray-900">{resultModalData.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className="font-bold text-secondary-dark uppercase">Sukses (Simulasi)</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 text-sm">
                <span className="font-semibold text-gray-800">Saldo Akhir Anda:</span>
                <span className="font-extrabold text-secondary-dark">{formatRupiah(balance)}</span>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-2.5 text-[11px] text-yellow-800 font-medium text-left">
              ℹ Ini adalah bukti transaksi simulasi prototype SahabatPay. Tidak ada aliran dana riil.
            </div>

            <Button
              variant="primary"
              size={isEasyMode ? 'lg' : 'md'}
              fullWidth
              onClick={handleFinishAndGoHome}
            >
              Kembali ke Beranda
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
