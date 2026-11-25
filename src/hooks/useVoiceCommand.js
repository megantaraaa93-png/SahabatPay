
import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useA11y } from '../context/A11yContext';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { useAudioGuidance } from './useAudioGuidance';
import { formatRupiah } from '../utils/formatCurrency';
import { interpretVoiceIntent } from '../services/aiIntentService';
import { addSavedRecipient } from '../services/recipientService';
import { findRegisteredUser } from '../services/userService';

// ============================================================
// DAFTAR INFORMASI HALAMAN UNTUK RESPONS KONTEXTUAL
// ============================================================

const PAGE_CONTEXT_INFO = {
  '/': {
    name: 'Halaman Selamat Datang SahabatPay',
    help: 'Di halaman ini, Anda dapat memilih mode kenyamanan Normal, Audio Guidance, atau Easy Mode, masuk ke akun, membuat akun baru, atau mencoba akun demo langsung.',
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
// NORMALISASI UCAPAN
// ============================================================

function normalizeVoiceText(rawText) {
  let text = String(rawText || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:]/g, ' ')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Variasi pengucapan QRIS dari Speech Recognition.
  const hasSeparatedQris = /\bq\s+r\s+i\s+s\b/.test(text);

  const hasPaymentContext =
    /\b(bayar|pembayaran|scan|pindai|kode|merchant|kasir|qris|qr|kris)\b/.test(text) ||
    hasSeparatedQris;

  if (hasPaymentContext) {
    const qrisPatterns = [
      /\bq\s+r\s+i\s+s\b/g,
      /\bq\s*r\s*i\s*s\b/g,
      /\bkris\b/g,
      /\bkueris\b/g,
      /\bkyuris\b/g,
      /\bkode\s+qr\b/g,
      /\bkode\s+q\s+r\b/g,
    ];

    qrisPatterns.forEach((pattern) => {
      text = text.replace(pattern, 'qris');
    });
  }

  // Hilangkan awalan percakapan.
  text = text
    .replace(/^(tolong\s+)?(bukakan|buka)\s+(halaman\s+)?/, '')
    .replace(/^(saya\s+ingin|aku\s+ingin|saya\s+mau|aku\s+mau)\s+/, '')
    .replace(/^(tolong\s+)?(pergi\s+ke|masuk\s+ke)\s+/, '')
    .trim();

  // Alias ucapan sehari-hari.
  const aliases = {
    'halaman isi saldo': 'isi saldo',
    'tambah uang': 'isi saldo',
    'tambah saldo': 'isi saldo',
    'isi dompet': 'isi saldo',
    'topup': 'top up',

    'halaman transfer': 'transfer',
    'transfer saldo': 'transfer',
    'kirim uang': 'kirim uang',
    'mengirim uang': 'kirim uang',
    'kirim saldo': 'kirim saldo',

    'riwayat transaksi': 'riwayat',
    'histori transaksi': 'histori',
    'mutasi transaksi': 'mutasi',
    'aktivitas transaksi': 'aktivitas',

    'kembali ke dashboard': 'dashboard',
    'balik ke dashboard': 'dashboard',
    'pergi ke dashboard': 'dashboard',
    'kembali ke beranda': 'beranda',
    'balik ke beranda': 'beranda',
    'pergi ke beranda': 'beranda',

    'buka pembayaran': 'qris',
    'menu pembayaran': 'qris',
    'bayar pakai qr': 'qris',
    'bayar dengan qr': 'qris',
    'bayar pakai qris': 'qris',
    'bayar dengan qris': 'qris',
    'pindai kode qris': 'qris',
    'scan kode qris': 'qris',
    'buka kris': 'qris',
    'buka q r i s': 'qris',

    'cek uang': 'cek saldo',
    'berapa uang saya': 'cek saldo',
    'berapa saldo saya': 'cek saldo',
    'lihat saldo': 'cek saldo',

    'baca transaksi terakhir': 'transaksi terakhir',
    'bacakan transaksi terakhir': 'transaksi terakhir',
    'mutasi terakhir': 'transaksi terakhir',

    'bantuan halaman ini': 'bantuan',
    'tolong bantu saya': 'bantuan',
  };

  return aliases[text] || text;
}

// ============================================================
// COMMAND REGISTRY
// ============================================================

function buildCommandRegistry() {
  return [
    // --------------------------------------------------------
    // 1. STATUS LOKASI DAN BANTUAN KONTEXTUAL
    // --------------------------------------------------------

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
        /^apa\s+yang\s+bisa\s+saya\s+lakukan(\s+di\s+sini)?$/,
        /^jelaskan\s+halaman\s+ini$/,
        /^bantu\s+saya$/,
      ],
      handler: ({ currentPath, speakText, playSuccessSound }) => {
        playSuccessSound();

        const info = PAGE_CONTEXT_INFO[currentPath] || {
          name: 'SahabatPay',
          help: 'Katakan perintah seperti cek saldo, buka transfer, atau aktifkan mode suara.',
        };

        speakText(`Panduan untuk ${info.name}: ${info.help}`);
      },
      description: '"Bantuan" / "Apa yang bisa saya lakukan di sini?"',
    },

    // --------------------------------------------------------
    // 2. ONBOARDING DAN AUTENTIKASI
    // --------------------------------------------------------

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
        speakText('Masuk sebagai akun demo berhasil. Selamat datang di Beranda SahabatPay.');
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
          'Silakan masukkan nomor handphone dan kata sandi Anda pada formulir. Untuk mencoba instan, Anda juga dapat mengatakan coba akun demo.'
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
          'Pada versi prototype simulasi ini, Anda dapat menggunakan akun demo atau membuat akun baru. Jangan pernah membagikan PIN dan kata sandi kepada orang lain.'
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
          'Untuk kemudahan simulasi prototype, kode OTP verifikasi adalah satu dua tiga empat lima enam. Anda juga dapat menekan tombol Isi Otomatis Kode Demo.'
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

    // --------------------------------------------------------
    // 3. NAVIGASI HALAMAN
    // --------------------------------------------------------

    {
      patterns: [
        /^(buka\s+)?(beranda|dashboard|menu\s+utama|halaman\s+utama|home|halaman\s+depan)$/,
        /^(pergi|kembali|balik)\s+ke\s+(beranda|dashboard|halaman\s+utama)$/,
      ],
      handler: ({ navigate, speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText('Membuka halaman Beranda.');
        navigate('/dashboard');
      },
      description: '"Buka beranda" / "Kembali ke dashboard"',
    },

    {
      patterns: [
        /^(buka\s+)?(riwayat|histori|mutasi|catatan\s+transaksi|aktivitas)$/,
        /^(lihat|tampilkan|buka)\s+(riwayat|histori|mutasi)\s+transaksi$/,
        /^(cek|lihat)\s+transaksi$/,
      ],
      handler: ({ navigate, speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText('Membuka halaman Riwayat Transaksi.');
        navigate('/history');
      },
      description: '"Buka riwayat" / "Lihat mutasi transaksi"',
    },

    {
      patterns: [
        /^(buka\s+)?(profil|akun\s+saya|profil\s+saya|data\s+diri|informasi\s+profil)$/,
      ],
      handler: ({ navigate, speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText('Membuka halaman Profil Saya.');
        navigate('/profile');
      },
      description: '"Buka profil" / "Data diri"',
    },

    {
      patterns: [
        /^(buka\s+)?(pengaturan\s+akun|akun\s+settings|ubah\s+sandi|ganti\s+pin)$/,
      ],
      handler: ({ navigate, speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText('Membuka halaman Pengaturan Akun.');
        navigate('/settings/account');
      },
      description: '"Buka pengaturan akun"',
    },

    {
      patterns: [
        /^(buka\s+)?(aksesibilitas|pengaturan\s+aksesibilitas|preferensi\s+aksesibilitas|a11y)$/,
        /^(ubah|ganti)\s+mode\s+(aksesibilitas|tampilan)$/,
      ],
      handler: ({ navigate, speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText('Membuka halaman Preferensi Aksesibilitas.');
        navigate('/settings/accessibility');
      },
      description: '"Buka aksesibilitas"',
    },

    {
      patterns: [
        /^(buka\s+)?(tentang|about|tentang\s+sahabatpay|informasi\s+aplikasi)$/,
      ],
      handler: ({ navigate, speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText('Membuka halaman Tentang SahabatPay.');
        navigate('/about');
      },
      description: '"Buka tentang SahabatPay"',
    },

    {
      patterns: [
        /^(buka\s+)?(top\s*up|isi\s+saldo|tambah\s+saldo|topup|isi\s+dompet|tambah\s+uang)$/,
        /^saya\s+ingin\s+(isi\s+saldo|top\s*up|menambah\s+saldo)$/,
        /^(saya\s+ingin\s+)?(mengisi|menambah)\s+saldo$/,
      ],
      handler: ({ navigate, speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText('Membuka halaman Top Up. Silakan tentukan nominal yang Anda inginkan.');
        navigate('/top-up');
      },
      description: '"Buka top up" / "Saya ingin menambah saldo"',
    },

    {
      patterns: [
        /^(buka\s+)?(transfer|kirim\s+uang|kirim\s+saldo|transfer\s+saldo)$/,
        /^saya\s+ingin\s+(transfer|kirim\s+uang)$/,
        /^(saya\s+ingin\s+)?(mengirim|memindahkan)\s+uang$/,
      ],
      handler: ({ navigate, speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText('Membuka halaman Transfer Saldo. Cari penerima dan tentukan nominal.');
        navigate('/transfer');
      },
      description: '"Buka transfer" / "Saya ingin mengirim uang"',
    },

    {
      patterns: [
        /^(buka\s+)?(qris|scan|pindai|bayar\s+qris|pembayaran\s+qris)$/,
        /^(saya\s+ingin\s+)?(bayar|melakukan\s+pembayaran)\s+(pakai|dengan)\s+qris$/,
        /^(saya\s+ingin\s+)?(scan|pindai)\s+(qr|qris|kode\s+qr|kode\s+qris)$/,
        /^(buka\s+)?(kris|kueris|kyuris)$/,
        /^(bayar|pembayaran)\s+(di\s+)?(kasir|merchant)$/,
        /^(buka\s+)?kode\s+qris$/,
      ],
      handler: ({ navigate, speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText('Membuka halaman Pembayaran QRIS. Anda dapat memilih merchant atau memindai kode QR.');
        navigate('/qris');
      },
      description: '"Buka QRIS" / "Buka kris" / "Bayar di kasir"',
    },

    {
      patterns: [
        /^(buka\s+)?(daftar\s+penerima|penerima\s+tersimpan|kontak\s+transfer|recipients)$/,
        /^(lihat|tampilkan)\s+(daftar\s+)?penerima$/,
      ],
      handler: ({ navigate, speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText('Membuka halaman Daftar Penerima Transfer.');
        navigate('/recipients');
      },
      description: '"Buka daftar penerima"',
    },

    {
      patterns: [
        /^sembunyikan\s+saldo$/,
        /^tutup\s+saldo$/,
      ],
      handler: ({ navigate, currentPath, speakText, playSuccessSound }) => {
        playSuccessSound();
        if (currentPath !== '/dashboard') navigate('/dashboard');
        window.dispatchEvent(new CustomEvent('sahabatpay:balance-visibility', { detail: { visible: false } }));
        speakText('Saldo disembunyikan dari layar.');
      },
      description: '"Sembunyikan saldo"',
    },

    {
      patterns: [
        /^tampilkan\s+saldo$/,
        /^perlihatkan\s+saldo$/,
      ],
      handler: ({ navigate, currentPath, balance, speakText, playSuccessSound }) => {
        playSuccessSound();
        if (currentPath !== '/dashboard') navigate('/dashboard');
        window.dispatchEvent(new CustomEvent('sahabatpay:balance-visibility', { detail: { visible: true } }));
        speakText(`Saldo ditampilkan. Saldo Anda ${formatRupiah(balance)}.`);
      },
      description: '"Tampilkan saldo"',
    },

    {
      patterns: [
        /^(buka\s+)?(sandbox|mode\s+latihan|tutorial|latihan\s+transaksi)$/,
        /^saya\s+(ingin|mau)\s+(latihan|coba\s+tutorial)$/,
      ],
      handler: ({ navigate, speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText('Membuka Mode Latihan Sandbox. Semua saldo dan transaksi di sini bersifat latihan dan terpisah dari dompet utama.');
        navigate('/sandbox');
      },
      description: '"Buka sandbox" / "Mode latihan"',
    },

    {
      patterns: [
        /^(kembali|balik)$/,
        /^kembali\s+ke\s+beranda$/,
        /^pergi\s+ke\s+beranda$/,
      ],
      handler: ({ navigate, speakText, playSuccessSound }) => {
        playSuccessSound();
        speakText('Kembali ke halaman Beranda.');
        navigate('/dashboard');
      },
      description: '"Kembali" / "Kembali ke beranda"',
    },

    // --------------------------------------------------------
    // 4. INFORMASI SALDO DAN TRANSAKSI
    // --------------------------------------------------------

    {
      patterns: [
        /^(berapa\s+)?(saldo|saldo\s+saya|cek\s+saldo|cek\s+uang|uang\s+saya|dompet)(\s+saya)?(\s+sekarang)?$/,
        /^bacakan\s+saldo(\s+saya)?$/,
        /^lihat\s+saldo$/,
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
          const isIncome =
            last.type === 'top_up' || last.type === 'transfer_in';

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
          speakText(
            `Anda memiliki ${transactions.length} mutasi transaksi. Membuka halaman riwayat transaksi.`
          );
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
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        const outcome = (transactions || [])
          .filter((t) => t.type !== 'top_up' && t.type !== 'transfer_in')
          .reduce((sum, t) => sum + (t.amount || 0), 0);

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
      patterns: [
        /^(bacakan\s+)?(total\s+uang\s+masuk|pemasukan\s+total)$/,
      ],
      handler: ({ transactions, speakText, playSuccessSound }) => {
        playSuccessSound();

        const total = (transactions || [])
          .filter((t) => t.type === 'top_up' || t.type === 'transfer_in')
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        speakText(`Total uang masuk Anda adalah ${formatRupiah(total)}.`);
      },
      description: '"Bacakan total uang masuk"',
    },

    {
      patterns: [
        /^(bacakan\s+)?(total\s+uang\s+keluar|pengeluaran\s+total)$/,
      ],
      handler: ({ transactions, speakText, playSuccessSound }) => {
        playSuccessSound();

        const total = (transactions || [])
          .filter((t) => t.type !== 'top_up' && t.type !== 'transfer_in')
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        speakText(`Total uang keluar Anda adalah ${formatRupiah(total)}.`);
      },
      description: '"Bacakan total uang keluar"',
    },

    {
      patterns: [
        /^(bacakan\s+)?(status\s+akun|informasi\s+akun|data\s+akun)$/,
      ],
      handler: ({ user, balance, transactions, speakText, playSuccessSound }) => {
        playSuccessSound();

        const name = user?.name || 'Pengguna';

        speakText(
          `Akun atas nama ${name} dalam status aktif dengan saldo ${formatRupiah(balance)} dan ${(transactions || []).length} transaksi tercatat.`
        );
      },
      description: '"Bacakan status akun"',
    },

    // --------------------------------------------------------
    // 5. MODE AKSESIBILITAS
    // --------------------------------------------------------

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
        /^(saya\s+)?(tuna\s*netra|tunanetra)$/,
        /^(pakai|gunakan|pilih)\s+(mode\s+)?(panduan\s+)?audio$/,
        /^saya\s+(ingin|mau)\s+(menggunakan|pakai)\s+(suara|mode\s+audio)$/,
      ],
      handler: ({ setMode, speakText, playSuccessSound }) => {
        setMode('audio');
        playSuccessSound();
        speakText('Audio Guidance Mode diaktifkan. Panduan suara siap mendampingi Anda di setiap halaman.');
      },
      description: '"Aktifkan panduan suara" / "Saya tuna netra" / "Pakai mode panduan audio"',
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

    // --------------------------------------------------------
    // 6. TREMOR SHIELD DAN COGNITIVE DELAY
    // --------------------------------------------------------

    {
      patterns: [
        /^aktifkan\s+(tremor\s+shield|pelindung\s+tremor|tremor)$/,
      ],
      handler: ({ setTremorShieldEnabled, speakText, playSuccessSound }) => {
        setTremorShieldEnabled(true);
        playSuccessSound();
        speakText('Tremor Shield diaktifkan. Konfirmasi transaksi kini memerlukan penahanan tombol.');
      },
      description: '"Aktifkan Tremor Shield"',
    },

    {
      patterns: [
        /^(matikan|nonaktifkan)\s+(tremor\s+shield|pelindung\s+tremor|tremor)$/,
      ],
      handler: ({ setTremorShieldEnabled, speakText, playSuccessSound }) => {
        setTremorShieldEnabled(false);
        playSuccessSound();
        speakText('Tremor Shield dinonaktifkan.');
      },
      description: '"Matikan Tremor Shield"',
    },

    {
      patterns: [
        /^(ubah\s+durasi\s+tremor\s+shield\s+menjadi\s+)?(satu\s+detik|1\s+detik)$/,
      ],
      handler: ({ setTremorDuration, speakText, playSuccessSound }) => {
        setTremorDuration(1000);
        playSuccessSound();
        speakText('Durasi Tremor Shield diubah menjadi satu detik.');
      },
      description: '"Ubah durasi Tremor Shield menjadi satu detik"',
    },

    {
      patterns: [
        /^(ubah\s+durasi\s+tremor\s+shield\s+menjadi\s+)?(satu\s+setengah\s+detik|1[,.]5\s+detik|satu\s+koma\s+lima\s+detik)$/,
      ],
      handler: ({ setTremorDuration, speakText, playSuccessSound }) => {
        setTremorDuration(1500);
        playSuccessSound();
        speakText('Durasi Tremor Shield diubah menjadi satu setengah detik.');
      },
      description: '"Ubah durasi Tremor Shield menjadi satu setengah detik"',
    },

    {
      patterns: [
        /^(ubah\s+durasi\s+tremor\s+shield\s+menjadi\s+)?(dua\s+detik|2\s+detik)$/,
      ],
      handler: ({ setTremorDuration, speakText, playSuccessSound }) => {
        setTremorDuration(2000);
        playSuccessSound();
        speakText('Durasi Tremor Shield diubah menjadi dua detik.');
      },
      description: '"Ubah durasi Tremor Shield menjadi dua detik"',
    },

    {
      patterns: [
        /^aktifkan\s+(cognitive\s+delay|jeda\s+telaah|cognitive)$/,
      ],
      handler: ({ setCognitiveDelayEnabled, speakText, playSuccessSound }) => {
        setCognitiveDelayEnabled(true);
        playSuccessSound();
        speakText('Cognitive Delay Shield diaktifkan. Jeda sepuluh detik sebelum konfirmasi transaksi aktif.');
      },
      description: '"Aktifkan Cognitive Delay Shield"',
    },

    {
      patterns: [
        /^(matikan|nonaktifkan)\s+(cognitive\s+delay|jeda\s+telaah|cognitive)$/,
      ],
      handler: ({ setCognitiveDelayEnabled, speakText, playSuccessSound }) => {
        setCognitiveDelayEnabled(false);
        playSuccessSound();
        speakText('Cognitive Delay Shield dinonaktifkan.');
      },
      description: '"Matikan Cognitive Delay Shield"',
    },

    // --------------------------------------------------------
    // 7. KONTROL AUDIO DAN KELUAR
    // --------------------------------------------------------

    {
      patterns: [
        /^(hentikan\s+suara|stop\s+suara|diam|berhenti\s+bicara|hentikan\s+audio)$/,
      ],
      handler: ({ stopSpeech }) => {
        stopSpeech();
      },
      description: '"Diam" / "Hentikan suara"',
    },

    {
      patterns: [
        /^(ulangi|ulang|ulangi\s+panduan|ulang\s+panduan|baca\s+ulang)$/,
      ],
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

  const {
    mode,
    setMode,
    setTremorShieldEnabled,
    setCognitiveDelayEnabled,
    setTremorDuration,
  } = useA11y();

  const { balance, transactions } = useWallet();

  const {
    speakText,
    stopSpeech,
    repeatLastSpeech,
    playSuccessSound,
    playErrorSound,
  } = useAudioGuidance();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef(null);
  const isProcessingRef = useRef(false);
  const executeCommandRef = useRef(null);
  // State machine terstruktur untuk alur Voice-Driven Add Recipient
  const recipientFlowRef = useRef({ step: 'idle', alias: '', phone: '' });

  // Ref khusus untuk push-to-talk.
  const pendingTranscriptRef = useRef('');
  const recognitionActiveRef = useRef(false);
  const shouldProcessRef = useRef(false);

  // ----------------------------------------------------------
  // INISIALISASI SPEECH RECOGNITION
  // ----------------------------------------------------------

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
      recognitionActiveRef.current = true;
      shouldProcessRef.current = false;
      pendingTranscriptRef.current = '';

      setIsListening(true);
      setErrorMessage('');
      setTranscript('');

      isProcessingRef.current = false;
    };

    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const recognizedText = result?.[0]?.transcript?.trim();

      if (!recognizedText) return;

      // Tampung hasil pengenalan suara.
      // Command belum dijalankan sampai tombol dilepas.
      pendingTranscriptRef.current = recognizedText;
      setTranscript(recognizedText);
    };

    recognition.onerror = (event) => {
      recognitionActiveRef.current = false;
      pendingTranscriptRef.current = '';
      shouldProcessRef.current = false;

      setIsListening(false);
      isProcessingRef.current = false;

      if (event.error === 'aborted') return;

      playErrorSound();

      if (event.error === 'not-allowed') {
        const err =
          'Izin mikrofon ditolak. Silakan izinkan akses mikrofon di peramban Anda untuk menggunakan Voice Command.';

        setErrorMessage(err);
        speakText(err);
      } else if (event.error === 'no-speech') {
        const err =
          'Suara tidak terdeteksi. Silakan tekan tombol Bicara dan coba lagi.';

        setErrorMessage(err);
        speakText(err);
      } else {
        const err = 'Gagal mengenali suara. Silakan coba lagi.';
        setErrorMessage(err);
      }
    };

    recognition.onend = () => {
      recognitionActiveRef.current = false;
      setIsListening(false);

      // Jangan proses jika pengguna belum melepas tombol.
      if (!shouldProcessRef.current) return;

      shouldProcessRef.current = false;

      const text = pendingTranscriptRef.current;
      pendingTranscriptRef.current = '';

      if (text) {
        executeCommandRef.current?.(text);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognitionActiveRef.current = false;
      pendingTranscriptRef.current = '';
      shouldProcessRef.current = false;

      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Recognition mungkin sudah berhenti.
        }
      }
    };
  }, [playErrorSound, speakText]);

  // ----------------------------------------------------------
  // CONTEXT UNTUK COMMAND HANDLER
  // ----------------------------------------------------------

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
    navigate,
    location.pathname,
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
  ]);

  // ----------------------------------------------------------
  // EKSEKUSI COMMAND LOKAL DAN AI FALLBACK
  // ----------------------------------------------------------

  const executeCommandFromText = useCallback(
    async (rawText) => {
      const clean = normalizeVoiceText(rawText);

      setLastCommand(rawText);

      const ctx = buildContext();

      // 0A. State Machine: Voice-Driven Add Recipient
      const flow = recipientFlowRef.current;
      if (flow.step !== 'idle') {
        if (/^(batal|batalkan|kembali|saya\s+berubah\s+pikiran|keluar)$/.test(clean)) {
          recipientFlowRef.current = { step: 'idle', alias: '', phone: '' };
          playSuccessSound();
          speakText('Penambahan penerima baru dibatalkan.');
          return;
        }

        if (flow.step === 'awaiting_name') {
          const aliasText = String(rawText || '').trim().slice(0, 50);
          if (aliasText.length < 2) {
            playErrorSound();
            speakText('Nama penerima terlalu pendek. Silakan sebutkan kembali nama atau alias penerima.');
            return;
          }
          recipientFlowRef.current = { step: 'awaiting_phone', alias: aliasText, phone: '' };
          playSuccessSound();
          navigate('/recipients', { state: { openAddModal: true, voiceDraft: { alias: aliasText, phone: '' } } });
          speakText(`Nama penerima ${aliasText}. Sekarang sebutkan nomor telepon penerima minimal sembilan digit.`);
          return;
        }

        if (flow.step === 'awaiting_phone') {
          const digits = String(rawText || '').replace(/\D/g, '');
          if (digits.length < 9) {
            playErrorSound();
            speakText('Nomor telepon belum lengkap atau kurang dari sembilan digit. Silakan ulangi nomor telepon penerima.');
            return;
          }
          const myDigits = String(ctx.user?.phone || '').replace(/\D/g, '');
          if (myDigits && digits === myDigits) {
            playErrorSound();
            speakText('Anda tidak dapat menyimpan nomor telepon Anda sendiri. Silakan sebutkan nomor penerima lain.');
            return;
          }
          const registered = findRegisteredUser(digits);
          recipientFlowRef.current = { step: 'awaiting_confirm', alias: flow.alias, phone: digits };
          playSuccessSound();
          navigate('/recipients', { state: { openAddModal: true, voiceDraft: { alias: flow.alias, phone: digits } } });
          const regNote = registered
            ? `Nomor terdaftar atas nama ${registered.name}.`
            : 'Nomor belum terdaftar di SahabatPay, sehingga akan disimpan sebagai penerima simulasi.';
          speakText(
            `Tinjau penerima baru: Nama ${flow.alias}, nomor ${digits.split('').join(' ')}. ${regNote} Katakan Simpan atau Setuju untuk menyimpan, atau Batal untuk membatalkan.`
          );
          return;
        }

        if (flow.step === 'awaiting_confirm') {
          if (/^(simpan|ya|iya|setuju|lanjut|benar|oke|ok)$/.test(clean)) {
            const ownerId = ctx.user?.id || ctx.user?.phone || '';
            const res = addSavedRecipient(ownerId, ctx.user?.phone || '', flow.phone, flow.alias);
            recipientFlowRef.current = { step: 'idle', alias: '', phone: '' };
            if (res.success) {
              playSuccessSound();
              window.dispatchEvent(new CustomEvent('sahabatpay:recipients-updated'));
              navigate('/recipients', { state: { openAddModal: false } });
              const simMsg = res.recipient?.isDemo
                ? ' sebagai penerima simulasi'
                : '';
              speakText(`Penerima ${res.recipient.alias} berhasil disimpan${simMsg}.`);
            } else {
              playErrorSound();
              speakText(`Gagal menyimpan penerima: ${res.error}`);
            }
            return;
          }
          playErrorSound();
          speakText('Katakan Simpan atau Setuju untuk menyimpan penerima, atau katakan Batal.');
          return;
        }
      }

      // Trigger Voice-Driven Add Recipient
      if (
        /^(saya\s+(mau|ingin)\s+)?(menambahkan|tambah|tambahkan|simpan)\s+(penerima|nomor\s+tujuan|nomor\s+baru)(\s+baru)?$/.test(clean) ||
        /^tambah\s+penerima$/.test(clean)
      ) {
        if (!ctx.user) {
          playErrorSound();
          speakText('Silakan masuk ke akun terlebih dahulu untuk menambahkan penerima.');
          return;
        }
        recipientFlowRef.current = { step: 'awaiting_name', alias: '', phone: '' };
        playSuccessSound();
        navigate('/recipients', { state: { openAddModal: true, voiceDraft: { alias: '', phone: '' } } });
        speakText('Membuka formulir tambah penerima. Silakan sebutkan nama atau alias penerima yang ingin Anda simpan.');
        return;
      }

      // Cari command di registry lokal.
      const runRegisteredCommand = (commandText) => {
        for (const cmd of COMMAND_REGISTRY) {
          const matched = cmd.patterns.some((pattern) =>
            pattern.test(commandText)
          );

          if (!matched) continue;

          try {
            cmd.handler({
              ...ctx,
              rawText,
              clean: commandText,
            });
          } catch (err) {
            console.error('Voice command handler error:', err);

            playErrorSound();
            speakText(
              'Maaf, perintah mengalami kendala. Silakan coba kembali.'
            );
          }

          return true;
        }

        return false;
      };

      // Prioritas pertama: command lokal.
      if (runRegisteredCommand(clean)) return;

      // Jangan kirim ucapan berpotensi sensitif ke AI.
      const sensitivePatterns = [
        /\b(pin|password|kata sandi|sandi)\b/i,
        /\b\d{6,}\b/,
        /\b\d+\s*(ribu|juta|miliar)\b/i,
        /\b(nomor rekening|rekening|nomor hp|nomor telepon)\b/i,
      ];

      const containsSensitiveData = sensitivePatterns.some((pattern) =>
        pattern.test(rawText)
      );

      if (containsSensitiveData) {
        playErrorSound();

        speakText(
          'Maaf, perintah tersebut belum dikenali. Demi keamanan, silakan gunakan tombol dan formulir yang tersedia di aplikasi.'
        );

        return;
      }

      // AI hanya dipakai ketika registry lokal gagal.
      try {
        speakText('Sebentar, saya sedang memahami perintah Anda.');

        const result = await interpretVoiceIntent(rawText);

        if (result?.command && runRegisteredCommand(result.command)) {
          return;
        }

        playErrorSound();

        speakText(
          'Maaf, saya belum memahami maksud Anda. Silakan coba dengan kalimat lain.'
        );
      } catch (error) {
        console.warn('AI intent fallback error:', error);

        playErrorSound();

        speakText(
          'Perintah belum dikenali dan bantuan AI sedang tidak tersedia. Silakan gunakan perintah yang lebih sederhana.'
        );
      }
    },
    [buildContext, playErrorSound, speakText]
  );

  // Selalu gunakan callback terbaru.
  executeCommandRef.current = executeCommandFromText;

  // ----------------------------------------------------------
  // PUSH-TO-TALK: MULAI MENDENGARKAN
  // ----------------------------------------------------------

  const startListening = useCallback(() => {
    if (!isSupported) {
      const err =
        'Peramban Anda belum mendukung fitur Voice Command. Silakan gunakan peramban yang mendukung pengenalan suara.';

      setErrorMessage(err);
      speakText(err);
      return;
    }

    if (!recognitionRef.current || recognitionActiveRef.current) {
      return;
    }

    try {
      stopSpeech();

      setTranscript('');
      setErrorMessage('');

      pendingTranscriptRef.current = '';
      shouldProcessRef.current = false;
      isProcessingRef.current = false;

      recognitionRef.current.start();
    } catch (err) {
      console.warn('Recognition start error:', err);

      setErrorMessage(
        'Mikrofon belum siap. Silakan tekan tombol Bicara kembali.'
      );
    }
  }, [isSupported, stopSpeech, speakText]);

  // ----------------------------------------------------------
  // PUSH-TO-TALK: BERHENTI DAN PROSES UCAPAN
  // ----------------------------------------------------------

  const stopListening = useCallback(() => {
    // Pengguna telah melepas tombol Bicara.
    shouldProcessRef.current = true;

    if (recognitionActiveRef.current && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.warn('Recognition stop error:', error);
      }
    } else {
      // Menangani kondisi browser yang menghentikan
      // recognition sebelum pengguna melepas tombol.
      const text = pendingTranscriptRef.current;

      pendingTranscriptRef.current = '';
      shouldProcessRef.current = false;

      setIsListening(false);

      if (text) {
        executeCommandRef.current?.(text);
      }
    }
  }, []);

  // ----------------------------------------------------------
  // DATA YANG DIKEMBALIKAN HOOK
  // ----------------------------------------------------------

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
