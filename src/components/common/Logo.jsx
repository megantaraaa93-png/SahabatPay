import React from 'react';

/**
 * Komponen bersama Logo SahabatPay
 *
 * Menjamin:
 * 1. Penggunaan aset logo resmi dari public/logo.png.
 * 2. Konsistensi aspek rasio dengan object-fit: contain (object-contain).
 * 3. Skalabilitas ukuran terstandarisasi untuk auth (besar) dan dashboard/navigasi (lebih ringkas).
 * 4. Aksesibilitas dengan default alt text "Logo SahabatPay".
 *
 * @param {Object} props
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} [props.size='md'] - Preset ukuran logo:
 *   - 'xs': w-7 h-7 (~28px)
 *   - 'sm': w-9 h-9 (~36px, cocok untuk navigasi & sidebar)
 *   - 'md': w-12 h-12 (~48px, cocok untuk dashboard greeting)
 *   - 'lg': w-20 h-20 (~80px, ukuran seragam & besar untuk form autentikasi)
 *   - 'xl': w-24 h-24 md:w-28 md:h-28 (~96-112px, hero Welcome)
 * @param {string} [props.className] - Kelas Tailwind tambahan
 * @param {string} [props.alt='Logo SahabatPay'] - Teks alternatif untuk pembaca layar
 */
const SIZE_PRESETS = {
  xs: 'w-7 h-7',
  sm: 'w-9 h-9',
  md: 'w-12 h-12',
  lg: 'w-20 h-20',
  xl: 'w-24 h-24 md:w-28 md:h-28',
};

export default function Logo({
  size = 'md',
  className = '',
  alt = 'Logo SahabatPay',
  ...restProps
}) {
  const sizeClass = SIZE_PRESETS[size] || SIZE_PRESETS.md;

  return (
    <img
      src="/logo.png"
      alt={alt}
      loading="eager"
      draggable="false"
      className={`${sizeClass} object-contain ${className}`.trim()}
      {...restProps}
    />
  );
}
