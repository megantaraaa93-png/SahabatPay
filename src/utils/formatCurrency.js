/**
 * Format angka ke mata uang Rupiah Indonesia.
 * @param {number} amount - Jumlah dalam Rupiah
 * @returns {string} Contoh: "Rp 1.250.000"
 */
export function formatRupiah(amount) {
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return `Rp ${formatted}`;
}

/**
 * Format tanggal ke format Indonesia.
 * @param {string|Date} date
 * @returns {string} Contoh: "5 November 2026"
 */
export function formatTanggal(date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

/**
 * Format tanggal singkat.
 * @param {string|Date} date
 * @returns {string} Contoh: "5 Nov"
 */
export function formatTanggalSingkat(date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(date));
}
