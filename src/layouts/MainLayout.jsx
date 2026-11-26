import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import BottomNav from '../components/common/BottomNav';

/**
 * Layout utama SahabatPay.
 * - Desktop: sidebar kiri + main content area
 * - Mobile:  full content + fixed bottom nav
 * - Banner prototype + status offline
 */
export default function MainLayout() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col md:flex-row relative">
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex relative">
        <BottomNav />
      </div>

      {/* Main content area */}
      <main className="flex-1 pb-20 md:pb-0 min-w-0">
        {/* Prototype banner */}
        <div
          className="bg-brand-forest/8 border-b border-brand-forest/15 px-4 py-1.5 text-center"
          role="status"
          aria-label="Peringatan: Ini adalah prototype simulasi"
        >
          <p className="text-xs text-brand-forest font-semibold">
            ⚠ PROTOTYPE SIMULASI — Tidak menggunakan uang nyata
          </p>
        </div>

        {/* Offline banner */}
        {!isOnline && (
          <div
            className="bg-brand-coral/10 border-b border-brand-coral/30 px-4 py-2 text-center flex items-center justify-center gap-2"
            role="alert"
            aria-live="assertive"
          >
            <WifiOff size={14} className="text-brand-coral shrink-0" aria-hidden="true" />
            <p className="text-xs text-brand-coral font-semibold">
              Anda sedang offline. AI Assistant dan layanan server memerlukan koneksi internet.
            </p>
          </div>
        )}

        {/* Page content */}
        <div className="max-w-2xl mx-auto px-4 py-5 md:py-7">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav — mobile only */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
