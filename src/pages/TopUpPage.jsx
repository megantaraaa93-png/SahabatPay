import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Wallet, Building2, CreditCard, Store,
  CircleCheck, AlertCircle, Copy, Check, ShieldAlert, Loader2,
} from 'lucide-react';
import { useA11y } from '../context/A11yContext';
import { useWallet } from '../context/WalletContext';
import { useAudioGuidance } from '../hooks/useAudioGuidance';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import AudioGuideBar from '../components/a11y/AudioGuideBar';
import GiantKeypad from '../components/a11y/GiantKeypad';
import { formatRupiah, formatTanggal } from '../utils/formatCurrency';
import { validateTransactionAmount } from '../utils/transactionUtils';

const PRESET_AMOUNTS = [10000, 20000, 50000, 100000, 200000, 500000];

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
  const navigate  = useNavigate();
  const { isEasyMode, isAudioMode } = useA11y();
  const { balance, topUp } = useWallet();
  const { isPlaying, speakText, stopSpeech, playSuccessSound, playErrorSound } = useAudioGuidance();

  const [amount,            setAmount]            = useState(100000);
  const [customAmountInput, setCustomAmountInput] = useState('');
  const [selectedMethodId,  setSelectedMethodId]  = useState('virtual_account');
  const [errorMessage,      setErrorMessage]      = useState('');
  const [isProcessing,      setIsProcessing]      = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [resultModalData,   setResultModalData]   = useState(null);
  const [isCopied,          setIsCopied]          = useState(false);

  const selectedMethod = PAYMENT_METHODS.find((m) => m.id === selectedMethodId) || PAYMENT_METHODS[0];

  const guideText = `Halaman Top Up Saldo SahabatPay. Saldo Anda saat ini adalah ${formatRupiah(balance)}. Pilih nominal cepat atau masukkan nominal manual, pilih metode simulasi, lalu tekan tombol Lanjutkan untuk mengonfirmasi.`;

  const handleSelectPreset = (val) => {
    setAmount(val);
    setCustomAmountInput('');
    setErrorMessage('');
    if (isAudioMode) speakText(`Nominal ${formatRupiah(val)} dipilih.`);
  };

  const handleCustomAmountChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    setCustomAmountInput(raw);
    setErrorMessage('');
    setAmount(raw ? parseInt(raw, 10) : 0);
  };

  const handleOpenReview = (e) => {
    e.preventDefault();
    setErrorMessage('');
    const v = validateTransactionAmount(amount, { minAmount: 10000, maxAmount: 10000000 });
    if (!v.isValid) {
      setErrorMessage(v.error);
      playErrorSound();
      if (isAudioMode) speakText(`Peringatan: ${v.error}`);
      return;
    }
    setIsReviewModalOpen(true);
    if (isAudioMode) speakText(`Konfirmasi Top Up sebesar ${formatRupiah(amount)} menggunakan metode ${selectedMethod.name}. Periksa kembali rincian sebelum menekan tombol Konfirmasi.`);
  };

  const handleConfirmTopUp = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setErrorMessage('');
    try {
      const res = await topUp(amount, selectedMethod.name, { methodId: selectedMethod.id, code: selectedMethod.code });
      setIsProcessing(false);
      setIsReviewModalOpen(false);
      if (res.success) {
        playSuccessSound();
        setResultModalData(res.transaction);
        if (isAudioMode) speakText(`Top Up sebesar ${formatRupiah(amount)} berhasil! Saldo baru Anda adalah ${formatRupiah(res.newBalance)}.`);
      } else {
        playErrorSound();
        setErrorMessage(res.error || 'Terjadi kesalahan pada transaksi simulasi.');
        if (isAudioMode) speakText(res.error || 'Terjadi kesalahan.');
      }
    } catch {
      setIsProcessing(false);
      setIsReviewModalOpen(false);
      playErrorSound();
      setErrorMessage('Terjadi kendala saat memproses transaksi simulasi.');
    }
  };

  const handleCopyCode = () => {
    if (selectedMethod?.code) {
      navigator.clipboard?.writeText(selectedMethod.code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      if (isAudioMode) speakText('Kode pembayaran simulasi berhasil disalin.');
    }
  };

  const handleFinishAndGoHome = () => {
    setResultModalData(null);
    stopSpeech();
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="flex flex-col gap-5 pb-8">
      <AudioGuideBar instructionText={guideText} isPlaying={isPlaying} onPlay={speakText} onStop={stopSpeech} />

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => { stopSpeech(); navigate('/dashboard'); }}
          className={`inline-flex items-center gap-2 font-semibold text-brand-charcoal hover:text-brand-forest
            transition-all duration-200 rounded-xl border border-brand-border bg-white p-2
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest
            ${isEasyMode ? 'min-h-[52px] px-4 text-base' : 'text-sm px-3'}`}
          aria-label="Kembali ke Beranda"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Kembali</span>
        </button>
        <h1 className={`font-bold text-brand-charcoal ${isEasyMode ? 'text-2xl' : 'text-xl'}`}>Top Up Saldo</h1>
        <span className="sp-badge-amber">Simulasi</span>
      </div>

      {/* Balance card */}
      <div className="balance-card rounded-2xl p-5 shadow-balance text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center" aria-hidden="true">
            <Wallet size={22} />
          </div>
          <div>
            <p className="text-xs text-white/70 font-medium">Saldo SahabatPay Saat Ini</p>
            <p className={`font-extrabold tracking-tight tabular-nums ${isEasyMode ? 'text-3xl' : 'text-2xl'}`} aria-live="polite">
              {formatRupiah(balance)}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleOpenReview} noValidate className="flex flex-col gap-5">
        {/* Section 1: Nominal */}
        <section aria-labelledby="heading-nominal">
          <h2 id="heading-nominal" className={`font-bold text-brand-charcoal mb-3 ${isEasyMode ? 'text-xl' : 'text-base'}`}>
            1. Pilih Nominal Top Up
          </h2>

          <div className={`grid gap-2.5 ${isEasyMode ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}
            role="group" aria-label="Pilihan nominal cepat">
            {PRESET_AMOUNTS.map((val) => {
              const isSelected = amount === val && !customAmountInput;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleSelectPreset(val)}
                  className={`flex items-center justify-between font-bold rounded-2xl border-2 transition-all duration-200
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest
                    ${isEasyMode ? 'p-5 text-base min-h-[64px]' : 'p-3.5 text-sm min-h-[52px]'}
                    ${isSelected
                      ? 'bg-brand-forest/8 border-brand-forest text-brand-forest shadow-sm'
                      : 'bg-white border-brand-border text-brand-charcoal hover:border-brand-forest/50'
                    }`}
                  aria-pressed={isSelected}
                >
                  <span>{formatRupiah(val)}</span>
                  {isSelected && <Check size={17} className="text-brand-forest shrink-0" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          {/* Manual input */}
          <div className="mt-4">
            <label htmlFor="custom-amount-input" className={`block font-semibold text-brand-charcoal mb-1.5 ${isEasyMode ? 'text-base' : 'text-sm'}`}>
              Atau Masukkan Nominal Sendiri:
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-brand-muted text-base" aria-hidden="true">Rp</span>
              <input
                id="custom-amount-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Contoh: 75.000 (Min. 10.000)"
                value={customAmountInput ? Number(customAmountInput).toLocaleString('id-ID') : ''}
                onChange={handleCustomAmountChange}
                className={`w-full rounded-2xl border border-brand-border bg-white text-brand-charcoal font-bold pl-12 pr-4
                  transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-forest/20 focus:border-brand-forest
                  placeholder:text-brand-muted/50
                  ${isEasyMode ? 'py-4 text-xl min-h-[64px]' : 'py-3 text-lg min-h-[48px]'}`}
                aria-describedby="amount-hint"
              />
            </div>
            <p id="amount-hint" className="text-xs text-brand-muted font-medium mt-1">
              Minimal Top Up Rp 10.000 dan maksimal Rp 10.000.000 per transaksi.
            </p>
            {isEasyMode && (
              <div className="mt-3">
                <GiantKeypad value={customAmountInput} onChange={(raw) => { setCustomAmountInput(raw); setErrorMessage(''); setAmount(raw ? parseInt(raw, 10) : 0); }} />
              </div>
            )}
          </div>
        </section>

        {/* Section 2: Payment Method */}
        <section aria-labelledby="heading-method">
          <h2 id="heading-method" className={`font-bold text-brand-charcoal mb-3 ${isEasyMode ? 'text-xl' : 'text-base'}`}>
            2. Pilih Metode Pembayaran (Simulasi)
          </h2>
          <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Metode pembayaran">
            {PAYMENT_METHODS.map((method) => {
              const isSelected = selectedMethodId === method.id;
              const Icon = method.icon;
              return (
                <button
                  key={method.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => { setSelectedMethodId(method.id); if (isAudioMode) speakText(`Metode ${method.name} dipilih.`); }}
                  className={`flex items-start gap-3.5 w-full text-left rounded-2xl border-2 transition-all duration-200
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest
                    ${isEasyMode ? 'p-5 min-h-[64px]' : 'p-4'}
                    ${isSelected
                      ? 'bg-brand-forest/5 border-brand-forest shadow-sm'
                      : 'bg-white border-brand-border hover:border-brand-forest/40'
                    }`}
                >
                  <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${isSelected ? 'bg-brand-forest text-white' : 'bg-brand-cream text-brand-muted'}`} aria-hidden="true">
                    <Icon size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-brand-charcoal ${isEasyMode ? 'text-base' : 'text-sm'}`}>{method.name}</p>
                    <p className={`text-brand-muted mt-1 ${isEasyMode ? 'text-base' : 'text-xs'}`}>{method.instruction}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Error */}
        {errorMessage && (
          <div className="sp-alert-error flex items-start gap-2" role="alert" aria-live="assertive">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-brand-coral" aria-hidden="true" />
            <p className="flex-1">{errorMessage}</p>
          </div>
        )}

        {/* Summary */}
        <div className="bg-white rounded-2xl border border-brand-border p-4 flex flex-col gap-2.5 shadow-card">
          <div className="flex justify-between items-center text-sm">
            <span className="text-brand-muted font-medium">Nominal Top Up:</span>
            <span className="font-bold text-brand-charcoal text-base">{formatRupiah(amount)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-brand-muted font-medium">Biaya Transaksi:</span>
            <span className="font-semibold text-brand-emerald">Gratis (Rp 0)</span>
          </div>
          <div className="border-t border-brand-border pt-2 flex justify-between items-center">
            <span className="font-bold text-brand-charcoal">Total Pembayaran:</span>
            <span className="font-extrabold text-brand-forest text-xl tabular-nums">{formatRupiah(amount)}</span>
          </div>
        </div>

        <Button type="submit" variant="primary" size={isEasyMode ? 'lg' : 'md'} fullWidth className="mt-1">
          Lanjutkan ke Konfirmasi
        </Button>
      </form>

      {/* Review Modal */}
      <Modal isOpen={isReviewModalOpen} onClose={() => { if (!isProcessing) setIsReviewModalOpen(false); }} title="Tinjau & Konfirmasi Top Up">
        <div className="flex flex-col gap-4">
          <div className="sp-alert-warning flex items-start gap-2.5">
            <ShieldAlert size={16} className="shrink-0 mt-0.5 text-amber-700" aria-hidden="true" />
            <p><strong>Simulasi Prototype:</strong> Ini adalah simulasi transaksi. Tidak ada uang riil yang ditarik dari rekening Anda.</p>
          </div>
          <div className="bg-brand-cream p-4 rounded-xl border border-brand-border space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-brand-muted font-medium">Metode:</span>
              <span className="font-bold text-brand-charcoal">{selectedMethod.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-muted font-medium">Kode Simulasi:</span>
              <span className="font-mono font-bold text-brand-forest">{selectedMethod.code}</span>
            </div>
            <div className="flex justify-between border-t border-brand-border pt-2">
              <span className="text-brand-muted font-medium">Nominal:</span>
              <span className="font-extrabold text-brand-charcoal text-base">{formatRupiah(amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-muted font-medium">Saldo Setelah Top Up:</span>
              <span className="font-bold text-brand-emerald">{formatRupiah(balance + amount)}</span>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" size={isEasyMode ? 'lg' : 'md'} disabled={isProcessing} onClick={() => setIsReviewModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              size={isEasyMode ? 'lg' : 'md'}
              loading={isProcessing}
              onClick={handleConfirmTopUp}
              icon={isProcessing ? null : <CircleCheck size={18} />}
            >
              {isProcessing ? 'Memproses...' : 'Konfirmasi Top Up'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Result Modal */}
      <Modal isOpen={Boolean(resultModalData)} onClose={handleFinishAndGoHome} title="Top Up Berhasil">
        {resultModalData && (
          <div className="flex flex-col gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-brand-emerald/10 text-brand-emerald mx-auto flex items-center justify-center" aria-hidden="true">
              <CircleCheck size={36} />
            </div>
            <div>
              <p className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Top Up Berhasil</p>
              <p className={`font-extrabold text-brand-charcoal mt-1 tabular-nums ${isEasyMode ? 'text-3xl' : 'text-2xl'}`}>
                +{formatRupiah(resultModalData.amount)}
              </p>
              <p className="text-xs text-brand-muted mt-1">{formatTanggal(resultModalData.createdAt)}</p>
            </div>
            <div className="bg-brand-cream p-4 rounded-xl border border-brand-border text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-brand-muted">No. Transaksi:</span>
                <span className="font-mono font-bold text-brand-charcoal">{resultModalData.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-muted">Metode:</span>
                <span className="font-semibold text-brand-charcoal">{resultModalData.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-muted">Status:</span>
                <span className="font-bold text-brand-emerald">Sukses (Simulasi)</span>
              </div>
              <div className="flex justify-between border-t border-brand-border pt-2 text-sm">
                <span className="font-semibold text-brand-charcoal">Saldo Akhir:</span>
                <span className="font-extrabold text-brand-emerald">{formatRupiah(balance)}</span>
              </div>
            </div>
            <div className="sp-alert-warning text-left text-[11px]">
              ℹ Ini adalah bukti transaksi simulasi prototype SahabatPay. Tidak ada aliran dana riil.
            </div>
            <Button variant="primary" size={isEasyMode ? 'lg' : 'md'} fullWidth onClick={handleFinishAndGoHome}>
              Kembali ke Beranda
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
