import {
  ArrowUpRight,
  ArrowDownLeft,
  CirclePlus,
  ArrowLeftRight,
  QrCode,
  TrendingUp,
  Eye,
  EyeOff,
  ChevronRight,
  LogOut,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  AlertCircle,
  CircleCheck,
  GraduationCap,
  Wallet,
} from 'lucide-react';
import { useState, useEffect } from 'react';
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

export default function DashboardPage() {
  const navigate = useNavigate();
  const { isEasyMode, isAudioMode } = useA11y();
  const { user, logout } = useAuth();
  const { balance, transactions } = useWallet();
  const { isPlaying, speakText, stopSpeech, playSuccessSound } = useAudioGuidance();

  const [showBalance, setShowBalance]         = useState(true);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  useEffect(() => {
    const handleVisibility = (e) => {
      if (typeof e.detail?.visible === 'boolean') setShowBalance(e.detail.visible);
    };
    window.addEventListener('sahabatpay:balance-visibility', handleVisibility);
    return () => window.removeEventListener('sahabatpay:balance-visibility', handleVisibility);
  }, []);

  const hour = new Date().getHours();
  const greeting =
    hour < 11 ? 'Selamat Pagi'
    : hour < 15 ? 'Selamat Siang'
    : hour < 18 ? 'Selamat Sore'
    : 'Selamat Malam';

  const userName = user?.name  || 'Pengguna SahabatPay';
  const userPhone= user?.phone || '0812-3456-7890';
  const isDemo   = Boolean(user?.isDemo);

  // Balance health system
  const THRESHOLDS = { CRITICAL: 50000, WARNING: 200000, TARGET: 500000 };
  const balanceStatus =
    balance < THRESHOLDS.CRITICAL
      ? { label: 'Saldo Kritis', barColor: 'bg-brand-coral', badgeClass: 'text-white bg-brand-coral/80 border-brand-coral/40', Icon: AlertCircle }
      : balance < THRESHOLDS.WARNING
      ? { label: 'Mendekati Minimum', barColor: 'bg-amber-400', badgeClass: 'text-white bg-amber-500/80 border-amber-300/40', Icon: AlertTriangle }
      : { label: 'Saldo Aman', barColor: 'bg-brand-emerald', badgeClass: 'text-white bg-brand-emerald/80 border-brand-emerald/40', Icon: CircleCheck };

  const balancePercent = Math.min(100, Math.max(8, Math.round((balance / THRESHOLDS.TARGET) * 100)));
  const BalanceStatusIcon = balanceStatus.Icon;

  const guideText = `Beranda SahabatPay. ${greeting}, ${userName}. Saldo e-wallet Anda saat ini adalah ${formatRupiah(balance)}. Tersedia tiga menu aksi utama: Top Up, Transfer, dan pembayaran QRIS.`;

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    logout();
    playSuccessSound();
    if (isAudioMode) speakText('Anda telah keluar dari akun SahabatPay.');
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Audio Guide */}
      <AudioGuideBar instructionText={guideText} isPlaying={isPlaying} onPlay={speakText} onStop={stopSpeech} />

      {/* ===== Greeting + Logout ===== */}
      <section aria-label="Sapaan pengguna" className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size="md" className="shrink-0" />
          <div>
            <p className={`text-brand-muted font-medium ${isEasyMode ? 'text-base' : 'text-xs'}`}>
              {greeting} 👋
            </p>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <h1 className={`font-bold text-brand-charcoal ${isEasyMode ? 'text-2xl' : 'text-lg'}`}>
                {userName}
              </h1>
              {isDemo ? (
                <span className="sp-badge-amber">
                  <UserCheck size={12} aria-hidden="true" />
                  Akun Demo
                </span>
              ) : (
                <span className="sp-badge-green">
                  <ShieldCheck size={12} aria-hidden="true" />
                  Terverifikasi
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsLogoutModalOpen(true)}
          className={`flex items-center gap-1.5 text-brand-muted hover:text-brand-coral
            transition-all duration-200 rounded-xl border border-brand-border bg-white
            hover:border-brand-coral/30 hover:bg-brand-coral/5
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest
            ${isEasyMode ? 'px-4 py-3 text-base min-h-[52px]' : 'px-3 py-2 text-xs min-h-[36px]'}`}
          aria-label="Keluar dari akun SahabatPay"
        >
          <LogOut size={15} aria-hidden="true" />
          <span className="font-semibold">Keluar</span>
        </button>
      </section>

      {/* ===== Balance Card ===== */}
      <div className="balance-card rounded-2xl p-5 shadow-balance text-white animate-fade-in">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-white/70" aria-hidden="true" />
            <p className={`font-medium text-white/80 ${isEasyMode ? 'text-base' : 'text-sm'}`}>
              Saldo SahabatPay
            </p>
          </div>
          <button
            onClick={() => setShowBalance((p) => !p)}
            aria-label={showBalance ? 'Sembunyikan saldo' : 'Tampilkan saldo'}
            className="text-white/70 hover:text-white p-1.5 rounded-lg transition-all duration-200 focus-visible:outline-none focus-ring-white"
          >
            {showBalance ? <Eye size={17} /> : <EyeOff size={17} />}
          </button>
        </div>

        <p
          className={`font-extrabold tracking-tight tabular-nums mt-1 ${isEasyMode ? 'text-4xl' : 'text-3xl'}`}
          aria-live="polite"
          aria-label={showBalance ? `Saldo Anda ${formatRupiah(balance)}` : 'Saldo disembunyikan'}
        >
          {showBalance ? formatRupiah(balance) : '••••••••'}
        </p>

        {/* Balance health bar */}
        <div className="mt-4 pt-3.5 border-t border-white/15">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${balanceStatus.badgeClass}`}>
              <BalanceStatusIcon size={11} aria-hidden="true" />
              {balanceStatus.label}
            </span>
            <span className="text-[11px] text-white/70 font-medium">{balancePercent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden" aria-hidden="true">
            <div
              className={`h-full rounded-full transition-all duration-500 ${balanceStatus.barColor}`}
              style={{ width: `${balancePercent}%` }}
            />
          </div>
          <p className="text-white/60 text-xs mt-2 font-medium">Nomor akun: {userPhone}</p>
        </div>
      </div>

      {/* ===== Quick Actions (Normal/Audio) ===== */}
      {!isEasyMode && (
        <section aria-label="Aksi cepat">
          <h2 className="sr-only">Aksi Cepat</h2>
          <div className="grid grid-cols-3 gap-3">
            <QuickAction
              icon={<CirclePlus size={22} />}
              label="Top Up"
              iconBg="bg-brand-emerald"
              onClick={() => { stopSpeech(); navigate('/top-up'); }}
            />
            <QuickAction
              icon={<ArrowLeftRight size={22} />}
              label="Transfer"
              iconBg="bg-brand-forest"
              onClick={() => { stopSpeech(); navigate('/transfer'); }}
            />
            <QuickAction
              icon={<QrCode size={22} />}
              label="QRIS"
              iconBg="bg-amber-500"
              onClick={() => { stopSpeech(); navigate('/qris'); }}
            />
          </div>
        </section>
      )}

      {/* ===== Sandbox card ===== */}
      <Card
        hoverable
        padded={false}
        onClick={() => { stopSpeech(); navigate('/sandbox'); }}
        className="bg-amber-50/60 border-amber-200"
        aria-label="Buka Mode Latihan Sandbox"
      >
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/15 p-2.5 rounded-xl text-amber-700" aria-hidden="true">
              <GraduationCap size={20} />
            </div>
            <div>
              <p className={`font-bold text-brand-charcoal ${isEasyMode ? 'text-lg' : 'text-sm'}`}>
                Mode Latihan (Sandbox)
              </p>
              <p className={`text-brand-muted ${isEasyMode ? 'text-base' : 'text-xs'}`}>
                Latihan Top Up, Transfer, QRIS & PIN dengan saldo terpisah
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-amber-600 shrink-0" aria-hidden="true" />
        </div>
      </Card>

      {/* ===== Financial Insight ===== */}
      <Card
        hoverable
        padded={false}
        onClick={() => { stopSpeech(); navigate('/history'); }}
        aria-label="Rangkuman keuangan bulan ini. Klik untuk melihat riwayat."
      >
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-brand-emerald/10 p-2.5 rounded-xl" aria-hidden="true">
              <TrendingUp size={20} className="text-brand-emerald" />
            </div>
            <div>
              <p className={`font-semibold text-brand-charcoal ${isEasyMode ? 'text-lg' : 'text-sm'}`}>
                Financial Insight
              </p>
              <p className={`text-brand-muted ${isEasyMode ? 'text-base' : 'text-xs'}`}>
                Pengeluaran terbesar: {demoInsight.kategoriBesar} ({demoInsight.persentaseTransfer}%)
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-brand-muted shrink-0" aria-hidden="true" />
        </div>
      </Card>

      {/* ===== Recent Transactions ===== */}
      <section aria-labelledby="recent-txn-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="recent-txn-heading" className={`font-bold text-brand-charcoal ${isEasyMode ? 'text-xl' : 'text-base'}`}>
            Transaksi Terakhir
          </h2>
          <button
            onClick={() => { stopSpeech(); navigate('/history'); }}
            className={`font-semibold text-brand-forest hover:underline transition-all duration-200 rounded-lg p-1
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest
              ${isEasyMode ? 'text-base min-h-[48px]' : 'text-xs'}`}
            aria-label="Lihat seluruh riwayat transaksi"
          >
            Lihat Semua ({transactions.length})
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-brand-border p-8 text-center">
            <Wallet size={32} className="mx-auto text-brand-muted mb-3" aria-hidden="true" />
            <p className="font-semibold text-brand-charcoal">Belum ada transaksi</p>
            <p className="text-xs mt-1 text-brand-muted">
              Lakukan Top Up pertama Anda untuk mulai menggunakan saldo SahabatPay.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/top-up')}>
              Top Up Sekarang
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2" role="list" aria-label="Riwayat transaksi terbaru">
            {transactions.slice(0, isEasyMode ? 3 : 5).map((txn) => (
              <TransactionItem
                key={txn.id}
                txn={txn}
                isEasy={isEasyMode}
                onClick={() => { stopSpeech(); navigate(`/history/${txn.id}`); }}
              />
            ))}
          </div>
        )}
      </section>

      {/* ===== Easy Mode: Thumb-zone actions ===== */}
      {isEasyMode && (
        <section
          aria-label="Aksi utama mudah dijangkau jempol"
          className="sticky bottom-16 z-20 bg-white/95 backdrop-blur-sm border-2 border-brand-forest/20 rounded-3xl p-3 shadow-card-lg flex flex-col gap-2.5"
        >
          <p className="text-xs font-bold text-brand-muted uppercase tracking-wider px-1">
            Aksi Utama
          </p>
          <div className="grid grid-cols-1 gap-2.5">
            <QuickActionEasy
              icon={<QrCode size={28} />}
              label="Scan QRIS"
              iconBg="bg-amber-500"
              onClick={() => { stopSpeech(); navigate('/qris'); }}
            />
            <div className="grid grid-cols-2 gap-2.5">
              <QuickActionEasy
                icon={<ArrowLeftRight size={24} />}
                label="Transfer"
                iconBg="bg-brand-forest"
                onClick={() => { stopSpeech(); navigate('/transfer'); }}
              />
              <QuickActionEasy
                icon={<CirclePlus size={24} />}
                label="Top Up"
                iconBg="bg-brand-emerald"
                onClick={() => { stopSpeech(); navigate('/top-up'); }}
              />
            </div>
          </div>
        </section>
      )}

      {/* Logout Modal */}
      <Modal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} title="Konfirmasi Keluar Akun">
        <div className="flex flex-col gap-4">
          <p className="text-brand-charcoal leading-relaxed">
            Apakah Anda yakin ingin keluar dari sesi SahabatPay? Seluruh data akun Anda tetap aman dan dapat diakses kembali saat Anda masuk.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" size={isEasyMode ? 'lg' : 'md'} onClick={() => setIsLogoutModalOpen(false)}>
              Batal
            </Button>
            <Button variant="danger" size={isEasyMode ? 'lg' : 'md'} onClick={handleConfirmLogout}>
              Ya, Keluar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ======== Sub-components ======== */

function QuickAction({ icon, label, iconBg, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-3 bg-white rounded-2xl border border-brand-border shadow-card p-4
        hover:shadow-card-md hover:border-brand-muted/30
        transition-all duration-200 active:scale-[0.97]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest"
      aria-label={label}
    >
      <div className={`${iconBg} w-11 h-11 rounded-xl flex items-center justify-center text-white`} aria-hidden="true">
        {icon}
      </div>
      <span className="font-semibold text-brand-charcoal text-sm">{label}</span>
    </button>
  );
}

function QuickActionEasy({ icon, label, iconBg, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 bg-white rounded-2xl border border-brand-border shadow-card p-4 min-h-[64px]
        hover:shadow-card-md hover:border-brand-muted/30
        transition-all duration-200 active:scale-[0.98]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest"
      aria-label={label}
    >
      <div className={`${iconBg} w-14 h-14 rounded-xl flex items-center justify-center text-white shrink-0`} aria-hidden="true">
        {icon}
      </div>
      <span className="font-semibold text-brand-charcoal text-lg">{label}</span>
    </button>
  );
}

function TransactionItem({ txn, isEasy, onClick }) {
  const isMasuk = txn.type === 'top_up' || txn.type === 'masuk';
  const isQris  = txn.type === 'qris_payment';

  const TxnIcon = isQris ? QrCode : isMasuk ? ArrowDownLeft : ArrowUpRight;
  const iconStyle = isQris
    ? 'bg-amber-100 text-amber-700'
    : isMasuk
    ? 'bg-brand-emerald/10 text-brand-emerald'
    : 'bg-brand-coral/10 text-brand-coral';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 bg-white rounded-xl border border-brand-border
        hover:border-brand-muted/40 hover:shadow-card
        transition-all duration-200 active:scale-[0.995]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest
        ${isEasy ? 'p-4 min-h-[64px]' : 'p-3'}`}
      role="listitem"
      aria-label={`${txn.description || txn.title}, ${isMasuk ? 'masuk' : 'keluar'} ${formatRupiah(txn.amount)}. Klik untuk detail.`}
    >
      <div
        className={`rounded-xl flex items-center justify-center shrink-0 ${iconStyle} ${isEasy ? 'w-12 h-12' : 'w-10 h-10'}`}
        aria-hidden="true"
      >
        <TxnIcon size={isEasy ? 22 : 18} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-brand-charcoal truncate ${isEasy ? 'text-base' : 'text-sm'}`}>
          {txn.title || txn.description}
        </p>
        <p className={`text-brand-muted ${isEasy ? 'text-sm' : 'text-xs'}`}>
          {formatTanggalSingkat(txn.createdAt || txn.date)} · {txn.paymentMethod || txn.category || 'Dompet'}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className={`font-bold tabular-nums ${isMasuk ? 'text-brand-emerald' : 'text-brand-coral'} ${isEasy ? 'text-base' : 'text-sm'}`}>
          {isMasuk ? '+' : '−'} {formatRupiah(txn.amount)}
        </p>
        <span className="text-[10px] text-brand-muted hidden sm:inline">Detail →</span>
      </div>
    </button>
  );
}
