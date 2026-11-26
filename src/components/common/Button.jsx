import { useA11y } from '../../context/A11yContext';

/**
 * Button reusable SahabatPay — Brand identity Forest Green.
 *
 * Variants: primary | secondary | outline | ghost | danger | icon
 * Sizes:    sm | md | lg
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  iconRight,
  ariaLabel,
  disabled = false,
  loading = false,
  children,
  className = '',
  ...rest
}) {
  const { isEasyMode } = useA11y();

  const effectiveSize = isEasyMode ? 'lg' : size;

  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-xl ' +
    'transition-all duration-200 select-none ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

  const variants = {
    primary:
      'bg-brand-forest text-white hover:bg-brand-forest/90 ' +
      'focus-visible:ring-brand-forest shadow-sm',
    secondary:
      'bg-brand-emerald text-white hover:bg-brand-emerald/90 ' +
      'focus-visible:ring-brand-emerald shadow-sm',
    outline:
      'border-2 border-brand-forest text-brand-forest bg-transparent ' +
      'hover:bg-brand-forest hover:text-white ' +
      'focus-visible:ring-brand-forest',
    ghost:
      'text-brand-charcoal bg-transparent ' +
      'hover:bg-brand-forest/8 ' +
      'focus-visible:ring-brand-forest',
    danger:
      'bg-brand-coral text-white hover:bg-brand-coral/90 ' +
      'focus-visible:ring-brand-coral shadow-sm',
    icon:
      'text-brand-muted bg-transparent hover:text-brand-charcoal hover:bg-brand-forest/8 ' +
      'focus-visible:ring-brand-forest rounded-xl p-2',
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm min-h-[36px]',
    md: 'px-5 py-2.5 text-sm min-h-[44px]',
    lg: 'px-6 py-4 text-base min-h-[56px]',
  };

  const isIconOnly = variant === 'icon';

  return (
    <button
      className={`${base} ${variants[variant]} ${isIconOnly ? '' : sizes[effectiveSize]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-busy={loading}
      {...rest}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      ) : (
        icon && <span className="shrink-0" aria-hidden="true">{icon}</span>
      )}
      {children}
      {iconRight && !loading && (
        <span className="shrink-0" aria-hidden="true">{iconRight}</span>
      )}
    </button>
  );
}
