/**
 * Modul Pencocokan Penerima Suara (Voice Recipient Matcher).
 *
 * Menggunakan daftar penerima tersimpan (getSavedRecipients)
 * serta pengguna terdaftar umum (getAllRegisteredUsers).
 *
 * Fitur:
 * - Pencocokan nama fleksibel / toleransi variasi fonetik
 * - Jika cocok 1: langsung return
 * - Jika lebih dari 1: return status AMBIGUOUS dengan list candidates
 * - Jika tidak ada: return status NOT_FOUND
 */

import { getSavedRecipients } from './recipientService.js';
import { getAllRegisteredUsers } from './userService.js';

function cleanName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Cari calon penerima transfer berdasarkan nama yang diucapkan pengguna.
 *
 * @param {string} spokenName - Nama yang diucapkan (misal "Megan", "Budi")
 * @param {Object} currentUser - Pengguna aktif
 * @returns {{
 *   status: 'EXACT' | 'SINGLE_MATCH' | 'AMBIGUOUS' | 'NOT_FOUND',
 *   recipient: Object | null,
 *   matches: Array<Object>
 * }}
 */
export function matchRecipient(spokenName, currentUser) {
  if (!spokenName || !spokenName.trim()) {
    return { status: 'NOT_FOUND', recipient: null, matches: [] };
  }

  const query = cleanName(spokenName);
  const ownerId = currentUser?.id || currentUser?.phone || '';
  const myPhone = String(currentUser?.phone || '').replace(/\D/g, '');

  // 1. Ambil penerima tersimpan milik user
  const saved = ownerId ? getSavedRecipients(ownerId) : [];

  // 2. Ambil user terdaftar (kecuali diri sendiri)
  const allUsers = getAllRegisteredUsers().filter((u) => {
    const cleanUPhone = String(u.phone || '').replace(/\D/g, '');
    return cleanUPhone !== myPhone;
  });

  // Gabungkan daftar kandidat: utamakan penerima tersimpan (saved)
  const candidatePool = [];
  const seenPhones = new Set();

  saved.forEach((r) => {
    const p = String(r.phone || '').replace(/\D/g, '');
    seenPhones.add(p);
    candidatePool.push({
      id: r.id || p,
      name: r.alias || r.name,
      alias: r.alias || r.name,
      phone: r.phone,
      isSaved: true,
      isDemo: Boolean(r.isDemo),
    });
  });

  allUsers.forEach((u) => {
    const p = String(u.phone || '').replace(/\D/g, '');
    if (!seenPhones.has(p)) {
      seenPhones.add(p);
      candidatePool.push({
        id: u.id || p,
        name: u.name,
        alias: u.name,
        phone: u.phone,
        isSaved: false,
        isDemo: Boolean(u.isDemo),
      });
    }
  });

  // Pencarian tahap 1: Exact match pada alias atau name
  const exactMatches = candidatePool.filter((c) => {
    const cName = cleanName(c.name);
    return cName === query;
  });

  if (exactMatches.length === 1) {
    return { status: 'EXACT', recipient: exactMatches[0], matches: exactMatches };
  }
  if (exactMatches.length > 1) {
    return { status: 'AMBIGUOUS', recipient: null, matches: exactMatches };
  }

  // Pencarian tahap 2: Partial prefix / substring / kata per kata
  const partialMatches = candidatePool.filter((c) => {
    const cName = cleanName(c.name);
    const words = cName.split(' ');
    // Apakah kata di ucapan cocok dengan salah satu kata penerima?
    if (words.some((w) => w === query || w.startsWith(query) || query.startsWith(w))) {
      return true;
    }
    return cName.includes(query) || query.includes(cName);
  });

  if (partialMatches.length === 1) {
    return { status: 'SINGLE_MATCH', recipient: partialMatches[0], matches: partialMatches };
  }
  if (partialMatches.length > 1) {
    // Jika ada yang berstatus 'isSaved' vs non-saved, prioritaskan saved
    const savedPartials = partialMatches.filter((p) => p.isSaved);
    if (savedPartials.length === 1) {
      return { status: 'SINGLE_MATCH', recipient: savedPartials[0], matches: savedPartials };
    }
    return { status: 'AMBIGUOUS', recipient: null, matches: partialMatches };
  }

  return { status: 'NOT_FOUND', recipient: null, matches: [] };
}
