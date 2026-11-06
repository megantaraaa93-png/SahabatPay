import { useA11y } from '../../context/A11yContext';

/**
 * Tombol reusable SahabatPay dengan dukungan aksesibilitas penuh.
 *
 * @param {object} props
 * @param {'primary'|'secondary'|'outline'|'ghost'} props.variant - Gaya visual tombol
 * @param {'sm'|'md'|'lg'} props.size - Ukuran tombol
 * @param {boolean} props.fullWidth - Lebar penuh
 * @param {React.ReactNode} props.icon - Ikon di sebelah kiri
 * @param {string} props.ariaLabel - Label aksesibel untuk tombol ikon-saja
 * @param {boolean} props.disabled
 * @param {React.ReactNode} props.children
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  ariaLabel,
  disabled = false,
  children,
  className = '',
  ...rest
}) {
  const { isEasyMode } = useA11y();

  // Ukuran disesuaikan dengan Easy Mode
  const effectiveSize = isEasyMode ? 'lg' : size;

  const baseStyles =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-default focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-primary text-white hover:bg-primary-dark active:bg-primary-dark shadow-sm',
    secondary: 'bg-secondary text-white hover:bg-secondary-dark active:bg-secondary-dark shadow-sm',
    outline: 'border-2 border-primary text-primary hover:bg-primary hover:text-white active:bg-primary-dark',
    ghost: 'text-gray-600 hover:bg-gray-100 active:bg-gray-200',
  };

  const sizeStyles = {
    sm: 'px-3 py-2 text-sm min-h-[40px]',
    md: 'px-5 py-3 text-base min-h-[48px]',
    lg: 'px-6 py-4 text-lg min-h-[64px]',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[effectiveSize]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled}
      aria-label={ariaLabel}
      {...rest}
    >
      {icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
}
