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
          className={`inline-flex items-center gap-2 font-semibold text-gray-700 hover:text-primary transition-default rounded-xl border border-gray-300 bg-white p-2 focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary ${
            isEasyMode ? 'min-h-[52px] px-4 text-base' : 'text-sm px-3'
          }`}
          aria-label="Kembali ke Halaman Profil"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Profil</span>
        </button>

        <h1 className={`font-bold text-gray-900 ${isEasyMode ? 'text-2xl' : 'text-xl'}`}>
          Akun & Keamanan
        </h1>

        <div className="w-16" />
      </div>

      {/* ============================================================ */}
      {/* SECTION 1: STATUS AUTENTIKASI AKUN */}
      {/* ============================================================ */}
      <section aria-labelledby="heading-account-status">
        <h2 id="heading-account-status" className={`font-bold text-gray-900 mb-2.5 ${isEasyMode ? 'text-xl' : 'text-base'}`}>
          1. Status Autentikasi Pengguna
        </h2>

        <Card className="!p-5 bg-white border-gray-200 shadow-sm flex flex-col gap-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <span className="text-xs text-gray-500 font-medium">Jenis Akun:</span>
            {isDemo ? (
              <span className="inline-flex items-center gap-1.5 text-xs bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full border border-amber-200">
                <UserCheck size={14} aria-hidden="true" />
                <span>Akun Demo Simulasi</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs bg-green-100 text-secondary-dark font-bold px-3 py-1 rounded-full border border-green-200">
                <ShieldCheck size={14} aria-hidden="true" />
                <span>Akun Terdaftar & Terverifikasi</span>
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">Nomor Handphone Terdaftar:</span>
            <span className="font-mono font-bold text-gray-900">{maskPhoneNumber(userPhone)}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">Alamat Email:</span>
            <span className="font-medium text-gray-800">{userEmail}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">Status Sesi:</span>
            <span className="font-semibold text-secondary-dark flex items-center gap-1">
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
        <h2 id="heading-pin-security" className={`font-bold text-gray-900 mb-2.5 ${isEasyMode ? 'text-xl' : 'text-base'}`}>
          2. Keamanan PIN Transaksi
        </h2>

        <Card className="!p-5 bg-white border-gray-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200" aria-hidden="true">
              <Key size={20} />
            </div>
            <div>
              <p className="font-extrabold text-gray-900 text-sm">PIN 6 Digit SahabatPay</p>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                PIN 6 digit wajib dimasukkan untuk mengonfirmasi setiap transaksi saldo keluar, baik Transfer maupun Pembayaran QRIS.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-col gap-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">Status Proteksi PIN:</span>
              <span className="font-bold text-secondary-dark bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                Aktif (Maksimal 3x Percobaan)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">Privasi Audio Guidance:</span>
              <span className="font-semibold text-gray-800 flex items-center gap-1">
                <EyeOff size={13} className="text-gray-500" />
                <span>PIN Tidak Pernah Dibacakan Suara</span>
              </span>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-start gap-2">
            <Info size={16} className="shrink-0 text-blue-700 mt-0.5" aria-hidden="true" />
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
        <h2 id="heading-prototype-limits" className={`font-bold text-gray-900 mb-2.5 ${isEasyMode ? 'text-xl' : 'text-base'}`}>
          3. Media Penyimpanan & Batasan Prototype
        </h2>

        <Card className="!p-5 bg-white border-gray-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center shrink-0 border border-gray-300" aria-hidden="true">
              <Database size={20} />
            </div>
            <div>
              <p className="font-extrabold text-gray-900 text-sm">Penyimpanan Sisi Klien (LocalStorage)</p>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                Seluruh data akun, saldo demo, jurnal transaksi, dan riwayat disimpan secara lokal pada peramban web perangkat Anda menggunakan Web Storage API.
              </p>
            </div>
          </div>

          {/* Alert Keterbatasan Keamanan */}
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <AlertTriangle size={15} className="text-amber-700" />
              <span>Transparansi Keamanan Prototype</span>
            </div>
            <p className="leading-relaxed text-amber-900">
              Aplikasi ini adalah <strong>purwarupa percontohan (prototype)</strong> untuk riset aksesibilitas e-wallet inklusif. Aplikasi ini <strong>BUKAN</strong> layanan perbankan resmi berlisensi Bank Indonesia dan <strong>TIDAK</strong> menggunakan enkripsi Hardware Security Module (HSM) perbankan produksi.
            </p>
            <p className="leading-relaxed text-amber-900 font-semibold mt-1">
              Dilarang menggunakan PIN kartu ATM, PIN rekening bank sungguhan, atau data pribadi sensitif Anda pada prototipe ini.
            </p>
          </div>
        </Card>
      </section>
    </div>
  );
}
