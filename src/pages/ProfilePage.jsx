import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserRound, ShieldCheck, UserCheck, Edit3, Accessibility, Lock, Info,
  LogOut, ChevronRight, Phone, Calendar, AlertCircle, CircleCheck, Settings,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useA11y } from '../context/A11yContext';
import { useAudioGuidance } from '../hooks/useAudioGuidance';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import AudioGuideBar from '../components/a11y/AudioGuideBar';
import { maskPhoneNumber } from '../utils/transactionUtils';
import { formatTanggalSingkat } from '../utils/formatCurrency';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuth();
  const { isEasyMode, isAudioMode, mode } = useA11y();
  const { isPlaying, speakText, stopSpeech, playSuccessSound, playErrorSound } = useAudioGuidance();

  const [isEditModalOpen,  setIsEditModalOpen]  = useState(false);
  const [nameInput,        setNameInput]        = useState('');
  const [editError,        setEditError]        = useState('');
  const [editSuccess,      setEditSuccess]      = useState('');
  const [isLogoutModalOpen,setIsLogoutModalOpen]= useState(false);

  const getInitials = (name) => {
    if (!name) return 'SP';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const userName = user?.name  || 'Pengguna SahabatPay';
  const userPhone = user?.phone || '0812-3456-7890';
  const isDemo   = Boolean(user?.isDemo);
  const registeredDate = user?.registeredAt || user?.createdAt;
  const modeLabel = mode === 'audio' ? 'Audio Guidance' : mode === 'easy' ? 'Easy Mode' : 'Normal Mode';

  const guideText = `Halaman Profil Akun SahabatPay. Nama pengguna ${userName}, nomor akun ${maskPhoneNumber(userPhone)}. Status ${isDemo ? 'Akun Demo Simulasi' : 'Akun Terverifikasi'}. Mode aksesibilitas aktif saat ini adalah ${modeLabel}. Anda dapat mengubah nama profil, mengatur preferensi aksesibilitas, melihat keamanan akun, atau keluar dari sesi.`;

  const handleOpenEdit = () => {
    setNameInput(userName);
    setEditError('');
    setEditSuccess('');
    setIsEditModalOpen(true);
    if (isAudioMode) speakText('Form ubah nama profil. Masukkan nama lengkap baru Anda.');
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');
    if (!nameInput.trim() || nameInput.trim().length < 3) {
      const err = 'Nama lengkap minimal harus terdiri dari 3 karakter.';
      setEditError(err);
      playErrorSound();
      if (isAudioMode) speakText(err);
      return;
    }
    const res = updateProfile({ name: nameInput.trim() });
    if (res.success) {
      playSuccessSound();
      setEditSuccess('Nama profil berhasil diperbarui!');
      if (isAudioMode) speakText(`Nama profil berhasil diubah menjadi ${nameInput.trim()}.`);
      setTimeout(() => setIsEditModalOpen(false), 1200);
    } else {
      setEditError(res.message || 'Gagal memperbarui profil.');
      playErrorSound();
    }
  };

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    stopSpeech();
    logout();
    navigate('/', { replace: true });
  };

  const menuItems = [
    {
      label: 'Preferensi Aksesibilitas',
      sub: `Mode aktif: ${modeLabel}`,
      icon: Accessibility,
      iconBg: 'bg-brand-forest/10 text-brand-forest',
      path: '/settings/accessibility',
      ariaLabel: `Pengaturan Aksesibilitas. Mode aktif saat ini: ${modeLabel}. Buka pengaturan.`,
    },
    {
      label: 'Akun & Keamanan',
      sub: 'Status PIN transaksi, sesi aktif & penyimpanan',
      icon: Lock,
      iconBg: 'bg-amber-100 text-amber-700',
      path: '/settings/account',
      ariaLabel: 'Pengaturan Akun dan Keamanan.',
    },
    {
      label: 'Tentang SahabatPay',
      sub: 'Satu Dompet, Semua Bisa · Versi v1.0.0',
      icon: Info,
      iconBg: 'bg-brand-emerald/10 text-brand-emerald',
      path: '/about',
      ariaLabel: 'Tentang SahabatPay.',
    },
  ];

  return (
    <div className="flex flex-col gap-5 pb-12">
      <AudioGuideBar instructionText={guideText} isPlaying={isPlaying} onPlay={speakText} onStop={stopSpeech} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className={`font-bold text-brand-charcoal ${isEasyMode ? 'text-2xl' : 'text-xl'}`}>Profil Saya</h1>
        <span className="sp-badge-forest">SahabatPay</span>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-brand-border shadow-card-md p-5">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          {/* Avatar */}
          <div
            className={`rounded-2xl bg-brand-forest text-white font-black flex items-center justify-center shrink-0
              ${isEasyMode ? 'w-20 h-20 text-3xl' : 'w-16 h-16 text-2xl'}`}
            aria-hidden="true"
          >
            {getInitials(userName)}
          </div>

          <div className="flex-1 min-w-0 flex flex-col items-center sm:items-start gap-1.5">
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
              <h2 className={`font-extrabold text-brand-charcoal ${isEasyMode ? 'text-2xl' : 'text-xl'}`}>{userName}</h2>
              {isDemo ? (
                <span className="sp-badge-amber"><UserCheck size={12} aria-hidden="true" />Akun Demo</span>
              ) : (
                <span className="sp-badge-green"><ShieldCheck size={12} aria-hidden="true" />Terverifikasi</span>
              )}
            </div>
            <p className="text-brand-charcoal font-mono text-sm font-semibold flex items-center gap-1.5">
              <Phone size={14} className="text-brand-muted" aria-hidden="true" />
              {maskPhoneNumber(userPhone)}
            </p>
            <p className="text-brand-muted text-xs flex items-center gap-1.5">
              <Calendar size={13} aria-hidden="true" />
              {registeredDate ? `Bergabung sejak ${formatTanggalSingkat(registeredDate)}` : 'Mitra Pengguna SahabatPay'}
            </p>
            <div className="mt-2">
              <Button variant="outline" size={isEasyMode ? 'lg' : 'sm'} icon={<Edit3 size={15} />} onClick={handleOpenEdit} aria-label="Ubah nama profil">
                Ubah Nama Profil
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Menu */}
      <section aria-labelledby="heading-settings">
        <h2 id="heading-settings" className={`font-bold text-brand-charcoal mb-3 ${isEasyMode ? 'text-xl' : 'text-base'}`}>
          Pengaturan & Informasi
        </h2>
        <div className="flex flex-col gap-2" role="list">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                type="button"
                role="listitem"
                onClick={() => { stopSpeech(); navigate(item.path); }}
                className={`w-full text-left bg-white rounded-2xl border border-brand-border hover:border-brand-muted/40 hover:shadow-card
                  transition-all duration-200 flex items-center justify-between gap-3
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest
                  ${isEasyMode ? 'p-5 min-h-[64px]' : 'p-4 min-h-[56px]'}`}
                aria-label={item.ariaLabel}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-11 h-11 rounded-xl ${item.iconBg} flex items-center justify-center shrink-0`} aria-hidden="true">
                    <Icon size={22} />
                  </div>
                  <div>
                    <p className={`font-bold text-brand-charcoal ${isEasyMode ? 'text-base' : 'text-sm'}`}>{item.label}</p>
                    <p className={`text-brand-muted ${isEasyMode ? 'text-base' : 'text-xs'}`}>{item.sub}</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-brand-muted shrink-0" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </section>

      {/* Logout button */}
      <div className="pt-1">
        <Button
          variant="outline"
          size={isEasyMode ? 'lg' : 'md'}
          fullWidth
          icon={<LogOut size={18} />}
          onClick={() => setIsLogoutModalOpen(true)}
          className="border-brand-coral/40 text-brand-coral hover:bg-brand-coral/8 hover:border-brand-coral"
        >
          Keluar dari Akun
        </Button>
      </div>

      {/* Edit Name Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Ubah Nama Profil">
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
          <p className="text-xs text-brand-muted leading-relaxed">
            Perubahan nama lengkap akan otomatis disinkronkan ke seluruh aplikasi dan riwayat transaksi Anda.
          </p>
          <div>
            <label htmlFor="edit-profile-name" className="block text-sm font-bold text-brand-charcoal mb-1.5">
              Nama Lengkap Baru:
            </label>
            <input
              id="edit-profile-name"
              type="text"
              value={nameInput}
              onChange={(e) => { setNameInput(e.target.value); setEditError(''); }}
              placeholder="Contoh: Andi Pratama"
              className={`w-full rounded-xl border border-brand-border bg-white text-brand-charcoal font-semibold px-4
                transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-forest/20 focus:border-brand-forest
                placeholder:text-brand-muted/50
                ${isEasyMode ? 'py-3.5 text-base min-h-[56px]' : 'py-2.5 text-sm'}`}
            />
          </div>
          {editError && (
            <div className="sp-alert-error flex items-start gap-2" role="alert">
              <AlertCircle size={15} className="shrink-0 mt-0.5" aria-hidden="true" /> {editError}
            </div>
          )}
          {editSuccess && (
            <div className="sp-alert-success flex items-start gap-2" role="alert">
              <CircleCheck size={15} className="shrink-0 mt-0.5" aria-hidden="true" /> {editSuccess}
            </div>
          )}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" size={isEasyMode ? 'lg' : 'md'} onClick={() => setIsEditModalOpen(false)}>Batal</Button>
            <Button type="submit" variant="primary" size={isEasyMode ? 'lg' : 'md'}>Simpan Perubahan</Button>
          </div>
        </form>
      </Modal>

      {/* Logout Modal */}
      <Modal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} title="Konfirmasi Keluar Akun">
        <div className="flex flex-col gap-4">
          <div className="sp-alert-warning flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-700" aria-hidden="true" />
            <p>Saldo dompet, mutasi transaksi, dan pengaturan akun Anda tetap tersimpan dengan aman di perangkat ini.</p>
          </div>
          <p className="text-sm text-brand-charcoal leading-relaxed">
            Apakah Anda yakin ingin keluar dari sesi SahabatPay? Anda dapat masuk kembali kapan saja.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" size={isEasyMode ? 'lg' : 'md'} onClick={() => setIsLogoutModalOpen(false)}>Batal</Button>
            <Button variant="danger" size={isEasyMode ? 'lg' : 'md'} onClick={handleConfirmLogout}>Ya, Keluar Akun</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
