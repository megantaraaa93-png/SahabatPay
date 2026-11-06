import { useState } from 'react';
import { Mic, MicOff, X, HelpCircle, ChevronDown, ChevronUp, Compass, LogIn, Sparkles } from 'lucide-react';
import { useA11y } from '../../context/A11yContext';
import { useVoiceCommand } from '../../hooks/useVoiceCommand';
import Modal from '../common/Modal';
import Button from '../common/Button';

/**
 * Komponen Tombol Floating Asisten Suara Global (Voice Assistant).
 * Aktif dan tersedia sejak pengguna pertama kali membuka aplikasi (App Entry)
 * di seluruh halaman: Welcome, Login, Register, Verification, Setup PIN, Dashboard, dll.
 */
export default function VoiceCommandButton() {
  const { isEasyMode, isAudioMode } = useA11y();
  const {
    isSupported,
    isListening,
    transcript,
    lastCommand,
    errorMessage,
    startListening,
    stopListening,
    currentPath,
  } = useVoiceCommand();

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState('kontekstual');

  // Kelompok perintah suara terstruktur
  const commandGroups = [
    {
      id: 'kontekstual',
      label: 'Kontekstual & Status Lokasi',
      color: 'text-indigo-600',
      commands: [
        '"Saya di mana?" / "Halaman apa ini?" (Menjelaskan lokasi saat ini)',
        '"Bantuan" / "Apa yang bisa dilakukan?" (Panduan halaman aktif)',
      ],
    },
    {
      id: 'onboarding',
      label: 'Onboarding & Masuk Akun',
      color: 'text-emerald-700',
      commands: [
        '"Buka halaman login" / "Masuk ke akun"',
        '"Saya ingin membuat akun" / "Daftar"',
        '"Coba akun demo" / "Masuk demo"',
        '"Bantu saya login" / "Masukkan nomor telepon"',
        '"Saya lupa PIN" / "Lupa password"',
        '"Bantu saya mendaftar" / "Bantu verifikasi"',
        '"Pelajari fitur aksesibilitas"',
      ],
    },
    {
      id: 'navigasi',
      label: 'Navigasi Transaksi & Menu',
      color: 'text-primary',
      commands: [
        '"Buka beranda" / "Dashboard"',
        '"Saya ingin transfer" / "Buka transfer"',
        '"Saya ingin isi saldo" / "Buka top up"',
        '"Buka QRIS" / "Bayar QRIS"',
        '"Buka riwayat" / "Mutasi"',
        '"Buka daftar penerima"',
        '"Buka profil" / "Pengaturan akun"',
        '"Buka aksesibilitas" / "Tentang SahabatPay"',
        '"Kembali ke beranda" / "Keluar akun"',
      ],
    },
    {
      id: 'informasi',
      label: 'Informasi Keuangan',
      color: 'text-secondary-dark',
      commands: [
        '"Berapa saldo saya?" / "Cek saldo"',
        '"Bacakan transaksi terakhir"',
        '"Bacakan riwayat transaksi"',
        '"Bacakan ringkasan keuangan"',
        '"Bacakan total uang masuk"',
        '"Bacakan total uang keluar"',
        '"Bacakan status akun"',
      ],
    },
    {
      id: 'mode',
      label: 'Mode & Perlindungan Aksesibilitas',
      color: 'text-purple-700',
      commands: [
        '"Aktifkan panduan suara" / "Mode audio"',
        '"Aktifkan mode sederhana" / "Mode mudah"',
        '"Aktifkan mode normal"',
        '"Aktifkan Tremor Shield" / "Matikan Tremor Shield"',
        '"Ubah durasi Tremor Shield menjadi satu detik"',
        '"Ubah durasi Tremor Shield menjadi satu setengah detik"',
        '"Ubah durasi Tremor Shield menjadi dua detik"',
        '"Aktifkan Cognitive Delay Shield"',
      ],
    },
    {
      id: 'audio',
      label: 'Kontrol Audio',
      color: 'text-amber-700',
      commands: [
        '"Diam" / "Hentikan suara"',
        '"Ulangi panduan" / "Baca ulang"',
      ],
    },
  ];

  return (
    <>
      {/* Floating Control Button */}
      <div className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-40 flex flex-col items-end gap-2">
        {/* Banner Status Listening */}
        {isListening && (
          <div
            className="bg-primary-dark text-white px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold border border-white/20 animate-pulse"
            role="status"
            aria-live="assertive"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping shrink-0" aria-hidden="true" />
            <span>Mendengarkan suara Anda...</span>
            <button
              onClick={stopListening}
              className="ml-1 p-1 hover:bg-white/20 rounded-lg text-white transition-default"
              aria-label="Batalkan perintah suara"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Transkrip yang didengar */}
        {transcript && !isListening && (
          <div
            className="bg-white border border-gray-200 shadow-md px-3 py-2 rounded-xl text-xs text-gray-700 max-w-[240px] truncate"
            aria-live="polite"
          >
            <span className="text-gray-400">Didengar: </span>
            <span className="font-semibold text-gray-900">{transcript}</span>
          </div>
        )}

        {/* Error message jika ada */}
        {errorMessage && !isListening && (
          <div
            className="bg-red-50 border border-red-200 px-3 py-2 rounded-xl text-xs text-red-700 max-w-[240px]"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        {/* Baris Tombol Aksi */}
        <div className="flex items-center gap-2">
          {/* Tombol Bantuan Daftar Perintah */}
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            className="w-10 h-10 rounded-full bg-white text-gray-700 border border-gray-300 shadow-md hover:bg-gray-50 flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary transition-default"
            aria-label="Buka daftar perintah Voice Assistant SahabatPay"
            title="Daftar Perintah Asisten Suara"
          >
            <HelpCircle size={18} />
          </button>

          {/* Tombol Mikrofon Asisten Suara Utama */}
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`rounded-full shadow-xl flex items-center justify-center transition-all focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary ${
              isListening
                ? 'bg-red-600 text-white ring-4 ring-red-300 animate-bounce'
                : isAudioMode
                ? 'bg-purple-600 text-white hover:bg-purple-700 ring-2 ring-purple-300'
                : 'bg-primary text-white hover:bg-primary-dark shadow-primary/20'
            } ${isEasyMode ? 'w-16 h-16 min-h-[64px] min-w-[64px]' : 'w-13 h-13 min-h-[52px] min-w-[52px]'}`}
            aria-label={
              isListening
                ? 'Sedang mendengarkan. Tekan untuk menghentikan.'
                : 'Bicara dengan Asisten Suara SahabatPay'
            }
            title={isListening ? 'Hentikan Mendengarkan' : 'Asisten Suara SahabatPay'}
          >
            {isListening ? (
              <MicOff size={isEasyMode ? 28 : 24} />
            ) : (
              <Mic size={isEasyMode ? 28 : 24} />
            )}
          </button>
        </div>
      </div>

      {/* Modal Daftar Perintah Asisten Suara */}
      <Modal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title="Asisten Suara SahabatPay"
        showDefaultFooter={false}
      >
        <div className="flex flex-col gap-3 text-left">
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 p-3 rounded-xl">
            <img src="/logo.png" alt="Logo SahabatPay" className="w-10 h-10 object-contain rounded-lg shrink-0" />
            <div>
              <p className="font-extrabold text-gray-900 text-xs">Asisten Suara Inklusif</p>
              <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
                Asisten suara siap membantu Anda di setiap halaman aplikasi, baik sebelum maupun sesudah masuk akun.
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-700 font-medium leading-relaxed">
            Tekan tombol mikrofon merah, lalu ucapkan perintah dalam <strong>Bahasa Indonesia</strong>:
          </p>

          {/* Accordion Per Kelompok Perintah */}
          <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">
            {commandGroups.map((group) => (
              <div key={group.id} className="rounded-xl border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedSection(expandedSection === group.id ? null : group.id)
                  }
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  aria-expanded={expandedSection === group.id}
                >
                  <span className={`font-bold text-xs uppercase tracking-wider ${group.color}`}>
                    {group.label}
                  </span>
                  {expandedSection === group.id ? (
                    <ChevronUp size={14} className="text-gray-500" />
                  ) : (
                    <ChevronDown size={14} className="text-gray-500" />
                  )}
                </button>

                {expandedSection === group.id && (
                  <ul className="px-3 py-2 bg-white flex flex-col gap-1">
                    {group.commands.map((cmd, i) => (
                      <li key={i} className="text-xs text-gray-800 font-mono py-1 border-b border-gray-100 last:border-0 leading-relaxed">
                        • {cmd}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {/* Catatan Keamanan */}
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-900 font-medium">
            🔒 <strong>Keamanan Finansial:</strong> Asisten suara tidak pernah mengeksekusi transfer atau pembayaran langsung tanpa tinjauan ringkasan dan konfirmasi PIN manual dari Anda.
          </div>

          {!isSupported && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-xs text-red-700 font-medium">
              ⚠ Peramban Anda tidak mendukung Web Speech Recognition. Disarankan menggunakan Google Chrome atau Microsoft Edge terbaru.
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button
              variant="primary"
              size={isEasyMode ? 'lg' : 'md'}
              onClick={() => setIsHelpOpen(false)}
            >
              Tutup Panduan
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
