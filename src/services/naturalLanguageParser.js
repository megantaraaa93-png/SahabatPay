/**
 * Natural Language Parser Bahasa Indonesia untuk Transaksi SahabatPay.
 *
 * Mampu memparsing:
 * 1. Nominal angka ("10000", "10.000", "50,000", "100k", "10rb")
 * 2. Nominal kata bilangan ("sepuluh ribu", "lima puluh ribu", "seratus ribu", "satu juta lima ratus ribu", "dua setengah juta")
 * 3. Intent transaksi (TRANSFER, TOP_UP, QRIS, CONFIRM, CANCEL, HELP, REPEAT, CHANGE_AMOUNT, CHANGE_RECIPIENT)
 * 4. Ekstraksi nama penerima & nominal dari satu kalimat perintah.
 */

// Peta kata bilangan satuan/belasan/puluhan
const WORD_TO_NUMBER = {
  nol: 0,
  kosong: 0,
  satu: 1,
  se: 1,
  dua: 2,
  tiga: 3,
  empat: 4,
  lima: 5,
  enam: 6,
  tujuh: 7,
  delapan: 8,
  sembilan: 9,
  sepuluh: 10,
  sebelas: 11,
  duabelas: 12,
  tigabelas: 13,
  empatbelas: 14,
  limabelas: 15,
  enambelas: 16,
  tujuhbelas: 17,
  delapanbelas: 18,
  sembilanbelas: 19,
  seratus: 100,
  seribu: 1000,
  sejuta: 1000000,
  setengah: 0.5,
};

/**
 * Normalisasi teks ucapan bahasa Indonesia
 * @param {string} raw
 * @returns {string}
 */
export function normalizeText(raw) {
  let text = String(raw || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');

  // Pertahankan format angka dengan titik/koma seperti 100.000 atau 50,000
  // Ganti tanda baca lain menjadi spasi
  text = text.replace(/([0-9])[.,]([0-9]{3})(?![0-9])/g, '$1$2'); // e.g. 100.000 -> 100000
  text = text.replace(/[.,!?;:]/g, ' ');
  text = text.replace(/[-_]/g, ' ');
  text = text.replace(/\s+/g, ' ');
  return text.trim();
}

/**
 * Parsing nominal dari kata-kata bahasa Indonesia atau format angka campuran.
 * Contoh yang didukung:
 * - "sepuluh ribu" -> 10000
 * - "50 ribu" -> 50000
 * - "50.000" / "50000" -> 50000
 * - "1 juta lima ratus ribu" -> 1500000
 * - "dua setengah juta" -> 2500000
 * - "1 5 juta" / "1,5 juta" -> 1500000
 * - "seratus dua puluh lima ribu" -> 1250000
 *
 * @param {string} text
 * @returns {number|null}
 */
export function parseIndonesianAmount(text) {
  if (!text) return null;
  const clean = normalizeText(text);

  // 1. Coba format angka langsung dengan separator titik/koma (e.g. 50.000, Rp 50.000, 100000)
  const directDigitsMatch = clean.match(/(?:rp\s*)?(\d{1,3}(?:[.,]\d{3})+(?!\d)|\b\d{4,9}\b)/i);
  if (directDigitsMatch) {
    const rawDigits = directDigitsMatch[1].replace(/[.,]/g, '');
    const num = parseInt(rawDigits, 10);
    if (!isNaN(num) && num > 0) {
      // Cek apakah ada pengali tambahan seperti "juta" setelahnya: e.g. "1.5 juta"
      const afterIndex = clean.indexOf(directDigitsMatch[0]) + directDigitsMatch[0].length;
      const afterText = clean.slice(afterIndex).trim();
      if (/^juta\b/.test(afterText)) {
        // e.g. "1,5 juta" atau "2.5 juta"
        const floatVal = parseFloat(directDigitsMatch[1].replace(',', '.'));
        return Math.round(floatVal * 1000000);
      }
      if (/^ribu\b/.test(afterText)) {
        const floatVal = parseFloat(directDigitsMatch[1].replace(',', '.'));
        return Math.round(floatVal * 1000);
      }
      return num;
    }
  }

  // 2. Coba pecahan desimal dengan kata (e.g. "satu koma lima juta", "1 5 juta", "dua setengah juta")
  const setengahJutaMatch = clean.match(/(\w+)\s+setengah\s+juta/);
  if (setengahJutaMatch) {
    const baseWord = setengahJutaMatch[1];
    const baseVal = WORD_TO_NUMBER[baseWord] || (parseInt(baseWord, 10) || 0);
    if (baseVal > 0) {
      return Math.round((baseVal + 0.5) * 1000000);
    }
  }

  const komaJutaMatch = clean.match(/(\d+|[a-z]+)\s+koma\s+(\d+|[a-z]+)\s+juta/);
  if (komaJutaMatch) {
    const intPart = WORD_TO_NUMBER[komaJutaMatch[1]] || parseInt(komaJutaMatch[1], 10);
    const fracPart = WORD_TO_NUMBER[komaJutaMatch[2]] || parseInt(komaJutaMatch[2], 10);
    if (!isNaN(intPart) && !isNaN(fracPart)) {
      return Math.round((intPart + fracPart / 10) * 1000000);
    }
  }

  // 3. Parser kata bilangan bertingkat (Juta, Ribu, Ratus, Puluh, Belas)
  // Ekstrak bagian teks yang mengandung angka/kata nominal
  const numberTokens = clean.split(' ').filter((token) => {
    return (
      WORD_TO_NUMBER[token] !== undefined ||
      ['belas', 'puluh', 'ratus', 'ribu', 'juta', 'k', 'rb'].includes(token) ||
      /^\d+$/.test(token)
    );
  });

  if (numberTokens.length === 0) return null;

  let total = 0;
  let currentGroup = 0; // untuk ratusan/puluhan sebelum ribu/juta
  let currentVal = 0;

  for (let i = 0; i < numberTokens.length; i++) {
    const token = numberTokens[i];

    if (/^\d+$/.test(token)) {
      currentVal = parseInt(token, 10);
      continue;
    }

    if (token === 'k' || token === 'rb') {
      currentVal = (currentVal || 1) * 1000;
      currentGroup += currentVal;
      currentVal = 0;
      continue;
    }

    if (token === 'belas') {
      currentVal = (currentVal || 1) + 10;
      continue;
    }

    if (token === 'puluh') {
      currentVal = (currentVal || 1) * 10;
      currentGroup += currentVal;
      currentVal = 0;
      continue;
    }

    if (token === 'ratus') {
      currentVal = (currentVal || 1) * 100;
      currentGroup += currentVal;
      currentVal = 0;
      continue;
    }

    if (token === 'ribu') {
      currentGroup += currentVal;
      if (currentGroup === 0) currentGroup = 1;
      total += currentGroup * 1000;
      currentGroup = 0;
      currentVal = 0;
      continue;
    }

    if (token === 'juta') {
      currentGroup += currentVal;
      if (currentGroup === 0) currentGroup = 1;
      total += currentGroup * 1000000;
      currentGroup = 0;
      currentVal = 0;
      continue;
    }

    const val = WORD_TO_NUMBER[token];
    if (val !== undefined) {
      if (token === 'seratus') {
        currentGroup += 100;
      } else if (token === 'seribu') {
        total += 1000;
      } else if (token === 'sejuta') {
        total += 1000000;
      } else if (token === 'sepuluh') {
        currentVal = 10;
      } else if (token === 'sebelas') {
        currentVal = 11;
      } else if (token.endsWith('belas')) {
        currentVal = val;
      } else {
        currentVal = val;
      }
    }
  }

  total += currentGroup + currentVal;
  return total > 0 ? total : null;
}

/**
 * Ekstraksi intent dan entitas dari ucapan pengguna.
 *
 * @param {string} rawText - Ucapan mentah pengguna
 * @returns {{
 *   intent: 'TRANSFER'|'TOP_UP'|'CONFIRM'|'CANCEL'|'CHANGE_AMOUNT'|'CHANGE_RECIPIENT'|'HELP'|'UNKNOWN',
 *   amount: number|null,
 *   recipientName: string|null,
 *   rawText: string
 * }}
 */
export function parseVoiceCommand(rawText) {
  const clean = normalizeText(rawText);

  // 1. Deteksi intent konfirmasi
  if (/^(ya|iya|setuju|lanjut|lanjutkan|benar|oke|ok|proses|kirimkan)$/i.test(clean)) {
    return { intent: 'CONFIRM', amount: null, recipientName: null, rawText };
  }

  // 2. Deteksi intent pembatalan
  if (/^(batal|batalkan|tidak|jangan|berhenti|keluar|stop)$/i.test(clean)) {
    return { intent: 'CANCEL', amount: null, recipientName: null, rawText };
  }

  // 3. Deteksi ganti nominal atau nominal murni
  if (/^(ganti|ubah)\s+nominal/i.test(clean)) {
    const amt = parseIndonesianAmount(clean.replace(/^(ganti|ubah)\s+nominal/, ''));
    return { intent: 'CHANGE_AMOUNT', amount: amt, recipientName: null, rawText };
  }

  // 4. Deteksi ganti penerima
  if (/^(ganti|ubah)\s+penerima/i.test(clean)) {
    const rec = clean.replace(/^(ganti|ubah)\s+penerima\s*(ke|menjadi)?\s*/i, '').trim();
    return { intent: 'CHANGE_RECIPIENT', amount: null, recipientName: rec || null, rawText };
  }

  // 5. Deteksi TRANSFER: e.g. "transfer 50 ribu ke megan", "kirim uang lima puluh ribu ke budi"
  const isTransferKeyword = /\b(transfer|kirim|kirimkan|tf)\b/i.test(clean) && !/\btop\s*up\b/i.test(clean);
  if (isTransferKeyword) {
    let recipientName = null;
    let amount = null;

    // Cek pola: "... ke [Nama]" atau "... untuk [Nama]" atau "... kepada [Nama]"
    const toMatch = clean.match(/(?:ke|untuk|kepada)\s+([a-z0-9\s]+)$/i);
    if (toMatch) {
      recipientName = toMatch[1].trim();
      // Bersihkan kata stopword di akhir nama jika ada
      recipientName = recipientName.replace(/\s+(saja|dong|ya|sekarang)$/i, '').trim();
    }

    // Ambil nominal dari bagian kalimat di luar kata transfer dan nama
    let amountText = clean;
    if (recipientName && toMatch) {
      amountText = clean.slice(0, toMatch.index);
    }
    // Hapus kata transfer / kirim uang
    amountText = amountText.replace(/\b(transfer|kirim\s+uang|kirim\s+saldo|kirim|tf|tolong|saya\s+mau|saya\s+ingin)\b/gi, ' ');
    amount = parseIndonesianAmount(amountText);

    // Jika belum dapat penerima dari kata "ke", coba pola "transfer [Nama] [Nominal]"
    if (!recipientName) {
      const altMatch = clean.match(/(?:transfer|kirim|tf)\s+([a-z]+)\s+(.+)/i);
      if (altMatch) {
        const potentialName = altMatch[1];
        // Pastikan bukan kata nominal seperti "sepuluh", "lima", "seratus", "uang", "saldo"
        const isNotNumber = !WORD_TO_NUMBER[potentialName] && !/^(uang|saldo|rp|\d+)$/i.test(potentialName);
        if (isNotNumber) {
          recipientName = potentialName;
          amount = parseIndonesianAmount(altMatch[2]);
        }
      }
    }

    return {
      intent: 'TRANSFER',
      amount,
      recipientName,
      rawText,
    };
  }

  // 6. Deteksi TOP UP: e.g. "top up 50 ribu", "isi saldo seratus ribu"
  const isTopUpKeyword = /\b(top\s*up|topup|isi\s+saldo|tambah\s+saldo|isi\s+dompet|tambah\s+uang)\b/i.test(clean);
  if (isTopUpKeyword) {
    const amountText = clean.replace(/\b(top\s*up|topup|isi\s+saldo|tambah\s+saldo|isi\s+dompet|tambah\s+uang|tolong|saya\s+mau|saya\s+ingin|sebesar|nominal)\b/gi, ' ');
    const amount = parseIndonesianAmount(amountText);
    return {
      intent: 'TOP_UP',
      amount,
      recipientName: null,
      rawText,
    };
  }

  // 7. Jika pengguna hanya menyebut nominal saat ditanya sistem (misal dalam state ENTERING_AMOUNT)
  const standaloneAmount = parseIndonesianAmount(clean);
  if (standaloneAmount !== null && standaloneAmount > 0) {
    return {
      intent: 'AMOUNT_PROVIDED',
      amount: standaloneAmount,
      recipientName: null,
      rawText,
    };
  }

  return {
    intent: 'UNKNOWN',
    amount: null,
    recipientName: null,
    rawText,
  };
}
