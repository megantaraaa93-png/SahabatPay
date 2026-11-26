import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

/**
 * Modal reusable SahabatPay — aksesibel penuh dengan focus trap,
 * keyboard Escape, dan restorasi fokus ke elemen pemicu.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  showDefaultFooter = false,
  size = 'md', // 'sm' | 'md' | 'lg'
}) {
  const modalRef = useRef(null);
  const closeBtnRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const prevIsOpenRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Focus management on open/close
  useEffect(() => {
    let focusTimer = null;
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (!prevIsOpenRef.current) {
        prevIsOpenRef.current = true;
        previouslyFocusedRef.current = document.activeElement;
        focusTimer = setTimeout(() => {
          if (!modalRef.current) return;
          if (modalRef.current.contains(document.activeElement)) return;
          const firstInput = modalRef.current.querySelector(
            'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])'
          );
          if (firstInput) firstInput.focus();
          else if (closeBtnRef.current) closeBtnRef.current.focus();
        }, 50);
      }
    } else {
      document.body.style.overflow = 'unset';
      if (prevIsOpenRef.current) {
        prevIsOpenRef.current = false;
        if (previouslyFocusedRef.current?.focus) {
          previouslyFocusedRef.current.focus();
        }
      }
    }
    return () => { if (focusTimer) clearTimeout(focusTimer); };
  }, [isOpen]);

  // Keyboard: Escape + Tab focus trap
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => () => { document.body.style.overflow = 'unset'; }, []);

  if (!isOpen) return null;

  const maxWidths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-charcoal/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        ref={modalRef}
        className={`w-full ${maxWidths[size]} bg-white rounded-2xl shadow-card-lg border border-brand-border overflow-hidden animate-slide-up`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border">
          <h2 id="modal-title" className="text-base font-bold text-brand-charcoal">
            {title}
          </h2>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="p-2 text-brand-muted hover:text-brand-charcoal hover:bg-brand-cream rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest"
            aria-label="Tutup jendela dialog"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 text-brand-charcoal text-sm leading-relaxed max-h-[75vh] overflow-y-auto">
          {children}
        </div>

        {/* Default footer */}
        {showDefaultFooter && (
          <div className="px-6 py-4 bg-brand-cream/50 border-t border-brand-border flex justify-end">
            <Button variant="primary" size="md" onClick={onClose}>
              Mengerti
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
