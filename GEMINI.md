# Aturan Proyek SahabatPay

Dokumen ini berisi standar rekayasa, desain, aksesibilitas, dan tata kelola kode untuk pengembangan web application prototype **SahabatPay** (*"Satu Dompet, Semua Bisa"*). Aturan ini wajib dipatuhi pada setiap iterasi.

---

## 1. Arsitektur & Prinsip Komponen
- **Functional Components & Hooks**: Gunakan secara eksklusif React Functional Components dan React Hooks standar maupun custom hooks.
- **Komponen Reusable**: Bangun komponen UI yang modular dan dapat digunakan kembali (contoh: `Button`, `Input`, `Card`, `Modal`, `AudioAnnouncer`).
- **Pemisahan Tanggung Jawab (Separation of Concerns)**:
  - `src/components/`: Komponen UI dan komponen a11y yang reusable.
  - `src/pages/`: Tampilan halaman per rute navigasi.
  - `src/layouts/`: Kerangka layout halaman (misal: navigasi, status bar, floating a11y bar).
  - `src/context/`: Manajemen state global (`AuthContext`, `WalletContext`, `A11yContext`).
  - `src/utils/` & `src/services/`: Logika format angka/mata uang, kalkulasi, dan manajemen data demo/LocalStorage.
  - `src/hooks/`: Logika speech synthesis, recognition, dan shortcut keyboard.
- **Minimal Dependencies**: Jangan menambahkan dependensi (library npm) tanpa alasan yang jelas dan persetujuan. Optimalkan Web APIs native (Web Speech API, AudioContext, Storage API).

---

## 2. Desain, Bahasa, & Identitas Visual
- **Bahasa Antarmuka**: Seluruh teks UI, label, pesan notifikasi, dan audio pembaca menggunakan **Bahasa Indonesia**.
- **Palet Warna SahabatPay**:
  - Primary: `#E53935` (Aksen utama & identitas brand)
  - Secondary: `#16865B` (Aksi sukses, pertumbuhan finansial)
  - Background: `#FFF5F4` (Latar belakang utama yang hangat dan nyaman)
  - Surface: `#F4F8F5` (Latar card, kontainer, modal)
- **Styling**: Gunakan **Tailwind CSS** secara konsisten dengan utility classes yang bersih.
- **Status Multi-Indikator**: **Dilarang** mengandalkan warna semata untuk menyampaikan status atau error. Selalu kombinasikan dengan ikon jelas, teks deskriptif, dan atribut `aria-live`.

---

## 3. Aksesibilitas (A11y) & Inklusivitas (WCAG Standard)
- **Semantic HTML**: Wajib menggunakan elemen HTML semantis (`<button>`, `<main>`, `<nav>`, `<header>`, `<section>`, `<article>`, `<label>`).
- **Form & Input Accessibility**: Setiap input field wajib memiliki elemen `<label>` yang terhubung secara eksplisit melalui atribut `htmlFor` dan `id`.
- **Keyboard Navigation**:
  - Seluruh komponen interaktif harus dapat diakses dan dioperasikan penuh menggunakan keyboard (`Tab`, `Shift+Tab`, `Enter`, `Space`, `Escape`).
  - Indikator fokus (`focus-visible`) harus tegas, tebal, dan mudah terlihat di semua mode.
- **Accessible Names**: Jika sebuah tombol atau kontrol hanya menggunakan ikon, wajib menyematkan atribut `aria-label` yang jelas dan deskriptif dalam Bahasa Indonesia.
- **Audio Guidance**:
  - Tidak boleh memutar audio secara otomatis (*autoplay*) tanpa izin atau kontrol langsung pengguna.
  - Setiap output suara/audio guidance harus dapat dihentikan (*pause/stop/mute*) kapan saja oleh pengguna.
- **Easy Mode**:
  - Menyederhanakan tata letak (ukuran target sentuh minimal 64px, jarak lapang, tipografi besar, alur bertahap).
  - Tidak boleh memangkas informasi penting, verifikasi PIN, atau detail konfirmasi keamanan transaksi.

---

## 4. Keaslian Prototype & Fungsionalitas
- **Fungsi Nyata pada Semua Tombol**: Semua tombol dan kontrol yang tampil harus memiliki fungsi nyata di dalam konteks prototype (bukan tautan kosong `href="#"` atau tombol tanpa handler/aksi).
- **Tanpa Elemen Dekoratif Menipu**: Hindari membuat tombol atau link tiruan yang tidak melakukan apa-apa. Jika fitur masih simulasi, tampilkan modal/notifikasi penjelasan simulasi.

---

## 5. Tata Kelola Perubahan & Verifikasi Kualitas
- **Komunikasi Rencana**: Sebelum mengubah atau membuat banyak file, jelaskan rencana implementasi terlebih dahulu.
- **Preservasi Fitur**: Dilarang menghapus atau merombak fitur yang sudah dibangun sebelumnya tanpa persetujuan pengguna.
- **Verifikasi Build**: Setelah melakukan perubahan, jalankan proses build (`npm run build` atau `vite build`) dan pastikan tidak ada error kompilasi, sintaks, atau warning fatal.
- **Laporan Pasca-Implementasi**: Setelah setiap sesi implementasi, jelaskan secara ringkas:
  1. File-file yang telah dibuat/diubah.
  2. Fitur baru yang berhasil diimplementasikan.
  3. Cara menguji fitur tersebut (langkah pengujian manual / alur pengguna).
