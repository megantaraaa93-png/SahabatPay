import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const { addSavedRecipient, revalidateSavedRecipient } = await import(
  '../src/services/recipientService.js'
);
const {
  executeTopUp,
  executeTransfer,
  loadUserWallet,
  recoverPendingTransactions,
  recordJournalEntry,
  getTransactionJournal,
} = await import('../src/services/walletService.js');
const { demoUser } = await import('../src/services/demoData.js');

const secondUser = {
  id: 'usr-2',
  name: 'Siti Aminah',
  phone: '081398765432',
  email: 'siti@example.com',
};

describe('Transaction Engine & Saved Recipients', () => {
  beforeEach(() => {
    store.clear();
    localStorage.setItem('sahabatpay_registered_users', JSON.stringify([secondUser]));
  });

  it('executeTopUp validates positive finite integer amounts', () => {
    const startBal = loadUserWallet(demoUser).balance;

    assert.equal(executeTopUp(demoUser, NaN, 'VA').success, false);
    assert.equal(executeTopUp(demoUser, Infinity, 'VA').success, false);
    assert.equal(executeTopUp(demoUser, 0, 'VA').success, false);
    assert.equal(executeTopUp(demoUser, -5000, 'VA').success, false);
    assert.equal(executeTopUp(demoUser, 10000.5, 'VA').success, false);

    const ok = executeTopUp(demoUser, 50000, 'Virtual Account');
    assert.equal(ok.success, true);
    assert.equal(ok.newBalance, startBal + 50000);
  });

  it('addSavedRecipient handles internal and external simulation recipients safely', () => {
    const ownerId = demoUser.id || demoUser.phone;

    const internal = addSavedRecipient(ownerId, demoUser.phone, '0813-9876-5432', 'Siti');
    assert.equal(internal.success, true);
    assert.equal(internal.recipient.isDemo, false);
    assert.equal(internal.recipient.name, 'Siti Aminah');

    const noAlias = addSavedRecipient(ownerId, demoUser.phone, '085511223344', '  ');
    assert.equal(noAlias.success, false);

    const shortPhone = addSavedRecipient(ownerId, demoUser.phone, '08551122', 'Budi');
    assert.equal(shortPhone.success, false);

    const selfPhone = addSavedRecipient(ownerId, demoUser.phone, demoUser.phone, 'Saya');
    assert.equal(selfPhone.success, false);

    const external = addSavedRecipient(ownerId, demoUser.phone, '0855-1122-3344', 'Warung Pak Budi');
    assert.equal(external.success, true);
    assert.equal(external.recipient.isDemo, true);
    assert.equal(external.recipient.phone, '085511223344');
    assert.equal(external.recipient.name, 'Warung Pak Budi');

    const dup = addSavedRecipient(ownerId, demoUser.phone, '085511223344', 'Duplikat');
    assert.equal(dup.success, false);

    assert.equal(revalidateSavedRecipient('085511223344').isValid, false);
  });

  it('executeTransfer runs internal transfer and blocks spoofed isDemo flag', () => {
    const startBal = loadUserWallet(demoUser).balance;

    const res = executeTransfer(
      demoUser,
      { phone: '081398765432', name: 'Spoofed Name', isDemo: true },
      30000,
      'Bayar hutang',
      'IDEMP-INT-TEST-1'
    );

    assert.equal(res.success, true);
    assert.equal(res.transaction.title, 'Transfer Saldo');
    assert.equal(res.newBalance, startBal - 30000);
    assert.equal(loadUserWallet(secondUser).balance, 30000);

    // Idempotency replay
    const replay = executeTransfer(
      demoUser,
      { phone: '081398765432', name: 'Spoofed Name', isDemo: true },
      30000,
      'Bayar hutang',
      'IDEMP-INT-TEST-1'
    );
    assert.equal(replay.success, true);
    assert.equal(replay.isIdempotentReplay, true);
    assert.equal(loadUserWallet(secondUser).balance, 30000);
  });

  it('executeTransfer runs external demo transfer without creating recipient wallet', () => {
    const startBal = loadUserWallet(demoUser).balance;

    const res = executeTransfer(
      demoUser,
      { phone: '085511223344', name: 'Warung Pak Budi', isDemo: true },
      25000,
      'Makan siang',
      'IDEMP-EXT-TEST-1'
    );

    assert.equal(res.success, true);
    assert.equal(res.newBalance, startBal - 25000);
    assert.equal(res.transaction.title, 'Transfer Simulasi Eksternal');
    assert.equal(res.transaction.metadata.isDemo, true);
    assert.equal(res.transaction.metadata.simulation, true);
    assert.equal(localStorage.getItem('sahabatpay_wallet_085511223344'), null);

    // Idempotency replay
    const replay = executeTransfer(
      demoUser,
      { phone: '085511223344', name: 'Warung Pak Budi', isDemo: true },
      25000,
      'Makan siang',
      'IDEMP-EXT-TEST-1'
    );
    assert.equal(replay.success, true);
    assert.equal(replay.isIdempotentReplay, true);
    assert.equal(loadUserWallet(demoUser).balance, startBal - 25000);
  });

  it('recoverPendingTransactions handles external_demo_transfer without creating recipient wallet', () => {
    const tx = executeTransfer(
      demoUser,
      { phone: '085511223344', name: 'Warung Pak Budi', isDemo: true },
      20000,
      '',
      'IDEMP-REC-1'
    );

    recordJournalEntry({
      txnId: tx.transaction.id,
      type: 'external_demo_transfer',
      senderPhone: demoUser.phone,
      recipientPhone: '085511223344',
      amount: 20000,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    recordJournalEntry({
      txnId: 'TX-NONEXISTENT',
      type: 'external_demo_transfer',
      senderPhone: demoUser.phone,
      recipientPhone: '085511223344',
      amount: 10000,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    const count = recoverPendingTransactions();
    assert.equal(count, 1);

    const journal = getTransactionJournal();
    assert.equal(journal.find((j) => j.txnId === tx.transaction.id).status, 'completed');
    assert.equal(journal.find((j) => j.txnId === 'TX-NONEXISTENT').status, 'failed');
    assert.equal(localStorage.getItem('sahabatpay_wallet_085511223344'), null);
  });
});
