/**
 * Layanan Merchant Simulasi SahabatPay.
 * Mengelola data merchant demo dan parsing payload QRIS internal.
 *
 * PERINGATAN: Ini adalah format dan data simulasi untuk prototype SahabatPay,
 * BUKAN standar QRIS nasional Bank Indonesia atau jaringan pembayaran perbankan riil.
 */

export const QRIS_PAYLOAD_PREFIX = 'SAHABATPAY|QRIS|';

export const DEMO_MERCHANTS = [
  {
    merchantId: 'MERCH-001',
    merchantCode: 'SUMELEH-COFFEE',
    merchantName: 'Sumeleh Coffee & Tea',
    merchantCategory: 'Makanan & Minuman (F&B)',
    merchantLocation: 'Jl. Slamet Riyadi No. 45, Surakarta',
    status: 'active',
    logoInitial: 'SC',
    description: 'Kedai kopi ramah difabel dengan seduhan kopi lokal nusantara.',
  },
  {
    merchantId: 'MERCH-002',
    merchantCode: 'MINIMARKET-SHB',
    merchantName: 'Minimarket Sahabat',
    merchantCategory: 'Kebutuhan Harian & Retail',
    merchantLocation: 'Jl. Ir. Sutami No. 12, Jebres',
    status: 'active',
    logoInitial: 'MS',
    description: 'Pusat belanja kebutuhan harian lengkap dan terjangkau.',
  },
  {
    merchantId: 'MERCH-003',
    merchantCode: 'KANTIN-UNS',
    merchantName: 'Kantin Kampus UNS',
    merchantCategory: 'Makanan & Minuman (F&B)',
    merchantLocation: 'Kawasan Danau UNS, Kentingan',
    status: 'active',
    logoInitial: 'KU',
    description: 'Pilihan aneka kuliner mahasiswa yang bersih dan higienis.',
  },
  {
    merchantId: 'MERCH-004',
    merchantCode: 'BUKU-PINTAR',
    merchantName: 'Toko Buku Pintar',
    merchantCategory: 'Pendidikan & Alat Tulis',
    merchantLocation: 'Jl. Urip Sumoharjo No. 88, Surakarta',
    status: 'active',
    logoInitial: 'BP',
    description: 'Menyediakan buku kuliah, fiksi, dan perlengkapan edukasi.',
  },
  {
    merchantId: 'MERCH-005',
    merchantCode: 'APOTEK-SEHAT',
    merchantName: 'Apotek Sehat',
    merchantCategory: 'Kesehatan & Farmasi',
    merchantLocation: 'Jl. Kolonel Sutarto No. 20, Jebres',
    status: 'active',
    logoInitial: 'AS',
    description: 'Layanan obat resep dokter, vitamin, dan alat kesehatan.',
  },
  {
    merchantId: 'MERCH-INACTIVE',
    merchantCode: 'TOKO-TUTUP',
    merchantName: 'Kios Berkah (Tutup Sementara)',
    merchantCategory: 'Lainnya',
    merchantLocation: 'Jl. Veteran No. 3',
    status: 'inactive',
    logoInitial: 'KB',
    description: 'Merchant ini sedang tidak beroperasi untuk simulasi penolakan.',
  },
];

/**
 * Menghasilkan string payload QR simulasi untuk merchant tertentu.
 * Format: SAHABATPAY|QRIS|{merchantId}|{merchantCode}
 * @param {Object} merchant
 * @returns {string}
 */
export function generateQrisPayload(merchant) {
  if (!merchant || !merchant.merchantId || !merchant.merchantCode) return '';
  return `${QRIS_PAYLOAD_PREFIX}${merchant.merchantId}|${merchant.merchantCode}`;
}

/**
 * Mendapatkan seluruh merchant demo yang terdaftar.
 * @param {boolean} [onlyActive=false]
 * @returns {Array<Object>}
 */
export function getAllMerchants(onlyActive = false) {
  if (onlyActive) {
    return DEMO_MERCHANTS.filter((m) => m.status === 'active');
  }
  return DEMO_MERCHANTS;
}

/**
 * Mencari merchant berdasarkan ID, kode merchant, atau payload QR.
 * @param {string} query
 * @returns {Object|null}
 */
export function findMerchant(query) {
  if (!query) return null;
  const clean = String(query).trim();

  // 1. Cek apakah ini string payload QR internal
  if (clean.startsWith(QRIS_PAYLOAD_PREFIX)) {
    const parts = clean.split('|');
    // SAHABATPAY | QRIS | MERCHANT_ID | MERCHANT_CODE
    if (parts.length >= 4) {
      const mId = parts[2];
      const mCode = parts[3];
      return (
        DEMO_MERCHANTS.find(
          (m) => m.merchantId.toUpperCase() === mId.toUpperCase() || m.merchantCode.toUpperCase() === mCode.toUpperCase()
        ) || null
      );
    }
  }

  // 2. Cek berdasarkan merchantId atau merchantCode
  const upperQuery = clean.toUpperCase();
  return (
    DEMO_MERCHANTS.find(
      (m) =>
        m.merchantId.toUpperCase() === upperQuery ||
        m.merchantCode.toUpperCase() === upperQuery ||
        m.merchantName.toUpperCase().includes(upperQuery)
    ) || null
  );
}

/**
 * Memvalidasi apakah merchant dapat menerima pembayaran simulasi:
 * 1. Merchant harus terdaftar.
 * 2. Status merchant harus 'active'.
 *
 * @param {string|Object} merchantInput
 * @returns {{ isValid: boolean, merchant?: Object, error?: string }}
 */
export function validateMerchant(merchantInput) {
  if (!merchantInput) {
    return { isValid: false, error: 'Informasi merchant tidak boleh kosong.' };
  }

  let merchant = null;
  if (typeof merchantInput === 'object') {
    merchant = findMerchant(merchantInput.merchantId || merchantInput.merchantCode);
  } else {
    merchant = findMerchant(merchantInput);
  }

  if (!merchant) {
    return {
      isValid: false,
      error: 'Kode QR atau merchant tidak terdaftar di sistem SahabatPay.',
    };
  }

  if (merchant.status !== 'active') {
    return {
      isValid: false,
      merchant,
      error: `Merchant "${merchant.merchantName}" saat ini sedang nonaktif dan tidak dapat menerima pembayaran.`,
    };
  }

  return {
    isValid: true,
    merchant,
  };
}
