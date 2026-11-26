/**
 * Card container SahabatPay — Forest Green brand identity.
 *
 * @param {string}  props.className  - Extra Tailwind classes
 * @param {boolean} props.hoverable  - Hover lift & border effect
 * @param {boolean} props.padded     - Default inner padding (true by default)
 * @param {React.ReactNode} props.children
 */
export default function Card({
  className = '',
  hoverable = false,
  padded = true,
  children,
  ...rest
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-brand-border shadow-card ${
        padded ? 'p-5' : ''
      } ${
        hoverable
          ? 'transition-all duration-200 hover:shadow-card-md hover:border-brand-muted/30 cursor-pointer active:scale-[0.995]'
          : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
