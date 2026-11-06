import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Check,
  Printer,
  Share2,
  ArrowDownLeft,
  ArrowUpRight,
  QrCode,
  ShieldCheck,
  Calendar,
  Clock,
  Wallet,
  Store,
  User,
  Tag,
  MapPin,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { useA11y } from '../context/A11yContext';
import { useWallet } from '../context/WalletContext';
import { useAudioGuidance } from '../hooks/useAudioGuidance';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import AudioGuideBar from '../components/a11y/AudioGuideBar';
import { formatRupiah, formatTanggal, formatTanggalSingkat } from '../utils/formatCurrency';
import { normalizeTransaction, maskPhoneNumber } from '../utils/transactionUtils';

export default function TransactionDetailPage() {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const { isEasyMode, isAudioMode } = useA11y();
  const { transactions } = useWallet();
  const { isPlaying, speakText, stopSpeech, playSuccessSound } = useAudioGuidance();

  const [copied, setCopied] = useState(false);

  // Cari transaksi berdasarkan ID
  const rawTxn = useMemo(() => {
    return transactions.find((t) => String(t.id) === String(transactionId));
  }, [transactions, transactionId]);

  // Normalisasi data transaksi
  const txn = useMemo(() => {
    return rawTxn ? normalizeTransaction(rawTxn) : null;
  }, [rawTxn]);

  // Salin ID Transaksi ke Clipboard
  const handleCopyId = async () => {
    if (!txn) return;
    try {
      await navigator.clipboard.writeText(txn.id);
      setCopied(true);
      playSuccessSound();
      if (isAudioMode) speakText('Nomor ID transaksi berhasil disalin ke papan klip.');
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      // Fallback manual jika clipboard API tidak diizinkan
      const el = document.createElement('textarea');
      el.value = txn.id;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Cetak Bukti Transaksi
  const handlePrint = () => {
    window.print();
  };

  if (!txn) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-gray-200 mt-6 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-200">
          <AlertCircle size={32} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Transaksi Tidak Ditemukan</h1>
          <p className="text-xs text-gray-500 mt-1 max-w-sm">
            ID transaksi "{transactionId}" tidak ditemukan di akun Anda atau telah dibersihkan.
          </p>
        </div>
        <Button
          variant="primary"
          size={isEasyMode ? 'lg' : 'md'}
          icon={<ArrowLeft size={16} />}
          onClick={() => navigate('/history')}
        >
          Kembali ke Riwayat
        </Button>
      </div>
    );
  }

  const isIncome = txn.direction === 'in';
  const meta = txn.metadata || {};

  // Teks Panduan Audio
  const guideText = `Detail bukti transaksi ${txn.title}. Nomor transaksi ${txn.id}. Status transaksi berhasil. Nominal ${
    isIncome ? 'uang masuk' : 'uang keluar'
  } ${formatRupiah(txn.amount)}. Tanggal ${formatTanggal(
    txn.createdAt
  )}. Anda dapat menyalin nomor ID transaksi atau mencetak bukti transaksi ini.`;

  return (
    <div className="flex flex-col gap-5 pb-12">
      {/* CSS Khusus Print Layout */}
      <style>{`
        @media print {
          body {
            background: white !important;
            padding: 0 !important;
          }
          nav, aside, header, .no-print {
            display: none !important;
          }
          .printable-receipt {
            box-shadow: none !important;
            border: 1px solid #ccc !important;
            max-width: 100% !important;
            margin: 0 auto !important;
          }
        }
      `}</style>

      {/* Audio Guide Bar (disembunyikan saat print) */}
      <div className="no-print">
        <AudioGuideBar
          instructionText={guideText}
          isPlaying={isPlaying}
          onPlay={speakText}
          onStop={stopSpeech}
        />
      </div>

      {/* Header Halaman (no-print) */}
      <div className="flex items-center justify-between no-print">
        <button
          onClick={() => {
            stopSpeech();
            navigate('/history');
          }}
          className={`inline-flex items-center gap-2 font-semibold text-gray-700 hover:text-primary transition-default rounded-xl border border-gray-300 bg-white p-2 focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary ${
            isEasyMode ? 'min-h-[52px] px-4 text-base' : 'text-sm px-3'
          }`}
          aria-label="Kembali ke Halaman Riwayat Transaksi"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Riwayat</span>
        </button>

        <h1 className={`font-bold text-gray-900 ${isEasyMode ? 'text-2xl' : 'text-xl'}`}>
          Detail Transaksi
        </h1>

        <div className="w-16" />
      </div>

      {/* ============================================================ */}
      {/* KARTU BUKTI STRUK TRANSAKSI (PRINTABLE RECEIPT) */}
      {/* ============================================================ */}
      <article
        className="printable-receipt bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col"
        aria-label={`Bukti transaksi ${txn.title} sebesar ${formatRupiah(txn.amount)}`}
      >
        {/* Banner Status Struk */}
        <div className="bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 border-b border-gray-200 p-6 flex flex-col items-center text-center">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 shadow-inner ${
              isIncome ? 'bg-green-100 text-secondary-dark' : 'bg-red-100 text-primary-dark'
            }`}
            aria-hidden="true"
          >
            {isIncome ? <ArrowDownLeft size={30} /> : <ArrowUpRight size={30} />}
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-secondary-dark bg-green-50 border border-green-200 px-3 py-1 rounded-full mb-1.5">
            <CheckCircle2 size={14} aria-hidden="true" />
            <span>TRANSAKSI BERHASIL</span>
          </div>

          <p className="text-xs text-gray-500 font-medium">{txn.title}</p>
          <p
            className={`font-black tracking-tight mt-1 ${
              isIncome ? 'text-secondary-dark' : 'text-primary'
            } ${isEasyMode ? 'text-4xl' : 'text-3xl'}`}
          >
            {isIncome ? '+' : '-'} {formatRupiah(txn.amount)}
          </p>
          <p className="text-xs text-gray-500 font-medium mt-1">
            {formatTanggal(txn.createdAt)}
          </p>
        </div>

        {/* Rincian Spesifik Sesuai Jenis Transaksi */}
        <div className="p-6 flex flex-col gap-4 text-sm divide-y divide-gray-100">
          {/* Bagian 1: Data Identitas Transaksi */}
          <div className="flex flex-col gap-2.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 font-medium">Nomor Transaksi:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-gray-900">{txn.id}</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1 rounded text-gray-400 hover:text-primary transition-default no-print"
                  aria-label={copied ? 'Nomor transaksi tersalin' : 'Salin nomor transaksi'}
                  title="Salin nomor transaksi"
                >
                  {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 font-medium">Metode / Sumber Dana:</span>
              <span className="font-semibold text-gray-800">{txn.paymentMethod}</span>
            </div>
          </div>

          {/* Bagian 2: Rincian Khusus Per Jenis Transaksi */}
          <div className="flex flex-col gap-2.5 pt-4 text-xs">
            {/* SPESIFIK: TOP UP */}
            {txn.type === 'top_up' && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">Nominal Top Up:</span>
                  <span className="font-bold text-gray-900">{formatRupiah(txn.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Metode Pembayaran:</span>
                  <span className="font-semibold text-gray-800">{txn.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Biaya Admin:</span>
                  <span className="font-semibold text-secondary-dark">Rp 0 (Gratis)</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-2 font-semibold">
                  <span className="text-gray-700">Total Pembayaran:</span>
                  <span className="font-extrabold text-gray-900">{formatRupiah(txn.amount)}</span>
                </div>
                {typeof meta.previousBalance === 'number' && (
                  <div className="flex justify-between text-[11px] text-gray-500 pt-1">
                    <span>Saldo Sebelum Transaksi:</span>
                    <span>{formatRupiah(meta.previousBalance)}</span>
                  </div>
                )}
                {typeof meta.newBalance === 'number' && (
                  <div className="flex justify-between text-[11px] text-secondary-dark font-semibold">
                    <span>Saldo Setelah Transaksi:</span>
                    <span>{formatRupiah(meta.newBalance)}</span>
                  </div>
                )}
              </>
            )}

            {/* SPESIFIK: TRANSFER KELUAR */}
            {txn.type === 'transfer_out' && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">Nama Penerima:</span>
                  <span className="font-bold text-gray-900">{txn.relatedParty}</span>
                </div>
                {txn.relatedPhone && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Nomor Telepon Penerima:</span>
                    <span className="font-mono text-gray-700">{txn.relatedPhoneMasked}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Nominal Transfer:</span>
                  <span className="font-bold text-gray-900">{formatRupiah(txn.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Biaya Admin:</span>
                  <span className="font-semibold text-secondary-dark">Rp 0 (Gratis)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Catatan Transfer:</span>
                  <span className="italic text-gray-700">{txn.notes}</span>
                </div>
                {typeof meta.previousBalance === 'number' && (
                  <div className="flex justify-between text-[11px] text-gray-500 border-t border-gray-100 pt-2">
                    <span>Saldo Sebelum Transaksi:</span>
                    <span>{formatRupiah(meta.previousBalance)}</span>
                  </div>
                )}
                {typeof meta.newBalance === 'number' && (
                  <div className="flex justify-between text-[11px] text-secondary-dark font-semibold">
                    <span>Saldo Setelah Transaksi:</span>
                    <span>{formatRupiah(meta.newBalance)}</span>
                  </div>
                )}
              </>
            )}

            {/* SPESIFIK: TRANSFER MASUK */}
            {txn.type === 'transfer_in' && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">Nama Pengirim:</span>
                  <span className="font-bold text-gray-900">{txn.relatedParty}</span>
                </div>
                {txn.relatedPhone && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Nomor Telepon Pengirim:</span>
                    <span className="font-mono text-gray-700">{txn.relatedPhoneMasked}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Nominal Diterima:</span>
                  <span className="font-bold text-secondary-dark">{formatRupiah(txn.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Catatan Pengirim:</span>
                  <span className="italic text-gray-700">{txn.notes}</span>
                </div>
                {typeof meta.newBalance === 'number' && (
                  <div className="flex justify-between text-[11px] text-secondary-dark font-semibold border-t border-gray-100 pt-2">
                    <span>Saldo Setelah Transaksi:</span>
                    <span>{formatRupiah(meta.newBalance)}</span>
                  </div>
                )}
              </>
            )}

            {/* SPESIFIK: PEMBAYARAN QRIS */}
            {txn.type === 'qris_payment' && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">Nama Merchant:</span>
                  <span className="font-bold text-gray-900">{meta.merchantName || txn.relatedParty}</span>
                </div>
                {meta.merchantCategory && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Kategori Merchant:</span>
                    <span className="text-gray-800">{meta.merchantCategory}</span>
                  </div>
                )}
                {meta.merchantLocation && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Lokasi Merchant:</span>
                    <span className="text-gray-700 text-right">{meta.merchantLocation}</span>
                  </div>
                )}
                {meta.merchantCode && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Kode Merchant:</span>
                    <span className="font-mono text-gray-700">{meta.merchantCode}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-100 pt-2">
                  <span className="text-gray-500">Nominal Belanja:</span>
                  <span className="font-bold text-gray-900">{formatRupiah(txn.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Biaya Layanan:</span>
                  <span className="font-semibold text-secondary-dark">Rp 0 (Gratis)</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-gray-700">Total Potong Saldo:</span>
                  <span className="font-extrabold text-primary">{formatRupiah(txn.amount)}</span>
                </div>
                {typeof meta.previousBalance === 'number' && (
                  <div className="flex justify-between text-[11px] text-gray-500 border-t border-gray-100 pt-1">
                    <span>Saldo Sebelum:</span>
                    <span>{formatRupiah(meta.previousBalance)}</span>
                  </div>
                )}
                {typeof meta.newBalance === 'number' && (
                  <div className="flex justify-between text-[11px] text-secondary-dark font-semibold">
                    <span>Saldo Sisa:</span>
                    <span>{formatRupiah(meta.newBalance)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Bagian 3: Disclaimer Simulasi */}
          <div className="pt-4 flex flex-col gap-1.5 text-[11px] text-gray-500 text-center">
            <p className="font-bold text-gray-700">SAHABATPAY PROTOTYPE · SATU DOMPET, SEMUA BISA</p>
            <p className="leading-relaxed">
              Bukti transaksi simulasi prototype SahabatPay. Bukan merupakan bukti perbankan riil atau sertifikasi QRIS nasional Bank Indonesia.
            </p>
          </div>
        </div>

        {/* Tombol Aksi (Print & Salin) - Disembunyikan saat print */}
        <div className="bg-gray-50 p-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 no-print">
          <Button
            type="button"
            variant="outline"
            size={isEasyMode ? 'lg' : 'md'}
            icon={<Printer size={16} />}
            onClick={handlePrint}
            className="flex-1 min-w-[130px]"
          >
            Cetak Bukti
          </Button>

          <Button
            type="button"
            variant="primary"
            size={isEasyMode ? 'lg' : 'md'}
            icon={copied ? <Check size={16} /> : <Copy size={16} />}
            onClick={handleCopyId}
            className="flex-1 min-w-[130px]"
          >
            {copied ? 'Tersalin' : 'Salin ID'}
          </Button>
        </div>
      </article>

      {/* Tombol Navigasi Bawah (no-print) */}
      <div className="flex items-center justify-center no-print pt-2">
        <Button
          variant="ghost"
          size={isEasyMode ? 'lg' : 'md'}
          icon={<ArrowLeft size={16} />}
          onClick={() => navigate('/history')}
        >
          Kembali ke Riwayat Transaksi
        </Button>
      </div>
    </div>
  );
}
