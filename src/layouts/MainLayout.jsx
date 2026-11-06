import { Outlet } from 'react-router-dom';
import BottomNav from '../components/common/BottomNav';

/**
 * Layout utama dengan navigasi bawah (mobile) atau sidebar (desktop).
 * Prototype banner selalu tampil di atas.
 * Catatan: VoiceCommandButton kini diletakkan di App.jsx agar aktif global di seluruh aplikasi.
 */
export default function MainLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row relative">
      {/* Sidebar navigasi — desktop */}
      <div className="hidden md:flex">
        <BottomNav />
      </div>

      {/* Konten utama */}
      <main className="flex-1 pb-20 md:pb-0">
        {/* Banner prototype */}
        <div
          className="bg-yellow-50 border-b border-yellow-200 px-4 py-1.5 text-center"
          role="status"
          aria-label="Peringatan: Ini adalah prototype simulasi"
        >
          <p className="text-xs text-yellow-700 font-medium">
            ⚠ PROTOTYPE SIMULASI — Tidak menggunakan uang nyata
          </p>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-4 md:py-6">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav — mobile */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
