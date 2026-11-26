import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  History,
  Accessibility,
  UserRound,
} from 'lucide-react';
import { useA11y } from '../../context/A11yContext';
import Logo from './Logo';

const navItems = [
  { to: '/dashboard',              label: 'Beranda',        icon: LayoutDashboard },
  { to: '/history',                label: 'Riwayat',        icon: History },
  { to: '/settings/accessibility', label: 'Aksesibilitas',  icon: Accessibility },
  { to: '/profile',                label: 'Profil',         icon: UserRound },
];

/**
 * BottomNav — mobile bottom bar + desktop sidebar.
 * Menggunakan Forest Green brand identity.
 */
export default function BottomNav() {
  const { isEasyMode } = useA11y();
  const location = useLocation();

  return (
    <nav
      aria-label="Navigasi utama"
      className={`
        fixed bottom-0 left-0 right-0 z-50
        bg-white border-t border-brand-border shadow-card-md
        md:static md:border-t-0 md:shadow-none md:border-r md:border-brand-border
        md:w-64 md:min-h-screen md:flex md:flex-col
      `}
    >
      {/* ---- Desktop: Brand Header ---- */}
      <div className="hidden md:flex items-center gap-3 px-5 py-5 border-b border-brand-border">
        <Logo size="sm" className="shrink-0" />
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-brand-charcoal leading-tight">
            SahabatPay
          </h2>
          <p className="text-xs text-brand-muted font-medium truncate">
            Satu Dompet, Semua Bisa
          </p>
        </div>
      </div>

      {/* ---- Nav Items ---- */}
      <ul
        className={`
          flex md:flex-col md:gap-1 md:p-3 md:flex-1
          ${isEasyMode ? 'justify-around' : 'justify-around'}
        `}
        role="list"
      >
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive =
            location.pathname === to ||
            (to !== '/dashboard' && location.pathname.startsWith(to));

          return (
            <li key={to} role="listitem">
              <NavLink
                to={to}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  flex flex-col items-center gap-1 py-2 px-3 rounded-xl
                  transition-all duration-200
                  md:flex-row md:gap-3 md:px-4 md:py-3
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest
                  ${isEasyMode ? 'py-3 px-4' : ''}
                  ${
                    isActive
                      ? 'text-brand-forest md:bg-brand-forest/8'
                      : 'text-brand-muted hover:text-brand-charcoal md:hover:bg-brand-cream'
                  }
                `}
              >
                <Icon
                  size={isEasyMode ? 28 : 22}
                  strokeWidth={isActive ? 2.5 : 1.75}
                  aria-hidden="true"
                />
                <span
                  className={`${isEasyMode ? 'text-sm' : 'text-[11px]'} md:text-sm font-${isActive ? 'semibold' : 'medium'}`}
                >
                  {label}
                </span>
                {/* Active indicator dot — mobile only */}
                {isActive && (
                  <span
                    className="absolute bottom-1 w-1 h-1 rounded-full bg-brand-forest md:hidden"
                    aria-hidden="true"
                  />
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>

      {/* ---- Desktop: Prototype notice ---- */}
      <div className="hidden md:block px-5 py-4 border-t border-brand-border mt-auto">
        <p className="text-[10px] text-brand-muted text-center leading-tight">
          PROTOTYPE SIMULASI
          <br />
          Tidak menggunakan uang nyata
        </p>
      </div>
    </nav>
  );
}
