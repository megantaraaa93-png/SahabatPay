import { useState } from 'react';
import { Mic, MicOff, X, HelpCircle, ChevronDown, ChevronUp, Lock, AlertTriangle } from 'lucide-react';
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
      color: 'text-brand-forest',
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
      color: 'text-brand-emerald',
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
            className="bg-brand-forest text-white px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold border border-white/20 animate-pulse"
            role="status"
            aria-live="assertive"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-brand-coral animate-ping shrink-0" aria-hidden="true" />
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
            className="bg-white border border-brand-border shadow-card-md px-3 py-2 rounded-xl text-xs text-brand-charcoal max-w-[240px] truncate"
            aria-live="polite"
          >
            <span className="text-brand-muted">Didengar: </span>
            <span className="font-semibold text-brand-charcoal">{transcript}</span>
          </div>
        )}

        {/* Error message jika ada */}
        {errorMessage && !isListening && (
          <div
            className="sp-alert-error px-3 py-2 rounded-xl text-xs max-w-[240px] shadow-card"
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
            className="w-10 h-10 rounded-full bg-white text-brand-charcoal border border-brand-border shadow-card-md hover:bg-brand-cream flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest transition-default"
            aria-label="Buka daftar perintah Voice Assistant SahabatPay"
            title="Daftar Perintah Asisten Suara"
          >
            <HelpCircle size={18} />
          </button>

          {/* Tombol Mikrofon Asisten Suara Utama */}
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`rounded-full shadow-xl flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest focus-visible:ring-offset-2 ${
              isListening
                ? 'bg-brand-coral text-white ring-4 ring-brand-coral/30 animate-bounce'
                : isAudioMode
                ? 'bg-brand-emerald text-white hover:bg-brand-emerald/90 ring-2 ring-brand-emerald/30'
                : 'bg-brand-forest text-white hover:bg-brand-forest/90 shadow-balance'
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
          <div className="flex items-start gap-3 bg-brand-forest/8 border border-brand-forest/20 p-3 rounded-xl">
            <img src="/logo.png" alt="Logo SahabatPay" className="w-10 h-10 object-contain rounded-lg shrink-0" />
            <div>
              <p className="font-extrabold text-brand-charcoal text-xs">Asisten Suara Inklusif</p>
              <p className="text-[11px] text-brand-muted mt-0.5 leading-relaxed">
                Asisten suara siap membantu Anda di setiap halaman aplikasi, baik sebelum maupun sesudah masuk akun.
              </p>
            </div>
          </div>

          <p className="text-xs text-brand-charcoal font-medium leading-relaxed">
            Tekan tombol mikrofon, lalu ucapkan perintah dalam <strong>Bahasa Indonesia</strong>:
          </p>

          {/* Accordion Per Kelompok Perintah */}
          <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">
            {commandGroups.map((group) => (
              <div key={group.id} className="rounded-xl border border-brand-border overflow-hidden">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedSection(expandedSection === group.id ? null : group.id)
                  }
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-brand-cream/50 hover:bg-brand-cream transition-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest"
                  aria-expanded={expandedSection === group.id}
                >
                  <span className={`font-bold text-xs uppercase tracking-wider ${group.color}`}>
                    {group.label}
                  </span>
                  {expandedSection === group.id ? (
                    <ChevronUp size={14} className="text-brand-muted" />
                  ) : (
                    <ChevronDown size={14} className="text-brand-muted" />
                  )}
                </button>

                {expandedSection === group.id && (
                  <ul className="px-3 py-2 bg-white flex flex-col gap-1">
                    {group.commands.map((cmd, i) => (
                      <li key={i} className="text-xs text-brand-charcoal font-mono py-1 border-b border-brand-border last:border-0 leading-relaxed">
                        • {cmd}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {/* Catatan Keamanan */}
          <div className="sp-alert-warning text-[11px] flex items-start gap-2">
            <Lock size={14} className="shrink-0 text-amber-700 mt-0.5" aria-hidden="true" />
            <p>
              <strong>Keamanan Finansial:</strong> Asisten suara tidak pernah mengeksekusi transfer atau pembayaran langsung tanpa tinjauan ringkasan dan konfirmasi PIN manual dari Anda.
            </p>
          </div>

          {!isSupported && (
            <div className="sp-alert-error text-xs flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 text-brand-coral mt-0.5" aria-hidden="true" />
              <p>
                Peramban Anda tidak mendukung Web Speech Recognition. Disarankan menggunakan Google Chrome atau Microsoft Edge terbaru.
              </p>
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
