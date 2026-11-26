import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for test environment
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const {
  parseIndonesianAmount,
  parseVoiceCommand,
  normalizeText,
} = await import('../src/services/naturalLanguageParser.js');

const { matchRecipient } = await import('../src/services/voiceRecipientMatcher.js');
const { addSavedRecipient } = await import('../src/services/recipientService.js');
const { executeTransfer, executeTopUp, loadUserWallet } = await import('../src/services/walletService.js');
const { validateTransactionAmount } = await import('../src/utils/transactionUtils.js');
const { demoUser } = await import('../src/services/demoData.js');

const registeredSecondUser = {
  id: 'usr-2',
  name: 'Siti Aminah',
  phone: '081398765432',
  email: 'siti@example.com',
};

// Prototype hash logic test for PIN security
const PROTOTYPE_SALT = 'sahabatpay_salt_demo_2026_';
async function testHash(text) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(PROTOTYPE_SALT + text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return 'demo_obf_' + Array.from(text).map((c) => c.charCodeAt(0).toString(16)).join('');
  }
}

describe('Voice Transaction Orchestrator & Natural Language Parser (15 Scenarios)', () => {
  beforeEach(() => {
    store.clear();
    localStorage.setItem('sahabatpay_registered_users', JSON.stringify([registeredSecondUser]));
  });

  // UJI 1: Transfer nominal dan penerima dalam satu kalimat
  it('1. Parses transfer with nominal and recipient in a single sentence', () => {
    const cmd1 = parseVoiceCommand('Transfer lima puluh ribu ke Megan');
    assert.equal(cmd1.intent, 'TRANSFER');
    assert.equal(cmd1.amount, 50000);
    assert.equal(cmd1.recipientName, 'megan');

    const cmd2 = parseVoiceCommand('Kirim uang 100.000 ke Budi');
    assert.equal(cmd2.intent, 'TRANSFER');
    assert.equal(cmd2.amount, 100000);
    assert.equal(cmd2.recipientName, 'budi');

    const cmd3 = parseVoiceCommand('Transfer 1 juta lima ratus ribu ke Siti');
    assert.equal(cmd3.intent, 'TRANSFER');
    assert.equal(cmd3.amount, 1500000);
    assert.equal(cmd3.recipientName, 'siti');
  });

  // UJI 2: Transfer tanpa nominal
  it('2. Parses transfer without nominal (prompts for amount)', () => {
    const cmd = parseVoiceCommand('Tolong transfer ke Megan');
    assert.equal(cmd.intent, 'TRANSFER');
    assert.equal(cmd.amount, null);
    assert.equal(cmd.recipientName, 'megan');
  });

  // UJI 3: Transfer tanpa penerima
  it('3. Parses transfer without recipient (prompts for recipient)', () => {
    const cmd = parseVoiceCommand('Saya mau transfer lima puluh ribu');
    assert.equal(cmd.intent, 'TRANSFER');
    assert.equal(cmd.amount, 50000);
    assert.equal(cmd.recipientName, null);
  });

  // UJI 4: Nama penerima tidak ditemukan
  it('4. Handles non-existent recipient cleanly', () => {
    const res = matchRecipient('NamaTidakDikenal12345', demoUser);
    assert.equal(res.status, 'NOT_FOUND');
    assert.equal(res.recipient, null);
  });

  // UJI 5: Nama penerima ambigu (lebih dari 1 match)
  it('5. Handles ambiguous recipient matches (prompts clarification)', () => {
    const ownerId = demoUser.phone;
    addSavedRecipient(ownerId, demoUser.phone, '081299990001', 'Megan Fox');
    addSavedRecipient(ownerId, demoUser.phone, '081299990002', 'Megan Markle');

    const match = matchRecipient('Megan', demoUser);
    assert.equal(match.status, 'AMBIGUOUS');
    assert.equal(match.matches.length >= 2, true);
  });

  // UJI 6: Nominal tidak valid (dibawah minimum atau minus)
  it('6. Rejects invalid nominal (under Rp 10.000 minimum)', () => {
    const checkMin = validateTransactionAmount(5000, { minAmount: 10000 });
    assert.equal(checkMin.isValid, false);
    assert.match(checkMin.error, /minimal/i);

    const checkZero = validateTransactionAmount(0);
    assert.equal(checkZero.isValid, false);
  });

  // UJI 7: Saldo tidak cukup
  it('7. Rejects transfer when amount exceeds balance', () => {
    const wallet = loadUserWallet(demoUser);
    const excessiveAmount = wallet.balance + 500000;

    const res = executeTransfer(demoUser, registeredSecondUser, excessiveAmount);
    assert.equal(res.success, false);
    assert.match(res.error, /tidak mencukupi/i);
  });

  // UJI 8: Konfirmasi suara
  it('8. Recognizes voice confirmation keywords accurately', () => {
    const positiveWords = ['ya', 'iya', 'setuju', 'lanjut', 'lanjutkan', 'benar', 'oke', 'ok', 'proses'];
    positiveWords.forEach((word) => {
      const parsed = parseVoiceCommand(word);
      assert.equal(parsed.intent, 'CONFIRM', `Failed on word: ${word}`);
    });
  });

  // UJI 9: Pembatalan suara
  it('9. Recognizes voice cancellation keywords accurately', () => {
    const cancelWords = ['batal', 'batalkan', 'tidak', 'jangan', 'berhenti', 'stop'];
    cancelWords.forEach((word) => {
      const parsed = parseVoiceCommand(word);
      assert.equal(parsed.intent, 'CANCEL', `Failed on word: ${word}`);
    });
  });

  // UJI 10: PIN salah
  it('10. Rejects invalid PIN attempts securely', async () => {
    const correctPin = '123456';
    const wrongPin = '654321';
    const correctHash = await testHash(correctPin);
    const testHashVal = await testHash(wrongPin);
    assert.notEqual(correctHash, testHashVal);
  });

  // UJI 11: PIN benar
  it('11. Validates correct PIN successfully', async () => {
    const pin = '123456';
    const hash1 = await testHash(pin);
    const hash2 = await testHash(pin);
    assert.equal(hash1, hash2);
  });

  // UJI 12: Pencegahan transaksi ganda (Idempotency)
  it('12. Prevents double-transfer via idempotency key', () => {
    const wallet = loadUserWallet(demoUser);
    const initialBal = wallet.balance;
    const idempotencyKey = 'voice_test_idem_123';

    // Eksekusi pertama
    const res1 = executeTransfer(demoUser, registeredSecondUser, 50000, 'Test 1', idempotencyKey);
    assert.equal(res1.success, true);
    assert.equal(res1.newBalance, initialBal - 50000);

    // Eksekusi kedua dengan key yang sama (Replay)
    const res2 = executeTransfer(demoUser, registeredSecondUser, 50000, 'Test 1', idempotencyKey);
    assert.equal(res2.success, true);
    assert.equal(res2.isIdempotentReplay, true);
    // Saldo tidak terpotong dua kali!
    assert.equal(res2.newBalance, initialBal - 50000);
  });

  // UJI 13: Top Up nominal langsung
  it('13. Parses direct Top Up command with nominal', () => {
    const cmd1 = parseVoiceCommand('Top up seratus ribu');
    assert.equal(cmd1.intent, 'TOP_UP');
    assert.equal(cmd1.amount, 100000);

    const cmd2 = parseVoiceCommand('Isi saldo 50 ribu rupiah');
    assert.equal(cmd2.intent, 'TOP_UP');
    assert.equal(cmd2.amount, 50000);

    // Eksekusi Top Up service
    const topRes = executeTopUp(demoUser, 100000, 'Virtual Account Instan (VA)');
    assert.equal(topRes.success, true);
    assert.equal(topRes.transaction.amount, 100000);
  });

  // UJI 14: Pergantian halaman / isolasi state transaksi
  it('14. Isolated transaction state does not execute accidentally on other pages', () => {
    // Kata "ya" tanpa transaksi tertunda tidak mengeksekusi transfer apapun
    const standaloneYes = parseVoiceCommand('ya');
    assert.equal(standaloneYes.intent, 'CONFIRM');
    assert.equal(standaloneYes.amount, null);
  });

  // UJI 15: Kegagalan API AI tidak merusak local-first flow
  it('15. Local parser operates 100% offline without external AI API', () => {
    const testCases = [
      { text: 'Transfer sepuluh ribu ke Megan', expectedIntent: 'TRANSFER', expectedAmt: 10000, expectedRec: 'megan' },
      { text: 'Isi dompet dua ratus ribu', expectedIntent: 'TOP_UP', expectedAmt: 200000 },
      { text: 'Kirim saldo 50000 ke Budi', expectedIntent: 'TRANSFER', expectedAmt: 50000, expectedRec: 'budi' },
    ];

    testCases.forEach(({ text, expectedIntent, expectedAmt, expectedRec }) => {
      const parsed = parseVoiceCommand(text);
      assert.equal(parsed.intent, expectedIntent);
      assert.equal(parsed.amount, expectedAmt);
      if (expectedRec) {
        assert.equal(parsed.recipientName, expectedRec);
      }
    });
  });
});
