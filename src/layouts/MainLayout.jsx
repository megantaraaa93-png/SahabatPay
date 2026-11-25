import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import BottomNav from '../components/common/BottomNav';

/**
 * Layout utama dengan navigasi bawah (mobile) atau sidebar (desktop).
 * Prototype banner dan status offline selalu tampil di atas.
 * Catatan: VoiceCommandButton kini diletakkan di App.jsx agar aktif global di seluruh aplikasi.
 */
export default function MainLayout() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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

        {/* Banner status offline */}
        {!isOnline && (
          <div
            className="bg-red-50 border-b border-red-200 px-4 py-2 text-center flex items-center justify-center gap-2"
            role="alert"
            aria-live="assertive"
          >
            <WifiOff size={14} className="text-red-700 shrink-0" aria-hidden="true" />
            <p className="text-xs text-red-800 font-semibold">
              Anda sedang offline. AI Assistant dan layanan server memerlukan koneksi internet.
            </p>
          </div>
        )}

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
