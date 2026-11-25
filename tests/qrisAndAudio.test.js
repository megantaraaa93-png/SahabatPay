import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const { executeQrisPayment, loadUserWallet } = await import('../src/services/walletService.js');
const { DEMO_MERCHANTS, generateQrisPayload } = await import('../src/services/merchantService.js');
const { parseQrisStaticPayload } = await import('../src/services/qrisEmvcoService.js');
const { audioService } = await import('../src/services/audioService.js');
const { demoUser } = await import('../src/services/demoData.js');

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

function buildValidStaticQris() {
  const guiSub = '0014ID.CO.QRIS.WWW';
  const tag26 = `26${String(guiSub.length).padStart(2, '0')}${guiSub}`;
  const body =
    '000201' +
    '010211' +
    tag26 +
    '52045812' +
    '5303360' +
    '5802ID' +
    '5914WARUNG SAHABAT' +
    '6009SURAKARTA' +
    '6304';
  return body + crc16CcittFalse(body);
}

describe('QRIS & Audio Security', () => {
  beforeEach(() => {
    store.clear();
  });

  it('executeQrisPayment validates merchant status, nominal limits, and idempotency', () => {
    const activeMerchant = DEMO_MERCHANTS.find((m) => m.status === 'active');
    const inactiveMerchant = DEMO_MERCHANTS.find((m) => m.status === 'inactive');
    const startBal = loadUserWallet(demoUser).balance;

    // Inactive merchant rejected
    const badMerch = executeQrisPayment(demoUser, generateQrisPayload(inactiveMerchant), 15000);
    assert.equal(badMerch.success, false);

    // Invalid amounts rejected
    assert.equal(executeQrisPayment(demoUser, activeMerchant, 500).success, false);
    assert.equal(executeQrisPayment(demoUser, activeMerchant, 15000000).success, false);
    assert.equal(executeQrisPayment(demoUser, activeMerchant, NaN).success, false);
    assert.equal(executeQrisPayment(demoUser, activeMerchant, 15000.5).success, false);

    // Valid payment
    const ok = executeQrisPayment(
      demoUser,
      generateQrisPayload(activeMerchant),
      25000,
      'IDEMP-QRIS-1'
    );
    assert.equal(ok.success, true);
    assert.equal(ok.newBalance, startBal - 25000);

    // Double payment prevented via idempotency
    const replay = executeQrisPayment(
      demoUser,
      generateQrisPayload(activeMerchant),
      25000,
      'IDEMP-QRIS-1'
    );
    assert.equal(replay.success, true);
    assert.equal(replay.isIdempotentReplay, true);
    assert.equal(loadUserWallet(demoUser).balance, startBal - 25000);
  });

  it('parseQrisStaticPayload validates EMVCo static QRIS and rejects tampered CRC or non-QRIS', () => {
    const valid = buildValidStaticQris();
    const parsed = parseQrisStaticPayload(valid);
    assert.equal(parsed.isValid, true);
    assert.equal(parsed.isStatic, true);
    assert.equal(parsed.merchantName, 'WARUNG SAHABAT');
    assert.equal(parsed.city, 'SURAKARTA');

    // Tampered CRC
    const tampered = valid.slice(0, -4) + '0000';
    assert.equal(parseQrisStaticPayload(tampered).isValid, false);

    // Random non-QRIS text
    assert.equal(parseQrisStaticPayload('https://example.com').isValid, false);
  });

  it('audioService.sanitizeText never exposes 6-digit PINs or passwords', () => {
    const sanitizedPin = audioService.sanitizeText('PIN adalah 123456 untuk transaksi');
    assert.equal(sanitizedPin.includes('123456'), false);

    const sanitizedPwd = audioService.sanitizeText('password: rahasia123');
    assert.equal(sanitizedPwd.includes('rahasia123'), false);
  });
});
