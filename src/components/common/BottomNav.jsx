import { NavLink, useLocation } from 'react-router-dom';
import { Home, Clock, Accessibility, User } from 'lucide-react';
import { useA11y } from '../../context/A11yContext';
import Logo from './Logo';

const navItems = [
  { to: '/dashboard', label: 'Beranda', icon: Home },
  { to: '/history', label: 'Riwayat', icon: Clock },
  { to: '/settings/accessibility', label: 'Aksesibilitas', icon: Accessibility },
  { to: '/profile', label: 'Profil', icon: User },
];

/**
 * Navigasi bawah (mobile) dan sidebar (desktop).
 * Semua item memiliki label teks dan ikon untuk aksesibilitas.
 */
export default function BottomNav() {
  const { isEasyMode } = useA11y();
  const location = useLocation();

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg md:static md:border-t-0 md:shadow-none md:border-r md:border-gray-200 md:w-60 md:min-h-screen"
    >
      {/* Branding Logo Resmi - desktop sidebar */}
      <div className="hidden md:flex items-center gap-3 px-4 py-5 border-b border-gray-100">
        <Logo size="sm" className="shrink-0" />
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-gray-900 leading-tight">SahabatPay</h2>
          <p className="text-[11px] text-gray-500 font-medium truncate">Satu Dompet, Semua Bisa</p>
        </div>
      </div>

      <ul
        className={`flex md:flex-col md:gap-1 md:p-3 ${
          isEasyMode ? 'justify-around' : 'justify-around'
        }`}
        role="list"
      >
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to));

          return (
            <li key={to} role="listitem">
              <NavLink
                to={to}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 px-3 transition-default md:flex-row md:gap-3 md:px-4 md:py-3 md:rounded-xl ${
                  isEasyMode ? 'py-3 px-4' : ''
                } ${
                  isActive
                    ? 'text-primary font-semibold md:bg-red-50'
                    : 'text-gray-500 hover:text-gray-700 md:hover:bg-gray-50'
                }`}
              >
                <Icon
                  size={isEasyMode ? 28 : 22}
                  strokeWidth={isActive ? 2.5 : 2}
                  aria-hidden="true"
                />
                <span className={`${isEasyMode ? 'text-sm font-medium' : 'text-xs'} md:text-sm`}>
                  {label}
                </span>
              </NavLink>
            </li>
          );
        })}
      </ul>

      {/* Label prototype kecil di sidebar */}
      <div className="hidden md:block mt-auto px-4 py-3 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 text-center leading-tight">
          PROTOTYPE SIMULASI
          <br />
          Tidak menggunakan uang nyata
        </p>
      </div>
    </nav>
  );
}
