/**
 * Card container reusable SahabatPay.
 *
 * @param {object} props
 * @param {string} props.className - Kelas tambahan
 * @param {boolean} props.hoverable - Efek hover
 * @param {React.ReactNode} props.children
 */
export default function Card({ className = '', hoverable = false, children, ...rest }) {
  return (
    <div
      className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 ${
        hoverable ? 'hover:shadow-md hover:border-gray-200 transition-default cursor-pointer' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
