import { useState, useEffect, useRef } from 'react';
import {
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { useA11y } from '../../context/A11yContext';
import { useAudioGuidance } from '../../hooks/useAudioGuidance';
import Button from '../common/Button';
import { formatRupiah } from '../../utils/formatCurrency';

/**
 * Komponen CognitiveDelayShield
 * Memberikan jeda waktu 10 detik bagi pengguna untuk menelaah rincian transaksi
 * sebelum tombol konfirmasi aktif. Mencegah kesalahan kognitif dan transfer impulsif/keliru.
 */
export default function CognitiveDelayShield({
  transactionType = 'Transfer Saldo',
  targetName = 'Penerima',
  targetPhoneMasked = '',
  amount = 0,
  adminFee = 0,
  totalDebit = 0,
  remainingBalance = 0,
  notes = '',
  onConfirm,
  onCancel,
  enabled = true,
  countdownSeconds = 10,
}) {
  const { isEasyMode, isAudioMode } = useA11y();
  const { speakText, playTickSound, playSuccessSound } = useAudioGuidance();

  // Jika fitur dinonaktifkan, countdown langsung 0
  const [secondsLeft, setSecondsLeft] = useState(enabled ? countdownSeconds : 0);
  const timerRef = useRef(null);
  const spokenRef = useRef(false);

  // Narasi Audio Guidance
  useEffect(() => {
    if (!spokenRef.current && isAudioMode) {
      spokenRef.current = true;
      const audioSummary = `Ringkasan ${transactionType}. Anda akan mengirim ${formatRupiah(
        amount
      )} kepada ${targetName}. Biaya admin ${formatRupiah(
        adminFee
      )}. Total pemotongan saldo ${formatRupiah(
        totalDebit
      )}. Perkiraan sisa saldo Anda ${formatRupiah(
        remainingBalance
      )}. ${
        enabled
          ? `Silakan periksa kembali. Tombol konfirmasi tersedia dalam ${countdownSeconds} detik.`
          : 'Silakan periksa kembali rincian Anda.'
      }`;
      speakText(audioSummary);
    }
  }, [transactionType, targetName, amount, adminFee, totalDebit, remainingBalance, isAudioMode, speakText, enabled, countdownSeconds]);

  // Timer Hitung Mundur 10 Detik
  useEffect(() => {
    if (!enabled || secondsLeft <= 0) return;

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          playSuccessSound();
          if (isAudioMode) {
            speakText('Waktu telaah selesai. Silakan tekan tombol konfirmasi untuk melanjutkan ke PIN.');
          }
          return 0;
        }
        playTickSound(440);
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, secondsLeft, playTickSound, playSuccessSound, isAudioMode, speakText]);

  const isReady = secondsLeft === 0;
  const progressPercent = enabled
    ? Math.round(((countdownSeconds - secondsLeft) / countdownSeconds) * 100)
    : 100;

  return (
    <div
      className="flex flex-col gap-4 text-gray-800 text-left"
      role="region"
      aria-label={`Ringkasan telaah transaksi ${transactionType}`}
    >
      {/* Banner Countdown Cognitive Shield */}
      {enabled && (
        <div
          className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
            isReady
              ? 'bg-green-50 border-green-300 text-secondary-dark'
              : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                isReady ? 'bg-green-200 text-secondary-dark' : 'bg-amber-200 text-amber-900 animate-pulse'
              }`}
            >
              {isReady ? <CheckCircle2 size={18} /> : <Clock size={18} />}
            </div>
            <div>
              <p className="font-extrabold text-xs">
                {isReady
                  ? 'Waktu Telaah Selesai'
                  : `Cognitive Delay Shield (Jeda ${secondsLeft}d)`}
              </p>
              <p className="text-[11px] opacity-80 mt-0.5">
                {isReady
                  ? 'Rincian telah ditelaah. Tombol konfirmasi kini aktif.'
                  : 'Pelajari rincian transaksi sebelum konfirmasi dibuka.'}
              </p>
            </div>
          </div>

          {!isReady && (
            <div className="w-10 h-10 rounded-full border-2 border-amber-400 flex items-center justify-center font-mono font-black text-sm bg-white shrink-0">
              {secondsLeft}s
            </div>
          )}
        </div>
      )}

      {/* Rincian Transaksi */}
      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2.5 text-xs sm:text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500 font-medium">Jenis Transaksi:</span>
          <span className="font-bold text-gray-900">{transactionType}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500 font-medium">Tujuan / Pihak Terkait:</span>
          <span className="font-bold text-gray-900 text-right">{targetName}</span>
        </div>

        {targetPhoneMasked && (
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Nomor Handphone:</span>
            <span className="font-mono text-gray-700">{targetPhoneMasked}</span>
          </div>
        )}

        {notes && notes !== '-' && (
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Catatan:</span>
            <span className="italic text-gray-700">{notes}</span>
          </div>
        )}

        <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold">
          <span className="text-gray-600">Nominal:</span>
          <span className="font-bold text-gray-900">{formatRupiah(amount)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Biaya Admin:</span>
          <span className="font-semibold text-secondary-dark">{formatRupiah(adminFee)} (Gratis)</span>
        </div>

        <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-sm">
          <span className="text-gray-900">Total Potong Saldo:</span>
          <span className="font-extrabold text-primary text-base">{formatRupiah(totalDebit)}</span>
        </div>

        <div className="flex justify-between text-[11px] text-gray-500 pt-1">
          <span>Perkiraan Sisa Saldo:</span>
          <span className="font-bold text-secondary-dark">{formatRupiah(remainingBalance)}</span>
        </div>
      </div>

      {/* Tombol Aksi Batal & Lanjut ke PIN */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          size={isEasyMode ? 'lg' : 'md'}
          onClick={onCancel}
        >
          Batal / Ubah
        </Button>

        <Button
          type="button"
          variant="primary"
          size={isEasyMode ? 'lg' : 'md'}
          disabled={!isReady}
          icon={isReady ? <ArrowRight size={16} /> : <Clock size={16} />}
          onClick={onConfirm}
          className={!isReady ? 'opacity-60 cursor-not-allowed' : ''}
        >
          {isReady
            ? 'Lanjut ke PIN'
            : `Tunggu (${secondsLeft}s)...`}
        </Button>
      </div>
    </div>
  );
}
