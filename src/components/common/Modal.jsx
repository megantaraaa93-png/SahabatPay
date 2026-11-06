import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

/**
 * Modal reusable yang aksesibel:
 * - Menangkap tombol Escape untuk menutup.
 * - Mengembalikan fokus keyboard saat ditutup ke elemen pemanggil.
 * - Trap fokus ketat (Focus Trap) untuk tombol Tab dan Shift+Tab.
 * - Mengarahkan fokus inisial SEKALI SAJA saat modal pertama kali dibuka,
 *   sehingga tidak mengganggu fokus atau kursor saat pengguna mengetik di input.
 */
export default function Modal({ isOpen, onClose, title, children, showDefaultFooter = false }) {
  const modalRef = useRef(null);
  const closeBtnRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const prevIsOpenRef = useRef(false);
  const onCloseRef = useRef(onClose);

  // Selalu sinkronkan onCloseRef dengan callback onClose terbaru tanpa memicu re-render
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Efek 1: Inisialisasi fokus saat modal pertama kali dibuka dan restorasi saat ditutup
  useEffect(() => {
    let focusTimer = null;

    if (isOpen) {
      document.body.style.overflow = 'hidden';

      // HANYA jalankan inisialisasi fokus saat transisi dari tertutup ke terbuka
      if (!prevIsOpenRef.current) {
        prevIsOpenRef.current = true;
        previouslyFocusedRef.current = document.activeElement;

        // Beri jeda kecil agar elemen DOM di dalam modal siap menerima fokus
        focusTimer = setTimeout(() => {
          if (!modalRef.current) return;

          // Jika fokus sudah berada di dalam modal (misal pengguna sudah mengklik input), jangan ganggu
          if (modalRef.current.contains(document.activeElement)) {
            return;
          }

          // Cari elemen input, textarea, atau select pertama di dalam modal
          const firstInput = modalRef.current.querySelector(
            'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])'
          );

          if (firstInput) {
            firstInput.focus();
          } else if (closeBtnRef.current) {
            closeBtnRef.current.focus();
          }
        }, 50);
      }
    } else {
      document.body.style.overflow = 'unset';

      // Saat modal ditutup, kembalikan fokus ke elemen pemicu sebelumnya
      if (prevIsOpenRef.current) {
        prevIsOpenRef.current = false;
        if (previouslyFocusedRef.current && typeof previouslyFocusedRef.current.focus === 'function') {
          previouslyFocusedRef.current.focus();
        }
      }
    }

    return () => {
      if (focusTimer) clearTimeout(focusTimer);
    };
  }, [isOpen]);

  // Efek 2: Keyboard Focus Trap (Tab & Shift+Tab) dan Escape listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }

      // Keyboard Focus Trap: Membatasi navigasi Tab hanya di dalam modal dialog
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Cleanup document.body overflow saat unmount mendadak
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 id="modal-title" className="text-lg font-bold text-gray-800">
            {title}
          </h2>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-default focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary"
            aria-label="Tutup jendela dialog"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 text-gray-600 text-sm leading-relaxed max-h-[75vh] overflow-y-auto">
          {children}
        </div>

        {showDefaultFooter && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
            <Button variant="primary" size="md" onClick={onClose}>
              Mengerti
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
