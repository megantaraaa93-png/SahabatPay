import { useA11y } from '../../context/A11yContext';

/**
 * Input field aksesibel SahabatPay dengan label terhubung secara eksplisit.
 *
 * @param {object} props
 * @param {string} props.id - ID unik (wajib, untuk menghubungkan label)
 * @param {string} props.label - Teks label
 * @param {string} props.type - Tipe input
 * @param {string} props.placeholder
 * @param {string} props.error - Pesan error
 * @param {string} props.hint - Teks bantuan
 * @param {React.ReactNode} props.icon - Ikon di sebelah kiri
 */
export default function Input({
  id,
  label,
  type = 'text',
  placeholder,
  error,
  hint,
  icon,
  className = '',
  ...rest
}) {
  const { isEasyMode } = useA11y();

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={id}
        className={`font-medium text-gray-700 ${isEasyMode ? 'text-lg' : 'text-sm'}`}
      >
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
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
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={`w-full rounded-xl border bg-white text-gray-800 transition-default focus:ring-2 focus:ring-primary focus:border-primary ${
            icon ? 'pl-10' : 'pl-4'
          } ${isEasyMode ? 'py-4 text-lg min-h-[64px]' : 'py-3 text-base min-h-[48px]'} ${
            error ? 'border-red-400 bg-red-50' : 'border-gray-200'
          }`}
          {...rest}
        />
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600 flex items-center gap-1" role="alert">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      )}
    </div>
  );
}
