import { useState } from 'react';
import {
  Send,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  ArrowRight,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { useVoiceTransaction, TRANSACTION_STEPS } from '../../context/VoiceTransactionContext';
import { useA11y } from '../../context/A11yContext';
import Modal from '../common/Modal';
import Button from '../common/Button';
import AccessiblePinInput from './AccessiblePinInput';
import { formatRupiah } from '../../utils/formatCurrency';

export default function VoiceTransactionModal() {
  const {
    txState,
    isPinModalOpen,
    pinAttempts,
    handlePinSubmit,
    resetTransaction,
    setIsPinModalOpen,
  } = useVoiceTransaction();
  const { isEasyMode } = useA11y();

  // Jika tidak ada transaksi aktif dan PIN modal tidak terbuka, jangan render apapun
  const hasActiveTransaction =
    txState.step !== TRANSACTION_STEPS.IDLE && txState.step !== null;

  if (!hasActiveTransaction && !isPinModalOpen) {
    return null;
  }

  const isTransfer = txState.type === 'TRANSFER';
  const isTopUp = txState.type === 'TOP_UP';

  const onKeypadInput = (digit) => {
    if (pinValue.length < 6) {
      const next = pinValue + String(digit);
      setPinValue(next);
      if (next.length === 6) {
        handlePinSubmit(next);
        setPinValue('');
      }
    }
  };

  const onKeypadBackspace = () => {
    setPinValue((prev) => prev.slice(0, -1));
  };

  const onKeypadClear = () => {
    setPinValue('');
  };

  return (
    <>
      {/* 1. Modal / Floating Card Transaksi Suara (Review, Konfirmasi, Sukses, Gagal) */}
      {hasActiveTransaction && !isPinModalOpen && (
        <div
          role="region"
          aria-live="polite"
          aria-label="Panel Status Transaksi Suara"
          className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md animate-in slide-in-from-bottom duration-300 md:bottom-8"
        >
          <div className="relative overflow-hidden rounded-2xl border-2 border-brand-emerald bg-white p-5 shadow-2xl dark:border-brand-emerald dark:bg-stone-900">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-brand-emerald animate-ping" />
                <span className="text-xs font-bold uppercase tracking-wider text-brand-emerald">
                  Transaksi Suara SahabatPay
                </span>
              </div>
              <button
                type="button"
                onClick={() => resetTransaction('Transaksi dibatalkan.')}
                className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800"
                aria-label="Batalkan transaksi suara"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Konten Berdasarkan Tahapan */}
            <div className="py-4">
              {/* SELECTING_RECIPIENT */}
              {txState.step === TRANSACTION_STEPS.SELECTING_RECIPIENT && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                    Menunggu Nama Penerima...
                  </p>
                  <p className="text-xs text-stone-500">
                    Sebutkan nama penerima dari kontak Anda.
                  </p>
                  {txState.candidates.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {txState.candidates.map((c, i) => (
                        <span
                          key={i}
                          className="rounded-lg bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                        >
                          {c.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ENTERING_AMOUNT */}
              {txState.step === TRANSACTION_STEPS.ENTERING_AMOUNT && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                    {isTransfer && txState.recipient
                      ? `Kirim ke: ${txState.recipient.name}`
                      : 'Isi Saldo'}
                  </p>
                  <p className="text-xs text-stone-500">
                    Sebutkan nominal yang ingin Anda proses, contoh: "50 ribu rupiah".
                  </p>
                </div>
              )}

              {/* AWAITING_CONFIRMATION */}
              {txState.step === TRANSACTION_STEPS.AWAITING_CONFIRMATION && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-stone-50 p-3 dark:bg-stone-800/60">
                    <div className="flex justify-between text-xs text-stone-500">
                      <span>Jenis Transaksi</span>
                      <span className="font-semibold text-stone-800 dark:text-stone-200">
                        {isTransfer ? 'Transfer Antar Pengguna' : 'Isi Saldo (Top Up)'}
                      </span>
                    </div>
                    {isTransfer && txState.recipient && (
                      <div className="mt-1 flex justify-between text-xs text-stone-500">
                        <span>Penerima</span>
                        <span className="font-semibold text-stone-800 dark:text-stone-200">
                          {txState.recipient.name} ({txState.recipient.phone})
                        </span>
                      </div>
                    )}
                    <div className="mt-1 flex justify-between text-xs text-stone-500">
                      <span>Nominal</span>
                      <span className="text-sm font-bold text-brand-forest dark:text-brand-emerald">
                        {formatRupiah(txState.amount)}
                      </span>
                    </div>
                  </div>
                  <p className="text-center text-xs font-medium text-stone-600 dark:text-stone-300">
                    Katakan <strong className="text-brand-emerald">"Lanjut"</strong> atau{' '}
                    <strong className="text-brand-emerald">"Setuju"</strong> untuk melanjutkan.
                  </p>
                </div>
              )}

              {/* PROCESSING */}
              {txState.step === TRANSACTION_STEPS.PROCESSING && (
                <div className="flex flex-col items-center justify-center py-2 space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-emerald" />
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                    Memproses transaksi aman...
                  </p>
                </div>
              )}

              {/* SUCCESS */}
              {txState.step === TRANSACTION_STEPS.SUCCESS && (
                <div className="flex flex-col items-center justify-center py-2 space-y-2 text-center">
                  <CheckCircle2 className="h-10 w-10 text-brand-emerald" />
                  <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    Transaksi Berhasil!
                  </p>
                  <p className="text-xs text-stone-500">
                    {isTransfer
                      ? `Berhasil transfer ${formatRupiah(txState.amount)} ke ${txState.recipient?.name}.`
                      : `Berhasil isi saldo ${formatRupiah(txState.amount)}.`}
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-2"
                    onClick={() => resetTransaction()}
                  >
                    Selesai
                  </Button>
                </div>
              )}

              {/* FAILED */}
              {txState.step === TRANSACTION_STEPS.FAILED && (
                <div className="flex flex-col items-center justify-center py-2 space-y-2 text-center">
                  <AlertCircle className="h-10 w-10 text-brand-coral" />
                  <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    Transaksi Tidak Dapat Diproses
                  </p>
                  <p className="text-xs text-brand-coral">
                    {txState.error || 'Terjadi kesalahan sistem.'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => resetTransaction()}
                  >
                    Tutup
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal Otorisasi PIN Aman (Hanya Keypad Layar, Tanpa Voice Input) */}
      <Modal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          resetTransaction('Input PIN dibatalkan.');
        }}
        title="Otorisasi PIN Transaksi"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-stone-50 p-3 text-center dark:bg-stone-800">
            <p className="text-xs text-stone-500">Transfer ke {txState.recipient?.name}</p>
            <p className="text-lg font-bold text-brand-forest dark:text-brand-emerald">
              {formatRupiah(txState.amount)}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-brand-coral">
            <Lock className="h-4 w-4" />
            <span>PIN dimasukkan secara rahasia via keypad layar</span>
          </div>

          <AccessiblePinInput
            pinLength={6}
            onComplete={(pin) => {
              handlePinSubmit(pin);
            }}
          />

          {pinAttempts > 0 && (
            <p className="text-center text-xs font-semibold text-brand-coral">
              Percobaan tersisa: {3 - pinAttempts} kali
            </p>
          )}

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsPinModalOpen(false);
                resetTransaction('Transaksi dibatalkan.');
              }}
            >
              Batalkan Transaksi
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
