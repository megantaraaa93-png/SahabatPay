/**
 * Parser QRIS statis berbasis struktur EMVCo.
 * Parser ini hanya membaca identitas merchant dan memvalidasi CRC.
 * Tidak memproses pembayaran dan bukan integrasi acquirer/issuer.
 */

function parseTlv(input) {
  const fields = [];
  let index = 0;

  while (index < input.length) {
    if (index + 4 > input.length) {
      throw new Error('Struktur QR tidak lengkap.');
    }

    const tag = input.slice(index, index + 2);
    const lengthText = input.slice(index + 2, index + 4);

    if (!/^\\d{2}$/.test(tag) || !/^\\d{2}$/.test(lengthText)) {
      throw new Error('Format data QR tidak valid.');
    }

    const length = Number(lengthText);
    const valueStart = index + 4;
    const valueEnd = valueStart + length;

    if (valueEnd > input.length) {
      throw new Error('Panjang data QR tidak sesuai.');
    }

    fields.push({ tag, value: input.slice(valueStart, valueEnd) });
    index = valueEnd;
  }

  return fields;
}

function crc16CcittFalse(input) {
  let crc = 0xffff;

  for (let i = 0; i < input.length; i += 1) {
    crc ^= input.charCodeAt(i) << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function getField(fields, tag) {
  return fields.find((field) => field.tag === tag)?.value || '';
}

function hasQrisMerchantAccount(fields) {
  return fields.some((field) => {
    const id = Number(field.tag);
    if (id < 26 || id > 51) return false;

    try {
      const nested = parseTlv(field.value);
      const gui = getField(nested, '00').toUpperCase();
      return gui === 'ID.CO.QRIS.WWW' || gui.startsWith('ID.CO.QRIS.');
    } catch {
      return false;
    }
  });
}

/**
 * Mengurai QRIS statis nasional yang payload-nya mengikuti EMVCo.
 * @returns {{isValid: boolean, isStatic: boolean, merchantName?: string, city?: string, mcc?: string, crc?: string, error?: string}}
 */
export function parseQrisStaticPayload(rawPayload) {
  const payload = String(rawPayload || '').trim();

  if (!payload || payload.length > 2048 || !/^[\\x20-\\x7E]+$/.test(payload)) {
    return { isValid: false, error: 'Data QR kosong atau tidak valid.' };
  }

  try {
    const fields = parseTlv(payload);
    const crcField = fields[fields.length - 1];

    if (!crcField || crcField.tag !== '63' || crcField.value.length !== 4) {
      return { isValid: false, error: 'QR tidak memiliki CRC yang lengkap.' };
    }

    const crcTagStart = payload.lastIndexOf('6304');
    if (crcTagStart < 0) {
      return { isValid: false, error: 'Penanda CRC tidak ditemukan.' };
    }

    const calculatedCrc = crc16CcittFalse(payload.slice(0, crcTagStart + 4));
    if (calculatedCrc !== crcField.value.toUpperCase()) {
      return { isValid: false, error: 'Validasi keamanan QR gagal. Kode mungkin rusak atau diubah.' };
    }

    const pointOfInitiation = getField(fields, '01');
    if (pointOfInitiation !== '11') {
      return {
        isValid: false,
        error: pointOfInitiation === '12'
          ? 'QR terdeteksi sebagai QRIS dinamis. Fitur ini khusus membaca QRIS statis.'
          : 'Jenis QRIS tidak dikenali sebagai QRIS statis.',
      };
    }

    if (getField(fields, '53') !== '360' || getField(fields, '58').toUpperCase() !== 'ID') {
      return { isValid: false, error: 'QR bukan format pembayaran rupiah Indonesia yang dikenali.' };
    }

    if (!hasQrisMerchantAccount(fields)) {
      return { isValid: false, error: 'Identitas penyelenggara QRIS tidak ditemukan.' };
    }

    const merchantName = getField(fields, '59').trim();
    const city = getField(fields, '60').trim();
    const mcc = getField(fields, '52');
    const amount = getField(fields, '54');

    if (!merchantName || !city) {
      return { isValid: false, error: 'Nama merchant atau kota tidak tersedia pada QR.' };
    }

    if (amount && Number(amount) > 0) {
      return { isValid: false, error: 'QR memuat nominal. QR tersebut tidak dikenali sebagai QRIS statis tanpa nominal.' };
    }

    return {
      isValid: true,
      isStatic: true,
      merchantName,
      city,
      mcc,
      crc: crcField.value.toUpperCase(),
    };
  } catch (error) {
    return { isValid: false, error: error.message || 'QR tidak dapat dibaca.' };
  }
}
