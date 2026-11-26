import { useA11y } from '../../context/A11yContext';
import { AlertCircle } from 'lucide-react';

/**
 * Input field aksesibel SahabatPay.
 * Selalu memiliki label terhubung, error/hint state, dan support Easy Mode.
 *
 * @param {string} props.id        - Unique ID (required for label binding)
 * @param {string} props.label     - Label text
 * @param {string} props.type      - Input type
 * @param {string} props.error     - Error message
 * @param {string} props.hint      - Helper text
 * @param {React.ReactNode} props.icon      - Left icon
 * @param {React.ReactNode} props.iconRight - Right icon (non-interactive)
 */
export default function Input({
  id,
  label,
  type = 'text',
  placeholder,
  error,
  hint,
  icon,
  iconRight,
  className = '',
  ...rest
}) {
  const { isEasyMode } = useA11y();

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className={`font-semibold text-brand-charcoal ${isEasyMode ? 'text-base' : 'text-sm'}`}
        >
          {label}
        </label>
      )}

      <div className="relative">
        {icon && (
          <span
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={
            error ? `${id}-error` : hint ? `${id}-hint` : undefined
          }
          className={`w-full rounded-xl border bg-white text-brand-charcoal
            transition-all duration-200
            focus:outline-none focus:ring-2
            placeholder:text-brand-muted/50
            disabled:opacity-50 disabled:cursor-not-allowed
            ${icon ? 'pl-10' : 'pl-4'}
            ${iconRight ? 'pr-10' : 'pr-4'}
            ${isEasyMode ? 'py-4 text-base min-h-[64px]' : 'py-2.5 text-sm min-h-[44px]'}
            ${
              error
                ? 'border-brand-coral bg-brand-coral/5 focus:ring-brand-coral/20 focus:border-brand-coral'
                : 'border-brand-border focus:ring-brand-forest/20 focus:border-brand-forest'
            }`}
          {...rest}
        />
        {iconRight && (
          <span
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-muted"
            aria-hidden="true"
          >
            {iconRight}
          </span>
        )}
      </div>

      {hint && !error && (
        <p id={`${id}-hint`} className={`text-brand-muted ${isEasyMode ? 'text-sm' : 'text-xs'}`}>
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          className={`text-brand-coral flex items-center gap-1.5 font-medium ${isEasyMode ? 'text-sm' : 'text-xs'}`}
          role="alert"
        >
          <AlertCircle size={14} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
