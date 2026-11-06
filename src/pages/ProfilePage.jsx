import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  ShieldCheck,
  UserCheck,
  Edit3,
  Accessibility,
  Lock,
  Info,
  LogOut,
  ChevronRight,
  Phone,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useA11y } from '../context/A11yContext';
import { useAudioGuidance } from '../hooks/useAudioGuidance';
import Card from '../components/common/Card';
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

  // State Modal Ubah Profil
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // State Modal Logout
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Inisial Avatar (misal: "Andi Pratama" -> "AP")
  const getInitials = (name) => {
    if (!name) return 'SP';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const userName = user?.name || 'Pengguna SahabatPay';
  const userPhone = user?.phone || '0812-3456-7890';
  const isDemo = Boolean(user?.isDemo);
  const registeredDate = user?.registeredAt || user?.createdAt;

  // Label mode aksesibilitas saat ini
  const modeLabel =
    mode === 'audio' ? 'Audio Guidance' : mode === 'easy' ? 'Easy Mode' : 'Normal Mode';

  const guideText = `Halaman Profil Akun SahabatPay. Nama pengguna ${userName}, nomor akun ${maskPhoneNumber(
    userPhone
  )}. Status ${
    isDemo ? 'Akun Demo Simulasi' : 'Akun Terverifikasi'
  }. Mode aksesibilitas aktif saat ini adalah ${modeLabel}. Anda dapat mengubah nama profil, mengatur preferensi aksesibilitas, melihat keamanan akun, atau keluar dari sesi.`;

  // Buka Modal Edit Nama
  const handleOpenEdit = () => {
    setNameInput(userName);
    setEditError('');
    setEditSuccess('');
    setIsEditModalOpen(true);
    if (isAudioMode) speakText('Form ubah nama profil. Masukkan nama lengkap baru Anda.');
  };

  // Simpan Pembaruan Profil
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
      setTimeout(() => {
        setIsEditModalOpen(false);
      }, 1200);
    } else {
      setEditError(res.message || 'Gagal memperbarui profil.');
      playErrorSound();
    }
  };

  // Konfirmasi Logout
  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    stopSpeech();
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="flex flex-col gap-5 pb-12">
      {/* Audio Guide Bar */}
      <AudioGuideBar
        instructionText={guideText}
        isPlaying={isPlaying}
        onPlay={speakText}
        onStop={stopSpeech}
      />

      {/* Header Halaman */}
      <div className="flex items-center justify-between">
        <h1 className={`font-bold text-gray-900 ${isEasyMode ? 'text-2xl' : 'text-xl'}`}>
          Profil Saya
        </h1>
        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
          SahabatPay
        </span>
      </div>

      {/* ============================================================ */}
      {/* KARTU PROFIL UTAMA */}
      {/* ============================================================ */}
      <Card className="!p-5 bg-gradient-to-br from-white to-gray-50 border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          {/* Avatar Inisial */}
          <div
            className={`rounded-2xl bg-gradient-to-tr from-primary to-primary-light text-white font-black flex items-center justify-center shrink-0 shadow-md ${
              isEasyMode ? 'w-20 h-20 text-3xl' : 'w-16 h-16 text-2xl'
            }`}
            aria-hidden="true"
          >
            {getInitials(userName)}
          </div>

          {/* Rincian Identitas Pengguna */}
          <div className="flex-1 min-w-0 flex flex-col items-center sm:items-start gap-1">
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
              <h2 className={`font-extrabold text-gray-900 truncate ${isEasyMode ? 'text-2xl' : 'text-xl'}`}>
                {userName}
              </h2>
              {isDemo ? (
                <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                  <UserCheck size={13} aria-hidden="true" />
                  <span>Akun Demo</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-secondary-dark font-bold px-2.5 py-0.5 rounded-full border border-green-200">
                  <ShieldCheck size={13} aria-hidden="true" />
                  <span>Terverifikasi</span>
                </span>
              )}
            </div>

            <p className="text-gray-600 font-mono text-sm font-semibold flex items-center gap-1.5 mt-0.5">
              <Phone size={14} className="text-gray-400" aria-hidden="true" />
              <span>{maskPhoneNumber(userPhone)}</span>
            </p>

            <p className="text-gray-500 text-xs font-medium flex items-center gap-1.5 mt-0.5">
              <Calendar size={13} className="text-gray-400" aria-hidden="true" />
              <span>
                {registeredDate
                  ? `Bergabung sejak ${formatTanggalSingkat(registeredDate)}`
                  : 'Mitra Pengguna SahabatPay'}
              </span>
            </p>

            {/* Tombol Ubah Profil */}
            <div className="mt-2">
              <Button
                variant="outline"
                size={isEasyMode ? 'lg' : 'sm'}
                icon={<Edit3 size={15} />}
                onClick={handleOpenEdit}
                aria-label="Ubah nama profil lengkap Anda"
              >
                Ubah Nama Profil
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* ============================================================ */}
      {/* MENU NAVIGASI SUBMENU */}
      {/* ============================================================ */}
      <section aria-labelledby="heading-settings-menu">
        <h2 id="heading-settings-menu" className={`font-bold text-gray-900 mb-2.5 ${isEasyMode ? 'text-xl' : 'text-base'}`}>
          Pengaturan & Informasi
        </h2>

        <div className="flex flex-col gap-2.5" role="list">
          {/* 1. Pengaturan Aksesibilitas */}
          <button
            type="button"
            role="listitem"
            onClick={() => {
              stopSpeech();
              navigate('/settings/accessibility');
            }}
            className={`w-full text-left bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-default flex items-center justify-between gap-3 focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary ${
              isEasyMode ? 'p-5 min-h-[64px]' : 'p-4 min-h-[56px]'
            }`}
            aria-label={`Pengaturan Aksesibilitas. Mode aktif saat ini: ${modeLabel}. Buka pengaturan.`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className="w-12 h-12 rounded-xl bg-red-50 text-primary flex items-center justify-center shrink-0 border border-red-100"
                aria-hidden="true"
              >
                <Accessibility size={24} />
              </div>
              <div>
                <p className={`font-bold text-gray-900 ${isEasyMode ? 'text-lg' : 'text-sm'}`}>
                  Preferensi Aksesibilitas
                </p>
                <p className={`text-gray-500 font-medium ${isEasyMode ? 'text-base' : 'text-xs'}`}>
                  Mode aktif: <strong className="text-primary font-bold">{modeLabel}</strong>
                </p>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400 shrink-0" aria-hidden="true" />
          </button>

          {/* 2. Pengaturan Akun & Keamanan */}
          <button
            type="button"
            role="listitem"
            onClick={() => {
              stopSpeech();
              navigate('/settings/account');
            }}
            className={`w-full text-left bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-default flex items-center justify-between gap-3 focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary ${
              isEasyMode ? 'p-5 min-h-[64px]' : 'p-4 min-h-[56px]'
            }`}
            aria-label="Pengaturan Akun dan Keamanan. Periksa status otorisasi PIN dan penyimpanan lokal."
          >
            <div className="flex items-center gap-3.5">
              <div
                className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200"
                aria-hidden="true"
              >
                <Lock size={22} />
              </div>
              <div>
                <p className={`font-bold text-gray-900 ${isEasyMode ? 'text-lg' : 'text-sm'}`}>
                  Akun & Keamanan
                </p>
                <p className={`text-gray-500 font-medium ${isEasyMode ? 'text-base' : 'text-xs'}`}>
                  Status PIN transaksi, sesi aktif & penyimpanan
                </p>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400 shrink-0" aria-hidden="true" />
          </button>

          {/* 3. Tentang SahabatPay */}
          <button
            type="button"
            role="listitem"
            onClick={() => {
              stopSpeech();
              navigate('/about');
            }}
            className={`w-full text-left bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-default flex items-center justify-between gap-3 focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary ${
              isEasyMode ? 'p-5 min-h-[64px]' : 'p-4 min-h-[56px]'
            }`}
            aria-label="Tentang SahabatPay. Informasi versi, misi inklusif, dan penafian prototipe."
          >
            <div className="flex items-center gap-3.5">
              <div
                className="w-12 h-12 rounded-xl bg-green-50 text-secondary-dark flex items-center justify-center shrink-0 border border-green-200"
                aria-hidden="true"
              >
                <Info size={22} />
              </div>
              <div>
                <p className={`font-bold text-gray-900 ${isEasyMode ? 'text-lg' : 'text-sm'}`}>
                  Tentang SahabatPay
                </p>
                <p className={`text-gray-500 font-medium ${isEasyMode ? 'text-base' : 'text-xs'}`}>
                  Satu Dompet, Semua Bisa · Versi v1.0.0
                </p>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400 shrink-0" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* ============================================================ */}
      {/* TOMBOL LOGOUT */}
      {/* ============================================================ */}
      <div className="pt-2">
        <Button
          variant="outline"
          size={isEasyMode ? 'lg' : 'md'}
          fullWidth
          icon={<LogOut size={18} />}
          onClick={() => setIsLogoutModalOpen(true)}
          className="border-red-300 text-primary hover:bg-red-50 hover:border-red-400"
        >
          Keluar dari Akun
        </Button>
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: UBAH PROFIL (EDIT NAMA) */}
      {/* ============================================================ */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Ubah Nama Profil"
        showDefaultFooter={false}
      >
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-4 text-left">
          <p className="text-xs text-gray-600 leading-relaxed">
            Perubahan nama lengkap akan otomatis disinkronkan ke seluruh aplikasi dan riwayat transaksi Anda. Nomor akun tetap tidak berubah.
          </p>

          <div>
            <label htmlFor="edit-profile-name" className="block text-xs font-bold text-gray-800 mb-1.5">
              Nama Lengkap Baru:
            </label>
            <input
              id="edit-profile-name"
              type="text"
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                setEditError('');
              }}
              placeholder="Contoh: Andi Pratama"
              className={`w-full rounded-2xl border bg-white text-gray-900 font-semibold px-4 transition-default focus:ring-2 focus:ring-primary focus:border-primary border-gray-300 ${
                isEasyMode ? 'py-3.5 text-lg min-h-[56px]' : 'py-2.5 text-sm'
              }`}
            />
          </div>

          {editError && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-red-900 text-xs flex items-start gap-2" role="alert">
              <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" aria-hidden="true" />
              <p className="flex-1 font-medium">{editError}</p>
            </div>
          )}

          {editSuccess && (
            <div className="p-3 bg-green-50 border border-green-300 rounded-xl text-green-900 text-xs flex items-start gap-2" role="alert">
              <CheckCircle2 size={16} className="shrink-0 text-secondary-dark mt-0.5" aria-hidden="true" />
              <p className="flex-1 font-bold">{editSuccess}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              size={isEasyMode ? 'lg' : 'md'}
              onClick={() => setIsEditModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size={isEasyMode ? 'lg' : 'md'}
            >
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 2: KONFIRMASI LOGOUT */}
      {/* ============================================================ */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Konfirmasi Keluar Akun"
        showDefaultFooter={false}
      >
        <div className="flex flex-col gap-4 text-gray-800 text-left">
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 text-amber-700 mt-0.5" aria-hidden="true" />
            <p className="font-medium leading-relaxed">
              Saldo dompet, mutasi transaksi, dan pengaturan akun Anda tetap tersimpan dengan aman di perangkat ini.
            </p>
          </div>

          <p className="text-sm text-gray-700 leading-relaxed">
            Apakah Anda yakin ingin keluar dari sesi SahabatPay? Anda dapat masuk kembali kapan saja menggunakan nomor handphone atau akun demo.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
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
              className="bg-primary hover:bg-primary-dark"
            >
              Ya, Keluar Akun
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
