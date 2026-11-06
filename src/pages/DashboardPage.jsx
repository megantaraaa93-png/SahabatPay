import {
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Send,
  QrCode,
  TrendingUp,
  Eye,
  EyeOff,
  ChevronRight,
  LogOut,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useA11y } from '../context/A11yContext';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { useAudioGuidance } from '../hooks/useAudioGuidance';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Logo from '../components/common/Logo';
import AudioGuideBar from '../components/a11y/AudioGuideBar';
import { formatRupiah, formatTanggalSingkat } from '../utils/formatCurrency';
import { demoInsight } from '../services/demoData';

/**
 * Dashboard utama SahabatPay.
 * Menampilkan saldo dinamis dari WalletContext, aksi cepat (terhubung ke /top-up),
 * transaksi terbaru dinamis, financial insight, dan status auth.
 */
export default function DashboardPage() {
  const navigate = useNavigate();
  const { isEasyMode, isAudioMode } = useA11y();
  const { user, logout } = useAuth();
  const { balance, transactions } = useWallet();
  const { isPlaying, speakText, stopSpeech, playSuccessSound } = useAudioGuidance();

  const [showBalance, setShowBalance] = useState(true);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Ambil jam saat ini untuk sapaan
  const hour = new Date().getHours();
  const greeting =
    hour < 11 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam';

  const userName = user?.name || 'Pengguna SahabatPay';
  const userPhone = user?.phone || '0812-3456-7890';
  const isDemo = Boolean(user?.isDemo);

  const guideText = `Beranda SahabatPay. ${greeting}, ${userName}. Saldo e-wallet Anda saat ini adalah ${formatRupiah(
    balance
  )}. Tersedia tiga menu aksi utama: Top Up, Transfer, dan pembayaran QRIS.`;

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    logout();
    playSuccessSound();
    if (isAudioMode) {
      speakText('Anda telah keluar dari akun SahabatPay.');
    }
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Audio Guide Bar */}
      <AudioGuideBar
        instructionText={guideText}
        isPlaying={isPlaying}
        onPlay={speakText}
        onStop={stopSpeech}
      />

      {/* ===== Greeting & Logout Header ===== */}
      <section aria-label="Sapaan pengguna dan akun" className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size="md" className="shrink-0 drop-shadow-xs" />
          <div>
            <p className={`text-gray-600 font-medium ${isEasyMode ? 'text-lg' : 'text-sm'}`}>{greeting} 👋</p>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className={`font-bold text-gray-800 ${isEasyMode ? 'text-2xl' : 'text-xl'}`}>
                {userName}
              </h1>
              {isDemo ? (
                <span
                  className="inline-flex items-center gap-0.5 text-xs bg-amber-100 text-amber-800 font-semibold px-2.5 py-0.5 rounded-full border border-amber-200"
                  title="Akun Demo Simulasi"
                >
                  <UserCheck size={13} aria-hidden="true" />
                  <span>Akun Demo</span>
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-0.5 text-xs bg-green-100 text-secondary-dark font-semibold px-2.5 py-0.5 rounded-full border border-green-200"
                  title="Akun Terdaftar dan Terverifikasi"
                >
                  <ShieldCheck size={13} aria-hidden="true" />
                  <span>Terverifikasi</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tombol Logout Aksesibel */}
        <button
          onClick={() => setIsLogoutModalOpen(true)}
          className={`flex items-center gap-1.5 text-gray-700 hover:text-primary transition-default rounded-xl border border-gray-300 bg-white hover:bg-red-50 focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary ${
            isEasyMode ? 'px-4 py-3 text-base min-h-[52px]' : 'px-3 py-2 text-xs min-h-[38px]'
          }`}
          aria-label="Keluar dari akun SahabatPay"
        >
          <LogOut size={16} aria-hidden="true" />
          <span className="font-semibold">Keluar</span>
        </button>
      </section>

      {/* ===== Kartu Saldo ===== */}
      <Card className="bg-gradient-to-br from-primary to-primary-dark text-white !border-0 !shadow-lg">
        <div className="flex items-center justify-between mb-1">
          <p className={`font-medium text-white/90 ${isEasyMode ? 'text-base' : 'text-sm'}`}>
            Saldo SahabatPay
          </p>
          <button
            onClick={() => setShowBalance((prev) => !prev)}
            aria-label={showBalance ? 'Sembunyikan saldo' : 'Tampilkan saldo'}
            className="text-white hover:text-white/80 transition-default p-1 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
        <p
          className={`font-extrabold tracking-tight ${isEasyMode ? 'text-3xl' : 'text-2xl'}`}
          aria-live="polite"
          aria-label={showBalance ? `Saldo Anda ${formatRupiah(balance)}` : 'Saldo disembunyikan'}
        >
          {showBalance ? formatRupiah(balance) : '••••••••'}
        </p>
        <p className="text-white/90 text-xs mt-2 font-medium">Nomor akun: {userPhone}</p>
      </Card>

      {/* ===== Aksi Cepat ===== */}
      <section aria-label="Aksi cepat">
        <h2 className="sr-only">Aksi Cepat</h2>
        <div className={`grid gap-3 ${isEasyMode ? 'grid-cols-1' : 'grid-cols-3'}`}>
          <QuickAction
            icon={<Plus size={isEasyMode ? 28 : 22} />}
            label="Top Up"
            color="bg-secondary"
            isEasy={isEasyMode}
            onClick={() => {
              stopSpeech();
              navigate('/top-up');
            }}
          />
          <QuickAction
            icon={<Send size={isEasyMode ? 28 : 22} />}
            label="Transfer"
            color="bg-primary"
            isEasy={isEasyMode}
            onClick={() => {
              stopSpeech();
              navigate('/transfer');
            }}
          />
          <QuickAction
            icon={<QrCode size={isEasyMode ? 28 : 22} />}
            label="QRIS"
            color="bg-amber-500"
            isEasy={isEasyMode}
            onClick={() => {
              stopSpeech();
              navigate('/qris');
            }}
          />
        </div>
      </section>

      {/* ===== Financial Insight Mini ===== */}
      <Card
        hoverable
        onClick={() => {
          stopSpeech();
          navigate('/history');
        }}
        aria-label="Rangkuman keuangan bulan ini. Klik untuk melihat riwayat pengeluaran."
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-secondary/10 p-2.5 rounded-xl" aria-hidden="true">
              <TrendingUp size={20} className="text-secondary" />
            </div>
            <div>
              <p className={`font-semibold text-gray-800 ${isEasyMode ? 'text-lg' : 'text-sm'}`}>
                Financial Insight
              </p>
              <p className={`text-gray-600 ${isEasyMode ? 'text-base' : 'text-xs'}`}>
                Pengeluaran terbesar: {demoInsight.kategoriBesar} ({demoInsight.persentaseTransfer}%)
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-500" aria-hidden="true" />
        </div>
      </Card>

      {/* ===== Transaksi Terakhir (Dinamis dari WalletContext) ===== */}
      <section aria-labelledby="recent-txn-heading">
        <div className="flex items-center justify-between mb-3">
          <h2
            id="recent-txn-heading"
            className={`font-semibold text-gray-800 ${isEasyMode ? 'text-xl' : 'text-base'}`}
          >
            Transaksi Terakhir
          </h2>
          <button
            onClick={() => {
              stopSpeech();
              navigate('/history');
            }}
            className={`font-semibold text-primary hover:underline transition-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary rounded-lg p-1 ${
              isEasyMode ? 'text-base min-h-[48px]' : 'text-xs'
            }`}
            aria-label="Lihat seluruh riwayat transaksi SahabatPay"
          >
            Lihat Semua ({transactions.length})
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500">
            <p className="font-semibold text-gray-700">Belum ada transaksi</p>
            <p className="text-xs mt-1 text-gray-500">
              Lakukan Top Up pertama Anda untuk mulai menggunakan saldo SahabatPay.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => navigate('/top-up')}
            >
              Top Up Sekarang
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2" role="list" aria-label="Daftar riwayat transaksi">
            {transactions.slice(0, isEasyMode ? 3 : 5).map((txn) => (
              <TransactionItem
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
        )}
      </section>

      {/* Modal Konfirmasi Logout */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Konfirmasi Keluar Akun"
      >
        <div className="flex flex-col gap-4">
          <p className="text-gray-700 leading-relaxed">
            Apakah Anda yakin ingin keluar dari sesi SahabatPay? Seluruh data akun Anda tetap aman dan dapat diakses kembali saat Anda masuk.
          </p>
          <div className="flex items-center justify-end gap-3 mt-2">
            <Button
              variant="ghost"
              size={isEasyMode ? 'lg' : 'md'}
              onClick={() => setIsLogoutModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size={isEasyMode ? 'lg' : 'md'}
              onClick={handleConfirmLogout}
            >
              Ya, Keluar Akun
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================
   Sub-komponen internal
   ============================ */

/** Tombol aksi cepat (Top Up, Transfer, QRIS) */
function QuickAction({ icon, label, color, isEasy, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-default focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary ${
        isEasy ? 'p-5 justify-start min-h-[64px]' : 'p-4 flex-col justify-center'
      }`}
      aria-label={label}
    >
      <div
        className={`${color} rounded-xl flex items-center justify-center text-white ${
          isEasy ? 'w-14 h-14' : 'w-11 h-11'
        }`}
        aria-hidden="true"
      >
        {icon}
      </div>
      <span className={`font-semibold text-gray-800 ${isEasy ? 'text-lg' : 'text-sm'}`}>
        {label}
      </span>
    </button>
  );
}

/** Item transaksi tunggal */
function TransactionItem({ txn, isEasy, onClick }) {
  const isMasuk = txn.type === 'top_up' || txn.type === 'masuk';
  const isQris = txn.type === 'qris_payment';
  const TxnIcon = isQris ? QrCode : isMasuk ? ArrowDownLeft : ArrowUpRight;
  const iconColorStyle = isQris
    ? 'bg-amber-100 text-amber-700'
    : isMasuk
    ? 'bg-green-100 text-secondary-dark'
    : 'bg-red-100 text-primary-dark';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-default focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary ${
        isEasy ? 'p-4 min-h-[64px]' : 'p-3'
      }`}
      role="listitem"
      aria-label={`${txn.description || txn.title}, ${isMasuk ? 'masuk' : 'keluar'} ${formatRupiah(txn.amount)}. Klik untuk detail.`}
    >
      <div
        className={`rounded-xl flex items-center justify-center shrink-0 ${iconColorStyle} ${
          isEasy ? 'w-12 h-12' : 'w-10 h-10'
        }`}
        aria-hidden="true"
      >
        <TxnIcon size={isEasy ? 22 : 18} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-gray-800 truncate ${isEasy ? 'text-base' : 'text-sm'}`}>
          {txn.title || txn.description}
        </p>
        <p className={`text-gray-600 font-medium ${isEasy ? 'text-sm' : 'text-xs'}`}>
          {formatTanggalSingkat(txn.createdAt || txn.date)} · {txn.paymentMethod || txn.category || 'Dompet'}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p
          className={`font-bold whitespace-nowrap ${
            isMasuk ? 'text-secondary-dark' : 'text-primary'
          } ${isEasy ? 'text-base' : 'text-sm'}`}
        >
          {isMasuk ? '+' : '-'} {formatRupiah(txn.amount)}
        </p>
        <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">Detail →</span>
      </div>
    </button>
  );
}
