import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  ShieldCheck,
  UserCheck,
  Lock,
  Database,
  AlertTriangle,
  Key,
  Info,
  Smartphone,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useA11y } from '../context/A11yContext';
import { useAudioGuidance } from '../hooks/useAudioGuidance';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import AudioGuideBar from '../components/a11y/AudioGuideBar';
import { maskPhoneNumber } from '../utils/transactionUtils';

export default function AccountSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isEasyMode } = useA11y();
  const { isPlaying, speakText, stopSpeech } = useAudioGuidance();

  const isDemo = Boolean(user?.isDemo);
  const userPhone = user?.phone || '0812-3456-7890';
  const userEmail = user?.email || '-';

  const guideText = `Halaman Pengaturan Akun dan Keamanan SahabatPay. Menjelaskan status akun Anda yang saat ini ${
    isDemo ? 'Akun Demo Simulasi' : 'Akun Terverifikasi'
  }, otorisasi transaksi dengan enam digit PIN, media penyimpanan data lokal pada peramban web, serta transparansi keterbatasan keamanan purwarupa.`;

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
        <button
          onClick={() => {
            stopSpeech();
            navigate('/profile');
          }}
          className={`inline-flex items-center gap-2 font-semibold text-brand-charcoal hover:text-brand-forest transition-default rounded-xl border border-brand-border bg-white shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest ${
            isEasyMode ? 'min-h-[64px] px-5 text-base' : 'min-h-[42px] text-sm px-3.5'
          }`}
          aria-label="Kembali ke Halaman Profil"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Profil</span>
        </button>

        <h1 className={`font-extrabold text-brand-charcoal ${isEasyMode ? 'text-2xl' : 'text-xl'}`}>
          Akun & Keamanan
        </h1>

        <div className="w-16" />
      </div>

      {/* ============================================================ */}
      {/* SECTION 1: STATUS AUTENTIKASI AKUN */}
      {/* ============================================================ */}
      <section aria-labelledby="heading-account-status">
        <h2 id="heading-account-status" className={`font-bold text-brand-charcoal mb-2.5 ${isEasyMode ? 'text-xl' : 'text-base'}`}>
          1. Status Autentikasi Pengguna
        </h2>

        <Card className="!p-5 bg-white border-brand-border shadow-card flex flex-col gap-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-brand-border">
            <span className="text-xs text-brand-muted font-medium">Jenis Akun</span>
            {isDemo ? (
              <span className="sp-badge-amber font-bold py-1 px-3">
                <UserCheck size={14} aria-hidden="true" />
                <span>Akun Demo Simulasi</span>
              </span>
            ) : (
              <span className="sp-badge-green font-bold py-1 px-3">
                <ShieldCheck size={14} aria-hidden="true" />
                <span>Akun Terdaftar & Terverifikasi</span>
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-brand-muted font-medium">Nomor Handphone Terdaftar</span>
            <span className="font-mono font-bold text-brand-charcoal">{maskPhoneNumber(userPhone)}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-brand-muted font-medium">Alamat Email</span>
            <span className="font-medium text-brand-charcoal">{userEmail}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-brand-muted font-medium">Status Sesi</span>
            <span className="font-semibold text-brand-emerald flex items-center gap-1">
              <CheckCircle2 size={13} />
              <span>Aktif & Terproteksi Route Guard</span>
            </span>
          </div>
        </Card>
      </section>

      {/* ============================================================ */}
      {/* SECTION 2: OTORISASI KEAMANAN PIN TRANSAKSI */}
      {/* ============================================================ */}
      <section aria-labelledby="heading-pin-security">
        <h2 id="heading-pin-security" className={`font-bold text-brand-charcoal mb-2.5 ${isEasyMode ? 'text-xl' : 'text-base'}`}>
          2. Keamanan PIN Transaksi
        </h2>

        <Card className="!p-5 bg-white border-brand-border shadow-card flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-forest/10 text-brand-forest flex items-center justify-center shrink-0 border border-brand-forest/20" aria-hidden="true">
              <Key size={20} />
            </div>
            <div>
              <p className="font-extrabold text-brand-charcoal text-sm">PIN 6 Digit SahabatPay</p>
              <p className="text-xs text-brand-muted mt-0.5 leading-relaxed">
                PIN 6 digit wajib dimasukkan untuk mengonfirmasi setiap transaksi saldo keluar, baik Transfer maupun Pembayaran QRIS.
              </p>
            </div>
          </div>

          <div className="bg-brand-cream/60 p-3 rounded-xl border border-brand-border flex flex-col gap-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-brand-muted font-medium">Status Proteksi PIN</span>
              <span className="sp-badge-green font-bold">
                Aktif (Maksimal 3x Percobaan)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-brand-muted font-medium">Privasi Audio Guidance</span>
              <span className="font-semibold text-brand-charcoal flex items-center gap-1">
                <EyeOff size={13} className="text-brand-muted" />
                <span>PIN Tidak Pernah Dibacakan Suara</span>
              </span>
            </div>
          </div>

          <div className="sp-alert-info text-xs flex items-start gap-2">
            <Info size={16} className="shrink-0 text-brand-forest mt-0.5" aria-hidden="true" />
            <p className="leading-relaxed">
              <strong>Catatan Prototype:</strong> Fitur ubah PIN secara daring belum disediakan pada tahap ini demi menjaga kestabilan sesi demonstrasi pengujian. PIN default akun demo adalah <strong className="font-mono">123456</strong>.
            </p>
          </div>
        </Card>
      </section>

      {/* ============================================================ */}
      {/* SECTION 3: PENYIMPANAN DATA LOKAL & BATASAN KEAMANAN */}
      {/* ============================================================ */}
      <section aria-labelledby="heading-prototype-limits">
        <h2 id="heading-prototype-limits" className={`font-bold text-brand-charcoal mb-2.5 ${isEasyMode ? 'text-xl' : 'text-base'}`}>
          3. Media Penyimpanan & Batasan Prototype
        </h2>

        <Card className="!p-5 bg-white border-brand-border shadow-card flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-cream text-brand-charcoal flex items-center justify-center shrink-0 border border-brand-border" aria-hidden="true">
              <Database size={20} />
            </div>
            <div>
              <p className="font-extrabold text-brand-charcoal text-sm">Penyimpanan Sisi Klien (LocalStorage)</p>
              <p className="text-xs text-brand-muted mt-0.5 leading-relaxed">
                Seluruh data akun, saldo demo, jurnal transaksi, dan riwayat disimpan secara lokal pada peramban web perangkat Anda menggunakan Web Storage API.
              </p>
            </div>
          </div>

          {/* Alert Keterbatasan Keamanan */}
          <div className="sp-alert-warning text-xs flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle size={15} className="text-amber-700" />
              <span>Transparansi Keamanan Prototype</span>
            </div>
            <p className="leading-relaxed">
              Aplikasi ini adalah <strong>purwarupa percontohan (prototype)</strong> untuk riset aksesibilitas e-wallet inklusif. Aplikasi ini <strong>BUKAN</strong> layanan perbankan resmi berlisensi Bank Indonesia dan <strong>TIDAK</strong> menggunakan enkripsi Hardware Security Module (HSM) perbankan produksi.
            </p>
            <p className="leading-relaxed font-semibold mt-1">
              Dilarang menggunakan PIN kartu ATM, PIN rekening bank sungguhan, atau data pribadi sensitif Anda pada prototipe ini.
            </p>
          </div>
        </Card>
      </section>
    </div>
  );
}
