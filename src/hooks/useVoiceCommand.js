import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useA11y } from '../context/A11yContext';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { useAudioGuidance } from './useAudioGuidance';
import { formatRupiah } from '../utils/formatCurrency';

/**
 * Hook useVoiceCommand
 * Asisten Suara Global SahabatPay berbasis Web Speech Recognition API Bahasa Indonesia.
 *
 * FITUR UTAMA:
 * 1. Global & Always-Ready: Aktif sejak pertama kali membuka aplikasi (Welcome, Login, Register, dll.).
 * 2. Kontekstual: Memahami halaman yang sedang dibuka (`currentPath`) dan aksi yang relevan.
 * 3. Aman: Tidak mengeksekusi transfer atau pembayaran langsung tanpa review & PIN manual.
 * 4. Komprehensif: Mendukung navigasi, informasi saldo, pemilihan mode, bantuan onboarding,
 *    dan pengecekan status lokasi ("Saya di mana?").
 */

// ============================================================
// DAFTAR INFORMASI HALAMAN UNTUK RESPONS KONTEKSTUAL
// ============================================================
const PAGE_CONTEXT_INFO = {
  '/': {
    name: 'Halaman Selamat Datang SahabatPay',
    help: 'Di halaman ini, Anda dapat memilih mode kenyamanan (Normal, Audio Guidance, atau Easy Mode), masuk ke akun, membuat akun baru, atau mencoba akun demo langsung.',
  },
  '/login': {
    name: 'Halaman Masuk Akun',
    help: 'Masukkan nomor handphone atau email dan kata sandi Anda. Anda juga dapat meminta saya untuk mencoba akun demo langsung tanpa mendaftar.',
  },
  '/register': {
    name: 'Halaman Pendaftaran Akun Baru',
    help: 'Lengkapi formulir nama lengkap, nomor HP, email, dan kata sandi untuk membuat akun SahabatPay baru.',
  },
  '/verification': {
    name: 'Halaman Verifikasi Kode OTP',
    help: 'Masukkan enam digit kode OTP yang dikirimkan. Untuk simulasi demo, kode OTP adalah 123456.',
  },
  '/setup-pin': {
    name: 'Halaman Pembuatan PIN Transaksi',
    help: 'Buat enam digit PIN rahasia untuk mengamankan setiap transaksi saldo keluar Anda.',
  },
  '/dashboard': {
    name: 'Beranda SahabatPay',
    help: 'Anda dapat memeriksa saldo aktif, melakukan Top Up, Transfer antar pengguna, atau Pembayaran QRIS.',
  },
  '/top-up': {
    name: 'Halaman Top Up Saldo',
    help: 'Pilih nominal isi saldo atau masukkan nominal sendiri, lalu pilih metode transfer bank, virtual account, atau gerai retail.',
  },
  '/transfer': {
    name: 'Halaman Transfer Saldo',
    help: 'Pilih penerima dari daftar tersimpan atau cari pengguna terdaftar, lalu masukkan nominal transfer.',
  },
  '/qris': {
    name: 'Halaman Pembayaran QRIS Simulasi',
    help: 'Pindai kode QR menggunakan kamera, pilih salah satu merchant demo, atau masukkan kode merchant manual.',
  },
  '/recipients': {
    name: 'Halaman Pengelolaan Daftar Penerima',
    help: 'Di sini Anda dapat menambah penerima transfer baru, mengubah alias nama, atau menghapus kontak.',
  },
  '/history': {
    name: 'Halaman Riwayat Transaksi',
    help: 'Anda dapat meninjau seluruh mutasi saldo masuk dan saldo keluar, mencari transaksi, atau membuka detail mutasi.',
  },
  '/profile': {
    name: 'Halaman Profil Pengguna',
    help: 'Periksa data akun Anda, ubah nama profil, atur aksesibilitas, atau keluar dari akun.',
  },
  '/settings/accessibility': {
    name: 'Halaman Pengaturan Aksesibilitas',
    help: 'Pilih antara Mode Normal, Audio Guidance, atau Easy Mode. Anda juga dapat mengaktifkan Tremor Shield dan Cognitive Delay Shield.',
  },
  '/settings/account': {
    name: 'Halaman Pengaturan Akun dan Keamanan',
    help: 'Informasi keamanan otorisasi PIN 6 digit dan transparansi penyimpanan lokal prototype.',
  },
  '/about': {
    name: 'Halaman Tentang SahabatPay',
    help: 'Informasi visi, misi, dan pilar aksesibilitas dompet digital inklusif SahabatPay.',
  },
};

// ============================================================
// COMMAND REGISTRY
// ============================================================
function buildCommandRegistry() {
  return [
    // ==========================================
    // 1. RESPON STATUS LOKASI & BANTUAN KONTEKSTUAL
    // ==========================================
    {
      patterns: [
        /^(saya\s+)?di\s*mana(\s+saya)?$/,
        /^halaman\s+apa(\s+ini)?$/,
        /^posisi\s+saya$/,
        /^di\s+mana\s+ini$/,
      ],
      handler: ({ currentPath, speakText, playSuccessSound }) => {
        playSuccessSound();
        const info = PAGE_CONTEXT_INFO[currentPath] || {
          name: 'SahabatPay',
          help: 'Anda dapat meminta saya untuk membuka beranda, cek saldo, atau bantuan lainnya.',
        };
        speakText(`Anda sedang berada di ${info.name}. ${info.help}`);
      },
      description: '"Saya di mana?" / "Halaman apa ini?"',
    },
    {
      patterns: [
        /^(minta\s+)?bantuan$/,
        /^apa\s+yang\s+bisa\s+dilakukan$/,
        /^panduan\s+halaman$/,
        /^tolong(\s+saya)?$/,
      ],
      handler: ({ currentPath, speakText, playSuccessSound }) => {
        playSuccessSound();
        const info = PAGE_CONTEXT_INFO[currentPath] || {
          name: 'SahabatPay',
          help: 'Katakan perintah seperti: "cek saldo", "buka transfer", atau "aktifkan mode suara".',
        };
        speakText(`Panduan untuk ${info.name}: ${info.help}`);
      },
      description: '"Bantuan" / "Apa yang bisa dilakukan?"',
    },

    // ==========================================
    // 2. ONBOARDING & AUTENTIKASI (SEBELUM LOGIN)
    // ==========================================
    {
      patterns: [
        /^(buka\s+)?(halaman\s+)?(login|masuk)(\s+ke\s+akun)?$/,
        /^saya\s+ingin\s+masuk$/,
      ],
      handler: ({ navigate, speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText('Membuka halaman Masuk Akun.');
        navigate('/login');
      },
      description: '"Buka halaman login" / "Masuk"',
    },
    {
      patterns: [
        /^(buka\s+)?(halaman\s+)?(daftar|registrasi|buat\s+akun)(\s+baru)?$/,
        /^saya\s+ingin\s+membuat\s+akun$/,
        /^buat\s+akun$/,
      ],
      handler: ({ navigate, speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText('Membuka halaman Pendaftaran Akun Baru.');
        navigate('/register');
      },
      description: '"Saya ingin membuat akun" / "Daftar"',
    },
    {
      patterns: [
        /^(coba\s+)?(akun\s+)?demo(\s+langsung)?$/,
        /^masuk(\s+sebagai)?\s+demo$/,
        /^coba\s+demo$/,
      ],
      handler: ({ loginDemo, navigate, speakText, playSuccessSound }) => {
        loginDemo();
        playSuccessSound();
        speakText('Masuk sebagai akun demo resmi berhasil. Selamat datang di Beranda SahabatPay.');
        navigate('/dashboard');
      },
      description: '"Coba akun demo" / "Masuk demo"',
    },
    {
      patterns: [
        /^bantu(\s+saya)?\s+login$/,
        /^cara\s+masuk$/,
        /^masukkan\s+nomor\s+(telepon|hp)$/,
      ],
      handler: ({ navigate, currentPath, speakText, playSuccessSound }) => {
        playSuccessSound();
        if (currentPath !== '/login') {
          navigate('/login');
        }
        speakText(
          'Silakan masukkan nomor handphone dan kata sandi Anda pada formulir. Untuk mencoba instan, Anda juga dapat mengatakan "coba akun demo".'
        );
      },
      description: '"Bantu saya login"',
    },
    {
      patterns: [
        /^(saya\s+)?lupa\s+(pin|password|kata\s+sandi)$/,
        /^lupa\s+sandi$/,
      ],
      handler: ({ speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText(
          'Pada versi prototype simulasi ini, akun demo menggunakan kata sandi "Demo123!" dan PIN transaksi "123456". Anda juga dapat membuat akun baru kapan saja.'
        );
      },
      description: '"Saya lupa PIN" / "Lupa password"',
    },
    {
      patterns: [
        /^bantu(\s+saya)?\s+(daftar|mendaftar)$/,
        /^cara\s+daftar$/,
      ],
      handler: ({ navigate, currentPath, speakText, playSuccessSound }) => {
        playSuccessSound();
        if (currentPath !== '/register') {
          navigate('/register');
        }
        speakText(
          'Isi nama lengkap, nomor handphone, alamat email, dan kata sandi minimal enam karakter, lalu centang persetujuan syarat ketentuan.'
        );
      },
      description: '"Bantu saya mendaftar"',
    },
    {
      patterns: [
        /^bantu\s+verifikasi$/,
        /^apa\s+kode\s+otp$/,
        /^kode\s+verifikasi$/,
      ],
      handler: ({ speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText(
          'Untuk kemudahan simulasi prototype, kode OTP verifikasi adalah satu dua tiga empat lima enam (123456). Anda dapat menekan tombol Isi Otomatis Kode Demo.'
        );
      },
      description: '"Bantu verifikasi" / "Apa kode OTP?"',
    },
    {
      patterns: [
        /^bantu\s+(buat\s+)?pin$/,
        /^cara\s+buat\s+pin$/,
      ],
      handler: ({ speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText(
          'Buat enam digit angka rahasia untuk mengamankan transaksi Anda. Demi kerahasiaan, angka PIN tidak akan pernah disuarakan oleh sistem.'
        );
      },
      description: '"Bantu buat PIN"',
    },
    {
      patterns: [
        /^(pelajari\s+)?(fitur\s+)?aksesibilitas$/,
        /^apa\s+saja\s+mode(\s+aksesibilitas)?$/,
      ],
      handler: ({ speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText(
          'SahabatPay menyediakan tiga mode: Mode Normal untuk tampilan standar, Mode Audio Guidance untuk panduan suara bagi tunanetra, dan Easy Mode dengan tombol ekstra besar minimal enam puluh empat piksel.'
        );
      },
      description: '"Pelajari fitur aksesibilitas"',
    },

    // ==========================================
    // 3. NAVIGASI HALAMAN UTAMA & TRANSAKSI
    // ==========================================
    {
      patterns: [/^(buka\s+)?(beranda|dashboard|menu\s+utama|halaman\s+utama|home)$/],
      handler: ({ navigate, speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText('Membuka halaman Beranda.');
        navigate('/dashboard');
      },
      description: '"Buka beranda" / "Dashboard"',
    },
    {
      patterns: [/^(buka\s+)?(riwayat|histori|mutasi|catatan\s+transaksi|aktivitas)$/],
      handler: ({ navigate, speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText('Membuka halaman Riwayat Transaksi.');
        navigate('/history');
      },
      description: '"Buka riwayat" / "Mutasi"',
    },
    {
      patterns: [/^(buka\s+)?(profil|akun\s+saya|profil\s+saya)$/],
      handler: ({ navigate, speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText('Membuka halaman Profil Saya.');
        navigate('/profile');
      },
      description: '"Buka profil"',
    },
    {
      patterns: [/^(buka\s+)?(pengaturan\s+akun|akun\s+settings|ubah\s+sandi|ganti\s+pin)$/],
      handler: ({ navigate, speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText('Membuka halaman Pengaturan Akun.');
        navigate('/settings/account');
      },
      description: '"Buka pengaturan akun"',
    },
    {
      patterns: [/^(buka\s+)?(aksesibilitas|pengaturan\s+aksesibilitas|preferensi\s+aksesibilitas|a11y)$/],
      handler: ({ navigate, speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText('Membuka halaman Preferensi Aksesibilitas.');
        navigate('/settings/accessibility');
      },
      description: '"Buka aksesibilitas"',
    },
    {
      patterns: [/^(buka\s+)?(tentang|about|tentang\s+sahabatpay|informasi\s+aplikasi)$/],
      handler: ({ navigate, speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText('Membuka halaman Tentang SahabatPay.');
        navigate('/about');
      },
      description: '"Buka tentang SahabatPay"',
    },
    {
      patterns: [
        /^(buka\s+)?(top\s*up|isi\s+saldo|tambah\s+saldo|topup)$/,
        /^saya\s+ingin\s+(isi\s+saldo|top\s*up)$/,
      ],
      handler: ({ navigate, speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText('Membuka halaman Top Up. Silakan tentukan nominal yang Anda inginkan.');
        navigate('/top-up');
      },
      description: '"Buka top up" / "Saya ingin isi saldo"',
    },
    {
      patterns: [
        /^(buka\s+)?(transfer|kirim\s+uang|kirim\s+saldo|transfer\s+saldo)$/,
        /^saya\s+ingin\s+(transfer|kirim\s+uang)$/,
      ],
      handler: ({ navigate, speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText('Membuka halaman Transfer Saldo. Cari penerima dan tentukan nominal.');
        navigate('/transfer');
      },
      description: '"Buka transfer" / "Saya ingin transfer"',
    },
    {
      patterns: [
        /^(buka\s+)?(qris|scan|pindai|bayar\s+qris|pembayaran\s+qris)$/,
        /^saya\s+ingin\s+bayar\s+qris$/,
      ],
      handler: ({ navigate, speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText('Membuka halaman Pembayaran QRIS. Anda dapat memilih merchant atau memindai QR.');
        navigate('/qris');
      },
      description: '"Buka QRIS" / "Pindai QR"',
    },
    {
      patterns: [/^(buka\s+)?(daftar\s+penerima|penerima\s+tersimpan|kontak\s+transfer|recipients)$/],
      handler: ({ navigate, speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText('Membuka halaman Daftar Penerima Transfer.');
        navigate('/recipients');
      },
      description: '"Buka daftar penerima"',
    },
    {
      patterns: [/^(kembali|kembali\s+ke\s+beranda|pergi\s+ke\s+beranda|balik)$/],
      handler: ({ navigate, speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText('Kembali ke halaman Beranda.');
        navigate('/dashboard');
      },
      description: '"Kembali" / "Kembali ke beranda"',
    },

    // ==========================================
    // 4. INFORMASI SALDO & TRANSAKSI
    // ==========================================
    {
      patterns: [
        /^(berapa\s+)?(saldo|saldo\s+saya|cek\s+saldo|cek\s+uang|uang\s+saya|dompet)(\s+saya)?(\s+sekarang)?$/,
        /^bacakan\s+saldo(\s+saya)?$/,
      ],
      handler: ({ balance, speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText(`Saldo SahabatPay Anda saat ini adalah ${formatRupiah(balance)}.`);
      },
      description: '"Berapa saldo saya?" / "Cek saldo"',
    },
    {
      patterns: [
        /^(bacakan\s+)?(transaksi\s+terakhir|baca\s+transaksi|mutasi\s+terakhir|cari\s+transaksi\s+terakhir)$/,
      ],
      handler: ({ transactions, speakText, playSuccessSound }) => {
        playSuccessSound();
        if (!transactions || transactions.length === 0) {
          speakText('Belum ada riwayat transaksi di akun Anda.');
        } else {
          const last = transactions[0];
          const isIncome = last.type === 'top_up' || last.type === 'transfer_in';
          speakText(
            `Transaksi terakhir Anda adalah ${last.title || last.description}, ${
              isIncome ? 'uang masuk' : 'uang keluar'
            } sebesar ${formatRupiah(last.amount)}.`
          );
        }
      },
      description: '"Bacakan transaksi terakhir"',
    },
    {
      patterns: [
        /^(bacakan\s+)?(riwayat\s+transaksi|semua\s+transaksi|daftar\s+transaksi)$/,
      ],
      handler: ({ transactions, speakText, playSuccessSound, navigate }) => {
        playSuccessSound();
        if (!transactions || transactions.length === 0) {
          speakText('Belum ada transaksi di akun Anda.');
        } else {
          speakText(`Anda memiliki ${transactions.length} mutasi transaksi. Membuka halaman riwayat transaksi.`);
          navigate('/history');
        }
      },
      description: '"Bacakan riwayat transaksi"',
    },
    {
      patterns: [
        /^(bacakan\s+)?(ringkasan\s+keuangan|ringkasan|total\s+keuangan|status\s+keuangan)$/,
      ],
      handler: ({ balance, transactions, speakText, playSuccessSound }) => {
        playSuccessSound();
        const income = (transactions || [])
          .filter((t) => t.type === 'top_up' || t.type === 'transfer_in')
          .reduce((s, t) => s + (t.amount || 0), 0);
        const outcome = (transactions || [])
          .filter((t) => t.type !== 'top_up' && t.type !== 'transfer_in')
          .reduce((s, t) => s + (t.amount || 0), 0);
        speakText(
          `Ringkasan keuangan: Saldo aktif ${formatRupiah(balance)}. ` +
          `Total uang masuk ${formatRupiah(income)}. ` +
          `Total uang keluar ${formatRupiah(outcome)}. ` +
          `Tercatat ${(transactions || []).length} transaksi.`
        );
      },
      description: '"Bacakan ringkasan keuangan"',
    },
    {
      patterns: [/^(bacakan\s+)?(total\s+uang\s+masuk|pemasukan\s+total)$/],
      handler: ({ transactions, speakText, playSuccessSound }) => {
        playSuccessSound();
        const total = (transactions || [])
          .filter((t) => t.type === 'top_up' || t.type === 'transfer_in')
          .reduce((s, t) => s + (t.amount || 0), 0);
        speakText(`Total uang masuk Anda adalah ${formatRupiah(total)}.`);
      },
      description: '"Bacakan total uang masuk"',
    },
    {
      patterns: [/^(bacakan\s+)?(total\s+uang\s+keluar|pengeluaran\s+total)$/],
      handler: ({ transactions, speakText, playSuccessSound }) => {
        playSuccessSound();
        const total = (transactions || [])
          .filter((t) => t.type !== 'top_up' && t.type !== 'transfer_in')
          .reduce((s, t) => s + (t.amount || 0), 0);
        speakText(`Total uang keluar Anda adalah ${formatRupiah(total)}.`);
      },
      description: '"Bacakan total uang keluar"',
    },
    {
      patterns: [/^(bacakan\s+)?(status\s+akun|informasi\s+akun|data\s+akun)$/],
      handler: ({ user, balance, transactions, speakText, playSuccessSound }) => {
        playSuccessSound();
        const name = user?.name || 'Pengguna';
        speakText(
          `Akun atas nama ${name} dalam status aktif dengan saldo ${formatRupiah(balance)} ` +
          `dan ${(transactions || []).length} transaksi tercatat.`
        );
      },
      description: '"Bacakan status akun"',
    },

    // ==========================================
    // 5. PERINTAH MODE AKSESIBILITAS
    // ==========================================
    {
      patterns: [
        /^(aktifkan\s+)?(mode\s+mudah|easy\s+mode|mode\s+besar|mode\s+lansia|mode\s+sederhana)$/,
      ],
      handler: ({ setMode, speakText, playSuccessSound }) => {
        setMode('easy');
        playSuccessSound();
        speakText('Easy Mode diaktifkan. Tombol kini berukuran minimal enam puluh empat piksel.');
      },
      description: '"Aktifkan mode sederhana" / "Easy Mode"',
    },
    {
      patterns: [
        /^(aktifkan\s+)?(mode\s+suara|audio\s+guidance|audio\s+mode|mode\s+audio|panduan\s+suara)$/,
      ],
      handler: ({ setMode, speakText, playSuccessSound }) => {
        setMode('audio');
        playSuccessSound();
        speakText('Audio Guidance Mode diaktifkan. Panduan suara siap mendampingi Anda di setiap halaman.');
      },
      description: '"Aktifkan panduan suara" / "Mode Audio"',
    },
    {
      patterns: [
        /^(aktifkan\s+)?(mode\s+normal|tampilan\s+standar|normal\s+mode|mode\s+biasa)$/,
      ],
      handler: ({ setMode, speakText, playSuccessSound }) => {
        setMode('normal');
        playSuccessSound();
        speakText('Normal Mode diaktifkan. Tampilan kembali ke standar.');
      },
      description: '"Aktifkan mode normal"',
    },

    // ==========================================
    // 6. SHIELDS (TREMOR SHIELD & COGNITIVE DELAY)
    // ==========================================
    {
      patterns: [/^aktifkan\s+(tremor\s+shield|pelindung\s+tremor|tremor)$/],
      handler: ({ setTremorShieldEnabled, speakText, playSuccessSound }) => {
        setTremorShieldEnabled(true);
        playSuccessSound();
        speakText('Tremor Shield diaktifkan. Konfirmasi transaksi kini memerlukan penahanan tombol.');
      },
      description: '"Aktifkan Tremor Shield"',
    },
    {
      patterns: [/^(matikan|nonaktifkan)\s+(tremor\s+shield|pelindung\s+tremor|tremor)$/],
      handler: ({ setTremorShieldEnabled, speakText, playSuccessSound }) => {
        setTremorShieldEnabled(false);
        playSuccessSound();
        speakText('Tremor Shield dinonaktifkan.');
      },
      description: '"Matikan Tremor Shield"',
    },
    {
      patterns: [/^(ubah\s+durasi\s+tremor\s+shield\s+menjadi\s+)?(satu\s+detik|1\s+detik)$/],
      handler: ({ setTremorDuration, speakText, playSuccessSound }) => {
        setTremorDuration(1000);
        playSuccessSound();
        speakText('Durasi Tremor Shield diubah menjadi satu detik.');
      },
      description: '"Ubah durasi Tremor Shield menjadi satu detik"',
    },
    {
      patterns: [/^(ubah\s+durasi\s+tremor\s+shield\s+menjadi\s+)?(satu\s+setengah\s+detik|1[,.]5\s+detik|satu\s+koma\s+lima\s+detik)$/],
      handler: ({ setTremorDuration, speakText, playSuccessSound }) => {
        setTremorDuration(1500);
        playSuccessSound();
        speakText('Durasi Tremor Shield diubah menjadi satu setengah detik.');
      },
      description: '"Ubah durasi Tremor Shield menjadi satu setengah detik"',
    },
    {
      patterns: [/^(ubah\s+durasi\s+tremor\s+shield\s+menjadi\s+)?(dua\s+detik|2\s+detik)$/],
      handler: ({ setTremorDuration, speakText, playSuccessSound }) => {
        setTremorDuration(2000);
        playSuccessSound();
        speakText('Durasi Tremor Shield diubah menjadi dua detik.');
      },
      description: '"Ubah durasi Tremor Shield menjadi dua detik"',
    },
    {
      patterns: [/^aktifkan\s+(cognitive\s+delay|jeda\s+telaah|cognitive)$/],
      handler: ({ setCognitiveDelayEnabled, speakText, playSuccessSound }) => {
        setCognitiveDelayEnabled(true);
        playSuccessSound();
        speakText('Cognitive Delay Shield diaktifkan. Jeda sepuluh detik sebelum konfirmasi transaksi aktif.');
      },
      description: '"Aktifkan Cognitive Delay Shield"',
    },
    {
      patterns: [/^(matikan|nonaktifkan)\s+(cognitive\s+delay|jeda\s+telaah|cognitive)$/],
      handler: ({ setCognitiveDelayEnabled, speakText, playSuccessSound }) => {
        setCognitiveDelayEnabled(false);
        playSuccessSound();
        speakText('Cognitive Delay Shield dinonaktifkan.');
      },
      description: '"Matikan Cognitive Delay Shield"',
    },

    // ==========================================
    // 7. KONTROL AUDIO & KELUAR
    // ==========================================
    {
      patterns: [/^(hentikan\s+suara|stop\s+suara|diam|berhenti\s+bicara|hentikan\s+audio)$/],
      handler: ({ stopSpeech }) => {
        stopSpeech();
      },
      description: '"Diam" / "Hentikan suara"',
    },
    {
      patterns: [/^(ulangi|ulang|ulangi\s+panduan|ulang\s+panduan|baca\s+ulang)$/],
      handler: ({ repeatLastSpeech }) => {
        repeatLastSpeech();
      },
      description: '"Ulangi panduan"',
    },
    {
      patterns: [
        /^(keluar\s+dari\s+akun|keluar\s+akun|logout|keluar)$/,
      ],
      handler: ({ user, logout, navigate, speakText, playSuccessSound }) => {
        if (!user) {
          speakText('Anda belum masuk ke akun.');
          return;
        }
        logout();
        playSuccessSound();
        speakText('Anda telah keluar dari akun SahabatPay.');
        navigate('/login', { replace: true });
      },
      description: '"Keluar dari akun" / "Logout"',
    },
  ];
}

const COMMAND_REGISTRY = buildCommandRegistry();

// ============================================================
// HOOK UTAMA
// ============================================================
export function useVoiceCommand() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loginDemo, logout } = useAuth();
  const { mode, setMode, setTremorShieldEnabled, setCognitiveDelayEnabled, setTremorDuration } = useA11y();
  const { balance, transactions } = useWallet();
  const { speakText, stopSpeech, repeatLastSpeech, playSuccessSound, playErrorSound } = useAudioGuidance();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef(null);
  const isProcessingRef = useRef(false);

  // Inisialisasi Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.lang = 'id-ID';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setErrorMessage('');
      isProcessingRef.current = false;
    };

    recognition.onresult = (event) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      const recognizedText = event.results[0][0].transcript;
      setTranscript(recognizedText);
      executeCommandFromText(recognizedText);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      isProcessingRef.current = false;
      playErrorSound();

      if (event.error === 'not-allowed') {
        const err =
          'Izin mikrofon ditolak. Silakan izinkan akses mikrofon di peramban Anda untuk menggunakan Voice Command.';
        setErrorMessage(err);
        speakText(err);
      } else if (event.error === 'no-speech') {
        const err = 'Suara tidak terdeteksi. Silakan coba lagi.';
        setErrorMessage(err);
        speakText(err);
      } else if (event.error !== 'aborted') {
        const err = 'Gagal mengenali suara. Silakan coba lagi.';
        setErrorMessage(err);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      isProcessingRef.current = false;
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Context untuk command handler (selalu fresh via closure baru setiap render)
  const buildContext = useCallback(() => ({
    navigate,
    currentPath: location.pathname,
    user,
    loginDemo,
    logout,
    balance,
    transactions,
    mode,
    setMode,
    setTremorShieldEnabled,
    setCognitiveDelayEnabled,
    setTremorDuration,
    speakText,
    stopSpeech,
    repeatLastSpeech,
    playSuccessSound,
    playErrorSound,
  }), [
    navigate, location.pathname, user, loginDemo, logout,
    balance, transactions, mode, setMode,
    setTremorShieldEnabled, setCognitiveDelayEnabled, setTremorDuration,
    speakText, stopSpeech, repeatLastSpeech, playSuccessSound, playErrorSound,
  ]);

  // Parsing dan Eksekusi Command via Registry
  const executeCommandFromText = useCallback(
    (rawText) => {
      const clean = rawText.trim().toLowerCase().replace(/[.,!?]/g, '').replace(/\s+/g, ' ');
      setLastCommand(rawText);

      const ctx = buildContext();

      // Cari command yang cocok di registry
      for (const cmd of COMMAND_REGISTRY) {
        const matched = cmd.patterns.some((pattern) => pattern.test(clean));
        if (matched) {
          try {
            cmd.handler({ ...ctx, rawText, clean });
          } catch (err) {
            console.error('Voice command handler error:', err);
          }
          return;
        }
      }

      // Jika tidak ada yang cocok — respons ramah kontekstual
      playErrorSound();
      speakText(
        `Perintah "${rawText}" belum dikenali. Anda dapat mengatakan "bantuan", "saya di mana", "cek saldo", atau "buka transfer".`
      );
    },
    [buildContext, playErrorSound, speakText]
  );

  // Mulai Mendengarkan
  const startListening = useCallback(() => {
    if (!isSupported) {
      const err = 'Peramban Anda belum mendukung fitur Voice Command (Web Speech Recognition).';
      setErrorMessage(err);
      speakText(err);
      return;
    }

    if (recognitionRef.current) {
      try {
        stopSpeech();
        setTranscript('');
        setErrorMessage('');
        isProcessingRef.current = false;
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Recognition start error:', err);
      }
    }
  }, [isSupported, stopSpeech, speakText]);

  // Hentikan Mendengarkan
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsListening(false);
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    lastCommand,
    errorMessage,
    startListening,
    stopListening,
    commandRegistry: COMMAND_REGISTRY,
    currentPath: location.pathname,
  };
}
