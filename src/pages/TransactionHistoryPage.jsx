import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  X,
  SlidersHorizontal,
  ArrowDownLeft,
  ArrowUpRight,
  QrCode,
  TrendingDown,
  TrendingUp,
  Clock,
  ChevronRight,
  Calendar,
  RotateCcw,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { useA11y } from '../context/A11yContext';
import { useWallet } from '../context/WalletContext';
import { useAudioGuidance } from '../hooks/useAudioGuidance';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import AudioGuideBar from '../components/a11y/AudioGuideBar';
import { formatRupiah, formatTanggal, formatTanggalSingkat } from '../utils/formatCurrency';
import {
  filterAndSortTransactions,
  calculateTransactionSummary,
  groupTransactionsByDate,
} from '../utils/transactionUtils';

export default function TransactionHistoryPage() {
  const navigate = useNavigate();
  const { isEasyMode, isAudioMode } = useA11y();
  const { transactions } = useWallet();
  const { isPlaying, speakText, stopSpeech } = useAudioGuidance();

  // State Filter & Pencarian
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Filter dan Pengurutan Transaksi
  const filteredList = useMemo(() => {
    return filterAndSortTransactions(transactions, {
      search: searchTerm,
      typeFilter,
      dateFilter,
      sortOrder,
    });
  }, [transactions, searchTerm, typeFilter, dateFilter, sortOrder]);

  // Ringkasan Keuangan (Berdasarkan transaksi yang sedang terfilter)
  const summary = useMemo(() => {
    return calculateTransactionSummary(filteredList);
  }, [filteredList]);

  // Transaksi yang dikelompokkan berdasarkan tanggal
  const groupedList = useMemo(() => {
    return groupTransactionsByDate(filteredList);
  }, [filteredList]);

  // Reset Semua Filter
  const handleResetFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setDateFilter('all');
    setSortOrder('newest');
    if (isAudioMode) speakText('Filter telah direset. Menampilkan semua riwayat transaksi.');
  };

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    typeFilter !== 'all' ||
    dateFilter !== 'all' ||
    sortOrder !== 'newest';

  // Deskripsi panduan audio
  const guideText = `Halaman Riwayat Transaksi SahabatPay. Ditemukan ${filteredList.length} transaksi. Total uang masuk ${formatRupiah(
    summary.totalIn
  )}, dan total uang keluar ${formatRupiah(
    summary.totalOut
  )}. Anda dapat mencari berdasarkan nama merchant, penerima, atau nomor transaksi, memfilter jenis transaksi, serta memilih transaksi untuk melihat detail lengkapnya.`;

  return (
    <div className="flex flex-col gap-5 pb-10">
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

        <h1 className={`font-bold text-gray-900 ${isEasyMode ? 'text-2xl' : 'text-xl'}`}>
          Riwayat Transaksi
        </h1>

        <span className="text-xs text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
          {filteredList.length} data
        </span>
      </div>

      {/* ============================================================ */}
      {/* CARD RINGKASAN ARUS KAS (DIPISAH MASUK & KELUAR) */}
      {/* ============================================================ */}
      <section aria-labelledby="heading-summary">
        <h2 id="heading-summary" className="sr-only">
          Ringkasan Mutasi Transaksi
        </h2>
        <Card className="!p-5 bg-gradient-to-br from-white to-gray-50 border-gray-200 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                Ringkasan Arus Saldo
              </span>
              <span className="text-xs text-gray-600 font-medium">
                {dateFilter === 'today'
                  ? 'Hari Ini'
                  : dateFilter === '7days'
                  ? '7 Hari Terakhir'
                  : dateFilter === '30days'
                  ? '30 Hari Terakhir'
                  : 'Seluruh Riwayat'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Total Uang Masuk */}
              <div className="p-3.5 bg-green-50/70 border border-green-200 rounded-2xl flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-secondary-dark text-xs font-bold">
                  <TrendingUp size={16} aria-hidden="true" />
                  <span>Total Masuk</span>
                </div>
                <p
                  className={`font-extrabold text-secondary-dark tracking-tight ${
                    isEasyMode ? 'text-xl' : 'text-lg'
                  }`}
                  aria-live="polite"
                  aria-label={`Total uang masuk ${formatRupiah(summary.totalIn)}`}
                >
                  +{formatRupiah(summary.totalIn)}
                </p>
                <p className="text-[11px] text-gray-600 font-medium">
                  {summary.inCount} transaksi masuk
                </p>
              </div>

              {/* Total Uang Keluar */}
              <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-2xl flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-primary text-xs font-bold">
                  <TrendingDown size={16} aria-hidden="true" />
                  <span>Total Keluar</span>
                </div>
                <p
                  className={`font-extrabold text-primary tracking-tight ${
                    isEasyMode ? 'text-xl' : 'text-lg'
                  }`}
                  aria-live="polite"
                  aria-label={`Total uang keluar ${formatRupiah(summary.totalOut)}`}
                >
                  -{formatRupiah(summary.totalOut)}
                </p>
                <p className="text-[11px] text-gray-600 font-medium">
                  {summary.outCount} transaksi keluar
                </p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* ============================================================ */}
      {/* KOLOM PENCARIAN & FILTER KONTROL */}
      {/* ============================================================ */}
      <section aria-label="Alat pencarian dan penyaringan transaksi" className="flex flex-col gap-3">
        {/* Input Pencarian */}
        <div className="relative">
          <label htmlFor="search-transactions" className="sr-only">
            Cari transaksi berdasarkan nama merchant, penerima, pengirim, atau ID transaksi
          </label>
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <Search size={18} aria-hidden="true" />
          </div>
          <input
            id="search-transactions"
            type="text"
            placeholder="Cari merchant, penerima, ID transaksi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full bg-white border border-gray-300 rounded-2xl pl-11 pr-11 text-gray-900 transition-default focus:ring-2 focus:ring-primary focus:border-primary ${
              isEasyMode ? 'py-4 text-base min-h-[64px]' : 'py-3 text-sm min-h-[48px]'
            }`}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              aria-label="Hapus kata kunci pencarian"
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Tab Filter Jenis Transaksi */}
        <div
          className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar"
          role="tablist"
          aria-label="Pilih jenis transaksi"
        >
          {[
            { id: 'all', label: 'Semua' },
            { id: 'top_up', label: 'Top Up' },
            { id: 'transfer_in', label: 'Transfer Masuk' },
            { id: 'transfer_out', label: 'Transfer Keluar' },
            { id: 'qris_payment', label: 'QRIS' },
          ].map((tab) => {
            const isActive = typeFilter === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setTypeFilter(tab.id)}
                className={`shrink-0 rounded-xl font-bold transition-default border focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                  isEasyMode ? 'px-4 py-3 text-base min-h-[56px]' : 'px-3.5 py-2 text-xs'
                } ${
                  isActive
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Baris Opsi Lanjutan: Filter Waktu & Pengurutan */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Waktu */}
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <label htmlFor="filter-time" className="font-semibold text-gray-700 sr-only">
                Filter Waktu:
              </label>
              <select
                id="filter-time"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className={`bg-white border border-gray-300 rounded-xl text-gray-800 font-semibold px-3 py-2 transition-default focus:ring-2 focus:ring-primary ${
                  isEasyMode ? 'min-h-[52px] text-sm' : 'text-xs'
                }`}
                aria-label="Filter berdasarkan rentang waktu"
              >
                <option value="all">Semua Waktu</option>
                <option value="today">Hari Ini</option>
                <option value="7days">7 Hari Terakhir</option>
                <option value="30days">30 Hari Terakhir</option>
              </select>
            </div>

            {/* Pengurutan */}
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <label htmlFor="sort-order" className="font-semibold text-gray-700 sr-only">
                Urutkan:
              </label>
              <select
                id="sort-order"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className={`bg-white border border-gray-300 rounded-xl text-gray-800 font-semibold px-3 py-2 transition-default focus:ring-2 focus:ring-primary ${
                  isEasyMode ? 'min-h-[52px] text-sm' : 'text-xs'
                }`}
                aria-label="Urutkan transaksi"
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="highest">Nominal Terbesar</option>
                <option value="lowest">Nominal Terkecil</option>
              </select>
            </div>
          </div>

          {/* Tombol Reset jika filter aktif */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className={`inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline p-1.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                isEasyMode ? 'text-sm min-h-[48px]' : ''
              }`}
              aria-label="Reset semua filter pencarian"
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </section>

      {/* ============================================================ */}
      {/* DAFTAR TRANSAKSI BERKELOMPOK */}
      {/* ============================================================ */}
      <section aria-labelledby="heading-transaction-list">
        <h2 id="heading-transaction-list" className="sr-only">
          Daftar Transaksi
        </h2>

        {filteredList.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center flex flex-col items-center gap-3 mt-2 shadow-sm">
            <div
              className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center border border-gray-200"
              aria-hidden="true"
            >
              <FileText size={32} />
            </div>
            <div>
              <p className="font-bold text-gray-800 text-base">Tidak ada transaksi ditemukan</p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                {hasActiveFilters
                  ? 'Tidak ada transaksi yang cocok dengan kata kunci atau filter yang Anda pilih. Coba ubah pencarian atau reset filter.'
                  : 'Anda belum memiliki catatan transaksi. Mulai dengan melakukan Top Up saldo.'}
              </p>
            </div>
            {hasActiveFilters ? (
              <Button
                variant="outline"
                size={isEasyMode ? 'lg' : 'sm'}
                icon={<RotateCcw size={16} />}
                onClick={handleResetFilters}
                className="mt-1"
              >
                Tampilkan Semua Transaksi
              </Button>
            ) : (
              <Button
                variant="primary"
                size={isEasyMode ? 'lg' : 'sm'}
                onClick={() => navigate('/top-up')}
                className="mt-1"
              >
                Top Up Sekarang
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-5 mt-1">
            {groupedList.map((group) => (
              <div key={group.groupLabel} className="flex flex-col gap-2">
                {/* Header Grup Tanggal */}
                <div className="flex items-center gap-2 px-1">
                  <Calendar size={14} className="text-gray-400" aria-hidden="true" />
                  <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    {group.groupLabel}
                  </h3>
                  <span className="text-[11px] text-gray-400 font-medium">
                    ({group.items.length})
                  </span>
                </div>

                {/* Daftar Item dalam Grup */}
                <div className="flex flex-col gap-2" role="list">
                  {group.items.map((txn) => (
                    <TransactionHistoryCard
                      key={txn.id}
                      txn={txn}
                      isEasy={isEasyMode}
                      onClick={() => {
                        stopSpeech();
                        navigate(`/history/${txn.id}`);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ============================================================
   Komponen Kartu Transaksi Aksesibel
   ============================================================ */
function TransactionHistoryCard({ txn, isEasy, onClick }) {
  const isIncome = txn.direction === 'in';
  const isQris = txn.type === 'qris_payment';

  // Ikon & Gaya Warna
  let IconComponent = ArrowUpRight;
  let iconBg = 'bg-red-100 text-primary-dark';

  if (isQris) {
    IconComponent = QrCode;
    iconBg = 'bg-amber-100 text-amber-800';
  } else if (isIncome) {
    IconComponent = ArrowDownLeft;
    iconBg = 'bg-green-100 text-secondary-dark';
  }

  // Label aksesibilitas lengkap untuk pembaca layar
  const accessibleLabel = `${txn.title}, kepada ${txn.relatedParty || 'Pihak Terkait'}, ${
    isIncome ? 'uang masuk' : 'uang keluar'
  } ${formatRupiah(txn.amount)}, status ${txn.status === 'success' ? 'berhasil' : txn.status}. Klik untuk melihat detail.`;

  return (
    <button
      type="button"
      onClick={onClick}
      role="listitem"
      aria-label={accessibleLabel}
      className={`w-full text-left bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-default flex items-center justify-between gap-3 focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary ${
        isEasy ? 'p-4 min-h-[64px]' : 'p-3.5 min-h-[56px]'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`rounded-xl flex items-center justify-center shrink-0 ${iconBg} ${
            isEasy ? 'w-14 h-14' : 'w-11 h-11'
          }`}
          aria-hidden="true"
        >
          <IconComponent size={isEasy ? 26 : 20} />
        </div>

        <div className="min-w-0">
          <p className={`font-bold text-gray-900 truncate ${isEasy ? 'text-lg' : 'text-sm'}`}>
            {txn.title}
          </p>
          <p className={`text-gray-600 truncate font-medium ${isEasy ? 'text-base' : 'text-xs'}`}>
            {txn.relatedParty || txn.description}
          </p>
          <p className="text-[11px] text-gray-600 mt-0.5">
            {formatTanggalSingkat(txn.createdAt)} · {txn.paymentMethod || 'Dompet'}
          </p>
        </div>
      </div>

      <div className="text-right shrink-0 flex items-center gap-2">
        <div>
          <p
            className={`font-extrabold whitespace-nowrap tracking-tight ${
              isIncome ? 'text-secondary-dark' : 'text-primary'
            } ${isEasy ? 'text-lg' : 'text-sm'}`}
          >
            {isIncome ? '+' : '-'} {formatRupiah(txn.amount)}
          </p>
          <span className="inline-block text-[10px] font-bold text-secondary-dark bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-md mt-0.5">
            Berhasil
          </span>
        </div>
        <ChevronRight size={18} className="text-gray-400 shrink-0 hidden sm:block" aria-hidden="true" />
      </div>
    </button>
  );
}
